//! Instalación de un bundle: verificar, descomprimir y activar.
//!
//! El swap es en dos tiempos a propósito. `stage` deja el bundle listo en disco y
//! puede tardar; `activate` sólo mueve punteros en el estado y es instantáneo. Así
//! la parte lenta ocurre mientras el TPV trabaja, y la parte que cambia lo que ve
//! el usuario se ejecuta en el hueco en que la caja está quieta.

use std::fs;
use std::io::Cursor;
use std::path::{Component, Path};

use super::manifest::{BundleManifest, ManifestError};
use super::slots::{self, SlotState};

#[derive(Debug)]
pub enum ApplyError {
    /// No pasó la verificación de integridad o de compatibilidad.
    Rejected(ManifestError),
    /// El .zip no se puede leer o trae una entrada que se sale del destino.
    BadArchive(String),
    /// Fallo de disco.
    Io(String),
    /// Se pidió activar sin nada preparado.
    NothingStaged,
}

impl std::fmt::Display for ApplyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Rejected(e) => write!(f, "bundle rechazado: {e}"),
            Self::BadArchive(e) => write!(f, "archivo del bundle inválido: {e}"),
            Self::Io(e) => write!(f, "error de disco aplicando el bundle: {e}"),
            Self::NothingStaged => write!(f, "no hay ningún bundle preparado para activar"),
        }
    }
}

/// Identificador de directorio derivado del hash. Se rechaza cualquier cosa que no
/// sea hex: el id viene del hub y termina siendo un nombre de directorio.
pub fn slot_id(manifest: &BundleManifest) -> Result<String, ApplyError> {
    let hex = manifest.hash.strip_prefix("sha256:").unwrap_or(&manifest.hash);
    let clean: String = hex.chars().take(32).collect();
    if clean.len() < 16 || !clean.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApplyError::BadArchive(format!(
            "hash inutilizable como identificador de slot: {}",
            manifest.hash
        )));
    }
    Ok(clean)
}

/// Descomprime el zip en `dest`, rechazando entradas que escapen del destino.
///
/// Un .zip puede declarar rutas como `../../algo`: `enclosed_name` ya las
/// descarta, y aquí se comprueba además que no haya componentes raros, porque el
/// contenido es remoto y este es el punto donde toca disco.
fn extract_zip(zip_bytes: &[u8], dest: &Path) -> Result<(), ApplyError> {
    let mut archive = zip::ZipArchive::new(Cursor::new(zip_bytes))
        .map_err(|e| ApplyError::BadArchive(e.to_string()))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| ApplyError::BadArchive(e.to_string()))?;

        let Some(relative) = entry.enclosed_name() else {
            return Err(ApplyError::BadArchive(format!(
                "entrada con ruta insegura: {}",
                entry.name()
            )));
        };
        if relative.components().any(|c| !matches!(c, Component::Normal(_))) {
            return Err(ApplyError::BadArchive(format!(
                "entrada con ruta insegura: {}",
                entry.name()
            )));
        }

        let target = dest.join(&relative);
        if entry.is_dir() {
            fs::create_dir_all(&target).map_err(|e| ApplyError::Io(e.to_string()))?;
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| ApplyError::Io(e.to_string()))?;
        }
        let mut out = fs::File::create(&target).map_err(|e| ApplyError::Io(e.to_string()))?;
        std::io::copy(&mut entry, &mut out).map_err(|e| ApplyError::Io(e.to_string()))?;
    }
    Ok(())
}

