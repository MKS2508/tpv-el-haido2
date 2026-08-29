---
type: handoff
unit: lane-haido-full-update-phase-b-tpv
target_lane: tpv-cross-platform-full-update
status: queued (depends on lane-haido-full-update-phase-a-linux tag v0.3.0)
created: 2026-08-29
priority: P1 (consume mks-ota v0.3.0, ship full update end-to-end)
base: main (HEAD = defbdf3, pending Phase 0 push)
repo: MKS2508/tpv-el-haido2
executor: task-executor
orchestrator: axon-v2
---

# lane-haido-full-update-phase-b-tpv

Implementar full OTA update en `tpv-el-haido2` consumiendo `mks-ota` v0.3.0
(el que esta misma lane A acaba de taggear). Cubre 4 capas: cleanup
capabilities, refactor del módulo `src-tauri/src/ota/` shims, añadir Tauri
commands cross-platform, reconstruir UI, y disparar el primer publish del
binario al hub con `--component tpv-el-haido`.

## TL;DR

7 sub-tareas secuenciales dentro de esta lane:

1. **Cleanup capabilities** (`src-tauri/capabilities/default.json`): borrar
   `updater:default`, `updater:allow-check`,
   `updater:allow-download-and-install`, `process:allow-restart` — son
   orphan perms del plugin updater que matamos en commit `2523408`.

2. **Verificar shims `src-tauri/src/ota/`** (NO refactor): los 4 archivos
   (`apply.rs`, `slots.rs`, `watchdog.rs`, `manifest.rs`) son
   `pub use mks_ota::...::*;` — apuntan a módulos que SÍ existen en v0.2.0
   (commit 8df4138 ya los materializó). Lane A los mantiene intactos en
   v0.3.0. Solo verificar que compilan, no tocar.

3. **Pin mks-ota a v0.3.0** (cambiar `Cargo.toml:48` de `v0.2.0` →
   `v0.3.0`).

4. **Añadir Tauri commands cross-platform** (`src-tauri/src/lib.rs`):
   `check_full_update` + `download_and_install_update` con dispatch
   por `cfg!(target_os)` a `install::full::{macos,linux}`. Windows
   devuelve error. Constantes `TPV_HUB_LATEST_URL` (compile-time
   `target`/`arch`) y `TPV_OTA_PUBKEY` (hardcoded desde
   `tauri-keys/tpv-el-haido.key.pub`, key id `3BDF42C4B23623D2` —
   verificado tracked en repo, NO se rotó con wraith el 28-ago).

5. **Reconstruir UI** (4 archivos en `src/`):
   `useUpdater.ts` (~230 LOC), `UpdateChecker.tsx` (~232 LOC),
   `VersionInfo.tsx` (sección updates re-añadida), `App.tsx`
   (autoCheck).

6. **Re-wire PlatformService surface** (3 archivos):
   - `PlatformService.ts`: añadir interface methods + `UpdateCheckResult` type
   - `TauriPlatformService.ts`: invoke real (líneas 101-110 stubs → fuera)
   - `WebPlatformService.ts`: stubs `UNSUPPORTED_PLATFORM` con el
     nuevo shape `Promise<Result<…>>` (los stubs actuales líneas 117+132
     rompen typecheck contra el nuevo interface)

7. **Hub publish first-time** (3 workflows):
   `linux-x64-deploy.yml:94`, `linux-arm64-deploy.yml`,
   `windows-x64-deploy.yml` — añadir `--component tpv-el-haido` al
   flag de `scripts/release.ts publish`. El componente `tpv-el-haido`
   NO está registrado en el hub todavía (404 verificado); el primer
   publish real se dispara en el próximo tag del CI.

## Contexto — qué decidió waxin

- Waxin pidió "implementa el full y todo lo que falte de linux hazlo
  simétrico a mac" (2026-08-29).
