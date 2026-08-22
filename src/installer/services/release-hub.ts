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
 * Wrapper de fetchLatestArtifact — TR-19.B.
 *
 * En la versión actual, el caller (TR-19.C wizard step) debe traer los datos
 * firmados desde fuera (del CLI de release, embebido en build, o del propio
 * release-hub vía un endpoint público). Este wrapper los valida y los pasa
 * al backend.
 *
 * Si en TR-19.D se decide exponer un `/api/releases/latest` HTTP público del
 * hub para el wizard, este sería el entrypoint TS. Por ahora es un passthrough
 * validatorio.
 */
export async function fetchLatestArtifact(
  artifact: ReleaseHubArtifact
): Promise<{ downloadUrl: string; checksumSha256: string }> {
  // Validación defensiva en TS antes de pagar el round-trip al backend.
  if (!/^[a-f0-9]{64}$/.test(artifact.checksumSha256)) {
    throw new Error(`Invalid SHA256 format: ${artifact.checksumSha256}`);
  }
  if (!artifact.downloadUrl.startsWith('https://')) {
    throw new Error(`downloadUrl must be HTTPS (got ${artifact.downloadUrl})`);
  }
  return {
    downloadUrl: artifact.downloadUrl,
    checksumSha256: artifact.checksumSha256.toLowerCase(),
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
