#!/usr/bin/env bash
# uninstall-linux.sh — Remove TPV El Haido user-level installation.
# Mirrors `rollback.rs::uninstall` from the Rust installer side.
set -euo pipefail

xdg_bin="${XDG_BIN_HOME:-${HOME}/.local/bin}"
xdg_apps="${XDG_DATA_HOME:-${HOME}/.local/share}/applications"
xdg_icons="${XDG_DATA_HOME:-${HOME}/.local/share}/icons/hicolor/256x256/apps"

rm -f "${xdg_bin}/tpv-el-haido"
rm -f "${xdg_bin}/tpv-el-haido.AppImage"
rm -f "${xdg_apps}/tpv-el-haido.desktop"
rm -f "${xdg_icons}/tpv-el-haido.png"

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "${xdg_apps}" || true
fi

echo "TPV El Haido uninstalled. To remove the wizard config directory and tool cache, run: rm -rf ~/.config/tpv-el-haido"
