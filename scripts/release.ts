#!/usr/bin/env bun
/**
 * @file release.ts
 * @description Release CLI for TPV El Haido — authenticates against Pocket ID
 *   via PKCE loopback and publishes release artifacts to desktop-release-hub.
 *
 * Sub-commands:
 *   auth login        PKCE loopback flow — opens browser, caches token
 *   auth status       Show cached token info (refresh if expired)
 *   auth logout       Delete token cache
 *   publish [opts]    Build + upload artifact(s) to admin API
 *
 * Usage:
 *   bun run scripts/release.ts auth login
 *   bun run scripts/release.ts auth status
 *   bun run scripts/release.ts auth logout
 *   bun run scripts/release.ts publish \
 *     --target macos-arm64|macos-x64|windows-x64|all \
 *     --slug haido \
 *     [--hub https://admin.releases.mks2508.systems] \
 *     [--notes "Release notes"] \
 *     [--ai-notes] \
 *     [--skip-build] \
 *     [--client-credentials] \
 *     [--dry-run]
 *
 *   --client-credentials: headless CI mode — auth via OAuth2 client_credentials
 *     grant against Pocket ID using RELEASE_HUB_CLIENT_ID / RELEASE_HUB_CLIENT_SECRET
 *     env vars. No PKCE cache required, no disk cache written, no browser.
 */

