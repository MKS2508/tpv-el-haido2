import { HttpStorageAdapter } from './http-storage-adapter';
import { IndexedDbStorageAdapter } from './indexeddb-storage-adapter';

export class DataMigrationService {
  private httpAdapter = new HttpStorageAdapter();
  private indexedDbAdapter = new IndexedDbStorageAdapter();

  /**
   * Migrar datos de HTTP a IndexedDB
   */
  async migrateFromHttpToIndexedDb(): Promise<{
    success: boolean;
    message: string;
    counts: { products: number; categories: number; orders: number };
  }> {
    console.log('[DataMigration] Starting HTTP to IndexedDB migration...');

    // Exportar datos del HTTP adapter
    const dataResult = await this.httpAdapter.exportData();

    if (!dataResult.ok) {
      return {
        success: false,
        message: `Error obteniendo datos: ${dataResult.error.message}`,
        counts: { products: 0, categories: 0, orders: 0 },
      };
    }

    const data = dataResult.value;

    // Verificar que hay datos para migrar
    const totalItems = data.products.length + data.categories.length + data.orders.length;
    if (totalItems === 0) {
      return {
        success: true,
        message: 'No hay datos que migrar desde la base de datos externa',
        counts: { products: 0, categories: 0, orders: 0 },
      };
    }

    // Importar datos al IndexedDB adapter
    const importResult = await this.indexedDbAdapter.importData(data);

    if (!importResult.ok) {
      return {
        success: false,
        message: `Error importando datos: ${importResult.error.message}`,
        counts: { products: 0, categories: 0, orders: 0 },
      };
    }

    console.log('[DataMigration] HTTP to IndexedDB migration completed successfully');
    return {
      success: true,
      message: `Migración completada: ${data.products.length} productos, ${data.categories.length} categorías, ${data.orders.length} órdenes`,
      counts: {
        products: data.products.length,
        categories: data.categories.length,
        orders: data.orders.length,
      },
    };
  }

  /**
   * Migrar datos de IndexedDB a HTTP
   */
  async migrateFromIndexedDbToHttp(): Promise<{
    success: boolean;
    message: string;
    counts: { products: number; categories: number; orders: number };
  }> {
    console.log('[DataMigration] Starting IndexedDB to HTTP migration...');

    // Exportar datos del IndexedDB adapter
    const dataResult = await this.indexedDbAdapter.exportData();

    if (!dataResult.ok) {
      return {
        success: false,
        message: `Error obteniendo datos: ${dataResult.error.message}`,
        counts: { products: 0, categories: 0, orders: 0 },
      };
    }

    const data = dataResult.value;

    // Verificar que hay datos para migrar
    const totalItems = data.products.length + data.categories.length + data.orders.length;
    if (totalItems === 0) {
      return {
        success: true,
        message: 'No hay datos que migrar desde el almacenamiento local',
        counts: { products: 0, categories: 0, orders: 0 },
      };
    }

    // Migrar categorías primero (pueden ser referenciadas por productos)
    for (const category of data.categories) {
      const result = await this.httpAdapter.createCategory(category);
      if (!result.ok) {
        console.warn(`[DataMigration] Failed to create category: ${result.error.message}`);
      }
    }

    // Migrar productos
    for (const product of data.products) {
      const result = await this.httpAdapter.createProduct(product);
      if (!result.ok) {
        console.warn(`[DataMigration] Failed to create product: ${result.error.message}`);
      }
    }

    // Migrar órdenes
    for (const order of data.orders) {
      const result = await this.httpAdapter.createOrder(order);
      if (!result.ok) {
        console.warn(`[DataMigration] Failed to create order: ${result.error.message}`);
      }
    }

    console.log('[DataMigration] IndexedDB to HTTP migration completed successfully');
    return {
      success: true,
      message: `Migración completada: ${data.products.length} productos, ${data.categories.length} categorías, ${data.orders.length} órdenes`,
      counts: {
        products: data.products.length,
        categories: data.categories.length,
        orders: data.orders.length,
      },
    };
  }

  /**
   * Sincronizar datos entre ambos adapters (bidireccional)
   */
  async syncData(
    direction: 'http-to-indexeddb' | 'indexeddb-to-http' = 'http-to-indexeddb'
  ): Promise<{
    success: boolean;
    message: string;
    counts: { products: number; categories: number; orders: number };
  }> {
    if (direction === 'http-to-indexeddb') {
      return this.migrateFromHttpToIndexedDb();
    } else {
      return this.migrateFromIndexedDbToHttp();
    }
  }

  /**
   * Verificar conectividad con el servidor HTTP
   */
  async testHttpConnection(): Promise<boolean> {
    const result = await this.httpAdapter.getProducts();
    return result.ok;
  }

  /**
   * Verificar funcionalidad de IndexedDB
   */
  async testIndexedDbConnection(): Promise<boolean> {
    const result = await this.indexedDbAdapter.getProducts();
    return result.ok;
  }

  /**
   * Obtener estadísticas de datos en ambos adapters
   */
  async getDataStats(): Promise<{
    http: { products: number; categories: number; orders: number };
    indexeddb: { products: number; categories: number; orders: number };
  }> {
    const [httpDataResult, indexedDbDataResult] = await Promise.all([
      this.httpAdapter.exportData(),
      this.indexedDbAdapter.exportData(),
    ]);

    const httpCounts = httpDataResult.ok
      ? {
          products: httpDataResult.value.products.length,
          categories: httpDataResult.value.categories.length,
          orders: httpDataResult.value.orders.length,
        }
      : { products: 0, categories: 0, orders: 0 };

    const indexedDbCounts = indexedDbDataResult.ok
      ? {
          products: indexedDbDataResult.value.products.length,
          categories: indexedDbDataResult.value.categories.length,
          orders: indexedDbDataResult.value.orders.length,
        }
      : { products: 0, categories: 0, orders: 0 };

    return {
      http: httpCounts,
      indexeddb: indexedDbCounts,
    };
  }

  /**
   * Limpiar datos de un adapter específico
   */
  async clearData(adapter: 'http' | 'indexeddb'): Promise<{ success: boolean; message: string }> {
    if (adapter === 'http') {
      // HTTP adapter no tiene clearAllData, necesitamos implementarlo manualmente
      const dataResult = await this.httpAdapter.exportData();

      if (!dataResult.ok) {
        return {
          success: false,
          message: `Error obteniendo datos: ${dataResult.error.message}`,
        };
      }

      const data = dataResult.value;

      for (const product of data.products) {
        await this.httpAdapter.deleteProduct(product);
      }
      for (const category of data.categories) {
        await this.httpAdapter.deleteCategory(category);
      }
      for (const order of data.orders) {
        await this.httpAdapter.deleteOrder(order);
      }
    } else {
      const result = await this.indexedDbAdapter.clearAllData();
      if (!result.ok) {
        return {
          success: false,
          message: `Error eliminando datos: ${result.error.message}`,
        };
      }
    }

    return {
      success: true,
      message: `Datos eliminados del ${adapter === 'http' ? 'servidor' : 'almacenamiento local'}`,
    };
  }
}
