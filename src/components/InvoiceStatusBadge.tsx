/**
 * InvoiceStatusBadge Component
 *
 * Muestra el estado de facturación AEAT de un pedido
 */

import { AlertCircle, Check, Clock, FileX, type LucideIcon, Receipt } from 'lucide-solid';
import { Show } from 'solid-js';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { OrderAEATInfo } from '@/models/Order';

// ==================== Types ====================

export interface InvoiceStatusBadgeProps {
  /** Información AEAT del pedido */
  aeat?: OrderAEATInfo;
  /** Mostrar versión compacta (solo icono) */
  compact?: boolean;
  /** Clase CSS adicional */
  class?: string;
  /** Mostrar tooltip con detalles */
  showTooltip?: boolean;
}

type InvoiceStatus = 'not_invoiced' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'error';

// ==================== Status Configuration ====================

const statusConfig: Record<
  InvoiceStatus,
  {
    label: string;
    icon: LucideIcon;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
  }
> = {
  not_invoiced: {
    label: 'Sin facturar',
    icon: Receipt,
    variant: 'outline',
    className: 'text-muted-foreground border-muted-foreground/50',
  },
  pending: {
    label: 'Pendiente',
    icon: Clock,
    variant: 'secondary',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  },
  sent: {
    label: 'Enviada',
    icon: Clock,
    variant: 'secondary',
    className:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  },
  accepted: {
    label: 'Aceptada',
    icon: Check,
    variant: 'default',
    className:
      'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  },
  rejected: {
    label: 'Rechazada',
    icon: FileX,
    variant: 'destructive',
    className:
      'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    variant: 'destructive',
    className:
      'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
};

// ==================== Helper Functions ====================

/**
 * Determina el estado de facturación basado en OrderAEATInfo
 */
function getInvoiceStatus(aeat?: OrderAEATInfo): InvoiceStatus {
  if (!aeat || !aeat.invoiceSent) {
    // Si no hay info o no se ha enviado, pero tiene status pending, está en proceso
    if (aeat?.invoiceStatus === 'pending') {
      return 'pending';
    }
    return 'not_invoiced';
  }

  return aeat.invoiceStatus || 'sent';
}

/**
 * Genera el texto del tooltip basado en el estado
 */
function getTooltipContent(aeat?: OrderAEATInfo): string {
  const status = getInvoiceStatus(aeat);

  switch (status) {
    case 'not_invoiced':
      return 'Este pedido no tiene factura AEAT';
    case 'pending':
      return 'Enviando factura a AEAT...';
    case 'sent':
      return `Factura ${aeat?.numSerieFactura || ''} enviada a AEAT`;
    case 'accepted':
      return aeat?.csv
        ? `Factura aceptada - CSV: ${aeat.csv}`
        : `Factura ${aeat?.numSerieFactura || ''} aceptada por AEAT`;
    case 'rejected':
      return aeat?.invoiceError
        ? `Factura rechazada: ${aeat.invoiceError}`
        : 'Factura rechazada por AEAT';
    case 'error':
      return aeat?.invoiceError ? `Error: ${aeat.invoiceError}` : 'Error al procesar la factura';
    default:
      return 'Estado desconocido';
  }
}

// ==================== Component ====================

export function InvoiceStatusBadge(props: InvoiceStatusBadgeProps) {
  const status = () => getInvoiceStatus(props.aeat);
  const config = () => statusConfig[status()];
  const Icon = () => config().icon;

  const badge = (
    <Badge
      variant={config().variant}
      class={cn(
        'flex items-center gap-1 font-medium border',
        config().className,
        props.compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        props.class
      )}
    >
      <Icon class={cn(props.compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <Show when={!props.compact}>
        <span class="text-xs">{config.label}</span>
      </Show>
    </Badge>
  );

  return (
    <Show when={props.showTooltip !== false} fallback={badge}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as="span" class="inline-flex cursor-default">
            {badge}
          </TooltipTrigger>
          <TooltipContent class="max-w-xs">
            <p class="font-medium">{config.label}</p>
            <p class="text-xs text-muted-foreground">{getTooltipContent(props.aeat)}</p>
            <Show when={props.aeat?.numSerieFactura && status !== 'not_invoiced'}>
              <p class="text-xs mt-1">
                <span class="text-muted-foreground">Nº Factura:</span> {props.aeat?.numSerieFactura}
              </p>
            </Show>
            <Show when={props.aeat?.csv}>
              <p class="text-xs">
                <span class="text-muted-foreground">CSV:</span> {props.aeat?.csv}
              </p>
            </Show>
            <Show when={props.aeat?.invoiceSentAt}>
              <p class="text-xs">
                <span class="text-muted-foreground">Fecha:</span>{' '}
                {new Date(props.aeat!.invoiceSentAt!).toLocaleString('es-ES')}
              </p>
            </Show>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Show>
  );
}

export default InvoiceStatusBadge;
