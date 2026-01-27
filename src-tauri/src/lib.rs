// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod database;
mod models;

use std::fs;
use std::sync::Mutex;
use tauri::Manager;
use tauri::State;
use serde_json::Value;

use database::Database;
use models::{Product, Category, Order, Table, User, ExportData, ImportData};

// Database state
struct DbState {
    db: Mutex<Option<Database>>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            init_database,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
