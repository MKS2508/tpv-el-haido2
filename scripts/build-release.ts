#!/usr/bin/env bun
/**
 * @file build-release.ts
 * @description Release builder for TPV El Haido — wrapper around `tauri build`
 *   that handles signing key loading, multi-target builds, artifact verification,
 *   output organisation, and `latest.json` generation for the Tauri auto-updater.
 *
 * Usage:
 *   bun run scripts/build-release.ts --target <macos-arm64|macos-x64|windows-x64|all>
 *                                    [--no-sign] [--output <dir>] [--help]
 *
 * Environment variables:
 *   TAURI_SIGNING_PRIVATE_KEY          — Base64-encoded minisign private key
 *   TAURI_SIGNING_PRIVATE_KEY_PASSWORD — Password for the private key
 *   BW_TAURI_KEY_ITEM                  — Bitwarden item ID/name for the private key
 *                                        (defaults to "tauri-signing-key")
 *   RELEASE_HUB_BASE_URL              — Base URL for artifact download links in latest.json
 *                                        (defaults to "https://updates.mks2508.systems/tpv")
 *                                        TODO(0.4.1.G): wire to real upload hub
 */

import { existsSync, mkdirSync, cpSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import logger from '@mks2508/better-logger';
import {
  ok,
  err,
  isOk,
  isErr,
  tryCatch,
  tryCatchAsync,
  type Result,
  type ResultError,
  resultError,
} from '@mks2508/no-throw';

// ─────────────────────────────── Logger ──────────────────────────────────────

const log = logger.component('BuildRelease');

// ─────────────────────────────── Interfaces ──────────────────────────────────

/**
 * Supported release target identifiers (user-facing flags).
 */
export type ReleaseTarget = 'macos-arm64' | 'macos-x64' | 'windows-x64';

/**
 * Full build target descriptor with all the paths derived from it.
 */
export interface IBuildTarget {
  /** User-facing label (e.g. "macos-arm64") */
  readonly label: ReleaseTarget;
  /** Rust target triple (e.g. "aarch64-apple-darwin") */
  readonly triple: string;
  /**
   * Glob-like subdirectory under `src-tauri/target/<triple>/release/bundle/`
   * where Tauri drops the signed artifacts.
   */
  readonly bundleSubdir: string;
  /** File extension of the primary artifact (e.g. ".app.tar.gz", ".nsis.zip") */
  readonly artifactExt: string;
  /** `platforms` key used in the Tauri updater `latest.json` */
  readonly updaterPlatformKey: string;
}

/**
 * Resolved signing keys ready to be injected as environment variables.
 */
export interface ISigningKeys {
  readonly privateKey: string;
  readonly privateKeyPassword: string;
}

/**
 * Parsed CLI options for the release script.
 */
export interface ICliOptions {
  readonly targets: ReleaseTarget[];
  readonly noSign: boolean;
  readonly outputDir: string;
  readonly showHelp: boolean;
}

/**
 * Result of a single target build.
 */
export interface IBuildResult {
  readonly target: IBuildTarget;
  /** Resolved path to the primary artifact (.app.tar.gz / .nsis.zip) */
  readonly artifactPath: string;
  /** Resolved path to the .sig file */
  readonly sigPath: string;
  /** Content of the .sig file (used when generating latest.json) */
  readonly sigContent: string;
  /** Destination path inside releases/<version>/<target>/ */
  readonly destPath: string;
}

/**
 * Tauri updater `latest.json` schema.
 * @see https://tauri.app/distribute/updater/
 */
export interface ILatestJson {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { signature: string; url: string }>;
}

// ─────────────────────────────── Constants ───────────────────────────────────

/** Project root (two levels up from scripts/) */
const PROJECT_ROOT = resolve(import.meta.dir, '..');

/** Map of supported release targets */
const BUILD_TARGETS: Readonly<Record<ReleaseTarget, IBuildTarget>> = {
  'macos-arm64': {
    label: 'macos-arm64',
    triple: 'aarch64-apple-darwin',
    bundleSubdir: 'macos',
    artifactExt: '.app.tar.gz',
    updaterPlatformKey: 'darwin-aarch64',
  },
  'macos-x64': {
    label: 'macos-x64',
    triple: 'x86_64-apple-darwin',
    bundleSubdir: 'macos',
    artifactExt: '.app.tar.gz',
    updaterPlatformKey: 'darwin-x86_64',
  },
  'windows-x64': {
    label: 'windows-x64',
    triple: 'x86_64-pc-windows-msvc',
    bundleSubdir: 'nsis',
    artifactExt: '.nsis.zip',
    updaterPlatformKey: 'windows-x86_64',
  },
} as const;

const ALL_TARGETS: ReleaseTarget[] = ['macos-arm64', 'macos-x64', 'windows-x64'];

const DEFAULT_OUTPUT_DIR = resolve(PROJECT_ROOT, 'releases');

/**
 * Default Bitwarden item name for the Tauri signing key.
 * Override with `BW_TAURI_KEY_ITEM` env var.
 */
const DEFAULT_BW_ITEM = 'tauri-signing-key';

/**
 * Base URL for artifact download links in `latest.json`.
 * Override with `RELEASE_HUB_BASE_URL` env var.
 * TODO(0.4.1.G): wire to the real upload hub once 0.4.1.G is deployed.
 */
const RELEASE_HUB_BASE_URL =
  process.env.RELEASE_HUB_BASE_URL ?? 'https://updates.mks2508.systems/tpv';

// ─────────────────────────────── CLI Parsing ─────────────────────────────────

/**
 * Prints help text to stdout and exits.
 */
function printHelp(): void {
  log.info(`
build-release.ts — TPV El Haido release builder

Usage:
  bun run scripts/build-release.ts --target <target> [options]

Targets:
  macos-arm64   Apple Silicon (aarch64-apple-darwin)
  macos-x64     Intel Mac (x86_64-apple-darwin)
  windows-x64   Windows x64 (x86_64-pc-windows-msvc)
  all           Build all targets

Options:
  --no-sign       Skip signing key injection (Tauri will use env vars if already set)
  --output <dir>  Output directory for releases/ tree (default: <project>/releases)
  --help          Show this message

Environment variables:
  TAURI_SIGNING_PRIVATE_KEY          Base64-encoded minisign private key
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD Key password
  BW_TAURI_KEY_ITEM                  Bitwarden item ID for signing key (default: "${DEFAULT_BW_ITEM}")
  RELEASE_HUB_BASE_URL               Download URL base for latest.json (default: "${RELEASE_HUB_BASE_URL}")
`);
}

/**
 * Parses `process.argv` into strongly-typed CLI options.
 *
 * @returns Parsed options or an error if arguments are invalid.
 */
export function parseCliOptions(): Result<ICliOptions, ResultError> {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    return ok({ targets: [], noSign: false, outputDir: DEFAULT_OUTPUT_DIR, showHelp: true });
  }

  const targetIdx = argv.indexOf('--target');
  if (targetIdx === -1 || targetIdx + 1 >= argv.length) {
    return err(
      resultError(
        'MISSING_TARGET',
        '--target is required. Use --help for usage.',
      ),
    );
  }

  const targetArg = argv[targetIdx + 1];
  let targets: ReleaseTarget[];

  if (targetArg === 'all') {
    targets = ALL_TARGETS;
  } else if (Object.keys(BUILD_TARGETS).includes(targetArg)) {
    targets = [targetArg as ReleaseTarget];
  } else {
    return err(
      resultError(
        'INVALID_TARGET',
        `Unknown target: "${targetArg}". Valid values: ${ALL_TARGETS.join(', ')}, all`,
      ),
    );
  }

  const noSign = argv.includes('--no-sign');

  const outputIdx = argv.indexOf('--output');
  const outputDir =
    outputIdx !== -1 && outputIdx + 1 < argv.length
      ? resolve(argv[outputIdx + 1])
      : DEFAULT_OUTPUT_DIR;

  return ok({ targets, noSign, outputDir, showHelp: false });
}

