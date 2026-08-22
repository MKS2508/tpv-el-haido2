//! Installer mode — IPC real (TR-19.B).
//!
//! Capa fina sobre los sub-módulos:
//!  - `release_hub::ReleaseHubClient` (HTTP streaming + SHA256 verify)
//!  - `install::install_*` (file ops + .desktop + icon + symlink)
//!  - `rollback::rollback` (inverse ops)
//!  - `desktop_entry::format_desktop_entry` (template puro, testeable)
//!
//! Cada `#[tauri::command]` con `name = "installer:..."` mantiene estable el
//! contrato con `src/installer/contracts.ts` (LOCKED por TR-19.A).

// En tests, `lib.rs::run_installer_mode()` está bajo `#[cfg(not(test))]`
// para evitar que `tauri::generate_context!()` se emita dos veces y choque
// el linker con `_EMBED_INFO_PLIST`. Eso hace que `#[tauri::command]`
// functions de este módulo aparezcan como `dead_code` durante
// `cargo test --lib` aunque se compilen en binarios reales — silencio
// esos warnings.
#![cfg_attr(test, allow(dead_code))]

mod desktop_entry;
mod install;
mod release_hub;
mod rollback;
mod types;

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter};

use crate::installer::release_hub::DEFAULT_HUB;
use crate::installer::types::{
    InstallOptionsRust, InstallResultRust, ProgressEvent, RollbackState, APP_ID,
    PROGRESS_EVENT,
};

/// `installer:download` — descarga el AppImage firmado y verifica SHA256.
///
/// Devuelve el path al archivo en `/tmp` para que `installer:install`
/// posterior lo consuma. Si el checksum no coincide o el HTTP falla,
/// devuelve `Err(String)` con mensaje legible.
#[tauri::command(name = "installer:download")]
pub async fn download(
    app: AppHandle,
    url: String,
    checksum_sha256: String,
) -> Result<DownloadOutcome, String> {
    let client = release_hub::ReleaseHubClient::new(DEFAULT_HUB, None);
    let temp_path = release_hub::incoming_temp_path();

    let bytes = client
        .download_to(&app, &url, &checksum_sha256, &temp_path)
        .await?;

    Ok(DownloadOutcome {
        path: temp_path.to_string_lossy().into_owned(),
        bytes,
    })
}

#[derive(Debug, serde::Serialize)]
pub struct DownloadOutcome {
    pub path: String,
    pub bytes: u64,
}

/// `installer:install` — copia al destino + .desktop + icono + symlink PATH.
///
/// `options` viene del wizard como `InstallOptions` (TS). El shape exacto
/// está en `src/installer/contracts.ts` — el frontend serializa y este
/// comando deserializa a `InstallOptionsRust`.
///
/// Si falla en cualquier punto que no sea el download, intenta un rollback
/// parcial automático: borra lo que haya escrito hasta el momento. El
/// frontend también puede invocar `installer:rollback` explícitamente.
#[tauri::command(name = "installer:install")]
pub async fn install(
    app: AppHandle,
    options: InstallOptionsRust,
) -> Result<InstallResultRust, String> {
    // Tilde expansion en dirs XDG. Lo hacemos una vez al principio para no
    // divergir entre operaciones (home del usuario, sin races con chdir).
    let install_dir = shellexpand::tilde("~/.local/bin").into_owned();
    let apps_dir = shellexpand::tilde("~/.local/share/applications").into_owned();
    let icons_dir = shellexpand::tilde(&format!("~/.local/share/icons/{}", install::ICON_SIZE_DIR))
        .into_owned();

    // El "downloaded_path" en contracts.ts es el path al /tmp; lo reinterpretamos
    // como fuente para install. En MVP siempre apunta al `incoming_temp_path()`.
    let source = PathBuf::from(&options.download_url);

    emit_phase(&app, "extracting");
    if !source.exists() {
        emit_phase(&app, "error");
        return Ok(InstallResultRust::fail(
            "SOURCE_NOT_FOUND",
            format!("no existe el artifact descargado en {}", source.display()),
            true,
        ));
    }

    // 1. Copiar AppImage al destino final (con staging+rename atómico).
    let appimage_dest =
        match install::install_appimage(&source, Path::new(&install_dir)) {
            Ok(p) => p,
            Err(e) => {
                emit_phase(&app, "error");
                return Ok(InstallResultRust::fail(
                    "APPIMAGE_COPY_FAILED",
                    format!("copy AppImage: {e}"),
                    true,
                ));
            }
        };

    // 2. Extraer icono. Si falla, devolvemos el path igual como None — el
    //    .desktop apuntará a un icono genérico por nombre.
    emit_phase(&app, "extracting");
    let icon_dest = if options.install_icon {
        install::extract_icon(&appimage_dest, Path::new(&icons_dir)).ok()
    } else {
        None
    };

    // 3. Registrar .desktop — esto es el primer punto donde un fallo sí
    //    justifica rollback del AppImage (porque ya está copiado y chmod'd).
    emit_phase(&app, "registering");
    let desktop_path = if options.create_desktop_entry {
        let icon_for_desktop = icon_dest
            .clone()
            .unwrap_or_else(|| PathBuf::from(APP_ID));
        match install::install_desktop_entry(
            &appimage_dest,
            &icon_for_desktop,
            Path::new(&apps_dir),
        ) {
            Ok(p) => Some(p),
            Err(e) => {
                // Rollback best-effort antes de devolver error.
                let _ = rollback::rollback(&RollbackState {
                    appimage_path: Some(appimage_dest.to_string_lossy().into_owned()),
                    desktop_entry_path: None,
                    icon_path: icon_dest
                        .as_ref()
                        .map(|p| p.to_string_lossy().into_owned()),
                })
                .await;
                emit_phase(&app, "error");
                return Ok(InstallResultRust::fail(
                    "DESKTOP_ENTRY_FAILED",
                    format!("create .desktop: {e}"),
                    true,
                ));
            }
        }
    } else {
        None
    };

    // 4. Symlink PATH (best-effort — si falla, el usuario puede ejecutar el
    //    .AppImage directamente por su path).
    let path_link = if options.add_to_path {
        install::install_path_symlink(&appimage_dest, Path::new(&install_dir)).ok()
    } else {
        None
    };

    emit_phase(&app, "complete");

    // El comando a lanzar al usuario: preferimos el symlink limpio si existe
    // (lo más probable), si no el path completo del AppImage.
    let launch_command = path_link
        .as_ref()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| appimage_dest.to_string_lossy().into_owned());

    // Consumimos `desktop_path` indirectamente a través del path link — el
    // .desktop se escribió, pero no forma parte del InstallResult. Track:
    // TR-19.C necesita el path del .desktop para rollback desde la UI, lo
    // recibe como respuesta del frontend (`installer:rollback` + state).
    let _ = desktop_path;

    Ok(InstallResultRust::ok(
        appimage_dest.to_string_lossy().into_owned(),
        launch_command,
    ))
}

