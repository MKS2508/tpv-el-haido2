/**
 * Cliente tipado del release-hub — TR-19.B.
 *
 * Wrapper sobre `installer:download` (`ipc/handlers.ts`) más un helper para
 * pedirle al hub el manifest con `downloadUrl` + `checksumSha256`. El listado
 * de artifacts disponibles lo resuelve el frontend desde fuera (TR-19.C lo
 * enchufa a un endpoint público; este archivo sólo expone los que ya vienen
 * con un path & checksum pre-firmados).
 *
 * `fetchLatestArtifact` se delega a `installer:download` indirectamente —
 * el backend ya hace el GET contra `desktop-release-hub` desde Rust, así que
 * el frontend nunca toca el bearer token directamente. Si en algún momento
 * se quiere consultar `/api/releases/latest?...` desde TS, lo ideal es un
 * endpoint read-only del propio TPV (TR-19.D candidate).
 */

export interface ReleaseHubArtifact {
  /** URL del AppImage firmado (lo que `downloadArtifact` acepta) */
  downloadUrl: string;
  /** SHA256 esperado, en hex (lowercase, 64 chars) */
  checksumSha256: string;
  /** Versión (e.g., "0.1.3") */
  version: string;
  /** Bytes totales declarados */
  bytesTotal: number;
  /** Timestamp de release (ISO 8601) */
  releasedAt: string;
}

/**
 * fetchLatestArtifact — TR-19.B + post-merge TS alignment.
 *
 * El hub todavía no expone un endpoint público de metadata para el wizard
 * (TR-19.D candidate: GET /api/releases/:slug/latest.json con downloadUrl,
 * version, sha256, bytesTotal, releasedAt). Mientras tanto devolvemos la URL
 * predecible del artifact + placeholders honestos: la verificación real de
 * SHA256 ocurre durante `installer:download` en Rust (`release_hub.rs`),
 * no aquí. Si Tauri updater está configurado con `latest.json` en el mismo
 * host, podemos cambiar a `await fetch(latest.json)` sin tocar el consumer.
 */
export async function fetchLatestArtifact(
  slug: string,
  target: string
): Promise<ReleaseHubArtifact> {
  return {
    downloadUrl: `https://haido.releases.mks2508.systems/api/releases/${slug}/latest/${target}`,
    checksumSha256: '',
    version: 'latest',
    bytesTotal: 0,
    releasedAt: '',
  };
}

/**
 * Stub mantenido para no romper callers existentes. La implementación real
 * envía un evento opt-in al backend (que tendría que añadir un nuevo IPC
 * `installer:report_install` para no quemar este nombre).
 *
 * Por ahora sólo loggea local — el wizard no decide producción.
 */
export async function reportInstallEvent(event: {
  slug: string;
  version: string;
  installPath: string;
  success: boolean;
  durationMs: number;
}): Promise<void> {
  console.warn('[installer] reportInstallEvent not yet wired to backend', event);
}
