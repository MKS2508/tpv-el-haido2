import type React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type Category from '@/models/Category';
import type Product from '@/models/Product';
import CategoryForm from './CategoryForm';
import ProductForm from './ProductForm';

interface ProductDialogContentProps {
  editingProduct?: Product | null;
  editingCategory?: Category | null;
  onProductSave: (product: Product) => void;
  onCategorySave: (category: Category) => void;
  onProductDelete: (id: number) => void;
  onCategoryDelete: (id: number) => void;
  onCancel: () => void;
  categories: Category[];
}

/**
 * Contenido del dialog sin el wrapper Dialog.
 * Usar cuando ya estás dentro de un DialogContent.
 */
export const ProductDialogContent: React.FC<ProductDialogContentProps> = ({
  editingProduct,
  editingCategory,
  onProductSave,
  onCategorySave,
  onProductDelete,
  onCategoryDelete,
  onCancel,
  categories,
}) => {
  if (editingProduct) {
    return (
      <>
        <ProductForm
          categories={categories}
          product={editingProduct}
          onSave={onProductSave}
          onCancel={onCancel}
        />
        <DialogFooter>
          {editingProduct.id > 0 && (
            <Button variant="destructive" onClick={() => onProductDelete(editingProduct.id)}>
              Eliminar Producto
            </Button>
          )}
        </DialogFooter>
      </>
    );
  }

  if (editingCategory) {
    return (
      <>
        <CategoryForm category={editingCategory} onSave={onCategorySave} onCancel={onCancel} />
        <DialogFooter>
          {editingCategory.id > 0 && (
            <Button variant="destructive" onClick={() => onCategoryDelete(editingCategory.id)}>
              Eliminar Categoría
            </Button>
          )}
        </DialogFooter>
      </>
    );
  }

  return null;
};

interface ProductDialogProps extends ProductDialogContentProps {}

/**
 * Dialog completo con wrapper.
 * Usar como componente standalone (no dentro de otro Dialog).
 */
const ProductDialog: React.FC<ProductDialogProps> = ({
  editingProduct,
  editingCategory,
  onProductSave,
  onCategorySave,
  onProductDelete,
  onCategoryDelete,
  onCancel,
  categories,
}) => {
  const isOpen = !!(editingProduct || editingCategory);
  const title = editingProduct
    ? editingProduct.id ? 'Editar Producto' : 'Añadir Producto'
    : editingCategory
      ? editingCategory.id ? 'Editar Categoría' : 'Añadir Categoría'
      : '';

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ProductDialogContent
          editingProduct={editingProduct}
          editingCategory={editingCategory}
          onProductSave={onProductSave}
          onCategorySave={onCategorySave}
          onProductDelete={onProductDelete}
          onCategoryDelete={onCategoryDelete}
          onCancel={onCancel}
          categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;
