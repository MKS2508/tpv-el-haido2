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
 * Environment variables (all optional — script falls back to file/Bitwarden):
 *   TAURI_SIGNING_PRIVATE_KEY          — Base64 private key contents (skips file lookup)
 *   TAURI_SIGNING_PRIVATE_KEY_PASSWORD — Passphrase (skips Bitwarden lookup)
 *   TAURI_KEY_NAME                     — Key file basename, default "tpv-el-haido"
 *                                        (looked up at ~/.tauri/<name>.key, then <repo>/tauri-keys/<name>.key)
 *   BW_TAURI_KEY_ITEM                  — Bitwarden item name/ID, default "HAIDO"
 *   BW_TAURI_KEY_FIELD                 — BW custom field name, default "PASSPHRASE"
 *   BW_SESSION                         — Pre-set BW session token (skips interactive unlock prompt)
 *   RELEASE_HUB_BASE_URL               — Base URL for artifact download links in latest.json,
 *                                        default "https://updates.mks2508.systems/tpv"
 *                                        TODO(0.4.1.G): wire to real upload hub
 *
 * Bitwarden interactive flow:
 *   - If `bw status` returns "locked", the script invokes `bw unlock --raw` with
 *     stdin/stderr inherited from the TTY, prompting for the master password.
 *   - The captured BW_SESSION is exported into process.env for subsequent `bw` calls.
 *   - If `bw status` returns "unauthenticated", the script errors out — run `bw login` first.
 */

import { existsSync, mkdirSync, cpSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { homedir } from 'node:os';
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
export type ReleaseTarget = 'macos-arm64' | 'macos-x64' | 'windows-x64' | 'linux-x64' | 'linux-arm64';

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
   * where Tauri drops the OTA bundle (used by the auto-updater).
   */
  readonly bundleSubdir: string;
  /** File extension of the primary OTA artifact (".app.tar.gz" or ".nsis.zip") */
  readonly artifactExt: string;
  /** `platforms` key used in the Tauri updater `latest.json` */
  readonly updaterPlatformKey: string;
  /**
   * Subdirectory and extension where Tauri places the human-friendly installer
   * (DMG on macOS, NSIS .exe on Windows). Used to build a stable download link
   * for the docs site / website.
   */
  readonly installerSubdir: string;
  readonly installerExt: string;
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
  /** Resolved path to the primary OTA bundle artifact (.app.tar.gz / .nsis.zip) */
  readonly artifactPath: string;
  /** Resolved path to the .sig file */
  readonly sigPath: string;
  /** Content of the .sig file (used when generating latest.json) */
  readonly sigContent: string;
  /**
   * Destination path inside releases/<version>/<target>/ for the OTA bundle
   * (after canonical rename — e.g. tpv-haido-0.1.0-macos-arm64.app.tar.gz).
   */
  readonly destPath: string;
  /**
   * Destination path of the human-friendly installer (DMG / setup.exe) inside
   * releases/<version>/<target>/, after canonical rename.
   * `null` if no installer was produced (e.g. installer subdir missing).
   */
  readonly installerDestPath: string | null;
  /** Canonical filename (basename) of the OTA bundle for URL templates. */
  readonly canonicalArtifactName: string;
  /** Canonical filename (basename) of the installer, or null. */
  readonly canonicalInstallerName: string | null;
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
    installerSubdir: 'dmg',
    installerExt: '.dmg',
  },
  'macos-x64': {
    label: 'macos-x64',
    triple: 'x86_64-apple-darwin',
    bundleSubdir: 'macos',
    artifactExt: '.app.tar.gz',
    updaterPlatformKey: 'darwin-x86_64',
    installerSubdir: 'dmg',
    installerExt: '.dmg',
  },
  'windows-x64': {
    label: 'windows-x64',
    triple: 'x86_64-pc-windows-msvc',
    bundleSubdir: 'nsis',
    artifactExt: '.nsis.zip',
    updaterPlatformKey: 'windows-x86_64',
    installerSubdir: 'nsis',
    // NSIS installer extension — Tauri produces *_<version>_x64-setup.exe in the same nsis/ dir
    installerExt: '-setup.exe',
  },
  'linux-x64': {
    label: 'linux-x64',
    triple: 'x86_64-unknown-linux-gnu',
    bundleSubdir: 'appimage',
    // HIPÓTESIS a confirmar en M4 con un build real: Tauri 2.10 con
    // createUpdaterArtifacts=true generó -setup.exe SIN wrapper .zip para Windows
    // (ver 0.4.0.D). Se asume que hace lo mismo con AppImage: .AppImage crudo +
    // .AppImage.sig, sin el wrapper .AppImage.tar.gz de versiones anteriores de Tauri.
    // Si el build real produce .AppImage.tar.gz, corregir este valor Y replicar el
    // fix en el checkout local (ver M4 paso de verificación de bundle real).
    artifactExt: '.AppImage',
    updaterPlatformKey: 'linux-x86_64',
    installerSubdir: 'appimage',
    installerExt: '.AppImage',
  },
  'linux-arm64': {
    label: 'linux-arm64',
    triple: 'aarch64-unknown-linux-gnu',
    bundleSubdir: 'appimage',
    // Misma hipótesis sin confirmar que linux-x64 (ver comentario arriba,
    // build-release.ts:180-185) — mismo artifactExt hasta que un build real
    // en runner ubuntu-24.04-arm lo confirme (M4/M5 lo verifican).
    artifactExt: '.AppImage',
    updaterPlatformKey: 'linux-aarch64',
    installerSubdir: 'appimage',
    installerExt: '.AppImage',
  },
} as const;

