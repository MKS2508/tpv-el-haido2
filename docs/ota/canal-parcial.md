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
4. **rollback** — si se agotan los arranques sin confirmar, vuelta a `previous`;
   si no hay, al frontend embebido.

### Tres invariantes que no son opcionales

- **Verificar antes de tocar disco.** Un bundle que no valida no llega a
  descomprimirse.
- **Contar arranques, no segundos.** Un temporizador no cubre que el bundle tumbe
  el proceso; el contador de arranques sí.
- **Un cambio de binario nativo invalida el slot.** Tras actualizar el binario, el
  frontend embebido es más nuevo que cualquier slot. `minNativeVersion` no cubre
  este sentido porque el bundle ya estaba instalado.

## Estado actual

Hecho y con tests (36 en `cargo test --lib ota`):

- Esquema propio con fallback al embebido, mapa de MIME y guardia de traversal.
- Manifest: firma ed25519, sha256 y ventana de compatibilidad.
- stage / activate / rollback / prune.
- Watchdog por contador de arranques + comando `ota_app_ready`.

Verificado sobre el webview real de producción (WebKitGTK 2.52.6, NVIDIA,
COSMIC/Wayland): la app carga entera por el esquema (15 peticiones),
`isSecureContext=true`, `crypto.subtle` disponible, módulos ES correctos,
`localStorage` operativo y la aceleración por GPU intacta (173 MiB).

Pendiente:

- **`scripts/build-bundle.ts`** — empaquetar `dist/` (base `/`, no la de PWA),
  calcular hash, firmar con ed25519 y emitir el manifest, más un generador de
  claves. Sin esto no se puede publicar nada por el canal.
- **Poller** — `GET /api/bundles/latest?nativeVersion=&deviceId=` cada 5 min y
  descarga. El WebSocket es optimización, no mecanismo: el polling es el camino.
  Depende de que aterricen los endpoints del hub.
- **Guardas de operación abierta** — no activar con ticket abierto, caja abierta
  o impresión en curso. `stage` puede correr siempre; `activate` sólo en hueco.
- **Ventana horaria y pinning por dispositivo** — el pinning es sobre todo del
  hub; aquí sólo hay que mandar el `deviceId` (reutilizar
  `get_machine_fingerprint`).

Nota para quien pruebe: `cargo build --release` a secas produce un build que
Tauri considera **dev** (`dev = !feature("custom-protocol")`), y entonces la
ventana apunta al dev server en vez de al esquema. Para probar el canal hace
falta `cargo build --release --features tauri/custom-protocol`, que es lo que
activa `tauri build`.
