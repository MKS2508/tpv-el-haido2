/**
 * Hub falso para probar el canal OTA parcial de punta a punta sin publicar nada.
 *
 * Implementa el trozo del contrato que consume el cliente
 * (`GET /api/bundles/latest` y `/api/bundles/:id/download`), leyendo un bundle ya
 * empaquetado por `build-bundle.ts`. Sirve para validar el ciclo entero
 * — consulta, descarga, verificación, staging y activación — contra el binario
 * real, antes de que el release-hub esté disponible.
 *
 * Uso:
 *   bun run scripts/ota-fake-hub.ts --bundle releases/bundles/<id> [--port 8787]
 *   # y arrancar la app con TPV_OTA_HUB=http://127.0.0.1:8787
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const value = i === -1 ? fallback : process.argv[i + 1];
  if (!value) {
    console.error(`Falta --${name}`);
    process.exit(1);
  }
  return value;
}

const bundleDir = resolve(arg('bundle'));
const port = Number.parseInt(arg('port', '8787'), 10);

const manifestPath = join(bundleDir, 'manifest.json');
const zipPath = join(bundleDir, 'bundle.zip');
for (const p of [manifestPath, zipPath]) {
  if (!existsSync(p)) {
    console.error(`No existe ${p}. Empaqueta antes con build-bundle.ts pack`);
    process.exit(1);
  }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const zip = readFileSync(zipPath);

// El cliente carga desde un esquema propio, así que cualquier petición suya a
// este hub es cross-origin.
const CORS = { 'access-control-allow-origin': '*' };

const server = Bun.serve({
  port,
  hostname: '0.0.0.0',
  fetch(request) {
    const url = new URL(request.url);
    console.log(`  → ${request.method} ${url.pathname}${url.search}`);

    if (url.pathname === '/api/bundles/latest') {
      const nativeVersion = url.searchParams.get('nativeVersion');
      if (!nativeVersion) {
        return Response.json({ error: 'nativeVersion requerido' }, { status: 400, headers: CORS });
      }
      // El hub real compone la URL absoluta a partir del Host; aquí igual.
      const body = { ...manifest, url: `http://${url.host}/api/bundles/${manifest.bundleVersion}/download` };
      console.log(`    ↳ 200 manifest ${manifest.bundleVersion} para nativo ${nativeVersion}`);
      return Response.json(body, { headers: CORS });
    }

    if (url.pathname.startsWith('/api/bundles/') && url.pathname.endsWith('/download')) {
      console.log(`    ↳ 200 zip (${zip.length} bytes)`);
      return new Response(zip, { headers: { ...CORS, 'content-type': 'application/zip' } });
    }

    // Sonda: si esto se registra, la webview está sirviendo el bundle y no el
    // frontend embebido.
    if (url.pathname === '/__marker') {
      console.log('    ↳ ✅ MARKER: la webview está sirviendo el BUNDLE');
      return new Response('ok', { headers: CORS });
    }

    return new Response('not found', { status: 404, headers: CORS });
  },
});

console.log(`
  Hub falso escuchando en http://127.0.0.1:${server.port}
    bundle : ${manifest.bundleVersion}
    ventana: ${manifest.minNativeVersion} .. ${manifest.maxNativeVersion}

  Arranca la app con: TPV_OTA_HUB=http://127.0.0.1:${server.port}
`);
