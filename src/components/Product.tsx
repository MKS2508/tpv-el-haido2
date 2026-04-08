import { Motion } from '@motionone/solid';
import { createMemo, For, Show } from 'solid-js';
import OptimizedProductCard from '@/components/ui/OptimizedProductCard.tsx';
import { usePerformanceConfig } from '@/hooks/usePerformanceConfig';
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
  const perf = usePerformanceConfig();

  // Responsive grid columns
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
        <div class="h-full w-full overflow-hidden bg-background">
          <div class="h-full overflow-y-auto overflow-x-hidden">
            <div class="min-h-full flex items-center justify-center p-3">
              <div class="text-center text-muted-foreground">
                <div class="neworder-empty-state">
                  <div class="neworder-empty-state__icon">🍽️</div>
                  <p class="neworder-empty-state__title">Selecciona una mesa</p>
                  <p class="neworder-empty-state__description">
                    Elige una mesa para comenzar a agregar productos
                  </p>
                </div>
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
                  <div class="neworder-empty-state">
                    <div class="neworder-empty-state__icon">📦</div>
                    <p class="neworder-empty-state__title">No hay productos disponibles</p>
                    <p class="neworder-empty-state__description">
                      Esta categoría no tiene productos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <div class="h-full w-full max-w-full overflow-hidden bg-background">
          <div class="h-full overflow-y-auto overflow-x-hidden p-3">
            <Motion.div
              class={cn(
                'neworder-product-grid',
                gridColumns(),
                perf.enableAnimations && 'stagger-container'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: perf.animationDuration, delay: 0.1 }}
            >
              <For each={props.products}>
                {(product, index) => (
                  <Motion.div
                    initial={perf.enableAnimations ? { opacity: 0, y: 10 } : undefined}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: perf.transitionDuration,
                      delay: perf.enableAnimations ? index() * 0.025 : 0,
                    }}
                  >
                    <OptimizedProductCard
                      product={product}
                      mode="order"
                      onAction={props.handleAddToOrder}
                      showCategory={true}
                      class="w-full max-w-full"
                    />
                  </Motion.div>
                )}
              </For>
            </Motion.div>
          </div>
        </div>
      </Show>
    </Show>
  );
}

export default ProductGrid;
