import { err, ok, tryCatchAsync } from '@mks2508/no-throw';
import { invoke } from '@tauri-apps/api/core';
import { StorageErrorCode } from '@/lib/error-codes';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type User from '@/models/User';
import type { IStorageAdapter, StorageResult } from './storage-adapter.interface';

/**
 * SQLite storage adapter that uses Tauri commands to interact with
 * the embedded SQLite database in the Rust backend.
 */
export class SqliteStorageAdapter implements IStorageAdapter {
  // ==================== Products ====================

  async getProducts(): Promise<StorageResult<Product[]>> {
    return tryCatchAsync(
      async () => invoke<Product[]>('get_products'),
      StorageErrorCode.ReadFailed
    );
  }

  async createProduct(product: Product): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('create_product', { product }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateProduct(product: Product): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('update_product', { product }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteProduct(product: Product): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('delete_product', { id: product.id }),
      StorageErrorCode.DeleteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // ==================== Categories ====================

  async getCategories(): Promise<StorageResult<Category[]>> {
    return tryCatchAsync(
      async () => invoke<Category[]>('get_categories'),
      StorageErrorCode.ReadFailed
    );
  }

  async createCategory(category: Category): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('create_category', { category }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateCategory(category: Category): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('update_category', { category }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteCategory(category: Category): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('delete_category', { id: category.id }),
      StorageErrorCode.DeleteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // ==================== Orders ====================

  async getOrders(): Promise<StorageResult<Order[]>> {
    return tryCatchAsync(async () => invoke<Order[]>('get_orders'), StorageErrorCode.ReadFailed);
  }

  async createOrder(order: Order): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('create_order', { order }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateOrder(order: Order): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('update_order', { order }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteOrder(order: Order): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('delete_order', { id: order.id }),
      StorageErrorCode.DeleteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // ==================== Tables ====================

  async getTables(): Promise<StorageResult<Table[]>> {
    return tryCatchAsync(async () => invoke<Table[]>('get_tables'), StorageErrorCode.ReadFailed);
  }

  async createTable(table: Table): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('create_table', { table }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateTable(table: Table): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('update_table', { table }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteTable(table: Table): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('delete_table', { id: table.id }),
      StorageErrorCode.DeleteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // ==================== Users ====================

  async getUsers(): Promise<StorageResult<User[]>> {
    return tryCatchAsync(async () => invoke<User[]>('get_users'), StorageErrorCode.ReadFailed);
  }

  async createUser(user: User): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('create_user', { user }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async updateUser(user: User): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('update_user', { user }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }

  async deleteUser(user: User): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('delete_user', { id: user.id }),
      StorageErrorCode.DeleteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  // ==================== Utility ====================

  async clearAllData(): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('clear_all_data'),
      StorageErrorCode.DeleteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.DeleteFailed, message: result.error.message });
  }

  async exportData(): Promise<
    StorageResult<{ products: Product[]; categories: Category[]; orders: Order[] }>
  > {
    return tryCatchAsync(
      async () =>
        invoke<{ products: Product[]; categories: Category[]; orders: Order[] }>('export_data'),
      StorageErrorCode.ReadFailed
    );
  }

  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<StorageResult<void>> {
    const result = await tryCatchAsync(
      async () => invoke('import_data', { data }),
      StorageErrorCode.WriteFailed
    );
    return result.ok
      ? ok(undefined)
      : err({ code: StorageErrorCode.WriteFailed, message: result.error.message });
  }
}
