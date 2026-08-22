/**
 * Stub del servicio de descarga desde desktop-release-hub.
 *
 * TR-19.B enchufa el cliente real:
 *  - GET a https://admin.releases.mks2508.systems/api/releases/latest?slug=haido
 *  - Filtrar por target (linux-x64 / linux-arm64)
 *  - Devolver { downloadUrl, checksumSha256 }
 *
 * Por ahora expone solo la shape esperada para que los consumidores en TR-19.C
 * (DownloadStep) puedan tipar y mockear.
 */

export interface ReleaseHubArtifact {
  /** URL del AppImage firmado */
  downloadUrl: string;
  /** SHA256 esperado, en hex (lowercase) */
  checksumSha256: string;
  /** Versión (e.g., "0.1.3") */
  version: string;
  /** Bytes totales declarados por el servidor */
  bytesTotal: number;
  /** Timestamp de release (ISO 8601) */
  releasedAt: string;
}

/**
 * TR-19.A: stub que siempre lanza. TR-19.B lo enchufa.
 *
 * @param slug Identificador del proyecto en release-hub (default: `haido`)
 * @param target Target triple (e.g., `linux-x64`)
 */
export async function fetchLatestArtifact(
  slug: string,
  target: string
): Promise<ReleaseHubArtifact> {
  void slug;
  void target;
  throw new Error('Not implemented — see TR-19.B');
}

/**
 * TR-19.A: stub. TR-19.B lo enchufa con POST al webhook /api/usage.
 */
export async function reportInstallEvent(event: {
  slug: string;
  version: string;
  installPath: string;
  success: boolean;
  durationMs: number;
}): Promise<void> {
  console.warn('[TR-19.A stub] reportInstallEvent', event);
}