- Cleanup previo (commit `2523408`): mató el canal `tauri-plugin-updater`
  de tpv por endpoint 404 desde M6 (28-ago). El canal `mks-ota` partial
  quedó intacto.
- Phase 0 de esta lane (commit `defbdf3`, sin push): arregla el pin
  `mks-ota v0.2.0` (estaba roto, `features = ["tauri"]` quitado y la
  versión no existía; ahora el pin es coherente con el material que
  8df4138 acaba de taggear).
- Lane A de esta lane (en paralelo, en `MKS2508/mks-ota`): implementa
  `install::full::linux`. Cuando tag v0.3.0 exista, Lane B arranca.
- Waxin lock 2026-08-26 (UI): "Reconstruir el patrón wraith al pie de
  la letra". Significa: misma estructura de componentes que tenía TPV
  antes del cleanup (UpdateChecker modal + useUpdater hook + sección en
  VersionInfo + autoCheck en App.tsx).

## Scope (qué hacer)

### Sub-tarea 1: Cleanup capabilities

`src-tauri/capabilities/default.json` — borrar las 4 líneas orphan:

```diff
   "permissions": [
     "core:default",
     "opener:default",
     "shell:default",
     "http:default",
-    "updater:default",
-    "updater:allow-check",
-    "updater:allow-download-and-install",
-    "process:allow-restart",
     "dialog:default"
   ]
```

Verificación post: `cargo check` debe pasar el build script (ya no aborta
en permission validation).

### Sub-tarea 2: Refactor `src-tauri/src/ota/` shims

Los 4 archivos `apply.rs`, `slots.rs`, `watchdog.rs`, `manifest.rs` son
shims `pub use mks_ota::...::*;`. La extracción a mks-ota v0.2.0 (commit
8df4138) materializó los módulos que apuntaban, así que los shims siguen
funcionando pero son código muerto.

**Decisión**: reemplazar el `pub use ... *;` por la **misma** `pub use`
pero declarando el path explícito (sin el wrapper `crate::ota::...`):

```rust
// src-tauri/src/ota/apply.rs (antes del refactor)
pub use mks_ota::install::partial::apply::*;

// src-tauri/src/ota/apply.rs (después del refactor)
// Sigue siendo un re-export — los call-sites históricos
// (`ota::apply::activate_staged`, `ota::apply::prune`, etc.) viven en
// `lib.rs` y `poller.rs`. No eliminamos el path `crate::ota::apply`
// para no tocar esos call-sites.
pub use mks_ota::install::partial::apply::*;
```

Espera — el shim YA está bien. El refactor no aporta valor real.

**Decisión revisada**: dejar los shims como están. Solo verificar que
compilan con v0.3.0 (los módulos siguen existiendo — Lane A no los toca).

OK, Sub-tarea 2 → **no hacer nada**, solo verificar.

### Sub-tarea 3: Bump pin mks-ota

`src-tauri/Cargo.toml:48`: cambiar `tag = "v0.2.0"` → `tag = "v0.3.0"`.

Actualizar el comentario para reflejar que v0.3.0 añade
`install::full::linux` (Lane A).

### Sub-tarea 4: Tauri commands cross-platform

En `src-tauri/src/lib.rs`, añadir al final del archivo (o donde estén los
otros commands como `get_sidecar_logs_cmd` wraith-style):

