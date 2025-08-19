import { HttpStorageAdapter } from "./http-storage-adapter"
import { IndexedDbStorageAdapter } from "./indexeddb-storage-adapter"

export class DataMigrationService {
    private httpAdapter = new HttpStorageAdapter()
    private indexedDbAdapter = new IndexedDbStorageAdapter()

    /**
     * Migrar datos de HTTP a IndexedDB
     */
    async migrateFromHttpToIndexedDb(): Promise<{
        success: boolean,
        message: string,
        counts: { products: number, categories: number, orders: number }
    }> {
        try {
            console.log('[DataMigration] Starting HTTP to IndexedDB migration...')

            // Exportar datos del HTTP adapter
            const data = await this.httpAdapter.exportData()
            
            // Verificar que hay datos para migrar
            const totalItems = data.products.length + data.categories.length + data.orders.length
            if (totalItems === 0) {
                return {
                    success: true,
                    message: 'No hay datos que migrar desde la base de datos externa',
                    counts: { products: 0, categories: 0, orders: 0 }
                }
            }

            // Importar datos al IndexedDB adapter
            await this.indexedDbAdapter.importData(data)

            console.log('[DataMigration] HTTP to IndexedDB migration completed successfully')
            return {
                success: true,
                message: `Migración completada: ${data.products.length} productos, ${data.categories.length} categorías, ${data.orders.length} órdenes`,
                counts: {
                    products: data.products.length,
                    categories: data.categories.length,
                    orders: data.orders.length
                }
            }
        } catch (error) {
            console.error('[DataMigration] Error migrating from HTTP to IndexedDB:', error)
            return {
                success: false,
                message: `Error durante la migración: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                counts: { products: 0, categories: 0, orders: 0 }
            }
        }
    }

    /**
     * Migrar datos de IndexedDB a HTTP  
     */
    async migrateFromIndexedDbToHttp(): Promise<{
        success: boolean,
        message: string,
        counts: { products: number, categories: number, orders: number }
    }> {
        try {
            console.log('[DataMigration] Starting IndexedDB to HTTP migration...')

            // Exportar datos del IndexedDB adapter
            const data = await this.indexedDbAdapter.exportData()
            
            // Verificar que hay datos para migrar
            const totalItems = data.products.length + data.categories.length + data.orders.length
            if (totalItems === 0) {
                return {
                    success: true,
                    message: 'No hay datos que migrar desde el almacenamiento local',
                    counts: { products: 0, categories: 0, orders: 0 }
                }
            }

            // Importar datos al HTTP adapter (crear uno por uno)
            const migrationPromises: Promise<void>[] = []

            // Migrar categorías primero (pueden ser referenciadas por productos)
            for (const category of data.categories) {
                migrationPromises.push(this.httpAdapter.createCategory(category))
            }

            // Migrar productos
            for (const product of data.products) {
                migrationPromises.push(this.httpAdapter.createProduct(product))
            }

            // Migrar órdenes
            for (const order of data.orders) {
                migrationPromises.push(this.httpAdapter.createOrder(order))
            }

            await Promise.all(migrationPromises)

            console.log('[DataMigration] IndexedDB to HTTP migration completed successfully')
            return {
                success: true,
                message: `Migración completada: ${data.products.length} productos, ${data.categories.length} categorías, ${data.orders.length} órdenes`,
                counts: {
                    products: data.products.length,
                    categories: data.categories.length,
                    orders: data.orders.length
                }
            }
        } catch (error) {
            console.error('[DataMigration] Error migrating from IndexedDB to HTTP:', error)
            return {
                success: false,
                message: `Error durante la migración: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                counts: { products: 0, categories: 0, orders: 0 }
            }
        }
    }

    /**
     * Sincronizar datos entre ambos adapters (bidireccional)
     */
    async syncData(direction: 'http-to-indexeddb' | 'indexeddb-to-http' = 'http-to-indexeddb'): Promise<{
        success: boolean,
        message: string,
        counts: { products: number, categories: number, orders: number }
    }> {
        if (direction === 'http-to-indexeddb') {
            return this.migrateFromHttpToIndexedDb()
        } else {
            return this.migrateFromIndexedDbToHttp()
        }
    }

    /**
     * Verificar conectividad con el servidor HTTP
     */
    async testHttpConnection(): Promise<boolean> {
        try {
            await this.httpAdapter.getProducts()
            return true
        } catch (error) {
            console.warn('[DataMigration] HTTP connection test failed:', error)
            return false
        }
    }

    /**
     * Verificar funcionalidad de IndexedDB
     */
    async testIndexedDbConnection(): Promise<boolean> {
        try {
            await this.indexedDbAdapter.getProducts()
            return true
        } catch (error) {
            console.warn('[DataMigration] IndexedDB connection test failed:', error)
            return false
        }
    }

    /**
     * Obtener estadísticas de datos en ambos adapters
     */
    async getDataStats(): Promise<{
        http: { products: number, categories: number, orders: number },
        indexeddb: { products: number, categories: number, orders: number }
    }> {
        try {
            const [httpData, indexedDbData] = await Promise.allSettled([
                this.httpAdapter.exportData(),
                this.indexedDbAdapter.exportData()
            ])

            const httpCounts = httpData.status === 'fulfilled' 
                ? {
                    products: httpData.value.products.length,
                    categories: httpData.value.categories.length,
                    orders: httpData.value.orders.length
                }
                : { products: 0, categories: 0, orders: 0 }

            const indexedDbCounts = indexedDbData.status === 'fulfilled'
                ? {
                    products: indexedDbData.value.products.length,
                    categories: indexedDbData.value.categories.length,
                    orders: indexedDbData.value.orders.length
                }
                : { products: 0, categories: 0, orders: 0 }

            return {
                http: httpCounts,
                indexeddb: indexedDbCounts
            }
        } catch (error) {
            console.error('[DataMigration] Error getting data stats:', error)
            return {
                http: { products: 0, categories: 0, orders: 0 },
                indexeddb: { products: 0, categories: 0, orders: 0 }
            }
        }
    }

    /**
     * Limpiar datos de un adapter específico
     */
    async clearData(adapter: 'http' | 'indexeddb'): Promise<{ success: boolean, message: string }> {
        try {
            if (adapter === 'http') {
                // HTTP adapter no tiene clearAllData, necesitamos implementarlo manualmente
                const data = await this.httpAdapter.exportData()
                
                const deletePromises: Promise<void>[] = []
                for (const product of data.products) {
                    deletePromises.push(this.httpAdapter.deleteProduct(product))
                }
                for (const category of data.categories) {
                    deletePromises.push(this.httpAdapter.deleteCategory(category))
                }
                for (const order of data.orders) {
                    deletePromises.push(this.httpAdapter.deleteOrder(order))
                }
                
                await Promise.all(deletePromises)
            } else {
                await this.indexedDbAdapter.clearAllData?.()
            }

            return {
                success: true,
                message: `Datos eliminados del ${adapter === 'http' ? 'servidor' : 'almacenamiento local'}`
            }
        } catch (error) {
            return {
                success: false,
                message: `Error eliminando datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
            }
        }
    }
}