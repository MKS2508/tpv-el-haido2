#!/usr/bin/env bash
# diagnose-host.sh — informe de pipeline gráfico del host donde corre el TPV.
#
# Uso:
#   ./scripts/diagnose-host.sh              # informe completo
#   ./scripts/diagnose-host.sh --probe BIN  # además lanza BIN ~15s y mide GPU real
#
# Pensado para ejecutarse EN la máquina objetivo. Si se lanza por SSH sin sesión
# gráfica, el script recupera WAYLAND_DISPLAY/DISPLAY/XDG_RUNTIME_DIR del
# compositor en marcha — sin eso, glxinfo y cualquier sonda GPU fallan y el
# informe sale vacío y engañoso.
set -u

OUT="host-report-$(hostname)-$(date +%Y%m%d-%H%M%S).txt"
exec > >(tee "$OUT") 2>&1

PROBE_BIN=""
[ "${1:-}" = "--probe" ] && PROBE_BIN="${2:-}"

section() { printf '\n=== %s ===\n' "$1"; }

section "Host"
hostname; uname -srm
command -v pacman >/dev/null && pacman -Q 2>/dev/null | grep -iE 'webkit2gtk|nvidia|mesa' | head
command -v dpkg   >/dev/null && dpkg -l 2>/dev/null | grep -iE 'webkit2gtk|nvidia|mesa' | awk '{print $2, $3}' | head

section "CPU / RAM"
lscpu | grep -E 'Model name|^CPU\(s\)|CPU max MHz'
free -h | head -2

section "GPUs físicas"
lspci -nn 2>/dev/null | grep -Ei 'vga|3d|display'

section "Driver en uso por GPU"
lspci -k 2>/dev/null | grep -EA3 'VGA|3D|Display' | grep -E 'VGA|3D|Display|Kernel driver'

# Qué GPU tiene el monitor enchufado. En una máquina con iGPU + dGPU esto decide
# quién hace scanout, y no tiene por qué coincidir con quién renderiza.
section "Conectores DRM (dónde está el monitor)"
grep -H . /sys/class/drm/card*-*/status 2>/dev/null | grep -v disconnected
echo "-- todos --"
grep -H . /sys/class/drm/card*-*/status 2>/dev/null

section "Mapa card/render node -> driver -> PCI"
for c in /sys/class/drm/card[0-9]; do
  [ -e "$c" ] || continue
  echo "$(basename "$c") -> driver=$(basename "$(readlink -f "$c/device/driver" 2>/dev/null)")"
done
for n in /dev/dri/renderD*; do
  [ -e "$n" ] || continue
  echo "$(basename "$n") -> $(udevadm info --query=property --name="$n" 2>/dev/null | grep '^DEVPATH=' | head -1)"
done

