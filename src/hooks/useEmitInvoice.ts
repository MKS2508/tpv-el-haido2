/**
 * useEmitInvoice Hook
 *
 * Hook para emitir facturas a AEAT VERI*FACTU
 * Usa OperationState para gestionar el proceso de emisión.
 */

import { ok, type Result, type ResultError } from '@mks2508/no-throw';
import { createMemo } from 'solid-js';
import { toast } from '@/components/ui/use-toast';
import { useAEAT } from '@/hooks/useAEAT';
import type { AppErrorCode } from '@/lib/error-codes';
import { createContextLogger } from '@/lib/logger';
import { createOperationStateSignal } from '@/lib/state-helpers';
import type { RegistrarFacturaResponse } from '@/models/AEAT';
import type Order from '@/models/Order';
import type { OrderAEATInfo, TaxBreakdownItem } from '@/models/Order';
import { invoiceBuilderService } from '@/services/invoice-builder.service';
import useStore from '@/store/store';

// ==================== Types ====================

export interface IEmitInvoiceResult {
  success: boolean;
  order: Order;
  csv?: string;
  invoiceNumber?: string;
  error?: string;
}

export interface IUseEmitInvoiceReturn {
  /** Emite una factura para un pedido */
  emitInvoice: (order: Order) => Promise<IEmitInvoiceResult>;
  /** Indica si se está emitiendo una factura (backwards compat) */
  isEmitting: boolean;
  /** Último error ocurrido (backwards compat) */
  lastError: string | null;
  /** Full OperationState para consumidores avanzados */
  operationState: () => any; // Accessor<OperationState<RegistrarFacturaResponse, Record<string, unknown>>>
  /** Reset operation state */
  reset: () => void;
}

// ==================== Logger ====================

const log = createContextLogger('EmitInvoice');

// ==================== Helper Functions ====================

/**
 * Procesa la respuesta de AEAT y extrae la información relevante
 */
function processAEATResponse(
  response: RegistrarFacturaResponse,
  invoiceNumber: string,
  taxBreakdown: TaxBreakdownItem[]
): OrderAEATInfo {
  const estado = response.Resultado?.EstadoEnvio;
  const registroFactura = response.RegistroFactura?.[0];

  // Determinar estado
  let invoiceStatus: OrderAEATInfo['invoiceStatus'] = 'error';
  if (estado === 'Correcto') {
    invoiceStatus = 'accepted';
  } else if (estado === 'AceptadoConErrores') {
    invoiceStatus = 'accepted'; // Aceptado pero con advertencias
  } else if (estado === 'Incorrecto') {
    invoiceStatus = 'rejected';
  }

  // Extraer CSV y errores
  const csv = registroFactura?.CSV;
  const errorMessage = registroFactura?.DescripcionErrorRegistro || response.errors?.[0]?.message;

  return {
    invoiceSent: true,
    invoiceNumber,
    numSerieFactura: invoiceNumber,
    csv,
    invoiceSentAt: new Date().toISOString(),
    invoiceStatus,
    invoiceError: invoiceStatus === 'rejected' ? errorMessage : undefined,
    aeatResponseCode: registroFactura?.CodigoEstadoRegistro,
    taxBreakdown,
  };
}

// ==================== Hook ====================

