import { Show } from 'solid-js';
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
 * Usar cuando ya estas dentro de un DialogContent.
 */
export function ProductDialogContent(props: ProductDialogContentProps) {
  return (
    <>
      <Show when={props.editingProduct}>
        {(product) => (
          <>
            <ProductForm
              categories={props.categories}
              product={product()}
              onSave={props.onProductSave}
              onCancel={props.onCancel}
            />
            <DialogFooter>
              <Show when={product().id > 0}>
                <Button variant="destructive" onClick={() => props.onProductDelete(product().id)}>
                  Eliminar Producto
                </Button>
              </Show>
            </DialogFooter>
          </>
        )}
      </Show>
      <Show when={!props.editingProduct && props.editingCategory}>
        {(category) => (
          <>
            <CategoryForm
              category={category()}
              onSave={props.onCategorySave}
              onCancel={props.onCancel}
            />
            <DialogFooter>
              <Show when={category().id > 0}>
                <Button variant="destructive" onClick={() => props.onCategoryDelete(category().id)}>
                  Eliminar Categoria
                </Button>
              </Show>
            </DialogFooter>
          </>
        )}
      </Show>
    </>
  );
}

interface ProductDialogProps extends ProductDialogContentProps {}

/**
 * Dialog completo con wrapper.
 * Usar como componente standalone (no dentro de otro Dialog).
 */
function ProductDialog(props: ProductDialogProps) {
  const isOpen = () => !!(props.editingProduct || props.editingCategory);
  const title = () =>
    props.editingProduct
      ? props.editingProduct.id
        ? 'Editar Producto'
        : 'Anadir Producto'
      : props.editingCategory
        ? props.editingCategory.id
          ? 'Editar Categoria'
          : 'Anadir Categoria'
        : '';

  return (
    <Show when={isOpen()}>
      <Dialog open={isOpen()} onOpenChange={(open) => !open && props.onCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title()}</DialogTitle>
          </DialogHeader>
          <ProductDialogContent
            editingProduct={props.editingProduct}
            editingCategory={props.editingCategory}
            onProductSave={props.onProductSave}
            onCategorySave={props.onCategorySave}
            onProductDelete={props.onProductDelete}
            onCategoryDelete={props.onCategoryDelete}
            onCancel={props.onCancel}
            categories={props.categories}
          />
        </DialogContent>
      </Dialog>
    </Show>
  );
}

export default ProductDialog;
