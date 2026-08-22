/**
 * Stub del servicio de instalación de archivos (file ops + .desktop + icon + PATH).
 *
 * TR-19.B enchufa el cliente real:
 *  - Copia el AppImage desde /tmp a ~/.local/bin/tpv-el-haido
 *  - chmod +x
 *  - Registra ~/.local/share/applications/tpv-el-haido.desktop
 *  - Extrae icono desde el AppImage (o usa uno bundled) a ~/.local/share/icons/
 *  - Symlink ~/.local/bin/tpv-el-haido si addToPath=true
 *  - update-desktop-database (si existe)
 *
 * Por ahora expone solo la shape esperada para que los step components
 * en TR-19.C puedan tipar y mockear.
 */

import type { InstallOptions, InstallResult } from '../contracts';

/**
 * Path helpers (readonly — el wizard no debería escribir fuera de esto).
 * Las constantes viven acá para que un futuro TR-19.D (bash wrapper) pueda
 * reusarlas sin divergencia.
 */
export const INSTALL_PATHS = {
  /** AppImage destino (MVP: user-level) */
  appImage: '~/.local/bin/tpv-el-haido',
  /** Entrada .desktop (XDG) */
  desktopEntry: '~/.local/share/applications/tpv-el-haido.desktop',
  /** Icono (XDG, scalable o PNG 256x256) */
  icon: '~/.local/share/icons/hicolor/256x256/apps/tpv-el-haido.png',
  /** Symlink PATH */
  pathLink: '~/.local/bin/tpv-el-haido',
} as const;

/**
 * TR-19.A: stub. TR-19.B implementa.
 */
export async function copyAppImage(
  sourcePath: string,
  options: InstallOptions
): Promise<{ finalPath: string }> {
  void sourcePath;
  void options;
  throw new Error('Not implemented — see TR-19.B');
}

/**
 * TR-19.A: stub. TR-19.B implementa.
 */
export async function registerDesktopEntry(options: InstallOptions): Promise<void> {
  void options;
  throw new Error('Not implemented — see TR-19.B');
}

/**
 * TR-19.A: stub. TR-19.B implementa.
 */
export async function installIcon(sourceAppImage: string, options: InstallOptions): Promise<void> {
  void sourceAppImage;
  void options;
  throw new Error('Not implemented — see TR-19.B');
}

/**
 * TR-19.A: stub. TR-19.B implementa.
 */
export async function addToPathSymlink(options: InstallOptions): Promise<void> {
  void options;
  throw new Error('Not implemented — see TR-19.B');
}

/**
 * Verifica el SHA256 de un file contra el checksum esperado.
 * TR-19.A: stub que solo valida formato del checksum (64 hex chars).
 * TR-19.B enchufa verificación real (Web Crypto SubtleCrypto o Rust command).
 */
export async function verifySha256(filePath: string, expectedSha256: string): Promise<boolean> {
  void filePath;
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error(`Invalid SHA256 format: ${expectedSha256}`);
  }
  console.warn('[TR-19.A stub] verifySha256 called, NOT actually verifying', {
    filePath,
    expectedSha256,
  });
  return false;
}

/**
 * Helper: consolida los pasos de install y devuelve un InstallResult.
 * TR-19.B lo enchufa a `installer:install` (Tauri command).
 */
export async function runInstall(
  sourceAppImage: string,
  options: InstallOptions
): Promise<InstallResult> {
  void sourceAppImage;
  void options;
  throw new Error('Not implemented — see TR-19.B');
}
