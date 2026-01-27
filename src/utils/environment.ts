/**
 * Utilidades para detectar el entorno de ejecución de la aplicación
 */

/**
 * Detecta si la aplicación se está ejecutando en Tauri
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.__TAURI__;
}

/**
 * Detecta si la aplicación se está ejecutando en un navegador web
 */
export function isWebEnvironment(): boolean {
  return !isTauriEnvironment();
}

/**
 * Obtiene información sobre el entorno actual
 */
export function getEnvironmentInfo() {
  const isTauri = isTauriEnvironment();

  return {
    platform: isTauri ? 'tauri' : 'web',
    isTauri,
    isWeb: !isTauri,
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
  const { tauri, web, fallback } = options;

  if (isTauriEnvironment() && tauri) {
    return tauri();
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
