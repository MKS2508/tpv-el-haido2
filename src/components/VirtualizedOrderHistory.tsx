import { createVirtualizer } from '@tanstack/solid-virtual';
import { CheckCircle, CreditCard, Loader2, XCircle } from 'lucide-solid';
import type { JSX } from 'solid-js';
import { For, Show } from 'solid-js';
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
  const getStatusIcon = () => {
    if (props.order.status === 'completed') {
      return <CheckCircle class="h-4 w-4 text-success" />;
    } else if (props.order.status === 'cancelled') {
      return <XCircle class="h-4 w-4 text-destructive" />;
    } else {
      return <Loader2 class="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Show
      when={props.isMobile}
      fallback={
        <div class="px-3">
          <table class="w-full">
            <tbody>
              <tr
                class="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
                onClick={() => props.onOrderSelect(props.order)}
              >
                <td class="border border-border p-3">
                  <div class="flex items-center gap-2">
                    {getStatusIcon()}
                    <span class="font-medium">Pedido #{props.order.id}</span>
                  </div>
                </td>
                <td class="border border-border p-3">
                  <span class="text-sm">{new Date(order.date).toLocaleString()}</span>
                </td>
                <td class="border border-border p-3 text-right">
                  <span class="font-bold text-success">{props.order.total.toFixed(2)}€</span>
                </td>
                <td class="border border-border p-3 text-center">
                  <span class="text-sm">
                    {props.order.tableNumber === 0 ? 'Barra' : `Mesa ${props.order.tableNumber}`}
                  </span>
                </td>
                <td class="border border-border p-3 text-center">
                  <span class="text-sm font-medium">{props.order.items.length}</span>
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
      }
    >
      <div class="px-3 py-2">
        <Card
          class="order-card cursor-pointer hover:shadow-md"
          onClick={() => props.onOrderSelect(props.order)}
        >
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base font-semibold">Pedido #{props.order.id}</CardTitle>
              <div class="flex items-center gap-2">{getStatusIcon()}</div>
            </div>
            <div class="flex items-center justify-between text-sm text-muted-foreground">
              <span>{new Date(order.date).toLocaleDateString()}</span>
              <span class="font-medium text-primary">
                {props.order.tableNumber === 0 ? 'Barra' : `Mesa ${props.order.tableNumber}`}
              </span>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Total:</span>
                <span class="font-bold text-lg text-success">{props.order.total.toFixed(2)}€</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Elementos:</span>
                <span class="font-medium">{props.order.items.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Show>
  );
};

const VirtualizedOrderHistory = (props: VirtualizedOrderHistoryProps): JSX.Element => {
  const { isMobile } = useResponsive();

  const containerHeight = () => props.height || window.innerHeight - 240;
  const itemHeight = isMobile() ? 140 : 80;

  let parentRef: HTMLDivElement | undefined;

  const rowVirtualizer = createVirtualizer({
    get count() {
      return props.orders.length;
    },
    getScrollElement: () => parentRef ?? null,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div class="h-full">
      {/* Show empty state if no orders */}
      <Show
        when={props.orders.length > 0}
        fallback={<div class="text-center text-muted-foreground py-8">No hay pedidos que mostrar</div>}
      >
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
        ref={parentRef!}
        style={{ height: `${containerHeight() - (isMobile() ? 0 : 50)}px`, overflow: 'auto' }}
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
                  order={props.orders[virtualRow.index]!}
                  orders={props.orders}
                  onOrderSelect={props.onOrderSelect}
                  isMobile={isMobile()}
                />
              </div>
            )}
          </For>
        </div>
      </div>
      </Show>
    </div>
  );
};

export default VirtualizedOrderHistory;