/**
 * Canonical artifact basename used in `releases/<version>/<target>/` and in
 * download URLs published by haidodocs / latest.json.
 *
 * Format: `tpv-haido-<version>-<target><ext>`
 *
 * Examples:
 *   - `tpv-haido-0.1.0-macos-arm64.app.tar.gz`
 *   - `tpv-haido-0.1.0-macos-arm64.app.tar.gz.sig`
 *   - `tpv-haido-0.1.0-macos-arm64.dmg`
 *   - `tpv-haido-0.1.0-windows-x64.nsis.zip`
 *   - `tpv-haido-0.1.0-windows-x64-setup.exe`
 *
 * @param version - App semver string from tauri.conf.json
 * @param target  - Release target label (e.g. "macos-arm64")
 * @param ext     - Extension including leading dot (e.g. ".app.tar.gz")
 */
export function canonicalName(version: string, target: ReleaseTarget, ext: string): string {
  return `tpv-haido-${version}-${target}${ext}`;
}

const ALL_TARGETS: ReleaseTarget[] = ['macos-arm64', 'macos-x64', 'windows-x64', 'linux-x64', 'linux-arm64'];

const DEFAULT_OUTPUT_DIR = resolve(PROJECT_ROOT, 'releases');

/**
 * Default Bitwarden item name where the Tauri signing key passphrase is stored.
 * Override with `BW_TAURI_KEY_ITEM` env var.
 *
 * Project convention: BW item "HAIDO" (full name "haido sign passphrase") with
 * a custom field named "PASSPHRASE" containing the minisign key passphrase.
 */
const DEFAULT_BW_ITEM = 'HAIDO';

/**
 * Default custom field name inside the BW item that holds the passphrase.
 * Override with `BW_TAURI_KEY_FIELD` env var.
 */
const DEFAULT_BW_FIELD = 'PASSPHRASE';

/**
 * Default Tauri signing key file name (without extension).
 * Override with `TAURI_KEY_NAME` env var.
 *
 * Resolution order (cross-platform via `os.homedir()` + project root fallback):
 *   1. `<homedir>/.tauri/<name>.key`           (canonical Tauri location, macOS / Linux / Windows)
 *   2. `<project-root>/tauri-keys/<name>.key`  (in-repo fallback, NOT committed)
 */
const DEFAULT_TAURI_KEY_NAME = 'tpv-el-haido';

/**
 * Base URL for artifact download links in `latest.json`.
 *
 * IMPORTANT: do NOT include the tenant slug in this URL — the
 * `desktop-release-hub` server resolves the tenant from the subdomain
 * (`<slug>.releases.mks2508.systems`) and injects it server-side when serving
 * `/api/dl/*`. The client only needs to know `/api/dl/<version>/<target>/<file>`.
 *
 * Default: `https://haido.releases.mks2508.systems/api/dl` (haido tenant prod).
 * Override with `RELEASE_HUB_BASE_URL` env var when publishing for another tenant.
 */
const RELEASE_HUB_BASE_URL =
  process.env.RELEASE_HUB_BASE_URL ?? 'https://haido.releases.mks2508.systems/api/dl';

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
  linux-x64     Linux x64 (x86_64-unknown-linux-gnu)
  linux-arm64   Linux ARM64 / RPi (aarch64-unknown-linux-gnu)
  all           Build all targets

Options:
  --no-sign       Skip signing key injection (Tauri will use env vars if already set)
  --output <dir>  Output directory for releases/ tree (default: <project>/releases)
  --help          Show this message

Environment variables (all optional):
  TAURI_SIGNING_PRIVATE_KEY          Base64 private key contents (overrides file lookup)
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD Passphrase (overrides Bitwarden lookup)
  TAURI_KEY_NAME                     Key file basename (default: "${DEFAULT_TAURI_KEY_NAME}")
                                     Looked up at ~/.tauri/<name>.key, then <repo>/tauri-keys/<name>.key
  BW_TAURI_KEY_ITEM                  Bitwarden item name/ID (default: "${DEFAULT_BW_ITEM}")
  BW_TAURI_KEY_FIELD                 BW custom field name (default: "${DEFAULT_BW_FIELD}")
  BW_SESSION                         Pre-set BW session (skips interactive unlock prompt)
  RELEASE_HUB_BASE_URL               Download URL base for latest.json (default: "${RELEASE_HUB_BASE_URL}")

