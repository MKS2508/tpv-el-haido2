/**
 * AEATInvoices Section
 *
 * Panel para gestionar facturas emitidas a AEAT VERI*FACTU
 * Migrated to SolidJS
 */

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
import { type Component, createMemo, createSignal, For, Show } from 'solid-js';
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
import { orderHistoryData } from '@/store/selectors';

// ==================== Types ====================

type InvoiceFilter = 'all' | 'accepted' | 'rejected' | 'pending' | 'not_invoiced';

interface InvoiceWithOrder {
  order: Order;
  invoiceNumber: string | null;
  csv: string | null;
  status: string;
  sentAt: string | null;
}

// ==================== Helper Functions ====================

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ==================== Sub-Components ====================

interface InvoiceCardProps {
  invoice: InvoiceWithOrder;
  onViewDetails: (invoice: InvoiceWithOrder) => void;
}

const InvoiceCard: Component<InvoiceCardProps> = (props) => (
  <Card
    class="touch-manipulation cursor-pointer hover:shadow-md transition-shadow duration-200"
    onClick={() => props.onViewDetails(props.invoice)}
  >
    <CardHeader class="pb-2">
      <div class="flex items-center justify-between">
        <CardTitle class="text-base font-semibold">
          {props.invoice.invoiceNumber || `Pedido #${props.invoice.order.id}`}
        </CardTitle>
        <InvoiceStatusBadge aeat={props.invoice.order.aeat} compact />
      </div>
      <CardDescription>
        {formatDate(props.invoice.sentAt || props.invoice.order.date)}
      </CardDescription>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="flex justify-between items-center">
        <span class="text-sm text-muted-foreground">Total:</span>
        <span class="font-bold text-success">{props.invoice.order.total.toFixed(2)}€</span>
      </div>
      <Show when={props.invoice.csv}>
        <div class="flex justify-between items-center mt-1">
          <span class="text-sm text-muted-foreground">CSV:</span>
          <span class="text-xs font-mono">{props.invoice.csv}</span>
        </div>
      </Show>
    </CardContent>
  </Card>
);

// ==================== Main Component ====================

