//! Manifest de un bundle y las dos puertas que tiene que pasar antes de aplicarse:
//! integridad (sha256 + firma ed25519) y compatibilidad con el binario nativo.

use base64::Engine;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Manifest tal y como lo sirve el release-hub.
///
/// Contrato compartido con `desktop-release-hub`; ver `docs/ota/canal-parcial.md`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleManifest {
    /// Identificador del bundle. No es el semver de la app.
    #[serde(rename = "bundleVersion")]
    pub bundle_version: String,
    /// `sha256:<hex>` del .zip.
    pub hash: String,
    /// Descarga del .zip.
    pub url: String,
    /// Versión nativa mínima, inclusive.
    #[serde(rename = "minNativeVersion")]
    pub min_native_version: String,
    /// Versión nativa máxima, inclusive. Admite comodín de patch (`1.5.x`).
    #[serde(rename = "maxNativeVersion")]
    pub max_native_version: String,
    /// Firma ed25519 (base64) sobre los bytes del .zip.
    pub signature: String,
    #[serde(rename = "releasedAt", default)]
    pub released_at: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ManifestError {
    /// El binario nativo cae fuera de la ventana declarada.
    Incompatible { native: String, min: String, max: String },
    /// Versión (nativa o del manifest) que no se puede interpretar.
    BadVersion(String),
    /// El hash del zip descargado no es el declarado.
    HashMismatch { expected: String, actual: String },
    /// La firma no valida contra la clave pública del proyecto.
    BadSignature(String),
}

impl std::fmt::Display for ManifestError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Incompatible { native, min, max } => write!(
                f,
                "bundle incompatible: binario nativo {native}, ventana [{min}, {max}]"
            ),
            Self::BadVersion(v) => write!(f, "versión ilegible: {v}"),
            Self::HashMismatch { expected, actual } => {
                write!(f, "hash del bundle distinto del declarado: esperado {expected}, obtenido {actual}")
            }
            Self::BadSignature(why) => write!(f, "firma del bundle inválida: {why}"),
        }
    }
}

/// Interpreta `maxNativeVersion`, que el contrato define como cota superior
/// inclusive pero admitiendo también rangos.
///
/// Una versión pelada (`"1.6.0"`) se lee como `<=1.6.0`, que es lo que dice el
/// nombre del campo: todo lo anterior entra. Cualquier otra cosa (`"1.5.x"`,
/// `"^1.5.0"`, `">=1 <2"`) se lee como rango tal cual.
///
/// Tratar la versión pelada como rango, que es lo que hace hoy el hub con
/// `semver.satisfies`, convierte `[1.4.0, 1.6.0]` en "sólo 1.6.0 exacta" — ver
/// `la_cota_superior_pelada_es_inclusiva`.
fn parse_max(raw: &str) -> Result<semver::VersionReq, ManifestError> {
    let cleaned = raw.trim().replace(".x", ".*").replace(".X", ".*");

    // El hub valida con node-semver, que separa los comparadores de un rango con
    // espacios (">=1.0.0 <2.0.0"); el crate de Rust los quiere con comas. Un
    // rango que el hub da por bueno tiene que parsear también aquí.
    let cleaned = cleaned.split_whitespace().collect::<Vec<_>>().join(", ");

    // node-semver admite alternativas con `||`, que este crate no soporta. Se
    // rechaza explícitamente en vez de dejar que falle el parseo con un mensaje
    // que no dice nada.
    if cleaned.contains("||") {
        return Err(ManifestError::BadVersion(format!(
            "{raw}: los rangos con `||` no están soportados en el cliente"
        )));
    }

    let is_plain_version = semver::Version::parse(&cleaned).is_ok();
    let expr = if is_plain_version { format!("<={cleaned}") } else { cleaned };
    semver::VersionReq::parse(&expr).map_err(|_| ManifestError::BadVersion(raw.to_string()))
}

impl BundleManifest {
    /// Comprueba que el binario nativo cae dentro de la ventana declarada.
    ///
    /// Es la guardia que impide que un bundle nuevo aterrice sobre un binario que
    /// no tiene los comandos que ese bundle llama. Se valida también aquí y no
    /// sólo en el hub: el cliente no se fía del servidor.
    ///
    /// `min` es una versión concreta comparada con `>=`; `max` es cota superior
    /// inclusive, y además admite rangos (ver `parse_max`).
    pub fn check_native_compatible(&self, native_version: &str) -> Result<(), ManifestError> {
        let native = semver::Version::parse(native_version)
            .map_err(|_| ManifestError::BadVersion(native_version.to_string()))?;

        let min = semver::Version::parse(self.min_native_version.trim())
            .map_err(|_| ManifestError::BadVersion(self.min_native_version.clone()))?;
        let max = parse_max(&self.max_native_version)?;

        if native >= min && max.matches(&native) {
            Ok(())
        } else {
            Err(ManifestError::Incompatible {
                native: native_version.to_string(),
                min: self.min_native_version.clone(),
                max: self.max_native_version.clone(),
            })
        }
    }