import { existsSync, mkdirSync, chmodSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { homedir, platform, tmpdir } from 'node:os';
import * as oauth from 'oauth4webapi';
import logger from '@mks2508/better-logger';
import { publishComponent } from '@mks2508/release-hub-sdk';
import { createProvider } from 'gemini-commit-wizard';
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

const log = logger.component('ReleaseCli');

// ─────────────────────────────── Constants ───────────────────────────────────

/** Pocket ID OIDC issuer URL. */
const OIDC_ISSUER_URL = 'https://auth-provider.mks2508.systems';

/** Public PKCE client — no client_secret. */
const OIDC_CLIENT_ID = '70e7daf3-f393-4db9-b9e7-05e8775d7f6c';

/** Local loopback callback URL for PKCE flow. */
const PKCE_REDIRECT_URI = 'http://127.0.0.1:54321/callback';

/** Port for the loopback HTTP server. */
const PKCE_LOOPBACK_PORT = 54321;

/** Token cache file path. */
const TOKEN_CACHE_PATH = join(homedir(), '.config', 'release-hub', 'token.json');

/** Default hub admin base URL. */
const DEFAULT_HUB_URL = 'https://admin.releases.mks2508.systems';

/** Project root — two levels up from scripts/. */
const PROJECT_ROOT = resolve(import.meta.dir, '..');

/** Supported release targets. */
const ALL_RELEASE_TARGETS = ['macos-arm64', 'macos-x64', 'windows-x64', 'linux-x64', 'linux-arm64'] as const;
type ReleaseTarget = (typeof ALL_RELEASE_TARGETS)[number];

// ─────────────────────────────── Interfaces ──────────────────────────────────

/**
 * Token cache persisted on disk at `~/.config/release-hub/token.json`.
 */
export interface ITokenCache {
  readonly access_token: string;
  readonly id_token: string;
  readonly refresh_token?: string;
  /** Unix timestamp (seconds) when the access token expires. */
  readonly expires_at: number;
  readonly sub: string;
  readonly email: string;
  readonly name: string;
  readonly issuer: string;
  readonly client_id: string;
}

/**
 * Parsed CLI options for the `publish` sub-command.
 */
export interface IPublishOptions {
  readonly targets: ReleaseTarget[];
  readonly slug: string;
  readonly hub: string;
  /** Component name for the unified /components channel — empty publishes the project's principal binary (no public channel). */
  readonly component: string;
  readonly notes: string;
  readonly aiNotes: boolean;
  readonly skipBuild: boolean;
  readonly clientCredentials: boolean;
  readonly dryRun: boolean;
}

/**
 * Result of uploading a single release artifact to the admin API.
 */
export interface IReleaseUploadResult {
  readonly target: ReleaseTarget;
  readonly version: string;
  readonly artifactFilename: string;
  readonly url?: string;
  readonly dryRun: boolean;
}

/**
 * Server target/arch mapping derived from the CLI target label.
 */
export interface ITargetMapping {
  readonly serverTarget: string;
  readonly serverArch: string;
}

/**
 * Bundle metadata resolved from either CLI flags or the `manifest.json`
 * sidecar emitted by `scripts/build-bundle.ts pack`.
 *
 * Fields map 1:1 to the multipart form fields the hub expects at
 * `POST /api/admin/projects/{slug}/bundles` (see `scripts/build-bundle.ts:166-168`
 * and the manual `curl` snippet `ota-bundle-deploy.yml` used to ship before
 * this sub-command existed).
 */
export interface IBundleMetadata {
  readonly bundleVersion: string;
  readonly minNativeVersion: string;
  readonly maxNativeVersion: string;
  /** ed25519 signature of the zip, base64. NOT minisign. */
  readonly signature: string;
}

/**
 * Parsed CLI options for the `publish-bundle` sub-command.
 *
 * Mirrors `IPublishOptions` but replaces the per-target `targets[]` / `notes`
 * with per-bundle fields; bundles are single uploads with explicit metadata.
 *
 * `component` non-empty switches the endpoint from the legacy
 * `/api/admin/projects/{slug}/bundles` (ed25519) to the unified
 * `/api/admin/projects/{slug}/components` (minisign, kind=binary). With the
 * switch the multipart fields change (`sig`/`artifact`+`target`+`arch`
 * instead of `signature`/`bundle`) and the hub verifies with the project's
 * kind=binary signing key. ADR-0045 D8 absorbed the bundles endpoint into
 * components; the legacy path stays for back-compat with anything still
 * pinned to ed25519.
 */
export interface IPublishBundleOptions {
  readonly bundlePath: string;
  readonly slug: string;
  readonly hub: string;
  readonly bundleVersion: string;
  readonly minNativeVersion: string;
  readonly maxNativeVersion: string;
  readonly signature: string;
  readonly component: string;
  readonly target: string;
  readonly arch: string;
  readonly clientCredentials: boolean;
  readonly dryRun: boolean;
}

/**
 * Result of uploading a single OTA bundle to the admin API.
 */
export interface IBundleUploadResult {
  readonly bundleVersion: string;
  readonly bundleFilename: string;
  readonly url?: string;
  readonly dryRun: boolean;
}

// ─────────────────────────────── Target mapping ──────────────────────────────

/**
 * Maps CLI target labels to server taxonomy (target + arch).
 *
 * @param target - CLI target label (e.g. "macos-arm64").
 * @returns Server target/arch pair or an error for unknown targets.
 */
export function mapTargetToServer(target: ReleaseTarget): Result<ITargetMapping, ResultError> {
  const table: Record<ReleaseTarget, ITargetMapping> = {
    'macos-arm64': { serverTarget: 'darwin', serverArch: 'aarch64' },
    'macos-x64': { serverTarget: 'darwin', serverArch: 'x86_64' },
    'windows-x64': { serverTarget: 'windows', serverArch: 'x86_64' },
    'linux-x64': { serverTarget: 'linux', serverArch: 'x86_64' },
    'linux-arm64': { serverTarget: 'linux', serverArch: 'aarch64' },
  };
  const mapped = table[target];
  if (!mapped) {
    return err(resultError('UNKNOWN_TARGET', `Unknown target label: "${target}"`));
  }
  return ok(mapped);
}

// ─────────────────────────────── CLI Parsing ─────────────────────────────────

/**
 * Prints help text for the release CLI to stdout.
 */
function printHelp(): void {
  log.info(`
release.ts — TPV El Haido release CLI (feat-phase 0.4.1.G)

Usage:
  bun run scripts/release.ts <command> [options]

Commands:
  auth login                          PKCE loopback — opens browser, caches token
  auth status                         Show cached token info (auto-refresh if expired)
  auth logout                         Delete token cache

  publish --target <target> --slug <slug> [options]
    Upload release artifact(s) to desktop-release-hub admin API.

    --target   macos-arm64 | macos-x64 | windows-x64 | linux-x64 | linux-arm64 | all   (required)
    --slug     Project slug in release-hub (e.g. "haido")     (required)
    --hub      Admin API base URL (default: ${DEFAULT_HUB_URL})
    --component  Component name for the unified /components channel
                  (e.g. "tpv-el-haido"). Omitted → project principal
                  binary (admin-listed only, no public channel).
    --notes    Release notes / changelog text
    --ai-notes Generate release notes with AI from the commits since the last
                  git tag. Uses a TPV-specific prompt template that calls out
                  architectural changes, fixes (con hash), y CI/devops con detalle
                  técnico. Ignored when --notes is given. Needs GEMINI_API_KEY /
                  GROQ_API_KEY / OPENROUTER_API_KEY or the \`gemini\` CLI; degrades
                  to empty notes with a warning if absent.
    --skip-build  Skip bun run build-release; assumes artifacts exist
    --client-credentials  Headless auth via OAuth2 client_credentials grant (CI mode).
                  Requires RELEASE_HUB_CLIENT_ID + RELEASE_HUB_CLIENT_SECRET env vars.
                  No PKCE cache needed; no token written to disk.
    --dry-run  Log what would be uploaded, no POST

  publish-bundle --slug <slug> [--bundle <path>] [options]
    Upload a single OTA bundle (channel JS parcial) to the hub admin API.
    Bundles are produced by \`scripts/build-bundle.ts pack\` (minisign signed, D10-D+).

    --slug              Project slug in release-hub (e.g. "haido")     (required)
    --bundle            Path to the bundle.zip to upload.
                        If omitted, scans releases/bundles/*/bundle.zip and picks the most recent.
    --bundle-version    Override manifest.bundleVersion (else read from sibling manifest.json)
    --min-native-version   Override manifest.minNativeVersion
    --max-native-version   Override manifest.maxNativeVersion
    --signature         Override manifest.signature (minisign .sig text — read from
                        sibling .minisig file by build-bundle.ts)
    --component         Component name (e.g. "haido-frontend"). When set, posts to the
                        unified /api/admin/projects/{slug}/components endpoint (minisign,
                        kind=binary). Without --component, posts to the legacy
                        /api/admin/projects/{slug}/bundles endpoint.
    --target            Platform tag for the components endpoint (default: any).
                        For partial-artifact JS bundles, leave as any (L3).
    --arch              Architecture tag for the components endpoint (default: any).
                        For partial-artifact JS bundles, leave as any (L3).
    --hub               Admin API base URL (default: ${DEFAULT_HUB_URL})
    --client-credentials  Same semantics as \`publish\` — headless CI auth
    --dry-run           Log the request shape, no POST

Examples:
  bun run scripts/release.ts auth login
  bun run scripts/release.ts auth status
  bun run scripts/release.ts publish --target macos-arm64 --slug haido --dry-run
  bun run scripts/release.ts publish --target all --slug haido --skip-build
  bun run scripts/release.ts publish --target macos-arm64 --slug haido --client-credentials --dry-run
  bun run scripts/release.ts publish-bundle --slug haido --component haido-frontend \
    --bundle releases/bundles/2026.08.29-1/bundle.zip
  bun run scripts/release.ts publish-bundle --slug haido --component haido-frontend \
    --client-credentials --dry-run
`);
}

/**
 * Parses `process.argv` for the `publish` sub-command.
 *
 * @param argv - Raw argument array (post-slice).
 * @returns Parsed publish options or an error.
 */
function parsePublishOptions(argv: string[]): Result<IPublishOptions, ResultError> {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i !== -1 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  const has = (flag: string): boolean => argv.includes(flag);

  const targetArg = get('--target');
  if (!targetArg) {
    return err(resultError('MISSING_TARGET', '--target is required for publish. Use --help.'));
  }

  let targets: ReleaseTarget[];
  if (targetArg === 'all') {
    targets = [...ALL_RELEASE_TARGETS];
  } else if ((ALL_RELEASE_TARGETS as readonly string[]).includes(targetArg)) {
    targets = [targetArg as ReleaseTarget];
  } else {
    return err(
      resultError(
        'INVALID_TARGET',
        `Unknown target: "${targetArg}". Valid: ${ALL_RELEASE_TARGETS.join(', ')}, all`,
      ),
    );
  }

  const slug = get('--slug');
  if (!slug) {
    return err(resultError('MISSING_SLUG', '--slug is required for publish. Use --help.'));
  }

  return ok({
    targets,
    slug,
    hub: get('--hub') ?? DEFAULT_HUB_URL,
    component: get('--component') ?? '',
    notes: get('--notes') ?? '',
    aiNotes: has('--ai-notes'),
    skipBuild: has('--skip-build'),
    clientCredentials: has('--client-credentials'),
    dryRun: has('--dry-run'),
  });
}

/**
 * Parses `process.argv` for the `publish-bundle` sub-command.
 *
 * Recognised flags:
 *   --slug, --hub, --bundle, --bundle-version, --min-native-version,
 *   --max-native-version, --signature, --client-credentials, --dry-run
 *
 * Bundle metadata fields (`bundleVersion` / `minNativeVersion` /
 * `maxNativeVersion` / `signature`) are optional at the CLI level here —
 * `loadBundleMetadata()` will fall back to the sibling `manifest.json`
 * if any of them are missing.
 *
 * @param argv - Raw argument array (post-slice).
 * @returns Parsed publish-bundle options or an error.
 */
function parsePublishBundleOptions(argv: string[]): Result<IPublishBundleOptions, ResultError> {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i !== -1 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  const has = (flag: string): boolean => argv.includes(flag);

  const slug = get('--slug');
  if (!slug) {
    return err(resultError('MISSING_SLUG', '--slug is required for publish-bundle. Use --help.'));
  }

  return ok({
    bundlePath: get('--bundle') ?? '',
    slug,
    hub: get('--hub') ?? DEFAULT_HUB_URL,
    bundleVersion: get('--bundle-version') ?? '',
    minNativeVersion: get('--min-native-version') ?? '',
    maxNativeVersion: get('--max-native-version') ?? '',
    signature: get('--signature') ?? '',
    component: get('--component') ?? '',
    target: get('--target') ?? 'any',
    arch: get('--arch') ?? 'any',
    clientCredentials: has('--client-credentials'),
    dryRun: has('--dry-run'),
  });
}

// ─────────────────────────────── Token cache ─────────────────────────────────

/**
 * Ensures the token cache directory exists with restricted permissions.
 *
 * @returns `ok(undefined)` on success, `err(...)` on failure.
 */
function ensureCacheDir(): Result<void, ResultError> {
  return tryCatch(() => {
    const dir = join(homedir(), '.config', 'release-hub');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }, 'CACHE_DIR_CREATE_FAILED');
}

/**
 * Reads and parses the token cache from disk.
 *
 * @returns Parsed token cache or an error if not found / invalid.
 */
export function readTokenCache(): Result<ITokenCache, ResultError> {
  if (!existsSync(TOKEN_CACHE_PATH)) {
    return err(resultError('NOT_LOGGED_IN', 'No token cache found. Run: auth login'));
  }
  return tryCatch(() => {
    const raw = readFileSync(TOKEN_CACHE_PATH, 'utf-8');
    return JSON.parse(raw) as ITokenCache;
  }, 'TOKEN_CACHE_PARSE_FAILED');
}

/**
 * Writes the token cache to disk with restricted permissions (0600).
 *
 * @param cache - Token data to persist.
 * @returns `ok(undefined)` on success, `err(...)` on failure.
 */
export async function writeTokenCache(cache: ITokenCache): Promise<Result<void, ResultError>> {
  const dirResult = ensureCacheDir();
  if (isErr(dirResult)) {
    return err(
      resultError('CACHE_DIR_CREATE_FAILED', `Cannot create cache dir: ${dirResult.error.message}`),
    );
  }

  const writeResult = await tryCatchAsync(async () => {
    await Bun.write(TOKEN_CACHE_PATH, JSON.stringify(cache, null, 2));
    // Restrict permissions: owner read/write only.
    if (platform() !== 'win32') {
      chmodSync(TOKEN_CACHE_PATH, 0o600);
    }
  }, 'TOKEN_CACHE_WRITE_FAILED');

  if (isErr(writeResult)) {
    return err(
      resultError('TOKEN_CACHE_WRITE_FAILED', `Failed to write token cache: ${writeResult.error.message}`),
    );
  }

  return ok(undefined);
}

/**
 * Deletes the token cache file from disk.
 *
 * @returns `ok(undefined)` whether or not the file existed.
 */
export async function deleteTokenCache(): Promise<Result<void, ResultError>> {
  if (!existsSync(TOKEN_CACHE_PATH)) {
    return ok(undefined);
  }
  return tryCatchAsync(async () => {
    const file = Bun.file(TOKEN_CACHE_PATH);
    // Bun doesn't expose Bun.rm; use node:fs unlink.
    const { unlink } = await import('node:fs/promises');
    await unlink(TOKEN_CACHE_PATH);
    void file; // consumed by unlink above
  }, 'TOKEN_CACHE_DELETE_FAILED');
}

// ─────────────────────────────── SDK session bridge ─────────────────────────

/**
 * Bridges the access token resolved by this CLI (PKCE cache or
 * client_credentials) into the SDK session store
 * (`~/.config/release-hub/cli.json`) so `publishComponent` from
 * `@mks2508/release-hub-sdk` can consume it.
 *
 * The SDK resolves auth itself from `RELEASE_HUB_API_KEY` env or that file;
 * it takes no token parameter. When `RELEASE_HUB_API_KEY` is set the bridge is
 * a no-op (the SDK reads the env var natively). The file mirrors the exact
 * shape the SDK's `saveSession` writes (hub origin must match for the SDK's
 * HUB_MISMATCH check to pass).
 *
 * @param hub         - Hub admin origin (normalised like the SDK's resolveHubUrl).
 * @param accessToken - Bearer token to persist.
 * @param meta        - Optional identity fields for the session record.
 * @returns `ok(undefined)` on success, `err(...)` on failure.
 */
export async function writeSdkSessionFile(
  hub: string,
  accessToken: string,
  meta: { email?: string; sub?: string } = {},
): Promise<Result<void, ResultError>> {
  const dirResult = ensureCacheDir();
  if (isErr(dirResult)) {
    return err(dirResult.error);
  }

  const sessionPath = join(homedir(), '.config', 'release-hub', 'cli.json');
  const writeResult = await tryCatchAsync(async () => {
    const session = {
      hub: hub.replace(/\/+$/, ''),
      token: accessToken,
      sub: meta.sub,
      email: meta.email,
      savedAt: new Date().toISOString(),
    };
    await Bun.write(sessionPath, `${JSON.stringify(session, null, 2)}\n`);
    if (platform() !== 'win32') {
      chmodSync(sessionPath, 0o600);
    }
  }, 'SDK_SESSION_WRITE_FAILED');

  if (isErr(writeResult)) {
    return err(
      resultError('SDK_SESSION_WRITE_FAILED', `Cannot bridge token into SDK session: ${writeResult.error.message}`),
    );
  }

  log.info(`[sdk] Sesión puente escrita en ${sessionPath} (hub=${hub}, email=${meta.email ?? 'n/a'}).`);
  return ok(undefined);
}

// ─────────────────────────────── OIDC discovery ──────────────────────────────

/**
 * Fetches the OIDC server metadata (/.well-known/openid-configuration).
 *
 * @param issuerUrl - OIDC issuer URL (e.g. "https://auth-provider.mks2508.systems").
 * @returns Server metadata or an error.
 */
async function discoverOidc(
  issuerUrl: string,
): Promise<Result<oauth.ServerMetadata, ResultError>> {
  return tryCatchAsync(async () => {
    const issuer = new URL(issuerUrl);
    const metadata = await oauth.discoveryRequest(issuer, { algorithm: 'oidc' }).then(
      (res) => oauth.processDiscoveryResponse(issuer, res),
    );
    return metadata;
  }, 'OIDC_DISCOVERY_FAILED');
}

// ─────────────────────────────── Browser open ────────────────────────────────

/**
 * Opens the given URL in the default browser, cross-platform.
 *
 * - macOS: `open <url>`
 * - Windows: `start "" <url>` (via cmd.exe)
 * - Linux: `xdg-open <url>`
 *
 * Falls back to logging the URL if spawn fails (headless/CI environments).
 *
 * @param url - URL to open.
 */
async function openBrowser(url: string): Promise<void> {
  const currentPlatform = platform();
  let cmd: string[];

  if (currentPlatform === 'darwin') {
    cmd = ['open', url];
  } else if (currentPlatform === 'win32') {
    // Windows: `start` is a shell built-in; must use cmd /c
    cmd = ['cmd', '/c', 'start', '', url];
  } else {
    cmd = ['xdg-open', url];
  }

  const result = await tryCatchAsync(async () => {
    const proc = Bun.spawn(cmd, { stdout: 'ignore', stderr: 'ignore' });
    await proc.exited;
  }, 'BROWSER_OPEN_FAILED');

  if (isErr(result)) {
    log.warn('Could not open browser automatically.');
    log.info(`Please open this URL manually:\n\n  ${url}\n`);
  }
}

// ─────────────────────────────── JWT decode ──────────────────────────────────

/**
 * Decodes a JWT id_token payload without verifying the signature.
 * Used only to extract display-friendly claims (sub, email, name).
 *
 * @param idToken - Raw JWT string.
 * @returns Decoded payload object or an error.
 */
function decodeJwtPayload(idToken: string): Result<Record<string, unknown>, ResultError> {
  return tryCatch(() => {
    const parts = idToken.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid JWT format: expected at least 2 dot-separated parts.');
    }
    const payloadB64 = parts[1];
    // base64url → base64 → decode
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded) as Record<string, unknown>;
  }, 'JWT_DECODE_FAILED');
}

