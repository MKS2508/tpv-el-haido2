//! Re-export del manifest + helpers de la crate `mks-ota`. La implementación
//! vive en `mks_ota::manifest`; este módulo existe sólo para mantener los
//! call-sites históricos.

pub use mks_ota::manifest::HubLatest;
pub use mks_ota::manifest::partial_latest_url;
