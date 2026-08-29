//! Re-export del A/B slot install/activate/rollback de la crate `mks-ota`.
//! La implementación vive en `mks_ota::install::partial::apply`; este módulo
//! existe sólo para mantener los call-sites históricos
//! (`ota::apply::activate_staged`, `ota::apply::prune`, etc.).

pub use mks_ota::install::partial::apply::*;
