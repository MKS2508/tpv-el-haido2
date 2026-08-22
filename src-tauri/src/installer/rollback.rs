//! Rollback / uninstall — deshace las operaciones de `install.rs`.
//!
//! Estrategia: idempotente y tolerante. Si un path ya no existe (porque el
//! usuario lo borró manualmente, porque el install falló antes de crearlo,
//! porque estamos re-ejecutando rollback tras un rollback parcial), no es
//! un error — es exactamente el estado al que queríamos llegar.
//!
//! El `state` que recibe `rollback()` viene del frontend (TR-19.C lo
//! rellena con lo que `installer:install` haya escrito al ir progresando).

use std::path::Path;

use crate::installer::install;
use crate::installer::types::{APP_ID, RollbackState};

/// Borra los artefactos que `installer:install` haya producido, en orden
/// inverso. Cada borrado es best-effort: si el archivo no existe, sigue.
///
/// El sync entre `state` y el filesystem puede estar desfasado: el frontend
/// rellena `state` con paths "esperados", pero un install a medias puede
/// no haberlos creado. Por eso cada `remove_*` traga el NotFound.
pub async fn rollback(state: &RollbackState) -> Result<(), String> {
    if let Some(ref path) = state.desktop_entry_path {
        remove_file_quietly(Path::new(path));
    }
    if let Some(ref path) = state.icon_path {
        remove_file_quietly(Path::new(path));
    }
    if let Some(ref path) = state.appimage_path {
        remove_file_quietly(Path::new(path));
    }

    // Best-effort: si había un symlink en `~/.local/bin` con el mismo nombre
    // canónico, también lo quitamos. No forma parte del `state` porque se
    // deriva de install_path.
    if let Some(ref path) = state.appimage_path {
        if let Some(parent) = Path::new(path).parent() {
            let link = parent.join(APP_ID);
            if link != *Path::new(path) {
                remove_file_quietly(&link);
            }
        }
    }
    Ok(())
}

/// Uninstall completo — equivalente a rollback + quitar referencias
/// duplicadas que pudiese haber dejado el bash wrapper legacy
/// (`scripts/install-linux.sh`) en directorios XDG adicionales.
#[cfg_attr(test, allow(dead_code))]
pub async fn uninstall(appimage_path: &str) -> Result<(), String> {
    let state = RollbackState {
        appimage_path: Some(appimage_path.to_string()),
        // Asumimos convenciones XDG: el .desktop y el icono están donde los
        // puso install.rs. Si el usuario los movió, uninstall no los toca.
        desktop_entry_path: Some(
            shellexpand::tilde(&format!("~/.local/share/applications/{APP_ID}.desktop"))
                .into_owned(),
        ),
        icon_path: Some(
            shellexpand::tilde(&format!(
                "~/.local/share/icons/{}/{APP_ID}.png",
                install::ICON_SIZE_DIR
            ))
            .into_owned(),
        ),
    };
    rollback(&state).await
}

fn remove_file_quietly(path: &Path) {
    // Borrar un archivo ausente no es error aquí — es lo que queremos.
    // Sólo logueamos fallos inesperados (permisos, IO real).
    match std::fs::remove_file(path) {
        Ok(()) => {}
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => eprintln!("[installer] rollback remove {} failed: {e}", path.display()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rollback_idempotent_on_missing_paths() {
        // Rollback con paths que no existen debe devolver Ok sin panic.
        let state = RollbackState {
            appimage_path: Some("/nonexistent/path/a".to_string()),
            desktop_entry_path: Some("/nonexistent/path/b".to_string()),
            icon_path: Some("/nonexistent/path/c".to_string()),
        };
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(rollback(&state)).unwrap();
    }
}
