import { Motion, Presence } from '@motionone/solid';
import {
  ArrowUpDown,
  Banknote,
  CheckCircle,
  CreditCard,
  FileText,
  HandCoins,
  Loader2,
  Receipt,
  XCircle,
} from 'lucide-solid';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type Component,
} from 'solid-js';
import { renderTicketPreview } from '@/assets/utils/utils.ts';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import PaymentModal from '@/components/PaymentModal.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast.ts';
import { useAEAT } from '@/hooks/useAEAT';
import { useEmitInvoice } from '@/hooks/useEmitInvoice';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order.ts';
import useStore from '@/store/store';

interface OrderHistoryProps {
  setActiveSection: (section: string) => void;
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  setSelectedOrderId: (orderId: number | null) => void;
}

const OrderHistory: Component<OrderHistoryProps> = (props) => {
  const store = useStore();
  const responsive = useResponsive();

  const [sortConfig, setSortConfig] = createSignal<{
    key: 'date' | 'total' | 'status' | 'id';
    direction: 'asc' | 'desc';
  }>({
    key: 'date',
    direction: 'desc',
  });
  const [filterStatus, setFilterStatus] = createSignal<string>('all');
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = createSignal(false);
  const [paymentMethod, setPaymentMethod] = createSignal('efectivo');
  const [cashAmount, setCashAmount] = createSignal('');
  const [showTicketDialog, setShowTicketDialog] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [startY, setStartY] = createSignal(0);
  const [scrollTop, setScrollTop] = createSignal(0);

  let tableRef: HTMLDivElement | undefined;

  // Access store data
  const orderHistory = () => store.state.orderHistory;
  const activeOrders = () => store.state.activeOrders;

  // AEAT hooks
  const { isEnabled: isAEATEnabled, isConnected: isAEATConnected } = useAEAT();
  const { emitInvoice, isEmitting } = useEmitInvoice();

  // Handler for emitting invoice
  const handleEmitInvoice = async () => {
    if (!props.selectedOrder) return;

    const result = await emitInvoice(props.selectedOrder);
    if (result.success) {
      // Update the selected order with AEAT info
      props.setSelectedOrder(result.order);
    }
  };

  // Determine if the invoice button should be disabled
  const isInvoiceButtonDisabled = createMemo(() => {
    if (!props.selectedOrder) return true;
    if (isEmitting) return true;
    if (!isAEATConnected) return true;
    if (props.selectedOrder.aeat?.invoiceStatus === 'accepted') return true;
    if (props.selectedOrder.aeat?.invoiceStatus === 'pending') return true;
    return false;
  });

  // Get tooltip for invoice button
  const getInvoiceButtonTooltip = () => {
    if (!props.selectedOrder) return '';
    if (isEmitting) return 'Emitiendo factura...';
    if (!isAEATConnected) return 'Sin conexion con AEAT';
    if (props.selectedOrder.aeat?.invoiceStatus === 'accepted') return 'Factura ya aceptada';
    if (props.selectedOrder.aeat?.invoiceStatus === 'pending') return 'Factura pendiente de respuesta';
    return 'Emitir factura a AEAT';
  };

  const handleCompleteOrder = (completedOrder: Order) => {
    store.setOrderHistory(
      orderHistory().map((order) => (order.id === completedOrder.id ? completedOrder : order))
    );
    toast({
      title: 'Payment Confirmed',
      description: `Payment confirmed for order: ${completedOrder.id}`,
    });

    setShowTicketDialog(true);
  };

  const handlePrintTicket = () => {
    console.log('Printing ticket for order:', props.selectedOrder?.id);
    setShowTicketDialog(true);
  };

  const handleTicketPrintingComplete = (shouldPrintTicket: boolean) => {
    setShowTicketDialog(false);
    setIsPaymentModalOpen(false);
    setIsDialogOpen(false);

    if (shouldPrintTicket) {
      handlePrintTicket();
    } else {
      toast({
        title: 'Order Completed',
        description: 'Order completed without printing ticket.',
        duration: 3000,
      });
    }
  };

  const sortedAndFilteredOrders = createMemo(() => {
    let filteredOrders = [...orderHistory(), ...activeOrders()];
    const uniqueOrders = filteredOrders.reduce<Order[]>((acc, order, currentIndex) => {
      const existingIndex = acc.findIndex((o) => o.id === order.id);
      if (existingIndex === -1) {
        acc.push(order);
      } else {
        const existingOrder = acc[existingIndex];
        if (existingOrder.status === 'inProgress' && order.status === 'paid') {
          acc[existingIndex] = order;
        } else if (existingOrder.status === 'inProgress' && order.status === 'inProgress') {
          const previousIndex = filteredOrders.findIndex((o) => o.id === order.id);
          if (currentIndex > previousIndex) {
            acc[existingIndex] = order;
          }
        }
      }
      return acc;
    }, []);
    console.log({ orderHistory: orderHistory(), activeOrders: activeOrders(), filteredOrders, uniqueOrders });
    if (filterStatus() !== 'all') {
      filteredOrders = filteredOrders
        .filter((order) => order.status === filterStatus())
        .filter((order) => order.itemCount > 0);
    } else {
      filteredOrders = uniqueOrders;
    }
    const config = sortConfig();
    return filteredOrders
      .filter((order) => order.itemCount > 0)
      .sort((a, b) => {
        if (a[config.key] < b[config.key]) return config.direction === 'asc' ? -1 : 1;
        if (a[config.key] > b[config.key]) return config.direction === 'asc' ? 1 : -1;
        return 0;
      });
  });

  const handleSort = (key: 'date' | 'total' | 'status' | 'id') => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDetails = (order: Order) => {
    props.setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (props.selectedOrder) {
      setIsPaymentModalOpen(true);
    }
  };

  const handleContinueOrder = () => {
    if (props.selectedOrder) {
      toast({
        title: 'Resumiendo comanda',
        description: `Continuando pedido de la ${props.selectedOrder.tableNumber === 0 ? 'Barra' : `mesa ${props.selectedOrder.tableNumber.toString()}`}`,
      });

      props.setSelectedOrderId(props.selectedOrder.id);
      props.setActiveSection('newOrder');
      setIsDialogOpen(false);
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY - scrollTop());
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging()) return;
    const y = e.touches[0].clientY;
    const scroll = y - startY();
    if (tableRef) {
      tableRef.scrollTop = -scroll;
      setScrollTop(-scroll);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Setup wheel listener
  createEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (tableRef) {
        e.preventDefault();
        tableRef.scrollTop += e.deltaY;
        setScrollTop(tableRef.scrollTop);
      }
    };

    const currentRef = tableRef;
    if (currentRef && !responsive.isMobile) {
      // Only add wheel listener on non-mobile
      currentRef.addEventListener('wheel', handleWheel, { passive: false });
    }

    onCleanup(() => {
      if (currentRef) {
        currentRef.removeEventListener('wheel', handleWheel);
      }
    });
  });

  // Mobile-friendly OrderCard component
  const OrderCard: Component<{ order: Order }> = (cardProps) => {
    const getStatusIcon = () => {
      switch (cardProps.order.status) {
        case 'paid':
          if (cardProps.order.paymentMethod === 'efectivo') {
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
      switch (cardProps.order.status) {
        case 'paid':
          return cardProps.order.paymentMethod === 'efectivo' ? 'Pagado - Efectivo' : 'Pagado - Tarjeta';
        case 'unpaid':
          return 'No pagado';
        case 'canceled':
          return 'Cancelado';
        case 'inProgress':
          return 'En progreso';
        default:
          return cardProps.order.status;
      }
    };

    return (
      <Card
        class="touch-manipulation cursor-pointer hover:shadow-md transition-shadow duration-200"
        onClick={() => handleDetails(cardProps.order)}
      >
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-base font-semibold">Pedido #{cardProps.order.id}</CardTitle>
            <div class="flex items-center gap-2">{getStatusIcon()}</div>
          </div>
          <div class="flex items-center justify-between text-sm text-muted-foreground">
            <span>{new Date(cardProps.order.date).toLocaleDateString()}</span>
            <span class="font-medium text-primary">
              {cardProps.order.tableNumber === 0 ? 'Barra' : `Mesa ${cardProps.order.tableNumber}`}
            </span>
          </div>
        </CardHeader>
        <CardContent class="pt-0">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">Total:</span>
              <span class="font-bold text-lg text-success">{cardProps.order.total.toFixed(2)}€</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">Articulos:</span>
              <span class="text-sm font-medium">{cardProps.order.itemCount}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">Estado:</span>
              <span class="text-sm font-medium">{getStatusText()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div class="space-y-4 text-foreground w-full overflow-y-hidden">
      <div class="flex items-center justify-between">
        <h2 class={cn('font-semibold', responsive.isMobile ? 'text-xl' : 'text-2xl')}>
          Historial de Cuentas
        </h2>

        {/* Sort button for mobile */}
        <Show when={responsive.isMobile}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort(sortConfig().key === 'date' ? 'total' : 'date')}
            class="touch-manipulation"
          >
            <ArrowUpDown class="w-4 h-4 mr-1" />
            {sortConfig().key === 'date' ? 'Por fecha' : 'Por total'}
          </Button>
        </Show>
      </div>

      <div class={cn('flex items-center', responsive.isMobile ? 'flex-col gap-3' : 'justify-between')}>
        <Select value={filterStatus()} onChange={setFilterStatus}>
          <SelectTrigger
            class={cn(
              'bg-background border-border touch-manipulation',
              responsive.isMobile ? 'w-full h-12' : 'w-[180px]'
            )}
          >
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent class="bg-popover">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">
              <span class="flex items-center gap-2">
                <Banknote class="text-success" /> <span>Pagado</span>
              </span>
            </SelectItem>
            <SelectItem value="unpaid">
              <span class="flex items-center gap-2">
                <HandCoins class="text-destructive" /> <span>No pagado</span>
              </span>
            </SelectItem>
            <SelectItem value="canceled">
              <span class="flex items-center gap-2">
                <XCircle class="text-muted-foreground" /> <span>Cancelado</span>
              </span>
            </SelectItem>
            <SelectItem value="inProgress">
              <span class="flex items-center gap-2">
                <Loader2 class="animate-spin text-info" /> <span>En progreso</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Card View */}
      <Show
        when={responsive.isMobile}
        fallback={
          /* Desktop Table View */
          <div
            ref={tableRef}
            class="h-[calc(90vh-200px)] overflow-y-auto touch-manipulation"
            style={{
              'overscroll-behavior': 'contain',
              '-webkit-overflow-scrolling': 'touch',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Table class="border-collapse border border-border">
              <TableHeader>
                <TableRow class="bg-muted">
                  <TableHead
                    class="cursor-pointer border border-border touch-manipulation"
                    onClick={() => handleSort('date')}
                  >
                    Fecha{' '}
                    <Show when={sortConfig().key === 'date'}>
                      <ArrowUpDown class="ml-2 h-4 w-4 inline" />
                    </Show>
                  </TableHead>
                  <TableHead class="border border-border">Total</TableHead>
                  <TableHead class="border border-border">Elementos</TableHead>
                  <TableHead class="border border-border">Mesa</TableHead>
                  <TableHead
                    class="cursor-pointer border border-border touch-manipulation"
                    onClick={() => handleSort('status')}
                  >
                    Estado{' '}
                    <Show when={sortConfig().key === 'status'}>
                      <ArrowUpDown class="ml-2 h-4 w-4 inline" />
                    </Show>
                  </TableHead>
                  <TableHead class="border border-border">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={sortedAndFilteredOrders()}>
                  {(order) => (
                    <TableRow class="hover:bg-muted/50 touch-manipulation">
                      <TableCell class="border border-border">{order.date}</TableCell>
                      <TableCell class="border border-border">
                        {order.total.toFixed(2)}€
                      </TableCell>
                      <TableCell class="border border-border">{order.itemCount}</TableCell>
                      <TableCell class="border border-border">
                        {order.tableNumber === 0 ? 'Barra' : order.tableNumber}
                      </TableCell>
                      <TableCell class="border border-border">
                        <Show when={order.status === 'paid' && order.paymentMethod === 'efectivo'}>
                          <div class="flex flex-col items-center">
                            <div class="flex items-center gap-2">
                              <HandCoins class="text-warning" />
                              <CheckCircle class="text-success" />
                            </div>
                            <div class="w-full border-t border-border my-1" />
                            <span>Pagado con Efectivo</span>
                          </div>
                        </Show>
                        <Show when={order.status === 'paid' && order.paymentMethod === 'tarjeta'}>
                          <div class="flex flex-col items-center">
                            <div class="flex items-center gap-2">
                              <CreditCard class="text-info" />
                              <CheckCircle class="text-success" />
                            </div>
                            <div class="w-full border-t border-border my-1" />
                            <span>Pagado con Tarjeta</span>
                          </div>
                        </Show>
                        <Show when={order.status === 'unpaid'}>
                          <div class="flex flex-col items-center">
                            <div class="flex items-center gap-2">
                              <XCircle class="text-destructive" />
                            </div>
                            <div class="w-full border-t border-border my-1" />
                            <span>No pagado</span>
                          </div>
                        </Show>
                        <Show when={order.status === 'canceled'}>
                          <div class="flex flex-col items-center">
                            <XCircle class="text-muted-foreground" />
                            <div class="w-full border-t border-border my-1" />
                            <span>Cancelado</span>
                          </div>
                        </Show>
                        <Show when={order.status === 'inProgress'}>
                          <div class="flex flex-col items-center">
                            <Loader2 class="animate-spin text-info" />
                            <div class="w-full border-t border-border my-1" />
                            <span>En progreso</span>
                          </div>
                        </Show>
                      </TableCell>
                      <TableCell class="border border-border justify-center ml-auto mr-auto">
                        <Button
                          variant="outline"
                          onClick={() => handleDetails(order)}
                          class="bg-background text-foreground border-border hover:bg-muted w-full h-full p-4 touch-manipulation"
                        >
                          Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </div>
        }
      >
        <div class="space-y-3 h-[calc(100vh-240px)] overflow-y-auto">
          <Show
            when={sortedAndFilteredOrders().length > 0}
            fallback={
              <div class="text-center text-muted-foreground py-8">
                No hay pedidos que mostrar
              </div>
            }
          >
            <For each={sortedAndFilteredOrders()}>
              {(order) => <OrderCard order={order} />}
            </For>
          </Show>
        </div>
      </Show>

      <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
        <DialogContent
          class={cn(
            'flex flex-col bg-background text-foreground overflow-y-hidden',
            responsive.isMobile ? 'max-w-[95vw] max-h-[90vh] p-3' : 'sm:max-w-[1200px]'
          )}
        >
          <DialogHeader>
            <DialogTitle>Detalles de la Orden</DialogTitle>
          </DialogHeader>
          <Show when={props.selectedOrder}>
            {(selectedOrder) => (
              <div
                class={cn('flex flex-1 overflow-hidden', responsive.isMobile ? 'flex-col gap-3' : 'gap-4')}
              >
                <div class={cn('overflow-y-auto', responsive.isMobile ? 'flex-1' : 'flex-1')}>
                  <ScrollArea
                    class={cn(
                      'pr-4',
                      responsive.isMobile ? 'h-[calc(70vh-120px)]' : 'h-[calc(80vh-120px)]'
                    )}
                  >
                    <div class="space-y-4">
                      <div class={cn(responsive.isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-4')}>
                        <div>
                          <Label class="text-sm">Fecha</Label>
                          <Input
                            value={selectedOrder().date}
                            readOnly
                            class={cn('bg-muted', responsive.isMobile ? 'h-10 text-sm' : '')}
                          />
                        </div>
                        <div>
                          <Label class="text-sm">Total</Label>
                          <Input
                            value={`${selectedOrder().total.toFixed(2)}€`}
                            readOnly
                            class={cn(
                              'bg-muted font-semibold text-success',
                              responsive.isMobile ? 'h-10 text-sm' : ''
                            )}
                          />
                        </div>
                        <div>
                          <Label class="text-sm">Estado</Label>
                          <Input
                            value={selectedOrder().status}
                            readOnly
                            class={cn('bg-muted', responsive.isMobile ? 'h-10 text-sm' : '')}
                          />
                        </div>
                        <div>
                          <Label class="text-sm">Mesa</Label>
                          <Input
                            value={
                              selectedOrder().tableNumber === 0
                                ? 'Barra'
                                : selectedOrder().tableNumber.toString()
                            }
                            readOnly
                            class={cn('bg-muted', responsive.isMobile ? 'h-10 text-sm' : '')}
                          />
                        </div>
                        <Show when={!responsive.isMobile}>
                          <div>
                            <Label class="text-sm">Metodo de Pago</Label>
                            <Input
                              value={selectedOrder().paymentMethod}
                              readOnly
                              class="bg-muted"
                            />
                          </div>
                        </Show>
                        {/* AEAT invoice status */}
                        <Show when={isAEATEnabled && selectedOrder().status === 'paid'}>
                          <div class={cn(responsive.isMobile ? 'col-span-2' : '')}>
                            <Label class="text-sm">Factura AEAT</Label>
                            <div class="mt-1.5">
                              <InvoiceStatusBadge aeat={selectedOrder().aeat} />
                            </div>
                          </div>
                        </Show>
                      </div>

                      <div>
                        <Label class="text-sm">Elementos</Label>
                        <Show
                          when={responsive.isMobile}
                          fallback={
                            /* Desktop: Table layout */
                            <Table class="border-collapse border border-border mt-2">
                              <TableHeader>
                                <TableRow class="bg-muted">
                                  <TableHead class="border border-border">Producto</TableHead>
                                  <TableHead class="border border-border">Cantidad</TableHead>
                                  <TableHead class="border border-border">Precio</TableHead>
                                  <TableHead class="border border-border">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <For each={selectedOrder().items}>
                                  {(item) => (
                                    <TableRow class="hover:bg-muted/50 touch-manipulation">
                                      <TableCell class="border border-border">
                                        {item.name}
                                      </TableCell>
                                      <TableCell class="border border-border">
                                        {item.quantity}
                                      </TableCell>
                                      <TableCell class="border border-border">
                                        {item.price.toFixed(2)}€
                                      </TableCell>
                                      <TableCell class="border border-border">
                                        {(item.price * item.quantity).toFixed(2)}€
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </For>
                              </TableBody>
                            </Table>
                          }
                        >
                          {/* Mobile: Card layout for items */}
                          <div class="space-y-2 mt-2">
                            <For each={selectedOrder().items}>
                              {(item) => (
                                <Card class="bg-muted/50">
                                  <CardContent class="p-3">
                                    <div class="flex justify-between items-center">
                                      <div class="flex-1">
                                        <p class="font-medium text-sm">{item.name}</p>
                                        <p class="text-xs text-muted-foreground">
                                          {item.quantity}x {item.price.toFixed(2)}€
                                        </p>
                                      </div>
                                      <div class="text-right">
                                        <p class="font-semibold text-success">
                                          {(item.price * item.quantity).toFixed(2)}€
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </For>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                <Show when={!responsive.isMobile}>
                  <div class="w-1/3 border-l border-border pl-4">
                    <Label>Vista previa del ticket</Label>
                    <div class="mt-2 bg-muted p-4 h-[calc(80vh-180px)] overflow-y-auto border border-border rounded">
                      <pre class="text-xs whitespace-pre-wrap text-foreground">
                        {renderTicketPreview(selectedOrder())}
                      </pre>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </Show>
          <DialogFooter class={cn('gap-2', responsive.isMobile ? 'flex-col sm:flex-row' : '')}>
            <Button
              variant="outline"
              onClick={handlePrintTicket}
              class={cn(
                'bg-background text-foreground border-border hover:bg-muted touch-manipulation',
                responsive.isMobile ? 'w-full h-12' : 'w-1/3 h-20'
              )}
            >
              <FileText class={cn('mr-2', responsive.isMobile ? 'h-4 w-4' : 'h-4 w-4')} />
              Imprimir Ticket
            </Button>
            {/* Emit Invoice Button - only for paid orders with AEAT enabled */}
            <Show when={props.selectedOrder?.status === 'paid' && isAEATEnabled}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div class={cn(responsive.isMobile ? 'w-full' : '')}>
                      <Button
                        variant="outline"
                        onClick={handleEmitInvoice}
                        disabled={isInvoiceButtonDisabled()}
                        class={cn(
                          'bg-background text-foreground border-border hover:bg-muted touch-manipulation',
                          responsive.isMobile ? 'w-full h-12' : 'w-full h-20',
                          props.selectedOrder?.aeat?.invoiceStatus === 'accepted' &&
                            'border-green-500 text-green-600 dark:text-green-400'
                        )}
                      >
                        <Show
                          when={!isEmitting}
                          fallback={<Loader2 class="mr-2 h-4 w-4 animate-spin" />}
                        >
                          <Receipt class={cn('mr-2', responsive.isMobile ? 'h-4 w-4' : 'h-4 w-4')} />
                        </Show>
                        <Show
                          when={!isEmitting}
                          fallback="Emitiendo..."
                        >
                          <Show
                            when={props.selectedOrder?.aeat?.invoiceStatus !== 'accepted'}
                            fallback="Factura Emitida"
                          >
                            Emitir Factura
                          </Show>
                        </Show>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getInvoiceButtonTooltip()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Show>
            <Show when={props.selectedOrder?.status === 'unpaid'}>
              <Button
                onClick={handleConfirmPayment}
                class={cn(
                  'bg-info hover:bg-info/80 text-info-foreground touch-manipulation',
                  responsive.isMobile ? 'w-full h-12' : ''
                )}
              >
                <CreditCard class="mr-2 h-4 w-4" />
                Confirmar Pago
              </Button>
            </Show>
            <Show when={props.selectedOrder?.status === 'inProgress'}>
              <Button
                onClick={handleContinueOrder}
                class={cn(
                  'bg-success hover:bg-success/80 text-success-foreground touch-manipulation',
                  responsive.isMobile ? 'w-full h-12' : ''
                )}
              >
                <CreditCard class="mr-2 h-4 w-4" />
                <Show
                  when={!responsive.isMobile}
                  fallback={`Continuar Mesa ${props.selectedOrder?.tableNumber}`}
                >
                  {`Continuar cuenta de la mesa ${props.selectedOrder?.tableNumber}`}
                </Show>
              </Button>
            </Show>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Show when={props.selectedOrder}>
        <PaymentModal
          isPaymentModalOpen={isPaymentModalOpen()}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          cashAmount={cashAmount()}
          setCashAmount={setCashAmount}
          paymentMethod={paymentMethod()}
          setPaymentMethod={setPaymentMethod}
          newOrder={props.selectedOrder!}
          handleCompleteOrder={handleCompleteOrder}
          showTicketDialog={showTicketDialog()}
          setShowTicketDialog={setShowTicketDialog}
          handleTicketPrintingComplete={handleTicketPrintingComplete}
        />
      </Show>
    </div>
  );
};

export default OrderHistory;
