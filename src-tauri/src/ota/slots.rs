//! Re-export del A/B slot management de la crate `mks-ota`. La implementación
//! vive en `mks_ota::install::partial::slots`; este módulo existe sólo para
//! mantener los call-sites históricos (`ota::slots::load_state` etc.) sin
//! importar la crate directamente en todo el código de la app.

pub use mks_ota::install::partial::slots::*;
