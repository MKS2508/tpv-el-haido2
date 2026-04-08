/**
 * useEmitInvoice Hook
 *
 * Hook para emitir facturas a AEAT VERI*FACTU
 */

import { createSignal } from 'solid-js';
import { toast } from '@/components/ui/use-toast';
import { useAEAT } from '@/hooks/useAEAT';
import type { RegistrarFacturaResponse } from '@/models/AEAT';
import type Order from '@/models/Order';
import type { OrderAEATInfo, TaxBreakdownItem } from '@/models/Order';
import { invoiceBuilderService } from '@/services/invoice-builder.service';
import useStore from '@/store/store';

// ==================== Types ====================

export interface EmitInvoiceResult {
  success: boolean;
  order: Order;
  csv?: string;
  invoiceNumber?: string;
  error?: string;
}

export interface UseEmitInvoiceReturn {
  /** Emite una factura para un pedido */
  emitInvoice: (order: Order) => Promise<EmitInvoiceResult>;
  /** Indica si se está emitiendo una factura */
  isEmitting: boolean;
  /** Último error ocurrido */
  lastError: string | null;
}

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

export function useEmitInvoice(): UseEmitInvoiceReturn {
  const [isEmitting, setIsEmitting] = createSignal(false);
  const [lastError, setLastError] = createSignal<string | null>(null);

  const { config, isEnabled, isConnected, registrarFactura } = useAEAT();
  const { state, storageAdapter, setOrderHistory } = useStore();

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
  const emitInvoice = async (order: Order): Promise<EmitInvoiceResult> => {
    setIsEmitting(true);
    setLastError(null);

    try {
      // 1. Verificar que AEAT está habilitado
      if (!isEnabled()) {
        const error = 'La facturación AEAT no está habilitada. Actívela en Ajustes.';
        setLastError(error);
        toast({
          title: 'AEAT no habilitado',
          description: error,
          variant: 'destructive',
        });
        return { success: false, order, error };
      }

      // 2. Verificar conexión
      if (!isConnected()) {
        const error = 'No hay conexión con el servicio AEAT. Verifique la configuración.';
        setLastError(error);
        toast({
          title: 'Sin conexión AEAT',
          description: error,
          variant: 'destructive',
        });
        return { success: false, order, error };
      }

      // 3. Validar datos del negocio
      const businessValidation = invoiceBuilderService.validateBusinessData(config().businessData);
      if (!businessValidation.isValid) {
        const error = `Datos fiscales incompletos: ${businessValidation.errors.join(', ')}`;
        setLastError(error);
        toast({
          title: 'Datos fiscales incompletos',
          description: businessValidation.errors[0],
          variant: 'destructive',
        });
        return { success: false, order, error };
      }

      // 4. Validar pedido
      const orderValidation = invoiceBuilderService.validateOrder(order);
      if (!orderValidation.isValid) {
        const error = `Pedido no facturable: ${orderValidation.errors.join(', ')}`;
        setLastError(error);
        toast({
          title: 'Pedido no facturable',
          description: orderValidation.errors[0],
          variant: 'destructive',
        });
        return { success: false, order, error };
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

      console.log('[useEmitInvoice] Sending invoice:', invoiceNumber, request);

      // 7. Enviar a AEAT
      const result = await registrarFactura(request);

      if (!result.ok) {
        const error = result.error.message || 'Error al enviar factura a AEAT';
        setLastError(error);

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
        const updatedOrder = await updateOrderWithAEATInfo(order, errorAEATInfo);

        toast({
          title: 'Error al emitir factura',
          description: error,
          variant: 'destructive',
        });

        return { success: false, order: updatedOrder, invoiceNumber, error };
      }

      // 8. Procesar respuesta exitosa
      const aeatInfo = processAEATResponse(result.value, invoiceNumber, taxBreakdown);
      const updatedOrder = await updateOrderWithAEATInfo(order, aeatInfo);

      // 9. Mostrar resultado
      if (aeatInfo.invoiceStatus === 'accepted') {
        toast({
          title: 'Factura emitida correctamente',
          description: aeatInfo.csv
            ? `CSV: ${aeatInfo.csv}`
            : `Factura ${invoiceNumber} registrada en AEAT`,
        });

        return {
          success: true,
          order: updatedOrder,
          csv: aeatInfo.csv,
          invoiceNumber,
        };
      } else {
        const error = aeatInfo.invoiceError || 'Factura rechazada por AEAT';
        toast({
          title: 'Factura rechazada',
          description: error,
          variant: 'destructive',
        });

        return { success: false, order: updatedOrder, invoiceNumber, error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setLastError(errorMessage);

      toast({
        title: 'Error inesperado',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, order, error: errorMessage };
    } finally {
      setIsEmitting(false);
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
  };
}

export default useEmitInvoice;
