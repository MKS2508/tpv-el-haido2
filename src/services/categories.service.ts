import { tryCatchAsync, isErr, type Result, type ResultError } from "@mks2508/no-throw";
import { getClient, ResponseType } from '@tauri-apps/api/http';
import Category from "@/models/Category.ts";
import { CategoryErrorCode } from "@/lib/error-codes";
import fallbackProducts from '@/assets/products.json';

type CategoryResult<T> = Result<T, ResultError<typeof CategoryErrorCode[keyof typeof CategoryErrorCode]>>

interface ICategoryService {
    getCategories(): Promise<Category[]>;
    createCategory(category: Category): Promise<CategoryResult<void>>;
    deleteCategory(category: Category): Promise<CategoryResult<void>>;
    updateCategory(category: Category): Promise<CategoryResult<void>>;
}

export default class CategoriesService implements ICategoryService {
    public ENDPOINT: string = 'http://localhost:3000/api/categories';

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

    async getCategories(): Promise<Category[]> {
        const result = await tryCatchAsync(
            async () => this.makeRequest<Category[]>(this.ENDPOINT),
            CategoryErrorCode.LoadFailed
        );

        if (isErr(result)) {
            console.error("Failed to fetch categories from backend:", result.error.code, result.error.message);
            console.log("Using fallback categories from products.json");
            return this.getFallbackCategories();
        }

        return result.value;
    }

    private getFallbackCategories(): Category[] {
        console.log("Extracting categories from products.json");

        // Extraer categorias unicas de los productos
        const uniqueCategories = [...new Set(
            fallbackProducts.map(product => product.category)
        )].filter(Boolean);

        // Generar objetos Category con IDs
        const categories: Category[] = uniqueCategories.map((categoryName, index) => ({
            id: index + 1,
            name: categoryName,
            description: `Categoria ${categoryName}`,
            icon: undefined
        }));

        console.log(`Generated ${categories.length} fallback categories:`, categories.map(c => c.name));
        return categories;
    }

    async createCategory(category: Category): Promise<CategoryResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(this.ENDPOINT, 'POST', category) },
            CategoryErrorCode.CreateFailed
        );
    }

    async deleteCategory(category: Category): Promise<CategoryResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`${this.ENDPOINT}/${category.id}`, 'DELETE') },
            CategoryErrorCode.DeleteFailed
        );
    }

    async updateCategory(category: Category): Promise<CategoryResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`${this.ENDPOINT}/${category.id}`, 'PUT', category) },
            CategoryErrorCode.UpdateFailed
        );
    }
}
