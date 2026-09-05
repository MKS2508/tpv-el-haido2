// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod database;
mod discovery;
mod models;
mod ota;
mod license;
mod screenshot;
mod installer;
mod logger_file;

use std::fs;
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use serde_json::Value;

use database::Database;
use models::{Product, Category, Order, Table, User, ExportData, ImportData};
use models::license::{LicenseKey, LicenseStatus};
use models::audit::{AuditLog, AuditLogCreateRequest, AuditLogFilter, AuditLogExportOptions, AuditLogExportResult};
use license::{generate_machine_fingerprint, hash_license_key, validate_license_online};
use screenshot::{save_screenshot_from_base64, get_screenshots_dir};
use discovery::discover_printer;
use logger_file::{append_log_line, get_log_path, LogState};

// Database state
struct DbState {
    db: Mutex<Option<Database>>,
}

/// Evita la ventana en blanco de WebKitGTK cuando no hay ruta DMABUF utilizable.
///
/// El renderer DMABUF de WebKitGTK falla al reservar el buffer sobre NVIDIA por la
/// ruta X11 ("Failed to create GBM buffer"), y según el estado del driver eso se
/// manifiesta como compositing por software o directamente como ventana en
/// blanco. Desactivarlo devuelve una ventana que se ve, pero renderizada por CPU.
///
/// Por eso sólo se desactiva cuando NO hay sesión Wayland: ahí la ruta DMABUF sí
/// funciona y desactivarla costaría toda la aceleración (medido en
/// supermicro-pcbar: 173 MiB de GPU con DMABUF frente a no aparecer siquiera en
/// nvidia-smi sin él). El AppImage además se empaqueta forzando la ruta Wayland
/// cuando existe, ver `patchAppImageGtkHook` en scripts/build-release.ts.
///
/// Respeta un valor puesto desde fuera, para poder forzar cualquiera de las dos
/// rutas al diagnosticar.
#[cfg(target_os = "linux")]
fn ensure_webkit_renderer_usable() {
    let on_wayland = std::env::var("WAYLAND_DISPLAY").is_ok_and(|v| !v.is_empty());
    let already_set = std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_ok();

    if !on_wayland && !already_set {
        eprintln!(
            "[render] sin sesión Wayland: se desactiva el renderer DMABUF para evitar la ventana \
             en blanco. El compositing pasa a ser por software."
        );
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg(not(target_os = "linux"))]
fn ensure_webkit_renderer_usable() {}

/// Activa el bundle preparado. Lo llama el frontend, no el poller.
///
/// Quién decide CUÁNDO es el frontend a propósito: es el único que sabe si hay
/// un ticket a medias o una impresión en curso. El backend prepara; la caja
/// elige el hueco. Tras esto el frontend debe recargar la webview.
#[tauri::command]
fn ota_apply_staged(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let version = app.package_info().version.to_string();
    let activated = ota::apply::activate_staged(&data_dir, &version).map_err(|e| e.to_string())?;
    // Aplicar en caliente no consume un arranque, así que el contador no cubre
    // este caso: hace falta un temporizador que revierta si no confirma.
    ota::watchdog::arm_hot_apply(app.clone(), activated.clone());
    // Los slots viejos dejan de hacer falta en cuanto hay uno nuevo activo.
    let _ = ota::apply::prune(&data_dir);
    Ok(activated)
}

/// Estado del canal parcial, para que la UI pueda mostrarlo.
#[tauri::command]
fn ota_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let state = ota::slots::load_state(&data_dir);
    serde_json::to_value(state).map_err(|e| e.to_string())
}