    /// Verifica los bytes descargados: primero el hash, después la firma.
    ///
    /// Se verifica SIEMPRE sobre los bytes del .zip y antes de descomprimir:
    /// descomprimir es ya ejecutar la decisión de confiar en el contenido.
    pub fn verify_bytes(&self, zip_bytes: &[u8], pubkey_b64: &str) -> Result<(), ManifestError> {
        let expected = self.hash.strip_prefix("sha256:").unwrap_or(&self.hash);
        let actual = hex::encode(Sha256::digest(zip_bytes));
        if !actual.eq_ignore_ascii_case(expected) {
            return Err(ManifestError::HashMismatch {
                expected: expected.to_string(),
                actual,
            });
        }

        let engine = base64::engine::general_purpose::STANDARD;

        let key_bytes: [u8; 32] = engine
            .decode(pubkey_b64.trim())
            .map_err(|e| ManifestError::BadSignature(format!("clave pública ilegible: {e}")))?
            .try_into()
            .map_err(|_| ManifestError::BadSignature("la clave pública no mide 32 bytes".into()))?;

        let verifying_key = VerifyingKey::from_bytes(&key_bytes)
            .map_err(|e| ManifestError::BadSignature(format!("clave pública inválida: {e}")))?;

        let sig_bytes: [u8; 64] = engine
            .decode(self.signature.trim())
            .map_err(|e| ManifestError::BadSignature(format!("firma ilegible: {e}")))?
            .try_into()
            .map_err(|_| ManifestError::BadSignature("la firma no mide 64 bytes".into()))?;

        verifying_key
            .verify_strict(zip_bytes, &Signature::from_bytes(&sig_bytes))
            .map_err(|e| ManifestError::BadSignature(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn keypair() -> (SigningKey, String) {
        // Semilla fija: el test no debe depender de aleatoriedad.
        let signing = SigningKey::from_bytes(&[7u8; 32]);
        let pubkey = base64::engine::general_purpose::STANDARD
            .encode(signing.verifying_key().to_bytes());
        (signing, pubkey)
    }

    fn manifest_for(bytes: &[u8], signing: &SigningKey) -> BundleManifest {
        let engine = base64::engine::general_purpose::STANDARD;
        BundleManifest {
            bundle_version: "2026.08.21-1".into(),
            hash: format!("sha256:{}", hex::encode(Sha256::digest(bytes))),
            url: "https://example.invalid/b.zip".into(),
            min_native_version: "0.1.0".into(),
            max_native_version: "0.2.0".into(),
            signature: engine.encode(signing.sign(bytes).to_bytes()),
            released_at: None,
        }
    }

    #[test]
    fn un_bundle_integro_pasa_las_dos_puertas() {
        let (signing, pubkey) = keypair();
        let bytes = b"contenido del bundle";
        let m = manifest_for(bytes, &signing);
        assert!(m.verify_bytes(bytes, &pubkey).is_ok());
        assert!(m.check_native_compatible("0.1.0").is_ok());
    }

    #[test]
    fn un_byte_cambiado_tumba_el_hash() {
        let (signing, pubkey) = keypair();
        let m = manifest_for(b"contenido del bundle", &signing);
        let err = m.verify_bytes(b"contenido del bundlX", &pubkey).unwrap_err();
        assert!(matches!(err, ManifestError::HashMismatch { .. }));
    }

    #[test]
    fn una_firma_de_otra_clave_no_vale() {
        let (signing, _) = keypair();
        let bytes = b"contenido del bundle";
        let m = manifest_for(bytes, &signing);
        let otra = base64::engine::general_purpose::STANDARD
            .encode(SigningKey::from_bytes(&[9u8; 32]).verifying_key().to_bytes());
        assert!(matches!(
            m.verify_bytes(bytes, &otra).unwrap_err(),
            ManifestError::BadSignature(_)
        ));
    }

    #[test]
    fn firma_basura_no_revienta() {
        let (signing, pubkey) = keypair();
        let bytes = b"contenido del bundle";
        let mut m = manifest_for(bytes, &signing);
        m.signature = "no-es-base64!!".into();
        assert!(matches!(
            m.verify_bytes(bytes, &pubkey).unwrap_err(),
            ManifestError::BadSignature(_)
        ));
    }

    #[test]
    fn la_ventana_nativa_es_inclusiva_en_los_dos_extremos() {
        let (signing, _) = keypair();
        let mut m = manifest_for(b"x", &signing);
        m.min_native_version = "1.4.0".into();
        m.max_native_version = "1.6.0".into();
        assert!(m.check_native_compatible("1.4.0").is_ok(), "el mínimo entra");
        assert!(m.check_native_compatible("1.6.0").is_ok(), "el máximo entra");
        assert!(m.check_native_compatible("1.5.9").is_ok());
        assert!(m.check_native_compatible("1.3.9").is_err(), "por debajo no");
        assert!(m.check_native_compatible("1.6.1").is_err(), "por encima no");
    }

    #[test]
    fn la_cota_superior_pelada_es_inclusiva() {
        // DIVERGENCIA CONOCIDA con desktop-release-hub (BundleService.withinWindow,
        // commit d27461e): allí `max` se evalúa siempre con semver.satisfies, así
        // que "1.6.0" se lee como "exactamente 1.6.0" y la ventana [1.4.0, 1.6.0]
        // sólo alcanza a los binarios 1.6.0. Los 1.5.x nunca reciben el bundle, sin
        // error visible. Aquí se implementa lo que dice el nombre del campo.
        let (signing, _) = keypair();
        let mut m = manifest_for(b"x", &signing);
        m.min_native_version = "1.4.0".into();
        m.max_native_version = "1.6.0".into();

        assert!(m.check_native_compatible("1.4.0").is_ok(), "el mínimo entra");
        assert!(m.check_native_compatible("1.5.9").is_ok(), "el medio entra");
        assert!(m.check_native_compatible("1.6.0").is_ok(), "el máximo entra");
        assert!(m.check_native_compatible("1.3.9").is_err());
        assert!(m.check_native_compatible("1.6.1").is_err());
    }

    #[test]
    fn se_aceptan_los_rangos_que_el_hub_admite() {
        // El hub valida max con semver.validRange, que acepta cualquier rango.
        // El cliente tiene que entender los mismos, o rechazaría bundles válidos.
        let (signing, _) = keypair();
        let mut m = manifest_for(b"x", &signing);
        m.min_native_version = "1.0.0".into();

        m.max_native_version = "^1.5.0".into();
        assert!(m.check_native_compatible("1.5.3").is_ok());
        assert!(m.check_native_compatible("2.0.0").is_err());

        m.max_native_version = ">=1.0.0 <2.0.0".into();
        assert!(m.check_native_compatible("1.9.9").is_ok());
        assert!(m.check_native_compatible("2.0.1").is_err());
    }

    #[test]
    fn el_comodin_de_patch_del_contrato_se_entiende() {
        let (signing, _) = keypair();
        let mut m = manifest_for(b"x", &signing);
        m.min_native_version = "1.4.0".into();
        // "1.5.x" no es semver válido: hay que normalizarlo antes de parsear.
        m.max_native_version = "1.5.x".into();
        assert!(m.check_native_compatible("1.5.0").is_ok());
        assert!(m.check_native_compatible("1.5.12").is_ok());
        assert!(m.check_native_compatible("1.6.0").is_err());
    }

    #[test]
    fn una_version_ilegible_no_se_da_por_compatible() {
        let (signing, _) = keypair();
        let m = manifest_for(b"x", &signing);
        assert!(matches!(
            m.check_native_compatible("no-soy-semver").unwrap_err(),
            ManifestError::BadVersion(_)
        ));
    }

    #[test]
    fn el_manifest_del_contrato_deserializa() {
        let raw = r#"{
          "bundleVersion": "2026.08.21-3",
          "hash": "sha256:abc",
          "url": "https://haido.releases.mks2508.systems/api/bundles/x/download",
          "minNativeVersion": "1.4.0",
          "maxNativeVersion": "1.5.x",
          "signature": "AAAA",
          "releasedAt": "2026-08-21T10:00:00Z"
        }"#;
        let m: BundleManifest = serde_json::from_str(raw).unwrap();
        assert_eq!(m.bundle_version, "2026.08.21-3");
        assert_eq!(m.max_native_version, "1.5.x");
    }
}
