//! Types compartidos entre los sub-módulos del installer.
//!
//! El contrato surface TS vive en `src/installer/contracts.ts` (LOCKED por
//! TR-19.A). Este módulo espeja lo mínimo que necesitamos serializar entre
//! Rust e IPC, sin acoplarse a la UI.

// Los `dead_code` de este módulo son falsos positivos en `cargo test --lib`:
// el invoke_handler del installer mode vive bajo `#[cfg(not(test))]` (ver
// `lib.rs::run_installer_mode` — Tauri 2 genera un static por
// `generate_context!` y enlazar run() + installer a la vez en tests choca).
// En builds normales, todos los items se usan via el IPC router.
#![cfg_attr(test, allow(dead_code))]

use serde::{Deserialize, Serialize};

/// Nombre canónico del binario instalado. Coincide con el bash wrapper
/// `scripts/install-linux.sh` para mantener consistencia con installs legacy.
#[allow(dead_code)] // en tests, el invoke_handler del installer mode no compila
pub const APP_ID: &str = "tpv-el-haido";

/// Versión semver del paquete, leída de `tauri.conf.json` en el setup de
/// `run_installer_mode()`. Default al package version del Cargo.toml si no
/// hay `BundleManifest` activo.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallOptionsRust {
    /// Path destino del AppImage (e.g., `~/.local/bin/tpv-el-haido.AppImage`).
    pub install_path: String,
    /// Crear entrada .desktop en `~/.local/share/applications/`.
    pub create_desktop_entry: bool,
    /// Extraer icono y dejarlo en `~/.local/share/icons/...`.
    pub install_icon: bool,
    /// URL firmada del artifact en desktop-release-hub.
    pub download_url: String,
    /// SHA256 esperado para verificación post-download.
    pub checksum_sha256: String,
    /// `true` → symlink en `~/.local/bin` para que aparezca en `$PATH`.
    pub add_to_path: bool,
}

/// Path del .desktop final. Sólo se computa si la instalación llegó hasta
/// `registering`; el rollback la consume para deshacer.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RollbackState {
    pub appimage_path: Option<String>,
    pub desktop_entry_path: Option<String>,
    pub icon_path: Option<String>,
}

/// Resultado de `installer:install`. Refleja `InstallResult` en contracts.ts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResultRust {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub final_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub launch_command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<InstallError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallError {
    pub code: String,
    pub message: String,
    pub recoverable: bool,
}

impl InstallResultRust {
    pub fn ok(final_path: String, launch_command: String) -> Self {
        Self {
            success: true,
            final_path: Some(final_path),
            launch_command: Some(launch_command),
            error: None,
        }
    }

    pub fn fail(code: &str, message: impl Into<String>, recoverable: bool) -> Self {
        Self {
            success: false,
            final_path: None,
            launch_command: None,
            error: Some(InstallError {
                code: code.to_string(),
                message: message.into(),
                recoverable,
            }),
        }
    }
}

/// Payload emitido en cada chunk durante el download/install.
///
/// El frontend subscribe via `listen<InstallProgress>('installer:progress')`
/// — los nombres de campo coinciden con `InstallProgress` en contracts.ts
/// excepto `step`, que el emisor Rust no conoce (lo rellena el frontend).
#[derive(Debug, Clone, Serialize)]
pub struct ProgressEvent {
    pub phase: String,
    pub percent: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes_downloaded: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes_total: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Nombre del evento para `app.emit(...)`. Lo lee el frontend en `handlers.ts`.
pub const PROGRESS_EVENT: &str = "installer:progress";
