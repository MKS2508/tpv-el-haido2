import { Package } from 'lucide-solid';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { connectToThermalPrinter } from '@/assets/utils/utils';
import CategorySidebar from '@/components/CategorySidebar';
import ConfirmPaymentDialog from '@/components/ConfirmPaymentDialog';
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
import OrderSheet from '@/components/ui/OrderSheet';
import TableScroll from '@/components/ui/TableScroll';
import { toast } from '@/components/ui/use-toast';
import { usePerformanceConfig } from '@/hooks/usePerformanceConfig';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';
import type Product from '@/models/Product';
import type { ThermalPrinterServiceOptions } from '@/models/ThermalPrinter';
import useStore from '@/store/store';
import '@/styles/neworder.css';

function NewOrder() {
  const store = useStore();
  const perf = usePerformanceConfig();
  const responsive = useResponsive();

  // Signals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = createSignal(false);
  const [isConfirmPaymentDialogOpen, setIsConfirmPaymentDialogOpen] = createSignal(false);
  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = createSignal(false);
  const [orderToClose, setOrderToClose] = createSignal<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = createSignal<string | null>('Fijados');
  const [isOrderSheetOpen, setIsOrderSheetOpen] = createSignal(false);

  // Responsive getters
  const isMobile = () => responsive.isMobile();
  const _isTablet = () => responsive.isTablet();
  const isDesktop = () =>
    responsive.isDesktop() || responsive.isLargeDesktop() || responsive.isUltraWide();

  // Memoize in-progress orders filter
  const _inProgressOrders = createMemo(() => {
    return store.state.orderHistory.filter((order) => order.status === 'inProgress');
  });

  // Memoize valid active orders (filter out null/undefined)
  const validActiveOrders = createMemo(() => {
    return store.state.activeOrders.filter(
      (order): order is Order => order != null && order.id != null
    );
  });

  // Sync selected order with active orders
  createEffect(() => {
    if (store.state.selectedOrderId) {
      const order = validActiveOrders().find((o) => o.id === store.state.selectedOrderId);
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
    setIsOrderSheetOpen(false);
    store.setSelectedOrderId(null);
  };

  const handleCloseTab = (orderId: number) => {
    if (orderId == null || orderId === undefined) {
      console.error('[NewOrder] Invalid order ID:', orderId);
      return;
    }
    const orderToCloseItem = store.state.activeOrders.find((order) => order.id === orderId);
    if (orderToCloseItem && orderToCloseItem.items.length > 0) {
      setOrderToClose(orderToCloseItem);
      setIsConfirmCloseModalOpen(true);
    } else {
      store.closeOrder(orderId);
    }
  };

  const handlePaymentStart = () => {
    setIsConfirmPaymentDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    setIsConfirmPaymentDialogOpen(false);
    setIsPaymentModalOpen(true);
  };

  // Memoize filtered products for performance
  const filteredProducts = createMemo(() => {
    if (!selectedCategory()) return [];

    if (selectedCategory() === 'Fijados') {
      return store.state.recentProducts;
    }

    return store.state.products.filter((product) => product.category === selectedCategory());
  });

  // Unified table list with computed state for each table
  // This ensures tables maintain their position and only styles change
  type TableState = 'available' | 'selected-empty' | 'has-items';

  interface UnifiedTableEntry {
    id: number;
    name: string;
    state: TableState;
    order: Order | null;
    itemCount: number;
  }

  const unifiedTableList = createMemo((): UnifiedTableEntry[] => {
    // Start with Bar (id: 0) then all tables sorted by id
    const allTables = [{ id: 0, name: 'Barra' }, ...store.state.tables.filter((t) => t.id !== 0)];

    return allTables.map((table) => {
      const activeOrder = store.state.activeOrders.find((o) => o.tableNumber === table.id);
      const isSelected = activeOrder?.id === store.state.selectedOrderId;
      const hasItems = (activeOrder?.items.length ?? 0) > 0;

      let state: TableState = 'available';
      if (activeOrder) {
        state = hasItems ? 'has-items' : isSelected ? 'selected-empty' : 'available';
      }

      return {
        id: table.id,
        name: table.name,
        state,
        order: activeOrder ?? null,
        itemCount: activeOrder?.items.length ?? 0,
      };
    });
  });

  // Handle table click - either select existing order or create new one
  const handleTableClick = (entry: UnifiedTableEntry) => {
    if (entry.order) {
      store.setSelectedOrderId(entry.order.id);
    } else {
      store.handleTableChange(entry.id);
    }
  };

  // Unified table button renderer
  const renderUnifiedTableButton = (entry: UnifiedTableEntry, index: number) => {
    const isSelected = entry.order?.id === store.state.selectedOrderId;

    return (
      <button
        type="button"
        onClick={() => handleTableClick(entry)}
        class={cn(
          'table-button',
          'neworder-scroll-snap-item',
          'group relative',
          'flex items-center gap-1.5',
          'px-3 py-1.5',
          'text-xs font-medium',
          'rounded-lg',
          'border',
          'transition-all duration-200 ease-out',
          'active:scale-[0.97]',
          'flex-shrink-0 min-w-0',
          // State-based styles
          entry.state === 'available' &&
            'bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border hover:bg-sidebar-accent/80 hover:border-sidebar-foreground/20 shadow-sm',
          entry.state === 'selected-empty' &&
            'bg-primary/15 text-primary border-primary/50 shadow-md ring-1 ring-primary/30',
          entry.state === 'has-items' &&
            'bg-primary text-primary-foreground border-primary shadow-lg',
          // Selected ring for items
          isSelected &&
            entry.state === 'has-items' &&
            'ring-2 ring-primary/50 ring-offset-1 ring-offset-background',
          perf.enableAnimations && 'neworder-stagger-item'
        )}
        style={perf.enableAnimations ? { 'animation-delay': `${index * 30}ms` } : {}}
      >
        {/* Status indicator dot */}
        <span
          class={cn(
            'w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200',
            entry.state === 'available' && 'bg-sidebar-accent-foreground/50',
            entry.state === 'selected-empty' && 'bg-primary animate-pulse',
            entry.state === 'has-items' && 'bg-primary-foreground'
          )}
        />

        {/* Table name */}
        <span class="truncate">{entry.name}</span>

        {/* Item count badge */}
        <Show when={entry.itemCount > 0}>
          <span
            class={cn(
              'ml-auto text-[10px] font-semibold',
              'bg-primary-foreground/20 px-1.5 py-0.5 rounded-full',
              'min-w-[1.25rem] text-center',
              'transition-transform duration-200',
              isSelected && 'scale-110'
            )}
          >
            {entry.itemCount}
          </span>
        </Show>
      </button>
    );
  };

  return (
    <div class="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* TopBar with table and order selector */}
      <div
        class={cn(
          'border-b border-border bg-card flex-shrink-0',
          isMobile() ? 'px-2 py-1' : 'px-3 py-2'
        )}
      >
        <Show
          when={isMobile()}
          fallback={
            /* Desktop: Multi-row layout with wrap - unified table list */
            <div class="flex flex-wrap gap-1.5 max-w-full min-h-[2.75rem]">
              <For each={unifiedTableList()}>
                {(entry, index) => renderUnifiedTableButton(entry, index())}
              </For>
            </div>
          }
        >
          {/* Mobile/Tablet: Horizontal scroll with unified table list */}
          <TableScroll showFadeIndicator={() => unifiedTableList().length > 6}>
            <For each={unifiedTableList()}>
              {(entry, index) => renderUnifiedTableButton(entry, index())}
            </For>
          </TableScroll>
        </Show>
      </div>

      {/* Responsive layout */}
      <Show
        when={isDesktop()}
        fallback={
          /* Mobile/Tablet Layout */
          <div class="flex-1 flex flex-col min-h-0">
            {/* Categories as horizontal tabs */}
            <div class="border-b border-border bg-card/50 flex-shrink-0">
              <div class="flex gap-1 p-2 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Fijados')}
                  class={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0',
                    selectedCategory() === 'Fijados'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  Favoritos
                </button>
                <For each={store.state.categories}>
                  {(category) => (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category.name)}
                      class={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0',
                        selectedCategory() === category.name
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {category.name}
                    </button>
                  )}
                </For>
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
              </div>
              <div class="flex-1 min-h-0 overflow-hidden max-w-full">
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

            {/* Order Sheet for mobile/tablet */}
            <OrderSheet
              open={isOrderSheetOpen}
              onOpenChange={setIsOrderSheetOpen}
              activeOrders={store.state.activeOrders}
              selectedOrder={store.state.selectedOrder}
              selectedOrderId={store.state.selectedOrderId}
              tables={store.state.tables}
              onOrderSelect={store.setSelectedOrderId}
              onOrderClose={handleCloseTab}
              onNewOrder={() => store.handleTableChange(0)}
              onTableChange={store.handleTableChange}
              onPaymentStart={handlePaymentStart}
              onRemoveFromOrder={handleRemoveFromOrder}
              onAddToOrder={handleAddToOrder}
              disableAnimations={!perf.enableAnimations}
            />
          </div>
        }
      >
        {/* Desktop Layout - 3 optimized columns */}
        <div class="flex-1 flex min-h-0 w-full max-w-full overflow-hidden">
          {/* Categories - Fixed width */}
          <div class="neworder-categories--desktop overflow-hidden flex">
            <CategorySidebar
              categories={store.state.categories}
              selectedCategory={selectedCategory()}
              onCategorySelect={setSelectedCategory}
            />
          </div>

          {/* Products - Takes available space */}
          <div class="neworder-products--desktop flex flex-col border-r border-sidebar-border overflow-hidden flex-shrink">
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
            <div class="flex-1 min-h-0 overflow-hidden max-w-full">
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

          {/* Order Summary - Fixed width */}
          <div class="neworder-order-panel--desktop flex-shrink-0 overflow-hidden">
            <OrderPanel
              activeOrders={store.state.activeOrders}
              selectedOrder={store.state.selectedOrder}
              selectedOrderId={store.state.selectedOrderId}
              tables={store.state.tables}
              onOrderSelect={store.setSelectedOrderId}
              onOrderClose={handleCloseTab}
              onNewOrder={() => store.handleTableChange(0)}
              onTableChange={store.handleTableChange}
              onPaymentStart={handlePaymentStart}
              onRemoveFromOrder={handleRemoveFromOrder}
              onAddToOrder={handleAddToOrder}
              disableAnimations={!perf.enableAnimations}
            />
          </div>
        </div>
      </Show>

      {/* Modals */}
      <ConfirmPaymentDialog
        isOpen={isConfirmPaymentDialogOpen()}
        onClose={() => setIsConfirmPaymentDialogOpen(false)}
        onConfirm={handleConfirmPayment}
        order={store.state.selectedOrder}
        paymentMethod={store.state.paymentMethod}
      />

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
