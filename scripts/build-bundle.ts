/**
 * Empaquetador y firmador de bundles JS para el canal OTA parcial.
 *
 * Un bundle es el `dist/` del frontend comprimido, con un manifest firmado que el
 * cliente verifica antes de descomprimirlo. La clave privada NO sale de la máquina
 * de build: el hub sólo recibe el zip, la firma y los metadatos.
 *
 * Uso:
 *   bun run scripts/build-bundle.ts keygen
 *   bun run scripts/build-bundle.ts pack --min 0.1.0 --max 0.1.0 [--build] [--dist dist]
 *
 * Contrato del manifest: docs/ota/canal-parcial.md
 */

import { createHash, generateKeyPairSync, sign as ed25519Sign } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Privada: gitignored por la regla `*.key`. */
const PRIVATE_KEY_PATH = join(PROJECT_ROOT, 'tauri-keys', 'ota-bundle.key');
/** Pública: versionada y embebida en el binario con include_str!. */
const PUBLIC_KEY_PATH = join(PROJECT_ROOT, 'src-tauri', 'ota-bundle-pubkey.txt');
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
 * Genera el par ed25519.
 *
 * La pública se guarda como los 32 bytes crudos en base64, que es lo que espera
 * `ed25519_dalek::VerifyingKey::from_bytes` — no el envoltorio SPKI/PEM, que
 * lleva cabecera y no cabe en 32 bytes.
 */
function keygen(): void {
  if (existsSync(PRIVATE_KEY_PATH) && !flag('force')) {
    fail(
      `Ya existe ${PRIVATE_KEY_PATH}.\n` +
        '    Regenerar la clave invalida TODOS los bundles publicados y exige\n' +
        '    recompilar el binario con la pública nueva. Si es lo que quieres: --force',
    );
  }

  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const rawPublic = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);

  mkdirSync(dirname(PRIVATE_KEY_PATH), { recursive: true });
  writeFileSync(PRIVATE_KEY_PATH, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  chmodSync(PRIVATE_KEY_PATH, 0o600);

  const publicB64 = rawPublic.toString('base64');
  writeFileSync(PUBLIC_KEY_PATH, `${publicB64}\n`);

  console.log(`
  Par de claves del canal OTA generado.

    privada : ${PRIVATE_KEY_PATH}  (600, gitignored — NO la subas a ningún sitio)
    pública : ${PUBLIC_KEY_PATH}   (versionada, se embebe en el binario)

  Pública (base64), para cargarla en projects.bundle_pubkey del release-hub:

    ${publicB64}

  El binario tiene que recompilarse para incorporarla.
`);
}

/** Siguiente identificador del día: YYYY.MM.DD-N. */
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

  const distDir = resolve(PROJECT_ROOT, arg('dist') ?? 'dist');

  if (flag('build')) {
    // Sin PWA_BUILD: el bundle se sirve desde la raíz del esquema, no desde /tpv/.
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
  const signature = ed25519Sign(null, zipBytes, readFileSync(PRIVATE_KEY_PATH, 'utf-8')).toString('base64');

  const manifest = {
    bundleVersion,
    hash,
    // La url definitiva la compone el hub a partir de su Host; aquí queda la ruta
    // relativa para que el manifest sea legible y comprobable en local.
    url: `/api/bundles/${bundleVersion}/download`,
    minNativeVersion: min,
    maxNativeVersion: max,
    signature,
    releasedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const pubkey = existsSync(PUBLIC_KEY_PATH) ? readFileSync(PUBLIC_KEY_PATH, 'utf-8').trim() : '(sin pública)';
  console.log(`
  Bundle ${bundleVersion} listo.

    zip      : ${zipPath}  (${(zipBytes.length / 1024 / 1024).toFixed(2)} MB)
    manifest : ${join(outDir, 'manifest.json')}
    ventana  : ${min} .. ${max}
    pública  : ${pubkey}

  Subida al hub (multipart): bundleVersion, minNativeVersion, maxNativeVersion,
  signature y el fichero en el campo \`bundle\`. El hash lo recalcula el hub.
`);
}

const command = process.argv[2];
if (command === 'keygen') keygen();
else if (command === 'pack') pack();
else {
  console.log(`
  Empaquetador de bundles OTA

    bun run scripts/build-bundle.ts keygen [--force]
    bun run scripts/build-bundle.ts pack --min <semver> --max <semver|rango> [--build] [--dist <dir>] [--version <id>]
`);
  process.exit(command ? 1 : 0);
}
