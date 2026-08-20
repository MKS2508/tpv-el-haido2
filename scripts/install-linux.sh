#!/usr/bin/env bash
# install-linux.sh — instala el AppImage del TPV como aplicación de escritorio.
#
#   ./scripts/install-linux.sh <ruta-al-AppImage>
#   ./scripts/install-linux.sh <ruta-al-AppImage> --prefix ~/Applications
#
# Deja el AppImage en una ruta estable y registra .desktop + icono, para que
# aparezca en el lanzador del escritorio y deje de arrancarse a mano.
#
# La ruta estable no es cosmética: tauri-plugin-updater actualiza reescribiendo
# el propio fichero AppImage en el sitio donde corre, así que tiene que vivir en
# un sitio fijo y escribible por el usuario. Instalar en /opt (root) rompería la
# auto-actualización.
set -euo pipefail

APPIMAGE_SRC="${1:-}"
PREFIX="${HOME}/.local/bin"

shift || true
while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) PREFIX="${2:?--prefix necesita una ruta}"; shift 2 ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$APPIMAGE_SRC" ] || [ ! -f "$APPIMAGE_SRC" ]; then
  echo "Uso: $0 <ruta-al-AppImage> [--prefix DIR]" >&2
  exit 2
fi

APP_ID="tpv-el-haido"
DEST="$PREFIX/$APP_ID.AppImage"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"

mkdir -p "$PREFIX" "$DESKTOP_DIR" "$ICON_DIR"

# Copiar a un temporal y mover: si la app está corriendo desde $DEST, escribir
# encima da "Text file busy". El rename es atómico y no toca el inode viejo.
install -m 755 "$APPIMAGE_SRC" "$DEST.new"
mv -f "$DEST.new" "$DEST"
echo "AppImage instalado en: $DEST"

# El icono y el .desktop ya vienen dentro del AppImage: extraerlos en vez de
# duplicarlos en el repo, así siguen a la versión instalada.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
( cd "$WORK" && "$DEST" --appimage-extract >/dev/null 2>&1 ) || true

ICON_SRC="$(find "$WORK/squashfs-root" -maxdepth 1 -name '*.png' | head -1)"
if [ -n "$ICON_SRC" ]; then
  install -m 644 "$ICON_SRC" "$ICON_DIR/$APP_ID.png"
  echo "Icono instalado en: $ICON_DIR/$APP_ID.png"
fi

# Exec se reescribe a la ruta estable: el .desktop de dentro del AppImage apunta
# al binario tal como vive en el AppDir, que fuera de ahí no existe.
cat > "$DESKTOP_DIR/$APP_ID.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=TPV El Haido
Comment=Terminal punto de venta
Exec=$DEST
Icon=$APP_ID
Terminal=false
Categories=Office;Finance;
StartupWMClass=tpv-el-haido
DESKTOP
chmod 644 "$DESKTOP_DIR/$APP_ID.desktop"
echo "Lanzador instalado en: $DESKTOP_DIR/$APP_ID.desktop"

command -v update-desktop-database >/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
command -v gtk-update-icon-cache  >/dev/null && gtk-update-icon-cache -qtf "$HOME/.local/share/icons/hicolor" 2>/dev/null || true

echo
echo "Listo. Aparecerá en el lanzador como \"TPV El Haido\"."
echo "Arranque manual: $DEST"
