#!/usr/bin/env bun
/**
 * @file smoke-trust-probe.ts
 * Smoke end-to-end de la cadena de confianza del haido SIN tocar canales
 * reales: componente desechable `trust-chain-probe` (proyecto `haido`) —
 * firma local con la clave canónica, publish vía SDK, assert de GET latest
 * (sha256 match), DELETE y assert 404 final.
 *
 * Uso:
 *   TAURI_SIGNING_PRIVATE_KEY_PASSWORD=<pass> bun run scripts/smoke-trust-probe.ts [--key <path>]
 *
 * La key canónica (`tauri-keys/tpv-el-haido.key`) es minisign FLAT + encrypted
 * (scrypt). tauri-cli no la lee por `-f` (espera el formato base64-wrapped de
 * `tauri signer generate`): se envuelve en memoria igual que hace
 * `scripts/build-release.ts` con `TAURI_SIGNING_PRIVATE_KEY`, y la passphrase
 * entra SOLO por env — jamás por argv.
 *
 * Sin passphrase el script falla cerrado (rc=1) ANTES de tocar la red, con el
 * playbook de dónde leerla (Bitwarden item "haido sign passphrase", field
 * PASSPHRASE — unlock es de waxin). La verificación local de la firma
 * (verifyMinisign contra la .pub canónica) no es opcional.
 *
 * Auth del publish/DELETE: `RELEASE_HUB_API_KEY` env (CI) o la sesión del SDK
 * en `~/.config/release-hub/cli.json` (misma resolución que publishComponent).
 */

import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { publishComponent, verifyMinisign } from '@mks2508/release-hub-sdk';
import { isErr, fail, type Result, type ResultError } from '@mks2508/no-throw';

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const DEFAULT_KEY = join(PROJECT_ROOT, 'tauri-keys', 'tpv-el-haido.key');
const ADMIN_HUB = (process.env.RELEASE_HUB_URL ?? 'https://admin.releases.mks2508.systems').replace(/\/+$/, '');
const TENANT_URL = 'https://haido.releases.mks2508.systems';
const PROJECT = 'haido';
const COMPONENT = 'trust-chain-probe';
const TARGET = 'any';
const ARCH = 'any';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** Resolves the Bearer token for the admin DELETE — same order as the SDK. */
function resolveBearer(): Result<string, ResultError> {
  const apiKey = process.env.RELEASE_HUB_API_KEY?.trim();
  if (apiKey) return ok(apiKey);
  const sessionPath = join(process.env.HOME ?? '', '.config', 'release-hub', 'cli.json');
  try {
    const session = JSON.parse(readFileSync(sessionPath, 'utf8')) as { hub?: string; token?: string };
    if (session.hub !== ADMIN_HUB) {
      return fail('HUB_MISMATCH', `Saved SDK session is for ${session.hub}, deleting on ${ADMIN_HUB}.`);
    }
    if (!session.token) return fail('NO_SESSION', 'SDK session has no token — run `release-hub login`.');
    return ok(session.token);
  } catch {
    return fail('NO_SESSION', 'No SDK session at ~/.config/release-hub/cli.json and no RELEASE_HUB_API_KEY.');
  }
}