```rust
/// URL del hub para este componente. `target` y `arch` se computan en
/// compile-time — el hub shape es
/// `GET /api/components/{c}/latest?target={os}&arch={arch}` (ADR-0045
/// D8). Waxin lock 2026-08-29: TPV CI matrix = linux-x64 +
/// linux-arm64 + windows-x64; macOS queda en el shape para builds
/// locales pero no en CI.
const TPV_HUB_LATEST_URL: &str = concat!(
    "https://haido.releases.mks2508.systems/api/components/tpv-el-haido/latest?target=",
    // target_os compile-time
    if cfg!(target_os = "macos") { "darwin" }
    else if cfg!(target_os = "linux") { "linux" }
    else if cfg!(target_os = "windows") { "windows" }
    else { "any" },
    "&arch=",
    // arch compile-time
    if cfg!(target_arch = "x86_64") { "x86_64" }
    else if cfg!(target_arch = "aarch64") { "aarch64" }
    else { "any" },
);

/// Bare base64 minisign pubkey — segunda línea de
/// `tauri-keys/tpv-el-haido.key.pub` (key id `3BDF42C4B23623D2`).
/// Waxin lock 2026-08-28: TPV NO se rotó con wraith-linux ese día
/// (la rotation event solo afectó `wraith-*` y `mks-agentics`).
/// Hardcodeamos el BASE64-of-the-file, que es público (es la pubkey
/// tracked en `tauri-keys/tpv-el-haido.key.pub` desde `adfc5bf`).
///
/// Verificación cruzada pre-push:
///   $ cat tauri-keys/tpv-el-haido.key.pub
///   untrusted comment: minisign public key 3BDF42C4B23623D2
///   RWTSIzayxELfO5VU3bpUnjiycxqhvdT3C95KUqkXKhogRtLKwuXgLZgt
///
/// Si el CI secret `TAURI_SIGNING_PRIVATE_KEY` se rota, hay que
/// re-hardcodear esta constante — no es hot-swappable.
const TPV_OTA_PUBKEY: &str = "RWTSIzayxELfO5VU3bpUnjiycxqhvdT3C95KUqkXKhogRtLKwuXgLZgt";

#[tauri::command]
async fn check_full_update(app: AppHandle) -> Result<serde_json::Value, String> {
    // Replica exacta del patrón wraith-linux:770-791
    let current_version = app.package_info().version.to_string();
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("build http client: {e}"))?;
    let resp = http_client.get(TPV_HUB_LATEST_URL).send().await
        .map_err(|e| format!("hub fetch failed: {e}"))?;
    let http_status = resp.status().as_u16();
    if !resp.status().is_success() {
        return Ok(serde_json::json!({
            "httpStatus": http_status,
            "currentVersion": current_version,
            "updateAvailable": false,
            "remote": null,
        }));
    }
    let body: serde_json::Value = resp.json().await
        .map_err(|e| format!("bad response body: {e}"))?;
    let manifest: mks_ota::HubLatest = serde_json::from_value(body.clone())
        .map_err(|e| format!("bad manifest shape: {e}"))?;
    let update_available = manifest.is_newer_than(&current_version)
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "httpStatus": http_status,
        "currentVersion": current_version,
        "updateAvailable": update_available,
        "remote": body,
    }))
}

#[tauri::command]
async fn download_and_install_update(app: AppHandle) -> Result<(), String> {
    // Replica wraith-linux:799-877 con dispatch por target_os
    let current_version = app.package_info().version.to_string();
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("build http client: {e}"))?;
    let resp = http_client.get(TPV_HUB_LATEST_URL).send().await
        .map_err(|e| format!("hub fetch failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("hub returned HTTP {}", resp.status()));
    }
    let body: serde_json::Value = resp.json().await
        .map_err(|e| format!("bad response body: {e}"))?;
    let manifest: mks_ota::HubLatest = serde_json::from_value(body.clone())
        .map_err(|e| format!("bad manifest shape: {e}"))?;
    if !manifest.is_newer_than(&current_version).map_err(|e| e.to_string())? {
        return Err("already up to date — refusing to reinstall the same or an older version".to_string());
    }

    let url = manifest.url.clone();
    let expected_sha256 = manifest.sha256_hex().map(|s| s.to_string());
    let signature = manifest.signature.clone();
    let dest = std::env::temp_dir().join(format!("tpv-ota-{}.tar.gz", manifest.version));

    let _ = app.emit("ota-stage", "downloading");
    let app_progress = app.clone();
    let dest_for_download = dest.clone();
    let outcome = tauri::async_runtime::spawn_blocking(move || {
        mks_ota::download::download(&url, &dest_for_download, expected_sha256.as_deref(), |p| {
            let _ = app_progress.emit(
                "ota-download-progress",
                serde_json::json!({ "downloaded": p.downloaded, "total": p.total }),
            );
        })
    })
    .await
    .map_err(|e| format!("download task panicked: {e}"))?
    .map_err(|e| format!("download failed: {e}"))?;

    let cleanup_archive = || { let _ = std::fs::remove_file(&outcome.path); };

    let _ = app.emit("ota-stage", "verifying");
    let verify_path = outcome.path.clone();
    let verify_result = tauri::async_runtime::spawn_blocking(move || {
        mks_ota::verify::verify_stream_from_file(&verify_path, &signature, TPV_OTA_PUBKEY)
    })
    .await
    .map_err(|e| format!("verify task panicked: {e}"))?;
    if let Err(e) = verify_result {
        cleanup_archive();
        return Err(format!("signature verification failed: {e}"));
    }

    let _ = app.emit("ota-stage", "installing");
    let install_result = if cfg!(target_os = "macos") {
        // macOS path: install::full::macos (symmetric API)
        let app_bundle = mks_ota::install::full::macos::current_app_bundle()
            .map_err(|e| { cleanup_archive(); e.to_string() })?;
        let archive_path = outcome.path.clone();
        let install_bundle = app_bundle.clone();
        tauri::async_runtime::spawn_blocking(move || {
            mks_ota::install::full::macos::install(&archive_path, &install_bundle)
        })
        .await
        .map_err(|e| format!("install task panicked: {e}"))?
        .map_err(|e| format!("install failed: {e}"))?;
        let _ = app.emit("ota-stage", "relaunching");
        mks_ota::install::full::macos::relaunch(&app_bundle).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    } else if cfg!(target_os = "linux") {
        // Linux path: install::full::linux (Lane A deliverable)
        let app_bundle = mks_ota::install::full::linux::current_app_bundle()
            .map_err(|e| { cleanup_archive(); e.to_string() })?;
        let archive_path = outcome.path.clone();
        let install_bundle = app_bundle.clone();
        tauri::async_runtime::spawn_blocking(move || {
            mks_ota::install::full::linux::install(&archive_path, &install_bundle)
        })
        .await
        .map_err(|e| format!("install task panicked: {e}"))?
        .map_err(|e| format!("install failed: {e}"))?;
        let _ = app.emit("ota-stage", "relaunching");
        mks_ota::install::full::linux::relaunch(&install_bundle).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    } else {
        // Windows: full update NOT supported (no install::full::windows en mks-ota)
        cleanup_archive();
        return Err(format!(
            "full-package OTA install is not supported on this platform ({}); only macOS and Linux are wired (ADR-0046)",
            std::env::consts::OS,
        ));
    };
    if let Err(e) = install_result {
        cleanup_archive();
        return Err(e);
    }
    cleanup_archive();
    app.exit(0);
    Ok(())
}
```

