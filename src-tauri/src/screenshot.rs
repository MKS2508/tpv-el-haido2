use std::fs;
use base64::Engine;
use tauri::Manager;

#[derive(serde::Deserialize)]
pub struct ScreenshotRequest {
    pub filename: String,
    pub save_to_downloads: bool,
    pub image_data: String, // base64 data URL del frontend
}

#[tauri::command]
pub fn save_screenshot_from_base64(
    app: tauri::AppHandle,
    request: ScreenshotRequest,
) -> Result<String, String> {
    // Extraer los datos base64 del data URL
    let base64_data = request.image_data
        .strip_prefix("data:image/png;base64,")
        .ok_or("Formato de imagen inválido")?;

    // Decodificar base64
    let png_bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Error decodificando base64: {}", e))?;

    let save_dir = if request.save_to_downloads {
        // Guardar en la carpeta de Descargas del usuario
        app.path().download_dir()
            .map_err(|e| format!("Error obteniendo directorio de descargas: {}", e))?
    } else {
        // Guardar en carpeta screenshots de la app
        app.path().app_data_dir()
            .map_err(|e| format!("Error obteniendo directorio de la app: {}", e))?
            .join("screenshots")
    };

    fs::create_dir_all(&save_dir)
        .map_err(|e| format!("Error creando directorio: {}", e))?;

    let file_path = save_dir
        .join(format!("{}.png", request.filename))
        .to_str()
        .unwrap_or_default()
        .to_string();

    fs::write(&file_path, &png_bytes)
        .map_err(|e| format!("Error guardando archivo: {}", e))?;

    println!("[Screenshot] Guardada en: {}", file_path);

    Ok(file_path)
}

#[tauri::command]
pub fn get_screenshots_dir(app: tauri::AppHandle) -> Result<String, String> {
    let screenshots_dir = app.path().app_data_dir()
        .map_err(|e| format!("Error obteniendo directorio de la app: {}", e))?
        .join("screenshots");

    fs::create_dir_all(&screenshots_dir)
        .map_err(|e| format!("Error creando directorio screenshots: {}", e))?;

    Ok(screenshots_dir.to_str().unwrap_or_default().to_string())
}
