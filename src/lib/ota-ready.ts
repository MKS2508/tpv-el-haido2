/**
 * Handshake del canal OTA parcial.
 *
 * Confirma al backend que el frontend ha montado y ha llegado a pintar. Mientras
 * no llegue esta confirmación, el bundle activo cuenta como no verificado y el
 * watchdog acaba revirtiéndolo al slot anterior.
 *
 * Es deliberadamente lo último del arranque: confirmar antes de pintar daría por
 * bueno un bundle que revienta al primer render.
 */

import logger from '@mks2508/better-logger';
import { isTauri } from '@/services/platform/PlatformDetector';

const log = logger.component('OTA');

/**
 * Señala que el frontend arrancó bien. No lanza: un fallo aquí no debe tumbar la
 * app, sólo deja el bundle sin confirmar (y por tanto reversible).
 */
export function signalAppReady(): void {
  if (!isTauri()) return;

  // Doble rAF: el segundo frame sólo llega si el primero se pintó de verdad.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void (async () => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('ota_app_ready');
          log.debug('Bundle confirmado como funcional');
        } catch (error) {
          log.warn('No se pudo confirmar el arranque del bundle', { error });
        }
      })();
    });
  });
}
