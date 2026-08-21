# Canal OTA parcial (bundles JS) — lado Tauri

Dos canales independientes de actualización. Este documento cubre el **cliente**;
la parte del servidor vive en `desktop-release-hub`
(`docs/handoffs/ota-bundles-js-hub-side.md`).

## Matriz de decisión de canal

| Cambio | Canal | Reinicio |
|---|---|---|
| CSS, layout, textos | JS parcial | No, reload |
| Lógica de UI, componentes Solid | JS parcial | No, reload |
| Adaptador de impresora (vive en TS) | JS parcial | No, reload |
| Nuevo comando Rust | Nativo | Sí |
| Cambio de firma de un comando existente | Nativo (+ bundle JS acoplado) | Sí |
| Dependencia nativa, sidecar | Nativo | Sí |

El canal nativo (`tauri-plugin-updater` contra el release-hub) **no se toca**.
Distinto artefacto, distinta clave, distinta cadencia.

En Linux, producción se queda en **AppImage**: es el único formato que el updater
nativo sabe auto-actualizar en Arch/CachyOS (deb y rpm requieren gestor de
paquetes que ahí no aplica).

## Contrato del manifest

Copiado aquí a propósito: el cliente no debe construirse leyendo un documento que
vive en otro repo. Si cambia, cambia en los dos sitios.

```jsonc
{
  "bundleVersion": "2026.08.21-3",   // id del bundle, NO el semver de la app
  "hash": "sha256:...",              // del .zip
  "url": "https://haido.releases.mks2508.systems/api/bundles/<id>/download",
  "minNativeVersion": "1.4.0",       // inclusive
  "maxNativeVersion": "1.5.x",       // inclusive, admite comodín de patch
  "signature": "...",                // ed25519 (base64) sobre los bytes del .zip
  "releasedAt": "2026-08-21T10:00:00Z"
}
```

`"1.5.x"` no es semver válido: el cliente lo normaliza a `1.5.*` antes de
parsear (`manifest::parse_bound`). La clave ed25519 es **distinta** de la minisign
del updater nativo.

## Cómo está montado

```
tpvapp://localhost/...            <- la ventana carga SIEMPRE de aquí
  └─ ota::protocol::handle
       ├─ slot activo en {appData}/bundles/<id>/   (si lo hay)
       └─ frontend embebido en el binario          (red de seguridad)
```

**El origin no cambia nunca.** Alternar entre `tauri://` y el esquema según
hubiera bundle tiraría `localStorage` (onboarding, tema, modo de almacenamiento)
en cada swap. Quién sirve qué se decide dentro del handler.

### Estado en disco — `{appData}/bundles/state.json`

| Campo | Para qué |
|---|---|
| `active` | Slot que se sirve. `None` = frontend embebido |
| `previous` | Slot al que revertir |
| `staged` | Descargado y verificado, pendiente de activar |
| `verified` | `false` hasta que el frontend confirme `app-ready` |
| `boot_attempts` | Arranques consumidos sin confirmar |
| `native_version_at_swap` | Binario con el que se activó |

Fichero de estado y no symlink: en Windows los symlinks exigen privilegios.

### Ciclo de vida

1. **stage** — verifica compatibilidad, luego hash, luego firma, y sólo entonces
   descomprime a `.staging-<id>` y renombra. Verificar va **antes** de
   descomprimir: descomprimir ya es ejecutar la decisión de confiar.
2. **activate** — sólo mueve punteros, instantáneo. Marca `verified = false`.
3. **app-ready** — el frontend confirma tras un doble `requestAnimationFrame`.
4. **rollback** — por dos vías complementarias: un temporizador de 90 s tras aplicar en
   caliente (el reload no reinicia el proceso, así que ahí nadie consume un arranque) y un
   contador de arranques sin confirmar (que sí cubre que el bundle tumbe el proceso). Se
   vuelve a `previous`; si no hay, al frontend embebido.

### Tres invariantes que no son opcionales

