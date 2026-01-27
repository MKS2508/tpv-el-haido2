import { fetch } from '@tauri-apps/plugin-http';
import axios from 'axios';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type { IStorageAdapter } from './storage-adapter.interface';

export class HttpStorageAdapter implements IStorageAdapter {
  private baseUrl = 'http://localhost:3000/api';

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    try {
      // Check if we're running in Tauri environment
      if (typeof window !== 'undefined' && '__TAURI_IPC__' in window) {
        const url = `${this.baseUrl}${endpoint}`;

        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (data && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return (await response.json()) as T;
      } else {
        // Fallback to axios for development/browser environment
        const url = `${this.baseUrl}${endpoint}`;
        let response;

        switch (method) {
          case 'GET':
            response = await axios.get(url);
            break;
          case 'POST':
            response = await axios.post(url, data);
            break;
          case 'PUT':
            response = await axios.put(url, data);
            break;
          case 'DELETE':
            response = await axios.delete(url);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        return response.data as T;
      }
    } catch (error) {
      console.error(`HTTP request failed for ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  // Products
  async getProducts(): Promise<Product[]> {
    try {
      return await this.makeRequest<Product[]>('/products');
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return [];
    }
  }

  async createProduct(product: Product): Promise<void> {
    try {
      await this.makeRequest('/products', 'POST', product);
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  }

  async updateProduct(product: Product): Promise<void> {
    try {
      await this.makeRequest(`/products/${product.id}`, 'PUT', product);
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    try {
      await this.makeRequest(`/products/${product.id}`, 'DELETE');
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      return await this.makeRequest<Category[]>('/categories');
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  }

  async createCategory(category: Category): Promise<void> {
    try {
      await this.makeRequest('/categories', 'POST', category);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  }

  async updateCategory(category: Category): Promise<void> {
    try {
      await this.makeRequest(`/categories/${category.id}`, 'PUT', category);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  }

  async deleteCategory(category: Category): Promise<void> {
    try {
      await this.makeRequest(`/categories/${category.id}`, 'DELETE');
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    try {
      return await this.makeRequest<Order[]>('/orders');
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      return [];
    }
  }

  async createOrder(order: Order): Promise<void> {
    try {
      await this.makeRequest('/orders', 'POST', order);
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  }

  async updateOrder(order: Order): Promise<void> {
    try {
      await this.makeRequest(`/orders/${order.id}`, 'PUT', order);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  }

  async deleteOrder(order: Order): Promise<void> {
    try {
      await this.makeRequest(`/orders/${order.id}`, 'DELETE');
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  }

  // Utility methods
  async exportData(): Promise<{ products: Product[]; categories: Category[]; orders: Order[] }> {
    try {
      const [products, categories, orders] = await Promise.all([
        this.getProducts(),
        this.getCategories(),
        this.getOrders(),
      ]);

      return { products, categories, orders };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }
}
