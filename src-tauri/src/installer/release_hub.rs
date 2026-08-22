//! Cliente HTTP al desktop-release-hub.
//!
//! Responsabilidad única: descargar el AppImage firmado con SHA256 verification
//! y emitir progress al frontend. No toca el sistema de archivos fuera del
//! `dest_path` que le pasan — copiar, chmod, registrar .desktop son
//! responsabilidades de `install.rs`.

use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};

use super::types::ProgressEvent;

/// Host por defecto. Mismo tenant que `ota::poller` para unificar infraestructura.
pub const DEFAULT_HUB: &str = "https://haido.releases.mks2508.systems";

#[derive(Debug, Clone)]
pub struct ReleaseHubClient {
    base_url: String,
    token: Option<String>,
    client: reqwest::Client,
}

impl ReleaseHubClient {
    pub fn new(base_url: impl Into<String>, token: Option<String>) -> Self {
        // 5 min timeout cabe para AppImages de hasta ~200 MB en conexiones lentas.
        // Si se queda corto, el frontend ya habrá mostrado un error HTTP 408.
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .user_agent("tpv-el-haido-installer/0.1")
            .build()
            .expect("reqwest client build should not fail with valid defaults");

        Self {
            base_url: base_url.into(),
            token,
            client,
        }
    }

    /// Descarga el artifact firmado a `dest_path` y verifica que coincida con
    /// `expected_sha256`. Emite eventos `installer:progress` por cada chunk
    /// recibido para que la UI muestre velocidad/ETA.
    ///
    /// # Errors
    ///
    /// Devuelve `Err(String)` con mensaje legible si:
    /// - la request HTTP falla (red, 4xx, 5xx)
    /// - el checksum no coincide (probable tampering del artifact)
    /// - la escritura a disco falla (permisos, FS lleno)
    pub async fn download_to(
        &self,
        app: &AppHandle,
        url: &str,
        expected_sha256: &str,
        dest_path: &Path,
    ) -> Result<u64, String> {
        // Sanity-check del checksum esperado antes de empezar a descargar.
        // SHA256 hex son 64 chars; si el frontend mete basura fallamos rápido
        // sin malgastar bandwidth.
        if expected_sha256.len() != 64
            || !expected_sha256.chars().all(|c| c.is_ascii_hexdigit())
        {
            return Err(format!(
                "checksum_sha256 malformado (esperado 64 hex chars): {expected_sha256}"
            ));
        }

        let mut req = self.client.get(url);
        if let Some(token) = &self.token {
            req = req.bearer_auth(token);
        }

        let response = req
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        if !response.status().is_success() {
            return Err(format!(
                "HTTP {} desde el hub: {}",
                response.status(),
                url
            ));
        }

        let bytes_total = response.content_length().unwrap_or(0);
        let mut stream = response.bytes_stream();
        let mut file = tokio::fs::File::create(dest_path)
            .await
            .map_err(|e| format!("create {}: {e}", dest_path.display()))?;
        let mut hasher = Sha256::new();
        let mut downloaded: u64 = 0;
        // Throttle de progreso: un emit por chunk tiene coste (lock IPC), así
        // que agrupamos cada ~256 KiB descargados o al acabar.
        let mut last_emit: u64 = 0;
        const EMIT_EVERY_BYTES: u64 = 256 * 1024;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("read chunk: {e}"))?;
            tokio::io::copy(&mut chunk.as_ref(), &mut file)
                .await
                .map_err(|e| format!("write chunk: {e}"))?;
            hasher.update(&chunk);
            downloaded += chunk.len() as u64;

            if downloaded - last_emit >= EMIT_EVERY_BYTES {
                last_emit = downloaded;
                emit_progress(app, "downloading", downloaded, bytes_total);
            }
        }

        // Flush + emitir el 100% — los chunks grandes pueden no haber disparado
        // el último `last_emit`.
        if let Err(e) = tokio::fs::File::sync_all(&file).await {
            // No fatal — el sync_all protege contra crash mid-write pero no es
            // necesario para verificar SHA256.
            eprintln!("[installer] sync_all warning: {e}");
        }
        emit_progress(app, "verifying", downloaded, bytes_total);

        let hash = format!("{:x}", hasher.finalize());
        if hash != expected_sha256.to_ascii_lowercase() {
            // Limpieza: borramos el archivo dudoso para que un retry no vea un
            // blob corrupto y se confunda.
            let _ = tokio::fs::remove_file(dest_path).await;
            return Err(format!(
                "SHA256 mismatch: esperado {expected_sha256}, calculado {hash}"
            ));
        }

        emit_progress(app, "verifying", downloaded, bytes_total);
        Ok(downloaded)
    }

    #[allow(dead_code)]
    pub fn base_url(&self) -> &str {
        &self.base_url
    }
}

/// Helper: emite un `ProgressEvent` sin abortar si el canal está roto
/// (frontend desconectado). El mejor esfuerzo es aceptable porque el progreso
/// es observacional, no fuente de verdad.
fn emit_progress(app: &AppHandle, phase: &str, downloaded: u64, total: u64) {
    let percent = if total > 0 {
        ((downloaded * 100) / total).min(100) as u32
    } else {
        0
    };
    let evt = ProgressEvent {
        phase: phase.to_string(),
        percent,
        bytes_downloaded: Some(downloaded),
        bytes_total: Some(total),
        message: None,
    };
    if let Err(e) = app.emit(super::types::PROGRESS_EVENT, evt) {
        // No fatal — frontend puede haber cerrado la ventana.
        eprintln!("[installer] emit progress failed (non-fatal): {e}");
    }
}

/// Path por defecto donde se guarda la descarga entrante. Sobrevive a reinicios
/// (vive en `/tmp` del sistema, no de la app), pero se limpia al final del
/// install con `tokio::fs::remove_file` si todo va bien.
pub fn incoming_temp_path() -> PathBuf {
    std::env::temp_dir().join("tpv-el-haido-incoming.AppImage")
}
