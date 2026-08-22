/**
 * Stubs IPC para el installer mode.
 *
 * TR-19.A: solo existen para que el frontend pueda tipar las llamadas.
 * TR-19.B enchufa los handlers reales en `src-tauri/src/` y reemplaza
 * el `throw "Not implemented"` por `invoke<T>('installer:...')` real.
 *
 * Los nombres de export (`downloadArtifact`, `installApp`, etc.) NO son
 * los nombres IPC finales — son wrappers TS que internamente harán
 * `invoke('installer:download', ...)` etc. cuando B esté listo.
 *
 * Si solo querés usar `invoke()` directamente con los contratos de
 * `contracts.ts`, también es válido. Estos helpers son para centralizar
 * el logging + error wrapping del lado TS.
 */

import type { InstallOptions, InstallProgress, InstallResult } from '../contracts';

/**
 * Step 1: download — trae el AppImage firmado a /tmp y verifica SHA256.
 * TR-19.B reemplaza el throw por un `invoke('installer:download', options)`.
 */
export async function downloadArtifact(options: {
  url: string;
  checksumSha256: string;
}): Promise<{ path: string; bytes: number }> {
  void options;
  throw new Error('Not implemented — see TR-19.B');
}

/**
 * Step 2: install — copia a installPath + .desktop + icono + PATH symlink.
 * TR-19.B reemplaza el throw por un `invoke('installer:install', options)`.
 */
export async function installApp(options: InstallOptions): Promise<InstallResult> {
  void options;
  throw new Error('Not implemented — see TR-19.B');
}

/**
 * Step 3: rollback — deshacer parcial si install falló a mitad.
 * TR-19.B implementa la lógica de rollback (borra files parciales, etc.).
 */
export async function rollback(state: Partial<InstallResult>): Promise<void> {
  console.warn('[TR-19.A stub] rollback called', state);
}

/**
 * Step 4: uninstall — separado, TR-19.B.2 (NO implementar en TR-19.B base).
 */
export async function uninstall(installPath: string): Promise<void> {
  void installPath;
  throw new Error('Not implemented — see TR-19.B.2');
}

/**
 * Progress subscription — devuelve unsubscriber.
 * TR-19.B enchufa `listen('installer:progress', cb)` real.
 */
export type ProgressCallback = (progress: InstallProgress) => void;

export function onProgress(callback: ProgressCallback): () => void {
  console.warn('[TR-19.A stub] progress subscription registered');
  void callback;
  return () => {
    console.warn('[TR-19.A stub] progress subscription removed');
  };
}
