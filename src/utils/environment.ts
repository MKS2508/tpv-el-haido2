/**
 * Utilidades para detectar el entorno de ejecución de la aplicación
 *
 * NOTA: Este módulo re-exporta desde @/services/platform para mantener
 * compatibilidad. Preferir importar directamente desde @/services/platform.
 */

import { isTauri } from '@/services/platform';

// Re-export for backwards compatibility
export { isTauri, isTauri as isTauriEnvironment };

/**
 * Detecta si la aplicación se está ejecutando en un navegador web
 */
export function isWebEnvironment(): boolean {
  return !isTauri();
}

/**
 * Obtiene información sobre el entorno actual
 */
export function getEnvironmentInfo() {
  const isTauriEnv = isTauri();

  return {
    platform: isTauriEnv ? 'tauri' : 'web',
    isTauri: isTauriEnv,
    isWeb: !isTauriEnv,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
  };
}

/**
 * Hook personalizado para obtener información del entorno (para uso en React)
 */
export function useEnvironment() {
  return getEnvironmentInfo();
}

/**
 * Ejecuta diferentes funciones según el entorno
 */
export function runByEnvironment<T>(options: {
  tauri?: () => T;
  web?: () => T;
  fallback?: () => T;
}): T | undefined {
  const { tauri: tauriFn, web, fallback } = options;

  if (isTauri() && tauriFn) {
    return tauriFn();
  }

  if (isWebEnvironment() && web) {
    return web();
  }

  if (fallback) {
    return fallback();
  }

  return undefined;
}

/**
 * Tipos para las APIs de Tauri (cuando estén disponibles)
 */
declare global {
  interface Window {
    __TAURI__?: Record<string, unknown>;
  }
}