export function useEmitInvoice(): IUseEmitInvoiceReturn {
  const operation = createOperationStateSignal<RegistrarFacturaResponse>();

  const { config, isEnabled, isConnected, registrarFactura } = useAEAT();
  const { state, storageAdapter, setOrderHistory } = useStore();

  // Backwards-compatible derived accessors
  const isEmitting = createMemo(() => operation.state().status === 'pending');
  const lastError = createMemo(() => {
    const s = operation.state();
    return s.status === 'failed' ? s.error.message : null;
  });

  /**
   * Actualiza un pedido en el store y en storage
   */
  const updateOrderWithAEATInfo = async (order: Order, aeatInfo: OrderAEATInfo): Promise<Order> => {
    const updatedOrder: Order = {
      ...order,
      aeat: aeatInfo,
    };

    // Actualizar en storage
    await storageAdapter().updateOrder(updatedOrder);

    // Actualizar en store (orderHistory)
    const updatedHistory = state.orderHistory.map((o: Order) =>
      o.id === order.id ? updatedOrder : o
    );
    setOrderHistory(updatedHistory);

    return updatedOrder;
  };

  /**
   * Emite una factura para un pedido
   */
  const emitInvoice = async (order: Order): Promise<IEmitInvoiceResult> => {
    let finalInvoiceNumber = '';

    await operation.execute(
      async (): Promise<Result<RegistrarFacturaResponse, ResultError<AppErrorCode>>> => {
        // 1. Verificar que AEAT está habilitado
        if (!isEnabled()) {
          const error = 'La facturación AEAT no está habilitada. Actívela en Ajustes.';
          toast({
            title: 'AEAT no habilitado',
            description: error,
            variant: 'destructive',
          });
          throw new Error(error);
        }

        // 2. Verificar conexión
        if (!isConnected()) {
          const error = 'No hay conexión con el servicio AEAT. Verifique la configuración.';
          toast({
            title: 'Sin conexión AEAT',
            description: error,
            variant: 'destructive',
          });
          throw new Error(error);
        }

        // 3. Validar datos del negocio
        const businessValidation = invoiceBuilderService.validateBusinessData(
          config().businessData
        );
        if (!businessValidation.isValid) {
          const error = `Datos fiscales incompletos: ${businessValidation.errors.join(', ')}`;
          toast({
            title: 'Datos fiscales incompletos',
            description: businessValidation.errors[0],
            variant: 'destructive',
          });
          throw new Error(error);
        }

        // 4. Validar pedido
        const orderValidation = invoiceBuilderService.validateOrder(order);
        if (!orderValidation.isValid) {
          const error = `Pedido no facturable: ${orderValidation.errors.join(', ')}`;
          toast({
            title: 'Pedido no facturable',
            description: orderValidation.errors[0],
            variant: 'destructive',
          });
          throw new Error(error);
        }

        // 5. Marcar como pendiente mientras se envía
        const pendingAEATInfo: OrderAEATInfo = {
          invoiceSent: false,
          invoiceStatus: 'pending',
          invoiceSentAt: new Date().toISOString(),
        };
        await updateOrderWithAEATInfo(order, pendingAEATInfo);

        // 6. Construir petición
        const { request, invoiceNumber, taxBreakdown } = invoiceBuilderService.buildInvoiceRequest(
          order,
          config().businessData,
          state.taxRate
        );
        finalInvoiceNumber = invoiceNumber;

        log.debug('Sending invoice', { invoiceNumber });

        // 7. Enviar a AEAT
        const result = await registrarFactura(request);

        if (!result.ok) {
          const error = result.error.message || 'Error al enviar factura a AEAT';

          // Actualizar con error
          const errorAEATInfo: OrderAEATInfo = {
            invoiceSent: true,
            invoiceNumber,
            numSerieFactura: invoiceNumber,
            invoiceStatus: 'error',
            invoiceError: error,
            invoiceSentAt: new Date().toISOString(),
            taxBreakdown,
          };
          await updateOrderWithAEATInfo(order, errorAEATInfo);

          toast({
            title: 'Error al emitir factura',
            description: error,
            variant: 'destructive',
          });

          throw new Error(error);
        }

        // 8. Procesar respuesta exitosa
        const aeatInfo = processAEATResponse(result.value, invoiceNumber, taxBreakdown);
        await updateOrderWithAEATInfo(order, aeatInfo);

        // 9. Mostrar resultado
        if (aeatInfo.invoiceStatus === 'accepted') {
          toast({
            title: 'Factura emitida correctamente',
            description: aeatInfo.csv
              ? `CSV: ${aeatInfo.csv}`
              : `Factura ${invoiceNumber} registrada en AEAT`,
          });

          log.success('Invoice registered', { invoiceNumber, csv: aeatInfo.csv });
          return ok(result.value);
        } else {
          const error = aeatInfo.invoiceError || 'Factura rechazada por AEAT';
          toast({
            title: 'Factura rechazada',
            description: error,
            variant: 'destructive',
          });

          throw new Error(error);
        }
      }
    );

    // Build result based on operation state
    const opState = operation.state();
    if (opState.status === 'success') {
      const result = opState.result;
      return {
        success: true,
        order,
        csv: result?.RegistroFactura?.[0]?.CSV,
        invoiceNumber: finalInvoiceNumber,
      };
    } else {
      return {
        success: false,
        order,
        invoiceNumber: finalInvoiceNumber || undefined,
        error: opState.status === 'failed' ? opState.error.message : 'Unknown error',
      };
    }
  };

  return {
    emitInvoice,
    get isEmitting() {
      return isEmitting();
    },
    get lastError() {
      return lastError();
    },
    operationState: operation.state,
    reset: operation.reset,
  };
}

// Re-export old interface names for backwards compat
export type EmitInvoiceResult = IEmitInvoiceResult;
export type UseEmitInvoiceReturn = IUseEmitInvoiceReturn;

export default useEmitInvoice;