// ─────────────────────────────── Signing Keys ────────────────────────────────

/**
 * Attempts to read the Tauri signing key from Bitwarden CLI.
 *
 * Requires `bw` CLI to be installed and the vault to be unlocked
 * (BW_SESSION env var set or `bw unlock` run beforehand).
 *
 * @param itemId - Bitwarden item ID or name to retrieve
 * @returns The password stored in Bitwarden, or an error
 */
async function loadKeyFromBitwarden(
  itemId: string,
): Promise<Result<string, ResultError>> {
  log.info(`Trying Bitwarden CLI for item: "${itemId}"`);

  // Check if bw is available
  const statusResult = await tryCatchAsync(async () => {
    const proc = Bun.spawn(['bw', 'status'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    const text = await new Response(proc.stdout).text();
    return text.trim();
  }, 'BW_STATUS_FAILED');

  if (isErr(statusResult)) {
    return err(
      resultError(
        'BW_NOT_AVAILABLE',
        'Bitwarden CLI (bw) is not installed or not in PATH.',
        statusResult.error.cause,
      ),
    );
  }

  let statusData: { status: string };
  try {
    statusData = JSON.parse(statusResult.value);
  } catch {
    return err(
      resultError('BW_PARSE_ERROR', 'Could not parse bw status output.'),
    );
  }

  if (statusData.status !== 'unlocked') {
    return err(
      resultError(
        'BW_LOCKED',
        `Bitwarden vault is ${statusData.status}. Run "bw unlock" and set BW_SESSION, then retry.`,
      ),
    );
  }

  // Retrieve the password field
  const passwordResult = await tryCatchAsync(async () => {
    const proc = Bun.spawn(['bw', 'get', 'password', itemId], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    const text = await new Response(proc.stdout).text();
    return text.trim();
  }, 'BW_GET_FAILED');

  if (isErr(passwordResult)) {
    return err(
      resultError(
        'BW_GET_FAILED',
        `Failed to retrieve "${itemId}" from Bitwarden.`,
        passwordResult.error.cause,
      ),
    );
  }

  if (!passwordResult.value) {
    return err(
      resultError(
        'BW_EMPTY_VALUE',
        `Bitwarden item "${itemId}" returned an empty password.`,
      ),
    );
  }

  return ok(passwordResult.value);
}

/**
 * Loads Tauri signing keys.
 *
 * Resolution order:
 * 1. `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env vars
 * 2. Bitwarden CLI (item ID from `BW_TAURI_KEY_ITEM` env var, default: "tauri-signing-key")
 * 3. Returns `Err` with a clear message if neither source works
 *
 * @returns Resolved signing keys or an error.
 */
export async function loadSigningKeys(): Promise<Result<ISigningKeys, ResultError>> {
  const envKey = process.env.TAURI_SIGNING_PRIVATE_KEY;
  const envPwd = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;

  if (envKey && envPwd) {
    log.success('Signing keys loaded from environment variables.');
    return ok({ privateKey: envKey, privateKeyPassword: envPwd });
  }

  if (envKey && !envPwd) {
    log.warn(
      'TAURI_SIGNING_PRIVATE_KEY found but TAURI_SIGNING_PRIVATE_KEY_PASSWORD is missing.',
    );
  }

  log.info(
    'Signing keys not found in env vars — trying Bitwarden CLI fallback.',
  );

  const bwItem = process.env.BW_TAURI_KEY_ITEM ?? DEFAULT_BW_ITEM;
  const bwResult = await loadKeyFromBitwarden(bwItem);

  if (isErr(bwResult)) {
    log.warn(`Bitwarden fallback failed: ${bwResult.error.message}`);
    return err(
      resultError(
        'SIGNING_KEYS_UNAVAILABLE',
        [
          'Could not load Tauri signing keys from any source.',
          '',
          'To fix, set one of:',
          '  1. TAURI_SIGNING_PRIVATE_KEY + TAURI_SIGNING_PRIVATE_KEY_PASSWORD env vars',
          `  2. BW_TAURI_KEY_ITEM env var pointing to a Bitwarden item, with vault unlocked`,
          '',
          `Last error: ${bwResult.error.message}`,
        ].join('\n'),
      ),
    );
  }

  // When loading from Bitwarden, we expect the password field to contain
  // the private key value, and the key password to be stored in a separate
  // custom field named "password". For simplicity, we accept key-only from BW
  // and look for the password in TAURI_SIGNING_PRIVATE_KEY_PASSWORD still.
  const keyFromBw = bwResult.value;
  const pwdFromEnv = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? '';

  if (!pwdFromEnv) {
    log.warn(
      'Loaded private key from Bitwarden but TAURI_SIGNING_PRIVATE_KEY_PASSWORD is still unset. ' +
        'The build will proceed but signing may fail if the key has a password.',
    );
  }

  log.success('Signing key loaded from Bitwarden CLI.');
  return ok({ privateKey: keyFromBw, privateKeyPassword: pwdFromEnv });
}

// ─────────────────────────────── Version ─────────────────────────────────────

/**
 * Reads the application version from `src-tauri/tauri.conf.json`.
 *
 * @returns The version string (e.g. "0.1.0") or an error.
 */
export function readAppVersion(): Result<string, ResultError> {
  const confPath = resolve(PROJECT_ROOT, 'src-tauri', 'tauri.conf.json');

  if (!existsSync(confPath)) {
    return err(
      resultError('TAURI_CONF_NOT_FOUND', `tauri.conf.json not found at: ${confPath}`),
    );
  }

  try {
    const raw = readFileSync(confPath, 'utf-8');
    const conf = JSON.parse(raw) as { version?: string };
    if (!conf.version) {
      return err(
        resultError('TAURI_CONF_NO_VERSION', 'tauri.conf.json has no "version" field.'),
      );
    }
    return ok(conf.version);
  } catch (e) {
    return err(
      resultError('TAURI_CONF_PARSE_ERROR', 'Failed to parse tauri.conf.json.', e as Error),
    );
  }
}

// ─────────────────────────────── Platform guard ──────────────────────────────

/**
 * Returns an error if the current OS cannot build the requested target.
 *
 * macOS can only build macOS targets natively. Windows builds require the
 * MSVC toolchain — attempting them on macOS will fail at link time.
 *
 * @param target - The build target to validate.
 * @returns `ok(undefined)` if the target is buildable, or `err(...)` if not.
 */
export function validateTargetForCurrentPlatform(
  target: IBuildTarget,
): Result<void, ResultError> {
  const isWindows = process.platform === 'win32';
  const isDarwin = process.platform === 'darwin';

  if (target.label === 'windows-x64' && isDarwin) {
    return err(
      resultError(
        'CROSS_COMPILE_NOT_SUPPORTED',
        [
          `Target "${target.label}" (${target.triple}) requires running on a Windows host`,
          'or a cross-compile toolchain (mingw / llvm-mingw) installed on macOS.',
          'This script does NOT set up the toolchain automatically.',
          'Run "bun run release:windows" on the Windows machine directly.',
        ].join(' '),
      ),
    );
  }

  if ((target.label === 'macos-arm64' || target.label === 'macos-x64') && isWindows) {
    return err(
      resultError(
        'CROSS_COMPILE_NOT_SUPPORTED',
        `Target "${target.label}" requires macOS. Cannot cross-compile from Windows.`,
      ),
    );
  }

  return ok(undefined);
}

// ─────────────────────────────── Artifact resolution ─────────────────────────

/**
 * Resolves the primary artifact and its `.sig` file from the Tauri bundle output.
 *
 * @param target - Build target descriptor.
 * @returns Paths to `{ artifactPath, sigPath }` or an error.
 */
export function resolveArtifacts(
  target: IBuildTarget,
): Result<{ artifactPath: string; sigPath: string }, ResultError> {
  const bundleDir = resolve(
    PROJECT_ROOT,
    'src-tauri',
    'target',
    target.triple,
    'release',
    'bundle',
    target.bundleSubdir,
  );

  if (!existsSync(bundleDir)) {
    return err(
      resultError(
        'BUNDLE_DIR_NOT_FOUND',
        `Bundle directory not found: ${bundleDir}. Did the Tauri build succeed?`,
      ),
    );
  }

  // Scan directory for files matching the expected extension
  const entries = readdirSync(bundleDir);

  const artifactName = entries.find(
    (f) => f.endsWith(target.artifactExt) && !f.endsWith('.sig'),
  );

  if (!artifactName) {
    return err(
      resultError(
        'ARTIFACT_NOT_FOUND',
        `No "*${target.artifactExt}" artifact found in: ${bundleDir}`,
      ),
    );
  }

  const sigName = entries.find(
    (f) => f === `${artifactName}.sig`,
  );

  if (!sigName) {
    return err(
      resultError(
        'SIG_NOT_FOUND',
        `No "${artifactName}.sig" file found in: ${bundleDir}. Was --no-sign used without signing?`,
      ),
    );
  }

  return ok({
    artifactPath: join(bundleDir, artifactName),
    sigPath: join(bundleDir, sigName),
  });
}

// ─────────────────────────────── Build orchestration ─────────────────────────

/**
 * Runs `bun run prebuild` to ensure AEAT sidecar exists for the current platform.
 *
 * @returns `ok(undefined)` on success, `err(...)` on failure.
 */
async function runPrebuild(): Promise<Result<void, ResultError>> {
  log.info('Running prebuild (sidecar check)…');
  const result = await tryCatchAsync(async () => {
    const proc = Bun.spawn(['bun', 'run', 'prebuild'], {
      cwd: PROJECT_ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`prebuild exited with code ${exitCode}`);
    }
  }, 'PREBUILD_FAILED');

  if (isErr(result)) {
    return err(
      resultError(
        'PREBUILD_FAILED',
        `Prebuild step failed: ${result.error.message}`,
        result.error.cause,
      ),
    );
  }

  log.success('Prebuild complete.');
  return ok(undefined);
}

/**
 * Runs `tauri build --target <triple>` with signing env vars injected.
 *
 * @param target   - The build target.
 * @param keys     - Signing keys (may be empty if `noSign` is true).
 * @param noSign   - If true, signing keys are not injected.
 * @returns `ok(undefined)` on success, `err(...)` on failure.
 */
async function runTauriBuild(
  target: IBuildTarget,
  keys: ISigningKeys | null,
  noSign: boolean,
): Promise<Result<void, ResultError>> {
  log.info(`Building Tauri for target: ${target.label} (${target.triple})`);

  const extraEnv: Record<string, string> = {};
  if (!noSign && keys) {
    extraEnv.TAURI_SIGNING_PRIVATE_KEY = keys.privateKey;
    extraEnv.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = keys.privateKeyPassword;
  }

  const result = await tryCatchAsync(async () => {
    const proc = Bun.spawn(
      ['bun', 'run', 'tauri', 'build', '--target', target.triple],
      {
        cwd: PROJECT_ROOT,
        stdout: 'inherit',
        stderr: 'inherit',
        env: {
          ...process.env,
          ...extraEnv,
        } as Record<string, string>,
      },
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`tauri build exited with code ${exitCode}`);
    }
  }, 'TAURI_BUILD_FAILED');

  if (isErr(result)) {
    return err(
      resultError(
        'TAURI_BUILD_FAILED',
        `tauri build failed for ${target.label}: ${result.error.message}`,
        result.error.cause,
      ),
    );
  }

  log.success(`Tauri build complete for ${target.label}.`);
  return ok(undefined);
}

/**
 * Copies build artifacts into the structured output directory.
 *
 * Target layout: `<outputDir>/<version>/<target-label>/<filename>`
 *
 * @param target      - Build target.
 * @param version     - App version string.
 * @param artifacts   - Resolved artifact paths.
 * @param outputDir   - Root output directory.
 * @returns Destination paths or an error.
 */
export function copyArtifacts(
  target: IBuildTarget,
  version: string,
  artifacts: { artifactPath: string; sigPath: string },
  outputDir: string,
): Result<{ destArtifact: string; destSig: string }, ResultError> {
  const destDir = join(outputDir, version, target.label);

  const mkResult = tryCatch(() => {
    mkdirSync(destDir, { recursive: true });
  }, 'MKDIR_FAILED');

  if (isErr(mkResult)) {
    return err(
      resultError(
        'MKDIR_FAILED',
        `Failed to create output directory: ${destDir}`,
        mkResult.error.cause,
      ),
    );
  }

  const artifactFilename = basename(artifacts.artifactPath);
  const sigFilename = basename(artifacts.sigPath);
  const destArtifact = join(destDir, artifactFilename);
  const destSig = join(destDir, sigFilename);

  const copyResult = tryCatch(() => {
    cpSync(artifacts.artifactPath, destArtifact);
    cpSync(artifacts.sigPath, destSig);
  }, 'COPY_FAILED');

  if (isErr(copyResult)) {
    return err(
      resultError(
        'COPY_FAILED',
        `Failed to copy artifacts to: ${destDir}`,
        copyResult.error.cause,
      ),
    );
  }

  log.success(`Artifacts copied to: ${destDir}`);
  return ok({ destArtifact, destSig });
}

/**
 * Orchestrates the full build pipeline for a single target:
 *   prebuild → tauri build → verify artifacts → copy
 *
 * @param target    - The build target to process.
 * @param keys      - Signing keys (null if noSign).
 * @param noSign    - Whether to skip signing key injection.
 * @param version   - App version string.
 * @param outputDir - Root output directory.
 * @returns A `IBuildResult` on success, or an error.
 */
export async function buildTarget(
  target: IBuildTarget,
  keys: ISigningKeys | null,
  noSign: boolean,
  version: string,
  outputDir: string,
): Promise<Result<IBuildResult, ResultError>> {
  log.header(`Building target: ${target.label}`, target.triple);

  // Platform guard
  const guardResult = validateTargetForCurrentPlatform(target);
  if (isErr(guardResult)) {
    return err(guardResult.error);
  }

  // Prebuild (sidecar check)
  const prebuildResult = await runPrebuild();
  if (isErr(prebuildResult)) {
    return err(prebuildResult.error);
  }

  // Tauri build
  const buildResult = await runTauriBuild(target, keys, noSign);
  if (isErr(buildResult)) {
    return err(buildResult.error);
  }

  // Verify artifacts
  const artifactResult = resolveArtifacts(target);
  if (isErr(artifactResult)) {
    return err(artifactResult.error);
  }

  const { artifactPath, sigPath } = artifactResult.value;
  log.info(`Artifact: ${artifactPath}`);
  log.info(`Sig:      ${sigPath}`);

  // Copy to output
  const copyResult = copyArtifacts(target, version, { artifactPath, sigPath }, outputDir);
  if (isErr(copyResult)) {
    return err(copyResult.error);
  }

  // Read sig content for latest.json
  const sigContent = readFileSync(sigPath, 'utf-8').trim();

  return ok({
    target,
    artifactPath,
    sigPath,
    sigContent,
    destPath: copyResult.value.destArtifact,
  });
}

// ─────────────────────────────── latest.json ─────────────────────────────────

/**
 * Generates the Tauri updater `latest.json` from the set of successfully built targets.
 *
 * The file is written to `<outputDir>/<version>/latest.json`.
 *
 * @param version   - App version string.
 * @param results   - Array of successful build results.
 * @param outputDir - Root output directory.
 * @returns `ok(path)` with the path to the generated file, or an error.
 */
export async function generateLatestJson(
  version: string,
  results: IBuildResult[],
  outputDir: string,
): Promise<Result<string, ResultError>> {
  const versionDir = join(outputDir, version);

  const mkResult = tryCatch(() => {
    mkdirSync(versionDir, { recursive: true });
  }, 'MKDIR_FAILED');

  if (isErr(mkResult)) {
    return err(
      resultError('MKDIR_FAILED', `Failed to create dir: ${versionDir}`, mkResult.error.cause),
    );
  }

  const platforms: Record<string, { signature: string; url: string }> = {};

  for (const result of results) {
    const filename = basename(result.artifactPath);
    const url = `${RELEASE_HUB_BASE_URL}/${result.target.label}/${filename}`;
    platforms[result.target.updaterPlatformKey] = {
      signature: result.sigContent,
      url,
    };
  }

  const latestJson: ILatestJson = {
    version,
    notes: 'Release notes here',
    pub_date: new Date().toISOString(),
    platforms,
  };

  const outPath = join(versionDir, 'latest.json');

  const writeResult = await tryCatchAsync(async () => {
    await Bun.write(outPath, JSON.stringify(latestJson, null, 2));
  }, 'WRITE_FAILED');

  if (isErr(writeResult)) {
    return err(
      resultError('WRITE_FAILED', `Failed to write latest.json: ${outPath}`, writeResult.error.cause),
    );
  }

  log.success(`latest.json written to: ${outPath}`);
  return ok(outPath);
}

// ─────────────────────────────── Main ────────────────────────────────────────

/**
 * Entry point — parses CLI args and orchestrates the full release pipeline.
 */
async function main(): Promise<void> {
  log.header('TPV El Haido — Release Builder', 'feat-phase 0.4.1.G-prep');
  log.divider();

  // 1. Parse CLI
  const cliResult = parseCliOptions();
  if (isErr(cliResult)) {
    log.error(cliResult.error.message);
    printHelp();
    process.exit(1);
  }

  const opts = cliResult.value;

  if (opts.showHelp) {
    printHelp();
    process.exit(0);
  }

  log.info(`Targets:    ${opts.targets.join(', ')}`);
  log.info(`No-sign:    ${opts.noSign}`);
  log.info(`Output dir: ${opts.outputDir}`);

  // 2. Read app version
  const versionResult = readAppVersion();
  if (isErr(versionResult)) {
    log.error(`Cannot read version: ${versionResult.error.message}`);
    process.exit(1);
  }
  const version = versionResult.value;
  log.info(`App version: ${version}`);

  // 3. Load signing keys (skip if --no-sign)
  let signingKeys: ISigningKeys | null = null;
  if (!opts.noSign) {
    const keysResult = await loadSigningKeys();
    if (isErr(keysResult)) {
      log.error(`Cannot load signing keys:\n${keysResult.error.message}`);
      log.warn('Tip: use --no-sign to skip key loading (unsigned build — NOT for production).');
      process.exit(1);
    }
    signingKeys = keysResult.value;
  } else {
    log.warn('--no-sign: skipping signing key injection. Build artifacts will not be signed.');
  }

  log.divider();

  // 4. Build each target
  const successResults: IBuildResult[] = [];
  const failedTargets: string[] = [];

  for (const targetLabel of opts.targets) {
    const target = BUILD_TARGETS[targetLabel];
    const result = await buildTarget(target, signingKeys, opts.noSign, version, opts.outputDir);

    if (isOk(result)) {
      successResults.push(result.value);
    } else {
      log.error(`Build failed for ${targetLabel}: ${result.error.message}`);
      failedTargets.push(targetLabel);
    }

    log.divider();
  }

  // 5. Generate latest.json from successful builds
  if (successResults.length > 0) {
    const jsonResult = await generateLatestJson(version, successResults, opts.outputDir);
    if (isErr(jsonResult)) {
      log.error(`Failed to generate latest.json: ${jsonResult.error.message}`);
    }
  }

  // 6. Summary
  log.header('Build Summary', `v${version}`);
  for (const r of successResults) {
    log.success(`${r.target.label} => ${r.destPath}`);
  }
  for (const t of failedTargets) {
    log.error(`${t} => FAILED`);
  }

  if (failedTargets.length > 0) {
    log.critical(`${failedTargets.length} target(s) failed.`);
    process.exit(1);
  }

  log.success('All targets built successfully.');
}

main().catch((e: unknown) => {
  log.critical('Unhandled error in release builder:', e);
  process.exit(1);
});