Y en `tauri::Builder::default().invoke_handler(tauri::generate_handler![...])`
del mismo archivo, añadir `check_full_update` y `download_and_install_update`.

**CORS rationale** (mismo que wraith-linux:765-769): el webview no puede
fetch directo al hub externo, así que el Rust side hace el fetch.
`reqwest` ya está en `Cargo.toml:31`. NO añadir dependencia nueva.

### Sub-tarea 5: Reconstruir UI

4 archivos en `src/`:

#### `src/hooks/useUpdater.ts` (nuevo, ~230 LOC)

TPV usa **SolidJS** (`solid-js ^1.9.12`), NO React. Snippet con API Solid:

```ts
import { createSignal, onCleanup, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

type UpdaterState =
  | 'idle' | 'checking' | 'available'
  | 'downloading' | 'installing' | 'relaunching'
  | 'installed' | 'error';

export interface UseUpdater {
  state: () => UpdaterState;
  updateAvailable: () => boolean;
  remoteVersion: () => string | null;
  currentVersion: () => string | null;
  progress: () => { downloaded: number; total: number };
  error: () => string | null;
  handleCheck: () => Promise<void>;
  handleDownloadInstall: () => Promise<void>;
}

export function useUpdater(): UseUpdater {
  const [state, setState] = createSignal<UpdaterState>('idle');
  const [updateAvailable, setUpdateAvailable] = createSignal(false);
  const [remoteVersion, setRemoteVersion] = createSignal<string | null>(null);
  const [currentVersion, setCurrentVersion] = createSignal<string | null>(null);
  const [progress, setProgress] = createSignal({ downloaded: 0, total: 0 });
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    const unlistens: UnlistenFn[] = [];
    listen<string>('ota-stage', e => setState(e.payload as UpdaterState))
      .then(fn => unlistens.push(fn));
    listen<{ downloaded: number; total: number | null }>(
      'ota-download-progress',
      e => setProgress({ downloaded: e.payload.downloaded, total: e.payload.total ?? 0 }),
    ).then(fn => unlistens.push(fn));
    onCleanup(() => unlistens.forEach(fn => fn()));
  });

  const handleCheck = async () => {
    setState('checking'); setError(null);
    try {
      const result = await invoke<{
        httpStatus: number;
        currentVersion: string;
        updateAvailable: boolean;
        remoteVersion: string | null;
      }>('check_full_update');
      setCurrentVersion(result.currentVersion);
      setUpdateAvailable(result.updateAvailable);
      setRemoteVersion(result.remoteVersion);
      setState(result.updateAvailable ? 'available' : 'idle');
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDownloadInstall = async () => {
    setState('downloading'); setError(null);
    try {
      await invoke('download_and_install_update');
      setState('installed');
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return {
    state, updateAvailable, remoteVersion, currentVersion, progress, error,
    handleCheck, handleDownloadInstall,
  };
}
```

