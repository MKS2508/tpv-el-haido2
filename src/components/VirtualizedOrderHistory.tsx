import { CheckCircle, CreditCard, HandCoins, Loader2, XCircle } from 'lucide-solid';
import type { CSSProperties } from 'react';
import { List } from 'react-window';
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

// Row component for react-window v2
const OrderRow = ({
  index,
  style,
  orders,
  onOrderSelect,
  isMobile,
}: {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
} & RowProps) => {
  const order = orders[index];

  if (!order) return null;

  const getStatusIcon = () => {
    switch (order.status) {
      case 'paid':
        if (order.paymentMethod === 'efectivo') {
          return (
            <div class="flex items-center gap-1">
              <HandCoins class="w-4 h-4 text-warning" />
              <CheckCircle class="w-4 h-4 text-success" />
            </div>
          );
        }
        return (
          <div class="flex items-center gap-1">
            <CreditCard class="w-4 h-4 text-info" />
            <CheckCircle class="w-4 h-4 text-success" />
          </div>
        );
      case 'unpaid':
        return <XCircle class="w-4 h-4 text-destructive" />;
      case 'canceled':
        return <XCircle class="w-4 h-4 text-muted-foreground" />;
      case 'inProgress':
        return <Loader2 class="w-4 h-4 animate-spin text-info" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case 'paid':
        return order.paymentMethod === 'efectivo' ? 'Pagado - Efectivo' : 'Pagado - Tarjeta';
      case 'unpaid':
        return 'No pagado';
      case 'canceled':
        return 'Cancelado';
      case 'inProgress':
        return 'En progreso';
      default:
        return order.status;
    }
  };

  if (isMobile) {
    return (
      <div style={style} class="px-3">
        <div class="pb-3">
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
                  <span class="text-sm text-muted-foreground">Artículos:</span>
                  <span class="text-sm font-medium">{order.itemCount}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-muted-foreground">Estado:</span>
                  <span class="text-sm font-medium">{getStatusText()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={style} class="w-full">
      <table class="w-full border-collapse">
        <tbody>
          <tr
            class="order-row hover:bg-muted/50 cursor-pointer"
            onClick={() => onOrderSelect(order)}
          >
            <td class="border border-border px-4 py-3">{order.date}</td>
            <td class="border border-border px-4 py-3">{order.total.toFixed(2)}€</td>
            <td class="border border-border px-4 py-3">{order.itemCount}</td>
            <td class="border border-border px-4 py-3">
              {order.tableNumber === 0 ? 'Barra' : order.tableNumber}
            </td>
            <td class="border border-border px-4 py-3">
              <div class="flex flex-col items-center">
                {order.status === 'paid' && order.paymentMethod === 'efectivo' && (
                  <>
                    <div class="flex items-center gap-2">
                      <HandCoins class="text-warning" />
                      <CheckCircle class="text-success" />
                    </div>
                    <span class="text-xs">Pagado con Efectivo</span>
                  </>
                )}
                {order.status === 'paid' && order.paymentMethod === 'tarjeta' && (
                  <>
                    <div class="flex items-center gap-2">
                      <CreditCard class="text-info" />
                      <CheckCircle class="text-success" />
                    </div>
                    <span class="text-xs">Pagado con Tarjeta</span>
                  </>
                )}
                {order.status === 'unpaid' && (
                  <>
                    <XCircle class="text-destructive" />
                    <span class="text-xs">No pagado</span>
                  </>
                )}
                {order.status === 'canceled' && (
                  <>
                    <XCircle class="text-muted-foreground" />
                    <span class="text-xs">Cancelado</span>
                  </>
                )}
                {order.status === 'inProgress' && (
                  <>
                    <Loader2 class="animate-spin text-info" />
                    <span class="text-xs">En progreso</span>
                  </>
                )}
              </div>
            </td>
            <td class="border border-border px-4 py-3">
              <Button
                variant="outline"
                class="bg-background text-foreground border-border hover:bg-muted w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onOrderSelect(order);
                }}
              >
                Detalles
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const VirtualizedOrderHistory: React.FC<VirtualizedOrderHistoryProps> = ({
  orders,
  onOrderSelect,
  height,
}) => {
  const { isMobile } = useResponsive();

  const containerHeight = height || window.innerHeight - 240;
  const itemHeight = isMobile ? 140 : 80;

  // Si no hay órdenes
  if (orders.length === 0) {
    return <div class="text-center text-muted-foreground py-8">No hay pedidos que mostrar</div>;
  }

  return (
    <div class="h-full">
      {/* Header solo para desktop */}
      {!isMobile && (
        <div class="sticky top-0 z-10 bg-background border-b border-border mb-4">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-muted">
                <th class="border border-border p-3 text-left font-semibold">Fecha</th>
                <th class="border border-border p-3 text-left font-semibold">Total</th>
                <th class="border border-border p-3 text-left font-semibold">Elementos</th>
                <th class="border border-border p-3 text-left font-semibold">Mesa</th>
                <th class="border border-border p-3 text-left font-semibold">Estado</th>
                <th class="border border-border p-3 text-left font-semibold">Acciones</th>
              </tr>
            </thead>
          </table>
        </div>
      )}
      {/* Virtualized List - react-window v2 */}
      <List<RowProps>
        rowComponent={OrderRow}
        rowProps={{
          orders,
          onOrderSelect,
          isMobile,
        }}
        rowCount={orders.length}
        rowHeight={itemHeight}
        overscanCount={5}
        style={{
          height: containerHeight - (isMobile ? 0 : 50),
          scrollbarWidth: 'thin',
          overflowX: 'hidden',
        }}
        class="virtualized-order-list"
      />
    </div>
  );
};

export default VirtualizedOrderHistory;
