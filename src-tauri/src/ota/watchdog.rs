//! Red de seguridad del canal parcial: un bundle que no arranca se revierte solo.
//!
//! El watchdog cuenta ARRANQUES, no segundos. Un temporizador dentro del proceso
//! sólo cubre el caso "la app queda colgada"; si el bundle nuevo tumba la webview
//! o el proceso entero, ese temporizador nunca llega a disparar. Contando
//! arranques consumidos sin confirmar, un bundle que revienta al cargar se
//! revierte en el arranque siguiente, que es justo el escenario malo en un bar.

use std::path::Path;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Runtime};

use super::apply;
use super::slots;

/// Arranques que se le conceden a un bundle sin confirmar antes de revertirlo.
///
/// Dos y no uno: un primer arranque puede morir por causas ajenas al bundle
/// (corte de luz a mitad, cierre a lo bruto) y revertir por eso sería un
/// falso positivo.
const MAX_BOOT_ATTEMPTS: u32 = 2;

/// Margen que se le da a un bundle recién activado en caliente para confirmar.
///
/// Contar arranques cubre que el bundle tumbe el proceso, pero no cubre la
/// aplicación en caliente: tras activar y recargar la webview NO hay reinicio, y
/// si el bundle nuevo revienta en JS nadie consume un arranque. Sin este
/// temporizador la caja se queda con la UI rota hasta que alguien reinicie a
/// mano — y luego harían falta tres reinicios para revertir. Los dos mecanismos
/// se complementan: contador para el proceso, temporizador para el reload.
const HOT_APPLY_GRACE: Duration = Duration::from_secs(90);

/// Evento que avisa al frontend de que hubo que revertir en caliente.
pub const BUNDLE_REVERTED_EVENT: &str = "ota://bundle-reverted";

/// Resultado de la reconciliación de arranque, para poder registrarlo.
#[derive(Debug, PartialEq, Eq)]
pub enum BootOutcome {
    /// No hay bundle activo: se sirve el frontend embebido.
    NoBundle,
    /// El bundle activo ya estaba confirmado.
    Verified,
    /// Bundle sin confirmar al que aún le quedan intentos.
    Pending { attempt: u32 },
    /// Se agotaron los intentos y se volvió al slot anterior.
    RolledBack { failed: Option<String> },
}

/// Se ejecuta al arrancar, ANTES de crear la ventana: si devuelve `RolledBack`,
/// el protocolo tiene que servir ya el slot anterior.
pub fn reconcile_boot(app_data_dir: &Path) -> BootOutcome {
    let mut state = slots::load_state(app_data_dir);

    if state.active.is_none() {
        return BootOutcome::NoBundle;
    }
    if state.verified {
        return BootOutcome::Verified;
    }

    state.boot_attempts += 1;

    if state.boot_attempts > MAX_BOOT_ATTEMPTS {
        let failed = apply::rollback(app_data_dir)
            .ok()
            .flatten();
        eprintln!("[ota] el bundle {failed:?} no confirmó en {MAX_BOOT_ATTEMPTS} arranques; revertido");
        return BootOutcome::RolledBack { failed };
    }

    let attempt = state.boot_attempts;
    if let Err(err) = slots::save_state(app_data_dir, &state) {
        eprintln!("[ota] no se pudo registrar el intento de arranque: {err}");
    }
    BootOutcome::Pending { attempt }
}

/// Marca el bundle activo como bueno. Lo llama el frontend una vez montado.
pub fn mark_ready(app_data_dir: &Path) -> Result<(), String> {
    let mut state = slots::load_state(app_data_dir);
    if state.active.is_none() || state.verified {
        return Ok(());
    }
    state.verified = true;
    state.boot_attempts = 0;
    slots::save_state(app_data_dir, &state)
}

