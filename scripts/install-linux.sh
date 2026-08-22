#!/usr/bin/env bash
# install-linux.sh — Thin shim that defers to the TPV El Haido AppImage in installer mode.
#
# The wizard handles download, signature verification, install location, and desktop integration.
#
# OFFLINE FALLBACK: if the wizard is unavailable, the bootstrap_fallback() function below
# replicates the install behaviour from the previous bash script (--prefix support, icon extraction,
# .desktop registration). Source this file and call bootstrap_fallback() manually.
#
#   source ./scripts/install-linux.sh
#   bootstrap_fallback /path/to/tpv-el-haido.AppImage [--prefix /custom/bin]
set -euo pipefail

# Path to the AppImage this script ships next to (default assumption)
APPIMAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE_BIN="${APPIMAGE_DIR}/tpv-el-haido.AppImage"

if [[ -x "${APPIMAGE_BIN}" ]]; then
    exec "${APPIMAGE_BIN}" --install "$@"
fi

echo "Could not find AppImage at ${APPIMAGE_BIN}. Download from https://haido.releases.mks2508.systems/releases and place next to this script." >&2
exit 1

# ----------------------------------------------------------------------------------------
# bootstrap_fallback — offline install without the wizard.
# Preserves the logic of the previous install-linux.sh (--prefix, icon extract, .desktop).
# Call: bootstrap_fallback /path/to/AppImage [--prefix DIR]
# ----------------------------------------------------------------------------------------
# shellcheck disable=SC2317,SC2329  # invoked via `source ./install-linux.sh && bootstrap_fallback ...`
bootstrap_fallback() {
    local appimage_src="${1:?Usage: bootstrap_fallback <appimage> [--prefix DIR]}"
    local prefix="${HOME}/.local/bin"
    shift

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --prefix) prefix="${2:?--prefix needs a path}"; shift 2 ;;
            *) echo "Unknown option: $1" >&2; return 2 ;;
        esac
    done

    local app_id="tpv-el-haido"
    local dest="${prefix}/${app_id}.AppImage"
    local desktop_dir="${HOME}/.local/share/applications"
    local icon_dir="${HOME}/.local/share/icons/hicolor/256x256/apps"

    mkdir -p "${prefix}" "${desktop_dir}" "${icon_dir}"

    # Atomic install: copy to temp then rename to avoid "Text file busy" if replacing a running binary
    install -m 755 "${appimage_src}" "${dest}.new"
    mv -f "${dest}.new" "${dest}"
    echo "AppImage installed at: ${dest}"

    # Extract icon from AppImage (squashfs-root/.DirIcon or bundled .png)
    local work
    work="$(mktemp -d)"
    # shellcheck disable=SC2064
    trap "rm -rf '${work}'" EXIT
    ( cd "${work}" && "${dest}" --appimage-extract >/dev/null 2>&1 ) || true

    local icon_src
    icon_src="$(find "${work}/squashfs-root" -maxdepth 1 -name '*.png' | head -1)"
    if [[ -n "${icon_src}" ]]; then
        install -m 644 "${icon_src}" "${icon_dir}/${app_id}.png"
        echo "Icon installed at: ${icon_dir}/${app_id}.png"
    fi

    # Write .desktop pointing to the stable path (outside the AppDir so it works when launched from menu)
    cat > "${desktop_dir}/${app_id}.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=TPV El Haido
Comment=Terminal punto de venta
Exec=${dest}
Icon=${app_id}
Terminal=false
Categories=Office;Finance;
StartupWMClass=${app_id}
DESKTOP
    chmod 644 "${desktop_dir}/${app_id}.desktop"
    echo "Launcher installed at: ${desktop_dir}/${app_id}.desktop"

    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "${desktop_dir}" || true
    command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -qtf "${HOME}/.local/share/icons/hicolor" || true

    echo
    echo "Done. It will appear in your desktop menu as \"TPV El Haido\"."
    echo "Manual launch: ${dest}"
}
