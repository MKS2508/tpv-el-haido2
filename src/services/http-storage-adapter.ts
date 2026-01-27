import { getClient, ResponseType } from '@tauri-apps/api/http'
import { tryCatchAsync } from '@mks2508/no-throw'
import { IStorageAdapter, type StorageResult } from "./storage-adapter.interface"
import { StorageErrorCode } from "@/lib/error-codes"
import Product from "@/models/Product"
import Category from "@/models/Category"
import Order from "@/models/Order"

export class HttpStorageAdapter implements IStorageAdapter {
    private baseUrl = 'http://localhost:3000/api'

    private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: unknown): Promise<T> {
        // Check if we're running in Tauri environment
        if (typeof window !== 'undefined' && '__TAURI_IPC__' in window) {
            const client = await getClient()
            const url = `${this.baseUrl}${endpoint}`

            switch (method) {
                case 'GET': {
                    const getResponse = await client.get(url, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    })
                    return getResponse.data as T
                }

                case 'POST': {
                    const postResponse = await client.post(url, data, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    })
                    return postResponse.data as T
                }

                case 'PUT': {
                    const putResponse = await client.put(url, data, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    })
                    return putResponse.data as T
                }

                case 'DELETE': {
                    const deleteResponse = await client.delete(url, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    })
                    return deleteResponse.data as T
                }

                default:
                    throw new Error(`Unsupported method: ${method}`)
            }
        } else {
            // Use native fetch for development/browser environment
            const url = `${this.baseUrl}${endpoint}`
            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            }

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data)
            }

            const response = await fetch(url, options)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            // Handle empty responses (e.g., DELETE operations)
            const text = await response.text()
            if (!text) {
                return undefined as T
            }

            return JSON.parse(text) as T
        }
    }

    // ==================== Products ====================

    async getProducts(): Promise<StorageResult<Product[]>> {
        return tryCatchAsync(
            async () => this.makeRequest<Product[]>('/products'),
            StorageErrorCode.ReadFailed
        )
    }

    async createProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest('/products', 'POST', product) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`/products/${product.id}`, 'PUT', product) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteProduct(product: Product): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`/products/${product.id}`, 'DELETE') },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Categories ====================

    async getCategories(): Promise<StorageResult<Category[]>> {
        return tryCatchAsync(
            async () => this.makeRequest<Category[]>('/categories'),
            StorageErrorCode.ReadFailed
        )
    }

    async createCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest('/categories', 'POST', category) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`/categories/${category.id}`, 'PUT', category) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteCategory(category: Category): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`/categories/${category.id}`, 'DELETE') },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Orders ====================

    async getOrders(): Promise<StorageResult<Order[]>> {
        return tryCatchAsync(
            async () => this.makeRequest<Order[]>('/orders'),
            StorageErrorCode.ReadFailed
        )
    }

    async createOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest('/orders', 'POST', order) },
            StorageErrorCode.WriteFailed
        )
    }

    async updateOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`/orders/${order.id}`, 'PUT', order) },
            StorageErrorCode.WriteFailed
        )
    }

    async deleteOrder(order: Order): Promise<StorageResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`/orders/${order.id}`, 'DELETE') },
            StorageErrorCode.DeleteFailed
        )
    }

    // ==================== Utility ====================

    async exportData(): Promise<StorageResult<{products: Product[], categories: Category[], orders: Order[]}>> {
        return tryCatchAsync(async () => {
            const productsResult = await this.getProducts()
            const categoriesResult = await this.getCategories()
            const ordersResult = await this.getOrders()

            const products = productsResult.ok ? productsResult.value : []
            const categories = categoriesResult.ok ? categoriesResult.value : []
            const orders = ordersResult.ok ? ordersResult.value : []

            return { products, categories, orders }
        }, StorageErrorCode.ReadFailed)
    }
}