section "nvidia_drm (modeset debe ser Y para que GBM funcione)"
for f in /sys/module/nvidia_drm/parameters/*; do
  [ -e "$f" ] && echo "$(basename "$f")=$(cat "$f" 2>/dev/null || echo '<sin permiso: reintentar como root>')"
done
cat /proc/driver/nvidia/version 2>/dev/null | head -1

section "Sesión gráfica"
loginctl list-sessions --no-legend 2>/dev/null
for s in $(loginctl list-sessions --no-legend 2>/dev/null | awk '{print $1}'); do
  loginctl show-session "$s" -p Id -p Type -p Class -p Active 2>/dev/null | tr '\n' ' '; echo
done
pgrep -a -f 'gnome-shell|kwin|sway|hyprland|Xorg|Xwayland|cosmic-comp|labwc|plasmashell' | head

# Recuperar el entorno gráfico del compositor: por SSH no lo heredamos.
GRAPHICAL_ENV_FOUND=""
for cand in cosmic-panel cosmic-comp gnome-shell kwin_wayland plasmashell sway Hyprland xfce4-panel; do
  for pid in $(pgrep -x "$cand" 2>/dev/null | head -3); do
    [ -r "/proc/$pid/environ" ] || continue
    # Solo sirve un proceso que exporte de verdad el socket del compositor:
    # varios compositores no se lo pasan a sí mismos por environ.
    if tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null | grep -q '^WAYLAND_DISPLAY=\|^DISPLAY='; then
      eval "$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null \
        | grep -E '^(WAYLAND_DISPLAY|XDG_RUNTIME_DIR|DISPLAY)=' \
        | sed "s/^/export /")"
      GRAPHICAL_ENV_FOUND="$cand(pid $pid)"
      break 2
    fi
  done
done
echo "entorno tomado de: ${GRAPHICAL_ENV_FOUND:-<no encontrado - sonda y glxinfo fallarán>}"
echo "entorno usado -> WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-<unset>} DISPLAY=${DISPLAY:-<unset>} XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-<unset>}"

section "OpenGL (ruta GLX / Xwayland)"
glxinfo -B 2>/dev/null | grep -Ei 'vendor|renderer|OpenGL version|direct rendering' \
  || echo "glxinfo NO disponible (pacman -S mesa-utils | apt install mesa-utils)"

section "EGL"
eglinfo 2>/dev/null | grep -Ei 'EGL vendor|renderer' | head -8 \
  || echo "eglinfo NO disponible (informativo: su elección de device NO predice la de WebKit)"

section "Vulkan"
vulkaninfo --summary 2>/dev/null | head -25 || echo "vulkaninfo NO disponible (solo relevante para evaluar GPUI)"

# Un kill switch de WebKit puesto en cualquiera de estos sitios desactiva la
# aceleración para siempre y de forma invisible.
section "Env vars WEBKIT/GL persistentes"
grep -rn 'WEBKIT_\|GDK_BACKEND\|LIBGL\|MESA_\|__NV\|__GLX' \
  /etc/environment /etc/profile.d/ ~/.config/environment.d/ \
  ~/.bashrc ~/.zshrc ~/.profile ~/.zprofile 2>/dev/null | head -20
grep -rln 'WEBKIT_' /usr/share/applications ~/.local/share/applications 2>/dev/null | head
echo "(vacío = ninguna variable persistente)"

section "Lanzadores instalados de la app"
ls -1 /usr/share/applications ~/.local/share/applications 2>/dev/null | grep -iE 'haido|tpv'
ls -1 ~/.config/autostart 2>/dev/null | grep -iE 'haido|tpv'
systemctl --user list-unit-files 2>/dev/null | grep -iE 'haido|tpv'
echo "(vacío = se lanza a mano; comprobar el history del usuario)"

# La medida que de verdad decide: qué render node abre WebKitWebProcess y
# cuánta memoria de GPU consume. Un proceso en la GPU con memoria testimonial
# (~10 MiB) está compositando por software aunque el contexto GL exista.
if [ -n "$PROBE_BIN" ]; then
  section "Sonda en vivo: $PROBE_BIN"
  if [ ! -x "$PROBE_BIN" ]; then
    echo "No ejecutable: $PROBE_BIN"
  else
    "$PROBE_BIN" >/tmp/diagnose-probe.log 2>&1 &
    APP_PID=$!
    sleep 15
    W=$(pgrep -f WebKitWebProcess | head -1)
    echo "app_pid=$APP_PID webkit_web_process=${W:-<no arrancó>}"
    if [ -n "$W" ]; then
      echo "render nodes abiertos: $(ls -l "/proc/$W/fd" 2>/dev/null | grep -o 'renderD[0-9]*' | sort -u | tr '\n' ' ')"
      echo "-- nvidia-smi --"
      nvidia-smi 2>/dev/null | grep -E "$W|$APP_PID"
      echo "-- env efectivo --"
      tr '\0' '\n' < "/proc/$W/environ" 2>/dev/null | grep -E '^(WEBKIT|GDK|GSK|LIBGL|MESA|__NV|WAYLAND|DISPLAY)' | head
    fi
    echo "-- errores GBM/DMABUF en stderr --"
    grep -icE 'GBM buffer|dmabuf' /tmp/diagnose-probe.log | sed 's/^/ocurrencias: /'
    grep -iE 'GBM buffer|dmabuf' /tmp/diagnose-probe.log | sort -u | head
    kill "$APP_PID" 2>/dev/null; sleep 2; kill -9 "$APP_PID" 2>/dev/null
  fi
fi

section "Informe guardado"
echo "$OUT"