/// El frontend confirma que ha montado sin romperse.
///
/// Sin esta llamada, el bundle activo no se da nunca por bueno y el watchdog
/// acaba revirtiéndolo: es el handshake que cierra el ciclo de rollback.
#[tauri::command]
fn ota_app_ready(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // Sólo se reporta la primera vez que este bundle confirma: en los arranques
    // siguientes ya está verificado y repetirlo llenaría el hub de ruido.
    let recien_confirmado = {
        let state = ota::slots::load_state(&data_dir);
        state.active.is_some() && !state.verified
    };
    ota::watchdog::mark_ready(&data_dir)?;

    if recien_confirmado {
        if let Some(version) = ota::slots::load_state(&data_dir).active_version {
            ota::poller::report(
                app.clone(),
                ota::poller::COMPONENT.to_string(),
                version,
                ota::poller::Outcome::Applied,
                None,
            );
        }
    }
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ==================== Database Initialization ====================

#[tauri::command]
async fn init_database(state: State<'_, DbState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    if db.is_some() {
        return Ok("Database already initialized".to_string());
    }
    Ok("Database initialized".to_string())
}

// ==================== Products ====================

#[tauri::command]
async fn get_products(state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.get_products().map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_product(state: State<'_, DbState>, product: Product) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.create_product(&product).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_product(state: State<'_, DbState>, product: Product) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.update_product(&product).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_product(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.delete_product(id).map_err(|e| e.to_string())
}

// ==================== Categories ====================

#[tauri::command]
async fn get_categories(state: State<'_, DbState>) -> Result<Vec<Category>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.get_categories().map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_category(state: State<'_, DbState>, category: Category) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.create_category(&category).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_category(state: State<'_, DbState>, category: Category) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.update_category(&category).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_category(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.delete_category(id).map_err(|e| e.to_string())
}

// ==================== Orders ====================

#[tauri::command]
async fn get_orders(state: State<'_, DbState>) -> Result<Vec<Order>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.get_orders().map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_order(state: State<'_, DbState>, order: Order) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.create_order(&order).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_order(state: State<'_, DbState>, order: Order) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.update_order(&order).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_order(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.delete_order(id).map_err(|e| e.to_string())
}

// ==================== Tables ====================

#[tauri::command]
async fn get_tables(state: State<'_, DbState>) -> Result<Vec<Table>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.get_tables().map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_table(state: State<'_, DbState>, table: Table) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.create_table(&table).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_table(state: State<'_, DbState>, table: Table) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.update_table(&table).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_table(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.delete_table(id).map_err(|e| e.to_string())
}

// ==================== Users ====================

#[tauri::command]
async fn get_users(state: State<'_, DbState>) -> Result<Vec<User>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.get_users().map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_user(state: State<'_, DbState>, user: User) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.create_user(&user).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_user(state: State<'_, DbState>, user: User) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.update_user(&user).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_user(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.delete_user(id).map_err(|e| e.to_string())
}

// ==================== Utility ====================

#[tauri::command]
async fn export_data(state: State<'_, DbState>) -> Result<ExportData, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.export_data().map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_data(state: State<'_, DbState>, data: ImportData) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.import_data(&data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_all_data(state: State<'_, DbState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.clear_all_data().map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_json_config(app: tauri::AppHandle, config: Value) -> Result<String, String> {
    // Tauri v2: use app.path() instead of app.path_resolver()
    let app_dir = app.path().app_data_dir().map_err(|e| format!("Failed to get app directory: {}", e))?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app directory: {}", e))?;

    let config_path = app_dir.join("printerSettings.json");

    // Write config file
    fs::write(&config_path, config.to_string())
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(format!("Configuration saved to: {}", config_path.display()))
}

#[tauri::command]
async fn read_json_config(app: tauri::AppHandle) -> Result<Option<Value>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| format!("Failed to get app directory: {}", e))?;
    let config_path = app_dir.join("printerSettings.json");

    if !config_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    let value: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    Ok(Some(value))
}

// ==================== License Commands ====================

#[tauri::command]
async fn check_license_status(state: State<'_, DbState>) -> Result<LicenseStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;

    match db.get_active_license().map_err(|e| e.to_string())? {
        Some(license) => {
            let now = chrono::Utc::now().timestamp();
            let is_valid = if let Some(expires) = license.expires_at {
                now < expires
            } else {
                true
            };

            let days_remaining = license.expires_at.map(|exp| (exp - now) / 86400);

            Ok(LicenseStatus {
                is_activated: true,
                is_valid,
                expires_at: license.expires_at,
                email: Some(license.email),
                days_remaining,
                license_type: Some(license.license_type),
                error_message: None,
            })
        }
        None => Ok(LicenseStatus {
            is_activated: false,
            is_valid: false,
            expires_at: None,
            email: None,
            days_remaining: None,
            license_type: None,
            error_message: Some("No license found".to_string()),
        })
    }
}

