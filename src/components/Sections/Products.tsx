import { Motion, Presence } from '@motionone/solid';
import { BeerIcon, FilterIcon, PlusIcon } from 'lucide-solid';
import { createMemo, createSignal, For, onMount } from 'solid-js';
import iconOptions from '@/assets/utils/icons/iconOptions.ts';
import ProductDialog, { ProductDialogContent } from '@/components/ProductDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CategoryCard from '@/components/ui/CategoryCard';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ProductCard from '@/components/ui/ProductCard';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type Category from '@/models/Category';
import type Product from '@/models/Product';
import useStore from '@/store/store';

function Products() {
  const store = useStore();

  const [editingProduct, setEditingProduct] = createSignal<Product | null>(null);
  const [editingCategory, setEditingCategory] = createSignal<Category | null>(null);

  const [categoryList, setCategories] = createSignal<Category[]>([]);
  const [productSearchTerm, setProductSearchTerm] = createSignal('');
  const [categorySearchTerm, setCategorySearchTerm] = createSignal('');
  const [selectedCategories, setSelectedCategories] = createSignal<string[]>([]);
  const [selectedBrands, setSelectedBrands] = createSignal<string[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = createSignal(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = createSignal(false);
  const [deleteConfirmation, setDeleteConfirmation] = createSignal<{
    type: 'product' | 'category';
    id: number;
  } | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = createSignal(false);

  const fetchProducts = async () => {
    const result = await store.storageAdapter().getProducts();
    if (result.ok) {
      const productsWithIcons = result.value.map((product) => ({
        ...product,
        icon: iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon,
      })) as Product[];
      store.setProducts(productsWithIcons);
    } else {
      console.error('[Products] Error fetching products:', result.error.code);
    }
  };

  const fetchCategories = async () => {
    const result = await store.storageAdapter().getCategories();
    if (result.ok) {
      setCategories(result.value);
    } else {
      console.error('[Products] Error fetching categories:', result.error.code);
    }
  };

  onMount(() => {
    fetchProducts();
    fetchCategories();
  });

  const handleAddProduct = async (newProduct: Product) => {
    const result = await store.storageAdapter().createProduct(newProduct);
    if (result.ok) {
      fetchProducts();
    } else {
      console.error('[Products] Error creating product:', result.error.code);
    }
  };

  const handleEditProduct = async (editedProduct: Product) => {
    const result = await store.storageAdapter().updateProduct(editedProduct);
    if (result.ok) {
      fetchProducts();
    } else {
      console.error('[Products] Error updating product:', result.error.code);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    setDeleteConfirmation({ type: 'product', id });
  };

  const confirmDeleteProduct = async () => {
    const confirmation = deleteConfirmation();
    if (confirmation?.type === 'product') {
      const productToDelete = store.state.products.find((p) => p.id === confirmation.id);
      if (productToDelete) {
        const result = await store.storageAdapter().deleteProduct(productToDelete);
        if (result.ok) {
          fetchProducts();
        } else {
          console.error('[Products] Error deleting product:', result.error.code);
        }
      }
      setDeleteConfirmation(null);
      setEditingProduct(null);
    }
  };

  const handleAddCategory = async (newCategory: Category) => {
    const result = await store.storageAdapter().createCategory(newCategory);
    if (result.ok) {
      fetchCategories();
    } else {
      console.error('[Products] Error creating category:', result.error.code);
    }
  };

  const handleEditCategory = async (editedCategory: Category) => {
    const result = await store.storageAdapter().updateCategory(editedCategory);
    if (result.ok) {
      fetchCategories();
    } else {
      console.error('[Products] Error updating category:', result.error.code);
    }
  };

  const handleDeleteCategory = (id: number) => {
    setDeleteConfirmation({ type: 'category', id });
  };

  const confirmDeleteCategory = async () => {
    const confirmation = deleteConfirmation();
    if (confirmation?.type === 'category') {
      const categoryToDelete = categoryList().find((c) => c.id === confirmation.id);
      if (categoryToDelete) {
        const result = await store.storageAdapter().deleteCategory(categoryToDelete);
        if (result.ok) {
          fetchCategories();
        } else {
          console.error('[Products] Error deleting category:', result.error.code);
        }
      }
      setDeleteConfirmation(null);
      setEditingCategory(null);
    }
  };

  const defaultProduct: Product = {
    id: 0,
    name: '',
    price: 0,
    brand: '',
    category: '',
    icon: undefined,
    iconType: 'preset',
    selectedIcon: '',
    uploadedImage: null,
  };

  const defaultCategory: Category = {
    id: 0,
    name: '',
    description: '',
  };

  const filteredProducts = createMemo(() => {
    const products = store.state.products;
    if (!products) return [];
    return products.filter(
      (product) =>
        (selectedCategories().length === 0 || selectedCategories().includes(product.category)) &&
        (selectedBrands().length === 0 || selectedBrands().includes(product.brand)) &&
        (product.name.toLowerCase().includes(productSearchTerm().toLowerCase()) ||
          product.brand.toLowerCase().includes(productSearchTerm().toLowerCase()))
    );
  });

  const filteredCategories = createMemo(() => {
    return categoryList().filter(
      (category) =>
        category.name.toLowerCase().includes(categorySearchTerm().toLowerCase()) ||
        category.description.toLowerCase().includes(categorySearchTerm().toLowerCase())
    );
  });

  const availableBrands = createMemo(() => {
    const brands = new Set<string>();
    filteredProducts().forEach((product) => {
      if (selectedCategories().length === 0 || selectedCategories().includes(product.category)) {
        brands.add(product.brand);
      }
    });
    return Array.from(brands);
  });

  const availableCategories = createMemo(() => {
    const categories = new Set<string>();
    filteredProducts().forEach((product) => {
      if (selectedBrands().length === 0 || selectedBrands().includes(product.brand)) {
        categories.add(product.category);
      }
    });
    return Array.from(categories);
  });

  const handleCategorySelect = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const removeFilter = (type: 'category' | 'brand', value: string) => {
    if (type === 'category') {
      setSelectedCategories((prev) => prev.filter((c) => c !== value));
    } else {
      setSelectedBrands((prev) => prev.filter((b) => b !== value));
    }
  };

  const toggleFavorite = (productId: number) => {
    const selectedUser = store.state.selectedUser;
    if (selectedUser) {
      const updatedUsers = store.state.users.map((user) => {
        if (user.id === selectedUser.id) {
          const favProductIds = user.pinnedProductIds || [];
          if (favProductIds.includes(productId)) {
            return { ...user, pinnedProductIds: favProductIds.filter((id) => id !== productId) };
          } else {
            return { ...user, pinnedProductIds: [...favProductIds, productId] };
          }
        }
        return user;
      });
      store.setUsers(updatedUsers);
      store.setSelectedUser(updatedUsers.find((user) => user.id === selectedUser.id)!);
    }
  };

  return (
    <div class="flex flex-col h-full space-y-6 p-4 md:flex-row md:space-x-6 md:space-y-0">
      {/* Products */}
      <div class="w-full md:w-2/3 flex flex-col space-y-6 min-h-0">
        <div class="flex flex-col space-y-4 flex-shrink-0">
          <div class="flex flex-wrap gap-4">
            <Input
              placeholder="Buscar productos..."
              value={productSearchTerm()}
              onInput={(e) => setProductSearchTerm(e.currentTarget.value)}
              class="flex-grow border border-input"
            />
            <Sheet open={isFilterSheetOpen()} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger as="div">
                <Button variant="outline">
                  <FilterIcon class="mr-2 h-4 w-4" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div class="py-4 space-y-4">
                  <div class="space-y-2">
                    <h3 class="text-sm font-medium">Categorias</h3>
                    <For each={availableCategories()}>
                      {(category, index) => (
                        <div class="flex items-center space-x-2 bg-destructive/10 border border-destructive/30 rounded p-2">
                          <Checkbox
                            class="border-red-500"
                            id={`category-${category}-${index()}`}
                            checked={selectedCategories().includes(category)}
                            onChange={() => handleCategorySelect(category)}
                          />
                          <label
                            for={`category-${category}-${index()}`}
                            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {category}
                          </label>
                        </div>
                      )}
                    </For>
                  </div>
                  <div class="space-y-2">
                    <h3 class="text-sm font-medium">Marcas</h3>
                    <For each={availableBrands()}>
                      {(brand, index) => (
                        <div class="flex items-center space-x-2">
                          <Checkbox
                            id={`brand-${brand}-${index()}`}
                            class="border-red-500"
                            checked={selectedBrands().includes(brand)}
                            onChange={() => handleBrandSelect(brand)}
                          />
                          <label
                            for={`brand-${brand}-${index()}`}
                            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {brand}
                          </label>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button onClick={() => setIsProductDialogOpen(true)}>
              <PlusIcon class="mr-2 h-4 w-4" /> Anadir Producto
            </Button>
          </div>
          <div class="flex flex-wrap gap-2">
            <For each={selectedCategories()}>
              {(category, _index) => (
                <Badge variant="secondary" class="px-2 py-1">
                  {category}
                  <Button
                    variant="ghost"
                    size="sm"
                    class="ml-2 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeFilter('category', category)}
                  >
                    <span class="sr-only">Eliminar filtro de categoria</span>
                    &times;
                  </Button>
                </Badge>
              )}
            </For>
            <For each={selectedBrands()}>
              {(brand, _index) => (
                <Badge variant="secondary" class="px-2 py-1">
                  {brand}
                  <Button
                    variant="ghost"
                    size="sm"
                    class="ml-2 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeFilter('brand', brand)}
                  >
                    <span class="sr-only">Eliminar filtro de marca</span>
                    &times;
                  </Button>
                </Badge>
              )}
            </For>
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          <Presence>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              <For each={filteredProducts()}>
                {(product) => (
                  <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProductCard
                      product={product}
                      mode="manage"
                      onAction={() => setEditingProduct(product)}
                      onFavoriteToggle={toggleFavorite}
                      isPinned={store.state.selectedUser?.pinnedProductIds?.includes(product.id)}
                      showCategory={false}
                    />
                  </Motion.div>
                )}
              </For>
            </div>
          </Presence>
        </div>
      </div>

      {/* Categories */}
      <div class="w-full md:w-1/3 flex flex-col space-y-6 min-h-0">
        <div class="flex flex-col space-y-4 flex-shrink-0">
          <Input
            placeholder="Buscar categorias..."
            value={categorySearchTerm()}
            onInput={(e) => setCategorySearchTerm(e.currentTarget.value)}
            class="flex-grow border border-input"
          />
          <Button onClick={() => setIsCategoryDialogOpen(true)}>
            <PlusIcon class="mr-2 h-4 w-4" /> Anadir Categoria
          </Button>
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          <Presence>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <For each={filteredCategories()}>
                {(category) => (
                  <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CategoryCard
                      category={category}
                      mode="manage"
                      onAction={() => setEditingCategory(category)}
                    />
                  </Motion.div>
                )}
              </For>
            </div>
          </Presence>
        </div>
      </div>

      <Dialog open={isProductDialogOpen()} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anadir Producto</DialogTitle>
          </DialogHeader>
          <ProductDialogContent
            editingProduct={defaultProduct}
            onProductSave={(product) => {
              handleAddProduct(product);
              setIsProductDialogOpen(false);
            }}
            onCategorySave={(category) => {
              handleAddCategory(category);
              setIsCategoryDialogOpen(false);
            }}
            onProductDelete={handleDeleteProduct}
            onCategoryDelete={handleDeleteCategory}
            onCancel={() => setIsProductDialogOpen(false)}
            categories={categoryList()}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen()} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anadir Categoria</DialogTitle>
          </DialogHeader>
          <ProductDialogContent
            editingCategory={defaultCategory}
            onCategorySave={(category) => {
              handleAddCategory(category);
              setIsCategoryDialogOpen(false);
            }}
            onProductSave={(product) => {
              handleAddProduct(product);
              setIsProductDialogOpen(false);
            }}
            onProductDelete={handleDeleteProduct}
            onCategoryDelete={handleDeleteCategory}
            onCancel={() => setIsCategoryDialogOpen(false)}
            categories={categoryList()}
          />
        </DialogContent>
      </Dialog>

      <ProductDialog
        editingProduct={editingProduct()}
        editingCategory={editingCategory()}
        onProductSave={(product) => {
          handleEditProduct(product);
          setEditingProduct(null);
        }}
        onCategorySave={(category) => {
          handleEditCategory(category);
          setEditingCategory(null);
        }}
        onProductDelete={handleDeleteProduct}
        onCategoryDelete={handleDeleteCategory}
        onCancel={() => {
          setEditingProduct(null);
          setEditingCategory(null);
        }}
        categories={categoryList()}
      />

      <Dialog open={deleteConfirmation() !== null} onOpenChange={() => setDeleteConfirmation(null)}>
        <DialogContent class="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle class="text-2xl">Confirmar eliminacion</DialogTitle>
            <DialogDescription class="text-base mt-2">
              Estas seguro de que quieres eliminar este{' '}
              {deleteConfirmation()?.type === 'product' ? 'producto' : 'categoria'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="flex-col sm:flex-row gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation(null)}
              class="h-14 text-lg flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={
                deleteConfirmation()?.type === 'product'
                  ? confirmDeleteProduct
                  : confirmDeleteCategory
              }
              class="h-14 text-lg flex-1"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Products;
