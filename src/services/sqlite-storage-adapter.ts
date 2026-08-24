import { err, type Result } from '@mks2508/no-throw';
import { StorageErrorCode } from '@/lib/error-codes';
import { storageLog } from '@/lib/logger';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type User from '@/models/User';
import { getPlatformService } from '@/services/platform';
import type { PlatformError, PlatformService } from '@/services/platform/PlatformService';
import type { IStorageAdapter, StorageResult } from './storage-adapter.interface';

/**
 * Bridges a `PlatformError` into a `StorageResultError`, preserving the
 * message + cause so ops still see what failed. Each call site picks the
 * appropriate `StorageErrorCode` fallback for its operation.
 *
 * Mirrors the `toAuditError<T>()` bridge in `audit.service.ts` (R2).
 */
function toStorageError<T>(
  platformResult: Result<T, PlatformError>,
  fallbackCode: StorageErrorCode
): StorageResult<T> {
  if (platformResult.ok) return platformResult;
  return err({
    code: fallbackCode,
    message: platformResult.error.message,
    cause: platformResult.error.cause,
  });
}

/**
 * SQLite storage adapter that uses PlatformService to interact with
 * the embedded SQLite database in the Rust backend.
 *
 * All 23 Tauri commands are routed through `PlatformService` instead of
 * direct `@tauri-apps/api/core` `invoke()` calls. The platform service
 * wraps each call in `tryCatchAsync` and returns `Result<T, PlatformError>`,
 * which we bridge into the adapter's own `StorageResult<T>` via
 * `toStorageError<T>()`.
 */
export class SqliteStorageAdapter implements IStorageAdapter {
  private platform: PlatformService;

  constructor(platform: PlatformService = getPlatformService()) {
    this.platform = platform;
  }

  // ==================== Products ====================

  async getProducts(): Promise<StorageResult<Product[]>> {
    const start = Date.now();
    const result = await toStorageError(
      await this.platform.getProducts(),
      StorageErrorCode.ReadFailed
    );
    storageLog.debug('sqlite.getProducts', { ms: Date.now() - start });
    return result;
  }

  async createProduct(product: Product): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.createProduct(product), StorageErrorCode.WriteFailed);
  }

  async updateProduct(product: Product): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.updateProduct(product), StorageErrorCode.WriteFailed);
  }

  async deleteProduct(product: Product): Promise<StorageResult<void>> {
    return toStorageError(
      await this.platform.deleteProduct(product),
      StorageErrorCode.DeleteFailed
    );
  }

  // ==================== Categories ====================

  async getCategories(): Promise<StorageResult<Category[]>> {
    return toStorageError(await this.platform.getCategories(), StorageErrorCode.ReadFailed);
  }

  async createCategory(category: Category): Promise<StorageResult<void>> {
    return toStorageError(
      await this.platform.createCategory(category),
      StorageErrorCode.WriteFailed
    );
  }

  async updateCategory(category: Category): Promise<StorageResult<void>> {
    return toStorageError(
      await this.platform.updateCategory(category),
      StorageErrorCode.WriteFailed
    );
  }

  async deleteCategory(category: Category): Promise<StorageResult<void>> {
    return toStorageError(
      await this.platform.deleteCategory(category),
      StorageErrorCode.DeleteFailed
    );
  }

  // ==================== Orders ====================

  async getOrders(): Promise<StorageResult<Order[]>> {
    const start = Date.now();
    const result = await toStorageError(
      await this.platform.getOrders(),
      StorageErrorCode.ReadFailed
    );
    storageLog.debug('sqlite.getOrders', { ms: Date.now() - start });
    return result;
  }

  async createOrder(order: Order): Promise<StorageResult<void>> {
    const start = Date.now();
    const result = await toStorageError(
      await this.platform.createOrder(order),
      StorageErrorCode.WriteFailed
    );
    storageLog.debug('sqlite.createOrder', { ms: Date.now() - start });
    return result;
  }

  async updateOrder(order: Order): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.updateOrder(order), StorageErrorCode.WriteFailed);
  }

  async deleteOrder(order: Order): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.deleteOrder(order), StorageErrorCode.DeleteFailed);
  }

  // ==================== Tables ====================

  async getTables(): Promise<StorageResult<Table[]>> {
    return toStorageError(await this.platform.getTables(), StorageErrorCode.ReadFailed);
  }

  async createTable(table: Table): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.createTable(table), StorageErrorCode.WriteFailed);
  }

  async updateTable(table: Table): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.updateTable(table), StorageErrorCode.WriteFailed);
  }

  async deleteTable(table: Table): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.deleteTable(table), StorageErrorCode.DeleteFailed);
  }

  // ==================== Users ====================

  async getUsers(): Promise<StorageResult<User[]>> {
    return toStorageError(await this.platform.getUsers(), StorageErrorCode.ReadFailed);
  }

  async createUser(user: User): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.createUser(user), StorageErrorCode.WriteFailed);
  }

  async updateUser(user: User): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.updateUser(user), StorageErrorCode.WriteFailed);
  }

  async deleteUser(user: User): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.deleteUser(user), StorageErrorCode.DeleteFailed);
  }

  // ==================== Utility ====================

  async clearAllData(): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.clearAllData(), StorageErrorCode.DeleteFailed);
  }

  async exportData(): Promise<
    StorageResult<{ products: Product[]; categories: Category[]; orders: Order[] }>
  > {
    return toStorageError(await this.platform.exportData(), StorageErrorCode.ReadFailed);
  }

  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<StorageResult<void>> {
    return toStorageError(await this.platform.importData(data), StorageErrorCode.WriteFailed);
  }
}
