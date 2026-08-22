// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Gate `--install` — TR-19.A.2 sidecar pattern (ver r7).
///
/// `./tpv-el-haido --install` monta el wizard installer (`run_installer_mode`)
/// en vez del POS normal (`run`). Sin flag, comportamiento intacto.
///
/// Se detecta por igualdad exacta de string sobre `std::env::args()`: el binario
/// no depende del plugin `cli` (no se quiere una surface area extra para un flag
/// único). TR-19.D sumará `--uninstall` por la misma ruta.
///
/// ## Sobre el contexto (`tauri::generate_context!()` aquí)
///
/// El macro emite un static por call-site; si lo invocaran dos funciones del
/// lib (e.g. `run()` y `run_installer_mode()`), el linker choca con
/// `_EMBED_INFO_PLIST` duplicado. Por eso `main.rs` es el único que lo llama y
/// le pasa el `Context` al modo elegido (TR-19.B fix).
fn main() {
    let context = tauri::generate_context!();
    if std::env::args().any(|a| a == "--install") {
        tpv_el_haido_lib::run_installer_mode(context);
    } else {
        tpv_el_haido_lib::run();
        drop(context); // explicit drop para silenciar el unused warning en run()
    }
}
