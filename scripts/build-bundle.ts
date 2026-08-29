#!/usr/bin/env bun
/**
 * Empaquetador y firmador de bundles JS para el canal OTA parcial.
 *
 * Un bundle es el `dist/` del frontend comprimido, con un manifest firmado que el
 * cliente verifica antes de descomprimirlo. La clave privada NO sale de la máquina
 * de build: el hub sólo recibe el zip, la firma y los metadatos.
 *
 * A partir de D10-D (ADR-0045) la firma es **minisign** (mismo formato que
 * `tauri signer sign`), no ed25519 raw: el hub verifica con su propia clave
 * kind=binary del proyecto (admin/components.ts:175) y el cliente con la misma
 * pública embebida en `ota-bundle-pubkey.txt`. Antes de D10-D era ed25519 con
 * dual-verify; ese canal murió con la migración a components.
 *
 * Uso:
 *   bun run scripts/build-bundle.ts keygen [--force]
 *   bun run scripts/build-bundle.ts pack --min 0.1.3 --max 0.1.3 [--build] [--dist dist] [--component haido-frontend]
 *
 * Contrato del manifest: docs/ota/canal-parcial.md
 *
 * ## Sobre minisign sin password
 *
 * `-W` deja la clave sin passphrase. El workflow CI la trae de un secret y la
 * borra al terminar; localmente `tauri-keys/` está gitignored. Si quieres
 * passphrase, ejecuta `minisign -G` sin `-W` y adáptalo aquí.
 */

import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Privada: gitignored por la regla `*.key`. */
const PRIVATE_KEY_PATH = join(PROJECT_ROOT, 'tauri-keys', 'ota-bundle.key');
/** Pública minisign: contiene el box con la keynum + payload. Gitignored por convención (la fuente de verdad embebida es PUBLIC_KEY_PAYLOAD_PATH). */
const PUBLIC_KEY_BOX_PATH = join(PROJECT_ROOT, 'tauri-keys', 'ota-bundle.pub');
/**
 * Pública embebida en el binario con `include_str!`: **solo la línea 2 del box
 * minisign** (la payload base64 con keynum + ed25519). Lo que `mks_ota::verify`
 * llama `PublicKey::from_base64`.
 */
const PUBLIC_KEY_PAYLOAD_PATH = join(PROJECT_ROOT, 'src-tauri', 'ota-bundle-pubkey.txt');
const OUTPUT_ROOT = join(PROJECT_ROOT, 'releases', 'bundles');

