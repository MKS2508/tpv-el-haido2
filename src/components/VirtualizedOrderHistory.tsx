import { createVirtualizer } from '@tanstack/solid-virtual';
import { CheckCircle, CreditCard, HandCoins, Loader2, XCircle } from 'lucide-solid';
import type { JSX } from 'solid-js';
import { createMemo, For, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResponsive } from '@/hooks/useResponsive';
import type Order from '@/models/Order.ts';

interface VirtualizedOrderHistoryProps {
  orders: Order[];
  onOrderSelect: (order: Order) => void;
  height?: number;
}

interface RowProps {
  orders: Order[];
  onOrderSelect: (order: Order) => void;
  isMobile: boolean;
}

// Row component
const OrderRow = (props: RowProps & { order: Order }) => {
  const { order, orders, onOrderSelect, isMobile } = props;

  const getStatusIcon = () => {
    if (order.status === 'completed') {
      return <CheckCircle class="h-4 w-4 text-success" />;
    } else if (order.status === 'cancelled') {
      return <XCircle class="h-4 w-4 text-destructive" />;
    } else {
      return <Loader2 class="h-4 w-4 text-primary" />;
    }
  };

  if (isMobile) {
    return (
      <div class="px-3 py-2">
        <Card
          class="order-card cursor-pointer hover:shadow-md"
          onClick={() => onOrderSelect(order)}
        >
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base font-semibold">Pedido #{order.id}</CardTitle>
              <div class="flex items-center gap-2">{getStatusIcon()}</div>
            </div>
            <div class="flex items-center justify-between text-sm text-muted-foreground">
              <span>{new Date(order.date).toLocaleDateString()}</span>
              <span class="font-medium text-primary">
                {order.tableNumber === 0 ? 'Barra' : `Mesa ${order.tableNumber}`}
              </span>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Total:</span>
                <span class="font-bold text-lg text-success">{order.total.toFixed(2)}€</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Elementos:</span>
                <span class="font-medium">{order.items.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div class="px-3">
      <table class="w-full">
        <tbody>
          <tr
            class="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
            onClick={() => onOrderSelect(order)}
          >
            <td class="border border-border p-3">
              <div class="flex items-center gap-2">
                {getStatusIcon()}
                <span class="font-medium">Pedido #{order.id}</span>
              </div>
            </td>
            <td class="border border-border p-3">
              <span class="text-sm">{new Date(order.date).toLocaleString()}</span>
            </td>
            <td class="border border-border p-3 text-right">
              <span class="font-bold text-success">{order.total.toFixed(2)}€</span>
            </td>
            <td class="border border-border p-3 text-center">
              <span class="text-sm">
                {order.tableNumber === 0 ? 'Barra' : `Mesa ${order.tableNumber}`}
              </span>
            </td>
            <td class="border border-border p-3 text-center">
              <span class="text-sm font-medium">{order.items.length}</span>
            </td>
            <td class="border border-border p-3 text-center">
              <Button variant="ghost" size="sm" class="h-auto">
                <CreditCard class="h-4 w-4" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const VirtualizedOrderHistory = (props: VirtualizedOrderHistoryProps): JSX.Element => {
  const { isMobile } = useResponsive();
  const { orders, onOrderSelect, height } = props;

  const containerHeight = height || window.innerHeight - 240;
  const itemHeight = isMobile() ? 140 : 80;

  const parentRef: HTMLDivElement | null = null;

  const rowVirtualizer = createVirtualizer({
    get count() {
      return orders.length;
    },
    getScrollElement: () => parentRef,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  // Si no hay órdenes
  if (orders.length === 0) {
    return <div class="text-center text-muted-foreground py-8">No hay pedidos que mostrar</div>;
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div class="h-full">
      {/* Header solo para desktop */}
      <Show when={!isMobile()}>
        <div class="sticky top-0 z-10 bg-background border-b border-border mb-4">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-muted">
                <th class="border border-border p-3 text-left font-semibold">ID</th>
                <th class="border border-border p-3 text-left font-semibold">Fecha</th>
                <th class="border border-border p-3 text-right font-semibold">Total</th>
                <th class="border border-border p-3 text-center font-semibold">Mesa</th>
                <th class="border border-border p-3 text-center font-semibold">Elementos</th>
                <th class="border border-border p-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
          </table>
        </div>
      </Show>

      {/* Virtualized list with @tanstack/solid-virtual */}
      <div
        ref={parentRef}
        style={{ height: `${containerHeight - (isMobile() ? 0 : 50)}px`, overflow: 'auto' }}
        class="virtualized-order-list"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <For each={virtualItems}>
            {(virtualRow) => (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <OrderRow
                  order={orders[virtualRow.index]!}
                  orders={orders}
                  onOrderSelect={onOrderSelect}
                  isMobile={isMobile()}
                />
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedOrderHistory;
