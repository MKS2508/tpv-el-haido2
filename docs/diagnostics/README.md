# Diagnóstico de host — interpretación del informe gráfico

**Script**: `scripts/diagnose-host.sh` · **Informes**: `host-report-<hostname>-<timestamp>.txt`

Contesta a una sola pregunta: **¿el webview está compositando por GPU o por software?**
Todo lo demás (routing, IPC, CSS) se mide después; si el pipeline de render está roto,
ningún tuning de frontend lo compensa.

## Uso

```bash
# En la máquina objetivo (o por SSH: el script recupera el entorno gráfico solo)
./scripts/diagnose-host.sh

# Con sonda en vivo — la medida que de verdad decide
./scripts/diagnose-host.sh --probe /ruta/al/binario-o-AppImage
```

La sonda abre la app ~15 s (ventana visible en la pantalla del host) y la cierra.

## Cómo leer el resultado

### La métrica que decide: memoria de GPU del `WebKitWebProcess`

| Observación | Significado |
|---|---|
| **>100 MiB** en `nvidia-smi` + `gbm_errors=0` | Compositing acelerado. El render **no** es el cuello de botella. |
| **~10 MiB** + `Failed to create GBM buffer` | El contexto GL existe pero **falló la asignación DMABUF** → fallback software. |
| Proceso **ausente** de `nvidia-smi` | Ruta 100 % software. |
| `renderer: llvmpipe` / `softpipe` en glxinfo | Sin GPU utilizable en absoluto. |

Un proceso presente en `nvidia-smi` **no** prueba aceleración: con ~10 MiB sólo hay
contexto vacío. La cifra es el discriminador, no la presencia.

### Otras filas

| Observación | Diagnóstico | Acción |
|---|---|---|
| `GDK_BACKEND=x11` en el env efectivo, en sesión Wayland | Alguien fuerza Xwayland. En NVIDIA rompe DMABUF. | Ver *causa conocida* abajo. |
| `WEBKIT_DISABLE_COMPOSITING_MODE=1` persistente | Compositing desactivado del todo. | Quitarla y reprobar. |
| Monitor en `card1`(NVIDIA) pero render en `renderD129`(Intel) | Render/scanout cruzado: copia por frame. | Forzar el mismo device. |
| `nvidia_drm modeset=N` | GBM no puede funcionar. | `nvidia_drm.modeset=1`. |
| GPU ASPEED / Matrox (BMC) | Sin GPU real. | Es hardware; optimizar CSS o cambiar de máquina. |

`eglinfo` lista **todos** los devices EGL del sistema y no predice cuál elige WebKit:
es informativo. La verdad está en `/proc/<webproc>/fd` + `nvidia-smi`.

## Causa conocida: AppImage + NVIDIA → compositing por software

`linuxdeploy-plugin-gtk` inyecta en el AppRun de **todo** AppImage que genera:

```sh
export GDK_BACKEND=x11 # Crash with Wayland backend on Wayland - ... tauri-apps/tauri#8541
```

Fuerza Xwayland aunque la sesión sea Wayland. Sobre NVIDIA, el renderer DMABUF de
WebKitGTK falla ahí al reservar el buffer (`Failed to create GBM buffer ... Invalid
argument`) y cae a compositing por software. La app arranca y pinta bien — sólo va
lenta, que es justo el patrón difícil de atribuir.

Pisa el valor del que lanza, así que **exportar `GDK_BACKEND=wayland` por fuera no
surte efecto**: hay que tocar el hook.

Medido en `supermicro-pcbar` (ver `host-report-supermicro-pcbar-20260821-004851.txt`),
2 repeticiones por variante:

| Variante | GPU mem | Errores GBM |
|---|---|---|
| AppImage tal cual | 9-10 MiB | 2 |
| AppImage + `GDK_BACKEND=wayland` por fuera | 9 MiB | 2 |
| Binario nativo (sin AppRun) en Wayland | 167 MiB | 0 |
| AppImage con hook parcheado + `GDK_BACKEND=wayland` | 167-173 MiB | 0 |

Parche mínimo del hook — respeta al que lanza y deja `x11` como default, así que
ningún otro host cambia de comportamiento:

```sh
export GDK_BACKEND="${GDK_BACKEND:-x11}"
```

El default sigue dando 9 MiB: el arreglo son **las dos piezas juntas**, parche +
lanzar con `GDK_BACKEND=wayland`.

> El hook existe por un crash real de Tauri en Wayland (tauri#8541). Aquí no
> reproduce (binario nativo en Wayland, estable en todas las pruebas), pero por eso
> el parche conserva `x11` como default en vez de borrar la línea.
