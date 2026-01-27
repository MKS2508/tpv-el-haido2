import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type { IStorageAdapter } from './storage-adapter.interface';

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

        // Create object stores
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
  async getProducts(): Promise<Product[]> {
    try {
      return await this.performGetAll<Product>('products');
    } catch (error) {
      console.error('Failed to fetch products from IndexedDB:', error);
      return [];
    }
  }

  async createProduct(product: Product): Promise<void> {
    try {
      await this.performTransaction('products', 'readwrite', (store) => store.add(product));
    } catch (error) {
      console.error('Failed to create product in IndexedDB:', error);
    }
  }

  async updateProduct(product: Product): Promise<void> {
    try {
      await this.performTransaction('products', 'readwrite', (store) => store.put(product));
    } catch (error) {
      console.error('Failed to update product in IndexedDB:', error);
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    try {
      await this.performTransaction('products', 'readwrite', (store) => store.delete(product.id));
    } catch (error) {
      console.error('Failed to delete product from IndexedDB:', error);
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      return await this.performGetAll<Category>('categories');
    } catch (error) {
      console.error('Failed to fetch categories from IndexedDB:', error);
      return [];
    }
  }

  async createCategory(category: Category): Promise<void> {
    try {
      await this.performTransaction('categories', 'readwrite', (store) => store.add(category));
    } catch (error) {
      console.error('Failed to create category in IndexedDB:', error);
    }
  }

  async updateCategory(category: Category): Promise<void> {
    try {
      await this.performTransaction('categories', 'readwrite', (store) => store.put(category));
    } catch (error) {
      console.error('Failed to update category in IndexedDB:', error);
    }
  }

  async deleteCategory(category: Category): Promise<void> {
    try {
      await this.performTransaction('categories', 'readwrite', (store) =>
        store.delete(category.id)
      );
    } catch (error) {
      console.error('Failed to delete category from IndexedDB:', error);
    }
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    try {
      return await this.performGetAll<Order>('orders');
    } catch (error) {
      console.error('Failed to fetch orders from IndexedDB:', error);
      return [];
    }
  }

  async createOrder(order: Order): Promise<void> {
    try {
      await this.performTransaction('orders', 'readwrite', (store) => store.add(order));
    } catch (error) {
      console.error('Failed to create order in IndexedDB:', error);
    }
  }

  async updateOrder(order: Order): Promise<void> {
    try {
      await this.performTransaction('orders', 'readwrite', (store) => store.put(order));
    } catch (error) {
      console.error('Failed to update order in IndexedDB:', error);
    }
  }

  async deleteOrder(order: Order): Promise<void> {
    try {
      await this.performTransaction('orders', 'readwrite', (store) => store.delete(order.id));
    } catch (error) {
      console.error('Failed to delete order from IndexedDB:', error);
    }
  }

  // Tables (optional)
  async getTables(): Promise<Table[]> {
    try {
      return await this.performGetAll<Table>('tables');
    } catch (error) {
      console.error('Failed to fetch tables from IndexedDB:', error);
      return [];
    }
  }

  async createTable(table: Table): Promise<void> {
    try {
      await this.performTransaction('tables', 'readwrite', (store) => store.add(table));
    } catch (error) {
      console.error('Failed to create table in IndexedDB:', error);
    }
  }

  async updateTable(table: Table): Promise<void> {
    try {
      await this.performTransaction('tables', 'readwrite', (store) => store.put(table));
    } catch (error) {
      console.error('Failed to update table in IndexedDB:', error);
    }
  }

  async deleteTable(table: Table): Promise<void> {
    try {
      await this.performTransaction('tables', 'readwrite', (store) => store.delete(table.id));
    } catch (error) {
      console.error('Failed to delete table from IndexedDB:', error);
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Failed to clear IndexedDB data:', error);
    }
  }

  async exportData(): Promise<{ products: Product[]; categories: Category[]; orders: Order[] }> {
    try {
      const [products, categories, orders] = await Promise.all([
        this.getProducts(),
        this.getCategories(),
        this.getOrders(),
      ]);

      return { products, categories, orders };
    } catch (error) {
      console.error('Failed to export data from IndexedDB:', error);
      throw error;
    }
  }

  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<void> {
    try {
      // Clear existing data first
      await this.clearAllData();

      // Import new data
      const importPromises: Promise<void>[] = [];

      // Import products
      for (const product of data.products) {
        importPromises.push(this.createProduct(product));
      }

      // Import categories
      for (const category of data.categories) {
        importPromises.push(this.createCategory(category));
      }

      // Import orders
      for (const order of data.orders) {
        importPromises.push(this.createOrder(order));
      }

      await Promise.all(importPromises);
    } catch (error) {
      console.error('Failed to import data to IndexedDB:', error);
      throw error;
    }
  }
}
