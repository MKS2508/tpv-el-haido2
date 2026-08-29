//! Poller del canal OTA parcial contra el hub de releases.
//!
//! El canal parcial usa el endpoint `components` (ADR-0045 D8-B / L3): una URL
//! por plataforma-agnostic con `target=any&arch=any`. Antes de D10-D este
//! archivo vivía contra el endpoint `bundles`; tras la migración, el cliente
//! consume exactamente la misma shape que `wraith-linux` consume para el
//! updater nativo (`tauri-plugin-updater` o `mks-ota` full). El hub queda
//! agnóstico del artefacto.
//!
//! Ver `docs/jarvis/ota-crate-design-2026-08-28.md` §3.

use std::path::PathBuf;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Runtime};

use mks_ota::install::partial::{self, slots};
use mks_ota::manifest::{partial_latest_url, HubLatest};

use super::bundle_pubkey;

pub const BUNDLE_STAGED_EVENT: &str = "ota://bundle-staged";

/// Resultado de aplicar un bundle, lo que se reporta al hub como telemetría.
///
/// El hub no contesta sobre esto: si no hay red o el endpoint no existe, se
/// pierde y ya. La diferencia que importa desde el hub (¿se aplicó o se
/// rechazó?) no es accionable desde el cliente.
#[derive(Debug, Clone, Copy)]
pub enum Outcome {
    Applied,
    RolledBack,
}

impl Outcome {
    pub fn as_str(self) -> &'static str {
        match self {
            Outcome::Applied => "applied",
            Outcome::RolledBack => "rolled-back",
        }
    }
}

/// Base del hub. `TPV_OTA_HUB` permite apuntar a un hub local para probar el
/// canal entero sin publicar nada.
const DEFAULT_HUB: &str = "https://haido.releases.mks2508.systems";

/// Intervalo entre consultas cuando no había nada aplicable.
const POLL_INTERVAL: Duration = Duration::from_secs(60 * 15);

/// Demora del primer poll para no coincidir con el arranque del binario.
const FIRST_POLL_DELAY: Duration = Duration::from_secs(15);

/// Nombre del componente en el canal `components` (L3). Lo publica el workflow
/// `ota-bundle-deploy.yml`. Público porque `lib.rs` lo pasa al reporter.
pub const COMPONENT: &str = "haido-frontend";

/// Reporta al hub el resultado de aplicar un bundle. Fire-and-forget.
///
/// El cliente revierte por su cuenta, así que sin esto un rollback en el bar
/// es indistinguible desde el hub de que el bundle no llegó a aplicarse
/// nunca — que es justo la diferencia que importa cuando algo va mal a
/// distancia. Si el endpoint no existe todavía en el hub (migración
/// `bundles`→`components` en curso), el `eprintln` lo dice y se pierde: por
/// diseño.
pub fn report<R: Runtime>(
    app: AppHandle<R>,
    component: String,
    version: String,
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

        let url = format!(
            "{}/api/components/{component}/{version}/report",
            hub_base()
        );
        match reqwest::Client::new().post(&url).json(&payload).send().await {
            Ok(res) => println!("[ota] reportado {} al hub: {}", outcome.as_str(), res.status()),
            Err(err) => eprintln!("[ota] no se pudo reportar al hub: {err}"),
        }
        let _ = app;
    });
}

fn hub_base() -> String {
    std::env::var("TPV_OTA_HUB").unwrap_or_else(|_| DEFAULT_HUB.to_string())
}