// ─────────────────────────────── Token refresh ───────────────────────────────

/**
 * Attempts to refresh the access token using the stored refresh_token.
 *
 * On success, writes the updated token cache to disk.
 *
 * @param cache    - Current cached token (must have refresh_token).
 * @param metadata - OIDC server metadata.
 * @returns Updated token cache or an error.
 */
async function refreshAccessToken(
  cache: ITokenCache,
  metadata: oauth.ServerMetadata,
): Promise<Result<ITokenCache, ResultError>> {
  if (!cache.refresh_token) {
    return err(resultError('NO_REFRESH_TOKEN', 'No refresh_token in cache. Re-run: auth login'));
  }

  log.info('Access token expired — attempting silent refresh…');

  const clientIdentity: oauth.Client = {
    client_id: OIDC_CLIENT_ID,
    token_endpoint_auth_method: 'none',
  };

  const result = await tryCatchAsync(async () => {
    const res = await oauth.refreshTokenGrantRequest(
      metadata,
      clientIdentity,
      oauth.None(),
      cache.refresh_token!,
    );
    const tokens = await oauth.processRefreshTokenResponse(metadata, clientIdentity, res);
    return tokens;
  }, 'TOKEN_REFRESH_FAILED');

  if (isErr(result)) {
    return err(
      resultError('TOKEN_REFRESH_FAILED', `Could not refresh token: ${result.error.message}`),
    );
  }

  const tokens = result.value;
  const newAccessToken = tokens.access_token;
  const newIdToken = (tokens.id_token as string | undefined) ?? cache.id_token;
  const newRefreshToken = (tokens.refresh_token as string | undefined) ?? cache.refresh_token;
  const expiresIn = typeof tokens.expires_in === 'number' ? tokens.expires_in : 3600;

  const updatedCache: ITokenCache = {
    ...cache,
    access_token: newAccessToken,
    id_token: newIdToken,
    refresh_token: newRefreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  };

  const writeResult = await writeTokenCache(updatedCache);
  if (isErr(writeResult)) {
    log.warn(`Refresh succeeded but failed to persist cache: ${writeResult.error.message}`);
  }

  log.success('Token refreshed successfully.');
  return ok(updatedCache);
}

// ─────────────────────────────── Load + validate token ───────────────────────

/**
 * Loads the token cache and, if the access token is expired, attempts a
 * silent refresh using the refresh_token. Returns the valid token cache.
 *
 * @returns Valid (non-expired) token cache or an error.
 */
async function loadValidToken(): Promise<Result<ITokenCache, ResultError>> {
  const cacheResult = readTokenCache();
  if (isErr(cacheResult)) {
    return err(cacheResult.error);
  }

  const cache = cacheResult.value;
  const nowSeconds = Math.floor(Date.now() / 1000);
  // Allow 30s clock skew.
  const isExpired = cache.expires_at - 30 <= nowSeconds;

  if (!isExpired) {
    return ok(cache);
  }

  // Try refresh.
  const discoveryResult = await discoverOidc(OIDC_ISSUER_URL);
  if (isErr(discoveryResult)) {
    return err(
      resultError('OIDC_DISCOVERY_FAILED', `OIDC discovery failed during refresh: ${discoveryResult.error.message}`),
    );
  }

  return refreshAccessToken(cache, discoveryResult.value);
}

// ─────────────────────────────── Client credentials (CI) ─────────────────────

/**
 * Result of a successful OAuth2 `client_credentials` grant. Holds the access
 * token in memory only — never persisted to disk.
 */
export interface IClientCredentialsToken {
  readonly accessToken: string;
  /** Optional subject claim extracted from the access token (display only). */
  readonly sub: string;
}

/**
 * Mints an access token via OAuth2 `client_credentials` grant (RFC 6749 §4.4)
 * against Pocket ID. Intended for headless CI use — no browser, no PKCE, no
 * disk cache.
 *
 * Required env vars:
 *   - `RELEASE_HUB_CLIENT_ID` — confidential client ID registered in Pocket ID
 *   - `RELEASE_HUB_CLIENT_SECRET` — corresponding client secret
 *
 * The token is returned to the caller and lives only in the calling process's
 * memory. Re-invoke this function to mint a fresh token if the current one
 * expires (cheap; ~one HTTP round-trip).
 *
 * @returns `ok({ accessToken, sub })` or an error.
 */
export async function clientCredentialsLogin(): Promise<Result<IClientCredentialsToken, ResultError>> {
  const clientId = process.env.RELEASE_HUB_CLIENT_ID;
  const clientSecret = process.env.RELEASE_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const missing = [
      !clientId ? 'RELEASE_HUB_CLIENT_ID' : null,
      !clientSecret ? 'RELEASE_HUB_CLIENT_SECRET' : null,
    ].filter(Boolean).join(', ');
    return err(
      resultError(
        'CLIENT_CREDENTIALS_ENV_MISSING',
        `client_credentials mode requires env vars: ${missing}. ` +
          `Export them before running publish --client-credentials.`,
      ),
    );
  }

  log.info('Fetching OIDC discovery metadata (client_credentials mode)…');
  const discoveryResult = await discoverOidc(OIDC_ISSUER_URL);
  if (isErr(discoveryResult)) {
    return err(
      resultError(
        'OIDC_DISCOVERY_FAILED',
        `OIDC discovery failed for client_credentials: ${discoveryResult.error.message}`,
      ),
    );
  }
  const serverMetadata = discoveryResult.value;
  log.success('OIDC discovery complete.');

  // Confidential client — Pocket ID issues tokens via HTTP Basic auth on the
  // token endpoint (RFC 6749 §2.3.1), which `ClientSecretBasic` implements.
  const clientIdentity: oauth.Client = {
    client_id: clientId,
    token_endpoint_auth_method: 'client_secret_basic',
  };
  const clientAuth = oauth.ClientSecretBasic(clientSecret);

  const tokenResult = await tryCatchAsync(async () => {
    const params = new URLSearchParams({ grant_type: 'client_credentials' });
    // Pocket ID scopes: hub admin endpoints accept the `openid` baseline;
    // additional scopes per client config. Don't over-ask; let the server
    // reject if it requires more.
    params.set('scope', 'openid');

    const tokenResponse = await oauth.clientCredentialsGrantRequest(
      serverMetadata,
      clientIdentity,
      clientAuth,
      params,
    );

    const tokens = await oauth.processClientCredentialsResponse(
      serverMetadata,
      clientIdentity,
      tokenResponse,
    );
    return tokens;
  }, 'CLIENT_CREDENTIALS_GRANT_FAILED');

  if (isErr(tokenResult)) {
    return err(
      resultError(
        'CLIENT_CREDENTIALS_GRANT_FAILED',
        `client_credentials grant failed: ${tokenResult.error.message}`,
      ),
    );
  }

  const tokens = tokenResult.value;
  const accessToken = tokens.access_token;
  if (!accessToken) {
    return err(
      resultError(
        'CLIENT_CREDENTIALS_NO_ACCESS_TOKEN',
        'client_credentials grant returned no access_token',
      ),
    );
  }

  // Extract `sub` for display — opaque to the caller, no signature verify.
  let sub = 'unknown';
  const decodeResult = decodeJwtPayload(accessToken);
  if (isOk(decodeResult)) {
    sub = (decodeResult.value.sub as string | undefined) ?? 'unknown';
  }

  log.success(`client_credentials grant OK (sub=${sub}, scope=${tokens.scope ?? 'n/a'}).`);
  return ok({ accessToken, sub });
}

/**
 * Resolves an access token using the auth strategy selected by `opts`.
 *
 * - `opts.clientCredentials === true` → mint via `clientCredentialsLogin()`.
 * - otherwise → load PKCE cache (refresh if expired).
 *
 * Kept separate from `publish()` so the retry-on-401 path can re-mint under
 * the same strategy without duplicating branching.
 */
async function mintAccessToken(
  opts: IPublishOptions,
): Promise<Result<{ accessToken: string; email?: string; sub?: string }, ResultError>> {
  if (opts.clientCredentials) {
    const ccResult = await clientCredentialsLogin();
    if (isErr(ccResult)) return err(ccResult.error);
    return ok({ accessToken: ccResult.value.accessToken, sub: ccResult.value.sub });
  }
  const pkceResult = await loadValidToken();
  if (isErr(pkceResult)) return err(pkceResult.error);
  return ok({
    accessToken: pkceResult.value.access_token,
    email: pkceResult.value.email,
    sub: pkceResult.value.sub,
  });
}

// ─────────────────────────────── auth login ──────────────────────────────────

/**
 * Executes the PKCE loopback authentication flow:
 *   1. Discovers OIDC metadata.
 *   2. Generates PKCE verifier + challenge.
 *   3. Starts local HTTP server on 127.0.0.1:54321.
 *   4. Opens browser to authorization URL.
 *   5. Waits for callback with code + state.
 *   6. Exchanges code for tokens.
 *   7. Persists token cache with chmod 0600.
 *
 * @returns `ok(cache)` with the persisted token data, or an error.
 */