Bitwarden behaviour:
  - Locked vault       → interactive prompt for master password (bw unlock --raw on TTY)
  - Unauthenticated    → error, run "bw login" first
  - Already unlocked   → reads BW_SESSION from env automatically
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
 * Locates the Tauri signing private key file on disk, cross-platform.
 *
 * Resolution order — **project-local first** because the repo-pinned key is
 * the source of truth for this project. The `~/.tauri/` location is canonical
 * Tauri convention but may contain an older/different key from past projects
 * (e.g. an `rsign`-format file that won't decrypt with the project passphrase).
 *
 *   1. `<projectRoot>/tauri-keys/<keyName>.key` — project-pinned (gitignored, real key here).
 *   2. `<homedir>/.tauri/<keyName>.key`         — Tauri convention fallback.
 *      Works on macOS (`~/.tauri/`), Linux (`~/.tauri/`), and Windows (`%USERPROFILE%\.tauri\`).
 *
 * Override the lookup with the env var `TAURI_KEY_PATH=/abs/path/to/<name>.key`
 * (handled by the caller — see `loadSigningKeys`).
 *
 * @param keyName - Key file name without extension (e.g. "tpv-el-haido").
 * @returns Path to the key file or an error if not found in any known location.
 */
export function locatePrivateKeyFile(keyName: string): Result<string, ResultError> {
  const candidates = [
    join(PROJECT_ROOT, 'tauri-keys', `${keyName}.key`),
    join(homedir(), '.tauri', `${keyName}.key`),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      log.info(`Private key file found at: ${candidate}`);
      return ok(candidate);
    }
  }

  return err(
    resultError(
      'PRIVATE_KEY_FILE_NOT_FOUND',
      [
        `Tauri signing private key "${keyName}.key" not found in any known location.`,
        'Searched:',
        ...candidates.map((c) => `  - ${c}`),
        '',
        'Either:',
        `  - Generate it with: bun run tauri signer generate -w ~/.tauri/${keyName}.key`,
        `  - Copy from another machine to ~/.tauri/${keyName}.key`,
        `  - Set TAURI_KEY_NAME env var to override the default key name ("${DEFAULT_TAURI_KEY_NAME}").`,
      ].join('\n'),
    ),
  );
}

/**
 * Reads the contents of a Tauri private key file and normalises it for the
 * `TAURI_SIGNING_PRIVATE_KEY` env var consumed by `tauri build`.
 *
 * Tauri (via `minisign-rs`) expects the env var to contain the **base64
 * encoding of the entire key file** (header comment + body line + trailing
 * newline), not the raw file content with comment header.
 *
 * Two formats found in the wild:
 *   - Plain text minisign file:
 *       `untrusted comment: minisign encrypted secret key\nRWRTY...\n`
 *     → base64-encode the whole thing before passing.
 *   - Already base64-encoded blob (one long line):
 *       `dW50cnVzdGVkIGNvbW1lbnQ6IH...`
 *     → pass through unchanged.
 *
 * Detection is heuristic: if the file starts with `untrusted comment:` we
 * base64-encode it; otherwise we assume it's already encoded.
 *
 * @param path - Absolute path to the key file.
 * @returns Base64-encoded key string ready to inject into `TAURI_SIGNING_PRIVATE_KEY`,
 *   or an error.
 */
function readPrivateKeyFile(path: string): Result<string, ResultError> {
  return tryCatch(() => {
    const raw = readFileSync(path, 'utf-8');
    if (!raw.trim()) {
      throw new Error(`Key file "${path}" is empty.`);
    }

    // Plain-text minisign file → base64-encode the whole thing.
    if (raw.startsWith('untrusted comment:')) {
      return Buffer.from(raw, 'utf-8').toString('base64');
    }

    // Otherwise assume already base64-encoded — return as a single trimmed line.
    return raw.trim();
  }, 'PRIVATE_KEY_READ_FAILED');
}

/**
 * Runs `bw status` and returns the parsed status object.
 *
 * @returns Status payload (`{status: 'unlocked'|'locked'|'unauthenticated'|...}`) or an error.
 */
async function getBitwardenStatus(): Promise<Result<{ status: string }, ResultError>> {
  const result = await tryCatchAsync(async () => {
    const proc = Bun.spawn(['bw', 'status'], { stdout: 'pipe', stderr: 'pipe' });
    await proc.exited;
    const text = await new Response(proc.stdout).text();
    return text.trim();
  }, 'BW_STATUS_FAILED');

  if (isErr(result)) {
    return err(
      resultError(
        'BW_NOT_AVAILABLE',
        'Bitwarden CLI (bw) is not installed or not in PATH.',
        result.error.cause,
      ),
    );
  }

  return tryCatch(() => JSON.parse(result.value) as { status: string }, 'BW_PARSE_ERROR');
}

/**
 * Unlocks the Bitwarden vault interactively by prompting for the master password
 * on the inherited TTY, then captures the resulting `BW_SESSION` and exports it
 * to `process.env` for the rest of this process.
 *
 * Uses `bw unlock --raw` which writes ONLY the session token to stdout,
 * making it easy to capture programmatically while the password prompt
 * stays on stderr/TTY.
 *
 * @returns `ok(undefined)` on success, `err(...)` if the unlock failed or was cancelled.
 */
async function unlockBitwardenInteractive(): Promise<Result<void, ResultError>> {
  log.warn('Bitwarden vault is locked — prompting for master password.');
  log.info('(If you cancel with Ctrl+C, use --no-sign or set BW_SESSION manually.)');

  const result = await tryCatchAsync(async () => {
    // `bw unlock --raw` prints the session token to stdout, prompts on stderr/TTY.
    // We pipe stdout to capture, but inherit stdin/stderr so the password prompt works.
    const proc = Bun.spawn(['bw', 'unlock', '--raw'], {
      stdin: 'inherit',
      stdout: 'pipe',
      stderr: 'inherit',
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`bw unlock exited with code ${exitCode}`);
    }
    const session = (await new Response(proc.stdout).text()).trim();
    if (!session) {
      throw new Error('bw unlock returned an empty session token.');
    }
    return session;
  }, 'BW_UNLOCK_FAILED');

  if (isErr(result)) {
    return err(
      resultError(
        'BW_UNLOCK_FAILED',
        `Could not unlock Bitwarden vault: ${result.error.message}`,
        result.error.cause,
      ),
    );
  }

  // Export session for any subsequent `bw` calls in this process.
  process.env.BW_SESSION = result.value;
  log.success('Bitwarden vault unlocked. BW_SESSION set for this process.');
  return ok(undefined);
}

/**
 * Reads a custom field value from a Bitwarden item.
 *
 * Uses `bw get item <id> --raw` (full JSON) and extracts `fields[name=fieldName].value`
 * because `bw get password <id>` only returns the `login.password` field, which is
 * not where the Tauri signing passphrase is stored in this project.
 *
 * @param itemId   - BW item ID or search name (e.g. "HAIDO").
 * @param fieldName - Custom field name to read (e.g. "PASSPHRASE"). Case-sensitive.
 * @returns The field value, or an error.
 */
async function getBitwardenCustomField(
  itemId: string,
  fieldName: string,
): Promise<Result<string, ResultError>> {
  const result = await tryCatchAsync(async () => {
    const proc = Bun.spawn(['bw', 'get', 'item', itemId, '--raw'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    const text = await new Response(proc.stdout).text();
    return text.trim();
  }, 'BW_GET_ITEM_FAILED');

  if (isErr(result)) {
    return err(
      resultError(
        'BW_GET_ITEM_FAILED',
        `Failed to retrieve item "${itemId}" from Bitwarden.`,
        result.error.cause,
      ),
    );
  }

  const parseResult = tryCatch(
    () => JSON.parse(result.value) as { fields?: Array<{ name: string; value: string }> },
    'BW_ITEM_PARSE_ERROR',
  );
  if (isErr(parseResult)) {
    return err(
      resultError('BW_ITEM_PARSE_ERROR', `Could not parse item "${itemId}" JSON.`, parseResult.error.cause),
    );
  }

  const field = parseResult.value.fields?.find((f) => f.name === fieldName);
  if (!field || !field.value) {
    return err(
      resultError(
        'BW_FIELD_NOT_FOUND',
        `Item "${itemId}" has no custom field "${fieldName}" (or it is empty).`,
      ),
    );
  }

  return ok(field.value);
}

/**
 * Resolves the signing key passphrase via env var first, then Bitwarden.
 *
 * Bitwarden flow:
 *   1. Check `bw status`. If `unauthenticated` → error (user must `bw login` first).
 *   2. If `locked` → prompt master password interactively and capture `BW_SESSION`.
 *   3. Read custom field `<BW_TAURI_KEY_FIELD>` from item `<BW_TAURI_KEY_ITEM>`.
 *
 * @returns Passphrase string or an error.
 */
async function resolvePassphrase(): Promise<Result<string, ResultError>> {
  const envPwd = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
  if (envPwd) {
    log.success('Passphrase loaded from TAURI_SIGNING_PRIVATE_KEY_PASSWORD env var.');
    return ok(envPwd);
  }

  log.info('Passphrase not in env vars — trying Bitwarden CLI.');

  const statusResult = await getBitwardenStatus();
  if (isErr(statusResult)) {
    return err(statusResult.error);
  }

  const status = statusResult.value.status;
  if (status === 'unauthenticated') {
    return err(
      resultError(
        'BW_UNAUTHENTICATED',
        'Bitwarden vault is unauthenticated. Run "bw login" first, then retry.',
      ),
    );
  }

  if (status === 'locked') {
    const unlockResult = await unlockBitwardenInteractive();
    if (isErr(unlockResult)) {
      return err(unlockResult.error);
    }
  }

  const itemId = process.env.BW_TAURI_KEY_ITEM ?? DEFAULT_BW_ITEM;
  const fieldName = process.env.BW_TAURI_KEY_FIELD ?? DEFAULT_BW_FIELD;

  log.info(`Reading custom field "${fieldName}" from BW item "${itemId}"…`);
  const fieldResult = await getBitwardenCustomField(itemId, fieldName);
  if (isErr(fieldResult)) {
    return err(fieldResult.error);
  }

  log.success(`Passphrase loaded from Bitwarden item "${itemId}".`);
  return ok(fieldResult.value);
}

/**
 * Loads Tauri signing keys (private key + passphrase).
 *
 * Resolution strategy (independent for each piece):
 *
 * **Private key**:
 *   1. `TAURI_SIGNING_PRIVATE_KEY` env var (used as-is, expected base64 contents).
 *   2. File at `<homedir>/.tauri/<TAURI_KEY_NAME>.key` (default name: "tpv-el-haido").
 *   3. File at `<projectRoot>/tauri-keys/<TAURI_KEY_NAME>.key`.
 *
 * **Passphrase**:
 *   1. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env var.
 *   2. Bitwarden CLI: custom field `<BW_TAURI_KEY_FIELD>` (default "PASSPHRASE") of
 *      item `<BW_TAURI_KEY_ITEM>` (default "HAIDO"). If the vault is locked, the
 *      master password is requested interactively on the TTY and `BW_SESSION` is
 *      auto-set for the rest of the process.
 *
 * Cross-platform: paths use `os.homedir()` and `node:path.join`, working on
 * macOS, Linux, and Windows.
 *
 * @returns Resolved signing keys or an aggregated error.
 */
export async function loadSigningKeys(): Promise<Result<ISigningKeys, ResultError>> {
  // ─── Private key ───
  let privateKey: string;
  const envKey = process.env.TAURI_SIGNING_PRIVATE_KEY;
  const envKeyPath = process.env.TAURI_KEY_PATH;

  if (envKey) {
    log.success('Private key loaded from TAURI_SIGNING_PRIVATE_KEY env var.');
    privateKey = envKey;
  } else if (envKeyPath) {
    log.info(`Reading private key from TAURI_KEY_PATH: ${envKeyPath}`);
    const readResult = readPrivateKeyFile(envKeyPath);
    if (isErr(readResult)) {
      return err(readResult.error);
    }
    privateKey = readResult.value;
    log.success('Private key loaded from TAURI_KEY_PATH.');
  } else {
    const keyName = process.env.TAURI_KEY_NAME ?? DEFAULT_TAURI_KEY_NAME;
    log.info(`Private key not in env — locating key file "${keyName}.key"…`);

    const fileResult = locatePrivateKeyFile(keyName);
    if (isErr(fileResult)) {
      return err(fileResult.error);
    }

    const readResult = readPrivateKeyFile(fileResult.value);
    if (isErr(readResult)) {
      return err(readResult.error);
    }
    privateKey = readResult.value;
    log.success('Private key loaded from disk.');
  }

  // ─── Passphrase ───
  const pwdResult = await resolvePassphrase();
  if (isErr(pwdResult)) {
    return err(
      resultError(
        'SIGNING_KEYS_UNAVAILABLE',
        [
          'Private key was loaded but the passphrase could not be resolved.',
          '',
          'To fix, set one of:',
          '  1. TAURI_SIGNING_PRIVATE_KEY_PASSWORD env var',
          `  2. Bitwarden item "${process.env.BW_TAURI_KEY_ITEM ?? DEFAULT_BW_ITEM}" with custom field "${process.env.BW_TAURI_KEY_FIELD ?? DEFAULT_BW_FIELD}"`,
          '     (vault must be logged in; will prompt master password if locked)',
          '',
          `Last error: ${pwdResult.error.message}`,
        ].join('\n'),
      ),
    );
  }

  return ok({ privateKey, privateKeyPassword: pwdResult.value });
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
  const isLinux = process.platform === 'linux';

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

  if (target.label === 'linux-x64' && !isLinux) {
    return err(
      resultError(
        'CROSS_COMPILE_NOT_SUPPORTED',
        [
          `Target "${target.label}" (${target.triple}) requires running on a Linux host.`,
          'This script does NOT set up a cross-compile toolchain automatically.',
          'Run this on the target Linux machine directly (e.g. supermicro-pcbar via SSH).',
        ].join(' '),
      ),
    );
  }

  if (target.label === 'linux-arm64' && !isLinux) {
    return err(
      resultError(
        'CROSS_COMPILE_NOT_SUPPORTED',
        `Target "${target.label}" (${target.triple}) requires running on a Linux ARM64 host (e.g. GitHub Actions ubuntu-24.04-arm runner).`,
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

/**
 * Resolves the human-friendly installer (DMG / setup.exe) from the Tauri
 * bundle output, if it exists.
 *
 * macOS: Tauri produces `<productName>_<version>_<arch>.dmg` under `bundle/dmg/`.
 * Windows NSIS: produces `<productName>_<version>_x64-setup.exe` under `bundle/nsis/`.
 *
 * Returns `null` (not an error) when the installer subdir doesn't exist or
 * no matching file is found — e.g. older Tauri configs that disable DMG.
 *
 * @param target - Build target descriptor.
 * @returns Path to the installer or `null`.
 */
export function resolveInstaller(target: IBuildTarget): string | null {
  const installerDir = resolve(
    PROJECT_ROOT,
    'src-tauri',
    'target',
    target.triple,
    'release',
    'bundle',
    target.installerSubdir,
  );

  if (!existsSync(installerDir)) return null;

  const entries = readdirSync(installerDir);
  // For NSIS we want the `*-setup.exe`, not the `*-setup.nsis.zip` (which is the
  // OTA bundle resolved by resolveArtifacts). For DMG, plain `*.dmg` works.
  const found = entries.find(
    (f) => f.endsWith(target.installerExt) && !f.endsWith('.sig') && !f.endsWith('.zip'),
  );

  return found ? join(installerDir, found) : null;
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
 * Resolves the extra environment variables needed to build a `linux-x64` /
 * `linux-arm64` target without hitting the 3 blockers found building
 * natively on `supermicro-pcbar` (TR-07, 2026-08-20):
 *
 * 1. Non-interactive SSH sessions don't source `~/.bashrc` / `~/.profile`,
 *    so `bun`/`cargo` can be missing from `$PATH` even though they're
 *    installed — prepend the standard install dirs defensively.
 * 2. linuxdeploy's bundled `strip` (pinned build, 2024-07-26) doesn't
 *    understand the `.relr.dyn` ELF sections emitted by current toolchains
 *    — `NO_STRIP=1` is linuxdeploy's own documented escape hatch.
 * 3. linuxdeploy's bundled `patchelf` silently corrupts the AEAT sidecar
 *    (`bun build --compile` output — payload appended after the ELF) when
 *    rewriting its rpath — route `$PATCHELF` through a shim that skips
 *    that one binary (see `scripts/linux/patchelf-aeat-shim.sh`).
 *
 * @returns Extra env vars to merge into the `tauri build` subprocess, or an
 *   error if `patchelf` isn't installed (build will fail regardless).
 */
async function resolveLinuxBuildEnv(): Promise<Result<Record<string, string>, ResultError>> {
  const shimPath = resolve(PROJECT_ROOT, 'scripts', 'linux', 'patchelf-aeat-shim.sh');
  if (!existsSync(shimPath)) {
    return err(
      resultError(
        'PATCHELF_SHIM_NOT_FOUND',
        `Expected patchelf shim at ${shimPath} — did scripts/linux/ get deleted?`,
      ),
    );
  }

  const whichResult = await tryCatchAsync(async () => {
    const proc = Bun.spawn(['which', 'patchelf'], { stdout: 'pipe', stderr: 'ignore' });
    const out = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0 || !out.trim()) {
      throw new Error('patchelf not found on $PATH');
    }
    return out.trim();
  }, 'PATCHELF_NOT_FOUND');

  if (isErr(whichResult)) {
    return err(
      resultError(
        'PATCHELF_NOT_FOUND',
        'patchelf is required to build linux targets (linuxdeploy dependency) but was not ' +
          'found on $PATH. Install it (e.g. "pacman -S patchelf" / "apt install patchelf").',
      ),
    );
  }

  const homeBinDirs = `${join(homedir(), '.bun', 'bin')}:${join(homedir(), '.cargo', 'bin')}`;
  const currentPath = process.env.PATH ?? '';
  const augmentedPath = currentPath.includes(homeBinDirs)
    ? currentPath
    : `${homeBinDirs}:${currentPath}`;

  return ok({
    PATH: augmentedPath,
    NO_STRIP: '1',
    PATCHELF: shimPath,
    REAL_PATCHELF: whichResult.value,
  });
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

  if (target.label === 'linux-x64' || target.label === 'linux-arm64') {
    const linuxEnvResult = await resolveLinuxBuildEnv();
    if (isErr(linuxEnvResult)) {
      return err(linuxEnvResult.error);
    }
    Object.assign(extraEnv, linuxEnvResult.value);
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
 * Reemplaza el `GDK_BACKEND=x11` que `linuxdeploy-plugin-gtk` clava en el AppRun
 * del AppImage, y vuelve a empaquetar y firmar el resultado.
 *
 * El plugin escribe esta línea en el hook de TODO AppImage que genera:
 *
 *   export GDK_BACKEND=x11 # Crash with Wayland backend on Wayland - ... tauri#8541
 *
 * Fuerza Xwayland aunque la sesión sea Wayland. Sobre NVIDIA, el renderer DMABUF
 * de WebKitGTK falla ahí al reservar el buffer ("Failed to create GBM buffer of
 * size WxH: Invalid argument") y cae a compositing por software: la app arranca y
 * pinta bien, sólo va lenta. Medido en `supermicro-pcbar` (2026-08-21): 9 MiB de
 * memoria de GPU en el WebKitWebProcess frente a 173 MiB con la ruta Wayland, 2
 * repeticiones por variante. Ver `docs/diagnostics/README.md`.
 *
 * La línea del plugin PISA el valor de quien lanza, así que exportar
 * `GDK_BACKEND=wayland` por fuera no surte efecto — hay que tocar el hook.
 *
 * La sustitución conserva `x11` como default fuera de Wayland y sigue respetando
 * un valor explícito, así que ningún host cambia de comportamiento salvo el caso
 * roto. El crash de tauri#8541 no reproduce aquí (binario nativo en Wayland,
 * estable en todas las pruebas), pero eso no basta para hablar por el resto de
 * hosts: por eso se conserva el default en vez de borrar la línea.
 *
 * Se parchea el AppDir y se re-empaqueta porque el hook lo escribe el plugin
 * durante el propio `tauri build`: no hay hueco para adelantarse. El AppDir queda
 * en disco tras el build, y `linuxdeploy-plugin-appimage` (ya cacheado por Tauri)
 * es justo lo que Tauri usa para el squash final.
 *
 * @param target - Build target (sólo se actúa en linux-x64 / linux-arm64).
 * @param keys   - Claves de firma, para re-firmar el AppImage re-empaquetado.
 * @param noSign - Si es true, se salta la re-firma.
 * @returns `ok(undefined)` también cuando no hay nada que parchear (no es un error).
 */
async function patchAppImageGtkHook(
  target: IBuildTarget,
  keys: ISigningKeys | null,
  noSign: boolean,
): Promise<Result<void, ResultError>> {
  const bundleDir = resolve(
    PROJECT_ROOT, 'src-tauri', 'target', target.triple, 'release', 'bundle', 'appimage',
  );
  if (!existsSync(bundleDir)) {
    return err(resultError('BUNDLE_DIR_NOT_FOUND', `AppImage bundle dir not found: ${bundleDir}`));
  }

  const appDirName = readdirSync(bundleDir).find((f) => f.endsWith('.AppDir'));
  if (!appDirName) {
    log.warn('No se encontró el .AppDir tras el build — se omite el parche de GDK_BACKEND.');
    return ok(undefined);
  }
  const appDirPath = join(bundleDir, appDirName);
  const hookPath = join(appDirPath, 'apprun-hooks', 'linuxdeploy-plugin-gtk.sh');

  if (!existsSync(hookPath)) {
    log.warn(`Hook gtk no encontrado (${hookPath}) — se omite el parche de GDK_BACKEND.`);
    return ok(undefined);
  }

  const hook = readFileSync(hookPath, 'utf-8');
  const gdkLine = /^export GDK_BACKEND=x11.*$/m;

  if (!gdkLine.test(hook)) {
    // Si upstream cambia la línea, avisar en vez de re-empaquetar sin motivo:
    // el AppImage que produjo Tauri ya está firmado y es válido.
    log.warn(
      'El hook gtk no contiene "export GDK_BACKEND=x11" — linuxdeploy pudo cambiar. ' +
        'Se deja el AppImage tal cual; verificar aceleración con scripts/diagnose-host.sh --probe.',
    );
    return ok(undefined);
  }

  writeFileSync(
    hookPath,
    hook.replace(
      gdkLine,
      'if [ -n "${WAYLAND_DISPLAY:-}" ]; then\n' +
        '  export GDK_BACKEND="${GDK_BACKEND:-wayland}"\n' +
        'else\n' +
        '  export GDK_BACKEND="${GDK_BACKEND:-x11}"\n' +
        'fi',
    ),
  );
  log.info('AppRun parcheado: GDK_BACKEND se autodetecta (wayland en sesión Wayland).');

  const appImageName = readdirSync(bundleDir).find(
    (f) => f.endsWith('.AppImage') && !f.endsWith('.sig'),
  );
  if (!appImageName) {
    return err(resultError('ARTIFACT_NOT_FOUND', `No .AppImage found in ${bundleDir} to repack.`));
  }

  const packer = join(homedir(), '.cache', 'tauri', 'linuxdeploy-plugin-appimage.AppImage');
  if (!existsSync(packer)) {
    return err(
      resultError(
        'APPIMAGE_PACKER_NOT_FOUND',
        `Expected Tauri's cached AppImage packer at ${packer}. It is downloaded during the ` +
          'first linux bundle — re-run the build, or delete ~/.cache/tauri to force a refetch.',
      ),
    );
  }

  const repack = await tryCatchAsync(async () => {
    const proc = Bun.spawn([packer, '--appdir', appDirPath], {
      cwd: bundleDir,
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        // Mismo escape hatch que en resolveLinuxBuildEnv: el strip que trae
        // linuxdeploy no entiende las secciones .relr.dyn actuales.
        NO_STRIP: '1',
        OUTPUT: appImageName,
        ARCH: target.triple.startsWith('aarch64') ? 'aarch64' : 'x86_64',
      } as Record<string, string>,
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`linuxdeploy-plugin-appimage exited with code ${exitCode}`);
  }, 'APPIMAGE_REPACK_FAILED');

  if (isErr(repack)) {
    return err(
      resultError(
        'APPIMAGE_REPACK_FAILED',
        `Failed to repack the patched AppImage: ${repack.error.message}`,
        repack.error.cause,
      ),
    );
  }
  log.success('AppImage re-empaquetado con el AppRun parcheado.');

  if (noSign || !keys) {
    log.warn('Sin firma (--no-sign): el .sig del build previo ya no corresponde al AppImage.');
    return ok(undefined);
  }

  // El .sig que generó Tauri corresponde al AppImage anterior: re-firmar o el
  // updater rechazará la descarga en el cliente.
  const sign = await tryCatchAsync(async () => {
    const proc = Bun.spawn(['bun', 'run', 'tauri', 'signer', 'sign', join(bundleDir, appImageName)], {
      cwd: PROJECT_ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        TAURI_SIGNING_PRIVATE_KEY: keys.privateKey,
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: keys.privateKeyPassword,
      } as Record<string, string>,
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`tauri signer sign exited with code ${exitCode}`);
  }, 'APPIMAGE_RESIGN_FAILED');

  if (isErr(sign)) {
    return err(
      resultError(
        'APPIMAGE_RESIGN_FAILED',
        `Repacked the AppImage but failed to re-sign it: ${sign.error.message}. The .sig on disk ` +
          'no longer matches the artifact — do not publish this build.',
        sign.error.cause,
      ),
    );
  }

  log.success('AppImage re-firmado.');
  return ok(undefined);
}