/// Una pasada: consultar, y si hay algo aplicable, descargarlo y prepararlo.
///
/// Devuelve el id del slot preparado, o `None` si no había nada que hacer.
/// Cualquier error se registra y se traga: el canal parcial nunca debe
/// impedir que el TPV funcione.
async fn poll_once<R: Runtime>(
    app: &AppHandle<R>,
    native_version: &str,
    _device_id: &str,
) -> Option<String> {
    let url = partial_latest_url(&hub_base(), COMPONENT);

    let response = match reqwest::get(&url).await {
        Ok(r) => r,
        Err(err) => {
            // Un bar se queda sin red constantemente: es ruido esperado, no
            // un fallo.
            eprintln!("[ota] no se pudo consultar el hub: {err}");
            return None;
        }
    };

    // 204 = nada aplicable. Es la respuesta normal la mayoría de las veces.
    if response.status() == reqwest::StatusCode::NO_CONTENT {
        return None;
    }
    if !response.status().is_success() {
        eprintln!("[ota] el hub respondió {} al consultar components", response.status());
        return None;
    }

    let latest: HubLatest = match response.json().await {
        Ok(m) => m,
        Err(err) => {
            eprintln!("[ota] manifest ilegible: {err}");
            return None;
        }
    };

    let data_dir = app.path().app_data_dir().ok()?;
    let state = slots::load_state(&data_dir);

    // Ya lo tenemos activo o staged: ni descargar ni volver a descomprimir en
    // cada vuelta.
    if state.active_version.as_deref() == Some(latest.version.as_str())
        || state.staged_version.as_deref() == Some(latest.version.as_str())
    {
        return None;
    }

    // El hub nunca debería servir un downgrade — pero la regla la pone el
    // cliente, no el hub.
    match latest.is_newer_than(native_version) {
        Ok(true) => {}
        Ok(false) => {
            eprintln!("[ota] el hub ofreció {} que no es más nuevo que el binario {native_version}; se ignora", latest.version);
            return None;
        }
        Err(err) => {
            eprintln!("[ota] version del hub ilegible ({latest_version}): {err}", latest_version = latest.version);
            return None;
        }
    }

    let tmp = match download_to_temp(&latest).await {
        Some(p) => p,
        None => return None,
    };

    let pubkey = bundle_pubkey();
    match partial::stage(&data_dir, &latest, &tmp, pubkey) {
        Ok(staged) => {
            println!("[ota] bundle {} preparado (slot {staged})", latest.version);
            let _ = app.emit(BUNDLE_STAGED_EVENT, &latest.version);
            let _ = std::fs::remove_file(&tmp);
            Some(staged)
        }
        Err(err) => {
            // Firma mala, zip corrupto, hash incorrecto o escape: se queda
            // sin aplicar y el dispositivo sigue con lo que tenía.
            eprintln!("[ota] bundle {} rechazado: {err}", latest.version);
            let _ = std::fs::remove_file(&tmp);
            None
        }
    }
}

async fn download_to_temp(latest: &HubLatest) -> Option<PathBuf> {
    let response = match reqwest::get(&latest.url).await {
        Ok(r) => r,
        Err(err) => {
            eprintln!("[ota] no se pudo descargar el bundle: {err}");
            return None;
        }
    };
    let bytes = match response.bytes().await {
        Ok(b) => b,
        Err(err) => {
            eprintln!("[ota] descarga interrumpida: {err}");
            return None;
        }
    };

    // El nombre lleva el id del componente + version para que `releases/` en
    // /tmp no mezcle artefactos de pruebas distintas.
    let dir = std::env::temp_dir().join("tpv-el-haido-ota");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(format!("{}-{}.zip", latest.component, latest.version));
    if let Err(err) = std::fs::write(&path, &bytes) {
        eprintln!("[ota] no se pudo escribir el zip temporal: {err}");
        return None;
    }
    Some(path)
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
        std::env::remove_var("TPV_OTA_HUB");
        assert_eq!(hub_base(), DEFAULT_HUB);

        std::env::set_var("TPV_OTA_HUB", "http://127.0.0.1:8787");
        assert_eq!(hub_base(), "http://127.0.0.1:8787");
        std::env::remove_var("TPV_OTA_HUB");
    }

    #[test]
    fn partial_latest_url_pinneado_a_la_convencion_l3() {
        let url = partial_latest_url("https://haido.releases.mks2508.systems", COMPONENT);
        assert_eq!(
            url,
            "https://haido.releases.mks2508.systems/api/components/haido-frontend/latest?target=any&arch=any"
        );
    }

    #[test]
    fn outcome_serializa_a_la_string_que_espera_el_hub() {
        assert_eq!(Outcome::Applied.as_str(), "applied");
        assert_eq!(Outcome::RolledBack.as_str(), "rolled-back");
    }
}
