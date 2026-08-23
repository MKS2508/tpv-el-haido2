/**
 * Helpers para obtener datos del negocio desde el estado de la app o localStorage.
 */

import { getBusinessNif } from '@/store/store';

/**
 * Obtiene la razón social del negocio desde la configuración AEAT en localStorage.
 * @returns Razón social o cadena vacía
 */
export function getBusinessName(): string {
  try {
    const saved = localStorage.getItem('tpv-aeat-config');
    if (saved) {
      const aeatConfig = JSON.parse(saved);
      return aeatConfig?.businessData?.nombreRazon ?? '';
    }
  } catch {
    // Ignore parse errors
  }
  return '';
}

export { getBusinessNif };
