/**
 * Demo Seed Service
 *
 * Servicio para cargar datos de demostración en la aplicación.
 * Útil para pruebas, capturas de pantalla y demos.
 */

import { getDemoSeedData, getDemoStats } from '@/data/demo-seed';
import useStore from '@/store/store';

export interface LoadDemoDataResult {
  success: boolean;
  message: string;
  stats?: ReturnType<typeof getDemoStats>;
}

/**
 * Carga todos los datos de demostración en el store
 */
export async function loadDemoData(): Promise<LoadDemoDataResult> {
  try {
    const store = useStore();
    const demoData = getDemoSeedData();

    // Cargar clientes
    store.setCustomers(demoData.customers);

    // Cargar historial de pedidos (solo los que están pagados)
    const paidOrders = demoData.orders.filter(o => o.status === 'paid');
    store.setOrderHistory(paidOrders);

    // Opcional: Cargar usuarios si están vacíos
    if (store.state.users.length === 0) {
      store.setUsers(demoData.users);
    }

    const stats = getDemoStats();

    return {
      success: true,
      message: `Datos cargados: ${stats.customers} clientes, ${stats.totalOrders} pedidos`,
      stats,
    };
  } catch (error) {
    console.error('[DemoSeed] Error loading demo data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Limpia todos los datos de demostración
 */
export async function clearDemoData(): Promise<LoadDemoDataResult> {
  try {
    const store = useStore();

    // Limpiar clientes
    store.setCustomers([]);

    // Limpiar historial de pedidos
    store.setOrderHistory([]);

    return {
      success: true,
      message: 'Datos de demostración eliminados',
    };
  } catch (error) {
    console.error('[DemoSeed] Error clearing demo data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Verifica si hay datos de demostración cargados
 */
export function hasDemoData(): boolean {
  const store = useStore();
  return store.state.customers.length > 0 || store.state.orderHistory.length > 0;
}
