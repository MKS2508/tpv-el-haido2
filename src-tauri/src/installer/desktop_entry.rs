//! Generador del `.desktop` para freedesktop.org.
//!
//! El shell del TPV (`scripts/install-linux.sh`) ya define el formato exacto
//! que usan GNOME/KDE/XFCE; este módulo espeja ese contenido para que
//! `--install` produzca un fichero idéntico al del bash wrapper.
//!
//! Cero dependencias runtime — la función `format_desktop_entry` es pura y se
//! testea sin filesystem.

use std::path::Path;

/// Construye el contenido del `.desktop` que registra el TPV en el menú de
/// aplicaciones. El `Exec` apunta al AppImage final (no al `downloads/.../`
/// path que tendría el usuario al acabar de descargar), y el `Icon` apunta al
/// PNG extraído del AppImage.
///
/// Lines that the XDG spec marks as required are kept first (`[Desktop Entry]`,
/// `Type`, `Name`, `Exec`); the rest are advisory but match what ship the
/// install would produce.
pub fn format_desktop_entry(app_path: &Path, icon_path: &Path) -> String {
    // Escape paths that may contain spaces — Exec= es parsed sin quoting, así
    // que hay que usar %20 o, mejor, dejar la URL encoding al usuario. Para
    // AppImages en ~/.local/bin no se da el caso, pero defendámonos por si
    // alguien mueve el path a `~/My Apps/`.
    format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Version=1.0\n\
         Name=TPV El Haido\n\
         GenericName=Point of Sale\n\
         Comment=Punto de venta para hosteleria\n\
         Exec={}\n\
         Icon={}\n\
         Terminal=false\n\
         Categories=Office;Finance;\n\
         StartupWMClass=tpv-el-haido\n\
         StartupNotify=true\n",
        escape_desktop_field(&app_path.display().to_string()),
        escape_desktop_field(&icon_path.display().to_string()),
    )
}

/// Escapa caracteres que el spec de `.desktop` marca como conflictivos en
/// `Exec=`. La spec exige `%`, `>` y `\`; espacios nuevos dejarían el Exec
/// roto, así que los sustituimos por sus equivalentes URL-encoded.
fn escape_desktop_field(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '%' => out.push_str("%25"),
            // Necesario para shell-free Exec=. El spec NO prohíbe espacios
            // pero rompería el matching de `Exec=` en algunos file managers.
            ' ' => out.push_str("\\ "),
            other => out.push(other),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn desktop_entry_contains_required_keys() {
        let app = PathBuf::from("/home/user/.local/bin/tpv-el-haido.AppImage");
        let icon = PathBuf::from("/home/user/.local/share/icons/hicolor/256x256/apps/tpv-el-haido.png");
        let entry = format_desktop_entry(&app, &icon);

        assert!(entry.starts_with("[Desktop Entry]\n"));
        assert!(entry.contains("Type=Application\n"));
        assert!(entry.contains("Name=TPV El Haido\n"));
        assert!(entry.contains("Exec=/home/user/.local/bin/tpv-el-haido.AppImage\n"));
        assert!(entry.contains(
            "Icon=/home/user/.local/share/icons/hicolor/256x256/apps/tpv-el-haido.png\n"
        ));
        assert!(entry.contains("StartupWMClass=tpv-el-haido\n"));
    }

    #[test]
    fn desktop_entry_escapes_spaces_in_exec() {
        let app = PathBuf::from("/home/user/My Apps/tpv-el-haido.AppImage");
        let icon = PathBuf::from("/tmp/icon.png");
        let entry = format_desktop_entry(&app, &icon);
        // Space → "\ " (la spec lo permite y mantiene semántica XDG).
        assert!(entry.contains("Exec=/home/user/My\\ Apps/tpv-el-haido.AppImage\n"));
    }

    #[test]
    fn desktop_entry_escapes_percent() {
        let app = PathBuf::from("/home/user/100%real/tpv.AppImage");
        let icon = PathBuf::from("/tmp/icon.png");
        let entry = format_desktop_entry(&app, &icon);
        assert!(entry.contains("Exec=/home/user/100%25real/tpv.AppImage\n"));
    }
}
