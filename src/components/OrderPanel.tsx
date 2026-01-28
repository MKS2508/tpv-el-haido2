import { createEffect, createSignal, Show } from 'solid-js';
import { Motion } from '@motionone/solid';
import { Receipt, ShoppingCartIcon } from 'lucide-solid';
import OrderTable from '@/components/OrderTable';
import { Button } from '@/components/ui/button';
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
function AnimatedCounter(props: { value: number }) {
  return (
    <span
      style={{
        'font-variant-numeric': 'tabular-nums',
      }}
    >
      {formatCurrency(props.value)}
    </span>
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

  return (
    <div class="h-full flex flex-col bg-card overflow-hidden">
      <Show
        when={props.selectedOrder}
        fallback={
          <div class="flex-1 overflow-hidden">
            <div class="h-full overflow-y-auto">
              <div class="min-h-full flex items-center justify-center p-4">
                <div class="text-center text-muted-foreground">
                  <ShoppingCartIcon class="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p class="text-lg font-medium mb-2">No hay orden seleccionada</p>
                  <p class="text-sm">Selecciona una mesa para comenzar</p>
                </div>
              </div>
            </div>
          </div>
        }
      >
        {(order) => (
          <>
            {/* Header del pedido - altura fija */}
            <div class="h-12 px-3 border-b border-border bg-muted/30 flex items-center gap-2 flex-shrink-0">
              <Receipt class="w-4 h-4 text-muted-foreground" />
              <h3 class="text-sm font-medium text-foreground">
                {order().tableNumber === 0 ? 'Barra' : `Mesa ${order().tableNumber}`}
              </h3>
            </div>

            {/* Tabla del pedido con scroll - toma espacio disponible */}
            <div class="flex-1 min-h-0 overflow-hidden">
              <div class="h-full overflow-auto">
                <div class="px-2 py-3">
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
              class="sticky bottom-0 flex-shrink-0 px-3 py-3 border-t border-border bg-card/95 backdrop-blur-sm z-10"
              animate={{
                backgroundColor: showPaymentHighlight()
                  ? 'hsl(var(--success) / 0.08)'
                  : 'hsl(var(--card) / 0.95)',
              }}
              transition={{ duration: 0.5 }}
            >
              <div class="flex justify-between items-center mb-3">
                <span class="text-xl font-bold text-card-foreground">
                  Total: <AnimatedCounter value={order().total} />
                </span>
              </div>
              <Motion.div
                animate={{
                  scale: showPaymentHighlight() ? 1.02 : 1,
                  boxShadow: showPaymentHighlight()
                    ? '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  onClick={props.onPaymentStart}
                  class="payment-button w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg"
                >
                  <Motion.div
                    class="flex items-center justify-center"
                    animate={{
                      scale: showPaymentHighlight() ? [1, 1.02, 1] : 1,
                    }}
                    transition={{
                      duration: 0.2,
                      easing: 'ease-out',
                    }}
                  >
                    Completar Pedido
                    <Motion.div
                      animate={{
                        scale: showPaymentHighlight() ? 1.1 : 1,
                      }}
                      transition={{
                        duration: 0.15,
                        easing: 'ease-out',
                      }}
                    >
                      <ShoppingCartIcon class="ml-2 h-5 w-5" />
                    </Motion.div>
                  </Motion.div>
                </Button>
              </Motion.div>
            </Motion.div>
          </>
        )}
      </Show>
    </div>
  );
}

export default OrderPanel;
