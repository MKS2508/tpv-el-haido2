//! Custom URI scheme que sirve el frontend.
//!
//! La ventana carga SIEMPRE desde este esquema, tanto si hay bundle OTA como si
//! no. El origin de la webview no cambia nunca: alternar entre `tauri://` y este
//! esquema según hubiera bundle tiraría `localStorage` (onboarding, tema, modo de
//! almacenamiento) en cada swap. Quién sirve qué se decide aquí dentro.

use std::fs;
use std::path::Path;

use tauri::http;
use tauri::{Manager, Runtime, UriSchemeContext, UriSchemeResponder};

use super::slots;

/// Nombre del esquema. En macOS/Linux la webview verá `tpvapp://localhost/...`;
/// en Windows, `http://tpvapp.localhost/...`.
pub const SCHEME: &str = "tpvapp";

/// URL desde la que carga la ventana principal.
///
/// Tauri usa el valor de `WebviewUrl::CustomProtocol` tal cual, sin adaptarlo por
/// plataforma, y el esquema no se registra igual en todas: en Windows y Android
/// vive bajo `http://<esquema>.localhost`. Por eso la ventana se construye en
/// Rust y no desde `tauri.conf.json`, que no admite un valor por plataforma.
pub fn window_url() -> String {
    if cfg!(any(windows, target_os = "android")) {
        format!("http://{SCHEME}.localhost")
    } else {
        format!("{SCHEME}://localhost")
    }
}

/// Content-Type por extensión.
///
/// No es un adorno: un `.js` servido con el MIME equivocado hace que el navegador
/// rechace el módulo ES y la app arranque en blanco sin error claro.
fn mime_for(path: &str) -> &'static str {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match ext.as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" | "map" => "application/json; charset=utf-8",
        "wasm" => "application/wasm",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

/// Extrae la ruta del recurso pedido, sin query ni fragmento.
fn request_path(uri: &str) -> String {
    let without_scheme = uri.split("://").nth(1).unwrap_or(uri);
    let path = without_scheme.find('/').map_or("/", |i| &without_scheme[i..]);
    let path = path.split(['?', '#']).next().unwrap_or("/");

    if path.is_empty() || path == "/" {
        "/index.html".to_string()
    } else {
        path.to_string()
    }
}

fn respond(responder: UriSchemeResponder, status: u16, mime: &str, body: Vec<u8>) {
    let response = http::Response::builder()
        .status(status)
        .header("Content-Type", mime)
        // La webview es el único cliente de este esquema; el bundle no debe poder
        // ser embebido por nadie más.
        .header("X-Content-Type-Options", "nosniff")
        .body(body);

    match response {
        Ok(res) => responder.respond(res),
        Err(err) => eprintln!("[ota] no se pudo construir la respuesta: {err}"),
    }
}

/// Handler del esquema: sirve del slot activo si lo hay, y si no del frontend
/// embebido en el binario.
///
/// El embebido es la red de seguridad y siempre está disponible: cualquier fallo
/// leyendo el slot cae ahí en vez de dejar la ventana en blanco.
pub fn handle<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: http::Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let path = request_path(&request.uri().to_string());
    let app = ctx.app_handle();

    let from_slot = app
        .path()
        .app_data_dir()
        .ok()
        .and_then(|data_dir| {
            let state = slots::load_state(&data_dir);
            let slot_dir = slots::active_dir(&data_dir, &state)?;
            let file = slots::resolve_within(&slot_dir, &path)?;
            match fs::read(&file) {
                Ok(bytes) => Some(bytes),
                Err(err) => {
                    eprintln!("[ota] no se pudo leer {} del slot: {err}", file.display());
                    None
                }
            }
        });

    if let Some(bytes) = from_slot {
        respond(responder, 200, mime_for(&path), bytes);
        return;
    }

    // Frontend embebido. `asset_resolver` espera la ruta sin barra inicial.
    let embedded_path = path.trim_start_matches('/').to_string();
    if let Some(asset) = app.asset_resolver().get(embedded_path) {
        respond(responder, 200, &asset.mime_type.clone(), asset.bytes);
        return;
    }

    respond(
        responder,
        404,
        "text/plain; charset=utf-8",
        format!("No encontrado: {path}").into_bytes(),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn la_raiz_resuelve_a_index() {
        assert_eq!(request_path("tpvapp://localhost/"), "/index.html");
        assert_eq!(request_path("tpvapp://localhost"), "/index.html");
        assert_eq!(request_path("http://tpvapp.localhost/"), "/index.html");
    }

    #[test]
    fn se_descartan_query_y_fragmento() {
        assert_eq!(request_path("tpvapp://localhost/app.js?v=3"), "/app.js");
        assert_eq!(request_path("tpvapp://localhost/a.css#top"), "/a.css");
    }

    #[test]
    fn rutas_anidadas_se_conservan() {
        assert_eq!(request_path("tpvapp://localhost/assets/index-a1b2.js"), "/assets/index-a1b2.js");
    }

    #[test]
    fn los_modulos_es_salen_con_su_mime() {
        // Servir JS como octet-stream deja la app en blanco sin error legible.
        assert!(mime_for("/assets/index.js").starts_with("text/javascript"));
        assert!(mime_for("/assets/index.mjs").starts_with("text/javascript"));
        assert!(mime_for("/index.html").starts_with("text/html"));
        assert!(mime_for("/a.css").starts_with("text/css"));
        assert_eq!(mime_for("/f.woff2"), "font/woff2");
        assert_eq!(mime_for("/x.desconocido"), "application/octet-stream");
    }

    #[test]
    fn el_mime_no_depende_de_mayusculas() {
        assert!(mime_for("/LOGO.PNG").starts_with("image/png"));
    }
}