/**
 * Copies + canonicalises build artifacts into the structured output directory.
 *
 * Layout: `<outputDir>/<version>/<target-label>/<canonical-name>`
 *
 * Renames Tauri's verbose default filenames (e.g. `TPV El Haido_0.1.0_aarch64.app.tar.gz`,
 * with spaces and arch instead of label) to a stable, URL-friendly canonical
 * naming (`tpv-haido-0.1.0-macos-arm64.app.tar.gz`) so haidodocs can hardcode
 * predictable download links per version.
 *
 * Always copies:
 *   - OTA bundle (`.app.tar.gz` / `.nsis.zip`) → for the Tauri auto-updater
 *   - Bundle `.sig`                             → minisign signature
 *
 * Optionally copies (if Tauri produced it):
 *   - Installer (`.dmg` macOS / `-setup.exe` Windows) → for human-friendly first install
 *
 * @param target      - Build target descriptor.
 * @param version     - App version string.
 * @param artifacts   - Resolved OTA bundle paths.
 * @param installerSrc - Resolved installer path or null if not produced.
 * @param outputDir   - Root output directory.
 * @returns Destination paths and canonical names, or an error.
 */
export function copyArtifacts(
  target: IBuildTarget,
  version: string,
  artifacts: { artifactPath: string; sigPath: string },
  installerSrc: string | null,
  outputDir: string,
): Result<
  {
    destArtifact: string;
    destSig: string;
    destInstaller: string | null;
    canonicalArtifactName: string;
    canonicalInstallerName: string | null;
  },
  ResultError
