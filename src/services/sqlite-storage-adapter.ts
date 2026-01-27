import { invoke } from '@tauri-apps/api/tauri'
import { tryCatchAsync } from '@mks2508/no-throw'
import { IStorageAdapter, type StorageResult } from "./storage-adapter.interface"
import { StorageErrorCode } from "@/lib/error-codes"
import Product from "@/models/Product"
import Category from "@/models/Category"
import Order from "@/models/Order"
import Table from "@/models/Table"

/**
 * SQLite storage adapter that uses Tauri commands to interact with
 * the embedded SQLite database in the Rust backend.
 */
export class SqliteStorageAdapter implements IStorageAdapter {
    // ==================== Products ====================

    async getProducts(): Promise<StorageResult<Product[]>> {
        return tryCatchAsync(
            async () => invoke<Product[]>('get_products'),
            StorageErrorCode.ReadFailed
        )
    }

    async createProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('create_product', { product }) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('update_product', { product }) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('delete_product', { id: product.id }) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Categories ====================

    async getCategories(): Promise<StorageResult<Category[]>> {
        return tryCatchAsync(
            async () => invoke<Category[]>('get_categories'),
            StorageErrorCode.ReadFailed
        )
    }

    async createCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('create_category', { category }) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('update_category', { category }) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('delete_category', { id: category.id }) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Orders ====================

    async getOrders(): Promise<StorageResult<Order[]>> {
        return tryCatchAsync(
            async () => invoke<Order[]>('get_orders'),
            StorageErrorCode.ReadFailed
        )
    }

    async createOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('create_order', { order }) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('update_order', { order }) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('delete_order', { id: order.id }) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Tables ====================

    async getTables(): Promise<StorageResult<Table[]>> {
        return tryCatchAsync(
            async () => invoke<Table[]>('get_tables'),
            StorageErrorCode.ReadFailed
        )
    }

    async createTable(table: Table): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('create_table', { table }) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateTable(table: Table): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('update_table', { table }) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteTable(table: Table): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('delete_table', { id: table.id }) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Utility ====================

    async clearAllData(): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('clear_all_data') },
            StorageErrorCode.DeleteFailed
        )
    }

    async exportData(): Promise<StorageResult<{products: Product[], categories: Category[], orders: Order[]}>> {
        return tryCatchAsync(
            async () => invoke<{products: Product[], categories: Category[], orders: Order[]}>('export_data'),
            StorageErrorCode.ReadFailed
        )
    }

    async importData(data: {products: Product[], categories: Category[], orders: Order[]}): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await invoke('import_data', { data }) },
            StorageErrorCode.WriteFailed
        )
    }
}
