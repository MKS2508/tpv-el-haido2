/**
 * Wrappers IPC tipados para el installer mode.
 *
 * TR-19.B: las llamadas ya no son stubs — `invoke<T>('installer:...')` está
 * conectado a los handlers Rust reales (`src-tauri/src/installer/`). El
 * frontend subscribe `installer:onProgress` con un `listen<InstallProgress>`
 * nativo de Tauri (no se invoca — es evento push).
 *
 * Los nombres de export (downloadArtifact, installApp, etc.) coinciden con
 * los stubs de TR-19.A — el cambio es transparente para los step components
 * que ya los consuman.
 */

// ==================== Tauri imports ====================
// Imports directos — `invoke` y `listen` están disponibles en el bundle
// Tauri runtime. En contexto PWA el módulo falla en carga inicial, pero
// los wrappers nunca se llaman si el runtime no es Tauri (TR-19.C debe
// gatearlos por `isTauri()` antes de invocar).
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { InstallOptions, InstallProgress, InstallResult } from '../contracts';

// ==================== Real wrappers ====================

/**
 * Step 1: download — trae el AppImage firmado al /tmp del sistema y verifica
 * SHA256. El path resultante se pasa a `installApp({downloadUrl: tempPath, ...})`.
 *
 * El progreso se entrega por la subscription `onProgress` (push via event emitter
 * de Tauri), no como parte del return — el callback mantiene actualizada la UI.
 */
export async function downloadArtifact(options: {
  url: string;
  checksumSha256: string;
}): Promise<{ path: string; bytes: number }> {
  const outcome = await invoke<{ path: string; bytes: number }>('installer:download', {
    url: options.url,
    checksumSha256: options.checksumSha256,
  });
  return outcome;
}

/**
 * Step 2: install — copia el AppImage al destino + .desktop + icono + symlink.
 *
 * El frontend debe pasar `downloadUrl` como el path al AppImage ya descargado
 * (output de `downloadArtifact`). `installPath` se ignora por ahora en MVP:
 * el binario va fijo a `~/.local/bin/tpv-el-haido` (constraint XDG que el
 * updater TPV necesita, ver scripts/install-linux.sh).
 */
export async function installApp(options: InstallOptions): Promise<InstallResult> {
  return await invoke<InstallResult>('installer:install', {
    options: {
      install_path: options.installPath,
      create_desktop_entry: options.createDesktopEntry,
      install_icon: options.installIcon,
      download_url: options.downloadUrl,
      checksum_sha256: options.checksumSha256,
      add_to_path: options.addToPath,
    },
  });
}

/**
 * Step 3: rollback — deshace la instalación parcial. El frontend construye
 * `state` con los paths que fue recolectando del flujo. Es idempotente: si
 * se llama dos veces no rompe, y si algún path no existe, también es OK.
 */
export async function rollback(state: Partial<InstallResult>): Promise<void> {
  await invoke('installer:rollback', {
    state: {
      appimage_path: state.finalPath ?? null,
      desktop_entry_path: state.launchCommand ?? null,
      icon_path: null,
    },
  });
}

/**
 * Step 4: uninstall — limpia por convención XDG. Idempotente.
 */
export async function uninstall(installPath: string): Promise<void> {
  await invoke('installer:uninstall', { installPath });
}

// ==================== Progress subscription ====================

export type ProgressCallback = (progress: InstallProgress) => void;

/**
 * Suscribe a los eventos de progreso emitidos por Rust durante download + install.
 * Devuelve una función `unlisten` (NO se llama en cleanup — Tauri ya no la conecta).
 *
 * El evento Rust `installer:progress` emite payloads `ProgressEvent` con shape:
 *   { phase, percent, bytesDownloaded?, bytesTotal?, message? }
 * que se proyectan a `InstallProgress` (lo rellena el frontend con `step`).
 */
export async function onProgress(callback: ProgressCallback): Promise<UnlistenFn> {
  return listen<InstallProgress>('installer:progress', (event) => {
    callback(event.payload);
  });
}
