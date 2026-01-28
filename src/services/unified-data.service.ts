import { err, ok } from '@mks2508/no-throw';
import { StorageErrorCode } from '@/lib/error-codes';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type { IStorageAdapter, StorageResult } from './storage-adapter.interface';

export class UnifiedDataService {
  constructor(private adapter: IStorageAdapter) {}

  // Products
  async getProducts(): Promise<StorageResult<Product[]>> {
    return this.adapter.getProducts();
  }

  async createProduct(product: Product): Promise<StorageResult<void>> {
    return this.adapter.createProduct(product);
  }

  async updateProduct(product: Product): Promise<StorageResult<void>> {
    return this.adapter.updateProduct(product);
  }

  async deleteProduct(product: Product): Promise<StorageResult<void>> {
    return this.adapter.deleteProduct(product);
  }

  getProductsByIdArray(pinnedProductIds: number[], products: Product[]): Product[] {
    return products.filter((product) => pinnedProductIds.includes(product.id));
  }

  // Categories
  async getCategories(): Promise<StorageResult<Category[]>> {
    return this.adapter.getCategories();
  }

  async createCategory(category: Category): Promise<StorageResult<void>> {
    return this.adapter.createCategory(category);
  }

  async updateCategory(category: Category): Promise<StorageResult<void>> {
    return this.adapter.updateCategory(category);
  }

  async deleteCategory(category: Category): Promise<StorageResult<void>> {
    return this.adapter.deleteCategory(category);
  }

  // Orders
  async getOrders(): Promise<StorageResult<Order[]>> {
    return this.adapter.getOrders();
  }

  async createOrder(order: Order): Promise<StorageResult<void>> {
    return this.adapter.createOrder(order);
  }

  async updateOrder(order: Order): Promise<StorageResult<void>> {
    return this.adapter.updateOrder(order);
  }

  async deleteOrder(order: Order): Promise<StorageResult<void>> {
    return this.adapter.deleteOrder(order);
  }

  // Utility methods
  async exportData(): Promise<
    StorageResult<{ products: Product[]; categories: Category[]; orders: Order[] }>
  > {
    if (this.adapter.exportData) {
      return this.adapter.exportData();
    }
    return ok({ products: [], categories: [], orders: [] });
  }

  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<StorageResult<void>> {
    if (this.adapter.importData) {
      return this.adapter.importData(data);
    }
    return err({
      code: StorageErrorCode.WriteFailed,
      message: 'Import not supported by this adapter',
    });
  }

  async clearAllData(): Promise<StorageResult<void>> {
    if (this.adapter.clearAllData) {
      return this.adapter.clearAllData();
    }
    return err({
      code: StorageErrorCode.DeleteFailed,
      message: 'Clear not supported by this adapter',
    });
  }
}
