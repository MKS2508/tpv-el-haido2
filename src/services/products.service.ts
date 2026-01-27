import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { BeerIcon } from 'lucide-react';
import React from 'react';
import fallbackProducts from '@/assets/products.json';
import iconOptions from '@/assets/utils/icons/iconOptions.ts';
import type Product from '@/models/Product.ts';

const DEFAULT_TIMEOUT = 10000;

interface IProductService {
  getProducts(): Promise<Product[]>;
  deleteProduct(product: Product): Promise<void>;
  updateProduct(product: Product): Promise<void>;
  createProduct(product: Product): Promise<void>;
  getProductsByIdArray(pinnedProductdIds: number[], products: Product[]): Product[];
}

export default class ProductService implements IProductService {
  public ENDPOINT: string = 'http://localhost:3000/api/products';
  private activeController: AbortController | null = null;

  private getFetchFn() {
    return typeof window !== 'undefined' && '__TAURI_IPC__' in window ? tauriFetch : fetch;
  }

  private createController(timeout = DEFAULT_TIMEOUT): AbortController {
    this.cancelPendingRequest();
    const controller = new AbortController();
    this.activeController = controller;

    if (timeout > 0) {
      setTimeout(() => {
        if (this.activeController === controller) {
          controller.abort(new Error(`Request timeout after ${timeout}ms`));
          this.activeController = null;
        }
      }, timeout);
    }

    return controller;
  }

  cancelPendingRequest(): void {
    if (this.activeController) {
      this.activeController.abort(new Error('Request cancelled'));
      this.activeController = null;
    }
  }

  async getProducts(): Promise<Product[]> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(this.ENDPOINT, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const products = (await response.json()) as Product[];
      console.log('products fetched:', products.length);
      return products;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Products fetch aborted');
        return this.getFallbackProducts();
      }
      console.error('Failed to fetch products from backend:', error);
      console.log('🔧 [DEBUG MODE] Using fallback products from products.json');
      return this.getFallbackProducts();
    } finally {
      this.activeController = null;
    }
  }

  private getFallbackProducts(): Product[] {
    console.log('📦 Loading fallback products from products.json');

    const productsWithIcons = fallbackProducts.map((product) => ({
      ...product,
      icon: React.createElement(
        iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon
      ),
    }));

    console.log(`✅ Loaded ${productsWithIcons.length} fallback products`);
    return productsWithIcons;
  }

  async createProduct(product: Product): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      this.activeController = null;
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(`${this.ENDPOINT}/${product.id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      this.activeController = null;
    }
  }

  async updateProduct(product: Product): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(`${this.ENDPOINT}/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      this.activeController = null;
    }
  }

  getProductsByIdArray(pinnedProductdIds: number[], products: Product[]) {
    const pinnedProducts = products.filter((product) => pinnedProductdIds.includes(product.id));
    return pinnedProducts;
  }
}