#[tauri::command]
async fn validate_and_activate_license(
    key: String,
    email: String,
    state: State<'_, DbState>
) -> Result<LicenseStatus, String> {
    let machine_fingerprint = generate_machine_fingerprint()?;

    // Check if these are master credentials (local validation, no server required)
    let master_email = std::env::var("MASTER_LICENSE_EMAIL").unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            "admin@haido.local".to_string()
        } else {
            panic!("MASTER_LICENSE_EMAIL no seteada en build de producción — requerida para validar licencia master (ver CLAUDE.md § License System)")
        }
    });
    let master_key = std::env::var("MASTER_LICENSE_KEY").unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            "HAI-MASTER-DEV-KEY-2026".to_string()
        } else {
            panic!("MASTER_LICENSE_KEY no seteada en build de producción — requerida para validar licencia master (ver CLAUDE.md § License System)")
        }
    });

    if email == master_email && key == master_key {
        // Master license is valid - no online connection required
        let key_hash = hash_license_key(&key);

        let license = LicenseKey {
            key_hash,
            email: master_email.clone(),
            machine_fingerprint,
            activated_at: chrono::Utc::now().timestamp(),
            expires_at: None, // Never expires
            is_active: true,
            license_type: "master".to_string(),
        };

        let db = state.db.lock().map_err(|e| e.to_string())?;
        let db = db.as_ref().ok_or("Database not initialized")?;
        db.save_license(&license).map_err(|e| e.to_string())?;

        return Ok(LicenseStatus {
            is_activated: true,
            is_valid: true,
            expires_at: None,
            email: Some(master_email),
            days_remaining: None, // Indicates perpetual license
            license_type: Some("master".to_string()),
            error_message: None,
        });
    }

    // Continue with normal online validation...
    let response = validate_license_online(key.clone(), email.clone(), machine_fingerprint.clone()).await?;

    if !response.valid {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let db = db.as_ref().ok_or("Database not initialized")?;

        let key_hash = hash_license_key(&key);
        db.update_license_status(&key_hash, false).map_err(|e| e.to_string())?;

        return Ok(LicenseStatus {
            is_activated: false,
            is_valid: false,
            expires_at: response.expires_at,
            email: Some(response.user_email.clone()),
            days_remaining: response.expires_at.map(|exp| {
                let now = chrono::Utc::now().timestamp();
                (exp - now) / 86400
            }),
            license_type: Some(response.license_type),
            error_message: response.error,
        });
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;

    let license = LicenseKey {
        key_hash: hash_license_key(&key),
        email: response.user_email.clone(),
        machine_fingerprint,
        activated_at: chrono::Utc::now().timestamp(),
        expires_at: response.expires_at,
        is_active: true,
        license_type: response.license_type.clone(),
    };

    db.save_license(&license).map_err(|e| e.to_string())?;

    let days_remaining = response.expires_at.map(|exp| {
        let now = chrono::Utc::now().timestamp();
        (exp - now) / 86400
    });

    Ok(LicenseStatus {
        is_activated: true,
        is_valid: true,
        expires_at: response.expires_at,
        email: Some(response.user_email),
        days_remaining,
        license_type: Some(response.license_type),
        error_message: None,
    })
}

#[tauri::command]
async fn get_machine_fingerprint() -> Result<String, String> {
    generate_machine_fingerprint()
}

#[tauri::command]
async fn clear_license(state: State<'_, DbState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.clear_license().map_err(|e| e.to_string())
}

// ==================== App State ====================

