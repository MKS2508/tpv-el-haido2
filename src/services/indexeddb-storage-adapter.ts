import { tryCatchAsync, ok, err, type ResultError } from '@mks2508/no-throw'
import { IStorageAdapter, type StorageResult } from "./storage-adapter.interface"
import { StorageErrorCode, type StorageErrorCode as StorageErrorCodeType } from "@/lib/error-codes"
import Product from "@/models/Product"
import Category from "@/models/Category"
import Order from "@/models/Order"
import Table from "@/models/Table"

export class IndexedDbStorageAdapter implements IStorageAdapter {
    private dbName = 'tpv-haido-db'
    private dbVersion = 1
    private db: IDBDatabase | null = null

    constructor() {
        this.initDB()
    }

    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => {
                console.error('Error opening IndexedDB:', request.error)
                reject(request.error)
            }

            request.onsuccess = () => {
                this.db = request.result
                resolve()
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result

                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' })
                    productStore.createIndex('category', 'category', { unique: false })
                }

                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'id' })
                }

                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id' })
                    orderStore.createIndex('status', 'status', { unique: false })
                    orderStore.createIndex('tableNumber', 'tableNumber', { unique: false })
                }

                if (!db.objectStoreNames.contains('tables')) {
                    db.createObjectStore('tables', { keyPath: 'id' })
                }
            }
        })
    }

    private async ensureDB(): Promise<IDBDatabase> {
        if (!this.db) {
            await this.initDB()
        }
        if (!this.db) {
            throw new Error('Failed to initialize IndexedDB')
        }
        return this.db
    }

    private async performTransaction<T>(
        storeName: string,
        mode: IDBTransactionMode,
        operation: (store: IDBObjectStore) => IDBRequest<T>
    ): Promise<T> {
        const db = await this.ensureDB()
        const transaction = db.transaction([storeName], mode)
        const store = transaction.objectStore(storeName)
        const request = operation(store)

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
            transaction.onerror = () => reject(transaction.error)
        })
    }

    private async performGetAll<T>(storeName: string): Promise<T[]> {
        return this.performTransaction(storeName, 'readonly', (store) => store.getAll())
    }

    // ==================== Products ====================

    async getProducts(): Promise<StorageResult<Product[]>> {
        return tryCatchAsync(
            async () => this.performGetAll<Product>('products'),
            StorageErrorCode.ReadFailed
        )
    }

    async createProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('products', 'readwrite', (store) => store.add(product)) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('products', 'readwrite', (store) => store.put(product)) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('products', 'readwrite', (store) => store.delete(product.id)) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Categories ====================

    async getCategories(): Promise<StorageResult<Category[]>> {
        return tryCatchAsync(
            async () => this.performGetAll<Category>('categories'),
            StorageErrorCode.ReadFailed
        )
    }

    async createCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('categories', 'readwrite', (store) => store.add(category)) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('categories', 'readwrite', (store) => store.put(category)) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('categories', 'readwrite', (store) => store.delete(category.id)) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Orders ====================

    async getOrders(): Promise<StorageResult<Order[]>> {
        return tryCatchAsync(
            async () => this.performGetAll<Order>('orders'),
            StorageErrorCode.ReadFailed
        )
    }

    async createOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('orders', 'readwrite', (store) => store.add(order)) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('orders', 'readwrite', (store) => store.put(order)) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('orders', 'readwrite', (store) => store.delete(order.id)) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Tables ====================

    async getTables(): Promise<StorageResult<Table[]>> {
        return tryCatchAsync(
            async () => this.performGetAll<Table>('tables'),
            StorageErrorCode.ReadFailed
        )
    }

    async createTable(table: Table): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('tables', 'readwrite', (store) => store.add(table)) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateTable(table: Table): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('tables', 'readwrite', (store) => store.put(table)) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteTable(table: Table): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.performTransaction('tables', 'readwrite', (store) => store.delete(table.id)) },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Utility ====================

    async clearAllData(): Promise<StorageResult<void>> {
        return tryCatchAsync(async () => {
            const db = await this.ensureDB()
            const transaction = db.transaction(['products', 'categories', 'orders', 'tables'], 'readwrite')

            const promises = [
                new Promise<void>((resolve, reject) => {
                    const request = transaction.objectStore('products').clear()
                    request.onsuccess = () => resolve()
                    request.onerror = () => reject(request.error)
                }),
                new Promise<void>((resolve, reject) => {
                    const request = transaction.objectStore('categories').clear()
                    request.onsuccess = () => resolve()
                    request.onerror = () => reject(request.error)
                }),
                new Promise<void>((resolve, reject) => {
                    const request = transaction.objectStore('orders').clear()
                    request.onsuccess = () => resolve()
                    request.onerror = () => reject(request.error)
                }),
                new Promise<void>((resolve, reject) => {
                    const request = transaction.objectStore('tables').clear()
                    request.onsuccess = () => resolve()
                    request.onerror = () => reject(request.error)
                })
            ]

            await Promise.all(promises)
        }, StorageErrorCode.DeleteFailed)
    }

    async exportData(): Promise<StorageResult<{products: Product[], categories: Category[], orders: Order[]}>> {
        return tryCatchAsync(async () => {
            const productsResult = await this.getProducts()
            const categoriesResult = await this.getCategories()
            const ordersResult = await this.getOrders()

            // Extract values, defaulting to empty arrays on error
            const products = productsResult.ok ? productsResult.value : []
            const categories = categoriesResult.ok ? categoriesResult.value : []
            const orders = ordersResult.ok ? ordersResult.value : []

            return { products, categories, orders }
        }, StorageErrorCode.ReadFailed)
    }

    async importData(data: {products: Product[], categories: Category[], orders: Order[]}): Promise<StorageResult<void>> {
        return tryCatchAsync(async () => {
            // Clear existing data first
            await this.clearAllData()

            // Import new data
            const importPromises: Promise<StorageResult<void>>[] = []

            for (const product of data.products) {
                importPromises.push(this.createProduct(product))
            }

            for (const category of data.categories) {
                importPromises.push(this.createCategory(category))
            }

            for (const order of data.orders) {
                importPromises.push(this.createOrder(order))
            }

            await Promise.all(importPromises)
        }, StorageErrorCode.WriteFailed)
    }
}
