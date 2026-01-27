import { type Result, type ResultError } from '@mks2508/no-throw'
import Product from "@/models/Product"
import Category from "@/models/Category"
import Order from "@/models/Order"
import Table from "@/models/Table"
import { type StorageErrorCode } from "@/lib/error-codes"

export type StorageMode = 'sqlite' | 'http' | 'indexeddb'

// Type alias for storage operation results
export type StorageResult<T> = Result<T, ResultError<StorageErrorCode>>

export interface IStorageAdapter {
    // Products
    getProducts(): Promise<StorageResult<Product[]>>
    createProduct(product: Product): Promise<StorageResult<void>>
    updateProduct(product: Product): Promise<StorageResult<void>>
    deleteProduct(product: Product): Promise<StorageResult<void>>

    // Categories
    getCategories(): Promise<StorageResult<Category[]>>
    createCategory(category: Category): Promise<StorageResult<void>>
    updateCategory(category: Category): Promise<StorageResult<void>>
    deleteCategory(category: Category): Promise<StorageResult<void>>

    // Orders
    getOrders(): Promise<StorageResult<Order[]>>
    createOrder(order: Order): Promise<StorageResult<void>>
    updateOrder(order: Order): Promise<StorageResult<void>>
    deleteOrder(order: Order): Promise<StorageResult<void>>

    // Tables (if needed for persistence)
    getTables?(): Promise<StorageResult<Table[]>>
    createTable?(table: Table): Promise<StorageResult<void>>
    updateTable?(table: Table): Promise<StorageResult<void>>
    deleteTable?(table: Table): Promise<StorageResult<void>>

    // Utility methods
    clearAllData?(): Promise<StorageResult<void>>
    exportData?(): Promise<StorageResult<{products: Product[], categories: Category[], orders: Order[]}>>
    importData?(data: {products: Product[], categories: Category[], orders: Order[]}): Promise<StorageResult<void>>
}
