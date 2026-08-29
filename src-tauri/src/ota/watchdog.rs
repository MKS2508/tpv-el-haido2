//! Re-export del boot watchdog de la crate `mks-ota`. La implementación
//! vive en `mks_ota::watchdog`; este módulo existe sólo para mantener los
//! call-sites históricos (`ota::watchdog::arm_hot_apply` etc.).

pub use mks_ota::watchdog::*;