async function authLogin(): Promise<Result<ITokenCache, ResultError>> {
  log.header('Pocket ID — PKCE login', OIDC_ISSUER_URL);

  // 1. OIDC discovery
  log.info('Fetching OIDC discovery metadata…');
  const discoveryResult = await discoverOidc(OIDC_ISSUER_URL);
  if (isErr(discoveryResult)) {
    return err(
      resultError(
        'OIDC_DISCOVERY_FAILED',
        `Failed to discover OIDC metadata from ${OIDC_ISSUER_URL}: ${discoveryResult.error.message}`,
      ),
    );
  }
  const serverMetadata = discoveryResult.value;
  log.success('OIDC discovery complete.');

  // 2. PKCE + state
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  const state = oauth.generateRandomState();

  // 3. Build authorization URL
  const authorizationEndpoint = serverMetadata.authorization_endpoint;
  if (!authorizationEndpoint) {
    return err(resultError('MISSING_AUTH_ENDPOINT', 'OIDC metadata missing authorization_endpoint.'));
  }

  const authUrl = new URL(authorizationEndpoint);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', OIDC_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', PKCE_REDIRECT_URI);
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  log.info(`Authorization URL:\n  ${authUrl.toString()}`);

  // 4. Start loopback HTTP server + wait for callback
  log.info(`Starting local server on 127.0.0.1:${PKCE_LOOPBACK_PORT}…`);

  const callbackResult = await tryCatchAsync(async (): Promise<{ code: string; callbackUrl: URL }> => {
    return new Promise((resolve, reject) => {
      // After the first successful callback we keep the server alive for a
      // short grace period (10s) so any second browser tab / refresh that
      // hits /callback gets a friendly "Already logged in" page instead of
      // ERR_CONNECTION_REFUSED. Using `stop(true)` immediately after the
      // first hit was the cause of the connection-refused UX bug.
      let loginCompleted = false;
      const SHUTDOWN_GRACE_MS = 10_000;

      const successHtml =
        '<html><body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px">' +
        '<h2 style="color:#22c55e">Login successful</h2>' +
        '<p>You are now logged in to release-hub.</p>' +
        '<p style="color:#6b7280">You can close this window. This page will auto-close in a few seconds.</p>' +
        '<script>setTimeout(()=>window.close(),3000)</script>' +
        '</body></html>';
      const alreadyHtml =
        '<html><body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px">' +
        '<h2 style="color:#22c55e">Already logged in</h2>' +
        '<p>You can close this tab — your CLI session is already active.</p>' +
        '<script>setTimeout(()=>window.close(),2000)</script>' +
        '</body></html>';

      const server = Bun.serve({
        hostname: '127.0.0.1',
        port: PKCE_LOOPBACK_PORT,
        async fetch(req) {
          const url = new URL(req.url);

          if (url.pathname !== '/callback') {
            return new Response('Not found', { status: 404 });
          }

          // Grace-period hits: someone refreshed the success tab or opened
          // the URL in a second tab after the CLI already completed login.
          if (loginCompleted) {
            return new Response(alreadyHtml, { headers: { 'content-type': 'text/html' } });
          }

          const code = url.searchParams.get('code');
          const returnedState = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            server.stop(true);
            reject(new Error(`Authorization error: ${error} — ${url.searchParams.get('error_description') ?? ''}`));
            return new Response(
              '<html><body><h2>Authorization failed.</h2><p>You can close this window.</p></body></html>',
              { headers: { 'content-type': 'text/html' } },
            );
          }

          if (!code) {
            server.stop(true);
            reject(new Error('Callback missing "code" parameter.'));
            return new Response(
              '<html><body><h2>Missing code.</h2><p>You can close this window.</p></body></html>',
              { headers: { 'content-type': 'text/html' } },
            );
          }

          if (returnedState !== state) {
            server.stop(true);
            reject(new Error(`State mismatch. Expected "${state}", got "${returnedState}".`));
            return new Response(
              '<html><body><h2>State mismatch — possible CSRF.</h2><p>You can close this window.</p></body></html>',
              { headers: { 'content-type': 'text/html' } },
            );
          }

          // Success — flag completed, resolve, and schedule graceful shutdown.
          loginCompleted = true;
          resolve({ code, callbackUrl: url });
          setTimeout(() => server.stop(true), SHUTDOWN_GRACE_MS);

          return new Response(successHtml, { headers: { 'content-type': 'text/html' } });
        },
        error(err) {
          reject(err);
          return new Response('Server error', { status: 500 });
        },
      });

      log.success(`Local server listening. Opening browser…`);
    });
  }, 'PKCE_SERVER_FAILED');

  // Open browser before waiting (server is already listening at this point).
  // We start the server promise above, then open browser, then await.
  // Re-structure: open browser right after server starts.
  await openBrowser(authUrl.toString());
  log.info('Waiting for browser callback…');

  if (isErr(callbackResult)) {
    return err(
      resultError('PKCE_CALLBACK_FAILED', `Callback error: ${callbackResult.error.message}`),
    );
  }

  const { code, callbackUrl } = callbackResult.value;
  log.success(`Callback received. Exchanging code for tokens…`);

  // 5. Token exchange
  const clientIdentity: oauth.Client = {
    client_id: OIDC_CLIENT_ID,
    token_endpoint_auth_method: 'none',
  };

  const tokenResult = await tryCatchAsync(async () => {
    // oauth4webapi v3.x: validateAuthResponse THROWS on OAuth2 errors instead
    // of returning them. The legacy `oauth.isOAuth2Error(...)` API was removed
    // in v3 — wrap the call in try/catch (handled by tryCatchAsync wrapper)
    // and let any OAuth2Error bubble up naturally.
    const params = oauth.validateAuthResponse(serverMetadata, clientIdentity, callbackUrl, state);

    const tokenResponse = await oauth.authorizationCodeGrantRequest(
      serverMetadata,
      clientIdentity,
      oauth.None(),
      params,
      PKCE_REDIRECT_URI,
      codeVerifier,
    );

    const tokens = await oauth.processAuthorizationCodeResponse(serverMetadata, clientIdentity, tokenResponse);
    return tokens;
  }, 'TOKEN_EXCHANGE_FAILED');

  if (isErr(tokenResult)) {
    return err(
      resultError('TOKEN_EXCHANGE_FAILED', `Token exchange failed: ${tokenResult.error.message}`),
    );
  }

  const tokens = tokenResult.value;
  const accessToken = tokens.access_token;
  const idToken = (tokens.id_token as string | undefined) ?? '';
  const refreshToken = tokens.refresh_token as string | undefined;
  const expiresIn = typeof tokens.expires_in === 'number' ? tokens.expires_in : 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  // 6. Decode id_token for display claims
  let sub = 'unknown';
  let email = 'unknown';
  let name = 'unknown';

  if (idToken) {
    const decodeResult = decodeJwtPayload(idToken);
    if (isOk(decodeResult)) {
      const claims = decodeResult.value;
      sub = (claims.sub as string | undefined) ?? 'unknown';
      email = (claims.email as string | undefined) ?? 'unknown';
      name = (claims.name as string | undefined) ?? (claims.preferred_username as string | undefined) ?? 'unknown';
    }
  }

  // 7. Persist token cache
  const cache: ITokenCache = {
    access_token: accessToken,
    id_token: idToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    sub,
    email,
    name,
    issuer: OIDC_ISSUER_URL,
    client_id: OIDC_CLIENT_ID,
  };

  const writeResult = await writeTokenCache(cache);
  if (isErr(writeResult)) {
    return err(
      resultError('TOKEN_CACHE_WRITE_FAILED', `Tokens received but failed to save: ${writeResult.error.message}`),
    );
  }

  log.success(`Logged in as ${email} (${sub})`);
  return ok(cache);
}

// ─────────────────────────────── auth status ─────────────────────────────────

/**
 * Shows the cached token status. If the token is expired, attempts a silent
 * refresh via refresh_token and prints updated info.
 *
 * @returns `ok(undefined)` on success, `err(...)` on failure.
 */
async function authStatus(): Promise<Result<void, ResultError>> {
  log.info('Checking token cache…');

  const cacheResult = readTokenCache();
  if (isErr(cacheResult)) {
    if (cacheResult.error.code === 'NOT_LOGGED_IN') {
      log.warn('Not logged in. Run: bun run release:auth-login');
      return ok(undefined);
    }
    return err(cacheResult.error);
  }

  const cache = cacheResult.value;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired = cache.expires_at - 30 <= nowSeconds;
  const expiresDate = new Date(cache.expires_at * 1000).toISOString();

  if (!isExpired) {
    log.success(`Logged in as: ${cache.email}`);
    log.info(`  Sub:        ${cache.sub}`);
    log.info(`  Name:       ${cache.name}`);
    log.info(`  Expires at: ${expiresDate}`);
    log.info(`  Expired:    false`);
    return ok(undefined);
  }

  log.warn(`Token expired at ${expiresDate}. Attempting refresh…`);

  const validTokenResult = await loadValidToken();
  if (isErr(validTokenResult)) {
    log.error(`Refresh failed: ${validTokenResult.error.message}`);
    log.warn('Run: bun run release:auth-login to re-authenticate.');
    return ok(undefined);
  }

  const refreshed = validTokenResult.value;
  const newExpiresDate = new Date(refreshed.expires_at * 1000).toISOString();
  log.success(`Token refreshed. Logged in as: ${refreshed.email}`);
  log.info(`  Sub:        ${refreshed.sub}`);
  log.info(`  Expires at: ${newExpiresDate}`);
  log.info(`  Expired:    false`);

  return ok(undefined);
}

// ─────────────────────────────── auth logout ─────────────────────────────────

/**
 * Deletes the local token cache, effectively logging out.
 *
 * @returns `ok(undefined)` on success, `err(...)` on failure.
 */
async function authLogout(): Promise<Result<void, ResultError>> {
  const result = await deleteTokenCache();
  if (isErr(result)) {
    return err(result.error);
  }
  log.success('Logged out. Token cache deleted.');
  return ok(undefined);
}

// ─────────────────────────────── Artifact discovery ──────────────────────────

/**
 * Discovers release artifacts for a given target under `releases/<version>/<target>/`.
 *
 * Looks for:
 *   - A binary file ending in `.app.tar.gz` (macOS) or `.nsis.zip` (Windows)
 *   - A corresponding `.sig` file
 *
 * @param version - App version string (e.g. "0.1.3").
 * @param target  - CLI target label.
 * @returns Artifact paths + sig content, or an error.
 */
export function discoverArtifacts(
  version: string,
  target: ReleaseTarget,
): Result<{ artifactPath: string; sigPath: string; sigContent: string }, ResultError> {
  const targetDir = join(PROJECT_ROOT, 'releases', version, target);

  if (!existsSync(targetDir)) {
    return err(
      resultError(
        'ARTIFACT_DIR_NOT_FOUND',
        `Artifact directory not found: ${targetDir}\n` +
          `Run without --skip-build or run build-release.ts first.`,
      ),
    );
  }

  const entries = readdirSync(targetDir);

  const extensions: Record<ReleaseTarget, string> = {
    'macos-arm64': '.app.tar.gz',
    'macos-x64': '.app.tar.gz',
    'windows-x64': '.nsis.zip',
    'linux-x64': '.AppImage',
    'linux-arm64': '.AppImage',
  };

  const ext = extensions[target];
  const artifactName = entries.find((f) => f.endsWith(ext) && !f.endsWith('.sig'));
  if (!artifactName) {
    return err(
      resultError(
        'ARTIFACT_NOT_FOUND',
        `No "*${ext}" artifact found in: ${targetDir}`,
      ),
    );
  }

  const sigName = entries.find((f) => f === `${artifactName}.sig`);
  if (!sigName) {
    return err(
      resultError(
        'SIG_NOT_FOUND',
        `No "${artifactName}.sig" file found in: ${targetDir}`,
      ),
    );
  }

  const sigContent = tryCatch(
    () => readFileSync(join(targetDir, sigName), 'utf-8').trim(),
    'SIG_READ_FAILED',
  );

  if (isErr(sigContent)) {
    return err(
      resultError('SIG_READ_FAILED', `Failed to read signature file: ${sigContent.error.message}`),
    );
  }

  return ok({
    artifactPath: join(targetDir, artifactName),
    sigPath: join(targetDir, sigName),
    sigContent: sigContent.value,
  });
}

// ─────────────────────────────── Build invocation ────────────────────────────

/**
 * Invokes `scripts/build-release.ts` for the given target via Bun.spawn.
 *
 * @param target - CLI target label.
 * @returns `ok(undefined)` on success, `err(...)` on non-zero exit.
 */