> {
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

  // Canonical names:
  //   - bundle:    tpv-haido-<v>-<target>.app.tar.gz | .nsis.zip
  //   - sig:       <bundle>.sig
  //   - installer: tpv-haido-<v>-<target>.dmg | -setup.exe
  const canonicalArtifactName = canonicalName(version, target.label, target.artifactExt);
  const canonicalSigName = `${canonicalArtifactName}.sig`;
  const canonicalInstallerName = installerSrc
    ? canonicalName(version, target.label, target.installerExt)
    : null;

  const destArtifact = join(destDir, canonicalArtifactName);
  const destSig = join(destDir, canonicalSigName);
  const destInstaller = canonicalInstallerName ? join(destDir, canonicalInstallerName) : null;

  const copyResult = tryCatch(() => {
    cpSync(artifacts.artifactPath, destArtifact);
    cpSync(artifacts.sigPath, destSig);
    if (installerSrc && destInstaller) {
      cpSync(installerSrc, destInstaller);
    }
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

  log.success(`OTA bundle copied: ${destArtifact}`);
  log.success(`Sig copied:        ${destSig}`);
  if (destInstaller) {
    log.success(`Installer copied:  ${destInstaller}`);
  } else {
    log.warn(`No installer produced for ${target.label} (skipped — Tauri config may have it disabled).`);
  }

  return ok({
    destArtifact,
    destSig,
    destInstaller,
    canonicalArtifactName,
    canonicalInstallerName,
  });
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

  // Los AppImage salen del build con GDK_BACKEND=x11 clavado en el AppRun, lo que
  // deja el webview compositando por software sobre NVIDIA (ver la función).
  if (target.label === 'linux-x64' || target.label === 'linux-arm64') {
    const hookResult = await patchAppImageGtkHook(target, keys, noSign);
    if (isErr(hookResult)) {
      return err(hookResult.error);
    }
  }

  // Verify artifacts
  const artifactResult = resolveArtifacts(target);
  if (isErr(artifactResult)) {
    return err(artifactResult.error);
  }

  const { artifactPath, sigPath } = artifactResult.value;
  log.info(`OTA bundle src: ${artifactPath}`);
  log.info(`Sig src:        ${sigPath}`);

  // Resolve human-friendly installer (DMG / setup.exe) — non-fatal if absent
  const installerSrc = resolveInstaller(target);
  if (installerSrc) {
    log.info(`Installer src:  ${installerSrc}`);
  } else {
    log.warn(`Installer src:  not found (Tauri config may have it disabled).`);
  }

  // Copy + canonicalise to releases/<version>/<target>/
  const copyResult = copyArtifacts(target, version, { artifactPath, sigPath }, installerSrc, outputDir);
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
    installerDestPath: copyResult.value.destInstaller,
    canonicalArtifactName: copyResult.value.canonicalArtifactName,
    canonicalInstallerName: copyResult.value.canonicalInstallerName,
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
    // Canonical filename used in the canonical destination directory.
    // Hub URL convention: <RELEASE_HUB_BASE_URL>/<version>/<target>/<canonical-filename>
    const url = `${RELEASE_HUB_BASE_URL}/${version}/${result.target.label}/${result.canonicalArtifactName}`;
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

// Only run main() when executed directly via `bun run scripts/build-release.ts`.
// This guard prevents accidental execution when the file is imported (e.g. for unit
// tests that exercise loadSigningKeys / locatePrivateKeyFile in isolation).
if (import.meta.main) {
  main().catch((e: unknown) => {
    log.critical('Unhandled error in release builder:', e);
    process.exit(1);
  });
}
