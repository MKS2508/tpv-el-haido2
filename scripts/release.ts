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
 *     [--skip-build] \
 *     [--dry-run]
 */

import { existsSync, mkdirSync, chmodSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { homedir, platform } from 'node:os';
import * as oauth from 'oauth4webapi';
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
const ALL_RELEASE_TARGETS = ['macos-arm64', 'macos-x64', 'windows-x64'] as const;
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
  readonly notes: string;
  readonly skipBuild: boolean;
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

    --target   macos-arm64 | macos-x64 | windows-x64 | all   (required)
    --slug     Project slug in release-hub (e.g. "haido")     (required)
    --hub      Admin API base URL (default: ${DEFAULT_HUB_URL})
    --notes    Release notes / changelog text
    --skip-build  Skip bun run build-release; assumes artifacts exist
    --dry-run  Log what would be uploaded, no POST

Examples:
  bun run scripts/release.ts auth login
  bun run scripts/release.ts auth status
  bun run scripts/release.ts publish --target macos-arm64 --slug haido --dry-run
  bun run scripts/release.ts publish --target all --slug haido --skip-build
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
    notes: get('--notes') ?? '',
    skipBuild: has('--skip-build'),
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
 * @param version - App version string (e.g. "0.1.0").
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
 * Uploads a single release artifact to the admin API via multipart/form-data.
 *
 * @param opts         - Publish options (hub, slug, notes, dryRun).
 * @param target       - CLI target label.
 * @param version      - App version string.
 * @param artifactPath - Absolute path to the binary artifact.
 * @param sigContent   - Content of the `.sig` file.
 * @param accessToken  - Bearer token for Authorization header.
 * @returns Upload result or an error.
 */
async function uploadArtifact(
  opts: IPublishOptions,
  target: ReleaseTarget,
  version: string,
  artifactPath: string,
  sigContent: string,
  accessToken: string,
): Promise<Result<IReleaseUploadResult, ResultError>> {
  const filename = basename(artifactPath);
  const mappingResult = mapTargetToServer(target);
  if (isErr(mappingResult)) {
    return err(mappingResult.error);
  }
  const { serverTarget, serverArch } = mappingResult.value;

  if (opts.dryRun) {
    const sigPreview = sigContent.length > 32 ? `${sigContent.slice(0, 32)}…` : sigContent;
    log.info(`[DRY-RUN] Would upload:`);
    log.info(`  File:      ${artifactPath}`);
    log.info(`  Filename:  ${filename}`);
    log.info(`  Version:   ${version}`);
    log.info(`  Target:    ${serverTarget}`);
    log.info(`  Arch:      ${serverArch}`);
    log.info(`  Sig:       ${sigPreview}`);
    log.info(`  Hub:       POST ${opts.hub}/api/admin/projects/${opts.slug}/releases`);
    return ok({
      target,
      version,
      artifactFilename: filename,
      dryRun: true,
    });
  }

  log.info(`Uploading ${filename} (${target}) to ${opts.hub}…`);

  const uploadResult = await tryCatchAsync(async (): Promise<{ url?: string }> => {
    const fileContent = readFileSync(artifactPath);
    const blob = new Blob([fileContent]);

    const formData = new FormData();
    formData.append('version', version);
    formData.append('target', serverTarget);
    formData.append('arch', serverArch);
    formData.append('signature', sigContent);
    if (opts.notes) {
      formData.append('notes', opts.notes);
    }
    formData.append('binary', blob, filename);

    const url = `${opts.hub}/api/admin/projects/${opts.slug}/releases`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      throw Object.assign(new Error('Unauthorized — token may be expired'), { status: 401 });
    }

    if (response.status === 409) {
      throw Object.assign(
        new Error(`Release already exists: ${version} ${serverTarget}/${serverArch}`),
        { status: 409 },
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw Object.assign(
        new Error(`Server returned ${response.status}: ${body}`),
        { status: response.status },
      );
    }

    const json = await response.json().catch(() => ({})) as Record<string, unknown>;
    const releaseUrl = (json.url as string | undefined) ?? (json.data as Record<string, unknown> | undefined)?.url as string | undefined;
    return { url: releaseUrl };
  }, 'UPLOAD_FAILED');

  if (isErr(uploadResult)) {
    return err(
      resultError(
        'UPLOAD_FAILED',
        `Upload failed for ${target}: ${uploadResult.error.message}`,
      ),
    );
  }

  log.success(`Uploaded ${filename} → ${opts.slug} v${version} (${serverTarget}/${serverArch})`);
  if (uploadResult.value.url) {
    log.info(`  Release URL: ${uploadResult.value.url}`);
  }

  return ok({
    target,
    version,
    artifactFilename: filename,
    url: uploadResult.value.url,
    dryRun: false,
  });
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
  if (opts.dryRun) {
    // Allow dry-run without auth to facilitate smoke testing.
    const cacheResult = readTokenCache();
    if (isOk(cacheResult)) {
      accessToken = cacheResult.value.access_token;
      log.info(`[DRY-RUN] Using cached token for ${cacheResult.value.email}`);
    } else {
      accessToken = 'dry-run-no-token';
      log.warn('[DRY-RUN] No token cached — upload would fail in live mode. Run: auth login');
    }
  } else {
    const tokenResult = await loadValidToken();
    if (isErr(tokenResult)) {
      return err(
        resultError(
          'AUTH_REQUIRED',
          `Not authenticated: ${tokenResult.error.message}\nRun: bun run release:auth-login`,
        ),
      );
    }
    accessToken = tokenResult.value.access_token;
    log.success(`Authenticated as: ${tokenResult.value.email}`);
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

    const { artifactPath, sigContent } = artifactResult.value;

    // Upload (or dry-run)
    const uploadResult = await uploadArtifact(
      opts,
      target,
      version,
      artifactPath,
      sigContent,
      accessToken,
    );

    if (isErr(uploadResult)) {
      // If 401, attempt one token refresh and retry.
      if (uploadResult.error.message.includes('Unauthorized') && !opts.dryRun) {
        log.warn('Got 401 — attempting token refresh + retry…');
        const refreshResult = await loadValidToken();
        if (isOk(refreshResult)) {
          const retryResult = await uploadArtifact(
            opts,
            target,
            version,
            artifactPath,
            sigContent,
            refreshResult.value.access_token,
          );
          if (isOk(retryResult)) {
            results.push(retryResult.value);
            continue;
          }
          log.error(`Retry upload failed for ${target}: ${retryResult.error.message}`);
        } else {
          log.error(`Token refresh failed: ${refreshResult.error.message}`);
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
