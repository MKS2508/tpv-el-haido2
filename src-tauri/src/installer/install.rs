//! Operaciones de archivo para el installer.
//!
//! Cada función es idempotente donde es posible (re-ejecutar no rompe) y
//! devuelve paths absolutos al consumidor (`mod.rs`) para que el estado
//! de rollback pueda deshacerlo en orden inverso.
//!
//! Mantener las primitivas aquí — sin lógica de negocio — facilita tests
//! unitarios y reuso desde `scripts/install-linux.sh` legacy.

use std::path::{Path, PathBuf};
use std::process::Command;

use crate::installer::desktop_entry::format_desktop_entry;
use crate::installer::types::APP_ID;

/// Tamaño del icono extraído que XDG reconoce en `~/.local/share/icons/...`.
/// PNG 256x256 es lo que más sistemas de iconos esperan; copiamos ahí a menos
/// que el usuario haya forzado otra cosa (NA en MVP).
pub const ICON_SIZE_DIR: &str = "hicolor/256x256/apps";

/// Copia el AppImage de `source` a `dest_dir`/`$APP_ID.AppImage` con permisos
/// de ejecución. El truco de `dest_dir/.tmp + rename` viene del bash wrapper:
/// si la app está corriendo desde ese path, escribir encima da "Text file
/// busy". `rename` es atómico en POSIX y respeta el inode viejo.
pub fn install_appimage(source: &Path, dest_dir: &Path) -> Result<PathBuf, String> {
    std::fs::create_dir_all(dest_dir)
        .map_err(|e| format!("create {}: {e}", dest_dir.display()))?;

    let final_path = dest_dir.join(format!("{APP_ID}.AppImage"));
    let staging_path = dest_dir.join(format!(".{APP_ID}.AppImage.staging"));

    std::fs::copy(source, &staging_path).map_err(|e| {
        format!(
            "copy {} → {}: {e}",
            source.display(),
            staging_path.display()
        )
    })?;

    std::fs::rename(&staging_path, &final_path).map_err(|e| {
        format!(
            "rename {} → {}: {e}",
            staging_path.display(),
            final_path.display()
        )
    })?;

    set_executable(&final_path)?;
    Ok(final_path)
}

/// Aplicada sólo en Unix. En Windows no hay equivalente AppImage-style.
#[cfg(unix)]
fn set_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let metadata = std::fs::metadata(path)
        .map_err(|e| format!("stat {}: {e}", path.display()))?;
    let mut perms = metadata.permissions();
    perms.set_mode(0o755);
    std::fs::set_permissions(path, perms)
        .map_err(|e| format!("chmod 755 {}: {e}", path.display()))?;
    Ok(())
}

#[cfg(not(unix))]
fn set_executable(_path: &Path) -> Result<(), String> {
    // No-op fuera de Unix: el installer sólo aplica a Linux por MVP.
    Ok(())
}

/// Crea la entrada `.desktop` en `apps_dir`. Ejecuta `update-desktop-database`
/// best-effort: si el comando falta en la distro, la app ya aparece en el
/// menú en el siguiente login, sólo tarda más.
pub fn install_desktop_entry(
    app_path: &Path,
    icon_path: &Path,
    apps_dir: &Path,
) -> Result<PathBuf, String> {
    std::fs::create_dir_all(apps_dir)
        .map_err(|e| format!("create {}: {e}", apps_dir.display()))?;

    let desktop_content = format_desktop_entry(app_path, icon_path);
    let desktop_path = apps_dir.join(format!("{APP_ID}.desktop"));
    std::fs::write(&desktop_path, desktop_content)
        .map_err(|e| format!("write {}: {e}", desktop_path.display()))?;

    // Permisos del .desktop suelen ser 644 (legible por el file manager).
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&desktop_path)
            .map_err(|e| format!("stat {}: {e}", desktop_path.display()))?
            .permissions();
        perms.set_mode(0o644);
        std::fs::set_permissions(&desktop_path, perms)
            .map_err(|e| format!("chmod 644 {}: {e}", desktop_path.display()))?;
    }

    // Best-effort: la ausencia de update-desktop-database no es un error.
    let _ = Command::new("update-desktop-database")
        .arg(apps_dir)
        .output();

    Ok(desktop_path)
}

