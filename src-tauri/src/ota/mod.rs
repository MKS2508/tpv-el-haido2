//! Canal OTA parcial: bundles de frontend JS aplicables sin reinstalar el binario.
//!
//! Convive con el canal nativo (`tauri-plugin-updater`) sin mezclarse: distinto
//! artefacto, distinta clave de firma y distinta cadencia. Ver
//! `docs/ota/canal-parcial.md`.

pub mod apply;
pub mod manifest;
pub mod protocol;
pub mod slots;

pub use protocol::SCHEME;
