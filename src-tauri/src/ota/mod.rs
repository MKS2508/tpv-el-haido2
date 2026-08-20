//! Canal OTA parcial: bundles de frontend JS aplicables sin reinstalar el binario.
//!
//! Convive con el canal nativo (`tauri-plugin-updater`) sin mezclarse: distinto
//! artefacto, distinta clave de firma y distinta cadencia. Ver
//! `docs/ota/canal-parcial.md`.

pub mod apply;
pub mod watchdog;
pub mod manifest;
pub mod protocol;
pub mod slots;

pub use protocol::SCHEME;

/// Clave pública ed25519 del canal de bundles, embebida en el binario.
///
/// Es un ancla de confianza: va compilada dentro a propósito, igual que la
/// minisign del updater nativo. Rotarla exige recompilar y republicar, que es
/// justo la fricción que debe tener cambiar en quién confía la app.
/// La genera `scripts/build-bundle.ts keygen`.
pub fn bundle_pubkey() -> &'static str {
    include_str!("../../ota-bundle-pubkey.txt").trim_ascii()
}
