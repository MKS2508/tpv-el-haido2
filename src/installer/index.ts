/**
 * Public API del módulo installer.
 *
 * TR-19.A: solo <InstallerApp /> + contratos IPC.
 * TR-19.B y TR-19.C extienden (nuevos steps, services reales) pero NO
 * cambian las firmas exportadas aquí — ese es el contrato con el
 * gate de `--install` en main.rs (TR-19.A.2).
 */

// Contratos LOCKED — re-export para que main.rs (cuando gatee el flag)
// y los steps de TR-19.C consuman la misma shape.
export * from './contracts';
export { InstallerApp, type InstallerAppProps } from './InstallerApp';

// Helpers IPC (stubs en TR-19.A — wrappers tipados sobre `invoke()`).
// TR-19.B enchufa los handlers reales en `src-tauri/src/` y reemplaza
// el `throw "Not implemented"` por `invoke<T>('installer:...')` real.
export {
  downloadArtifact,
  installApp,
  onProgress,
  type ProgressCallback,
  rollback,
  uninstall,
} from './ipc/handlers';
