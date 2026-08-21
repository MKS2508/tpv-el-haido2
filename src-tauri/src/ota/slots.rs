//! Estado de los slots de bundle JS en disco.
//!
//! Layout bajo `{app_data_dir}/bundles/`:
//!
//! ```text
//! bundles/
//!   state.json        <- qué slot está activo, cuál es el anterior, si se verificó
//!   <bundle-id>/      <- assets descomprimidos de un bundle
//!   <bundle-id>/
//! ```
//!
//! El puntero al slot activo es un fichero de estado y no un symlink: en Windows
//! crear symlinks exige privilegios que el usuario del TPV no tiene por qué tener.

use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Nombre del fichero de estado dentro de `bundles/`.
const STATE_FILE: &str = "state.json";

/// Estado persistente de los slots.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct SlotState {
    /// Bundle que se está sirviendo. `None` = se sirve el frontend embebido.
    pub active: Option<String>,
    /// Bundle anterior, conservado para poder revertir.
    pub previous: Option<String>,
    /// Bundle descargado y verificado, a la espera de aplicarse.
    pub staged: Option<String>,
    /// Id del bundle en el hub (UUID) del slot preparado.
    ///
    /// El slot se nombra por hash, que es lo que importa en disco; el hub lo
    /// identifica por su UUID. Hace falta guardarlo para poder reportar el
    /// resultado más tarde, incluso tras un reinicio.
    pub staged_hub_id: Option<String>,
    /// Id en el hub del slot activo.
    pub active_hub_id: Option<String>,
    /// `false` mientras el bundle activo no haya confirmado `app-ready`.
    pub verified: bool,
    /// Arranques consumidos por el bundle activo sin confirmar.
    pub boot_attempts: u32,
    /// Versión del binario nativo cuando se activó el bundle.
    ///
    /// Tras actualizar el binario, el frontend embebido es más nuevo que
    /// cualquier slot: seguir sirviendo el slot viejo dejaría una UI antigua
    /// hablando con comandos nuevos. `min_native_version` no cubre este sentido,
    /// porque el bundle ya estaba instalado antes de la actualización.
    pub native_version_at_swap: Option<String>,
}

/// Raíz de los bundles dentro del directorio de datos de la app.
pub fn bundles_root(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("bundles")
}

/// Lee el estado. Un estado ausente o corrupto equivale a "sin bundle": se sirve
/// el frontend embebido, que siempre está disponible.
pub fn load_state(app_data_dir: &Path) -> SlotState {
    let path = bundles_root(app_data_dir).join(STATE_FILE);
    let Ok(raw) = fs::read_to_string(&path) else {
        return SlotState::default();
    };
    serde_json::from_str(&raw).unwrap_or_else(|err| {
        eprintln!("[ota] state.json ilegible ({err}); se sirve el frontend embebido");
        SlotState::default()
    })
}

/// Escribe el estado con tmp + rename, para que un corte a media escritura no
/// deje un `state.json` truncado que dejaría la app sin frontend que servir.
pub fn save_state(app_data_dir: &Path, state: &SlotState) -> Result<(), String> {
    let root = bundles_root(app_data_dir);
    fs::create_dir_all(&root).map_err(|e| format!("no se pudo crear {}: {e}", root.display()))?;

    let final_path = root.join(STATE_FILE);
    let tmp_path = root.join(format!("{STATE_FILE}.tmp"));
    let body = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;

    fs::write(&tmp_path, body).map_err(|e| format!("no se pudo escribir el estado: {e}"))?;
    fs::rename(&tmp_path, &final_path).map_err(|e| format!("no se pudo cerrar el estado: {e}"))
}

/// Directorio del slot activo, si hay uno y existe en disco.
pub fn active_dir(app_data_dir: &Path, state: &SlotState) -> Option<PathBuf> {
    let id = state.active.as_ref()?;
    let dir = bundles_root(app_data_dir).join(id);
    dir.is_dir().then_some(dir)
}

/// Desactiva el slot activo si lo instaló un binario nativo distinto del actual.
///
/// Se ejecuta en el arranque, antes de servir nada.
///
/// @returns `true` si se desactivó algo (el estado ya quedó persistido).
pub fn invalidate_if_native_changed(app_data_dir: &Path, native_version: &str) -> bool {
    let mut state = load_state(app_data_dir);
    if state.active.is_none() {
        return false;
    }

    let matches = state
        .native_version_at_swap
        .as_deref()
        .is_some_and(|v| v == native_version);
    if matches {
        return false;
    }

    eprintln!(
        "[ota] el binario nativo cambió ({:?} -> {native_version}); se descarta el bundle activo",
        state.native_version_at_swap
    );
    state.previous = state.active.take();
    state.verified = false;
    state.boot_attempts = 0;
    state.native_version_at_swap = None;
    if let Err(err) = save_state(app_data_dir, &state) {
        eprintln!("[ota] no se pudo persistir la invalidación: {err}");
    }
    true
}