/// Vigila un bundle recién activado en caliente y lo revierte si no confirma.
///
/// Se arma justo tras `activate_staged`. Si al vencer el margen el bundle sigue
/// activo y sin confirmar, se revierte y se avisa al frontend para que recargue:
/// desde ese momento la webview vuelve a servir el slot anterior o el frontend
/// embebido.
pub fn arm_hot_apply<R: Runtime>(app: AppHandle<R>, slot_id: String) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(HOT_APPLY_GRACE).await;

        let Ok(data_dir) = app.path().app_data_dir() else {
            return;
        };
        let state = slots::load_state(&data_dir);

        // Si ya confirmó, o si mientras tanto se activó otro, no hay nada que hacer.
        if state.verified || state.active.as_deref() != Some(slot_id.as_str()) {
            return;
        }

        eprintln!("[ota] el bundle {slot_id} no confirmó tras aplicarse en caliente; revirtiendo");
        let hub_id = state.active_hub_id.clone();
        match apply::rollback(&data_dir) {
            Ok(_) => {
                if let Some(id) = hub_id {
                    super::poller::report(
                        app.clone(),
                        id,
                        super::poller::Outcome::RolledBack,
                        Some("no confirmó app-ready tras aplicarse en caliente".into()),
                    );
                }
                let _ = app.emit(BUNDLE_REVERTED_EVENT, slot_id);
            }
            Err(err) => eprintln!("[ota] no se pudo revertir: {err}"),
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::slots::SlotState;
    use std::fs;
    use std::path::PathBuf;

    fn tmpdir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("tpv-ota-wd-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn sin_bundle_no_hay_nada_que_vigilar() {
        assert_eq!(reconcile_boot(&tmpdir("sin")), BootOutcome::NoBundle);
    }

    #[test]
    fn un_bundle_confirmado_no_gasta_intentos() {
        let dir = tmpdir("confirmado");
        slots::save_state(&dir, &SlotState {
            active: Some("b".into()),
            verified: true,
            ..Default::default()
        }).unwrap();
        assert_eq!(reconcile_boot(&dir), BootOutcome::Verified);
        assert_eq!(slots::load_state(&dir).boot_attempts, 0);
    }

    #[test]
    fn un_bundle_que_revienta_se_revierte_al_agotar_arranques() {
        let dir = tmpdir("revienta");
        slots::save_state(&dir, &SlotState {
            active: Some("malo".into()),
            previous: Some("bueno".into()),
            verified: false,
            ..Default::default()
        }).unwrap();

        // Cada arranque sin confirmar consume un intento.
        assert_eq!(reconcile_boot(&dir), BootOutcome::Pending { attempt: 1 });
        assert_eq!(reconcile_boot(&dir), BootOutcome::Pending { attempt: 2 });

        // Al tercero se acabó: vuelta al anterior.
        assert_eq!(
            reconcile_boot(&dir),
            BootOutcome::RolledBack { failed: Some("malo".into()) }
        );
        assert_eq!(slots::load_state(&dir).active.as_deref(), Some("bueno"));
    }

    #[test]
    fn confirmar_corta_la_cuenta_de_intentos() {
        let dir = tmpdir("confirma");
        slots::save_state(&dir, &SlotState {
            active: Some("b".into()),
            previous: Some("viejo".into()),
            verified: false,
            ..Default::default()
        }).unwrap();

        assert_eq!(reconcile_boot(&dir), BootOutcome::Pending { attempt: 1 });
        mark_ready(&dir).unwrap();

        let s = slots::load_state(&dir);
        assert!(s.verified);
        assert_eq!(s.boot_attempts, 0);

        // Y a partir de ahí los arranques ya no cuentan.
        assert_eq!(reconcile_boot(&dir), BootOutcome::Verified);
        assert_eq!(slots::load_state(&dir).active.as_deref(), Some("b"));
    }

    #[test]
    fn confirmar_sin_bundle_activo_no_hace_nada() {
        let dir = tmpdir("confirma-vacio");
        mark_ready(&dir).unwrap();
        assert!(!slots::load_state(&dir).verified);
    }

    #[test]
    fn revertir_sin_anterior_deja_el_frontend_embebido() {
        let dir = tmpdir("revierte-vacio");
        slots::save_state(&dir, &SlotState {
            active: Some("unico".into()),
            verified: false,
            boot_attempts: MAX_BOOT_ATTEMPTS,
            ..Default::default()
        }).unwrap();

        assert!(matches!(reconcile_boot(&dir), BootOutcome::RolledBack { .. }));
        assert!(slots::load_state(&dir).active.is_none());
    }
}
