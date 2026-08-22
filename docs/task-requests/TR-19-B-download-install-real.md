---
type: task-request
id: TR-19.B
title: download-install-real — IPC handlers Rust + desktop-release-hub client
status: open
priority: medium
zone: client
ts: 2026-08-22
parent: TR-19
parentMilestone: track/wizard-linux-build
blockedBy: [TR-19.A.3]
effort: large
lockedBy: r7-tpv-sidecar-installer-2026-08-22
acceptance:
  - `installer:download` implementado: GET signed artifact desde
    `https://haido.releases.mks2508.systems/api/releases/haido/latest/linux-x64`
    con bearer token (PKCE cached o `guest`), stream con progress events,
    SHA256 verify contra header `x-checksum-sha256`
  - `installer:install` implementado: copy AppImage a `~/.local/bin/tpv-el-haido`,
    chmod +x, extract icon (--appimage-extract), crear .desktop en
    `~/.local/share/applications/`, ejecutar `update-desktop-database`
  - `installer:rollback` implementado: deshace lo hecho en orden inverso
    (delete .desktop, delete icon, delete AppImage)
  - `installer:uninstall` (separado, scope reducido): idem rollback + cleanup
  - Progress streaming via Tauri event emitter → frontend `installer:onProgress`
  - Frontend `src/installer/ipc/handlers.ts` reemplaza stubs por imports de
    `@tauri-apps/api/core::invoke`
  - Frontend `src/installer/services/{release-hub,install}.ts` quedan como
    wrappers tipados sobre invoke
  - Tests Rust: unit tests para SHA256 verify, path expansion (~ expansion),
    chmod logic, .desktop template generation
  - bun run typecheck + bun run lint + cargo check + bun run build EXIT 0
  - Smoke test E2E: descargar último release real → install → ejecutar →
    ./tpv-el-haido.AppImage abre POS (no installer mode)
outOfScope:
  - Wizard UI multi-step (eso es TR-19.C — paralelizable)
  - Modificar `scripts/install-linux.sh` (TR-19.D)
  - Build distribución / code signing (TR-19.D)
  - First-launch wizard post-install (track separado)
---

# TR-19.B — download-install-real

## Contexto

TR-19.A.2 wired los IPC stubs en `lib.rs` y TR-19.A.3 registró los capabilities. Falta implementar la lógica real: descargar el signed artifact desde desktop-release-hub, verificar SHA256, instalar (copy + chmod + .desktop + icon), y rollback.

Este TR es lane **paralelizable con TR-19.C** (wizard UI). B y C pueden ejecutarse en worktrees disjuntas sin pisarse — C consume los contratos de A (`contracts.ts`) y los handlers reales de B (via `invoke()` Tauri).

## Arquitectura

```
┌─────────────────┐    invoke('installer:download', {url, checksum})    ┌─────────────────────┐
│ Frontend        │ ─────────────────────────────────────────────────► │ Rust: installer_stub│
│ (C consume)     │                                                     │   ::download()       │
│                 │ ◄───────────────────────────────────────────────── │   ↓                  │
│                 │    emit('installer:progress', {percent, phase})    │ release-hub-client   │
│                 │ ◄───────────────────────────────────────────────── │   → bytes streaming  │
│                 │                                                     │   → SHA256 verify    │
│                 │                                                     │   → save to ~/.tmp/  │
└─────────────────┘                                                     └─────────────────────┘
```

## Plan (compact)

### Paso 1 — Crear `src-tauri/src/installer/`

```
src-tauri/src/installer/
├── mod.rs
├── download.rs       # signed download + SHA256 verify
├── install.rs        # file ops: copy + chmod + .desktop
├── rollback.rs       # inverse ops
├── release_hub.rs    # HTTP client to desktop-release-hub
└── desktop_entry.rs  # .desktop template generator
```

### Paso 2 — `release_hub.rs` — HTTP client