/// Resuelve una ruta pedida por la webview contra un directorio raíz, rechazando
/// cualquier cosa que se salga de él.
///
/// Un bundle es contenido remoto: sin esta comprobación, una petición a
/// `../../tpv-haido.db` serviría la base de datos por el protocolo.
pub fn resolve_within(root: &Path, request_path: &str) -> Option<PathBuf> {
    let relative = request_path.trim_start_matches('/');
    let candidate = Path::new(relative);

    // Rechazar por componentes antes de tocar el disco: `canonicalize` sólo
    // funciona sobre ficheros que existen, y aquí interesa parar también los que
    // no existen pero apuntan fuera.
    for component in candidate.components() {
        match component {
            Component::Normal(_) => {}
            _ => return None,
        }
    }

    let joined = root.join(candidate);

    // Segunda barrera para symlinks dentro del bundle, que sí pueden apuntar
    // fuera aunque la ruta pedida sea inocente.
    let (Ok(real_root), Ok(real_target)) = (root.canonicalize(), joined.canonicalize()) else {
        return None;
    };
    real_target.starts_with(&real_root).then_some(real_target)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmpdir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("tpv-ota-test-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn estado_ausente_equivale_a_frontend_embebido() {
        let dir = tmpdir("ausente");
        let state = load_state(&dir);
        assert!(state.active.is_none());
        assert!(active_dir(&dir, &state).is_none());
    }

    #[test]
    fn estado_corrupto_no_rompe_el_arranque() {
        let dir = tmpdir("corrupto");
        fs::create_dir_all(bundles_root(&dir)).unwrap();
        fs::write(bundles_root(&dir).join(STATE_FILE), "{ esto no es json").unwrap();
        assert!(load_state(&dir).active.is_none());
    }

    #[test]
    fn el_estado_va_y_vuelve() {
        let dir = tmpdir("roundtrip");
        let state = SlotState {
            active: Some("abc123".into()),
            verified: true,
            native_version_at_swap: Some("0.1.0".into()),
            ..Default::default()
        };
        save_state(&dir, &state).unwrap();
        let back = load_state(&dir);
        assert_eq!(back.active.as_deref(), Some("abc123"));
        assert!(back.verified);
    }

    #[test]
    fn slot_activo_solo_si_existe_en_disco() {
        let dir = tmpdir("existe");
        let state = SlotState { active: Some("fantasma".into()), ..Default::default() };
        assert!(active_dir(&dir, &state).is_none(), "un slot que no está en disco no se sirve");

        fs::create_dir_all(bundles_root(&dir).join("fantasma")).unwrap();
        assert!(active_dir(&dir, &state).is_some());
    }

    #[test]
    fn cambiar_de_binario_nativo_descarta_el_slot() {
        let dir = tmpdir("nativo");
        save_state(&dir, &SlotState {
            active: Some("bundle-viejo".into()),
            verified: true,
            native_version_at_swap: Some("0.1.0".into()),
            ..Default::default()
        }).unwrap();

        assert!(invalidate_if_native_changed(&dir, "0.2.0"));
        let state = load_state(&dir);
        assert!(state.active.is_none());
        assert_eq!(state.previous.as_deref(), Some("bundle-viejo"));

        // Idempotente: sin slot activo no hay nada que invalidar.
        assert!(!invalidate_if_native_changed(&dir, "0.2.0"));
    }

    #[test]
    fn mismo_binario_nativo_conserva_el_slot() {
        let dir = tmpdir("mismo");
        save_state(&dir, &SlotState {
            active: Some("bundle".into()),
            native_version_at_swap: Some("0.1.0".into()),
            ..Default::default()
        }).unwrap();
        assert!(!invalidate_if_native_changed(&dir, "0.1.0"));
        assert_eq!(load_state(&dir).active.as_deref(), Some("bundle"));
    }

    #[test]
    fn se_rechaza_salir_del_directorio_del_bundle() {
        let dir = tmpdir("traversal");
        let root = dir.join("slot");
        fs::create_dir_all(&root).unwrap();
        fs::write(dir.join("secreto.db"), b"datos").unwrap();
        fs::write(root.join("index.html"), b"<html>").unwrap();

        assert!(resolve_within(&root, "/index.html").is_some());
        assert!(resolve_within(&root, "/../secreto.db").is_none());
        assert!(resolve_within(&root, "../secreto.db").is_none());
        assert!(resolve_within(&root, "/assets/../../secreto.db").is_none());
        assert!(resolve_within(&root, "/no-existe.js").is_none());
    }
}
