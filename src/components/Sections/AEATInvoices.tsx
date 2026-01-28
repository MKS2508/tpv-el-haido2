/**
 * AEATInvoices Section
 *
 * Panel para gestionar facturas emitidas a AEAT VERI*FACTU
 */

'use client';;
import { createMemo, createSignal } from 'solid-js';

import {
  ArrowUpDown,
  CalendarIcon,
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-solid';
import { memo, useCallback, useMemo, createSignal } from 'react';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAEAT } from '@/hooks/useAEAT';
import { useEmitInvoice } from '@/hooks/useEmitInvoice';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order';
import { useOrderHistoryData } from '@/store/selectors';

// ==================== Types ====================

type InvoiceFilter = 'all' | 'accepted' | 'rejected' | 'pending' | 'not_invoiced';

interface InvoiceWithOrder {
  order: Order;
  invoiceNumber: string | null;
  csv: string | null;
  status: string;
  sentAt: string | null;
}

// ==================== Component ====================

const AEATInvoices = memo(() => {
  const { isMobile } = useResponsive();
  const { orderHistory } = useOrderHistoryData();
  const { isEnabled, isConnected } = useAEAT();
  const { emitInvoice, isEmitting } = useEmitInvoice();

  // State
  const [filterStatus, setFilterStatus] = createSignal<InvoiceFilter>('all');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [sortConfig, setSortConfig] = createSignal<{
    key: 'date' | 'total';
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });
  const [selectedInvoice, setSelectedInvoice] = createSignal<InvoiceWithOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = createSignal(false);

  // Filtrar solo pedidos pagados (facturables)
  const invoiceableOrders = useMemo(() => {
    return orderHistory.filter((order) => order.status === 'paid');
  }, [orderHistory]);

  // Convertir pedidos a lista de facturas
  const invoices: InvoiceWithOrder[] = useMemo(() => {
    return invoiceableOrders.map((order) => ({
      order,
      invoiceNumber: order.aeat?.numSerieFactura || null,
      csv: order.aeat?.csv || null,
      status: order.aeat?.invoiceStatus || 'not_invoiced',
      sentAt: order.aeat?.invoiceSentAt || null,
    }));
  }, [invoiceableOrders]);

  // Filtrar y ordenar facturas
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Filtrar por estado
    if (filterStatus() !== 'all') {
      result = result.filter((inv) => {
        if (filterStatus() === 'not_invoiced') {
          return !inv.order.aeat?.invoiceSent;
        }
        return inv.status === filterStatus();
      });
    }

    // Filtrar por búsqueda
    if (searchQuery().trim()) {
      const query = searchQuery().toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(query) ||
          inv.csv?.toLowerCase().includes(query) ||
          inv.order.id.toString().includes(query)
      );
    }

    // Ordenar
    result.sort((a, b) => {
      let comparison = 0;
      if (sortConfig().key === 'date') {
        comparison = new Date(a.order.date).getTime() - new Date(b.order.date).getTime();
      } else if (sortConfig().key === 'total') {
        comparison = a.order.total - b.order.total;
      }
      return sortConfig().direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [invoices, filterStatus(), searchQuery(), sortConfig()]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = invoices.length;
    const accepted = invoices.filter((i) => i.status === 'accepted').length;
    const rejected = invoices.filter((i) => i.status === 'rejected' || i.status === 'error').length;
    const pending = invoices.filter((i) => i.status === 'pending' || i.status === 'sent').length;
    const notInvoiced = invoices.filter((i) => !i.order.aeat?.invoiceSent).length;
    return { total, accepted, rejected, pending, notInvoiced };
  }, [invoices]);

  // Handlers
  const handleSort = useCallback((key: 'date' | 'total') => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleViewDetails = useCallback((invoice: InvoiceWithOrder) => {
    setSelectedInvoice(invoice);
    setIsDetailsOpen(true);
  }, []);

  const handleRetryInvoice = useCallback(
    async (order: Order) => {
      await emitInvoice(order);
      setIsDetailsOpen(false);
    },
    [emitInvoice]
  );

  // Formatear fecha
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Si AEAT no está habilitado
  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Facturación AEAT no habilitada</h2>
        <p className="text-muted-foreground mb-4">
          Para gestionar facturas AEAT, primero debe habilitar la integración en Ajustes.
        </p>
        <Button variant="outline" disabled>
          Ir a Ajustes
        </Button>
      </div>
    );
  }

  // Invoice Card para móvil
  const InvoiceCard = ({ invoice }: { invoice: InvoiceWithOrder }) => (
    <Card
      className="touch-manipulation cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={() => handleViewDetails(invoice)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {invoice.invoiceNumber || `Pedido #${invoice.order.id}`}
          </CardTitle>
          <InvoiceStatusBadge aeat={invoice.order.aeat} compact />
        </div>
        <CardDescription>{formatDate(invoice.sentAt || invoice.order.date)}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="font-bold text-success">{invoice.order.total.toFixed(2)}€</span>
        </div>
        {invoice.csv && (
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">CSV:</span>
            <span className="text-xs font-mono">{invoice.csv}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 text-foreground w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className={cn('font-semibold', isMobile ? 'text-xl' : 'text-2xl')}>Facturas AEAT</h2>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Sin conexión
            </span>
          )}
        </div>
      </div>
      {/* Estadísticas */}
      <div className={cn('grid gap-2 flex-shrink-0', isMobile ? 'grid-cols-2' : 'grid-cols-5')}>
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total pedidos</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          <div className="text-xs text-muted-foreground">Aceptadas</div>
        </Card>
        {!isMobile && (
          <>
            <Card className="p-3">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-muted-foreground">Rechazadas</div>
            </Card>
            <Card className="p-3">
              <div className="text-2xl font-bold text-muted-foreground">{stats.notInvoiced}</div>
              <div className="text-xs text-muted-foreground">Sin facturar</div>
            </Card>
          </>
        )}
      </div>
      {/* Filtros */}
      <div
        className={cn(
          'flex gap-2 flex-shrink-0',
          isMobile ? 'flex-col' : 'items-center justify-between'
        )}
      >
        <div className="flex gap-2 items-center">
          <Select value={filterStatus()} onValueChange={(v) => setFilterStatus(v as InvoiceFilter)}>
            <SelectTrigger className={cn('bg-background', isMobile ? 'w-full' : 'w-[180px]')}>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="accepted">Aceptadas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
              <SelectItem value="not_invoiced">Sin facturar</SelectItem>
            </SelectContent>
          </Select>

          {!isMobile && (
            <Button variant="outline" size="sm" onClick={() => handleSort('date')}>
              <CalendarIcon className="h-4 w-4 mr-1" />
              Fecha
              {sortConfig().key === 'date' && <ArrowUpDown className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº factura o CSV..."
            value={searchQuery()}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('pl-9 bg-background', isMobile ? 'w-full' : 'w-[250px]')}
          />
        </div>
      </div>
      {/* Lista de facturas */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="space-y-3 pr-4">
              {filteredInvoices.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No hay facturas que mostrar
                </div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <InvoiceCard key={invoice.order.id} invoice={invoice} />
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[calc(100vh-380px)]">
            <Table className="border-collapse border border-border">
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="border border-border">Nº Factura</TableHead>
                  <TableHead
                    className="border border-border cursor-pointer"
                    onClick={() => handleSort('date')}
                  >
                    Fecha
                    {sortConfig().key === 'date' && <ArrowUpDown className="ml-1 h-3 w-3 inline" />}
                  </TableHead>
                  <TableHead className="border border-border">Pedido</TableHead>
                  <TableHead
                    className="border border-border cursor-pointer"
                    onClick={() => handleSort('total')}
                  >
                    Total
                    {sortConfig().key === 'total' && <ArrowUpDown className="ml-1 h-3 w-3 inline" />}
                  </TableHead>
                  <TableHead className="border border-border">Estado</TableHead>
                  <TableHead className="border border-border">CSV</TableHead>
                  <TableHead className="border border-border">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay facturas que mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.order.id} className="hover:bg-muted/50">
                      <TableCell className="border border-border font-mono text-sm">
                        {invoice.invoiceNumber || '-'}
                      </TableCell>
                      <TableCell className="border border-border">
                        {formatDate(invoice.sentAt || invoice.order.date)}
                      </TableCell>
                      <TableCell className="border border-border">#{invoice.order.id}</TableCell>
                      <TableCell className="border border-border font-semibold">
                        {invoice.order.total.toFixed(2)}€
                      </TableCell>
                      <TableCell className="border border-border">
                        <InvoiceStatusBadge aeat={invoice.order.aeat} />
                      </TableCell>
                      <TableCell className="border border-border font-mono text-xs">
                        {invoice.csv || '-'}
                      </TableCell>
                      <TableCell className="border border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(invoice)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
      {/* Dialog de detalles */}
      <Dialog open={isDetailsOpen()} onOpenChange={setIsDetailsOpen}>
        <DialogContent className={cn(isMobile ? 'max-w-[95vw]' : 'max-w-[600px]')}>
          <DialogHeader>
            <DialogTitle>Detalles de Factura</DialogTitle>
            <DialogDescription>
              {selectedInvoice()?.invoiceNumber || `Pedido #${selectedInvoice()?.order.id}`}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice() && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <InvoiceStatusBadge aeat={selectedInvoice().order.aeat} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total</Label>
                  <div className="mt-1 font-bold text-lg">
                    {selectedInvoice().order.total.toFixed(2)}€
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Nº Factura</Label>
                  <div className="mt-1 font-mono">
                    {selectedInvoice().invoiceNumber || 'Sin facturar'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">CSV</Label>
                  <div className="mt-1 font-mono text-sm">{selectedInvoice().csv || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Fecha envío</Label>
                  <div className="mt-1">{formatDate(selectedInvoice().sentAt)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Pedido</Label>
                  <div className="mt-1">
                    #{selectedInvoice().order.id} - Mesa{' '}
                    {selectedInvoice().order.tableNumber === 0
                      ? 'Barra'
                      : selectedInvoice().order.tableNumber}
                  </div>
                </div>
              </div>

              {/* Desglose de impuestos */}
              {selectedInvoice().order.aeat?.taxBreakdown && (
                <div>
                  <Label className="text-sm text-muted-foreground">Desglose IVA</Label>
                  <div className="mt-2 space-y-1">
                    {selectedInvoice().order.aeat.taxBreakdown.map((item) => (
                      <div key={`tax-${item.rate}`} className="flex justify-between text-sm">
                        <span>
                          Base ({item.rate}%): {item.baseAmount.toFixed(2)}€
                        </span>
                        <span>IVA: {item.taxAmount.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error si hay */}
              {selectedInvoice().order.aeat?.invoiceError && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <Label className="text-sm text-destructive">Error</Label>
                  <div className="mt-1 text-sm">{selectedInvoice().order.aeat.invoiceError}</div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedInvoice()?.csv && (
              <Button variant="outline" asChild>
                <a
                  href={`https://www2.agenciatributaria.gob.es/wlpl/inwinvoc/es.aeat.dit.adu.eeca.catalogo.vis.VisualizaSVInternacional?csv=${selectedInvoice().csv}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Verificar en AEAT
                </a>
              </Button>
            )}
            {selectedInvoice() &&
              (selectedInvoice().status === 'rejected' ||
                selectedInvoice().status === 'error' ||
                !selectedInvoice().order.aeat?.invoiceSent) && (
                <Button
                  onClick={() => handleRetryInvoice(selectedInvoice().order)}
                  disabled={isEmitting || !isConnected}
                >
                  {isEmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {selectedInvoice().order.aeat?.invoiceSent ? 'Reintentar' : 'Emitir Factura'}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

AEATInvoices.displayName = 'AEATInvoices';

export default AEATInvoices;