```rust
use reqwest::Client;
use tauri::AppHandle;
use tauri::Emitter;
use futures_util::StreamExt;
use sha2::{Sha256, Digest};
use std::path::PathBuf;
use tokio::io::AsyncWriteExt;

pub struct ReleaseHubClient {
    base_url: String,  // "https://haido.releases.mks2508.systems"
    token: Option<String>,  // PKCE cached or None for guest
    app: AppHandle,
}

impl ReleaseHubClient {
    pub async fn download_artifact(
        &self,
        slug: &str,         // "haido"
        target: &str,       // "linux-x64"
        checksum_sha256: &str,
        dest_path: &PathBuf,
    ) -> Result<u64, String> {
        let url = format!("{}/api/releases/{slug}/latest/{target}", self.base_url);
        let client = Client::new();
        let mut req = client.get(&url);
        if let Some(token) = &self.token {
            req = req.bearer_auth(token);
        }

        let response = req.send().await.map_err(|e| e.to_string())?;
        let total = response.content_length().unwrap_or(0);
        let mut stream = response.bytes_stream();
        let mut file = tokio::fs::File::create(dest_path).await.map_err(|e| e.to_string())?;
        let mut hasher = Sha256::new();
        let mut downloaded: u64 = 0;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| e.to_string())?;
            file.write_all(&chunk).await.map_err(|e| e.to_string())?;
            hasher.update(&chunk);
            downloaded += chunk.len() as u64;

            // Emit progress
            self.app.emit("installer:progress", ProgressEvent {
                phase: "downloading".into(),
                percent: if total > 0 { (downloaded * 100 / total) as u32 } else { 0 },
                bytes_downloaded: downloaded,
                bytes_total: total,
            }).map_err(|e| e.to_string())?;
        }

        // Verify SHA256
        let hash = format!("{:x}", hasher.finalize());
        if hash != checksum_sha256 {
            return Err(format!("SHA256 mismatch: expected {checksum_sha256}, got {hash}"));
        }

        Ok(downloaded)
    }
}
```

### Paso 3 — `install.rs` — file operations

```rust
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;
use tauri::Emitter;

const APPIMAGE_NAME: &str = "tpv-el-haido.AppImage";

pub fn install_appimage(
    source: &Path,        // downloaded .AppImage
    install_dir: &Path,   // ~/.local/bin
) -> Result<PathBuf, String> {
    let dest = install_dir.join(APPIMAGE_NAME);

    // 1. Create install dir if not exists
    std::fs::create_dir_all(install_dir).map_err(|e| e.to_string())?;

    // 2. Copy AppImage
    std::fs::copy(source, &dest).map_err(|e| e.to_string())?;

    // 3. chmod +x
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&dest).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&dest, perms).map_err(|e| e.to_string())?;
    }

    Ok(dest)
}

pub fn install_desktop_entry(
    app_path: &Path,
    icon_path: &Path,
    apps_dir: &Path,    // ~/.local/share/applications
) -> Result<PathBuf, String> {
    std::fs::create_dir_all(apps_dir).map_err(|e| e.to_string())?;

    let desktop_content = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name=TPV El Haido\n\
         Exec={}\n\
         Icon={}\n\
         Terminal=false\n\
         Categories=Office;\n\
         Comment=Point of Sale system\n",
        app_path.display(),
        icon_path.display()
    );

    let dest = apps_dir.join("tpv-el-haido.desktop");
    std::fs::write(&dest, desktop_content).map_err(|e| e.to_string())?;

    // update-desktop-database (best effort)
    let _ = Command::new("update-desktop-database")
        .arg(apps_dir)
        .output();

    Ok(dest)
}

pub fn extract_icon(appimage_path: &Path, icons_dir: &Path) -> Result<PathBuf, String> {
    // Run AppImage --appimage-extract to extract, then copy .DirIcon
    std::fs::create_dir_all(icons_dir).map_err(|e| e.to_string())?;
    let extract_dir = std::env::temp_dir().join("tpv-el-haido-extract");
    let _ = std::fs::remove_dir_all(&extract_dir);

    let output = Command::new(appimage_path)
        .arg("--appimage-extract")
        .env("APPIMAGE_EXTRACT_DIR", &extract_dir)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("appimage-extract failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let icon_source = extract_dir.join(".DirIcon");
    if !icon_source.exists() {
        return Err("AppImage does not contain .DirIcon".into());
    }

    let icon_dest = icons_dir.join("tpv-el-haido.png");
    std::fs::copy(&icon_source, &icon_dest).map_err(|e| e.to_string())?;

    Ok(icon_dest)
}
```

### Paso 4 — `mod.rs` — wire commands

```rust
mod download;
mod install;
mod rollback;
mod release_hub;
mod desktop_entry;

use tauri::{AppHandle, State};
use crate::installer_stub::ProgressEvent;

#[tauri::command]
pub async fn download(
    app: AppHandle,
    url: String,
    checksum_sha256: String,
) -> Result<String, String> {
    // url es "https://haido.releases.mks2508.systems/api/releases/haido/latest/linux-x64"
    // Parse slug + target del path
    let client = release_hub::ReleaseHubClient::new(
        "https://haido.releases.mks2508.systems".into(),
        None,  // TODO(TR-19.B.2): bearer token from PKCE cache
        app.clone(),
    );

    let temp_path = std::env::temp_dir().join("tpv-el-haido-incoming.AppImage");
    let bytes = client.download_artifact("haido", "linux-x64", &checksum_sha256, &temp_path).await?;
    Ok(temp_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn install(options: serde_json::Value) -> Result<String, String> {
    // options: InstallOptions del contract — deserializar
    let opts: InstallOptionsRust = serde_json::from_value(options).map_err(|e| e.to_string())?;

    let install_dir = shellexpand::tilde("~/.local/bin").into_owned();
    let apps_dir = shellexpand::tilde("~/.local/share/applications").into_owned();
    let icons_dir = shellexpand::tilde("~/.local/share/icons/hicolor/256x256/apps").into_owned();

    let source = std::path::PathBuf::from(opts.downloaded_path);

    let app_dest = install::install_appimage(&source, std::path::Path::new(&install_dir))?;
    let icon_dest = install::extract_icon(&app_dest, std::path::Path::new(&icons_dir))?;

    if opts.create_desktop_entry {
        install::install_desktop_entry(
            &app_dest,
            &icon_dest,
            std::path::Path::new(&apps_dir),
        )?;
    }

    Ok(app_dest.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn rollback(state: serde_json::Value) -> Result<(), String> {
    rollback::rollback(&state).await
}

#[tauri::command]
pub async fn uninstall(install_path: String) -> Result<(), String> {
    rollback::uninstall(&install_path).await
}
```