/// Verifica y deja el bundle descomprimido en su slot, sin activarlo.
///
/// @returns El id del slot preparado.
pub fn stage(
    app_data_dir: &Path,
    manifest: &BundleManifest,
    pubkey_b64: &str,
    native_version: &str,
    zip_bytes: &[u8],
) -> Result<String, ApplyError> {
    manifest
        .check_native_compatible(native_version)
        .map_err(ApplyError::Rejected)?;
    manifest
        .verify_bytes(zip_bytes, pubkey_b64)
        .map_err(ApplyError::Rejected)?;

    let id = slot_id(manifest)?;
    let root = slots::bundles_root(app_data_dir);
    let staging = root.join(format!(".staging-{id}"));
    let final_dir = root.join(&id);

    // Descomprimir a un directorio aparte y renombrar: si el proceso muere a
    // media extracción, no queda un slot a medias con nombre definitivo que el
    // protocolo pudiera empezar a servir.
    let _ = fs::remove_dir_all(&staging);
    fs::create_dir_all(&staging).map_err(|e| ApplyError::Io(e.to_string()))?;

    if let Err(err) = extract_zip(zip_bytes, &staging) {
        let _ = fs::remove_dir_all(&staging);
        return Err(err);
    }

    if !staging.join("index.html").is_file() {
        let _ = fs::remove_dir_all(&staging);
        return Err(ApplyError::BadArchive(
            "el bundle no trae index.html en la raíz".into(),
        ));
    }

    let _ = fs::remove_dir_all(&final_dir);
    fs::rename(&staging, &final_dir).map_err(|e| ApplyError::Io(e.to_string()))?;

    let mut state = slots::load_state(app_data_dir);
    state.staged = Some(id.clone());
    slots::save_state(app_data_dir, &state).map_err(ApplyError::Io)?;
    Ok(id)
}

/// Activa el bundle preparado. Sólo mueve punteros: es la operación instantánea.
///
/// Queda marcado como no verificado — hasta que el frontend nuevo confirme
/// `app-ready` no se le da por bueno.
pub fn activate_staged(app_data_dir: &Path, native_version: &str) -> Result<String, ApplyError> {
    let mut state = slots::load_state(app_data_dir);
    let Some(staged) = state.staged.take() else {
        return Err(ApplyError::NothingStaged);
    };

    state.previous = state.active.take();
    state.active = Some(staged.clone());
    state.verified = false;
    state.boot_attempts = 0;
    state.native_version_at_swap = Some(native_version.to_string());
    slots::save_state(app_data_dir, &state).map_err(ApplyError::Io)?;
    Ok(staged)
}

/// Vuelve al slot anterior. Si no hay anterior, se queda sin bundle y el
/// protocolo pasa a servir el frontend embebido, que siempre funciona.
pub fn rollback(app_data_dir: &Path) -> Result<Option<String>, ApplyError> {
    let mut state = slots::load_state(app_data_dir);
    let fallido = state.active.take();
    state.active = state.previous.take();
    state.verified = state.active.is_some();
    state.boot_attempts = 0;
    if state.active.is_none() {
        state.native_version_at_swap = None;
    }
    slots::save_state(app_data_dir, &state).map_err(ApplyError::Io)?;
    Ok(fallido)
}

