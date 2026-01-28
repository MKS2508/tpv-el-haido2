'use client';

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
} from 'lucide-react';
import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useOrderHistoryData } from '@/store/selectors';

interface OrderHistoryProps {
  setActiveSection: (section: string) => void;
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  setSelectedOrderId: (orderId: number | null) => void;
}

const OrderHistory = memo(
  ({
    setActiveSection,
    selectedOrder,
    setSelectedOrder,
    setSelectedOrderId,
  }: OrderHistoryProps) => {
    const { isMobile } = useResponsive();
    const [sortConfig, setSortConfig] = useState<{
      key: 'date' | 'total' | 'status' | 'id';
      direction: 'asc' | 'desc';
    }>({
      key: 'date',
      direction: 'desc',
    });
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [cashAmount, setCashAmount] = useState('');
    const [showTicketDialog, setShowTicketDialog] = useState(false);
    const { orderHistory, setOrderHistory, activeOrders } = useOrderHistoryData();
    const tableRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // AEAT hooks
    const { isEnabled: isAEATEnabled, isConnected: isAEATConnected } = useAEAT();
    const { emitInvoice, isEmitting } = useEmitInvoice();

    // Handler para emitir factura
    const handleEmitInvoice = useCallback(async () => {
      if (!selectedOrder) return;

      const result = await emitInvoice(selectedOrder);
      if (result.success) {
        // Actualizar el pedido seleccionado con la info de AEAT
        setSelectedOrder(result.order);
      }
    }, [selectedOrder, emitInvoice, setSelectedOrder]);

    // Determinar si el botón de factura debe estar deshabilitado
    const isInvoiceButtonDisabled = useMemo(() => {
      if (!selectedOrder) return true;
      if (isEmitting) return true;
      if (!isAEATConnected) return true;
      if (selectedOrder.aeat?.invoiceStatus === 'accepted') return true;
      if (selectedOrder.aeat?.invoiceStatus === 'pending') return true;
      return false;
    }, [selectedOrder, isEmitting, isAEATConnected]);

    // Obtener tooltip para el botón de factura
    const getInvoiceButtonTooltip = useCallback(() => {
      if (!selectedOrder) return '';
      if (isEmitting) return 'Emitiendo factura...';
      if (!isAEATConnected) return 'Sin conexión con AEAT';
      if (selectedOrder.aeat?.invoiceStatus === 'accepted') return 'Factura ya aceptada';
      if (selectedOrder.aeat?.invoiceStatus === 'pending') return 'Factura pendiente de respuesta';
      return 'Emitir factura a AEAT';
    }, [selectedOrder, isEmitting, isAEATConnected]);

    const handleCompleteOrder = useCallback(
      (completedOrder: Order) => {
        setOrderHistory(
          orderHistory.map((order) => (order.id === completedOrder.id ? completedOrder : order))
        );
        toast({
          title: 'Payment Confirmed',
          description: `Payment confirmed for order: ${completedOrder.id}`,
        });

        setShowTicketDialog(true);
      },
      [setOrderHistory, orderHistory]
    );

    const handlePrintTicket = useCallback(() => {
      console.log('Printing ticket for order:', selectedOrder?.id);
      setShowTicketDialog(true);
    }, [selectedOrder?.id]);

    const handleTicketPrintingComplete = useCallback(
      (shouldPrintTicket: boolean) => {
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
      },
      [handlePrintTicket]
    );

    const sortedAndFilteredOrders = useMemo(() => {
      let filteredOrders = [...orderHistory, ...activeOrders];
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
      console.log({ orderHistory, activeOrders, filteredOrders, uniqueOrders });
      if (filterStatus !== 'all') {
        filteredOrders = filteredOrders
          .filter((order) => order.status === filterStatus)
          .filter((order) => order.itemCount > 0);
      } else {
        filteredOrders = uniqueOrders;
      }
      return filteredOrders
        .filter((order) => order.itemCount > 0)
        .sort((a, b) => {
          if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
          if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
    }, [orderHistory, sortConfig, filterStatus, activeOrders]);

    const handleSort = (key: 'date' | 'total' | 'status' | 'id') => {
      setSortConfig((current) => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
      }));
    };

    const handleDetails = (order: Order) => {
      setSelectedOrder(order);
      setIsDialogOpen(true);
    };

    const handleConfirmPayment = () => {
      if (selectedOrder) {
        setIsPaymentModalOpen(true);
      }
    };

    const handleContinueOrder = () => {
      if (selectedOrder) {
        toast({
          title: 'Resumiendo comanda',
          description: `Continuando pedido de la ${selectedOrder.tableNumber === 0 ? 'Barra' : `mesa ${selectedOrder.tableNumber.toString()}`}`,
        });

        setSelectedOrderId(selectedOrder.id);
        setActiveSection('newOrder');
        setIsDialogOpen(false);
      }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      setIsDragging(true);
      setStartY(e.touches[0].clientY - scrollTop);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) return;
      const y = e.touches[0].clientY;
      const scroll = y - startY;
      if (tableRef.current) {
        tableRef.current.scrollTop = -scroll;
        setScrollTop(-scroll);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        if (tableRef.current) {
          e.preventDefault();
          tableRef.current.scrollTop += e.deltaY;
          setScrollTop(tableRef.current.scrollTop);
        }
      };

      const currentRef = tableRef.current;
      if (currentRef && !isMobile) {
        // Only add wheel listener on non-mobile
        currentRef.addEventListener('wheel', handleWheel, { passive: false });
      }

      return () => {
        if (currentRef) {
          currentRef.removeEventListener('wheel', handleWheel);
        }
      };
    }, [isMobile]);

    // Mobile-friendly OrderCard component
    const OrderCard = ({ order }: { order: Order }) => {
      const getStatusIcon = () => {
        switch (order.status) {
          case 'paid':
            if (order.paymentMethod === 'efectivo') {
              return (
                <div className="flex items-center gap-1">
                  <HandCoins className="w-4 h-4 text-warning" />
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1">
                <CreditCard className="w-4 h-4 text-info" />
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
            );
          case 'unpaid':
            return <XCircle className="w-4 h-4 text-destructive" />;
          case 'canceled':
            return <XCircle className="w-4 h-4 text-muted-foreground" />;
          case 'inProgress':
            return <Loader2 className="w-4 h-4 animate-spin text-info" />;
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

      return (
        <Card
          className="touch-manipulation cursor-pointer hover:shadow-md transition-shadow duration-200"
          onClick={() => handleDetails(order)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Pedido #{order.id}</CardTitle>
              <div className="flex items-center gap-2">{getStatusIcon()}</div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{new Date(order.date).toLocaleDateString()}</span>
              <span className="font-medium text-primary">
                {order.tableNumber === 0 ? 'Barra' : `Mesa ${order.tableNumber}`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="font-bold text-lg text-success">{order.total.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Artículos:</span>
                <span className="text-sm font-medium">{order.itemCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado:</span>
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    };

    return (
      <div className="space-y-4 text-foreground w-full overflow-y-hidden">
        <div className="flex items-center justify-between">
          <h2 className={cn('font-semibold', isMobile ? 'text-xl' : 'text-2xl')}>
            Historial de Cuentas
          </h2>

          {/* Sort button for mobile */}
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort(sortConfig.key === 'date' ? 'total' : 'date')}
              className="touch-manipulation"
            >
              <ArrowUpDown className="w-4 h-4 mr-1" />
              {sortConfig.key === 'date' ? 'Por fecha' : 'Por total'}
            </Button>
          )}
        </div>

        <div className={cn('flex items-center', isMobile ? 'flex-col gap-3' : 'justify-between')}>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger
              className={cn(
                'bg-background border-border touch-manipulation',
                isMobile ? 'w-full h-12' : 'w-[180px]'
              )}
            >
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">
                <span className="flex items-center gap-2">
                  <Banknote className="text-success" /> <span>Pagado</span>
                </span>
              </SelectItem>
              <SelectItem value="unpaid">
                <span className="flex items-center gap-2">
                  <HandCoins className="text-destructive" /> <span>No pagado</span>
                </span>
              </SelectItem>
              <SelectItem value="canceled">
                <span className="flex items-center gap-2">
                  <XCircle className="text-muted-foreground" /> <span>Cancelado</span>
                </span>
              </SelectItem>
              <SelectItem value="inProgress">
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin text-info" /> <span>En progreso</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Card View */}
        {isMobile ? (
          <div className="space-y-3 h-[calc(100vh-240px)] overflow-y-auto">
            {sortedAndFilteredOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No hay pedidos que mostrar
              </div>
            ) : (
              sortedAndFilteredOrders.map((order: Order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div
            ref={tableRef}
            className="h-[calc(90vh-200px)] overflow-y-auto touch-manipulation"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Table className="border-collapse border border-border">
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead
                    className="cursor-pointer border border-border touch-manipulation"
                    onClick={() => handleSort('date')}
                  >
                    Fecha{' '}
                    {sortConfig.key === 'date' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                  </TableHead>
                  <TableHead className="border border-border">Total</TableHead>
                  <TableHead className="border border-border">Elementos</TableHead>
                  <TableHead className="border border-border">Mesa</TableHead>
                  <TableHead
                    className="cursor-pointer border border-border touch-manipulation"
                    onClick={() => handleSort('status')}
                  >
                    Estado{' '}
                    {sortConfig.key === 'status' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                  </TableHead>
                  <TableHead className="border border-border">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredOrders.map((order: Order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50 touch-manipulation">
                    <TableCell className="border border-border">{order.date}</TableCell>
                    <TableCell className="border border-border">
                      {order.total.toFixed(2)}€
                    </TableCell>
                    <TableCell className="border border-border">{order.itemCount}</TableCell>
                    <TableCell className="border border-border">
                      {order.tableNumber === 0 ? 'Barra' : order.tableNumber}
                    </TableCell>
                    <TableCell className="border border-border">
                      {order.status === 'paid' && order.paymentMethod === 'efectivo' && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            <HandCoins className="text-warning" />
                            <CheckCircle className="text-success" />
                          </div>
                          <div className="w-full border-t border-border my-1"></div>
                          <span>Pagado con Efectivo</span>
                        </div>
                      )}
                      {order.status === 'paid' && order.paymentMethod === 'tarjeta' && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            <CreditCard className="text-info" />
                            <CheckCircle className="text-success" />
                          </div>
                          <div className="w-full border-t border-border my-1"></div>
                          <span>Pagado con Tarjeta</span>
                        </div>
                      )}
                      {order.status === 'unpaid' && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            <XCircle className="text-destructive" />
                          </div>
                          <div className="w-full border-t border-border my-1"></div>
                          <span>No pagado</span>
                        </div>
                      )}
                      {order.status === 'canceled' && (
                        <div className="flex flex-col items-center">
                          <XCircle className="text-muted-foreground" />
                          <div className="w-full border-t border-border my-1"></div>
                          <span>Cancelado</span>
                        </div>
                      )}
                      {order.status === 'inProgress' && (
                        <div className="flex flex-col items-center">
                          <Loader2 className="animate-spin text-info" />
                          <div className="w-full border-t border-border my-1"></div>
                          <span>En progreso</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="border border-border justify-center ml-auto mr-auto">
                      <Button
                        variant="outline"
                        onClick={() => handleDetails(order)}
                        className="bg-background text-foreground border-border hover:bg-muted w-full h-full p-4 touch-manipulation"
                      >
                        Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent
            className={cn(
              'flex flex-col bg-background text-foreground overflow-y-hidden',
              isMobile ? 'max-w-[95vw] max-h-[90vh] p-3' : 'sm:max-w-[1200px]'
            )}
          >
            <DialogHeader>
              <DialogTitle>Detalles de la Orden</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div
                className={cn('flex flex-1 overflow-hidden', isMobile ? 'flex-col gap-3' : 'gap-4')}
              >
                <div className={cn('overflow-y-auto', isMobile ? 'flex-1' : 'flex-1')}>
                  <ScrollArea
                    className={cn(
                      'pr-4',
                      isMobile ? 'h-[calc(70vh-120px)]' : 'h-[calc(80vh-120px)]'
                    )}
                  >
                    <div className="space-y-4">
                      <div className={cn(isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-4')}>
                        <div>
                          <Label className="text-sm">Fecha</Label>
                          <Input
                            value={selectedOrder.date}
                            readOnly
                            className={cn('bg-muted', isMobile ? 'h-10 text-sm' : '')}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Total</Label>
                          <Input
                            value={`${selectedOrder.total.toFixed(2)}€`}
                            readOnly
                            className={cn(
                              'bg-muted font-semibold text-success',
                              isMobile ? 'h-10 text-sm' : ''
                            )}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Estado</Label>
                          <Input
                            value={selectedOrder.status}
                            readOnly
                            className={cn('bg-muted', isMobile ? 'h-10 text-sm' : '')}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Mesa</Label>
                          <Input
                            value={
                              selectedOrder.tableNumber === 0
                                ? 'Barra'
                                : selectedOrder.tableNumber.toString()
                            }
                            readOnly
                            className={cn('bg-muted', isMobile ? 'h-10 text-sm' : '')}
                          />
                        </div>
                        {!isMobile && (
                          <div>
                            <Label className="text-sm">Método de Pago</Label>
                            <Input
                              value={selectedOrder.paymentMethod}
                              readOnly
                              className="bg-muted"
                            />
                          </div>
                        )}
                        {/* Estado de facturación AEAT */}
                        {isAEATEnabled && selectedOrder.status === 'paid' && (
                          <div className={cn(isMobile ? 'col-span-2' : '')}>
                            <Label className="text-sm">Factura AEAT</Label>
                            <div className="mt-1.5">
                              <InvoiceStatusBadge aeat={selectedOrder.aeat} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">Elementos</Label>
                        {isMobile ? (
                          /* Mobile: Card layout for items */
                          <div className="space-y-2 mt-2">
                            {selectedOrder.items.map((item, index) => (
                              <Card key={index} className="bg-muted/50">
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.quantity}x {item.price.toFixed(2)}€
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-success">
                                        {(item.price * item.quantity).toFixed(2)}€
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          /* Desktop: Table layout */
                          <Table className="border-collapse border border-border mt-2">
                            <TableHeader>
                              <TableRow className="bg-muted">
                                <TableHead className="border border-border">Producto</TableHead>
                                <TableHead className="border border-border">Cantidad</TableHead>
                                <TableHead className="border border-border">Precio</TableHead>
                                <TableHead className="border border-border">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedOrder.items.map((item, index) => (
                                <TableRow
                                  key={index}
                                  className="hover:bg-muted/50 touch-manipulation"
                                >
                                  <TableCell className="border border-border">
                                    {item.name}
                                  </TableCell>
                                  <TableCell className="border border-border">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="border border-border">
                                    {item.price.toFixed(2)}€
                                  </TableCell>
                                  <TableCell className="border border-border">
                                    {(item.price * item.quantity).toFixed(2)}€
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {!isMobile && (
                  <div className="w-1/3 border-l border-border pl-4">
                    <Label>Vista previa del ticket</Label>
                    <div className="mt-2 bg-muted p-4 h-[calc(80vh-180px)] overflow-y-auto border border-border rounded">
                      <pre className="text-xs whitespace-pre-wrap text-foreground">
                        {renderTicketPreview(selectedOrder)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className={cn('gap-2', isMobile ? 'flex-col sm:flex-row' : '')}>
              <Button
                variant="outline"
                onClick={handlePrintTicket}
                className={cn(
                  'bg-background text-foreground border-border hover:bg-muted touch-manipulation',
                  isMobile ? 'w-full h-12' : 'w-1/3 h-20'
                )}
              >
                <FileText className={cn('mr-2', isMobile ? 'h-4 w-4' : 'h-4 w-4')} />
                Imprimir Ticket
              </Button>
              {/* Botón Emitir Factura - solo para pedidos pagados con AEAT habilitado */}
              {selectedOrder?.status === 'paid' && isAEATEnabled && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(isMobile ? 'w-full' : '')}>
                        <Button
                          variant="outline"
                          onClick={handleEmitInvoice}
                          disabled={isInvoiceButtonDisabled}
                          className={cn(
                            'bg-background text-foreground border-border hover:bg-muted touch-manipulation',
                            isMobile ? 'w-full h-12' : 'w-full h-20',
                            selectedOrder.aeat?.invoiceStatus === 'accepted' &&
                              'border-green-500 text-green-600 dark:text-green-400'
                          )}
                        >
                          {isEmitting ? (
                            <Loader2 className={cn('mr-2 h-4 w-4 animate-spin')} />
                          ) : (
                            <Receipt className={cn('mr-2', isMobile ? 'h-4 w-4' : 'h-4 w-4')} />
                          )}
                          {isEmitting
                            ? 'Emitiendo...'
                            : selectedOrder.aeat?.invoiceStatus === 'accepted'
                              ? 'Factura Emitida'
                              : 'Emitir Factura'}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getInvoiceButtonTooltip()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {selectedOrder?.status === 'unpaid' && (
                <Button
                  onClick={handleConfirmPayment}
                  className={cn(
                    'bg-info hover:bg-info/80 text-info-foreground touch-manipulation',
                    isMobile ? 'w-full h-12' : ''
                  )}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Confirmar Pago
                </Button>
              )}
              {selectedOrder?.status === 'inProgress' && (
                <Button
                  onClick={handleContinueOrder}
                  className={cn(
                    'bg-success hover:bg-success/80 text-success-foreground touch-manipulation',
                    isMobile ? 'w-full h-12' : ''
                  )}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isMobile
                    ? `Continuar Mesa ${selectedOrder.tableNumber}`
                    : `Continuar cuenta de la mesa ${selectedOrder.tableNumber}`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
      </div>
    );
  }
);

OrderHistory.displayName = 'OrderHistory';

export default OrderHistory;
