//! Canal OTA parcial: bundles de frontend JS aplicables sin reinstalar el binario.
//!
//! Convive con el canal nativo (`tauri-plugin-updater`) sin mezclarse: distinto
//! artefacto, distinta clave de firma y distinta cadencia. Ver
//! `docs/jarvis/ota-crate-design-2026-08-28.md`.
//!
//! A partir de D10-D (ADR-0045), la implementación vive en la crate
//! `mks-ota` (`install::partial`, `watchdog`, `manifest`, `protocol`);
//! este módulo es thin glue: re-exports + el ancla de confianza local
//! (`bundle_pubkey`).

pub mod apply;
pub mod manifest;
pub mod poller;
pub mod protocol;
pub mod slots;
pub mod watchdog;

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