(Si TPV tiene un patrón específico de hooks Solid diferente, ajústalo
al estilo del repo. Mira `src/hooks/` si existe — otros hooks como
referencia.)

#### `src/components/UpdateChecker.tsx` (nuevo, ~232 LOC)

Modal que se auto-muestra cuando hay update disponible. Mira el archivo
pre-cleanup en git history: `git show 2523408^:src/components/UpdateChecker.tsx`
(o pre-2523408 commit) y reconstruye — usa `useUpdater` hook arriba.

#### `src/components/VersionInfo.tsx`

Re-añadir la sección "Estado de actualizaciones" que se borró en
`2523408`. Busca en git history:
```
git log --all --oneline -- src/components/VersionInfo.tsx | head
git show <commit-before-2523408>:src/components/VersionInfo.tsx | sed -n '136,273p'
```

#### `src/App.tsx`

Re-añadir `import UpdateChecker from '@/components/UpdateChecker';` y
`<UpdateChecker autoCheck />` en el layout (probablemente dentro del
router root o app shell). Busca el JSX que tenía antes con `git show
2523408^:src/App.tsx | grep -i "UpdateChecker"`.

### Sub-tarea 6: Re-wire PlatformService surface (3 archivos)

Hay **3 archivos** que tocar (interface + 2 impls: Tauri + Web).

#### 6a. `src/services/platform/PlatformService.ts`

Añadir al interface (después de `saveFileDialog`, antes de PLATFORM
DETECTION) y un nuevo type:

```ts
/** Shape del JSON devuelto por el Rust `check_full_update` command. */
export interface UpdateCheckResult {
  httpStatus: number;
  currentVersion: string;
  updateAvailable: boolean;
  remoteVersion: string | null;
}

// En el interface, después de saveFileDialog (línea 67):
// ================================
// OTA UPDATER (full channel via mks-ota)
// ================================
checkForUpdates(): Promise<Result<UpdateCheckResult, PlatformError>>;
downloadAndInstall(): Promise<Result<void, PlatformError>>;
```