function fail(message: string): never {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/**
 * Lee la payload base64 (línea 2) de un box minisign `.pub`.
 *
 * El formato minisign `.pub` es:
 *   línea 1: `untrusted comment: minisign public key <KEYNUM_HEX>`
 *   línea 2: `<base64>`  ← lo que `PublicKey::from_base64` espera
 *
 * Devuelve `null` si el archivo no es un box minisign bien formado.
 */
function readMinisignPubkeyPayload(boxPath: string): string | null {
  if (!existsSync(boxPath)) return null;
  const text = readFileSync(boxPath, 'utf-8');
  const lines = text.split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  if (!lines[0]!.startsWith('untrusted comment: minisign public key')) return null;
  return lines[1]!.trim();
}

/**
 * Genera el par minisign.
 *
 * `minisign -G -p <pub> -s <sec> -W` deja la clave sin passphrase. La pública se
 * guarda como box minisign (línea 1 = untrusted comment + keynum, línea 2 =
 * payload base64); extraemos la payload y la escribimos sola a `ota-bundle-pubkey.txt`,
 * que es lo que se embebe en el binario.
 *
 * Regenerar la clave invalida TODOS los bundles publicados y exige recompilar el
 * binario con la pública nueva. Si es lo que quieres: --force.
 */
function keygen(): void {
  if (
    (existsSync(PRIVATE_KEY_PATH) || existsSync(PUBLIC_KEY_BOX_PATH)) &&
    !flag('force')
  ) {
    fail(
      `Ya existe clave OTA (${PRIVATE_KEY_PATH} / ${PUBLIC_KEY_BOX_PATH}).\n` +
        '    Regenerar invalida TODOS los bundles publicados y exige\n' +
        '    recompilar el binario con la pública nueva. Si es lo que quieres: --force',
    );
  }

  mkdirSync(dirname(PRIVATE_KEY_PATH), { recursive: true });
  const proc = Bun.spawnSync(
    ['minisign', '-G', '-p', PUBLIC_KEY_BOX_PATH, '-s', PRIVATE_KEY_PATH, '-W'],
    { cwd: PROJECT_ROOT, stdout: 'inherit', stderr: 'inherit' },
  );
  if (proc.exitCode !== 0) {
    fail(`minisign -G salió con código ${proc.exitCode}`);
  }
  // Permisos restrictivos en la privada (minisign ya lo hace; re-asegurar).
  chmodSync(PRIVATE_KEY_PATH, 0o600);

  const payload = readMinisignPubkeyPayload(PUBLIC_KEY_BOX_PATH);
  if (!payload) {
    fail(`${PUBLIC_KEY_BOX_PATH} no es un box minisign válido — ¿versión incompatible?`);
  }
  writeFileSync(PUBLIC_KEY_PAYLOAD_PATH, `${payload}\n`);

  // Extraer keynum de la línea 1 del box (informativo, sale en logs y
  // eventualmente en el campo `kid` del manifest si lo necesitamos).
  const boxText = readFileSync(PUBLIC_KEY_BOX_PATH, 'utf-8');
  const keynumMatch = boxText.match(/minisign public key ([0-9A-F]+)/);
  const keynum = keynumMatch?.[1] ?? '???';

  console.log(`
  Par de claves minisign del canal OTA generado.

    privada (minisign, sin passphrase) : ${PRIVATE_KEY_PATH}  (600, gitignored)
    pública  (box minisign)            : ${PUBLIC_KEY_BOX_PATH}  (gitignored — la fuente de verdad embebida va aparte)
    pública embebida (payload base64)  : ${PUBLIC_KEY_PAYLOAD_PATH}  (versionada, include_str! en ota/mod.rs)

  keynum (8 bytes hex, sale en la línea 1 del box):
    ${keynum}

  payload (base64), lo que mks_ota::verify::parse_pubkey consume:
    ${payload}

  El binario tiene que recompilarse para incorporar la pública nueva, y la
  misma pública hay que subirla al release-hub como clave kind=binary del
  proyecto (o re-generarla allí para que coincida con la privada local).
`);
}

/** Siguiente identificador del día: YYYY.MM.DD-N. Válido semver strict (la
 * `semver.valid()` del hub lo acepta: major.minor.patch + prerelease). */
function nextBundleVersion(): string {
  const now = new Date();
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('.');

  const existing = existsSync(OUTPUT_ROOT) ? readdirSync(OUTPUT_ROOT) : [];
  const used = existing
    .filter((name) => name.startsWith(`${day}-`))
    .map((name) => Number.parseInt(name.slice(day.length + 1), 10))
    .filter((n) => Number.isFinite(n));

  return `${day}-${used.length ? Math.max(...used) + 1 : 1}`;
}

function run(cmd: string[], cwd: string): void {
  const proc = Bun.spawnSync(cmd, { cwd, stdout: 'inherit', stderr: 'inherit' });
  if (proc.exitCode !== 0) fail(`Falló: ${cmd.join(' ')}`);
}

/**
 * Empaqueta + firma + escribe manifest.
 *
 * Después de D10-D: target=any, arch=any (L3, plataforma-agnóstico); el
 * `component` flag controla el nombre del componente en el canal `components`.
 * Default = "haido-frontend".
 */
function pack(): void {
  const min = arg('min');
  const max = arg('max');
  if (!min || !max) {
    fail('Hacen falta --min y --max (versión del binario nativo compatible).');
  }
  if (!existsSync(PRIVATE_KEY_PATH)) {
    fail(`No hay clave privada en ${PRIVATE_KEY_PATH}. Ejecuta primero: keygen`);
  }
  if (!Bun.which('zip')) {
    fail('Hace falta el comando `zip` (pacman -S zip / apt install zip).');
  }
  if (!Bun.which('minisign')) {
    fail('Hace falta el binario `minisign` (brew install minisign / apt install minisign).');
  }

  const component = arg('component') ?? 'haido-frontend';
  const target = arg('target') ?? 'any';
  const arch = arg('arch') ?? 'any';
  if (component === '' || target === '' || arch === '') {
    fail('--component / --target / --arch no pueden ser vacíos.');
  }

  const distDir = resolve(PROJECT_ROOT, arg('dist') ?? 'dist');

  if (flag('build')) {
    console.log('  Construyendo el frontend...');
    run(['bunx', 'vite', 'build'], PROJECT_ROOT);
  }

  if (!existsSync(join(distDir, 'index.html'))) {
    fail(`${distDir} no tiene index.html. Construye el frontend o pasa --dist.`);
  }

  const bundleVersion = arg('version') ?? nextBundleVersion();
  const outDir = join(OUTPUT_ROOT, bundleVersion);
  mkdirSync(outDir, { recursive: true });
  const zipPath = join(outDir, 'bundle.zip');

  // -X evita atributos extra del sistema de ficheros; -r recursivo; el zip se crea
  // desde dentro de dist para que index.html quede en la raíz del archivo, que es
  // donde el cliente lo busca.
  run(['zip', '-q', '-r', '-X', zipPath, '.'], distDir);

  const zipBytes = readFileSync(zipPath);
  const hash = `sha256:${createHash('sha256').update(zipBytes).digest('hex')}`;

  // minisign deja `bundle.zip.minisig` al lado del zip con el formato box de
  // 4 líneas que `mks_ota::verify::decode_signature` y la `verifyMinisign` del
  // hub aceptan tal cual.
  const sigPath = `${zipPath}.minisig`;
  const sigProc = Bun.spawnSync(
    ['minisign', '-S', '-s', PRIVATE_KEY_PATH, '-m', zipPath, '-W'],
    { cwd: PROJECT_ROOT, stdout: 'inherit', stderr: 'inherit' },
  );
  if (sigProc.exitCode !== 0) {
    fail(`minisign -S salió con código ${sigProc.exitCode}`);
  }
  const signature = readFileSync(sigPath, 'utf-8');

  const manifest = {
    bundleVersion,
    hash,
    component,
    target,
    arch,
    url: `/api/components/${component}/download/${bundleVersion}/${target}/${arch}/bundle.zip`,
    minNativeVersion: min,
    maxNativeVersion: max,
    signature,
    releasedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const pubkeyPayload = existsSync(PUBLIC_KEY_PAYLOAD_PATH)
    ? readFileSync(PUBLIC_KEY_PAYLOAD_PATH, 'utf-8').trim()
    : '(sin pública)';
  console.log(`
  Bundle ${bundleVersion} listo.

    zip      : ${zipPath}  (${(zipBytes.length / 1024 / 1024).toFixed(2)} MB)
    sig      : ${sigPath}  (minisign .sig text, embedded in manifest.signature)
    manifest : ${join(outDir, 'manifest.json')}
    component: ${component}
    ventana  : ${min} .. ${max}
    pública  : ${pubkeyPayload}

  Subida al hub (multipart a POST /api/admin/projects/{slug}/components):
    component=haido-frontend, target=any, arch=any, version, sig (.sig text), artifact (zip).
  El hub verifica la firma con la kind=binary del proyecto antes de escribir nada.
`);
}

const command = process.argv[2];
if (command === 'keygen') keygen();
else if (command === 'pack') pack();
else {
  console.log(`
  Empaquetador de bundles OTA (minisign, D10-D+)

    bun run scripts/build-bundle.ts keygen [--force]
    bun run scripts/build-bundle.ts pack --min <semver> --max <semver|rango> [--build] [--dist <dir>] [--version <id>] [--component <name>]

  Defaults: --component haido-frontend --target any --arch any (L3, plataforma-agnóstico).
`);
  process.exit(command ? 1 : 0);
}
