import {useState, useCallback, useEffect, useMemo, memo} from 'react'
import {Button} from "@/components/ui/button"
import Product from "@/models/Product"
import PaymentModal from "@/components/PaymentModal"
import Order, {OrderItem} from "@/models/Order"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import {connectToThermalPrinter} from "@/assets/utils/utils"
import {toast} from "@/components/ui/use-toast"
import { useNewOrderData } from "@/store/selectors"
import {ThermalPrinterServiceOptions} from "@/models/ThermalPrinter.ts"
import ProductGrid from "@/components/Product.tsx"
import ProductService from "@/services/products.service.ts"
import CategorySidebar from "@/components/CategorySidebar.tsx"
import OrderPanel from "@/components/OrderPanel.tsx"
import { Package } from "lucide-react"
import { useResponsive } from "@/hooks/useResponsive"
import { cn } from "@/lib/utils"

type NewOrderProps = {}

const NewOrder = memo(({}: NewOrderProps) => {
    const {
        activeOrders,
        recentProducts,
        setProducts,
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
        closeOrder, // Added
        setPaymentMethod,
        setCashAmount,
        setShowTicketDialog,
        categories,
        orderHistory,
        setActiveOrders,
        selectedOrder,
        setSelectedOrder
    } = useNewOrderData()

    const { isMobile } = useResponsive()
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = useState(false)
    const [orderToClose, setOrderToClose] = useState<Order | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string | null>("Fijados")
    const [showOrderPanel, setShowOrderPanel] = useState(false)

    useEffect(() => {
        const updatedTables = tables.map(table => {
            const activeOrder = activeOrders.find(order => order.tableNumber === table.id && order.status === 'inProgress')
            return {
                ...table,
                available: !activeOrder,
                order: activeOrder || null
            }
        })

        if (JSON.stringify(updatedTables) !== JSON.stringify(tables)) {
            setTables(updatedTables)
        }
    }, [activeOrders]) // Remove 'tables' from the dependency array

    useEffect(() => {
        if (activeOrders.length > 0 && !selectedOrderId) {
            setSelectedOrderId(activeOrders[0].id)
        } else if (activeOrders.length === 0) {
            const inProgressOrders = orderHistory.filter(order => order.status === 'inProgress')
            if (inProgressOrders.length > 0) {
                setActiveOrders(inProgressOrders)
            }
        }
    }, [activeOrders.length, selectedOrderId, orderHistory])

    useEffect(() => {
        if (selectedOrderId) {
            const order = activeOrders.find(o => o.id === selectedOrderId)
            setSelectedOrder(order || null)
        } else {
            setSelectedOrder(null)
        }
    }, [selectedOrderId, activeOrders])

    useEffect(() => {
        if (selectedUser && products.length === 0) {
            const productsService = new ProductService()
            productsService.getProducts().then(fetchedProducts => {
                setProducts(fetchedProducts)
            })
        }
    }, [selectedUser, products.length])

    useEffect(() => {
        if (selectedUser && products.length > 0) {
            const pinnedProductIds = selectedUser.pinnedProductIds || []
            const productsService = new ProductService()
            const pinnedProducts = productsService.getProductsByIdArray(pinnedProductIds, products)
            setRecentProducts(pinnedProducts)
        }
    }, [selectedUser, products])





    const handleAddToOrder = useCallback((orderId: number, product: OrderItem | Product) => {
        addToOrder(orderId, product)
    }, [addToOrder])

    const handleRemoveFromOrder = useCallback((orderId: number, productId: number) => {
        removeFromOrder(orderId, productId)
    }, [removeFromOrder])

    const handleTicketPrintingComplete = async (shouldPrintTicket: boolean) => {
        if (shouldPrintTicket) {
            try {
                const printer = await connectToThermalPrinter(thermalPrinterOptions as ThermalPrinterServiceOptions);
                if (printer && selectedOrder) {
                    await printer.printOrder(selectedOrder);
                    await printer.disconnect();
                    toast({
                        title: "Ticket impreso",
                        description: "Ticket impreso con éxito.",
                        duration: 3000,
                    });
                } else {
                    console.error("Error al conectar la impresora.");
                    toast({
                        title: "Error al imprimir ticket",
                        description: "No se pudo imprimir el ticket. Por favor, inténtelo de nuevo.",
                        duration: 3000,
                    });
                }
            } catch (error) {
                console.error("Error al imprimir ticket:", error);
                toast({
                    title: "Error al imprimir ticket",
                    description: "No se pudo imprimir el ticket. Por favor, inténtelo de nuevo.",
                    duration: 3000,
                });
            }
        }
        setShowTicketDialog(false)
        setIsPaymentModalOpen(false)
        setSelectedOrderId(null)
    }

    const handleCloseTab = (orderId: number) => {
        const orderToClose = activeOrders.find(order => order.id === orderId)
        if (orderToClose && orderToClose.items.length > 0) {
            setOrderToClose(orderToClose)
            setIsConfirmCloseModalOpen(true)
        } else {
            closeOrder(orderId)
        }
    }


    // Función memoizada para filtrar productos por categoría
    const filteredProducts = useMemo(() => {
        if (!selectedCategory) return []
        
        if (selectedCategory === "Fijados") {
            return recentProducts
        }
        
        return products.filter(product => product.category === selectedCategory)
    }, [selectedCategory, products, recentProducts])

    return (
        <div className="h-full max-h-full flex flex-col bg-background overflow-hidden overscroll-none">
            {/* TopBar con selector de mesas y comandas - optimizado para mobile */}
            <div className={cn(
                "border-b border-border bg-card flex-shrink-0",
                isMobile ? "px-2 py-1" : "px-3 py-1.5"
            )}>
                <div className="relative min-h-[2.5rem] flex items-center">
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory w-full pb-1 -mb-1">
                        {/* Barra (si está libre) */}
                        {!activeOrders.find(order => order.tableNumber === 0) && (
                            <button
                                onClick={() => handleTableChange(0)}
                                className={cn(
                                    "table-button bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border rounded-lg flex items-center font-medium transition-all duration-150 hover:bg-sidebar-accent/90 active:scale-[0.98] flex-shrink-0 snap-start",
                                    isMobile ? "px-2 py-1.5 text-xs" : ""
                                )}
                                style={{
                                    padding: isMobile ? 'calc(var(--spacing) * 1) calc(var(--spacing) * 2)' : 'calc(var(--spacing) * 1.5) calc(var(--spacing) * 3)',
                                    gap: 'calc(var(--spacing) * 1.5)',
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <span className="w-2 h-2 bg-sidebar-accent-foreground rounded-full animate-pulse"></span>
                                Barra
                            </button>
                        )}
                        
                        {/* Mesas libres */}
                        {tables.filter(table => 
                            table.id !== 0 && 
                            table.available && 
                            !activeOrders.find(order => order.tableNumber === table.id)
                        ).map((table) => (
                            <button
                                key={`available-${table.id}`}
                                onClick={() => handleTableChange(table.id)}
                                className={cn(
                                    "table-button bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border rounded-lg flex items-center font-medium transition-all duration-150 hover:bg-sidebar-accent/90 active:scale-[0.98] flex-shrink-0 snap-start",
                                    isMobile ? "px-2 py-1.5 text-xs" : ""
                                )}
                                style={{
                                    padding: isMobile ? 'calc(var(--spacing) * 1) calc(var(--spacing) * 2)' : 'calc(var(--spacing) * 1.5) calc(var(--spacing) * 3)',
                                    gap: 'calc(var(--spacing) * 1.5)',
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <span className="w-2 h-2 bg-sidebar-accent-foreground rounded-full animate-pulse"></span>
                                {table.name}
                            </button>
                        ))}

                        {/* Comandas Activas (mezcladas en la misma fila) */}
                        {activeOrders.map(order => (
                            <button
                                key={`order-${order.id}`}
                                onClick={() => setSelectedOrderId(order.id)}
                                className={cn(
                                    "table-button border rounded-lg flex items-center font-medium transition-all duration-150 active:scale-[0.98] flex-shrink-0 snap-start",
                                    selectedOrderId === order.id
                                        ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary"
                                        : "bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted/80",
                                    isMobile ? "px-2 py-1.5 text-xs" : ""
                                )}
                                style={{
                                    padding: isMobile ? 'calc(var(--spacing) * 1) calc(var(--spacing) * 2)' : 'calc(var(--spacing) * 1.5) calc(var(--spacing) * 3)',
                                    gap: 'calc(var(--spacing) * 1.5)',
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    boxShadow: selectedOrderId === order.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                                }}
                            >
                                <span className={`w-2 h-2 rounded-full ${
                                    selectedOrderId === order.id 
                                        ? 'bg-sidebar-primary-foreground animate-pulse' 
                                        : 'bg-muted-foreground'
                                }`}></span>
                                <span className="whitespace-nowrap">
                                    {order.tableNumber === 0 ? 'Barra' : `Mesa ${order.tableNumber}`}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleCloseTab(order.id)
                                    }}
                                    className={cn(
                                        "text-current opacity-70 hover:opacity-100 flex items-center justify-center rounded-full hover:bg-destructive/20 transition-all duration-150",
                                        isMobile ? "ml-0.5 text-sm w-4 h-4" : "ml-1 text-sm w-4 h-4"
                                    )}
                                    title="Cerrar comanda"
                                >
                                    ×
                                </button>
                            </button>
                        ))}
                    </div>
                    
                    {/* Fade indicator único al final (si hay muchos elementos) */}
                    {(tables.filter(table => 
                        table.available && 
                        !activeOrders.find(order => order.tableNumber === table.id)
                    ).length + activeOrders.length) > 6 && (
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
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.name)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                                        selectedCategory === category.name
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    )}
                                >
                                    {category.name}
                                </button>
                            ))}
                            <button
                                onClick={() => setSelectedCategory("Fijados")}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                                    selectedCategory === "Fijados"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                                    {selectedCategory === "Fijados" ? "Productos Favoritos" : selectedCategory}
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
                                handleAddToOrder={(product) => selectedOrderId && handleAddToOrder(selectedOrderId, product)}
                                selectedOrderId={selectedOrderId}
                            />
                        </div>
                    </div>

                    {/* Mobile Order Panel Modal */}
                    <Dialog open={showOrderPanel} onOpenChange={setShowOrderPanel}>
                        <DialogContent className="max-w-[95vw] max-h-[85vh] p-0">
                            <div className="h-[80vh] flex flex-col">
                                <DialogHeader className="px-4 py-3 border-b">
                                    <DialogTitle>
                                        Pedido - {selectedOrder?.tableNumber === 0 ? 'Barra' : `Mesa ${selectedOrder?.tableNumber}`}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 overflow-hidden">
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
                                            setShowOrderPanel(false)
                                            setIsPaymentModalOpen(true)
                                        }}
                                        onRemoveFromOrder={handleRemoveFromOrder}
                                        onAddToOrder={handleAddToOrder}
                                        disableAnimations={true}
                                    />
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            ) : (
                /* Desktop Layout - 3 columnas optimizadas */
                <div className="flex-1 flex min-h-0 max-w-full overflow-hidden">
                    {/* Categorías - Ancho mínimo flexible */}
                    <div className="w-48 min-w-[12rem] max-w-[16rem] h-full border-r border-border flex-shrink-0">
                        <CategorySidebar 
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onCategorySelect={setSelectedCategory}
                        />
                    </div>

                    {/* Productos - Toma espacio disponible */}
                    <div className="flex-1 min-w-0 flex flex-col border-r border-sidebar-border">
                        <div className="h-12 px-3 border-b border-sidebar-border bg-sidebar/40 flex items-center gap-2 flex-shrink-0">
                            <Package className="w-4 h-4 text-sidebar-foreground" />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-sidebar-foreground truncate">
                                    {selectedCategory === "Fijados" ? "Productos Favoritos" : selectedCategory}
                                </h3>
                                {selectedOrderId && (
                                    <p className="text-xs text-sidebar-foreground/70 truncate">
                                        Agregando a {selectedOrder?.tableNumber === 0 ? 'Barra' : `Mesa ${selectedOrder?.tableNumber}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ProductGrid
                                products={filteredProducts}
                                handleAddToOrder={(product) => selectedOrderId && handleAddToOrder(selectedOrderId, product)}
                                selectedOrderId={selectedOrderId}
                            />
                        </div>
                    </div>

                    {/* Resumen del Pedido - Ancho fijo óptimo */}
                    <div className="w-80 min-w-[20rem] max-w-[24rem] flex-shrink-0 h-full">
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
                <DialogContent className="bg-background dark:bg-background rounded-lg shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-foreground dark:text-foreground">
                            ¿Estás seguro de eliminar esta comanda?
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
                            Esta acción eliminará la comanda en progreso para
                            la {orderToClose?.tableNumber === 0 ? 'Barra' : `Mesa ${orderToClose?.tableNumber}`}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsConfirmCloseModalOpen(false)}
                            className="text-foreground dark:text-foreground hover:bg-secondary dark:hover:bg-secondary"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (orderToClose) {
                                    closeOrder(orderToClose.id)
                                }
                                setIsConfirmCloseModalOpen(false)
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}