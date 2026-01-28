import { Package } from 'lucide-solid';
import { createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { connectToThermalPrinter } from '@/assets/utils/utils';
import CategorySidebar from '@/components/CategorySidebar';
import OrderPanel from '@/components/OrderPanel';
import PaymentModal from '@/components/PaymentModal';
import ProductGrid from '@/components/Product';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';
import type Product from '@/models/Product';
import type { ThermalPrinterServiceOptions } from '@/models/ThermalPrinter';
import useStore from '@/store/store';

function NewOrder() {
  const store = useStore();

  const responsive = useResponsive();
  const isMobile = () => responsive.isMobile;

  const [isPaymentModalOpen, setIsPaymentModalOpen] = createSignal(false);
  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = createSignal(false);
  const [orderToClose, setOrderToClose] = createSignal<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = createSignal<string | null>('Fijados');
  const [showOrderPanel, setShowOrderPanel] = createSignal(false);

  // Update tables availability based on active orders
  createEffect(() => {
    const updatedTables = store.state.tables.map((table) => {
      const activeOrder = store.state.activeOrders.find(
        (order) => order.tableNumber === table.id && order.status === 'inProgress'
      );
      return {
        ...table,
        available: !activeOrder,
        order: activeOrder || null,
      };
    });

    if (JSON.stringify(updatedTables) !== JSON.stringify(store.state.tables)) {
      store.setTables(updatedTables);
    }
  });

  // Memoize in-progress orders filter
  const inProgressOrders = createMemo(() => {
    return store.state.orderHistory.filter((order) => order.status === 'inProgress');
  });

  // Auto-select first order when active orders exist
  createEffect(() => {
    if (store.state.activeOrders.length > 0 && !store.state.selectedOrderId) {
      store.setSelectedOrderId(store.state.activeOrders[0].id);
    } else if (store.state.activeOrders.length === 0) {
      if (inProgressOrders().length > 0) {
        store.setActiveOrders(inProgressOrders());
      }
    }
  });

  // Sync selected order with active orders
  createEffect(() => {
    if (store.state.selectedOrderId) {
      const order = store.state.activeOrders.find((o) => o.id === store.state.selectedOrderId);
      store.setSelectedOrder(order || null);
    } else {
      store.setSelectedOrder(null);
    }
  });

  // Update recent products when user or products change
  createEffect(() => {
    if (store.state.selectedUser && store.state.products.length > 0) {
      const pinnedProductIds = store.state.selectedUser.pinnedProductIds || [];
      const pinnedProducts = store.state.products.filter((product) =>
        pinnedProductIds.includes(product.id)
      );
      store.setRecentProducts(pinnedProducts);
    }
  });

  const handleAddToOrder = (orderId: number, product: OrderItem | Product) => {
    store.addToOrder(orderId, product);
  };

  const handleRemoveFromOrder = (orderId: number, productId: number) => {
    store.removeFromOrder(orderId, productId);
  };

  const handleTicketPrintingComplete = async (shouldPrintTicket: boolean) => {
    if (shouldPrintTicket) {
      try {
        const printer = await connectToThermalPrinter(
          store.state.thermalPrinterOptions as ThermalPrinterServiceOptions
        );
        if (printer && store.state.selectedOrder) {
          await printer.printOrder(store.state.selectedOrder);
          await printer.disconnect();
          toast({
            title: 'Ticket impreso',
            description: 'Ticket impreso con exito.',
            duration: 3000,
          });
        } else {
          console.error('Error al conectar la impresora.');
          toast({
            title: 'Error al imprimir ticket',
            description: 'No se pudo imprimir el ticket. Por favor, intentelo de nuevo.',
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error al imprimir ticket:', error);
        toast({
          title: 'Error al imprimir ticket',
          description: 'No se pudo imprimir el ticket. Por favor, intentelo de nuevo.',
          duration: 3000,
        });
      }
    }
    store.setShowTicketDialog(false);
    setIsPaymentModalOpen(false);
    store.setSelectedOrderId(null);
  };

  const handleCloseTab = (orderId: number) => {
    const orderToCloseItem = store.state.activeOrders.find((order) => order.id === orderId);
    if (orderToCloseItem && orderToCloseItem.items.length > 0) {
      setOrderToClose(orderToCloseItem);
      setIsConfirmCloseModalOpen(true);
    } else {
      store.closeOrder(orderId);
    }
  };

  // Memoize filtered products for performance
  const filteredProducts = createMemo(() => {
    if (!selectedCategory()) return [];

    if (selectedCategory() === 'Fijados') {
      return store.state.recentProducts;
    }

    return store.state.products.filter((product) => product.category === selectedCategory());
  });

  // Memoize available tables
  const availableTables = createMemo(() => {
    return store.state.tables.filter(
      (table) =>
        table.id !== 0 &&
        table.available &&
        !store.state.activeOrders.find((order) => order.tableNumber === table.id)
    );
  });

  // Memoize if bar is available
  const isBarAvailable = createMemo(() => {
    return !store.state.activeOrders.find((order) => order.tableNumber === 0);
  });

  // Memoize total available tables for fade indicator
  const totalAvailableTables = createMemo(() => {
    return availableTables().length + store.state.activeOrders.length;
  });

  return (
    <div class="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* TopBar with table and order selector - optimized for mobile */}
      <div
        class={cn(
          'border-b border-border bg-card flex-shrink-0',
          isMobile() ? 'px-2 py-1' : 'px-3 py-1.5'
        )}
      >
        <div class="relative min-h-[2.5rem] flex items-center">
          <div class="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory w-full pb-1 -mb-1">
            {/* Bar (if available) */}
            <Show when={isBarAvailable()}>
              <button
                type="button"
                onClick={() => store.handleTableChange(0)}
                class={cn(
                  'table-button bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border rounded-lg flex items-center font-medium transition-all duration-150 hover:bg-sidebar-accent/90 active:scale-[0.98] flex-shrink-0 snap-start shadow-sm',
                  isMobile() ? 'px-2 py-1 gap-1.5 text-[0.7rem]' : 'px-3 py-1.5 gap-1.5 text-xs'
                )}
              >
                <span class="w-2 h-2 bg-sidebar-accent-foreground rounded-full animate-pulse"></span>
                Barra
              </button>
            </Show>

            {/* Available tables */}
            <For each={availableTables()}>
              {(table) => (
                <button
                  type="button"
                  onClick={() => store.handleTableChange(table.id)}
                  class={cn(
                    'table-button bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border rounded-lg flex items-center font-medium transition-all duration-150 hover:bg-sidebar-accent/90 active:scale-[0.98] flex-shrink-0 snap-start shadow-sm',
                    isMobile() ? 'px-2 py-1 gap-1.5 text-[0.7rem]' : 'px-3 py-1.5 gap-1.5 text-xs'
                  )}
                >
                  <span class="w-2 h-2 bg-sidebar-accent-foreground rounded-full animate-pulse"></span>
                  {table.name}
                </button>
              )}
            </For>

            {/* Active Orders (mixed in same row) */}
            <For each={store.state.activeOrders}>
              {(order) => (
                <button
                  type="button"
                  class={cn(
                    'table-button border rounded-lg flex items-center font-medium transition-all duration-150 active:scale-[0.98] flex-shrink-0 snap-start cursor-pointer',
                    store.state.selectedOrderId === order.id
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary shadow-md'
                      : 'bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted/80 shadow-sm',
                    isMobile() ? 'px-2 py-1 gap-1.5 text-[0.7rem]' : 'px-3 py-1.5 gap-1.5 text-xs'
                  )}
                  onClick={() => store.setSelectedOrderId(order.id)}
                >
                  <span
                    class={`w-2 h-2 rounded-full ${
                      store.state.selectedOrderId === order.id
                        ? 'bg-sidebar-primary-foreground animate-pulse'
                        : 'bg-muted-foreground'
                    }`}
                  ></span>
                  <span class="whitespace-nowrap">
                    {order.tableNumber === 0 ? 'Barra' : `Mesa ${order.tableNumber}`}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(order.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        handleCloseTab(order.id);
                      }
                    }}
                    class={cn(
                      'text-current opacity-70 hover:opacity-100 flex items-center justify-center rounded-full hover:bg-destructive/20 transition-all duration-150',
                      isMobile() ? 'ml-0.5 text-sm w-4 h-4' : 'ml-1 text-sm w-4 h-4'
                    )}
                    title="Cerrar comanda"
                  >
                    x
                  </span>
                </button>
              )}
            </For>
          </div>

          {/* Fade indicator at the end (if many elements) */}
          <Show when={totalAvailableTables() > 6}>
            <div class="absolute top-0 right-0 bottom-1 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
          </Show>
        </div>
      </div>

      {/* Responsive layout - Desktop: 3 columns, Mobile: vertical stack */}
      <Show
        when={!isMobile()}
        fallback={
          /* Mobile Layout */
          <div class="flex-1 flex flex-col min-h-0">
            {/* Categories as horizontal tabs */}
            <div class="border-b border-border bg-card/50 flex-shrink-0">
              <div class="flex gap-1 p-2 overflow-x-auto scrollbar-hide">
                <For each={store.state.categories}>
                  {(category) => (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category.name)}
                      class={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                        selectedCategory() === category.name
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {category.name}
                    </button>
                  )}
                </For>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Fijados')}
                  class={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                    selectedCategory() === 'Fijados'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  Favoritos
                </button>
              </div>
            </div>

            {/* Products section */}
            <div class="flex-1 flex flex-col overflow-hidden">
              <div class="px-3 py-2 border-b border-border bg-card/30 flex items-center justify-between flex-shrink-0">
                <div class="flex items-center gap-2">
                  <Package class="w-4 h-4 text-foreground/70" />
                  <h3 class="text-sm font-medium text-foreground">
                    {selectedCategory() === 'Fijados' ? 'Productos Favoritos' : selectedCategory()}
                  </h3>
                </div>
                <Show when={store.state.selectedOrderId && store.state.selectedOrder}>
                  <Button
                    onClick={() => setShowOrderPanel(true)}
                    variant="outline"
                    size="sm"
                    class="h-7 px-2 text-xs"
                  >
                    Ver Pedido ({store.state.selectedOrder?.items.length})
                  </Button>
                </Show>
              </div>
              <div class="flex-1 min-h-0">
                <ProductGrid
                  products={filteredProducts()}
                  handleAddToOrder={(product) => {
                    if (store.state.selectedOrderId) {
                      handleAddToOrder(store.state.selectedOrderId, product);
                    }
                  }}
                  selectedOrderId={store.state.selectedOrderId}
                />
              </div>
            </div>

            {/* Mobile Order Panel Modal */}
            <Dialog open={showOrderPanel()} onOpenChange={setShowOrderPanel}>
              <DialogContent class="w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] p-0 flex flex-col rounded-none border-0">
                <DialogHeader class="px-4 py-4 border-b flex-shrink-0 bg-background">
                  <DialogTitle class="text-2xl font-semibold">
                    Pedido -{' '}
                    {store.state.selectedOrder?.tableNumber === 0
                      ? 'Barra'
                      : `Mesa ${store.state.selectedOrder?.tableNumber}`}
                  </DialogTitle>
                </DialogHeader>
                <div class="flex-1 overflow-hidden min-h-0">
                  <OrderPanel
                    activeOrders={store.state.activeOrders}
                    selectedOrder={store.state.selectedOrder}
                    selectedOrderId={store.state.selectedOrderId}
                    tables={store.state.tables}
                    onOrderSelect={store.setSelectedOrderId}
                    onOrderClose={handleCloseTab}
                    onNewOrder={() => store.handleTableChange(0)}
                    onTableChange={store.handleTableChange}
                    onPaymentStart={() => {
                      setShowOrderPanel(false);
                      setIsPaymentModalOpen(true);
                    }}
                    onRemoveFromOrder={handleRemoveFromOrder}
                    onAddToOrder={handleAddToOrder}
                    disableAnimations={true}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        {/* Desktop Layout - 3 optimized columns */}
        <div class="flex-1 flex min-h-0 w-full overflow-hidden">
          {/* Categories - Minimum flexible width */}
          <div class="w-48 min-w-[12rem] max-w-[16rem] flex-shrink-0 border-r border-border overflow-hidden">
            <CategorySidebar
              categories={store.state.categories}
              selectedCategory={selectedCategory()}
              onCategorySelect={setSelectedCategory}
            />
          </div>

          {/* Products - Takes available space with independent scroll */}
          <div class="flex-1 min-w-0 flex flex-col border-r border-sidebar-border overflow-hidden">
            <div class="h-12 px-3 border-b border-sidebar-border bg-sidebar/40 flex items-center gap-2 flex-shrink-0">
              <Package class="w-4 h-4 text-sidebar-foreground" />
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-sidebar-foreground truncate">
                  {selectedCategory() === 'Fijados' ? 'Productos Favoritos' : selectedCategory()}
                </h3>
                <Show
                  when={store.state.selectedOrderId}
                  fallback={
                    <p class="text-xs text-sidebar-foreground/50 truncate">
                      Selecciona una mesa para comenzar
                    </p>
                  }
                >
                  <p class="text-xs text-sidebar-foreground/70 truncate">
                    Agregando a{' '}
                    {store.state.selectedOrder?.tableNumber === 0
                      ? 'Barra'
                      : `Mesa ${store.state.selectedOrder?.tableNumber}`}
                  </p>
                </Show>
              </div>
            </div>
            <div class="flex-1 min-h-0 overflow-hidden">
              <ProductGrid
                products={filteredProducts()}
                handleAddToOrder={(product) => {
                  if (store.state.selectedOrderId) {
                    handleAddToOrder(store.state.selectedOrderId, product);
                  }
                }}
                selectedOrderId={store.state.selectedOrderId}
              />
            </div>
          </div>

          {/* Order Summary - Optimal fixed width with independent overflow */}
          <div class="w-80 min-w-[20rem] max-w-[24rem] flex-shrink-0 overflow-hidden">
            <OrderPanel
              activeOrders={store.state.activeOrders}
              selectedOrder={store.state.selectedOrder}
              selectedOrderId={store.state.selectedOrderId}
              tables={store.state.tables}
              onOrderSelect={store.setSelectedOrderId}
              onOrderClose={handleCloseTab}
              onNewOrder={() => store.handleTableChange(0)}
              onTableChange={store.handleTableChange}
              onPaymentStart={() => setIsPaymentModalOpen(true)}
              onRemoveFromOrder={handleRemoveFromOrder}
              onAddToOrder={handleAddToOrder}
            />
          </div>
        </div>
      </Show>

      {/* Modals */}
      <Show when={store.state.selectedOrder}>
        <PaymentModal
          isPaymentModalOpen={isPaymentModalOpen()}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          cashAmount={store.state.cashAmount}
          setCashAmount={store.setCashAmount}
          paymentMethod={store.state.paymentMethod}
          setPaymentMethod={store.setPaymentMethod}
          newOrder={store.state.selectedOrder!}
          handleCompleteOrder={store.handleCompleteOrder}
          showTicketDialog={store.state.showTicketDialog}
          setShowTicketDialog={store.setShowTicketDialog}
          handleTicketPrintingComplete={handleTicketPrintingComplete}
        />
      </Show>

      <Dialog open={isConfirmCloseModalOpen()} onOpenChange={setIsConfirmCloseModalOpen}>
        <DialogContent
          class={cn(
            'flex flex-col justify-center',
            isMobile() ? 'w-[95vw] max-w-[95vw] p-6' : 'w-[80vw] max-w-[600px] p-8'
          )}
        >
          <DialogHeader>
            <DialogTitle
              class={cn('font-semibold text-center', isMobile() ? 'text-2xl' : 'text-4xl')}
            >
              Esta seguro de eliminar esta comanda?
            </DialogTitle>
            <DialogDescription class={cn('text-center mt-4', isMobile() ? 'text-base' : 'text-xl')}>
              Esta accion eliminara la comanda en progreso para la{' '}
              {orderToClose()?.tableNumber === 0 ? 'Barra' : `Mesa ${orderToClose()?.tableNumber}`}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class={cn('gap-4 mt-6', isMobile() ? 'flex-col' : 'flex-row')}>
            <Button
              variant="outline"
              onClick={() => setIsConfirmCloseModalOpen(false)}
              class={cn('flex-1 touch-manipulation', isMobile() ? 'h-16 text-xl' : 'h-20 text-2xl')}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const order = orderToClose();
                if (order) {
                  store.closeOrder(order.id);
                }
                setIsConfirmCloseModalOpen(false);
              }}
              class={cn('flex-1 touch-manipulation', isMobile() ? 'h-16 text-xl' : 'h-20 text-2xl')}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NewOrder;