/// Borra slots que ya no son ni el activo ni el anterior ni el preparado.
pub fn prune(app_data_dir: &Path) -> Result<usize, ApplyError> {
    let state: SlotState = slots::load_state(app_data_dir);
    let keep: Vec<&str> = [&state.active, &state.previous, &state.staged]
        .into_iter()
        .flatten()
        .map(String::as_str)
        .collect();

    let root = slots::bundles_root(app_data_dir);
    let Ok(entries) = fs::read_dir(&root) else {
        return Ok(0);
    };

    let mut removed = 0;
    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if keep.contains(&name.as_str()) {
            continue;
        }
        if fs::remove_dir_all(entry.path()).is_ok() {
            removed += 1;
        }
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;
    use ed25519_dalek::{Signer, SigningKey};
    use sha2::{Digest, Sha256};
    use std::io::Write;
    use std::path::PathBuf;

    fn tmpdir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("tpv-ota-apply-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn zip_with(files: &[(&str, &[u8])]) -> Vec<u8> {
        let mut buf = Vec::new();
        {
            let mut w = zip::ZipWriter::new(Cursor::new(&mut buf));
            let opts: zip::write::FileOptions<()> = zip::write::FileOptions::default();
            for (name, body) in files {
                w.start_file(*name, opts).unwrap();
                w.write_all(body).unwrap();
            }
            w.finish().unwrap();
        }
        buf
    }

    fn signed(bytes: &[u8]) -> (BundleManifest, String) {
        let signing = SigningKey::from_bytes(&[3u8; 32]);
        let engine = base64::engine::general_purpose::STANDARD;
        let pubkey = engine.encode(signing.verifying_key().to_bytes());
        let m = BundleManifest {
            bundle_version: "2026.08.21-1".into(),
            hash: format!("sha256:{}", hex::encode(Sha256::digest(bytes))),
            url: "https://example.invalid/b.zip".into(),
            min_native_version: "0.1.0".into(),
            max_native_version: "0.9.0".into(),
            signature: engine.encode(signing.sign(bytes).to_bytes()),
            released_at: None,
        };
        (m, pubkey)
    }

    #[test]
    fn stage_deja_el_bundle_listo_pero_no_activo() {
        let dir = tmpdir("stage");
        let zip = zip_with(&[("index.html", b"<html>nuevo</html>"), ("assets/a.js", b"1")]);
        let (m, pk) = signed(&zip);

        let id = stage(&dir, &m, &pk, "0.1.0", &zip).unwrap();
        let state = slots::load_state(&dir);
        assert_eq!(state.staged.as_deref(), Some(id.as_str()));
        assert!(state.active.is_none(), "stage no debe activar nada");
        assert!(slots::bundles_root(&dir).join(&id).join("index.html").is_file());
    }

    #[test]
    fn no_se_descomprime_un_bundle_que_no_verifica() {
        let dir = tmpdir("noverifica");
        let zip = zip_with(&[("index.html", b"<html>")]);
        let (m, pk) = signed(&zip);
        let manipulado = zip_with(&[("index.html", b"<html>otro")]);

        assert!(stage(&dir, &m, &pk, "0.1.0", &manipulado).is_err());
        // Nada en disco: la verificación va antes de tocar el destino.
        let root = slots::bundles_root(&dir);
        let hay_slots = fs::read_dir(&root)
            .map(|d| d.flatten().any(|e| e.path().is_dir()))
            .unwrap_or(false);
        assert!(!hay_slots);
    }

    #[test]
    fn se_rechaza_un_bundle_incompatible_con_el_binario() {
        let dir = tmpdir("incompat");
        let zip = zip_with(&[("index.html", b"<html>")]);
        let (m, pk) = signed(&zip);
        let err = stage(&dir, &m, &pk, "5.0.0", &zip).unwrap_err();
        assert!(matches!(err, ApplyError::Rejected(ManifestError::Incompatible { .. })));
    }

    #[test]
    fn se_rechaza_un_zip_que_intenta_escapar() {
        let dir = tmpdir("escape");
        let zip = zip_with(&[("index.html", b"<html>"), ("../fuera.txt", b"x")]);
        let (m, pk) = signed(&zip);
        let err = stage(&dir, &m, &pk, "0.1.0", &zip).unwrap_err();
        assert!(matches!(err, ApplyError::BadArchive(_)), "obtenido: {err:?}");
        assert!(!dir.join("fuera.txt").exists());
    }

    #[test]
    fn un_bundle_sin_index_no_sirve() {
        let dir = tmpdir("sinindex");
        let zip = zip_with(&[("assets/a.js", b"1")]);
        let (m, pk) = signed(&zip);
        assert!(matches!(
            stage(&dir, &m, &pk, "0.1.0", &zip).unwrap_err(),
            ApplyError::BadArchive(_)
        ));
    }

    #[test]
    fn activar_mueve_punteros_y_deja_sin_verificar() {
        let dir = tmpdir("activar");
        let zip = zip_with(&[("index.html", b"<html>")]);
        let (m, pk) = signed(&zip);
        let id = stage(&dir, &m, &pk, "0.1.0", &zip).unwrap();

        let activo = activate_staged(&dir, "0.1.0").unwrap();
        assert_eq!(activo, id);
        let s = slots::load_state(&dir);
        assert_eq!(s.active.as_deref(), Some(id.as_str()));
        assert!(s.staged.is_none());
        assert!(!s.verified, "un bundle recién activado aún no está confirmado");
        assert_eq!(s.native_version_at_swap.as_deref(), Some("0.1.0"));
    }

    #[test]
    fn activar_sin_nada_preparado_es_error() {
        let dir = tmpdir("nada");
        assert!(matches!(
            activate_staged(&dir, "0.1.0").unwrap_err(),
            ApplyError::NothingStaged
        ));
    }

    #[test]
    fn rollback_vuelve_al_anterior() {
        let dir = tmpdir("rollback");
        slots::save_state(&dir, &SlotState {
            active: Some("nuevo".into()),
            previous: Some("viejo".into()),
            verified: false,
            ..Default::default()
        }).unwrap();

        let fallido = rollback(&dir).unwrap();
        assert_eq!(fallido.as_deref(), Some("nuevo"));
        let s = slots::load_state(&dir);
        assert_eq!(s.active.as_deref(), Some("viejo"));
        assert!(s.verified, "el slot al que se vuelve ya había funcionado");
    }

    #[test]
    fn rollback_sin_anterior_cae_al_frontend_embebido() {
        let dir = tmpdir("rollback-vacio");
        slots::save_state(&dir, &SlotState {
            active: Some("unico".into()),
            native_version_at_swap: Some("0.1.0".into()),
            ..Default::default()
        }).unwrap();

        rollback(&dir).unwrap();
        let s = slots::load_state(&dir);
        assert!(s.active.is_none());
        assert!(s.native_version_at_swap.is_none());
    }

    #[test]
    fn prune_conserva_activo_anterior_y_preparado() {
        let dir = tmpdir("prune");
        let root = slots::bundles_root(&dir);
        for name in ["act", "prev", "stag", "basura1", "basura2"] {
            fs::create_dir_all(root.join(name)).unwrap();
        }
        slots::save_state(&dir, &SlotState {
            active: Some("act".into()),
            previous: Some("prev".into()),
            staged: Some("stag".into()),
            ..Default::default()
        }).unwrap();

        assert_eq!(prune(&dir).unwrap(), 2);
        assert!(root.join("act").is_dir());
        assert!(root.join("prev").is_dir());
        assert!(root.join("stag").is_dir());
        assert!(!root.join("basura1").exists());
    }
}

