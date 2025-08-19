import Product from "@/models/Product.ts";
import axios from "axios";
import { fetch } from '@tauri-apps/plugin-http';
import fallbackProducts from '@/assets/products.json';
import iconOptions from '@/assets/utils/icons/iconOptions.ts';
import { BeerIcon } from 'lucide-react';
import React from 'react';

interface IProductService {
    getProducts(): Promise<Product[]>
    deleteProduct(product: Product): Promise<void>
    updateProduct(product: Product): Promise<void>
    createProduct(product: Product): Promise<void>
    getProductsByIdArray(pinnedProductdIds: number[], products: Product[]): Product[]
}

export default class ProductService implements IProductService {
    public ENDPOINT: string = 'http://localhost:3000/api/products';
    async getProducts(): Promise<Product[]> {
        try {
            // Check if we're running in Tauri environment
            if (typeof window !== 'undefined' && '__TAURI_IPC__' in window) {
                const response = await fetch(this.ENDPOINT, {
                    method: 'GET',
                    timeout: { secs: 30, nanos: 0 }
                });
                const products = await response.json() as Product[];
                console.log("products get from tauri", products);
                return products;
            } else {
                // Fallback to axios for development/browser environment
                console.log("Using axios fallback for products fetch");
                const response = await axios.get(this.ENDPOINT);
                const products = response.data as Product[];
                console.log("products get from axios", products);
                return products;
            }
        } catch (error) {
            console.error("Failed to fetch products from backend:", error);
            console.log("🔧 [DEBUG MODE] Using fallback products from products.json");
            return this.getFallbackProducts();
        }
    }
    
    private getFallbackProducts(): Product[] {
        console.log("📦 Loading fallback products from products.json");
        
        const productsWithIcons = fallbackProducts.map(product => ({
            ...product,
            icon: React.createElement(
                iconOptions.find(option => option.value === product.selectedIcon)?.icon || BeerIcon
            )
        }));
        
        console.log(`✅ Loaded ${productsWithIcons.length} fallback products`);
        return productsWithIcons;
    }

    async createProduct(product: Product): Promise<void> {
        try {
            await axios.post(this.ENDPOINT, product);
        } catch (error) {
            console.error("Failed to create product:", error);
        }
    }

    async deleteProduct(product: Product): Promise<void> {
        try {
            await axios.delete(`${this.ENDPOINT}/${product.id}`);
        } catch (error) {
            console.error("Failed to delete product:", error);
        }
    }

    async updateProduct(product: Product): Promise<void> {
        try {
            await axios.put(`${this.ENDPOINT}/${product.id}`, product);
        } catch (error) {
            console.error("Failed to update product:", error);
        }
    }


    getProductsByIdArray(pinnedProductdIds: number[], products: Product[]) {
        const pinnedProducts = products.filter(product => pinnedProductdIds.includes(product.id))
        return pinnedProducts
    }
}