#### 6b. `src/services/platform/TauriPlatformService.ts`

Reemplazar los stubs de líneas 101-110:

```ts
async checkForUpdates(): Promise<Result<UpdateCheckResult, PlatformError>> {
  return tryCatchAsync(
    () => invoke<UpdateCheckResult>('check_full_update'),
    'BACKEND_FAILED',
  );
}
async downloadAndInstall(): Promise<Result<void, PlatformError>> {
  return tryCatchAsync(
    async () => { await invoke('download_and_install_update'); },
    'BACKEND_FAILED',
  );
}
```

Import `UpdateCheckResult` desde `./PlatformService` (línea ~19).

#### 6c. `src/services/platform/WebPlatformService.ts`

El stub PWA también implementa PlatformService. Sus stubs actuales
(líneas 117, 132) tienen shape `Promise<void>` que NO encaja con el
nuevo interface. Sobreescribir:

```ts
async checkForUpdates(): Promise<Result<UpdateCheckResult, PlatformError>> {
  return err({
    code: 'UNSUPPORTED_PLATFORM',
    message: 'OTA updates are only available in the Tauri desktop app, not the PWA',
  });
}
async downloadAndInstall(): Promise<Result<void, PlatformError>> {
  return err({
    code: 'UNSUPPORTED_PLATFORM',
    message: 'OTA updates are only available in the Tauri desktop app, not the PWA',
  });
}
```

(`err` viene de `@mks2508/no-throw` — añadir al import.)

Verificación post: `bun run typecheck` debe pasar — interface coherente
entre las 2 impls.

### Sub-tarea 7: Hub publish first-time

3 workflows (`.github/workflows/`):

- `linux-x64-deploy.yml:94`: añadir `--component tpv-el-haido`
- `linux-arm64-deploy.yml`: mismo cambio en la línea equivalente de
  publish
- `windows-x64-deploy.yml`: mismo cambio

Pattern:
```diff
-   if bun run scripts/release.ts publish --skip-build --target linux-x64 --slug haido --notes "$NOTES_CONTENT"; then
+   if bun run scripts/release.ts publish --skip-build --target linux-x64 --slug haido --component tpv-el-haido --notes "$NOTES_CONTENT"; then
```

El flag `--component tpv-el-haido` hace que el publish vaya a
`POST /api/admin/projects/:slug/components` con form field `component=tpv-el-haido`
(en vez del principal sin component). Verificado en
`desktop-release-hub/packages/sdk/src/cli/publish.ts:28,36,88,110,121`.

**Primera publicación**: necesitas ejecutar el primer publish para que
el componente exista en el hub (actualmente 404). Esto se puede hacer:
- Localmente con un binario pre-construido + `bun run scripts/release.ts
  publish --api-key $RELEASE_HUB_API_KEY --skip-build --target linux-x64
  --slug haido --component tpv-el-haido`
- O disparando el workflow con un tag real. **Recomendado**: hacerlo
  desde CI tag para que el workflow también cree el tarball + firme + publique
  en una sola pasada.

**Scope**: el primer publish puede esperar al siguiente tag del CI. El
cambio del flag en el workflow es lo crítico; el primer publish real se
dispara en la próxima release. Si quieres forzar uno, despues de mergear
puedes tagear algo tipo `v0.2.13-test` y el CI construye + publica.

## NO TOCAR (out of scope)

- `src-tauri/src/ota/{apply,slots,watchdog,manifest}.rs` — son shims
  que funcionan con v0.2.0; v0.3.0 los mantiene intactos. NO refactorizar.
- `src-tauri/src/ota/protocol.rs`, `poller.rs` — el canal partial OTA,
  intacto
