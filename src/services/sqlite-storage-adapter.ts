import { invoke } from '@tauri-apps/api/core';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type { IStorageAdapter } from './storage-adapter.interface';

/**
 * SQLite storage adapter that uses Tauri commands to interact with
 * the embedded SQLite database in the Rust backend.
 */
export class SqliteStorageAdapter implements IStorageAdapter {
  // ==================== Products ====================

  async getProducts(): Promise<Product[]> {
    try {
      const products = await invoke<Product[]>('get_products');
      return products;
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error getting products:', error);
      return [];
    }
  }

  async createProduct(product: Product): Promise<void> {
    try {
      await invoke('create_product', { product });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(product: Product): Promise<void> {
    try {
      await invoke('update_product', { product });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    try {
      await invoke('delete_product', { id: product.id });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error deleting product:', error);
      throw error;
    }
  }

  // ==================== Categories ====================

  async getCategories(): Promise<Category[]> {
    try {
      const categories = await invoke<Category[]>('get_categories');
      return categories;
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error getting categories:', error);
      return [];
    }
  }

  async createCategory(category: Category): Promise<void> {
    try {
      await invoke('create_category', { category });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(category: Category): Promise<void> {
    try {
      await invoke('update_category', { category });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(category: Category): Promise<void> {
    try {
      await invoke('delete_category', { id: category.id });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error deleting category:', error);
      throw error;
    }
  }

  // ==================== Orders ====================

  async getOrders(): Promise<Order[]> {
    try {
      const orders = await invoke<Order[]>('get_orders');
      return orders;
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error getting orders:', error);
      return [];
    }
  }

  async createOrder(order: Order): Promise<void> {
    try {
      await invoke('create_order', { order });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(order: Order): Promise<void> {
    try {
      await invoke('update_order', { order });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error updating order:', error);
      throw error;
    }
  }

  async deleteOrder(order: Order): Promise<void> {
    try {
      await invoke('delete_order', { id: order.id });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error deleting order:', error);
      throw error;
    }
  }

  // ==================== Tables ====================

  async getTables(): Promise<Table[]> {
    try {
      const tables = await invoke<Table[]>('get_tables');
      return tables;
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error getting tables:', error);
      return [];
    }
  }

  async createTable(table: Table): Promise<void> {
    try {
      await invoke('create_table', { table });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error creating table:', error);
      throw error;
    }
  }

  async updateTable(table: Table): Promise<void> {
    try {
      await invoke('update_table', { table });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error updating table:', error);
      throw error;
    }
  }

  async deleteTable(table: Table): Promise<void> {
    try {
      await invoke('delete_table', { id: table.id });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error deleting table:', error);
      throw error;
    }
  }

  // ==================== Utility ====================

  async clearAllData(): Promise<void> {
    try {
      await invoke('clear_all_data');
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error clearing all data:', error);
      throw error;
    }
  }

  async exportData(): Promise<{ products: Product[]; categories: Category[]; orders: Order[] }> {
    try {
      const data = await invoke<{ products: Product[]; categories: Category[]; orders: Order[] }>(
        'export_data'
      );
      return data;
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error exporting data:', error);
      throw error;
    }
  }

  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<void> {
    try {
      await invoke('import_data', { data });
    } catch (error) {
      console.error('[SqliteStorageAdapter] Error importing data:', error);
      throw error;
    }
  }
}