const AEATInvoices: Component = () => {
  const responsive = useResponsive();
  const data = orderHistoryData();
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
  const invoiceableOrders = createMemo(() => {
    return data.orderHistory.filter((order) => order.status === 'paid');
  });

  // Convertir pedidos a lista de facturas
  const invoices = createMemo<InvoiceWithOrder[]>(() => {
    return invoiceableOrders().map((order) => ({
      order,
      invoiceNumber: order.aeat?.numSerieFactura || null,
      csv: order.aeat?.csv || null,
      status: order.aeat?.invoiceStatus || 'not_invoiced',
      sentAt: order.aeat?.invoiceSentAt || null,
    }));
  });

  // Filtrar y ordenar facturas
  const filteredInvoices = createMemo(() => {
    let result = [...invoices()];

    // Filtrar por estado
    if (filterStatus() !== 'all') {
      result = result.filter((inv) => {
        if (filterStatus() === 'not_invoiced') {
          return !inv.order.aeat?.invoiceSent;
        }
        return inv.status === filterStatus();
      });
    }

    // Filtrar por busqueda
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
    const sortKey = sortConfig().key;
    const sortDirection = sortConfig().direction;

    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'date') {
        comparison = new Date(a.order.date).getTime() - new Date(b.order.date).getTime();
      } else if (sortKey === 'total') {
        comparison = a.order.total - b.order.total;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  // Estadisticas
  const stats = createMemo(() => {
    const invs = invoices();
    const total = invs.length;
    const accepted = invs.filter((i) => i.status === 'accepted').length;
    const rejected = invs.filter((i) => i.status === 'rejected' || i.status === 'error').length;
    const pending = invs.filter((i) => i.status === 'pending' || i.status === 'sent').length;
    const notInvoiced = invs.filter((i) => !i.order.aeat?.invoiceSent).length;
    return { total, accepted, rejected, pending, notInvoiced };
  });

  // Handlers
  const handleSort = (key: 'date' | 'total') => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleViewDetails = (invoice: InvoiceWithOrder) => {
    setSelectedInvoice(invoice);
    setIsDetailsOpen(true);
  };

  const handleRetryInvoice = (order: Order) => {
    const emit = async () => {
      await emitInvoice(order);
      setIsDetailsOpen(false);
    };
    void emit();
  };

  // Si AEAT no esta habilitado
  return (
    <Show
      when={isEnabled}
      fallback={
        <div class="flex flex-col items-center justify-center h-full text-center p-8">
          <Receipt class="h-16 w-16 text-muted-foreground mb-4" />
          <h2 class="text-xl font-semibold mb-2">Facturacion AEAT no habilitada</h2>
          <p class="text-muted-foreground mb-4">
            Para gestionar facturas AEAT, primero debe habilitar la integracion en Ajustes.
          </p>
          <Button variant="outline" disabled>
            Ir a Ajustes
          </Button>
        </div>
      }
    >
      <div class="space-y-4 text-foreground w-full h-full flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between flex-shrink-0">
          <h2 class={cn('font-semibold', responsive.isMobile() ? 'text-xl' : 'text-2xl')}>
            Facturas AEAT
          </h2>
          <div class="flex items-center gap-2">
            <Show when={!isConnected}>
              <span class="text-xs text-destructive flex items-center gap-1">
                <XCircle class="h-3 w-3" />
                Sin conexion
              </span>
            </Show>
          </div>
        </div>

        {/* Estadisticas */}
        <div
          class={cn(
            'grid gap-2 flex-shrink-0',
            responsive.isMobile() ? 'grid-cols-2' : 'grid-cols-5'
          )}
        >
          <Card class="p-3">
            <div class="text-2xl font-bold">{stats().total}</div>
            <div class="text-xs text-muted-foreground">Total pedidos</div>
          </Card>
          <Card class="p-3">
            <div class="text-2xl font-bold text-green-600">{stats().accepted}</div>
            <div class="text-xs text-muted-foreground">Aceptadas</div>
          </Card>
          <Show when={!responsive.isMobile()}>
            <Card class="p-3">
              <div class="text-2xl font-bold text-yellow-600">{stats().pending}</div>
              <div class="text-xs text-muted-foreground">Pendientes</div>
            </Card>
            <Card class="p-3">
              <div class="text-2xl font-bold text-red-600">{stats().rejected}</div>
              <div class="text-xs text-muted-foreground">Rechazadas</div>
            </Card>
            <Card class="p-3">
              <div class="text-2xl font-bold text-muted-foreground">{stats().notInvoiced}</div>
              <div class="text-xs text-muted-foreground">Sin facturar</div>
            </Card>
          </Show>
        </div>

        {/* Filtros */}
        <div
          class={cn(
            'flex gap-2 flex-shrink-0',
            responsive.isMobile() ? 'flex-col' : 'items-center justify-between'
          )}
        >
          <div class="flex gap-2 items-center">
            <Select value={filterStatus()} onChange={(v) => setFilterStatus(v as InvoiceFilter)}>
              <SelectTrigger
                class={cn('bg-background', responsive.isMobile() ? 'w-full' : 'w-[180px]')}
              >
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

            <Show when={!responsive.isMobile()}>
              <Button variant="outline" size="sm" onClick={() => handleSort('date')}>
                <CalendarIcon class="h-4 w-4 mr-1" />
                Fecha
                <Show when={sortConfig().key === 'date'}>
                  <ArrowUpDown class="h-3 w-3 ml-1" />
                </Show>
              </Button>
            </Show>
          </div>

          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por n factura o CSV..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class={cn('pl-9 bg-background', responsive.isMobile() ? 'w-full' : 'w-[250px]')}
            />
          </div>
        </div>

        {/* Lista de facturas */}
        <div class="flex-1 overflow-hidden">
          <Show
            when={responsive.isMobile()}
            fallback={
              <div class="h-[calc(100vh-380px)] overflow-auto">
                <Table class="border-collapse border border-border">
                  <TableHeader>
                    <TableRow class="bg-muted">
                      <TableHead class="border border-border">N Factura</TableHead>
                      <TableHead
                        class="border border-border cursor-pointer"
                        onClick={() => handleSort('date')}
                      >
                        Fecha
                        <Show when={sortConfig().key === 'date'}>
                          <ArrowUpDown class="ml-1 h-3 w-3 inline" />
                        </Show>
                      </TableHead>
                      <TableHead class="border border-border">Pedido</TableHead>
                      <TableHead
                        class="border border-border cursor-pointer"
                        onClick={() => handleSort('total')}
                      >
                        Total
                        <Show when={sortConfig().key === 'total'}>
                          <ArrowUpDown class="ml-1 h-3 w-3 inline" />
                        </Show>
                      </TableHead>
                      <TableHead class="border border-border">Estado</TableHead>
                      <TableHead class="border border-border">CSV</TableHead>
                      <TableHead class="border border-border">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <Show
                      when={filteredInvoices().length > 0}
                      fallback={
                        <TableRow>
                          <TableCell colSpan={7} class="text-center py-16">
                            <div class="flex flex-col items-center">
                              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                                <Receipt class="h-8 w-8 text-muted-foreground" />
                              </div>
                              <p class="text-lg font-medium text-foreground mb-1">Sin facturas</p>
                              <p class="text-sm text-muted-foreground max-w-sm">
                                {searchQuery()
                                  ? `No se encontraron facturas que coincidan con "${searchQuery()}"`
                                  : filterStatus() !== 'all'
                                    ? 'No hay facturas con el filtro seleccionado'
                                    : 'Las facturas apareceran aqui cuando se emitan desde los pedidos'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      }
                    >
                      <For each={filteredInvoices()}>
                        {(invoice) => (
                          <TableRow class="hover:bg-muted/50">
                            <TableCell class="border border-border font-mono text-sm">
                              {invoice.invoiceNumber || '-'}
                            </TableCell>
                            <TableCell class="border border-border">
                              {formatDate(invoice.sentAt || invoice.order.date)}
                            </TableCell>
                            <TableCell class="border border-border">#{invoice.order.id}</TableCell>
                            <TableCell class="border border-border font-semibold">
                              {invoice.order.total.toFixed(2)}€
                            </TableCell>
                            <TableCell class="border border-border">
                              <InvoiceStatusBadge aeat={invoice.order.aeat} />
                            </TableCell>
                            <TableCell class="border border-border font-mono text-xs">
                              {invoice.csv || '-'}
                            </TableCell>
                            <TableCell class="border border-border">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(invoice)}
                              >
                                <FileText class="h-4 w-4 mr-1" />
                                Detalles
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
                      </For>
                    </Show>
                  </TableBody>
                </Table>
              </div>
            }
          >
            <div class="h-[calc(100vh-380px)] overflow-auto">
              <div class="space-y-3 pr-4">
                <Show
                  when={filteredInvoices().length > 0}
                  fallback={
                    <div class="flex flex-col items-center justify-center py-16 px-4">
                      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Receipt class="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p class="text-lg font-medium text-foreground mb-1">Sin facturas</p>
                      <p class="text-sm text-muted-foreground text-center">
                        {searchQuery()
                          ? `Sin resultados para "${searchQuery()}"`
                          : 'Las facturas apareceran aqui cuando se emitan'}
                      </p>
                    </div>
                  }
                >
                  <For each={filteredInvoices()}>
                    {(invoice) => (
                      <InvoiceCard invoice={invoice} onViewDetails={handleViewDetails} />
                    )}
                  </For>
                </Show>
              </div>
            </div>
          </Show>
        </div>

        {/* Dialog de detalles */}
        <Dialog open={isDetailsOpen()} onOpenChange={setIsDetailsOpen}>
          <DialogContent class={cn(responsive.isMobile() ? 'max-w-[95vw]' : 'max-w-[600px]')}>
            <DialogHeader>
              <DialogTitle>Detalles de Factura</DialogTitle>
              <DialogDescription>
                {selectedInvoice()?.invoiceNumber || `Pedido #${selectedInvoice()?.order.id}`}
              </DialogDescription>
            </DialogHeader>

            <Show when={selectedInvoice()}>
              {(invoice) => (
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <Label class="text-sm text-muted-foreground">Estado</Label>
                      <div class="mt-1">
                        <InvoiceStatusBadge aeat={invoice().order.aeat} />
                      </div>
                    </div>
                    <div>
                      <Label class="text-sm text-muted-foreground">Total</Label>
                      <div class="mt-1 font-bold text-lg">{invoice().order.total.toFixed(2)}€</div>
                    </div>
                    <div>
                      <Label class="text-sm text-muted-foreground">N Factura</Label>
                      <div class="mt-1 font-mono">{invoice().invoiceNumber || 'Sin facturar'}</div>
                    </div>
                    <div>
                      <Label class="text-sm text-muted-foreground">CSV</Label>
                      <div class="mt-1 font-mono text-sm">{invoice().csv || '-'}</div>
                    </div>
                    <div>
                      <Label class="text-sm text-muted-foreground">Fecha envio</Label>
                      <div class="mt-1">{formatDate(invoice().sentAt)}</div>
                    </div>
                    <div>
                      <Label class="text-sm text-muted-foreground">Pedido</Label>
                      <div class="mt-1">
                        #{invoice().order.id} - Mesa{' '}
                        {invoice().order.tableNumber === 0 ? 'Barra' : invoice().order.tableNumber}
                      </div>
                    </div>
                  </div>

                  {/* Desglose de impuestos */}
                  <Show when={invoice().order.aeat?.taxBreakdown}>
                    <div>
                      <Label class="text-sm text-muted-foreground">Desglose IVA</Label>
                      <div class="mt-2 space-y-1">
                        <For each={invoice().order.aeat!.taxBreakdown}>
                          {(item) => (
                            <div class="flex justify-between text-sm">
                              <span>
                                Base ({item.rate}%): {item.baseAmount.toFixed(2)}€
                              </span>
                              <span>IVA: {item.taxAmount.toFixed(2)}€</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  {/* Error si hay */}
                  <Show when={invoice().order.aeat?.invoiceError}>
                    <div class="p-3 bg-destructive/10 rounded-lg">
                      <Label class="text-sm text-destructive">Error</Label>
                      <div class="mt-1 text-sm">{invoice().order.aeat!.invoiceError}</div>
                    </div>
                  </Show>
                </div>
              )}
            </Show>

            <DialogFooter class="gap-2">
              <Show when={selectedInvoice()?.csv}>
                <a
                  href={`https://www2.agenciatributaria.gob.es/wlpl/inwinvoc/es.aeat.dit.adu.eeca.catalogo.vis.VisualizaSVInternacional?csv=${selectedInvoice()!.csv}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <ExternalLink class="h-4 w-4 mr-2" />
                    Verificar en AEAT
                  </Button>
                </a>
              </Show>
              <Show
                when={
                  selectedInvoice() &&
                  (selectedInvoice()!.status === 'rejected' ||
                    selectedInvoice()!.status === 'error' ||
                    !selectedInvoice()!.order.aeat?.invoiceSent)
                }
              >
                <Button
                  onClick={() => handleRetryInvoice(selectedInvoice()!.order)}
                  disabled={isEmitting || !isConnected}
                >
                  <Show when={isEmitting} fallback={<RefreshCw class="h-4 w-4 mr-2" />}>
                    <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                  </Show>
                  {selectedInvoice()!.order.aeat?.invoiceSent ? 'Reintentar' : 'Emitir Factura'}
                </Button>
              </Show>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Show>
  );
};

export default AEATInvoices;