/// Tests de contrato cruzado con `scripts/build-bundle.ts`.
///
/// Los fixtures los produjo el empaquetador de verdad, no este código: es el
/// único sitio donde se comprueba que TypeScript y Rust coinciden en el formato
/// exacto — base64 de la firma, prefijo del hash, y que se firma sobre los bytes
/// crudos del zip y no sobre otra cosa. Un desacuerdo ahí no lo detecta ningún
/// test que genere sus propios datos.
#[cfg(test)]
mod contrato_con_el_empaquetador {
    use super::*;
    use crate::ota::manifest::BundleManifest;
    use std::path::PathBuf;

    fn fixture(name: &str) -> Vec<u8> {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures")
            .join(name);
        fs::read(&path).unwrap_or_else(|e| panic!("falta el fixture {}: {e}", path.display()))
    }

    fn cargar() -> (BundleManifest, Vec<u8>, String) {
        let manifest: BundleManifest =
            serde_json::from_slice(&fixture("manifest.json")).expect("manifest del empaquetador");
        let zip = fixture("bundle.zip");
        let pubkey = String::from_utf8(fixture("pubkey.txt")).unwrap().trim().to_string();
        (manifest, zip, pubkey)
    }

    #[test]
    fn el_bundle_del_empaquetador_verifica() {
        let (manifest, zip, pubkey) = cargar();
        manifest
            .verify_bytes(&zip, &pubkey)
            .expect("hash y firma producidos por build-bundle.ts deben validar en Rust");
    }

    #[test]
    fn el_bundle_del_empaquetador_se_instala() {
        let dir = std::env::temp_dir().join("tpv-ota-contrato");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let (manifest, zip, pubkey) = cargar();
        let id = stage(&dir, &manifest, &pubkey, "0.1.0", &zip).expect("stage del bundle real");

        // El zip se crea desde dentro de dist/, así que index.html tiene que
        // quedar en la raíz del slot y no bajo un directorio intermedio.
        let slot = slots::bundles_root(&dir).join(&id);
        assert!(slot.join("index.html").is_file(), "index.html en la raíz del slot");
        assert!(slot.join("assets/app.js").is_file(), "se conserva la jerarquía");

        activate_staged(&dir, "0.1.0").unwrap();
        assert_eq!(slots::load_state(&dir).active.as_deref(), Some(id.as_str()));
    }

    #[test]
    fn un_zip_manipulado_tras_firmarlo_no_pasa() {
        let (manifest, mut zip, pubkey) = cargar();
        let last = zip.len() - 1;
        zip[last] ^= 0xff;
        assert!(manifest.verify_bytes(&zip, &pubkey).is_err());
    }
}
