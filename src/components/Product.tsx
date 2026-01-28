import { For, Show } from 'solid-js';
import OptimizedProductCard from '@/components/ui/OptimizedProductCard.tsx';
import { useResponsive } from '@/hooks/useResponsive';
import type { OrderItem } from '@/models/Order.ts';
import type Product from '@/models/Product.ts';

type ProductGridProps = {
  products: Product[];
  handleAddToOrder: (product: Product | OrderItem) => void;
  selectedOrderId?: number | null;
};

function ProductGrid(props: ProductGridProps) {
  const { isMobile } = useResponsive();

  return (
    <Show
      when={props.selectedOrderId}
      fallback={
        <div class="h-full w-full overflow-hidden bg-background">
          <div class="h-full overflow-y-auto overflow-x-hidden">
            <div class="min-h-full flex items-center justify-center p-3">
              <div class="text-center text-muted-foreground">
                <div class="text-6xl mb-4">🍽️</div>
                <p class="text-xl font-medium mb-2">Selecciona una mesa</p>
                <p class="text-sm">Elige una mesa para comenzar a agregar productos</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <Show
        when={props.products.length > 0}
        fallback={
          <div class="h-full w-full overflow-hidden bg-background">
            <div class="h-full overflow-y-auto overflow-x-hidden">
              <div class="min-h-full flex items-center justify-center p-3">
                <div class="text-center text-muted-foreground">
                  <div class="text-4xl mb-3">📦</div>
                  <p class="text-lg font-medium">No hay productos disponibles</p>
                  <p class="text-sm">Esta categoria no tiene productos</p>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <div class="h-full w-full overflow-hidden bg-background">
          <div class="h-full overflow-y-auto overflow-x-hidden p-3">
            <div
              class={`
                        grid gap-3 w-full
                        ${isMobile() ? 'grid-cols-2' : 'grid-cols-3'}
                    `}
            >
              <For each={props.products}>
                {(product) => (
                  <OptimizedProductCard
                    product={product}
                    mode="order"
                    onAction={props.handleAddToOrder}
                    showCategory={true}
                    class="w-full"
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
