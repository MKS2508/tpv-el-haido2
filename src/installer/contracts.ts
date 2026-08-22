/**
 * Contratos IPC para el installer mode (sidecar wizard).
 *
 * LOCKED en TR-19.A — punto único de verdad consumido por:
 *  - TR-19.B (handlers reales en Rust + service real download/install)
 *  - TR-19.C (los 7 steps del wizard — DownloadStep, PathStep, etc.)
 *  - TR-19.A.3 (wire-up de capabilities en tauri.conf.json)
 *
 * NO improvisar shapes. Cambios aquí rompen B+C. Si algo falta, agregar
 * un campo nuevo (no redefinir existentes).
 */

// ==================== Wizard steps ====================

/**
 * Los 7 steps del wizard. TR-19.A solo implementa `welcome` (smoke test);
 * los otros 6 llegan en TR-19.C. El orden del array es el orden visual.
 */
export type InstallStep =
  | 'welcome'
  | 'download'
  | 'path'
  | 'components'
  | 'review'
  | 'install'
  | 'done';

export const INSTALL_STEPS: readonly InstallStep[] = [
  'welcome',
  'download',
  'path',
  'components',
  'review',
  'install',
  'done',
] as const;

// ==================== Installer options ====================

/**
 * Opciones que el usuario acumula via el wizard.
 * Se persisten en estado del wizard (no en disco) y se envían a `installer:install` al final.
 *
 * MVP scope (ver r7): solo `~/.local/bin` (user-level). `/opt` excluido del MVP.
 */
export interface InstallOptions {
  /** Ruta destino. MVP: solo `~/.local/bin/tpv-el-haido`. Default: ~/.local/bin */
  installPath: string;
  /** Crear entrada .desktop en `~/.local/share/applications/` */
  createDesktopEntry: boolean;
  /** Instalar icono en `~/.local/share/icons/` */
  installIcon: boolean;
  /** Lenguaje del wizard (es|en) */
  language: 'es' | 'en';
  /** URL del signed artifact en desktop-release-hub */
  downloadUrl: string;
  /** SHA256 esperado del artifact para verificación post-download */
  checksumSha256: string;
  /** ¿Incluir en PATH del usuario? (true → `ln -s` en `~/.local/bin`) */
  addToPath: boolean;
}

/**
 * Defaults sensatos para arrancar el wizard en `welcome` step.
 * `downloadUrl` y `checksumSha256` se rellenan en `download` step (TR-19.C)
 * cuando el frontend pega el manifest firmado desde desktop-release-hub.
 */
export const DEFAULT_INSTALL_OPTIONS: InstallOptions = {
  installPath: '~/.local/bin/tpv-el-haido',
  createDesktopEntry: true,
  installIcon: true,
  language: 'es',
  downloadUrl: '',
  checksumSha256: '',
  addToPath: true,
};

// ==================== Progress (subscription) ====================

/**
 * Fases de la operación atómica (download, install, etc.).
 * El frontend subscribe via `installer:onProgress` y la UI se actualiza reactiva.
 */
export type InstallPhase =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'extracting'
  | 'registering'
  | 'complete'
  | 'error';

export interface InstallProgress {
  /** Step actual del wizard que emitió el progreso */
  step: InstallStep;
  /** Fase de la operación */
  phase: InstallPhase;
  /** 0-100 */
  percent: number;
  /** Mensaje user-facing (i18n key o string ya localizado según emisor) */
  message: string;
  /** Bytes descargados (si `phase === 'downloading'`) */
  bytesDownloaded?: number;
  /** Bytes totales (si `phase === 'downloading'`) */
  bytesTotal?: number;
}

// ==================== Result ====================

/**
 * Resultado de `installer:install`. `success=false` lleva `error` poblado.
 * En caso de éxito, `finalPath` y `launchCommand` están definidos.
 */
export interface InstallResult {
  success: boolean;
  /** Path final donde quedó el binario AppImage */
  finalPath?: string;
  /** Comando para lanzar (e.g., `~/.local/bin/tpv-el-haido`) */
  launchCommand?: string;
  /** Error si success=false. `recoverable=true` permite reintentar desde `review` */
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

// ==================== IPC API (typed map) ====================

/**
 * API expuesta via Tauri IPC commands.
 * El frontend la consume via `invoke<T>('installer:...')` o via los wrappers
 * tipados en `ipc/handlers.ts` (stubs en TR-19.A, reales en TR-19.B).
 *
 * Cada key es el command name que aparece en `tauri.conf.json` capabilities
 * (configurado en TR-19.A.3, NA para TR-19.A).
 */
export interface InstallerAPI {
  // Step 1: download — trae el AppImage firmado a /tmp
  'installer:download': (options: { url: string; checksumSha256: string }) => Promise<{
    path: string;
    bytes: number;
  }>;

  // Step 2: install — copia a installPath + .desktop + icono + PATH symlink
  'installer:install': (options: InstallOptions) => Promise<InstallResult>;

  // Step 3: rollback — deshacer parcial si install falló a mitad
  'installer:rollback': (state: Partial<InstallResult>) => Promise<void>;

  // Step 4: uninstall — separado, TR-19.B.2 (NO implementar en TR-19.B base)
  'installer:uninstall': (installPath: string) => Promise<void>;

  // Step 5: progress subscription — frontend subscribe, devuelve unsubscribe
  'installer:onProgress': (callback: (progress: InstallProgress) => void) => () => void;
}

// ==================== Type helpers ====================

/**
 * Helper type para extraer el tipo de retorno de un command del InstallerAPI.
 * Útil en handlers/typed wrappers: `Awaited<ReturnType<InstallerAPI['installer:download']>>`
 */
export type InstallerCommand<C extends keyof InstallerAPI> = InstallerAPI[C];

/**
 * Helper type para extraer el tipo del primer argumento de un command.
 * Útil en typed wrappers: `InstallerCommandArgs<'installer:install'>` → `InstallOptions`
 */
export type InstallerCommandArgs<C extends keyof InstallerAPI> = InstallerAPI[C] extends (
  args: infer A
) => unknown
  ? A
  : never;
