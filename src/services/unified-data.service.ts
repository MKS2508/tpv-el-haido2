import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type { IStorageAdapter } from './storage-adapter.interface';

export class UnifiedDataService {
  constructor(private adapter: IStorageAdapter) {}

  // Products
  async getProducts(): Promise<Product[]> {
    return this.adapter.getProducts();
  }

  async createProduct(product: Product): Promise<void> {
    return this.adapter.createProduct(product);
  }

  async updateProduct(product: Product): Promise<void> {
    return this.adapter.updateProduct(product);
  }

  async deleteProduct(product: Product): Promise<void> {
    return this.adapter.deleteProduct(product);
  }

  getProductsByIdArray(pinnedProductIds: number[], products: Product[]): Product[] {
    return products.filter((product) => pinnedProductIds.includes(product.id));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.adapter.getCategories();
  }

  async createCategory(category: Category): Promise<void> {
    return this.adapter.createCategory(category);
  }

  async updateCategory(category: Category): Promise<void> {
    return this.adapter.updateCategory(category);
  }

  async deleteCategory(category: Category): Promise<void> {
    return this.adapter.deleteCategory(category);
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return this.adapter.getOrders();
  }

  async createOrder(order: Order): Promise<void> {
    return this.adapter.createOrder(order);
  }

  async updateOrder(order: Order): Promise<void> {
    return this.adapter.updateOrder(order);
  }

  async deleteOrder(order: Order): Promise<void> {
    return this.adapter.deleteOrder(order);
  }

  // Utility methods
  async exportData(): Promise<{ products: Product[]; categories: Category[]; orders: Order[] }> {
    return this.adapter.exportData?.() || { products: [], categories: [], orders: [] };
  }

  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): Promise<void> {
    return this.adapter.importData?.(data);
  }

  async clearAllData(): Promise<void> {
    return this.adapter.clearAllData?.();
  }
}