/// `installer:rollback` body — `{ state: RollbackState }` envuelto para que
/// Tauri pueda deserializar el JSON anidado que envía el frontend.
#[derive(Debug, serde::Deserialize)]
pub struct RollbackRequest {
    pub state: RollbackState,
}

/// `installer:rollback` — deshace según el state que el frontend rellena
/// durante el install (TR-19.C lo construye al ir avanzando steps).
///
/// Idempotente: si se llama dos veces, no rompe. Si los paths no existen,
/// también es OK (es exactamente el estado objetivo del rollback).
#[tauri::command(name = "installer:rollback")]
pub async fn rollback(req: RollbackRequest) -> Result<(), String> {
    rollback::rollback(&req.state).await
}

/// `installer:uninstall` — limpia por convención XDG.
///
/// Acepta el path al AppImage; borra .desktop + icono + AppImage + symlink
/// siguiendo las rutas por defecto (`~/.local/share/...`). Si el usuario
/// movió los archivos, este comando no los encuentra y devuelve Ok igual.
#[tauri::command(name = "installer:uninstall")]
pub async fn uninstall(install_path: String) -> Result<(), String> {
    rollback::uninstall(&install_path).await
}

/// Helper interno: emite un evento de progreso con sólo el campo `phase`.
/// Mantiene el contrato simple para los callers que sólo quieren avisar de
/// "ya entré en esta fase" sin percent ni bytes.
fn emit_phase(app: &AppHandle, phase: &str) {
    let evt = ProgressEvent {
        phase: phase.to_string(),
        percent: if phase == "complete" { 100 } else { 0 },
        bytes_downloaded: None,
        bytes_total: None,
        message: None,
    };
    if let Err(e) = app.emit(PROGRESS_EVENT, evt) {
        eprintln!("[installer] emit phase '{phase}' failed (non-fatal): {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn result_ok_includes_final_path_and_launch() {
        let r = InstallResultRust::ok(
            "/home/user/.local/bin/tpv-el-haido.AppImage".into(),
            "/home/user/.local/bin/tpv-el-haido".into(),
        );
        assert!(r.success);
        assert_eq!(
            r.final_path.as_deref(),
            Some("/home/user/.local/bin/tpv-el-haido.AppImage")
        );
        assert_eq!(
            r.launch_command.as_deref(),
            Some("/home/user/.local/bin/tpv-el-haido")
        );
        assert!(r.error.is_none());
    }

    #[test]
    fn result_fail_has_error_and_no_paths() {
        let r = InstallResultRust::fail("E_FAIL", "boom", true);
        assert!(!r.success);
        assert!(r.final_path.is_none());
        assert!(r.launch_command.is_none());
        let err = r.error.expect("error must be set on fail");
        assert_eq!(err.code, "E_FAIL");
        assert!(err.recoverable);
    }
}
