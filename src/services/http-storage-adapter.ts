import { err, ok, tryCatchAsync } from '@mks2508/no-throw';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { config } from '@/lib/config';
import { StorageErrorCode } from '@/lib/error-codes';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type User from '@/models/User';
import type { IStorageAdapter, StorageResult } from './storage-adapter.interface';

export class HttpStorageAdapter implements IStorageAdapter {
  private baseUrl = `${config.api.baseUrl}/api`;
  private timeout = config.api.timeout;
  private activeControllers = new Map<string, AbortController>();

  private getFetchFn() {
    return typeof window !== 'undefined' && '__TAURI_IPC__' in window ? tauriFetch : fetch;
  }

  private createController(requestId: string, timeout = this.timeout): AbortController {
    this.cancelRequest(requestId);

    const controller = new AbortController();
    this.activeControllers.set(requestId, controller);

    if (timeout > 0) {
      setTimeout(() => {
        if (this.activeControllers.has(requestId)) {
          controller.abort(new Error(`Request timeout after ${timeout}ms`));
          this.activeControllers.delete(requestId);
        }
      }, timeout);
    }

    return controller;
  }

  cancelRequest(requestId: string): void {
    const controller = this.activeControllers.get(requestId);
    if (controller) {
      controller.abort(new Error('Request cancelled'));
      this.activeControllers.delete(requestId);
    }
  }

  cancelPendingRequests(): void {
    for (const [id, controller] of this.activeControllers) {
      controller.abort(new Error('All requests cancelled'));
      this.activeControllers.delete(id);
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown,
    timeout = this.timeout
  ): Promise<StorageResult<T>> {
    const requestId = `${method}-${endpoint}-${Date.now()}`;
    const controller = this.createController(requestId, timeout);

    const result = await tryCatchAsync(async () => {
      const url = `${this.baseUrl}${endpoint}`;

      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await this.getFetchFn()(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as T;
    }, StorageErrorCode.ConnectionFailed);

    this.activeControllers.delete(requestId);
    return result;
  }

  // Products
  async getProducts(): Promise<StorageResult<Product[]>> {
    return this.makeRequest<Product[]>('/products');
  }

  async createProduct(product: Product): Promise<StorageResult<void>> {
    const result = await this.makeRequest<Product>('/products', 'POST', product);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async updateProduct(product: Product): Promise<StorageResult<void>> {
    const result = await this.makeRequest<Product>(`/products/${product.id}`, 'PUT', product);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async deleteProduct(product: Product): Promise<StorageResult<void>> {
    const result = await this.makeRequest<void>(`/products/${product.id}`, 'DELETE');
    if (!result.ok) {
      return err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  // Categories
  async getCategories(): Promise<StorageResult<Category[]>> {
    return this.makeRequest<Category[]>('/categories');
  }

  async createCategory(category: Category): Promise<StorageResult<void>> {
    const result = await this.makeRequest<Category>('/categories', 'POST', category);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async updateCategory(category: Category): Promise<StorageResult<void>> {
    const result = await this.makeRequest<Category>(`/categories/${category.id}`, 'PUT', category);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async deleteCategory(category: Category): Promise<StorageResult<void>> {
    const result = await this.makeRequest<void>(`/categories/${category.id}`, 'DELETE');
    if (!result.ok) {
      return err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  // Orders
  async getOrders(): Promise<StorageResult<Order[]>> {
    return this.makeRequest<Order[]>('/orders');
  }

  async createOrder(order: Order): Promise<StorageResult<void>> {
    const result = await this.makeRequest<Order>('/orders', 'POST', order);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async updateOrder(order: Order): Promise<StorageResult<void>> {
    const result = await this.makeRequest<Order>(`/orders/${order.id}`, 'PUT', order);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async deleteOrder(order: Order): Promise<StorageResult<void>> {
    const result = await this.makeRequest<void>(`/orders/${order.id}`, 'DELETE');
    if (!result.ok) {
      return err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  // Users
  async getUsers(): Promise<StorageResult<User[]>> {
    return this.makeRequest<User[]>('/users');
  }

  async createUser(user: User): Promise<StorageResult<void>> {
    const result = await this.makeRequest<User>('/users', 'POST', user);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async updateUser(user: User): Promise<StorageResult<void>> {
    const result = await this.makeRequest<User>(`/users/${user.id}`, 'PUT', user);
    if (!result.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  async deleteUser(user: User): Promise<StorageResult<void>> {
    const result = await this.makeRequest<void>(`/users/${user.id}`, 'DELETE');
    if (!result.ok) {
      return err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
    }
    return ok(undefined);
  }

  // Utility methods
  async exportData(): Promise<
    StorageResult<{ products: Product[]; categories: Category[]; orders: Order[] }>
  > {
    const productsResult = await this.getProducts();
    if (!productsResult.ok) {
      return err({ code: StorageErrorCode.ReadFailed, message: productsResult.error.message });
    }

    const categoriesResult = await this.getCategories();
    if (!categoriesResult.ok) {
      return err({ code: StorageErrorCode.ReadFailed, message: categoriesResult.error.message });
    }

    const ordersResult = await this.getOrders();
    if (!ordersResult.ok) {
      return err({ code: StorageErrorCode.ReadFailed, message: ordersResult.error.message });
    }

    return ok({
      products: productsResult.value,
      categories: categoriesResult.value,
      orders: ordersResult.value,
    });
  }
}
