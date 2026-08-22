/**
 * Service wrapper — TR-19.B.
 *
 * Tras TR-19.B la lógica pesada vive en Rust (`src-tauri/src/installer/`).
 * Este archivo queda como:
 *   1. Constantes XDG que el wizard usa para mostrar "destino" en la UI
 *      sin importar el backend.
 *   2. Helpers de validación de inputs antes de mandar al IPC.
 *
 * Cada función pesada (copy, chmod, .desktop, icon, PATH) está en Rust;
 * `runInstall` delega a `installer:install` desde `ipc/handlers.ts`.
 */

import type { InstallOptions, InstallResult } from '../contracts';

/**
 * Constantes XDG (sincronizadas con `src-tauri/src/installer/install.rs`).
 * Si cambian en Rust, hay que cambiarlas aquí — un test de paridad en CI
 * sería ideal, pero por ahora un comentario basta.
 */
export const INSTALL_PATHS = {
  /** AppImage destino (MVP: user-level) */
  appImage: '~/.local/bin/tpv-el-haido',
  /** Entrada .desktop (XDG) */
  desktopEntry: '~/.local/share/applications/tpv-el-haido.desktop',
  /** Icono (XDG) */
  icon: '~/.local/share/icons/hicolor/256x256/apps/tpv-el-haido.png',
  /** Symlink para $PATH */
  pathLink: '~/.local/bin/tpv-el-haido',
} as const;

/**
 * Validación client-side de InstallOptions. Si esto falla, no tiene sentido
 * mandar la request al backend — devolveríamos el mismo error con un
 * round-trip más.
 */
export function validateInstallOptions(options: InstallOptions): string | null {
  if (!options.downloadUrl) {
    return 'Falta downloadUrl — completa el paso de Descarga primero.';
  }
  if (!/^[a-f0-9]{64}$/.test(options.checksumSha256)) {
    return 'checksumSha256 malformado (64 hex chars)';
  }
  if (options.installPath && !options.installPath.startsWith('~/')) {
    return 'installPath debe empezar con ~/ (sólo user-level en MVP)';
  }
  return null;
}

/**
 * TR-19.B: runInstall delega a `installer:install` (handlers.ts).
 * El frontend nunca hace file ops directamente — todo va via IPC.
 */
export async function runInstall(
  sourceAppImage: string,
  options: InstallOptions
): Promise<InstallResult> {
  // Validar primero, fuera del IPC round-trip.
  const validation = validateInstallOptions(options);
  if (validation) {
    return {
      success: false,
      error: {
        code: 'INVALID_OPTIONS',
        message: validation,
        recoverable: true,
      },
    };
  }
  // Import lazy para evitar ciclos entre los services y los handlers.
  const { installApp } = await import('../ipc/handlers');
  // `sourceAppImage` es el path real al .AppImage en /tmp (output de
  // `downloadArtifact`). El backend lo busca por ese path string.
  return installApp({
    ...options,
    downloadUrl: sourceAppImage,
  });
}

/**
 * Mantiene la signature original para que los step components en TR-19.C
 * la puedan invocar. La verificación real está en Rust ahora.
 */
export async function verifySha256(filePath: string, expectedSha256: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error(`Invalid SHA256 format: ${expectedSha256}`);
  }
  // El SHA256 verify real sucede durante `installer:download` en Rust.
  // Aquí sólo confirmamos que el caller pide un formato válido — el
  // boolean de retorno significa "la operación puede proceder", no que
  // ya pasó.
  void filePath;
  return true;
}