async function invokeBuildRelease(target: ReleaseTarget): Promise<Result<void, ResultError>> {
  log.info(`Invoking build-release.ts for target: ${target}…`);

  const result = await tryCatchAsync(async () => {
    const proc = Bun.spawn(
      ['bun', 'run', 'scripts/build-release.ts', '--target', target],
      {
        cwd: PROJECT_ROOT,
        stdout: 'inherit',
        stderr: 'inherit',
      },
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`build-release.ts exited with code ${exitCode}`);
    }
  }, 'BUILD_RELEASE_FAILED');

  if (isErr(result)) {
    return err(
      resultError(
        'BUILD_RELEASE_FAILED',
        `Build failed for target ${target}: ${result.error.message}`,
      ),
    );
  }

  log.success(`Build complete for ${target}.`);
  return ok(undefined);
}

// ─────────────────────────────── Upload ──────────────────────────────────────

/**
 * Uploads a single release artifact to the admin API via the SDK's
 * `publishComponent` — multipart to
 * `POST /api/admin/projects/{slug}/components` (version/target/arch/sig/
 * artifact[/component][/notes]), the only live publish surface since M6.
 *
 * The legacy releases endpoint this function used to target was dropped by
 * the hub (M6 corte seco, 2026-08-28) — that code is gone, git preserves it.
 *
 * @param opts         - Publish options (hub, slug, component, notes, dryRun).
 * @param target       - CLI target label.
 * @param version      - App version string.
 * @param artifactPath - Absolute path to the binary artifact.
 * @param sigPath      - Absolute path to the `.sig` file.
 * @param accessToken  - Bearer token (bridged into the SDK session when the
 *                       auth did not come from RELEASE_HUB_API_KEY).
 * @returns Upload result or an error.
 */
async function uploadArtifact(
  opts: IPublishOptions,
  target: ReleaseTarget,
  version: string,
  artifactPath: string,
  sigPath: string,
  accessToken: string,
): Promise<Result<IReleaseUploadResult, ResultError>> {
  const filename = basename(artifactPath);
  const mappingResult = mapTargetToServer(target);
  if (isErr(mappingResult)) {
    return err(mappingResult.error);
  }
  const { serverTarget, serverArch } = mappingResult.value;

  if (opts.dryRun) {
    // Dry-run never touches the network — the SDK is not called.
    log.info(`[DRY-RUN] Would upload:`);
    log.info(`  File:      ${artifactPath}`);
    log.info(`  Filename:  ${filename}`);
    log.info(`  Version:   ${version}`);
    log.info(`  Target:    ${serverTarget}`);
    log.info(`  Arch:      ${serverArch}`);
    log.info(`  Component: ${opts.component || '(principal — sin canal público)'}`);
    log.info(`  Sig:       ${sigPath}`);
    log.info(`  Hub:       POST ${opts.hub}/api/admin/projects/${opts.slug}/components`);
    return ok({
      target,
      version,
      artifactFilename: filename,
      dryRun: true,
    });
  }

  log.info(`Uploading ${filename} (${target}) to ${opts.hub}…`);

  // publishComponent reads auth itself: RELEASE_HUB_API_KEY env, or the SDK
  // session at ~/.config/release-hub/cli.json. With the API key the bridge is
  // a no-op; otherwise the token this CLI resolved (PKCE / client_credentials)
  // is transcribed into the session store first.
  if (!process.env.RELEASE_HUB_API_KEY?.trim()) {
    const bridgeResult = await writeSdkSessionFile(opts.hub, accessToken, {});
    if (isErr(bridgeResult)) {
      return err(bridgeResult.error);
    }
  }

  const pubResult = await publishComponent({
    project: opts.slug,
    version,
    target: serverTarget,
    arch: serverArch,
    artifact: artifactPath,
    sig: sigPath,
    component: opts.component || undefined,
    notes: opts.notes || undefined,
    hub: opts.hub,
  });

  if (isErr(pubResult)) {
    return err(
      resultError(
        'UPLOAD_FAILED',
        `Upload failed for ${target}: ${pubResult.error.message}`,
      ),
    );
  }

  log.success(
    `Uploaded ${filename} → ${opts.slug} v${version} (${serverTarget}/${serverArch}` +
      `${opts.component ? `, component=${opts.component}` : ', principal'} )`,
  );

  return ok({
    target,
    version,
    artifactFilename: filename,
    dryRun: false,
  });
}

// ─────────────────────────────── AI release notes ────────────────────────────

/**
 * Runs `git` synchronously and returns trimmed stdout.
 *
 * @param args - Argument vector passed to `git`.
 * @returns Trimmed stdout, or an error when git exits non-zero.
 */
function gitCapture(args: string[]): Result<string, ResultError> {
  return tryCatch(() => {
    const proc = Bun.spawnSync(['git', ...args], { cwd: PROJECT_ROOT });
    if (proc.exitCode !== 0) {
      throw new Error(
        `git ${args.join(' ')} exited with ${proc.exitCode}: ${proc.stderr.toString().trim()}`,
      );
    }
    return proc.stdout.toString().trim();
  }, 'GIT_COMMAND_FAILED');
}

/**
 * Normalises the AI response body to the release-notes markdown we ship.
 *
 * The custom `buildTPVHaidoReleasePrompt()` already tells the model to output
 * the notes inline (starting with `## ✨ Cambios principales`), so most of the
 * time we just trim and return. The legacy `## 📝 NOTAS DE RELEASE` regex
 * stays as a safety net for models that wrap their answer inside an outer
 * `markdown` fence.
 *
 * @param response - Raw AI response text.
 * @returns The trimmed release-notes body, or an error when the model returns
 *   nothing usable.
 */
