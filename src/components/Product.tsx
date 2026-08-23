import { createMemo, For, Show } from 'solid-js';
import ProductCard from '@/components/ui/ProductCard';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type { OrderItem } from '@/models/Order.ts';
import type Product from '@/models/Product.ts';

type ProductGridProps = {
  products: Product[];
  handleAddToOrder: (product: Product | OrderItem) => void;
  selectedOrderId?: number | null;
};

function ProductGrid(props: ProductGridProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const gridColumns = createMemo(() => {
    if (isMobile()) return 'grid-cols-2';
    if (isTablet()) return 'grid-cols-3';
    if (isDesktop()) return 'grid-cols-3';
    return 'grid-cols-3';
  });

  return (
    <Show
      when={props.selectedOrderId}
      fallback={
        <div class="h-full w-full flex items-center justify-center p-3">
          <div class="text-center text-muted-foreground">
            <div class="text-5xl mb-4 opacity-70">🍽️</div>
            <p class="text-lg font-medium text-foreground mb-1">Selecciona una mesa</p>
            <p class="text-sm">Elige una mesa para comenzar a agregar productos</p>
          </div>
        </div>
      }
    >
      <Show
        when={props.products.length > 0}
        fallback={
          <div class="h-full w-full flex items-center justify-center p-3">
            <div class="text-center text-muted-foreground">
              <div class="text-5xl mb-4 opacity-70">📦</div>
              <p class="text-lg font-medium text-foreground mb-1">No hay productos disponibles</p>
              <p class="text-sm">Esta categoría no tiene productos</p>
            </div>
          </div>
        }
      >
        <div class="h-full w-full max-w-full overflow-hidden">
          <div class="h-full overflow-y-auto overflow-x-hidden p-3">
            <div
              class={cn('grid gap-3 w-full max-w-full auto-rows-fr items-stretch', gridColumns())}
            >
              <For each={props.products}>
                {(product) => (
                  <ProductCard
                    product={product}
                    mode="order"
                    onAction={props.handleAddToOrder}
                    showCategory={true}
                    class="w-full max-w-full"
                  />
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </Show>
  );
}

export default ProductGrid;
