import { Package } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { connectToThermalPrinter } from '@/assets/utils/utils';
import CategorySidebar from '@/components/CategorySidebar.tsx';
import OrderPanel from '@/components/OrderPanel.tsx';
import PaymentModal from '@/components/PaymentModal';
import ProductGrid from '@/components/Product.tsx';
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
import type { ThermalPrinterServiceOptions } from '@/models/ThermalPrinter.ts';
import { useNewOrderData } from '@/store/selectors';

const NewOrder = memo(() => {
  const {
    activeOrders,
    recentProducts,
    setRecentProducts,
    selectedOrderId,
    setSelectedOrderId,
    setTables,
    products,
    selectedUser,
    tables,
    thermalPrinterOptions,
    addToOrder,
    removeFromOrder,
    paymentMethod,
    cashAmount,
    showTicketDialog,
    handleTableChange,
    handleCompleteOrder,
    closeOrder,
    setPaymentMethod,
    setCashAmount,
    setShowTicketDialog,
    categories,
    orderHistory,
    setActiveOrders,
    selectedOrder,
    setSelectedOrder,
  } = useNewOrderData();

  const { isMobile } = useResponsive();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = useState(false);
  const [orderToClose, setOrderToClose] = useState<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('Fijados');
  const [showOrderPanel, setShowOrderPanel] = useState(false);

  useEffect(() => {
    const updatedTables = tables.map((table) => {
      const activeOrder = activeOrders.find(
        (order) => order.tableNumber === table.id && order.status === 'inProgress'
      );
      return {
        ...table,
        available: !activeOrder,
        order: activeOrder || null,
      };
    });

    if (JSON.stringify(updatedTables) !== JSON.stringify(tables)) {
      setTables(updatedTables);
    }
  }, [activeOrders, setTables, tables]); // Remove 'tables' from the dependency array

  // Memoizar filtro de órdenes en progreso para evitar recálculo en cada render
  const inProgressOrders = useMemo(() => {
    return orderHistory.filter((order) => order.status === 'inProgress');
  }, [orderHistory]);

  useEffect(() => {
    if (activeOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(activeOrders[0].id);
    } else if (activeOrders.length === 0) {
      if (inProgressOrders.length > 0) {
        setActiveOrders(inProgressOrders);
      }
    }
  }, [
    activeOrders.length,
    selectedOrderId,
    inProgressOrders,
    setActiveOrders,
    setSelectedOrderId,
    activeOrders[0]?.id,
  ]);

  useEffect(() => {
    if (selectedOrderId) {
      const order = activeOrders.find((o) => o.id === selectedOrderId);
      setSelectedOrder(order || null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, activeOrders, setSelectedOrder]);

  // Products are already loaded by App.tsx via storageAdapter

  useEffect(() => {
    if (selectedUser && products.length > 0) {
      const pinnedProductIds = selectedUser.pinnedProductIds || [];
      const pinnedProducts = products.filter((product) => pinnedProductIds.includes(product.id));
      setRecentProducts(pinnedProducts);
    }
  }, [selectedUser, products, setRecentProducts]);

  const handleAddToOrder = useCallback(
    (orderId: number, product: OrderItem | Product) => {
      addToOrder(orderId, product);
    },
    [addToOrder]
  );

  const handleRemoveFromOrder = useCallback(
    (orderId: number, productId: number) => {
      removeFromOrder(orderId, productId);
    },
    [removeFromOrder]
  );

  const handleTicketPrintingComplete = async (shouldPrintTicket: boolean) => {
    if (shouldPrintTicket) {
      try {
        const printer = await connectToThermalPrinter(
          thermalPrinterOptions as ThermalPrinterServiceOptions
        );
        if (printer && selectedOrder) {
          await printer.printOrder(selectedOrder);
          await printer.disconnect();
          toast({
            title: 'Ticket impreso',
            description: 'Ticket impreso con éxito.',
            duration: 3000,
          });
        } else {
          console.error('Error al conectar la impresora.');
          toast({
            title: 'Error al imprimir ticket',
            description: 'No se pudo imprimir el ticket. Por favor, inténtelo de nuevo.',
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error al imprimir ticket:', error);
        toast({
          title: 'Error al imprimir ticket',
          description: 'No se pudo imprimir el ticket. Por favor, inténtelo de nuevo.',
          duration: 3000,
        });
      }
    }
    setShowTicketDialog(false);
    setIsPaymentModalOpen(false);
    setSelectedOrderId(null);
  };

  const handleCloseTab = (orderId: number) => {
    const orderToClose = activeOrders.find((order) => order.id === orderId);
    if (orderToClose && orderToClose.items.length > 0) {
      setOrderToClose(orderToClose);
      setIsConfirmCloseModalOpen(true);
    } else {
      closeOrder(orderId);
    }
  };

  // Memoizar filtros costosos para optimizar rendimiento
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];

    if (selectedCategory === 'Fijados') {
      return recentProducts;
    }

    return products.filter((product) => product.category === selectedCategory);
  }, [selectedCategory, products, recentProducts]);

  // Memoizar tablas disponibles - filtro costoso que se ejecutaba en cada render
  const availableTables = useMemo(() => {
    return tables.filter(
      (table) =>
        table.id !== 0 &&
        table.available &&
        !activeOrders.find((order) => order.tableNumber === table.id)
    );
  }, [tables, activeOrders]);

  // Memoizar si la barra está libre
  const isBarAvailable = useMemo(() => {
    return !activeOrders.find((order) => order.tableNumber === 0);
  }, [activeOrders]);

  // Memoizar tablas ocupadas
  // const occupiedTables = useMemo(() => {
  //     return tables.filter(table =>
  //         activeOrders.find(order => order.tableNumber === table.id)
  //     )
  // }, [tables, activeOrders])

  // Memoizar total de tablas para mostrar fade indicator
  const totalAvailableTables = useMemo(() => {
    return availableTables.length + activeOrders.length;
  }, [availableTables.length, activeOrders.length]);

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* TopBar con selector de mesas y comandas - optimizado para mobile */}
      <div
        className={cn(
          'border-b border-border bg-card flex-shrink-0',
          isMobile ? 'px-2 py-1' : 'px-3 py-1.5'
        )}
      >
        <div className="relative min-h-[2.5rem] flex items-center">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory w-full pb-1 -mb-1">
            {/* Barra (si está libre) */}
            {isBarAvailable && (
              <button
                type="button"
                onClick={() => handleTableChange(0)}
                className={cn(
                  'table-button bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border rounded-lg flex items-center font-medium transition-all duration-150 hover:bg-sidebar-accent/90 active:scale-[0.98] flex-shrink-0 snap-start shadow-sm',
                  isMobile ? 'px-2 py-1 gap-1.5 text-[0.7rem]' : 'px-3 py-1.5 gap-1.5 text-xs'
                )}
              >
                <span className="w-2 h-2 bg-sidebar-accent-foreground rounded-full animate-pulse"></span>
                Barra
              </button>
            )}

            {/* Mesas libres */}
            {availableTables.map((table) => (
              <button
                type="button"
                key={`available-${table.id}`}
                onClick={() => handleTableChange(table.id)}
                className={cn(
                  'table-button bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border rounded-lg flex items-center font-medium transition-all duration-150 hover:bg-sidebar-accent/90 active:scale-[0.98] flex-shrink-0 snap-start shadow-sm',
                  isMobile ? 'px-2 py-1 gap-1.5 text-[0.7rem]' : 'px-3 py-1.5 gap-1.5 text-xs'
                )}
              >
                <span className="w-2 h-2 bg-sidebar-accent-foreground rounded-full animate-pulse"></span>
                {table.name}
              </button>
            ))}

            {/* Comandas Activas (mezcladas en la misma fila) */}
            {activeOrders.map((order) => (
              <button
                type="button"
                key={`order-${order.id}`}
                className={cn(
                  'table-button border rounded-lg flex items-center font-medium transition-all duration-150 active:scale-[0.98] flex-shrink-0 snap-start cursor-pointer',
                  selectedOrderId === order.id
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary shadow-md'
                    : 'bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted/80 shadow-sm',
                  isMobile ? 'px-2 py-1 gap-1.5 text-[0.7rem]' : 'px-3 py-1.5 gap-1.5 text-xs'
                )}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedOrderId === order.id
                      ? 'bg-sidebar-primary-foreground animate-pulse'
                      : 'bg-muted-foreground'
                  }`}
                ></span>
                <span className="whitespace-nowrap">
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
                  className={cn(
                    'text-current opacity-70 hover:opacity-100 flex items-center justify-center rounded-full hover:bg-destructive/20 transition-all duration-150',
                    isMobile ? 'ml-0.5 text-sm w-4 h-4' : 'ml-1 text-sm w-4 h-4'
                  )}
                  title="Cerrar comanda"
                >
                  ×
                </span>
              </button>
            ))}
          </div>

          {/* Fade indicator único al final (si hay muchos elementos) */}
          {totalAvailableTables > 6 && (
            <div className="absolute top-0 right-0 bottom-1 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
          )}
        </div>
      </div>

      {/* Layout responsive - Desktop: 3 columnas, Mobile: stack vertical */}
      {isMobile ? (
        /* Mobile Layout */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Categories as horizontal tabs */}
          <div className="border-b border-border bg-card/50 flex-shrink-0">
            <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                    selectedCategory === category.name
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {category.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedCategory('Fijados')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                  selectedCategory === 'Fijados'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Favoritos
              </button>
            </div>
          </div>

          {/* Products section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-card/30 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-foreground/70" />
                <h3 className="text-sm font-medium text-foreground">
                  {selectedCategory === 'Fijados' ? 'Productos Favoritos' : selectedCategory}
                </h3>
              </div>
              {selectedOrderId && selectedOrder && (
                <Button
                  onClick={() => setShowOrderPanel(true)}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  Ver Pedido ({selectedOrder.items.length})
                </Button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <ProductGrid
                products={filteredProducts}
                handleAddToOrder={(product) => {
                  if (selectedOrderId) {
                    handleAddToOrder(selectedOrderId, product);
                  }
                }}
                selectedOrderId={selectedOrderId}
              />
            </div>
          </div>

          {/* Mobile Order Panel Modal */}
          <Dialog open={showOrderPanel} onOpenChange={setShowOrderPanel}>
            <DialogContent className="w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] p-0 flex flex-col rounded-none border-0">
              <DialogHeader className="px-4 py-4 border-b flex-shrink-0 bg-background">
                <DialogTitle className="text-2xl font-semibold">
                  Pedido -{' '}
                  {selectedOrder?.tableNumber === 0
                    ? 'Barra'
                    : `Mesa ${selectedOrder?.tableNumber}`}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden min-h-0">
                <OrderPanel
                  activeOrders={activeOrders}
                  selectedOrder={selectedOrder}
                  selectedOrderId={selectedOrderId}
                  tables={tables}
                  onOrderSelect={setSelectedOrderId}
                  onOrderClose={handleCloseTab}
                  onNewOrder={() => handleTableChange(0)}
                  onTableChange={handleTableChange}
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
      ) : (
        /* Desktop Layout - 3 columnas optimizadas */
        <div className="flex-1 flex min-h-0 w-full overflow-hidden">
          {/* Categorías - Ancho mínimo flexible */}
          <div className="w-48 min-w-[12rem] max-w-[16rem] flex-shrink-0 border-r border-border overflow-hidden">
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>

          {/* Productos - Toma espacio disponible con scroll independiente */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-sidebar-border overflow-hidden">
            <div className="h-12 px-3 border-b border-sidebar-border bg-sidebar/40 flex items-center gap-2 flex-shrink-0">
              <Package className="w-4 h-4 text-sidebar-foreground" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-sidebar-foreground truncate">
                  {selectedCategory === 'Fijados' ? 'Productos Favoritos' : selectedCategory}
                </h3>
                {selectedOrderId ? (
                  <p className="text-xs text-sidebar-foreground/70 truncate">
                    Agregando a{' '}
                    {selectedOrder?.tableNumber === 0
                      ? 'Barra'
                      : `Mesa ${selectedOrder?.tableNumber}`}
                  </p>
                ) : (
                  <p className="text-xs text-sidebar-foreground/50 truncate">
                    Selecciona una mesa para comenzar
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ProductGrid
                products={filteredProducts}
                handleAddToOrder={(product) => {
                  if (selectedOrderId) {
                    handleAddToOrder(selectedOrderId, product);
                  }
                }}
                selectedOrderId={selectedOrderId}
              />
            </div>
          </div>

          {/* Resumen del Pedido - Ancho fijo óptimo con overflow independiente */}
          <div className="w-80 min-w-[20rem] max-w-[24rem] flex-shrink-0 overflow-hidden">
            <OrderPanel
              activeOrders={activeOrders}
              selectedOrder={selectedOrder}
              selectedOrderId={selectedOrderId}
              tables={tables}
              onOrderSelect={setSelectedOrderId}
              onOrderClose={handleCloseTab}
              onNewOrder={() => handleTableChange(0)}
              onTableChange={handleTableChange}
              onPaymentStart={() => setIsPaymentModalOpen(true)}
              onRemoveFromOrder={handleRemoveFromOrder}
              onAddToOrder={handleAddToOrder}
            />
          </div>
        </div>
      )}

      {/* Modales */}
      {selectedOrder && (
        <PaymentModal
          isPaymentModalOpen={isPaymentModalOpen}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          cashAmount={cashAmount}
          setCashAmount={setCashAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          newOrder={selectedOrder}
          handleCompleteOrder={handleCompleteOrder}
          showTicketDialog={showTicketDialog}
          setShowTicketDialog={setShowTicketDialog}
          handleTicketPrintingComplete={handleTicketPrintingComplete}
        />
      )}

      <Dialog open={isConfirmCloseModalOpen} onOpenChange={setIsConfirmCloseModalOpen}>
        <DialogContent className={cn(
          'flex flex-col justify-center',
          isMobile ? 'w-[95vw] max-w-[95vw] p-6' : 'w-[80vw] max-w-[600px] p-8'
        )}>
          <DialogHeader>
            <DialogTitle className={cn(
              'font-semibold text-center',
              isMobile ? 'text-2xl' : 'text-4xl'
            )}>
              ¿Estás seguro de eliminar esta comanda?
            </DialogTitle>
            <DialogDescription className={cn(
              'text-center mt-4',
              isMobile ? 'text-base' : 'text-xl'
            )}>
              Esta acción eliminará la comanda en progreso para la{' '}
              {orderToClose?.tableNumber === 0 ? 'Barra' : `Mesa ${orderToClose?.tableNumber}`}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={cn(
            'gap-4 mt-6',
            isMobile ? 'flex-col' : 'flex-row'
          )}>
            <Button
              variant="outline"
              onClick={() => setIsConfirmCloseModalOpen(false)}
              className={cn(
                'flex-1 touch-manipulation',
                isMobile ? 'h-16 text-xl' : 'h-20 text-2xl'
              )}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (orderToClose) {
                  closeOrder(orderToClose.id);
                }
                setIsConfirmCloseModalOpen(false);
              }}
              className={cn(
                'flex-1 touch-manipulation',
                isMobile ? 'h-16 text-xl' : 'h-20 text-2xl'
              )}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

NewOrder.displayName = 'NewOrder';

export default NewOrder;
