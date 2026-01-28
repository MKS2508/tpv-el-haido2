import { AnimatePresence, motion } from 'framer-motion';
import { BeerIcon, FilterIcon, PlusIcon } from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import iconOptions from '@/assets/utils/icons/iconOptions.ts';
import ProductDialog from '@/components/ProductDialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type Category from '@/models/Category';
import type Product from '@/models/Product';
import { useProductsData } from '@/store/selectors';

const Products = memo(() => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [categoryList, setCategories] = useState<Category[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'product' | 'category';
    id: number;
  } | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const { users, selectedUser, setUsers, setSelectedUser, products, setProducts, storageAdapter } =
    useProductsData();

  const fetchProducts = useCallback(async () => {
    const result = await storageAdapter.getProducts();
    if (result.ok) {
      const productsWithIcons = result.value.map((product) => ({
        ...product,
        icon: React.createElement(
          iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon
        ),
      }));
      setProducts(productsWithIcons);
    } else {
      console.error('[Products] Error fetching products:', result.error.code);
    }
  }, [storageAdapter, setProducts]);

  const fetchCategories = useCallback(async () => {
    const result = await storageAdapter.getCategories();
    if (result.ok) {
      setCategories(result.value);
    } else {
      console.error('[Products] Error fetching categories:', result.error.code);
    }
  }, [storageAdapter]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchCategories, fetchProducts]);

  const handleAddProduct = async (newProduct: Product) => {
    const result = await storageAdapter.createProduct(newProduct);
    if (result.ok) {
      fetchProducts();
    } else {
      console.error('[Products] Error creating product:', result.error.code);
    }
  };

  const handleEditProduct = async (editedProduct: Product) => {
    const result = await storageAdapter.updateProduct(editedProduct);
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
    if (deleteConfirmation?.type === 'product') {
      const productToDelete = products.find((p) => p.id === deleteConfirmation.id);
      if (productToDelete) {
        const result = await storageAdapter.deleteProduct(productToDelete);
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
    const result = await storageAdapter.createCategory(newCategory);
    if (result.ok) {
      fetchCategories();
    } else {
      console.error('[Products] Error creating category:', result.error.code);
    }
  };

  const handleEditCategory = async (editedCategory: Category) => {
    const result = await storageAdapter.updateCategory(editedCategory);
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
    if (deleteConfirmation?.type === 'category') {
      const categoryToDelete = categoryList.find((c) => c.id === deleteConfirmation.id);
      if (categoryToDelete) {
        const result = await storageAdapter.deleteCategory(categoryToDelete);
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
    icon: <></>,
    iconType: 'preset',
    selectedIcon: '',
    uploadedImage: null,
  };

  const defaultCategory: Category = {
    id: 0,
    name: '',
    description: '',
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(
      (product) =>
        (selectedCategories.length === 0 || selectedCategories.includes(product.category)) &&
        (selectedBrands.length === 0 || selectedBrands.includes(product.brand)) &&
        (product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          product.brand.toLowerCase().includes(productSearchTerm.toLowerCase()))
    );
  }, [products, selectedCategories, selectedBrands, productSearchTerm]);

  const filteredCategories = useMemo(() => {
    return categoryList.filter(
      (category) =>
        category.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(categorySearchTerm.toLowerCase())
    );
  }, [categoryList, categorySearchTerm]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    filteredProducts.forEach((product) => {
      if (selectedCategories.length === 0 || selectedCategories.includes(product.category)) {
        brands.add(product.brand);
      }
    });
    return Array.from(brands);
  }, [filteredProducts, selectedCategories]);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    filteredProducts.forEach((product) => {
      if (selectedBrands.length === 0 || selectedBrands.includes(product.brand)) {
        categories.add(product.category);
      }
    });
    return Array.from(categories);
  }, [filteredProducts, selectedBrands]);

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
    if (selectedUser) {
      const updatedUsers = users.map((user) => {
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
      setUsers(updatedUsers);
      setSelectedUser(updatedUsers.find((user) => user.id === selectedUser.id)!);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 p-4 md:flex-row md:space-x-6 md:space-y-0">
      {/* Products */}
      <div className="w-full md:w-2/3 flex flex-col space-y-6 min-h-0">
        <div className="flex flex-col space-y-4 flex-shrink-0">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Buscar productos..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="flex-grow border border-input"
            />
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <FilterIcon className="mr-2 h-4 w-4" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Categorías</h3>
                    {availableCategories.map((category, index) => (
                      <div
                        key={`category-filter-${category}-${index}`}
                        className="flex items-center space-x-2 bg-destructive/10 border border-destructive/30 rounded p-2"
                      >
                        <Checkbox
                          className="border-red-500"
                          id={`category-${category}-${index}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => handleCategorySelect(category)}
                        />
                        <label
                          htmlFor={`category-${category}-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Marcas</h3>
                    {availableBrands.map((brand, index) => (
                      <div
                        key={`brand-filter-${brand}-${index}`}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`brand-${brand}-${index}`}
                          className="border-red-500"
                          checked={selectedBrands.includes(brand)}
                          onCheckedChange={() => handleBrandSelect(brand)}
                        />
                        <label
                          htmlFor={`brand-${brand}-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button onClick={() => setIsProductDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" /> Añadir Producto
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category, index) => (
              <Badge
                key={`selected-category-${category}-${index}`}
                variant="secondary"
                className="px-2 py-1"
              >
                {category}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeFilter('category', category)}
                >
                  <span className="sr-only">Eliminar filtro de categoría</span>
                  &times;
                </Button>
              </Badge>
            ))}
            {selectedBrands.map((brand, index) => (
              <Badge
                key={`selected-brand-${brand}-${index}`}
                variant="secondary"
                className="px-2 py-1"
              >
                {brand}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeFilter('brand', brand)}
                >
                  <span className="sr-only">Eliminar filtro de marca</span>
                  &times;
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <AnimatePresence>
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4`}
            >
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
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
                    isPinned={selectedUser?.pinnedProductIds?.includes(product.id)}
                    showCategory={false}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </ScrollArea>
      </div>

      {/* Categories */}
      <div className="w-full md:w-1/3 flex flex-col space-y-6 min-h-0">
        <div className="flex flex-col space-y-4 flex-shrink-0">
          <Input
            placeholder="Buscar categorías..."
            value={categorySearchTerm}
            onChange={(e) => setCategorySearchTerm(e.target.value)}
            className="flex-grow border border-input"
          />
          <Button onClick={() => setIsCategoryDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" /> Añadir Categoría
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <motion.div
                  key={category.id}
                  layout
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
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </ScrollArea>
      </div>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Producto</DialogTitle>
          </DialogHeader>
          <ProductDialog
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
            categories={categoryList}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Categoría</DialogTitle>
          </DialogHeader>
          <ProductDialog
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
            categories={categoryList}
          />
        </DialogContent>
      </Dialog>

      <ProductDialog
        editingProduct={editingProduct}
        editingCategory={editingCategory}
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
        categories={categoryList}
      />

      <Dialog open={deleteConfirmation !== null} onOpenChange={() => setDeleteConfirmation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este{' '}
              {deleteConfirmation?.type === 'product' ? 'producto' : 'categoría'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={
                deleteConfirmation?.type === 'product'
                  ? confirmDeleteProduct
                  : confirmDeleteCategory
              }
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Products.displayName = 'Products';

export default Products;
