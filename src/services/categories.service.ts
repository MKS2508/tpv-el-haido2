import axios from 'axios';
import fallbackProducts from '@/assets/products.json';
import type Category from '@/models/Category.ts';

interface ICategoryService {
  getCategories(): Promise<Category[]>;
  createCategory(category: Category): Promise<void>;
  deleteCategory(category: Category): Promise<void>;
  updateCategory(category: Category): Promise<void>;
}

export default class CategoriesService implements ICategoryService {
  public ENDPOINT: string = 'http://localhost:3000/api/categories';
  async getCategories(): Promise<Category[]> {
    try {
      const response = await axios.get(this.ENDPOINT);
      const categories = response.data;
      return categories;
    } catch (error) {
      console.error('Failed to fetch categories from backend:', error);
      console.log('🔧 [DEBUG MODE] Using fallback categories from products.json');
      return this.getFallbackCategories();
    }
  }

  private getFallbackCategories(): Category[] {
    console.log('📦 Extracting categories from products.json');

    // Extraer categorías únicas de los productos
    const uniqueCategories = [
      ...new Set(fallbackProducts.map((product) => product.category)),
    ].filter(Boolean); // Filtrar valores null/undefined

    // Generar objetos Category con IDs
    const categories: Category[] = uniqueCategories.map((categoryName, index) => ({
      id: index + 1,
      name: categoryName,
      description: `Categoría ${categoryName}`,
      icon: undefined, // Opcional, se puede añadir lógica para iconos por categoría
    }));

    console.log(
      `✅ Generated ${categories.length} fallback categories:`,
      categories.map((c) => c.name)
    );
    return categories;
  }

  async createCategory(category: Category): Promise<void> {
    try {
      await axios.post(this.ENDPOINT, category);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  }

  async deleteCategory(category: Category): Promise<void> {
    try {
      await axios.delete(`${this.ENDPOINT}/${category.id}`);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  }

  async updateCategory(category: Category): Promise<void> {
    try {
      await axios.put(`${this.ENDPOINT}/${category.id}`, category);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  }
}
