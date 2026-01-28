import { err, ok, tryCatchAsync } from '@mks2508/no-throw';
import { StorageErrorCode } from '@/lib/error-codes';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type { IStorageAdapter, StorageResult } from './storage-adapter.interface';

export class IndexedDbStorageAdapter implements IStorageAdapter {
  private dbName = 'tpv-haido-db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('status', 'status', { unique: false });
          orderStore.createIndex('tableNumber', 'tableNumber', { unique: false });
        }

        if (!db.objectStoreNames.contains('tables')) {
          db.createObjectStore('tables', { keyPath: 'id' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  private async performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async performGetAll<T>(storeName: string): Promise<T[]> {
    return this.performTransaction(storeName, 'readonly', (store) => store.getAll());
  }

  // Products
  async getProducts(): Promise<StorageResult<Product[]>> {
    return tryCatchAsync(
      async () => this.performGetAll<Product>('products'),
      StorageErrorCode.ReadFailed
    );
  }

  async createProduct(product: Product): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('products', 'readwrite', (store) => store.add(product));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateProduct(product: Product): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('products', 'readwrite', (store) => store.put(product));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteProduct(product: Product): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('products', 'readwrite', (store) => store.delete(product.id));
    }, StorageErrorCode.DeleteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // Categories
  async getCategories(): Promise<StorageResult<Category[]>> {
    return tryCatchAsync(
      async () => this.performGetAll<Category>('categories'),
      StorageErrorCode.ReadFailed
    );
  }

  async createCategory(category: Category): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('categories', 'readwrite', (store) => store.add(category));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateCategory(category: Category): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('categories', 'readwrite', (store) => store.put(category));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteCategory(category: Category): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('categories', 'readwrite', (store) =>
        store.delete(category.id)
      );
    }, StorageErrorCode.DeleteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // Orders
  async getOrders(): Promise<StorageResult<Order[]>> {
    return tryCatchAsync(
      async () => this.performGetAll<Order>('orders'),
      StorageErrorCode.ReadFailed
    );
  }

  async createOrder(order: Order): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('orders', 'readwrite', (store) => store.add(order));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateOrder(order: Order): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('orders', 'readwrite', (store) => store.put(order));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteOrder(order: Order): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('orders', 'readwrite', (store) => store.delete(order.id));
    }, StorageErrorCode.DeleteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // Tables
  async getTables(): Promise<StorageResult<Table[]>> {
    return tryCatchAsync(
      async () => this.performGetAll<Table>('tables'),
      StorageErrorCode.ReadFailed
    );
  }

  async createTable(table: Table): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('tables', 'readwrite', (store) => store.add(table));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateTable(table: Table): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('tables', 'readwrite', (store) => store.put(table));
    }, StorageErrorCode.WriteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteTable(table: Table): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(async () => {
      await this.performTransaction('tables', 'readwrite', (store) => store.delete(table.id));
    }, StorageErrorCode.DeleteFailed);
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // Utility methods
  async clearAllData(): Promise<StorageResult<void>> {
    return tryCatchAsync(async () => {
      const db = await this.ensureDB();
      const transaction = db.transaction(
        ['products', 'categories', 'orders', 'tables'],
        'readwrite'
      );

      const promises = [
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('products').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('categories').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('orders').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('tables').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
      ];

      await Promise.all(promises);
    }, StorageErrorCode.DeleteFailed);
  }

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

  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<StorageResult<void>> {
    const clearResult = await this.clearAllData();
    if (!clearResult.ok) {
      return err({ code: StorageErrorCode.WriteFailed, message: clearResult.error.message });
    }

    // Import all data
    for (const product of data.products) {
      const result = await this.createProduct(product);
      if (!result.ok) {
        return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
      }
    }

    for (const category of data.categories) {
      const result = await this.createCategory(category);
      if (!result.ok) {
        return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
      }
    }

    for (const order of data.orders) {
      const result = await this.createOrder(order);
      if (!result.ok) {
        return err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
      }
    }

    return ok(undefined);
  }
}