async function main(): Promise<number> {
  const keyPath = arg('key') ?? DEFAULT_KEY;
  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
  if (!password) {
    console.error(`
  ✖ Bloqueado: la clave canónica ${keyPath} es minisign encrypted (scrypt) y no
    hay TAURI_SIGNING_PRIVATE_KEY_PASSWORD en env. Playbook (waxin, bw unlock):
      bw get item "haido sign passphrase" --raw   # field PASSPHRASE
      export TAURI_SIGNING_PRIVATE_KEY_PASSWORD='<valor>'   # NUNCA por argv
      bun run scripts/smoke-trust-probe.ts
  (La passphrase por env vacío NO vale — la key tiene passphrase real.)`);
    return 1;
  }

  const workDir = mkdtempSync(join(tmpdir(), 'trust-probe-'));
  try {
    // 1. Artifact dummy — bytes aleatorios, nunca un binario real.
    const artifactPath = join(workDir, 'trust-chain-probe.tar.gz');
    writeFileSync(artifactPath, randomBytes(4096));
    const artifactBytes = readFileSync(artifactPath);
    const sha256 = createHash('sha256').update(artifactBytes).digest('hex');
    console.log(`[1/6] dummy artifact: ${artifactPath} (sha256=${sha256})`);

    // 2. Firma con la clave canónica — ruta env-wrapped (build-release.ts:424-450):
    //    tauri-cli espera TAURI_SIGNING_PRIVATE_KEY = base64 del texto minisign.
    const wrappedKey = readFileSync(keyPath).toString('base64');
    const tauriSigPath = join(workDir, 'probe.tar.gz.sig');
    const proc = Bun.spawn(['cargo', 'tauri', 'signer', 'sign', artifactPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, TAURI_SIGNING_PRIVATE_KEY: wrappedKey },
    });
    const exitCode = await proc.exited;
    const stderrText = await new Response(proc.stderr).text();
    if (exitCode !== 0) {
      console.error(`  ✖ cargo tauri signer sign rc=${exitCode}: ${stderrText.trim()}`);
      return 1;
    }
    // tauri escribe base64(sig_text) — decode a flat minisign (sign.ts:245-251).
    const flatSig = Buffer.from(readFileSync(tauriSigPath, 'utf8').trim(), 'base64').toString('utf8');
    if (!flatSig.startsWith('untrusted comment:') || !flatSig.includes('\n')) {
      console.error('  ✖ cargo tauri signer sign produjo un .sig inesperado.');
      return 1;
    }
    // Verificación local SIEMPRE — la firma no se publica sin verify positivo.
    const pubText = readFileSync(`${keyPath}.pub`, 'utf8');
    if (!verifyMinisign(artifactBytes, flatSig, pubText)) {
      console.error('  ✖ verifyMinisign local FAILED contra la pub canónica — nada se publica.');
      return 1;
    }
    const flatSigPath = join(workDir, 'probe.sig');
    writeFileSync(flatSigPath, flatSig);
    console.log('[2/6] firma minisign flat ok (verify local POSITIVO contra la pub canónica)');

    // 3. Publish vía SDK — el hub verifica server-side con la kind=binary RWTSIzay.
    const now = new Date();
    const version = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}-probe-${process.pid}`;
    const pub = await publishComponent({
      project: PROJECT,
      version,
      target: TARGET,
      arch: ARCH,
      artifact: artifactPath,
      sig: flatSigPath,
      component: COMPONENT,
      hub: ADMIN_HUB,
    });
    if (isErr(pub)) {
      console.error(`  ✖ publishComponent: ${pub.error.message}`);
      return 1;
    }
    console.log(`[3/6] publicado: ${PROJECT}/${COMPONENT} ${version}`);

    // 4. Assert GET latest 200 + sha256 match.
    const latest = await fetch(`${TENANT_URL}/api/components/${COMPONENT}/latest?target=${TARGET}&arch=${ARCH}`);
    if (latest.status !== 200) {
      console.error(`  ✖ GET latest rc=${latest.status}: ${await latest.text()}`);
      return 1;
    }
    const latestJson = (await latest.json()) as { version?: string; sha256?: string };
    if (latestJson.sha256 !== sha256 || latestJson.version !== version) {
      console.error(`  ✖ sha256/version mismatch: local=${sha256} hub=${latestJson.sha256} (v ${latestJson.version})`);
      return 1;
    }
    console.log(`[4/6] GET latest 200: sha256 match + version match (${latestJson.version})`);

    // 5. DELETE del componente (desechable).
    const bearer = resolveBearer();
    if (isErr(bearer)) {
      console.error(`  ✖ DELETE auth: ${bearer.error.message}`);
      return 1;
    }
    const del = await fetch(`${ADMIN_HUB}/api/admin/projects/${PROJECT}/components/${COMPONENT}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${bearer.value}` },
    });
    if (del.status !== 204) {
      console.error(`  ✖ DELETE rc=${del.status}: ${await del.text()}`);
      return 1;
    }
    console.log('[5/6] componente eliminado (204)');

    // 6. Assert 404 final.
    const gone = await fetch(`${TENANT_URL}/api/components/${COMPONENT}/latest?target=${TARGET}&arch=${ARCH}`);
    if (gone.status !== 404) {
      console.error(`  ✖ GET latest tras delete rc=${gone.status} (esperado 404)`);
      return 1;
    }
    console.log('[6/6] GET latest tras delete: 404');

    console.log(`\n  ✅ SMOKE TRUST-CHAIN-PROBE OK — cadena completa: firma (key canónica) → publish → verify → delete.`);
    return 0;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((e: unknown) => {
      console.error('Unhandled error:', e);
      process.exit(1);
    });
}