- **Verificar antes de tocar disco.** Un bundle que no valida no llega a
  descomprimirse.
- **Contar arranques Y contar segundos.** Un temporizador no cubre que el bundle
  tumbe el proceso; un contador de arranques no cubre la aplicación en caliente,
  donde no hay reinicio que contar. Hacen falta los dos.
- **Un cambio de binario nativo invalida el slot.** Tras actualizar el binario, el
  frontend embebido es más nuevo que cualquier slot. `minNativeVersion` no cubre
  este sentido porque el bundle ya estaba instalado.

## Estado actual

**Ciclo completo ejercitado en el hardware de producción** (`supermicro-pcbar`,
WebKitGTK 2.52.6, NVIDIA, COSMIC/Wayland), por la ruta real y sin instrumentación, contra
`scripts/ota-fake-hub.ts` con un bundle de 16 MB firmado por `build-bundle.ts`:

```
GET /api/bundles/latest?nativeVersion=0.1.0&deviceId=4fd659…
GET /api/bundles/2026.08.21-2/download        16 760 543 bytes
  → sha256 + ed25519 verificados, descomprimido, preparado
  → el frontend aplica solo al cumplirse la guarda (sin pedido, 60 s sin actividad)
  → la webview pasa a servir el BUNDLE
  → state.json: verified = true   (app-ready por la ruta real, invoke incluido)
```

Y la red de seguridad, en tres arranques seguidos sin confirmar `app-ready`:

```
arranque 1 → Pending { attempt: 1 }
arranque 2 → Pending { attempt: 2 }
arranque 3 → RolledBack → active=null → vuelve al frontend embebido
```

Antes de esto, el mismo esquema quedó verificado sirviendo la app entera:
15 peticiones, `isSecureContext=true`, `crypto.subtle` disponible, módulos ES correctos,
`localStorage` operativo y la aceleración por GPU intacta (173 MiB).

Hecho y con tests (43 en `cargo test --lib ota`, incluidos tres de contrato cruzado contra
la salida real de `build-bundle.ts`):

- Esquema propio con fallback al embebido, mapa de MIME y guardia de traversal.
- Manifest: firma ed25519, sha256 y ventana de compatibilidad.
- stage / activate / rollback / prune.
- Watchdog por contador de arranques + comando `ota_app_ready`.
- Empaquetador y firmador (`build-bundle.ts keygen` / `pack`).
- Poller cada 5 min + activación en hueco de caja.

Pendiente:

- **Integración con el hub real** — funciona contra el hub falso; el real tiene un bug de
  ventana de versiones pendiente (ver el handoff en `desktop-release-hub`,
  `docs/handoffs/ota-bundles-js-hub-side.md`, sección 2.1).
- **Ventana horaria de aplicación** — hoy la guarda es "sin pedido en pantalla y un minuto
  sin actividad"; falta poder restringirlo además a fuera del horario de apertura.
- **Reporte de aplicación/rollback al hub** — el cliente ya revierte solo, pero desde el hub
  un rollback es hoy indistinguible de que nunca se aplicó.
- **Guarda de impresión en curso** — no se añadió para no tocar `thermal-printer.service.ts`
  mientras otra sesión lo estaba migrando.

Nota para quien pruebe: `cargo build --release` a secas produce un build que Tauri considera
**dev** (`dev = !feature("custom-protocol")`), y entonces la ventana apunta al dev server en vez
de al esquema. Hace falta `cargo build --release --features tauri/custom-protocol`, que es lo que
activa `tauri build`. La app lo avisa por stderr al arrancar.

Para probar el canal entero en local:

```bash
bun run scripts/build-bundle.ts keygen                       # una vez
bun run scripts/build-bundle.ts pack --build --min 0.1.0 --max 0.1.0
bun run scripts/ota-fake-hub.ts --bundle releases/bundles/<id>
TPV_OTA_HUB=http://127.0.0.1:8787 ./target/release/tpv-el-haido
```
