//! Consulta periódica al release-hub y preparación del bundle nuevo.
//!
//! El poller **prepara**, no aplica. Descargar, verificar y descomprimir puede
//! tardar y ocurre mientras el TPV trabaja; activar es instantáneo y lo decide el
//! frontend cuando la caja está quieta (ver `ota_apply_staged`). Separarlo así es
//! lo que permite que una actualización no interrumpa un cobro.
//!
//! El WebSocket del hub es una optimización que aún no existe: esto es el
//! mecanismo, y seguiría siéndolo aunque el WS llegue.

use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Runtime};

use super::apply;
use super::manifest::BundleManifest;
use super::slots;

/// Host del canal por defecto. Mismo tenant que el updater nativo.
const DEFAULT_HUB: &str = "https://haido.releases.mks2508.systems";

/// Entre consultas. El hub no empuja todavía; 5 minutos es suficiente para un
/// canal cuyo objetivo es "en el próximo rato", no "ya".
const POLL_INTERVAL: Duration = Duration::from_secs(300);

/// Margen tras arrancar, para no competir con la carga inicial de la app.
const FIRST_POLL_DELAY: Duration = Duration::from_secs(60);

/// Evento que avisa al frontend de que hay un bundle listo para aplicar.
pub const BUNDLE_STAGED_EVENT: &str = "ota://bundle-staged";

/// Resultado que se comunica al hub tras intentar aplicar un bundle.
#[derive(Debug, Clone, Copy)]
pub enum Outcome {
    Applied,
    RolledBack,
}

impl Outcome {
    fn as_str(self) -> &'static str {
        match self {
            Self::Applied => "applied",
            Self::RolledBack => "rolled-back",
        }
    }
}

/// Informa al hub de cómo acabó un bundle.
///
/// El cliente revierte por su cuenta, así que sin esto un rollback en el bar es
/// indistinguible desde el hub de que el bundle no llegó a aplicarse nunca — que
/// es justo la diferencia que importa cuando algo va mal a distancia.
///
/// Es fire-and-forget: el resultado del envío no puede condicionar nada de lo que
/// haga la app. Si no hay red, se pierde el reporte y ya está.
pub fn report<R: Runtime>(
    app: AppHandle<R>,
    hub_bundle_id: String,
    outcome: Outcome,
    error: Option<String>,
) {
    tauri::async_runtime::spawn(async move {
        let Ok(device_id) = crate::license::generate_machine_fingerprint() else {
            return;
        };
        let mut payload = serde_json::json!({
            "deviceId": device_id,
            "outcome": outcome.as_str(),
        });
        if let Some(err) = error {
            payload["error"] = serde_json::Value::String(err);
        }

        let url = format!("{}/api/bundles/{hub_bundle_id}/report", hub_base());
        match reqwest::Client::new().post(&url).json(&payload).send().await {
            Ok(res) => println!("[ota] reportado {} al hub: {}", outcome.as_str(), res.status()),
            Err(err) => eprintln!("[ota] no se pudo reportar al hub: {err}"),
        }
        let _ = app;
    });
}

/// Base del hub. `TPV_OTA_HUB` permite apuntar a un hub local para probar el
/// canal entero sin publicar nada.
fn hub_base() -> String {
    std::env::var("TPV_OTA_HUB").unwrap_or_else(|_| DEFAULT_HUB.to_string())
}

/// Una pasada: consultar, y si hay algo aplicable, descargarlo y prepararlo.
///
/// Devuelve el id del slot preparado, o `None` si no había nada que hacer.
/// Cualquier error se registra y se traga: el canal parcial nunca debe impedir
/// que el TPV funcione.
async fn poll_once<R: Runtime>(app: &AppHandle<R>, native_version: &str, device_id: &str) -> Option<String> {
    let url = format!(
        "{}/api/bundles/latest?nativeVersion={native_version}&deviceId={device_id}",
        hub_base()
    );

    let response = match reqwest::get(&url).await {
        Ok(r) => r,
        Err(err) => {
            // Un bar se queda sin red constantemente: es ruido esperado, no un fallo.
            eprintln!("[ota] no se pudo consultar el hub: {err}");
            return None;
        }
    };

    // 204 = nada aplicable. Es la respuesta normal la mayoría de las veces.
    if response.status() == reqwest::StatusCode::NO_CONTENT {
        return None;
    }
    if !response.status().is_success() {
        eprintln!("[ota] el hub respondió {} al consultar bundles", response.status());
        return None;
    }

    let manifest: BundleManifest = match response.json().await {
        Ok(m) => m,
        Err(err) => {
            eprintln!("[ota] manifest ilegible: {err}");
            return None;
        }
    };

    let data_dir = app.path().app_data_dir().ok()?;
    let id = apply::slot_id(&manifest).ok()?;

    // Ya lo tenemos: ni descargar ni volver a descomprimir en cada vuelta.
    let state = slots::load_state(&data_dir);
    if state.active.as_deref() == Some(id.as_str()) || state.staged.as_deref() == Some(id.as_str()) {
        return None;
    }

    if let Err(err) = manifest.check_native_compatible(native_version) {
        eprintln!("[ota] el hub ofreció un bundle que no aplica a este binario: {err}");
        return None;
    }

    let zip = match reqwest::get(&manifest.url).await {
        Ok(r) => match r.bytes().await {
            Ok(b) => b,
            Err(err) => {
                eprintln!("[ota] descarga interrumpida: {err}");
                return None;
            }
        },
        Err(err) => {
            eprintln!("[ota] no se pudo descargar el bundle: {err}");
            return None;
        }
    };

    match apply::stage(&data_dir, &manifest, super::bundle_pubkey(), native_version, &zip) {
        Ok(staged) => {
            println!("[ota] bundle {} preparado ({} bytes)", manifest.bundle_version, zip.len());
            let _ = app.emit(BUNDLE_STAGED_EVENT, manifest.bundle_version.clone());
            Some(staged)
        }
        Err(err) => {
            // Firma mala, zip corrupto o incompatible: se queda sin aplicar y el
            // dispositivo sigue con lo que tenía.
            eprintln!("[ota] bundle rechazado: {err}");
            None
        }
    }
}

/// Arranca el bucle en segundo plano. No bloquea el arranque de la app.
pub fn spawn<R: Runtime>(app: AppHandle<R>, native_version: String, device_id: String) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(FIRST_POLL_DELAY).await;
        loop {
            poll_once(&app, &native_version, &device_id).await;
            tokio::time::sleep(POLL_INTERVAL).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_hub_es_configurable_para_poder_probar_el_canal() {
        // Un solo test: los dos casos comparten variable de entorno y cargo
        // ejecuta los tests en paralelo.
        std::env::remove_var("TPV_OTA_HUB");
        assert_eq!(hub_base(), DEFAULT_HUB);

        // Sin esta salida no hay forma de ejercitar el canal entero sin publicar.
        std::env::set_var("TPV_OTA_HUB", "http://127.0.0.1:8787");
        assert_eq!(hub_base(), "http://127.0.0.1:8787");
        std::env::remove_var("TPV_OTA_HUB");
    }
}
