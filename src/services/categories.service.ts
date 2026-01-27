import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import fallbackProducts from '@/assets/products.json';
import type Category from '@/models/Category.ts';

const DEFAULT_TIMEOUT = 10000;

interface ICategoryService {
  getCategories(): Promise<Category[]>;
  createCategory(category: Category): Promise<void>;
  deleteCategory(category: Category): Promise<void>;
  updateCategory(category: Category): Promise<void>;
}

export default class CategoriesService implements ICategoryService {
  public ENDPOINT: string = 'http://localhost:3000/api/categories';
  private activeController: AbortController | null = null;

  private getFetchFn() {
    return typeof window !== 'undefined' && '__TAURI_IPC__' in window ? tauriFetch : fetch;
  }

  private createController(timeout = DEFAULT_TIMEOUT): AbortController {
    this.cancelPendingRequest();
    const controller = new AbortController();
    this.activeController = controller;

    if (timeout > 0) {
      setTimeout(() => {
        if (this.activeController === controller) {
          controller.abort(new Error(`Request timeout after ${timeout}ms`));
          this.activeController = null;
        }
      }, timeout);
    }

    return controller;
  }

  cancelPendingRequest(): void {
    if (this.activeController) {
      this.activeController.abort(new Error('Request cancelled'));
      this.activeController = null;
    }
  }

  async getCategories(): Promise<Category[]> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(this.ENDPOINT, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as Category[];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Categories fetch aborted');
        return this.getFallbackCategories();
      }
      console.error('Failed to fetch categories from backend:', error);
      console.log('🔧 [DEBUG MODE] Using fallback categories from products.json');
      return this.getFallbackCategories();
    } finally {
      this.activeController = null;
    }
  }

  private getFallbackCategories(): Category[] {
    console.log('📦 Extracting categories from products.json');

    const uniqueCategories = [
      ...new Set(fallbackProducts.map((product) => product.category)),
    ].filter(Boolean);

    const categories: Category[] = uniqueCategories.map((categoryName, index) => ({
      id: index + 1,
      name: categoryName,
      description: `Categoría ${categoryName}`,
      icon: undefined,
    }));

    console.log(
      `✅ Generated ${categories.length} fallback categories:`,
      categories.map((c) => c.name)
    );
    return categories;
  }

  async createCategory(category: Category): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      this.activeController = null;
    }
  }

  async deleteCategory(category: Category): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(`${this.ENDPOINT}/${category.id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      this.activeController = null;
    }
  }

  async updateCategory(category: Category): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(`${this.ENDPOINT}/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      this.activeController = null;
    }
  }
}
