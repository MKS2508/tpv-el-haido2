/**
 * Canal OTA parcial — lado que decide CUÁNDO se aplica un bundle.
 *
 * El backend descarga, verifica y descompone el bundle por su cuenta; eso puede
 * pasar en cualquier momento porque no cambia nada de lo que ve el usuario.
 * Activar sí lo cambia: recarga la webview. Esa decisión vive aquí porque el
 * frontend es el único que sabe si hay un ticket a medias.
 *
 * Ver `docs/ota/canal-parcial.md`.
 */

import logger from '@mks2508/better-logger';
import { isTauri } from '@/services/platform/PlatformDetector';
import useStore from '@/store/store';

const log = logger.component('OTA');

/** Cada cuánto se reevalúa si la caja está quieta. */
const RETRY_INTERVAL_MS = 30_000;

/** Silencio de interacción antes de dar por buena una pausa. */
const IDLE_REQUIRED_MS = 60_000;

let lastInteractionAt = Date.now();
let watching = false;

function markInteraction(): void {
  lastInteractionAt = Date.now();
}

/**
 * Si es seguro recargar ahora mismo.
 *
 * No se exige que no haya pedidos abiertos: en un bar hay mesas abiertas durante
 * horas y esperar a que no quede ninguna equivale a no actualizar nunca. Lo que
 * importa es que nadie esté a media operación en este instante — los datos ya
 * están en SQLite, lo que una recarga se llevaría por delante es lo que se esté
 * componiendo en pantalla.
 */
export function canApplyNow(): { ok: boolean; reason?: string } {
  const store = useStore();

  if (store.state.selectedOrder) {
    return { ok: false, reason: 'hay un pedido abierto en pantalla' };
  }

  const idleFor = Date.now() - lastInteractionAt;
  if (idleFor < IDLE_REQUIRED_MS) {
    return { ok: false, reason: `sólo ${Math.round(idleFor / 1000)}s sin actividad` };
  }

  return { ok: true };
}

/**
 * Espera a un hueco y aplica. Si la caja no para, sigue esperando: un bundle sin
 * aplicar no es un problema, una recarga en mitad de un cobro sí.
 */
function waitForQuietMomentAndApply(bundleVersion: string): void {
  const attempt = async (): Promise<void> => {
    const verdict = canApplyNow();
    if (!verdict.ok) {
      log.debug(`Bundle ${bundleVersion} en espera: ${verdict.reason}`);
      setTimeout(() => void attempt(), RETRY_INTERVAL_MS);
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('ota_apply_staged');
      log.info(`Bundle ${bundleVersion} activado; recargando`);
      // Sin reinicio del proceso: sólo la webview vuelve a pedir los assets, que
      // ahora salen del slot nuevo.
      location.reload();
    } catch (error) {
      // Si activar falla, el bundle se queda preparado y se reintentará en el
      // próximo arranque. No se molesta al usuario por esto.
      log.warn('No se pudo activar el bundle', { error });
    }
  };

  void attempt();
}

/**
 * Arranca la escucha. Idempotente.
 */
export function startOtaUpdates(): void {
  if (!isTauri() || watching) return;
  watching = true;

  for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(event, markInteraction, { passive: true });
  }

  void (async () => {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      await listen<string>('ota://bundle-staged', (event) => {
        log.info(`Bundle ${event.payload} preparado; esperando hueco para aplicarlo`);
        waitForQuietMomentAndApply(event.payload);
      });

      // Aplicar en caliente no reinicia el proceso, así que si el bundle nuevo
      // revienta nadie consume un arranque: el backend lo revierte por tiempo y
      // avisa por aquí. Recargar es lo que devuelve la UI al slot anterior.
      await listen<string>('ota://bundle-reverted', (event) => {
        log.warn(`Bundle ${event.payload} revertido por no confirmar; recargando`);
        location.reload();
      });
    } catch (error) {
      log.warn('No se pudo escuchar el canal de bundles', { error });
    }
  })();
}