- `src-tauri/Cargo.toml` salvo pin mks-ota y (si hace falta) añadir
  `reqwest` si no está — pero YA está en línea 31 (`reqwest = { version =
  "0.11", features = ["json", "stream"] }`), no añadir duplicado
- `src-tauri/tauri.conf.json` — ya no tiene plugins.updater (cleanup
  previo). NO añadir nada.
- `desktop-release-hub` — solo el flag `--component tpv-el-haido` se
  añade en el workflow; el hub admin ya soporta el flow
- `wraith-linux` — intacto
- `mks-ota` — Lane A hace el trabajo; esta lane solo consume v0.3.0

## Verificación

```bash
# 1. Cargo check limpio
CARGO_NET_OFFLINE=true cargo check --manifest-path src-tauri/Cargo.toml
# Expected: 0 errors

# 2. Cargo test (los del ota/ parcial — sigue funcionando)
cd src-tauri && cargo test --lib
# Expected: tests del partial OTA pasan + 0 nuevos tests (Lane A los
# tiene en mks-ota)

# 3. Typecheck frontend
bun run typecheck
# Expected: 0 errors

# 4. Frontend build
bun run build
# Expected: 0 errors

# 5. Smoke local (sin firmar — verificar que el comando responde)
# Requiere TPV compilado localmente; CI lo hace por ti. Si lo haces
# local: cargo build --release, ejecutar binario, click en
# "Comprobar actualizaciones", verificar HTTP 200 del hub o 404
# (404 esperado hasta el primer publish).

# 6. Cero refs a plugin updater
grep -rn "tauri-plugin-updater\|tauri_plugin_updater\|@tauri-apps/plugin-updater\|@tauri-apps/plugin-process" . \
  --include="*.toml" --include="*.rs" --include="*.json" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=target --exclude-dir=dist
# Expected: 0 matches

# 7. Capabilities sane
grep -E "updater:|process:" src-tauri/capabilities/default.json
# Expected: 0 matches (limpieza sub-tarea 1)
```

## Report contract

Persiste tu reporte a `/tmp/lane-haido-full-update-phase-b-report.md`
ANTES de terminar. Schema axon-artifacts:

```yaml
---
type: report
unit: lane-haido-full-update-phase-b-tpv
status: completed | needs-iteration | blocked
verdict: closed | closed-with-deferred | needs-iteration
---

## Resumen
<1-3 líneas>

## Cambios (por sub-tarea)
- 1 (capabilities): <cambios>
- 2 (shims): <verificado sin cambios, OK>
- 3 (pin v0.3.0): <diff>
- 4 (Tauri commands): <LOC añadido>
- 5 (UI): <4 archivos>
- 6 (TauriPlatformService): <rewire>
- 7 (hub publish): <3 workflows>

## Verificación (con evidence)
- cargo check: <N errores>
- cargo test: <N pass>
- bun typecheck: <N errores>
- bun build: <status>
- grep tauri-plugin-updater: <0 matches>
- grep updater:|process: en capabilities: <0 matches>

## Trade-offs / Deferred
- (ej: Windows full update NO implementado, devuelve error)
- (ej: primer publish se hace en próximo tag del CI)

## Veredicto
<closed | needs-iteration> — <1 línea razón>
```

NO commitees ni pushees — orchestrator hace push tras verificar y obtener
OK explícito de waxin.

## STOP conditions

- Si `cargo check` con v0.3.0 falla por auth (mks-ota repo privado) →
  STOP, no hay push OK, reporta "blocked: needs mks-ota v0.3.0 tag visible"
- Si el formato de `PlatformService.checkForUpdates()` choca con la
  interface actual → minimo cambio a la interface (añadir tipo de
  retorno `UpdateCheckResult`), maximo cambio permitido
- Si `src-tauri/src/ota/*.rs` shims fallan al compilar con v0.3.0 →
  reportar regresión, NO refactorizar (eso lo decide el orchestrator)