function extractReleaseNotesSection(response: string): Result<string, ResultError> {
  const wrapperMatch = response.match(
    /## 📝 NOTAS DE RELEASE\s*\n([\s\S]*?)(?=\n## |\n*$)/,
  );
  const fenced = response.match(/```markdown\s*\n([\s\S]*?)\n```/);

  const candidate =
    wrapperMatch?.[1] ??
    (fenced?.[1]?.includes('## ✨ Cambios principales') ? fenced[1] : undefined) ??
    response;

  const body = candidate
    .replace(/```\s*$/, '')
    .trim();

  if (!body || body.length < 20) {
    return err(
      resultError(
        'AI_NOTES_UNPARSEABLE',
        'AI response did not contain any recognisable release-notes content.',
      ),
    );
  }
  return ok(body);
}

/**
 * Builds the project-specific prompt sent to the AI provider for release notes.
 *
 * Why a custom template (instead of `createReleasePrompt()` from
 * `gemini-commit-wizard`): the SDK template is generic and asks Gemini for a
 * 4-section marketing-flavoured markdown (RESUMEN / CHANGELOG / VERSION /
 * NOTAS DE RELEASE). In practice it omits the actual architectural changes
 * (e.g. refactors, command additions, dependency swaps) — concrete things
 * users and reviewers need to see. This template forces technical depth,
 * Spanish output, and a flexible section layout that skips empty buckets.
 *
 * @param version - Version being released, e.g. "0.1.4".
 * @param lastTag - Previous git tag (range base), e.g. "v0.1.3".
 * @param commits - Commit lines (`%h %s`) between `lastTag` and HEAD.
 * @param changedFiles - Repo-relative paths touched in the range.
 * @returns The full prompt string ready for `provider.generate()`.
 */
function buildTPVHaidoReleasePrompt(
  version: string,
  lastTag: string,
  commits: string[],
  changedFiles: string[],
): string {
  const commitsBlock = commits.map((c) => `- ${c}`).join('\n');
  const filesBlock = changedFiles.map((f) => `- ${f}`).join('\n');

  return `Eres un ingeniero senior escribiendo las notas de release oficiales de TPV El Haido ${version} para usuarios técnicos y hosteleros profesionales. Las notas aparecen en la pantalla de actualización OTA de la app y en la release de GitHub — la gente decidirá si actualiza basándose en ellas.

**PROYECTO**: TPV El Haido es un Punto de Venta (TPV/POS) desktop para restaurantes y bares en España. Stack: Tauri 2 + SolidJS + TypeScript en frontend, Rust backend con SQLite embebido, runtime Bun. Tiene sidecar AEAT-bridge para VerificaTu (compliance fiscal español), auto-updater vía release-hub (\`haido.releases.mks2508.systems\`), builds para macOS / Windows / Linux x64+arm64, y una PWA deployada en \`/tpv/\`. Idioma de las notas: **español**.

**INPUTS**
- Versión: \`${version}\` (tag anterior: \`${lastTag}\`)
- ${commits.length} commits desde \`${lastTag}\`:
${commitsBlock}
- Archivos cambiados:
${filesBlock}

**FORMATO DE SALIDA** (objetivo ~1200 caracteres TOTAL — sé conciso)

Cada sección debe caber en 2-4 frases (~200-300 chars). Si una sección crecería más de 3 bullets o 300 chars, recortá y priorizá lo más específico.

\`\`\`
## ✨ Cambios principales
[1-2 frases describiendo QUÉ cambió en la app. Cita 1-2 hashes cortos o refs a TR cuando los commits los mencionan. ~150-250 chars.]

## 🏗️ Arquitectura
[SOLO si hubo cambios de arquitectura, refactor mayor, migraciones de API, comandos Tauri añadidos/renombrados, o consolidación de platform layer. 2-4 bullets, nombra archivos / módulos / comandos Tauri / rutas afectados. Si no hay, OMITE esta sección entera.]

## 🐛 Correcciones
[Bullets concisos en formato \`- hash …\`: cada fix con su hash corto o número de TR cuando aplique. MÁXIMO 4 bullets; si hay más de 4 fixes, agrupá por área (\`- hash…\` ×N en storage, \`- hash…\` ×N en instalador, etc.). Si no hay commits \`fix(...)\` relevantes, OMITE.]

## ⚙️ CI / DevOps
[SOLO si cambiaron workflows (\`.github/workflows/*.yml\`, \`apps/*/Dockerfile\`, manifests Coolify), scripts (\`scripts/*.ts\`), o pipeline de release. 2-3 bullets nombrando los workflows/archivos. Si no hay, OMITE.]

## 📦 Miscelánea
[MÁXIMO 3 bullets — agrupa cambios no arquitectónicos (themes, deps, docs, refactors cosméticos). Si no hay, OMITE.]
\`\`\`

**REGLAS DURAS**
- ESPAÑOL. Tono técnico profesional, tuteo neutro. Sin emojis decorativos fuera de las secciones listadas arriba.
- **LÍMITE DE LONGITUD**: el total NO debe superar ~1500 caracteres. Si ves que crece, recortá bullets genéricos antes que específico; si aún así no entra, OMITE la sección de menor impacto (normalmente 📦 Miscelánea).
- **PROHIBIDAS** las muletillas huecas que suenan a marketing: "mejoras significativas", "varias mejoras", "numerosas correcciones", "se han realizado mejoras", "se han introducido mejoras", "se realizó una migración", "sienta las bases para", "refuerza el compromiso", "consolida la experiencia", "allana el camino", "marca un hito". Si no podés decir algo concreto del commit, OMITE la sección.
- CADA afirmación debe ser verificable desde los commits o archivos. Si el commit lo dice, dilo con su hash corto. Si NO lo dice, **NO lo inventes** — la honestidad brutal es lo que diferencia unas release notes útiles de copy vacío.
- No repitas el changelog al final ni añadas secciones no listadas arriba. La salida son SOLO las secciones que apliquen, en markdown plano, sin envoltorio \`\`\`markdown\`.
- Si el rango tiene menos de 3 commits o son todos \`chore(release): version bump\`, dilo explícitamente y termina con UNA sola frase.

**EJEMPLO DE PROFUNDIDAD ESPERADA** (no copies el contenido — solo la estructura y profundidad; la realidad manda):

\`\`\`
## ✨ Cambios principales
Migración completa del platform layer: \`sqlite-storage-adapter\` y \`audit.service\` ya no llaman \`invoke()\` directamente, pasan por \`PlatformService\` (TR-19, 27 invocaciones consolidadas, commits \`51ad0a0\` + \`d7b26a6\`). Habilita el run-mode PWA+iOS sin reescritura.

## 🏗️ Arquitectura
- \`PlatformService\`: nueva interfaz estable para Tauri/PWA/runtime mock (3 implementaciones en \`src/services/platform/\`).
- \`TauriPlatformService\`: 23 métodos refactorizados (\`getProducts\`, \`createOrder\`, …). No breaking en lo expuesto — son detalles internos.
- Eliminados 5 \`isTauri()\` ad-hoc en \`src/services/\` y \`src/hooks/\`.

## ⚙️ CI / DevOps
- \`.github/workflows/linux-x64-deploy.yml\`: añadido step de \`publish --client-credentials\` tras \`build-bundle\`.
- \`scripts/release.ts\`: nuevo sub-comando \`publish-bundle\` con flag \`--client-credentials\` para CI headless.

## 📦 Miscelánea
- \`docs/progress-log.md\`: entradas cont.3–cont.5 desde la sync multi-sesión.
- Bump cosmético de versión \`0.1.0 → 0.1.3\` en JSDoc y CLI examples.
\`\`\`

Ahora escribe las notas de release para **TPV El Haido ${version}** basándote ÚNICAMENTE en los commits y archivos de arriba. Empieza directo con \`## ✨ Cambios principales\` — sin saludo introductorio ni resumen al final.`;
}

/**
 * Generates release notes for the auto-update channel with an AI provider.
 *
 * Uses `createProvider()` (auto-detects GEMINI_API_KEY > GROQ_API_KEY >
 * OPENROUTER_API_KEY > \`gemini\` CLI binary) and feeds the project-specific
 * `buildTPVHaidoReleasePrompt()` template directly — bypasses
 * `createReleasePrompt()` on purpose because the SDK's generic template
 * produces marketing-flavoured prose that drops architectural details.
 *
 * Git range is \`<last tag>..HEAD\`. Every failure mode (no provider, no
 * tags yet, empty range, AI error, unparseable body) is returned as an error
 * so callers can degrade gracefully instead of failing the release.
 *
 * @param version - Version string being released (e.g. "0.1.4").
 * @returns The release-notes markdown, or an error describing why not.
 */
export async function generateReleaseNotesWithAI(
  version: string,
): Promise<Result<string, ResultError>> {
  const providerResult = tryCatch(() => createProvider(), 'AI_PROVIDER_UNAVAILABLE');
  if (isErr(providerResult)) {
    return err(
      resultError('AI_PROVIDER_UNAVAILABLE', `No AI provider: ${providerResult.error.message}`),
    );
  }
  const provider = providerResult.value;
  log.info(`AI provider: ${provider.name} (model: ${provider.model})`);

  const lastTagResult = gitCapture(['describe', '--tags', '--abbrev=0']);
  if (isErr(lastTagResult)) {
    return err(
      resultError(
        'AI_NOTES_NO_BASE_TAG',
        `Cannot resolve last git tag (no tags yet?): ${lastTagResult.error.message}`,
      ),
    );
  }
  const lastTag = lastTagResult.value;
  const range = `${lastTag}..HEAD`;

  const commitsResult = gitCapture(['log', range, '--format=%h %s']);
  const filesResult = gitCapture(['diff', '--name-only', range]);
  if (isErr(commitsResult) || isErr(filesResult)) {
    const message = isErr(commitsResult) ? commitsResult.error.message : 'diff failed';
    return err(resultError('AI_NOTES_NO_HISTORY', `Cannot read git history: ${message}`));
  }

  const commits = commitsResult.value.split('\n').filter(Boolean);
  const changedFiles = filesResult.value.split('\n').filter(Boolean);
  if (commits.length === 0) {
    return err(
      resultError('AI_NOTES_EMPTY_RANGE', `No commits in range ${range} — nothing to summarise.`),
    );
  }

  const prompt = buildTPVHaidoReleasePrompt(version, lastTag, commits, changedFiles);

  const responseResult = await tryCatchAsync(
    async () => provider.generate(prompt),
    'AI_GENERATION_FAILED',
  );
  if (isErr(responseResult)) {
    return err(
      resultError('AI_GENERATION_FAILED', `AI generation failed: ${responseResult.error.message}`),
    );
  }

  return extractReleaseNotesSection(responseResult.value);
}

// ─────────────────────────────── publish ─────────────────────────────────────

/**
 * Orchestrates the full publish flow:
 *   1. Verify auth (load + refresh if needed).
 *   2. Read app version.
 *   3. Optionally build artifacts.
 *   4. Discover artifacts.
 *   5. Upload each target to admin API (or log if --dry-run).
 *
 * @param opts - Publish options parsed from CLI.
 * @returns `ok(undefined)` when all targets succeed (or dry-run), `err(...)` on failure.
 */
async function publish(opts: IPublishOptions): Promise<Result<void, ResultError>> {
  log.header('Release Hub — publish', opts.dryRun ? 'DRY-RUN' : 'LIVE');

  // 1. Auth
  let accessToken: string;

  // NEW: API key auth path (CI-friendly, bypasses Pocket ID M2M gate entirely).
  // The hub's apiKeyOrAdminGuard validates rhk_ prefix before the auth plugin's
  // audience/allowedClientIds gate (see hub apps/server/src/lib/api-key-auth.ts),
  // so a per-project API key with scope `releases:write` is the intended path
  // for `publish` from headless CI. Env var precedence: explicit > env > cache.
  const apiKeyFromEnv = process.env.RELEASE_HUB_API_KEY?.trim();
  if (apiKeyFromEnv) {
    if (!apiKeyFromEnv.startsWith('rhk_')) {
      return err(
        resultError(
          'INVALID_API_KEY',
          'RELEASE_HUB_API_KEY is set but does not start with "rhk_" — refusing to use as Bearer token.',
        ),
      );
    }
    accessToken = apiKeyFromEnv;
    log.success('Authenticated via API key (RELEASE_HUB_API_KEY env var).');
  } else if (opts.dryRun && !opts.clientCredentials) {
    // Dry-run without --client-credentials: keep PKCE-style behaviour
    // (placeholder if no cache) so existing CI smokes that fake auth stay green.
    const cacheResult = readTokenCache();
    if (isOk(cacheResult)) {
      accessToken = cacheResult.value.access_token;
      log.info(`[DRY-RUN] Using cached token for ${cacheResult.value.email}`);
    } else {
      accessToken = 'dry-run-no-token';
      log.warn('[DRY-RUN] No token cached — upload would fail in live mode. Run: auth login');
    }
  } else {
    // Live mode OR --client-credentials (regardless of --dry-run): always
    // mint a real token. This is what makes --client-credentials --dry-run
    // actually exercise the grant — the whole point of the smoke.
    const tokenResult = await mintAccessToken(opts);
    if (isErr(tokenResult)) {
      return err(
        resultError(
          'AUTH_REQUIRED',
          `Not authenticated: ${tokenResult.error.message}\n` +
            (opts.clientCredentials
              ? 'Set RELEASE_HUB_CLIENT_ID + RELEASE_HUB_CLIENT_SECRET env vars.'
              : 'Run: bun run release:auth-login'),
        ),
      );
    }
    accessToken = tokenResult.value.accessToken;
    if (opts.clientCredentials) {
      log.success(`Authenticated via client_credentials (sub=${tokenResult.value.sub ?? 'unknown'}).`);
    } else {
      log.success(`Authenticated as: ${tokenResult.value.email}`);
    }
  }

  // 2. Read version
  const versionResult = tryCatch(() => {
    const confPath = resolve(PROJECT_ROOT, 'src-tauri', 'tauri.conf.json');
    const raw = readFileSync(confPath, 'utf-8');
    const conf = JSON.parse(raw) as { version?: string };
    if (!conf.version) throw new Error('tauri.conf.json has no "version" field.');
    return conf.version;
  }, 'VERSION_READ_FAILED');

  if (isErr(versionResult)) {
    return err(
      resultError('VERSION_READ_FAILED', `Cannot read app version: ${versionResult.error.message}`),
    );
  }
  const version = versionResult.value;
  log.info(`App version: ${version}`);
  log.info(`Targets: ${opts.targets.join(', ')}`);
  log.info(`Hub: ${opts.hub}`);
  log.info(`Slug: ${opts.slug}`);

  // 2b. AI release notes (opt-in, best-effort — never fails the publish)
  let resolvedNotes = opts.notes;
  if (opts.aiNotes && !resolvedNotes) {
    const aiResult = await generateReleaseNotesWithAI(version);
    if (isErr(aiResult)) {
      log.warn(
        `AI release-notes generation skipped: ${aiResult.error.message} ` +
          '— publishing without notes.',
      );
    } else {
      resolvedNotes = aiResult.value;
      log.success(`AI release notes generated (${resolvedNotes.length} chars).`);
      if (opts.dryRun) log.info(`[DRY-RUN] Notes:\n${resolvedNotes}`);
    }
  } else if (opts.aiNotes && resolvedNotes) {
    log.info('--ai-notes ignored: explicit --notes provided.');
  }

  // 3. Build + 4. Discover + 5. Upload — per target
  const results: IReleaseUploadResult[] = [];
  const failed: string[] = [];

  for (const target of opts.targets) {
    log.divider();
    log.info(`Processing target: ${target}`);

    // Build if needed
    if (!opts.skipBuild) {
      const buildResult = await invokeBuildRelease(target);
      if (isErr(buildResult)) {
        log.error(`Build failed for ${target}: ${buildResult.error.message}`);
        failed.push(target);
        continue;
      }
    }

    // Discover artifacts
    const artifactResult = discoverArtifacts(version, target);
    if (isErr(artifactResult)) {
      log.error(`Artifact discovery failed for ${target}: ${artifactResult.error.message}`);
      failed.push(target);
      continue;
    }

    const { artifactPath, sigPath } = artifactResult.value;

    // Upload (or dry-run)
    const uploadResult = await uploadArtifact(
      { ...opts, notes: resolvedNotes },
      target,
      version,
      artifactPath,
      sigPath,
      accessToken,
    );

    if (isErr(uploadResult)) {
      // If the SDK reports the token rejected (401/403), attempt one re-auth
      // (PKCE refresh OR client_credentials re-mint) and retry. The strategy
      // follows `opts` so --client-credentials mode mints a fresh token
      // instead of trying to load the (absent) PKCE cache.
      if (uploadResult.error.code === 'TOKEN_EXPIRED' && !opts.dryRun) {
        log.warn('Hub rejected the token — attempting re-auth + retry…');
        const refreshResult = await mintAccessToken(opts);
        if (isOk(refreshResult)) {
          const retryResult = await uploadArtifact(
            opts,
            target,
            version,
            artifactPath,
            sigPath,
            refreshResult.value.accessToken,
          );
          if (isOk(retryResult)) {
            results.push(retryResult.value);
            continue;
          }
          log.error(`Retry upload failed for ${target}: ${retryResult.error.message}`);
        } else {
          log.error(`Re-auth failed: ${refreshResult.error.message}`);
        }
      } else {
        log.error(`Upload failed for ${target}: ${uploadResult.error.message}`);
      }
      failed.push(target);
      continue;
    }

    results.push(uploadResult.value);
  }

  // Summary
  log.divider();
  log.header('Publish Summary', `v${version}`);
  for (const r of results) {
    if (r.dryRun) {
      log.info(`[DRY-RUN] ${r.target} → would upload ${r.artifactFilename}`);
    } else {
      log.success(`${r.target} → ${r.artifactFilename}${r.url ? ` (${r.url})` : ''}`);
    }
  }
  for (const t of failed) {
    log.error(`${t} → FAILED`);
  }

  if (failed.length > 0) {
    return err(
      resultError('PUBLISH_PARTIAL_FAILURE', `${failed.length} target(s) failed: ${failed.join(', ')}`),
    );
  }

  log.success('All targets published successfully.');
  return ok(undefined);
}

// ─────────────────────────────── Bundle discovery ────────────────────────────

/**
 * Discovers OTA bundle zips under `releases/bundles/{version}/bundle.zip`.
 *
 * Returns the path with the lexicographically largest version directory.
 * Naming `YYYY.MM.DD-N` sorts chronologically under lex order.
 *
 * @param explicitPath - If non-empty, used as the path verbatim (resolved against cwd).
 * @returns The selected bundle zip path or an error.
 */
export function discoverBundlePath(
  explicitPath: string,
): Result<string, ResultError> {
  if (explicitPath) {
    const resolved = resolve(explicitPath);
    if (!existsSync(resolved)) {
      return err(
        resultError(
          'BUNDLE_NOT_FOUND',
          `--bundle path does not exist: ${resolved}`,
        ),
      );
    }
    return ok(resolved);
  }

  const bundlesRoot = join(PROJECT_ROOT, 'releases', 'bundles');
  if (!existsSync(bundlesRoot)) {
    return err(
      resultError(
        'BUNDLE_NOT_FOUND',
        `No bundle path given via --bundle and no bundles found under ${bundlesRoot}.\n` +
          `Run scripts/build-bundle.ts pack first, or pass --bundle <path>.`,
      ),
    );
  }

  const entries = readdirSync(bundlesRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse();

  if (entries.length === 0) {
    return err(
      resultError(
        'BUNDLE_NOT_FOUND',
        `No version directories under ${bundlesRoot}. Run scripts/build-bundle.ts pack first.`,
      ),
    );
  }

  for (const versionDir of entries) {
    const candidate = join(bundlesRoot, versionDir, 'bundle.zip');
    if (existsSync(candidate)) {
      log.info(`Auto-discovered bundle: ${candidate}`);
      return ok(candidate);
    }
  }

  return err(
    resultError(
      'BUNDLE_NOT_FOUND',
      `Found ${entries.length} bundle dir(s) under ${bundlesRoot} but none contain bundle.zip.`,
    ),
  );
}

/**
 * Loads `manifest.json` from the directory next to a bundle zip.
 *
 * Used as the source of truth for `bundleVersion` / `minNativeVersion` /
 * `maxNativeVersion` / `signature` when those are not passed as explicit
 * CLI flags.
 *
 * @param bundlePath - Absolute path to the bundle zip.
 * @returns Parsed manifest, or an error if not found / malformed / missing required fields.
 */
export function loadBundleManifest(bundlePath: string): Result<IBundleMetadata, ResultError> {
  const dir = resolve(bundlePath, '..');
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return err(
      resultError(
        'MANIFEST_NOT_FOUND',
        `No manifest.json next to bundle at ${manifestPath}. ` +
          `Re-run scripts/build-bundle.ts pack, or pass --bundle-version / --min-native-version / --max-native-version / --signature flags explicitly.`,
      ),
    );
  }

  const parseResult = tryCatch(() => {
    const raw = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  }, 'MANIFEST_PARSE_FAILED');

  if (isErr(parseResult)) {
    return err(
      resultError(
        'MANIFEST_PARSE_FAILED',
        `Cannot parse ${manifestPath}: ${parseResult.error.message}`,
      ),
    );
  }

  const manifest = parseResult.value;
  const requireField = (key: string): Result<string, ResultError> => {
    const v = manifest[key];
    if (typeof v !== 'string' || !v) {
      return err(
        resultError(
          'MANIFEST_FIELD_MISSING',
          `manifest.json missing required field "${key}" (got ${typeof v})`,
        ),
      );
    }
    return ok(v);
  };

  const bundleVersion = requireField('bundleVersion');
  if (isErr(bundleVersion)) return err(bundleVersion.error);
  const minNativeVersion = requireField('minNativeVersion');
  if (isErr(minNativeVersion)) return err(minNativeVersion.error);
  const maxNativeVersion = requireField('maxNativeVersion');
  if (isErr(maxNativeVersion)) return err(maxNativeVersion.error);
  const signature = requireField('signature');
  if (isErr(signature)) return err(signature.error);

  return ok({
    bundleVersion: bundleVersion.value,
    minNativeVersion: minNativeVersion.value,
    maxNativeVersion: maxNativeVersion.value,
    signature: signature.value,
  });
}

/**
 * Resolves bundle metadata by merging CLI flags over the manifest sidecar.
 *
 * Every field is required for the eventual upload (the hub needs them all);
 * flags override manifest values. If both CLI and manifest are missing for a
 * given field, the call fails.
 *
 * @param opts - Parsed publish-bundle options (CLI flags).
 * @param bundlePath - Resolved bundle zip path (used to find manifest.json).
 * @returns Fully resolved metadata or an error.
 */
export function resolveBundleMetadata(
  opts: IPublishBundleOptions,
  bundlePath: string,
): Result<IBundleMetadata, ResultError> {
  const manifestResult = loadBundleManifest(bundlePath);
  const manifest: Partial<IBundleMetadata> = isOk(manifestResult)
    ? manifestResult.value
    : {
        bundleVersion: '',
        minNativeVersion: '',
        maxNativeVersion: '',
        signature: '',
      };

  const pick = (flagValue: string, manifestValue: string, field: string): Result<string, ResultError> => {
    if (flagValue) return ok(flagValue);
    if (manifestValue) return ok(manifestValue);
    return err(
      resultError(
        'BUNDLE_METADATA_INCOMPLETE',
        `No source for "${field}": pass --${field.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} or ensure manifest.json has it next to the bundle.`,
      ),
    );
  };

  const bundleVersion = pick(opts.bundleVersion, manifest.bundleVersion ?? '', 'bundleVersion');
  if (isErr(bundleVersion)) return err(bundleVersion.error);
  const min = pick(opts.minNativeVersion, manifest.minNativeVersion ?? '', 'minNativeVersion');
  if (isErr(min)) return err(min.error);
  const max = pick(opts.maxNativeVersion, manifest.maxNativeVersion ?? '', 'maxNativeVersion');
  if (isErr(max)) return err(max.error);
  const sig = pick(opts.signature, manifest.signature ?? '', 'signature');
  if (isErr(sig)) return err(sig.error);

  return ok({
    bundleVersion: bundleVersion.value,
    minNativeVersion: min.value,
    maxNativeVersion: max.value,
    signature: sig.value,
  });
}

// ─────────────────────────────── Bundle upload ────────────────────────────────

/**
 * Uploads a single OTA bundle to the admin API via multipart/form-data.
 *
 * Auth strategy follows the same rules as `publish()`:
 *   - dryRun without clientCredentials: PKCE cache (or dry-run placeholder).
 *   - live OR clientCredentials: `mintAccessToken()` (real token).
 *
 * Field names (`bundleVersion` / `minNativeVersion` / `maxNativeVersion` /
 * `signature` / `bundle`) follow the documented contract — see TR caveat
 * "DOCUMENTED-FIELDS-ASSUMED" for source (this repo's docs + inline comments
 * in `build-bundle.ts` + the manual snippet the workflow used to ship).
 *
 * @param opts          - Parsed publish-bundle options (CLI flags + paths).
 * @param metadata      - Resolved bundle metadata.
 * @param accessToken   - Bearer token for Authorization header.
 * @param zipPath       - Absolute path to the bundle zip.
 * @returns Upload result or an error.
 */
async function uploadBundle(
  opts: IPublishBundleOptions,
  metadata: IBundleMetadata,
  accessToken: string,
  zipPath: string,
): Promise<Result<IBundleUploadResult, ResultError>> {
  const filename = basename(zipPath);

  if (opts.dryRun) {
    const sigPreview = metadata.signature.length > 32
      ? `${metadata.signature.slice(0, 32)}…`
      : metadata.signature;
    const endpoint = opts.component
      ? `${opts.hub}/api/admin/projects/${opts.slug}/components`
      : `${opts.hub}/api/admin/projects/${opts.slug}/bundles`;
    log.info(`[DRY-RUN] Would upload bundle:`);
    log.info(`  File:              ${zipPath}`);
    log.info(`  Filename:          ${filename}`);
    log.info(`  Endpoint:          POST ${endpoint}`);
    log.info(`  bundleVersion:     ${metadata.bundleVersion}`);
    if (opts.component) {
      log.info(`  component:         ${opts.component}`);
      log.info(`  target:            ${opts.target}`);
      log.info(`  arch:              ${opts.arch}`);
      log.info(`  sig:               ${sigPreview}  (minisign .sig text, ${metadata.signature.length} chars)`);
      log.info(`  artifact (file):   <binary ${filename}>`);
    } else {
      log.info(`  minNativeVersion:  ${metadata.minNativeVersion}`);
      log.info(`  maxNativeVersion:  ${metadata.maxNativeVersion}`);
      log.info(`  signature:         ${sigPreview}  (ed25519 base64, ${metadata.signature.length} chars)`);
      log.info(`  bundle (file):     <binary ${filename}>`);
    }
    log.info(`  Authorization:     Bearer <elided (${accessToken.length} chars)>`);
    return ok({
      bundleVersion: metadata.bundleVersion,
      bundleFilename: filename,
      dryRun: true,
    });
  }

  log.info(`Uploading ${filename} (bundleVersion=${metadata.bundleVersion}) to ${opts.hub}…`);

  if (opts.component) {
    // Unified /components endpoint via the SDK — same multipart contract the
    // legacy branch below used to hand-roll (component/version/target/arch/
    // sig/artifact), with the server-side minisign verify against the
    // project's kind=binary key BEFORE storage write (admin/components.ts).
    if (!process.env.RELEASE_HUB_API_KEY?.trim()) {
      const bridgeResult = await writeSdkSessionFile(opts.hub, accessToken, {});
      if (isErr(bridgeResult)) {
        return err(bridgeResult.error);
      }
    }

    // publishComponent takes a .sig FILE path; the metadata holds the .sig
    // TEXT (manifest.json / --signature override). Transcribe to a temp file.
    const publishCall = (): Promise<Result<void, ResultError>> => {
      const tmpSigPath = join(tmpdir(), `release-hub-bundle-${Date.now()}.sig`);
      writeFileSync(tmpSigPath, metadata.signature);
      return publishComponent({
        project: opts.slug,
        version: metadata.bundleVersion,
        target: opts.target,
        arch: opts.arch,
        artifact: zipPath,
        sig: tmpSigPath,
        component: opts.component,
        hub: opts.hub,
      }).finally(() => {
        if (existsSync(tmpSigPath)) {
          unlinkSync(tmpSigPath);
        }
      });
    };

    const pubResult = await publishCall();
    if (isErr(pubResult)) {
      return err(
        resultError(
          'UPLOAD_FAILED',
          `Bundle upload failed for ${metadata.bundleVersion}: ${pubResult.error.message}`,
        ),
      );
    }

    log.success(`Uploaded ${filename} → ${opts.slug} bundleVersion=${metadata.bundleVersion} (component=${opts.component})`);
    return ok({
      bundleVersion: metadata.bundleVersion,
      bundleFilename: filename,
      dryRun: false,
    });
  }

  // Legacy /bundles endpoint — ed25519 sobre el zip (sha256+sign), se subía
  // con los metadatos del manifest. Mantenido para back-compat con quien
  // siga apuntando ahí; el cliente que lee /api/bundles/latest no debería
  // estar activo en este repo después de D10-D.
  const uploadResult = await tryCatchAsync(async (): Promise<{ url?: string }> => {
    const fileContent = readFileSync(zipPath);
    const blob = new Blob([fileContent]);

    const formData = new FormData();
    formData.append('bundleVersion', metadata.bundleVersion);
    formData.append('minNativeVersion', metadata.minNativeVersion);
    formData.append('maxNativeVersion', metadata.maxNativeVersion);
    formData.append('signature', metadata.signature);
    formData.append('bundle', blob, filename);

    const url = `${opts.hub}/api/admin/projects/${opts.slug}/bundles`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw Object.assign(
        new Error(`Server returned ${response.status}: ${body}`),
        { status: response.status },
      );
    }

    const json = await response.json().catch(() => ({})) as Record<string, unknown>;
    const bundleUrl =
      (json.url as string | undefined) ??
      (json.data as Record<string, unknown> | undefined)?.url as string | undefined;
    return { url: bundleUrl };
  }, 'UPLOAD_FAILED');

  if (isErr(uploadResult)) {
    return err(
      resultError(
        'UPLOAD_FAILED',
        `Bundle upload failed for ${metadata.bundleVersion}: ${uploadResult.error.message}`,
      ),
    );
  }

  log.success(`Uploaded ${filename} → ${opts.slug} bundleVersion=${metadata.bundleVersion}`);
  if (uploadResult.value.url) {
    log.info(`  Bundle URL: ${uploadResult.value.url}`);
  }

  return ok({
    bundleVersion: metadata.bundleVersion,
    bundleFilename: filename,
    url: uploadResult.value.url,
    dryRun: false,
  });
}

// ─────────────────────────────── publish-bundle ───────────────────────────────

/**
 * Orchestrates the OTA bundle publish flow:
 *   1. Resolve access token (PKCE cache OR client_credentials grant).
 *   2. Resolve bundle path (--bundle flag or auto-discover from releases/bundles/).
 *   3. Resolve bundle metadata (CLI flags override manifest.json sidecar).
 *   4. Upload the bundle via multipart/form-data (or log if --dry-run).
 *
 * `@param opts - Parsed publish-bundle options.
 * @returns `ok(undefined)` on success or dry-run, `err(...)` on failure.
 */
async function publishBundle(opts: IPublishBundleOptions): Promise<Result<void, ResultError>> {
  log.header('Release Hub — publish-bundle', opts.dryRun ? 'DRY-RUN' : 'LIVE');

  // 1. Auth — same dispatch as `publish()` (TR-15 semantics: live OR
  //    --client-credentials → real token, even with --dry-run).
  let accessToken: string;

  // API key auth path (CI-friendly, bypasses Pocket ID M2M gate entirely).
  // The hub's apiKeyOrAdminGuard validates rhk_ prefix before the auth plugin's
  // audience/allowedClientIds gate, so a per-project API key with scope
  // `releases:write` is the intended path for `publish-bundle` from headless CI.
  // (Same rationale as publish() lines 1564-1575.)
  const apiKeyFromEnv = process.env.RELEASE_HUB_API_KEY?.trim();
  if (apiKeyFromEnv) {
    if (!apiKeyFromEnv.startsWith('rhk_')) {
      return err(
        resultError(
          'INVALID_API_KEY',
          'RELEASE_HUB_API_KEY is set but does not start with "rhk_" — refusing to use as Bearer token.',
        ),
      );
    }
    accessToken = apiKeyFromEnv;
    log.success('Authenticated via API key (RELEASE_HUB_API_KEY env var).');
  } else if (opts.dryRun && !opts.clientCredentials) {
    const cacheResult = readTokenCache();
    if (isOk(cacheResult)) {
      accessToken = cacheResult.value.access_token;
      log.info(`[DRY-RUN] Using cached token for ${cacheResult.value.email}`);
    } else {
      accessToken = 'dry-run-no-token';
      log.warn('[DRY-RUN] No token cached — upload would fail in live mode. Run: auth login');
    }
  } else {
    const miniOpts: IPublishOptions = {
      targets: [],
      slug: opts.slug,
      hub: opts.hub,
      component: '',
      notes: '',
      aiNotes: false,
      skipBuild: true,
      clientCredentials: opts.clientCredentials,
      dryRun: opts.dryRun,
    };
    const tokenResult = await mintAccessToken(miniOpts);
    if (isErr(tokenResult)) {
      return err(
        resultError(
          'AUTH_REQUIRED',
          `Not authenticated: ${tokenResult.error.message}\n` +
            (opts.clientCredentials
              ? 'Set RELEASE_HUB_CLIENT_ID + RELEASE_HUB_CLIENT_SECRET env vars.'
              : 'Run: bun run release:auth-login'),
        ),
      );
    }
    accessToken = tokenResult.value.accessToken;
    if (opts.clientCredentials) {
      log.success(`Authenticated via client_credentials (sub=${tokenResult.value.sub ?? 'unknown'}).`);
    } else {
      log.success(`Authenticated as: ${tokenResult.value.email ?? 'unknown'}`);
    }
  }

  // 2. Bundle path
  const pathResult = discoverBundlePath(opts.bundlePath);
  if (isErr(pathResult)) {
    return err(pathResult.error);
  }
  const bundlePath = pathResult.value;

  log.info(`Bundle:   ${bundlePath}`);
  log.info(`Hub:      ${opts.hub}`);
  log.info(`Slug:     ${opts.slug}`);
  log.info(`Auth:     ${opts.clientCredentials ? 'client_credentials' : 'PKCE cache'}`);

  // 3. Metadata
  const metaResult = resolveBundleMetadata(opts, bundlePath);
  if (isErr(metaResult)) {
    return err(metaResult.error);
  }
  const metadata = metaResult.value;
  log.info(`Version:  ${metadata.bundleVersion} (min=${metadata.minNativeVersion}, max=${metadata.maxNativeVersion})`);

  // 4. Upload
  const uploadResult = await uploadBundle(opts, metadata, accessToken, bundlePath);
  if (isErr(uploadResult)) {
    return err(uploadResult.error);
  }

  const result = uploadResult.value;
  log.divider();
  log.header('Publish-bundle Summary', metadata.bundleVersion);
  if (result.dryRun) {
    log.info(`[DRY-RUN] ${metadata.bundleVersion} → would upload ${result.bundleFilename}`);
  } else {
    log.success(`${metadata.bundleVersion} → ${result.bundleFilename}${result.url ? ` (${result.url})` : ''}`);
  }

  return ok(undefined);
}

// ─────────────────────────────── Main ────────────────────────────────────────

/**
 * Entry point — dispatches sub-commands from `process.argv`.
 */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const [cmd, subCmd, ...rest] = argv;

  // ── auth ──
  if (cmd === 'auth') {
    if (subCmd === 'login') {
      const result = await authLogin();
      if (isErr(result)) {
        log.error(`Login failed: ${result.error.message}`);
        process.exit(1);
      }
      process.exit(0);
    }

    if (subCmd === 'status') {
      const result = await authStatus();
      if (isErr(result)) {
        log.error(`Status check failed: ${result.error.message}`);
        process.exit(1);
      }
      process.exit(0);
    }

    if (subCmd === 'logout') {
      const result = await authLogout();
      if (isErr(result)) {
        log.error(`Logout failed: ${result.error.message}`);
        process.exit(1);
      }
      process.exit(0);
    }

    log.error(`Unknown auth sub-command: "${subCmd}". Valid: login | status | logout`);
    printHelp();
    process.exit(1);
  }

  // ── publish ──
  if (cmd === 'publish') {
    // Re-include subCmd (may be a flag like --target) plus rest
    const publishArgv = subCmd ? [subCmd, ...rest] : rest;
    const optsResult = parsePublishOptions(publishArgv);
    if (isErr(optsResult)) {
      log.error(`publish: ${optsResult.error.message}`);
      printHelp();
      process.exit(1);
    }

    const result = await publish(optsResult.value);
    if (isErr(result)) {
      log.error(result.error.message);
      process.exit(1);
    }
    process.exit(0);
  }

  // ── publish-bundle ──
  if (cmd === 'publish-bundle') {
    // Re-include subCmd (may be a flag like --slug) plus rest
    const publishBundleArgv = subCmd ? [subCmd, ...rest] : rest;
    const optsResult = parsePublishBundleOptions(publishBundleArgv);
    if (isErr(optsResult)) {
      await log.error(`publish-bundle: ${optsResult.error.message}`);
      printHelp();
      process.exit(1);
    }

    const result = await publishBundle(optsResult.value);
    if (isErr(result)) {
      await log.error(result.error.message);
      process.exit(1);
    }
    process.exit(0);
  }

  log.error(`Unknown command: "${cmd}". Use --help for usage.`);
  printHelp();
  process.exit(1);
}

// Guard: only execute when run directly.
if (import.meta.main) {
  main().catch((e: unknown) => {
    log.critical('Unhandled error in release CLI:', e);
    process.exit(1);
  });
}
