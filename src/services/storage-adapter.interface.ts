import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';

export type StorageMode = 'sqlite' | 'http' | 'indexeddb';

export interface IStorageAdapter {
  // Products
  getProducts(): Promise<Product[]>;
  createProduct(product: Product): Promise<void>;
  updateProduct(product: Product): Promise<void>;
  deleteProduct(product: Product): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: Category): Promise<void>;
  updateCategory(category: Category): Promise<void>;
  deleteCategory(category: Category): Promise<void>;

  // Orders
  getOrders(): Promise<Order[]>;
  createOrder(order: Order): Promise<void>;
  updateOrder(order: Order): Promise<void>;
  deleteOrder(order: Order): Promise<void>;

  // Tables (if needed for persistence)
  getTables?(): Promise<Table[]>;
  createTable?(table: Table): Promise<void>;
  updateTable?(table: Table): Promise<void>;
  deleteTable?(table: Table): Promise<void>;

  // Utility methods
  clearAllData?(): Promise<void>;
  exportData?(): Promise<{ products: Product[]; categories: Category[]; orders: Order[] }>;
  importData?(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<void>;
}
