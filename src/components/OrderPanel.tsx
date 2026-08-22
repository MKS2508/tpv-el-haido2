import { Motion } from '@motionone/solid';
import { Receipt, UtensilsCrossed, X } from 'lucide-solid';
import { createEffect, createMemo, createSignal, Show } from 'solid-js';
import OrderTable from '@/components/OrderTable';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';

interface OrderPanelProps {
  activeOrders: Order[];
  selectedOrder: Order | null;
  selectedOrderId: number | null;
  tables: ITable[];
  onOrderSelect: (orderId: number | null) => void;
  onOrderClose: (orderId: number) => void;
  onNewOrder: () => void;
  onTableChange: (tableId: number) => void;
  onPaymentStart: () => void;
  onRemoveFromOrder: (orderId: number, productId: number) => void;
  onAddToOrder: (orderId: number, product: OrderItem | Product) => void;
  disableAnimations?: boolean;
}

// Helper function to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

// Counter component for total display
function AnimatedCounter(props: { value: number; animate?: boolean }) {
  const shouldAnimate = () => props.animate !== false;

  return (
    <Motion.span
      style={{
        'font-variant-numeric': 'tabular-nums',
      }}
      animate={
        shouldAnimate()
          ? {
              scale: [1, 1.05, 1],
            }
          : {}
      }
      transition={{
        duration: shouldAnimate() ? 0.2 : 0,
        easing: 'ease-out',
      }}
    >
      {formatCurrency(props.value)}
    </Motion.span>
  );
}

function OrderPanel(props: OrderPanelProps) {
  const [previousTotal, setPreviousTotal] = createSignal(0);
  const [showPaymentHighlight, setShowPaymentHighlight] = createSignal(false);

  // Track total changes for animation triggers
  createEffect(() => {
    if (props.selectedOrder && props.selectedOrder.total !== previousTotal()) {
      if (previousTotal() > 0) {
        // Only show highlight if not initial load
        setShowPaymentHighlight(true);
        setTimeout(() => setShowPaymentHighlight(false), 1000);
      }
      setPreviousTotal(props.selectedOrder.total);
    }
  });

  const itemCount = createMemo(() => props.selectedOrder?.items.length ?? 0);
  const total = createMemo(() => props.selectedOrder?.total ?? 0);

  return (
    <div
      class="h-full flex flex-col overflow-hidden"
      style={{ background: 'color-mix(in oklch, var(--foreground) 4%, var(--background) 96%)' }}
    >
      <Show
        when={props.selectedOrder}
        fallback={
          <div class="flex-1 overflow-hidden">
            <div class="h-full overflow-y-auto">
              <div class="min-h-full flex items-center justify-center p-6">
                <div class="text-center">
                  <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50">
                    <UtensilsCrossed class="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p class="text-base font-semibold text-foreground mb-1">
                    Selecciona una mesa para comenzar
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Elige una mesa disponible del selector superior
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      >
        {(order) => (
          <>
            {/* Header del pedido - altura fija optimizada */}
            <div class="h-10 px-3 border-b border-foreground/10 bg-foreground/5 flex items-center gap-2 flex-shrink-0">
              <Receipt class="w-3.5 h-3.5 text-muted-foreground" />
              <h3 class="text-xs font-medium text-foreground">
                {order().tableNumber === 0 ? 'Barra' : `Mesa ${order().tableNumber}`}
              </h3>
              <Show when={itemCount() > 0}>
                <span class="ml-auto text-xs text-muted-foreground">
                  {itemCount()} {itemCount() === 1 ? 'item' : 'items'}
                </span>
              </Show>
            </div>

            {/* Tabla del pedido con scroll - toma espacio disponible */}
            <div class="flex-1 min-h-0 overflow-hidden">
              <div class="h-full overflow-auto">
                <div class="px-2 py-2">
                  <OrderTable
                    order={order()}
                    handleRemoveFromOrder={props.onRemoveFromOrder}
                    handleAddToOrder={props.onAddToOrder}
                    disableAnimations={props.disableAnimations}
                  />
                </div>
              </div>
            </div>

            {/* Footer con total y boton - STICKY BOTTOM, SIEMPRE VISIBLE */}
            <Motion.div
              class="flex-shrink-0 px-3 py-2.5 border-t border-foreground/10 bg-foreground/5 z-10"
              animate={{
                backgroundColor: showPaymentHighlight()
                  ? 'color-mix(in oklch, var(--success) 8%, transparent)'
                  : 'color-mix(in oklch, var(--card) 95%, transparent)',
              }}
              transition={{ duration: 0.3 }}
            >
              <Show
                when={itemCount() > 0}
                fallback={
                  <Button
                    variant="outline"
                    onClick={() => order().id && props.onOrderClose(order().id)}
                    class="w-full h-10 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                  >
                    <X class="w-4 h-4 mr-2" />
                    <span>Cerrar orden vacía</span>
                  </Button>
                }
              >
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-semibold text-foreground">Total:</span>
                  <span class="text-lg font-bold text-primary">
                    <AnimatedCounter value={total()} animate={!props.disableAnimations} />
                  </span>
                </div>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => order().id && props.onOrderClose(order().id)}
                    class="h-11 w-11 flex-shrink-0 p-0"
                    title="Cerrar orden"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={props.onPaymentStart}
                    disabled={itemCount() === 0}
                    class={cn(
                      'payment-button flex-1 h-11 min-w-0',
                      'bg-primary hover:bg-primary/90',
                      'text-primary-foreground',
                      'font-semibold text-sm',
                      'transition-all duration-150',
                      'active:scale-[0.98]',
                      itemCount() === 0 && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span class="truncate">Completar</span>
                    <span class="ml-1 flex-shrink-0">
                      <AnimatedCounter value={total()} animate={!props.disableAnimations} />
                    </span>
                  </Button>
                </div>
              </Show>
            </Motion.div>
          </>
        )}
      </Show>
    </div>
  );
}

export default OrderPanel;
