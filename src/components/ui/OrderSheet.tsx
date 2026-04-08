import { Motion } from '@motionone/solid';
import { ShoppingCartIcon } from 'lucide-solid';
import { type Accessor, type Component, createSignal, type Setter, Show } from 'solid-js';
import OrderPanel from '@/components/OrderPanel';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';
import { Sheet, SheetContent, SheetPortal } from './sheet';

interface OrderSheetProps {
  open: Accessor<boolean>;
  onOpenChange: Setter<boolean>;
  // OrderPanel props
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

/**
 * OrderSheet - Bottom sheet drawer for mobile/tablet order panel
 *
 * Features:
 * - Drag handle for gesture-based open/close
 * - Peek button always visible when closed
 * - Animated transitions with Motion One
 * - Keyboard accessible
 * - Optimized for touch interactions
 *
 * Snap points:
 * - Peek (collapsed): shows summary
 * - Half: 50% viewport height
 * - Full: 90% viewport height (default)
 *
 * @example
 * ```tsx
 * <OrderSheet
 *   open={sheetOpen}
 *   onOpenChange={setSheetOpen}
 *   activeOrders={activeOrders}
 *   selectedOrder={selectedOrder}
 *   {...orderPanelProps}
 * />
 * ```
 */
const OrderSheet: Component<OrderSheetProps> = (props) => {
  const [isDragging, _setIsDragging] = createSignal(false);

  const itemCount = () => props.selectedOrder?.items.length ?? 0;
  const total = () => props.selectedOrder?.total ?? 0;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handlePaymentStart = () => {
    props.onOpenChange(false);
    props.onPaymentStart();
  };

  return (
    <>
      {/* Peek Button - Always visible when sheet is closed */}
      <Show when={!props.open() && itemCount() > 0}>
        <div class="neworder-sheet__peek">
          <button
            type="button"
            onClick={() => props.onOpenChange(true)}
            class={cn(
              'flex-1 flex items-center justify-between gap-2',
              'bg-primary hover:bg-primary/90',
              'text-primary-foreground',
              'font-medium text-sm',
              'px-4 py-2.5',
              'rounded-lg',
              'transition-all duration-150',
              'active:scale-[0.98]',
              'touch-manipulation'
            )}
          >
            <span class="flex items-center gap-2">
              <ShoppingCartIcon class="w-4 h-4" />
              <span>Ver Pedido</span>
            </span>
            <span class="font-bold">{itemCount()}</span>
            <span class="ml-auto font-bold">{formatCurrency(total())}</span>
          </button>
        </div>
      </Show>

      {/* Sheet */}
      <Sheet open={props.open()} onOpenChange={props.onOpenChange}>
        <SheetPortal>
          <SheetContent
            side="bottom"
            class={cn('neworder-sheet', 'max-h-[70vh]', 'rounded-t-3xl', 'p-0', 'flex flex-col')}
          >
            {/* Drag Handle */}
            <div
              class={cn(
                'neworder-sheet__handle',
                'cursor-grab',
                'active:cursor-grabbing',
                'touch-manipulation'
              )}
            >
              <div class="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto" />
            </div>

            {/* Order Panel Content */}
            <div class="flex-1 min-h-0 overflow-hidden">
              <OrderPanel
                activeOrders={props.activeOrders}
                selectedOrder={props.selectedOrder}
                selectedOrderId={props.selectedOrderId}
                tables={props.tables}
                onOrderSelect={props.onOrderSelect}
                onOrderClose={props.onOrderClose}
                onNewOrder={props.onNewOrder}
                onTableChange={props.onTableChange}
                onPaymentStart={handlePaymentStart}
                onRemoveFromOrder={props.onRemoveFromOrder}
                onAddToOrder={props.onAddToOrder}
                disableAnimations={props.disableAnimations}
              />
            </div>

            {/* Footer with quick complete button */}
            <Show when={props.selectedOrder && props.selectedOrder.items.length > 0}>
              <div class="sticky bottom-0 flex-shrink-0 px-4 py-3 border-t border-border bg-card/95 backdrop-blur-sm z-10">
                <Motion.button
                  type="button"
                  onClick={handlePaymentStart}
                  class={cn(
                    'payment-button',
                    'w-full h-12',
                    'bg-primary hover:bg-primary/90',
                    'text-primary-foreground',
                    'font-bold text-base',
                    'shadow-lg',
                    'rounded-lg',
                    'transition-all duration-150',
                    'active:scale-[0.98]',
                    'touch-manipulation',
                    'flex items-center justify-center gap-2'
                  )}
                  animate={{
                    scale: isDragging() ? 0.98 : 1,
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <span>Completar Pedido</span>
                  <span class="font-bold">{formatCurrency(total())}</span>
                  <ShoppingCartIcon class="w-5 h-5" />
                </Motion.button>
              </div>
            </Show>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </>
  );
};

export default OrderSheet;