#[tauri::command]
async fn get_app_state(state: State<'_, DbState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.get_app_state(&key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_app_state(state: State<'_, DbState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.set_app_state(&key, &value).map_err(|e| e.to_string())
}

// ==================== Audit Logs ====================

#[tauri::command]
async fn create_audit_log(
    state: State<'_, DbState>,
    request: AuditLogCreateRequest,
) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.create_audit_log(request).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_audit_logs(
    state: State<'_, DbState>,
    filter: Option<AuditLogFilter>,
) -> Result<Vec<AuditLog>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.get_audit_logs(filter).map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_audit_logs(
    state: State<'_, DbState>,
    options: AuditLogExportOptions,
) -> Result<AuditLogExportResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.export_audit_logs(options).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cleanup_audit_logs(
    state: State<'_, DbState>,
    cutoff_date: String,
) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;
    db.cleanup_audit_logs(&cutoff_date).map_err(|e| e.to_string())
}

/// URL del hub para este componente.
/// El hub shape es `GET /api/components/{c}/latest?target={os}&arch={arch}` (ADR-0045 D8).
/// Waxin lock 2026-08-29: TPV CI matrix = linux-x64 + linux-arm64 + windows-x64.
/// macOS queda en el shape para builds locales pero no en CI.
#[cfg(target_os = "linux")]
const TPV_HUB_LATEST_URL: &str = "https://haido.releases.mks2508.systems/api/components/tpv-el-haido/latest?target=linux&arch=x86_64";

#[cfg(target_os = "windows")]
const TPV_HUB_LATEST_URL: &str = "https://haido.releases.mks2508.systems/api/components/tpv-el-haido/latest?target=windows&arch=x86_64";

#[cfg(target_os = "macos")]
const TPV_HUB_LATEST_URL: &str = "https://haido.releases.mks2508.systems/api/components/tpv-el-haido/latest?target=darwin&arch=x86_64";

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
const TPV_HUB_LATEST_URL: &str = "https://haido.releases.mks2508.systems/api/components/tpv-el-haido/latest?target=any&arch=any";

/// Bare base64 minisign pubkey — segunda línea de
/// `tauri-keys/tpv-el-haido.key.pub` (key id `3BDF42C4B23623D2`).
/// Waxin lock 2026-08-28: TPV NO se rotó con wraith-linux esos días
/// (la rotation event solo afectó `wraith-*` y `mks-agentics`).
/// Hardcodeamos el BASE64-of-the-file, que es público (es la pubkey
/// tracked en `tauri-keys/tpv-el-haido.key.pub` desde `adfc5bf`).
const TPV_OTA_PUBKEY: &str = "RWTSIzayxELfO5VU3bpUnjiycxqhvdT3C95KUqkXKhogRtLKwuXgLZgt";

#[tauri::command]
async fn check_full_update(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let current_version = app.package_info().version.to_string();
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("build http client: {e}"))?;
    let resp = http_client.get(TPV_HUB_LATEST_URL).send().await
        .map_err(|e| format!("hub fetch failed: {e}"))?;
    let http_status = resp.status().as_u16();
    if !resp.status().is_success() {
        return Ok(serde_json::json!({
            "httpStatus": http_status,
            "currentVersion": current_version,
            "updateAvailable": false,
            "remote": null,
        }));
    }
    let body: serde_json::Value = resp.json().await
        .map_err(|e| format!("bad response body: {e}"))?;
    let manifest: mks_ota::HubLatest = serde_json::from_value(body.clone())
        .map_err(|e| format!("bad manifest shape: {e}"))?;
    let update_available = manifest.is_newer_than(&current_version)
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "httpStatus": http_status,
        "currentVersion": current_version,
        "updateAvailable": update_available,
        "remote": body,
    }))
}

