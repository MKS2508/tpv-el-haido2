import { tryCatchAsync, unwrapOr, isErr, type Result, type ResultError } from "@mks2508/no-throw";
import { getClient, ResponseType } from '@tauri-apps/api/http';
import Product from "@/models/Product.ts";
import { ProductErrorCode } from "@/lib/error-codes";
import fallbackProducts from '@/assets/products.json';
import iconOptions from '@/assets/utils/icons/iconOptions.ts';
import { BeerIcon } from 'lucide-react';
import React from 'react';

type ProductResult<T> = Result<T, ResultError<typeof ProductErrorCode[keyof typeof ProductErrorCode]>>

interface IProductService {
    getProducts(): Promise<Product[]>
    deleteProduct(product: Product): Promise<ProductResult<void>>
    updateProduct(product: Product): Promise<ProductResult<void>>
    createProduct(product: Product): Promise<ProductResult<void>>
    getProductsByIdArray(pinnedProductdIds: number[], products: Product[]): Product[]
}

export default class ProductService implements IProductService {
    public ENDPOINT: string = 'http://localhost:3000/api/products';

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        data?: unknown
    ): Promise<T> {
        // Check if we're running in Tauri environment
        if (typeof window !== 'undefined' && '__TAURI_IPC__' in window) {
            const client = await getClient();

            switch (method) {
                case 'GET': {
                    const response = await client.get(endpoint, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
                case 'POST': {
                    const response = await client.post(endpoint, data, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
                case 'PUT': {
                    const response = await client.put(endpoint, data, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
                case 'DELETE': {
                    const response = await client.delete(endpoint, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
            }
        } else {
            // Use native fetch for development/browser environment
            const options: RequestInit = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(endpoint, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            if (!text) {
                return undefined as T;
            }

            return JSON.parse(text) as T;
        }
    }

    async getProducts(): Promise<Product[]> {
        const result = await tryCatchAsync(
            async () => this.makeRequest<Product[]>(this.ENDPOINT),
            ProductErrorCode.LoadFailed
        );

        if (isErr(result)) {
            console.error("Failed to fetch products from backend:", result.error.code, result.error.message);
            console.log("Using fallback products from products.json");
            return this.getFallbackProducts();
        }

        console.log("Products fetched successfully:", result.value.length);
        return result.value;
    }

    private getFallbackProducts(): Product[] {
        console.log("Loading fallback products from products.json");

        const productsWithIcons = fallbackProducts.map(product => ({
            ...product,
            icon: React.createElement(
                iconOptions.find(option => option.value === product.selectedIcon)?.icon || BeerIcon
            )
        }));

        console.log(`Loaded ${productsWithIcons.length} fallback products`);
        return productsWithIcons;
    }

    async createProduct(product: Product): Promise<ProductResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(this.ENDPOINT, 'POST', product) },
            ProductErrorCode.CreateFailed
        );
    }

    async deleteProduct(product: Product): Promise<ProductResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`${this.ENDPOINT}/${product.id}`, 'DELETE') },
            ProductErrorCode.DeleteFailed
        );
    }

    async updateProduct(product: Product): Promise<ProductResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`${this.ENDPOINT}/${product.id}`, 'PUT', product) },
            ProductErrorCode.UpdateFailed
        );
    }

    getProductsByIdArray(pinnedProductdIds: number[], products: Product[]) {
        const pinnedProducts = products.filter(product => pinnedProductdIds.includes(product.id))
        return pinnedProducts
    }
}