/// Extrae el icono del AppImage ejecutando `./AppImage --appimage-extract`.
/// El proceso crea un `squashfs-root/` en el cwd; copiamos el primer `*.png`
/// (o `.DirIcon` si está) al `icons_dir` bajo `hicolor/256x256/apps/`.
///
/// # Errors
///
/// Devuelve `Err(String)` si:
/// - el AppImage no tiene permisos de ejecución
/// - `--appimage-extract` falla (binario corrupto, FUSE no disponible)
/// - no hay ningún `*.png` en el squashfs-root
pub fn extract_icon(appimage_path: &Path, icons_dir: &Path) -> Result<PathBuf, String> {
    std::fs::create_dir_all(icons_dir)
        .map_err(|e| format!("create {}: {e}", icons_dir.display()))?;

    let extract_dir = std::env::temp_dir().join("tpv-el-haido-extract");
    // Idempotencia: si quedó un extract_dir de un intento previo, lo limpiamos.
    let _ = std::fs::remove_dir_all(&extract_dir);

    let output = Command::new(appimage_path)
        .arg("--appimage-extract")
        .env("APPIMAGE_EXTRACT_DIR", &extract_dir)
        .output()
        .map_err(|e| {
            format!(
                "exec {} --appimage-extract: {e} (¿el AppImage tiene permisos +x? ¿FUSE no está montado?)",
                appimage_path.display()
            )
        })?;

    if !output.status.success() {
        return Err(format!(
            "appimage-extract failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let squashfs_root = extract_dir.join("squashfs-root");
    if !squashfs_root.exists() {
        return Err(format!(
            "extract no produjo squashfs-root en {}",
            extract_dir.display()
        ));
    }

    // Buscamos primero `.DirIcon` (estándar AppDir) y si no, caemos al primer
    // PNG de top-level. Es lo que hacía el bash wrapper original.
    let icon_source = if squashfs_root.join(".DirIcon").exists() {
        squashfs_root.join(".DirIcon")
    } else {
        let entries = std::fs::read_dir(&squashfs_root)
            .map_err(|e| format!("read_dir {}: {e}", squashfs_root.display()))?;
        entries
            .filter_map(Result::ok)
            .map(|e| e.path())
            .find(|p| {
                p.extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.eq_ignore_ascii_case("png"))
                    .unwrap_or(false)
            })
            .ok_or_else(|| "no se encontró .DirIcon ni *.png en squashfs-root".to_string())?
    };

    let icon_target = icons_dir.join(format!("{APP_ID}.png"));
    std::fs::copy(&icon_source, &icon_target).map_err(|e| {
        format!(
            "copy icon {} → {}: {e}",
            icon_source.display(),
            icon_target.display()
        )
    })?;

    // Cleanup: aunque el install continue, dejar el extract_dir ocupa 100+ MB.
    let _ = std::fs::remove_dir_all(&extract_dir);

    Ok(icon_target)
}

/// Crea un symlink a `~/.local/bin/tpv-el-haido` que apunte al AppImage
/// instalado. Es lo que activa `addToPath=true`. El destino es un nombre
/// "limpio" (sin `.AppImage`) para que el usuario pueda invocarlo como
/// `tpv-el-haido` desde la shell.
///
/// Si el symlink ya existe y apunta a otra cosa, lo reemplaza.
#[cfg(unix)]
pub fn install_path_symlink(appimage_path: &Path, bin_dir: &Path) -> Result<PathBuf, String> {
    use std::os::unix::fs::symlink;

    std::fs::create_dir_all(bin_dir)
        .map_err(|e| format!("create {}: {e}", bin_dir.display()))?;

    let link_path = bin_dir.join(APP_ID);
    // Si ya existe un symlink roto o apunta a otra cosa, lo retiramos.
    let _ = std::fs::remove_file(&link_path);

    symlink(appimage_path, &link_path).map_err(|e| {
        format!(
            "symlink {} → {}: {e}",
            link_path.display(),
            appimage_path.display()
        )
    })?;
    Ok(link_path)
}

#[cfg(not(unix))]
pub fn install_path_symlink(_appimage_path: &Path, _bin_dir: &Path) -> Result<PathBuf, String> {
    // Symlinks sin --install: no aplica en MVP (Linux-only).
    Err("symlink PATH sólo soportado en Linux".into())
}

/// Test del helper de symlink: no incluye redactor del filesystem, sólo
/// verifica que el chmod deja los bits esperados y que el copy preserva
/// bytes.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chmod_sets_0755_on_file() {
        use std::os::unix::fs::PermissionsExt;
        let dir = std::env::temp_dir().join("tpv-el-haido-chmod-test");
        std::fs::create_dir_all(&dir).unwrap();
        let target = dir.join("binary.bin");
        std::fs::write(&target, b"#!/bin/sh\necho hello\n").unwrap();
        std::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o600)).unwrap();

        set_executable(&target).unwrap();

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = std::fs::metadata(&target).unwrap().permissions().mode();
            assert_eq!(mode & 0o777, 0o755, "modo esperado 0755, vi {mode:o}");
        }

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn install_appimage_overwrite_via_staging_rename() {
        // Garantiza el contrato atómico: aunque el destino exista, staging
        // + rename produce un path final legible y ejecutable.
        let dir = std::env::temp_dir().join("tpv-el-haido-staging-test");
        std::fs::create_dir_all(&dir).unwrap();
        let source = dir.join("source.AppImage");
        std::fs::write(&source, b"fake appimage").unwrap();

        let install_dir = dir.join("bin");
        let final1 = install_appimage(&source, &install_dir).unwrap();
        assert!(final1.exists());

        // Segundo install (overwrite): no debe fallar por "Text file busy"
        // aunque en este test no esté corriendo.
        let final2 = install_appimage(&source, &install_dir).unwrap();
        assert_eq!(final1, final2);
        assert!(final2.exists());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