#[tauri::command]
async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    let current_version = app.package_info().version.to_string();
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("build http client: {e}"))?;
    let resp = http_client.get(TPV_HUB_LATEST_URL).send().await
        .map_err(|e| format!("hub fetch failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("hub returned HTTP {}", resp.status()));
    }
    let body: serde_json::Value = resp.json().await
        .map_err(|e| format!("bad response body: {e}"))?;
    let manifest: mks_ota::HubLatest = serde_json::from_value(body.clone())
        .map_err(|e| format!("bad manifest shape: {e}"))?;
    if !manifest.is_newer_than(&current_version).map_err(|e| e.to_string())? {
        return Err("already up to date — refusing to reinstall the same or an older version".to_string());
    }

    let url = manifest.url.clone();
    let expected_sha256 = manifest.sha256_hex().map(|s| s.to_string());
    let signature = manifest.signature.clone();
    let dest = std::env::temp_dir().join(format!("tpv-ota-{}.tar.gz", manifest.version));

    let _ = app.emit("ota-stage", "downloading");
    let app_progress = app.clone();
    let dest_for_download = dest.clone();
    let outcome = tauri::async_runtime::spawn_blocking(move || {
        mks_ota::download::download(&url, &dest_for_download, expected_sha256.as_deref(), |p| {
            let _ = app_progress.emit(
                "ota-download-progress",
                serde_json::json!({ "downloaded": p.downloaded, "total": p.total }),
            );
        })
    })
    .await
    .map_err(|e| format!("download task panicked: {e}"))?
    .map_err(|e| format!("download failed: {e}"))?;

    let cleanup_archive = || { let _ = std::fs::remove_file(&outcome.path); };

    let _ = app.emit("ota-stage", "verifying");
    let verify_path = outcome.path.clone();
    let verify_result = tauri::async_runtime::spawn_blocking(move || {
        mks_ota::verify::verify_stream_from_file(&verify_path, &signature, TPV_OTA_PUBKEY)
    })
    .await
    .map_err(|e| format!("verify task panicked: {e}"))?;
    if let Err(e) = verify_result {
        cleanup_archive();
        return Err(format!("signature verification failed: {e}"));
    }

    let _ = app.emit("ota-stage", "installing");
    // Dispatch por plataforma en COMPILE time: mks-ota v0.3.0 gatea full::macos y
    // full::linux con #[cfg(target_os=...)] — un if cfg!(...) runtime se compila en
    // todas las plataformas y rompe (E0433) donde el módulo del crate no existe.
    let install_result: Result<(), String> = {
        #[cfg(target_os = "macos")]
        {
            let app_bundle = mks_ota::install::full::macos::current_app_bundle()
                .map_err(|e: mks_ota::error::OtaError| { cleanup_archive(); e.to_string() })?;
            let archive_path = outcome.path.clone();
            let install_bundle = app_bundle.clone();
            tauri::async_runtime::spawn_blocking(move || {
                mks_ota::install::full::macos::install(&archive_path, &install_bundle)
            })
            .await
            .map_err(|e| format!("install task panicked: {e}"))?
            .map_err(|e: mks_ota::error::OtaError| format!("install failed: {e}"))?;
            let _ = app.emit("ota-stage", "relaunching");
            mks_ota::install::full::macos::relaunch(&app_bundle).map_err(|e: mks_ota::error::OtaError| e.to_string())?;
            Ok(())
        }
        #[cfg(not(target_os = "macos"))]
        {
            // Linux and other platforms
            #[cfg(target_os = "linux")]
            {
                let app_bundle = mks_ota::install::full::linux::current_app_bundle()
                    .map_err(|e: mks_ota::error::OtaError| { cleanup_archive(); e.to_string() })?;
                let archive_path = outcome.path.clone();
                let install_bundle = app_bundle.clone();
                tauri::async_runtime::spawn_blocking(move || {
                    mks_ota::install::full::linux::install(&archive_path, &install_bundle)
                })
                .await
                .map_err(|e| format!("install task panicked: {e}"))?
                .map_err(|e: mks_ota::error::OtaError| format!("install failed: {e}"))?;
                let _ = app.emit("ota-stage", "relaunching");
                mks_ota::install::full::linux::relaunch(&app_bundle).map_err(|e: mks_ota::error::OtaError| e.to_string())?;
                Ok(())
            }
            #[cfg(not(any(target_os = "linux", target_os = "macos")))]
            {
                cleanup_archive();
                Err(format!(
                    "full-package OTA install is not supported on this platform ({}); only macOS and Linux are wired (ADR-0046)",
                    std::env::consts::OS,
                ))
            }
        }
    };
    if let Err(e) = install_result {
        cleanup_archive();
        return Err(e);
    }
    cleanup_archive();
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_webkit_renderer_usable();

    tauri::Builder::default()
        .register_asynchronous_uri_scheme_protocol(ota::SCHEME, ota::protocol::handle)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Antes de servir nada: un slot instalado por un binario anterior no
            // puede sobrevivir a una actualización nativa.
            if let Ok(data_dir) = app.path().app_data_dir() {
                let native_version = app.package_info().version.to_string();
                ota::slots::invalidate_if_native_changed(&data_dir, &native_version);
                // Consume un intento de arranque y revierte si el bundle activo
                // lleva demasiados sin confirmar. Va antes de crear la ventana:
                // si revierte, el protocolo ya tiene que servir el slot anterior.
                // Se captura la version antes de reconciliar: si revierte, el
                // estado ya no la tendrá y no habría nada que reportar.
                let version_previa = ota::slots::load_state(&data_dir).active_version;
                let arranque = ota::watchdog::reconcile_boot(&data_dir);
                println!("[ota] arranque: {arranque:?}");

                if let (ota::watchdog::BootOutcome::RolledBack { .. }, Some(version)) =
                    (&arranque, version_previa)
                {
                    ota::poller::report(
                        app.handle().clone(),
                        ota::poller::COMPONENT.to_string(),
                        version,
                        ota::poller::Outcome::RolledBack,
                        Some("no confirmó app-ready en los arranques concedidos".into()),
                    );
                }

                // El canal parcial no debe poder impedir que el TPV arranque: si
                // no hay fingerprint, simplemente no se consulta al hub.
                match license::generate_machine_fingerprint() {
                    Ok(device_id) => {
                        ota::poller::spawn(app.handle().clone(), native_version, device_id)
                    }
                    Err(err) => eprintln!("[ota] sin fingerprint, canal parcial desactivado: {err}"),
                }
            }

            // En dev la ventana sigue apuntando al dev server de Vite (HMR): el
            // esquema OTA sirve del frontend embebido, que en dev no existe.
            let window_url = if tauri::is_dev() {
                // El cfg `dev` es `!feature("custom-protocol")`, no el perfil de
                // cargo: un `cargo build --release` a secas cae aquí y manda la
                // ventana al dev server. Sin Vite detrás eso es una pantalla en
                // blanco sin causa visible, así que se dice en voz alta.
                eprintln!(
                    "[ota] build dev: la ventana carga del dev server (:1420), no del esquema {}. \
                     Para probar el canal OTA: cargo build --release --features tauri/custom-protocol",
                    ota::SCHEME
                );
                tauri::WebviewUrl::default()
            } else {
                let url = ota::protocol::window_url();
                let parsed = url
                    .parse()
                    .map_err(|e| format!("URL de ventana inválida ({url}): {e}"))?;
                tauri::WebviewUrl::CustomProtocol(parsed)
            };
            tauri::WebviewWindowBuilder::new(app, "main", window_url)
                .title("TPV: El Haido")
                .inner_size(1200.0, 800.0)
                .build()?;

            // Tauri v2: use app.path() instead of app.path_resolver()
            let app_dir = app.path().app_data_dir().expect("Failed to get app directory");
            fs::create_dir_all(&app_dir).expect("Failed to create app directory");

            // Initialize database
            let db_path = app_dir.join("tpv-haido.db");
            println!("Initializing database at: {}", db_path.display());

            let db = Database::new(db_path).expect("Failed to initialize database");

            // Store database in state
            app.manage(DbState {
                db: Mutex::new(Some(db)),
            });

            println!("Database initialized successfully");

            // Initialize log state (file at {app_data_dir}/logs/tpv-haido.log)
            app.manage(LogState::new(app_dir.clone()));
            println!("Log state initialized: {}/logs/tpv-haido.log", app_dir.display());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            init_database,
            ota_app_ready,
            ota_apply_staged,
            ota_status,
            // Impresora
            discover_printer,
            // Products
            get_products,
            create_product,
            update_product,
            delete_product,
            // Categories
            get_categories,
            create_category,
            update_category,
            delete_category,
            // Orders
            get_orders,
            create_order,
            update_order,
            delete_order,
            // Tables
            get_tables,
            create_table,
            update_table,
            delete_table,
            // Users
            get_users,
            create_user,
            update_user,
            delete_user,
            // Utility
            export_data,
            import_data,
            clear_all_data,
            write_json_config,
            read_json_config,
            // License
            check_license_status,
            validate_and_activate_license,
            get_machine_fingerprint,
            clear_license,
            // App State
            get_app_state,
            set_app_state,
            // Screenshot
            save_screenshot_from_base64,
            get_screenshots_dir,
            // Log file
            append_log_line,
            get_log_path,
            // Audit Logs
            create_audit_log,
            get_audit_logs,
            export_audit_logs,
            cleanup_audit_logs,
            // Full OTA update (mks-ota v0.3.0)
            check_full_update,
            download_and_install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Modo installer — TR-19.A.2 + TR-19.B (sidecar pattern, ver r7).
///
/// `./tpv-el-haido --install` monta el wizard installer en lugar del POS. La
/// diferencia con `run()`:
///
/// 1. WebviewWindow con label `"installer"` (POS usa `"main"`) — el frontend
///    distingue modo por label y monta `<InstallerApp />` en `src/main.tsx`.
/// 2. No monta la DB ni el OTA poller — el installer es stateless y vive sólo
///    lo que tarde la operación de download/install. El poller OTA sería
///    misleading dentro de un install.
/// 3. `invoke_handler` registra los IPC handlers reales de `installer::*`
///    (`download`/`install`/`rollback`/`uninstall`). El frontend los invoca
///    con prefijo `installer:download`, `installer:install`, etc.
///
/// Capabilities de los IPC NO se exponen vía `tauri.conf.json` en este TR — eso
/// es TR-19.A.3. Mientras tanto los handlers están registrados en el builder
/// y Tauri 2 los deja pasar si están en `invoke_handler` (default allowlist).
///
/// ## Sobre la firma (`Context` por parámetro)
///
/// A diferencia de `run()`, esta función recibe el `Context` ya construido
/// desde fuera. Razón: el macro `tauri::generate_context!()` emite un static
/// por call-site (e.g. `_EMBED_INFO_PLIST`); si `run()` y
/// `run_installer_mode()` lo invocan ambos, el linker falla por símbolo
/// duplicado. `main.rs` es el único sitio que debe llamarlo (la matriz es
/// 1 binario × 1 contexto). Tests saltan este path bajo `cfg(not(test))`.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run_installer_mode(context: tauri::Context) {
    #[cfg(not(test))]
    {
        tauri::Builder::default()
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_dialog::init())
            .setup(|app| {
                tauri::WebviewWindowBuilder::new(
                    app,
                    "installer",
                    tauri::WebviewUrl::App("index.html".into()),
                )
                .title("TPV El Haido — Installer")
                .inner_size(800.0, 600.0)
                .resizable(false)
                .center()
                .build()?;

                println!("[installer] sidecar wizard mounted (real IPC handlers — TR-19.B)");

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                installer::download,
                installer::install,
                installer::rollback,
                installer::uninstall,
            ])
            .run(context)
            .expect("error while running tauri application in installer mode");
    }

    #[cfg(test)]
    {
        // No-op: la lógica real está probada a nivel de módulo (`mod installer`).
        // El builder de Tauri no se puede instanciar dentro de
        // `cargo test --lib` sin chocar con `run()` por el static que
        // `generate_context!()` emite en cada call site.
        let _ = context;
        eprintln!("[installer] run_installer_mode: skipped in test build");
    }
}