### Paso 5 — Reemplazar `installer_stub` en `lib.rs` con `mod installer`

Cambiar:
```rust
.invoke_handler(tauri::generate_handler![
    installer_stub::download,
    ...
])
```
a:
```rust
.invoke_handler(tauri::generate_handler![
    installer::download,
    installer::install,
    installer::rollback,
    installer::uninstall,
])
```

### Paso 6 — Frontend wrappers (reemplazar stubs)

`src/installer/ipc/handlers.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { InstallOptions, InstallProgress, InstallResult } from '../contracts'

export async function downloadArtifact(options: { url: string; checksumSha256: string }): Promise<{ path: string; bytes: number }> {
  const path = await invoke<string>('installer:download', options)
  return { path, bytes: 0 }  // bytes reportable via progress events
}

export async function installApp(options: InstallOptions): Promise<InstallResult> {
  const finalPath = await invoke<string>('installer:install', { options })
  return { success: true, finalPath, launchCommand: '~/.local/bin/tpv-el-haido' }
}

export async function rollback(state: Partial<InstallResult>): Promise<void> {
  await invoke('installer:rollback', { state })
}

export async function uninstall(installPath: string): Promise<void> {
  await invoke('installer:uninstall', { installPath })
}

export type ProgressCallback = (progress: InstallProgress) => void
export function onProgress(callback: ProgressCallback): Promise<UnlistenFn> {
  return listen<InstallProgress>('installer:progress', (event) => callback(event.payload))
}
```

### Paso 7 — Unit tests Rust

```rust
// src-tauri/src/installer/install.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_desktop_entry_template() {
        let entry = format_desktop_entry(
            Path::new("/home/user/.local/bin/tpv-el-haido.AppImage"),
            Path::new("/home/user/.local/share/icons/tpv-el-haido.png"),
        );
        assert!(entry.contains("Exec=/home/user/.local/bin/tpv-el-haido.AppImage"));
        assert!(entry.contains("Icon=/home/user/.local/share/icons/tpv-el-haido.png"));
        assert!(entry.contains("Name=TPV El Haido"));
    }

    #[test]
    fn test_expand_tilde() {
        let expanded = shellexpand::tilde("~/.local/bin").into_owned();
        assert!(expanded.ends_with(".local/bin"));
        assert!(!expanded.starts_with("~"));
    }
}
```

### Paso 8 — Verificación

```bash
bun run typecheck      # EXIT 0
bun run lint           # 0 nuevos errores
bun run build          # EXIT 0
cd src-tauri && cargo test    # EXIT 0 (unit tests)
cargo check --bin tpv-el-haido  # EXIT 0
bunx tauri build --no-bundle   # EXIT 0

# Smoke test E2E (opcional, requiere network + release publicado):
./src-tauri/target/release/tpv-el-haido --install
# → Welcome step aparece. Click "Siguiente" → DownloadStep (de TR-19.C) consume este handler
# → download real desde desktop-release-hub → install → .desktop creado → POS abre
```

## Reglas duras

- **NO tocar** `src-tauri/src/lib.rs::run()` (POS entrypoint, intacto)
- **NO tocar** `src-tauri/src/main.rs` (entrypoint dispatch, intacto desde A.2)
- **NO tocar** `src/installer/InstallerApp.tsx` ni steps (eso es C)
- **NO commitear** debug logs (usa `log::info!`/`log::warn!` con `tracing` o `log` crate)
- **Worktree isolation OBLIGATORIO** — `isolation: "worktree"` en Agent
- **REPORTE A FICHERO**: `/tmp/tr19b-download-install-real-<ts>.md`

## Skills on-demand

- `guidelines`, `axon-artifacts`

## Output esperado

Reporte en `/tmp/tr19b-download-install-real-<ts>.md` + resumen 3-5 bullets.