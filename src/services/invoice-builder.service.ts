/**
 * Invoice Builder Service
 *
 * Servicio para construir y validar facturas AEAT VERI*FACTU
 */

import type {
  AEATBusinessData,
  AEATCabecera,
  Desglose,
  IDFactura,
  RegistrarFacturaRequest,
  RegistroFacturaAlta,
} from '@/models/AEAT';
import type Order from '@/models/Order';
import type { TaxBreakdownItem } from '@/models/Order';

// ==================== Constants ====================

const INVOICE_COUNTER_KEY = 'tpv-invoice-counter';
const DEFAULT_TAX_RATE = 21; // IVA general en España

// ==================== Types ====================

export interface InvoiceCounterData {
  serie: string;
  year: number;
  lastNumber: number;
}

export interface InvoiceValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BusinessDataValidationResult {
  isValid: boolean;
  errors: string[];
}

// ==================== Invoice Number Generation ====================

/**
 * Obtiene el contador de facturas desde localStorage
 */
function getInvoiceCounter(serie: string): InvoiceCounterData {
  try {
    const stored = localStorage.getItem(INVOICE_COUNTER_KEY);
    if (stored) {
      const counters: Record<string, InvoiceCounterData> = JSON.parse(stored);
      const currentYear = new Date().getFullYear();

      if (counters[serie] && counters[serie].year === currentYear) {
        return counters[serie];
      }
    }
  } catch (error) {
    console.warn('[InvoiceBuilder] Error reading invoice counter:', error);
  }

  // Devolver contador inicial si no existe o es de otro año
  return {
    serie,
    year: new Date().getFullYear(),
    lastNumber: 0,
  };
}

/**
 * Guarda el contador de facturas en localStorage
 */
function saveInvoiceCounter(counter: InvoiceCounterData): void {
  try {
    const stored = localStorage.getItem(INVOICE_COUNTER_KEY);
    const counters: Record<string, InvoiceCounterData> = stored ? JSON.parse(stored) : {};
    counters[counter.serie] = counter;
    localStorage.setItem(INVOICE_COUNTER_KEY, JSON.stringify(counters));
  } catch (error) {
    console.error('[InvoiceBuilder] Error saving invoice counter:', error);
  }
}

/**
 * Genera un número de factura secuencial
 * Formato: SERIE-YYYY-NNNNNN (ej: TPV-2024-000001)
 */
export function generateInvoiceNumber(serie: string): string {
  const counter = getInvoiceCounter(serie);
  const currentYear = new Date().getFullYear();

  // Reiniciar contador si cambiamos de año
  if (counter.year !== currentYear) {
    counter.year = currentYear;
    counter.lastNumber = 0;
  }

  // Incrementar contador
  counter.lastNumber += 1;
  saveInvoiceCounter(counter);

  // Formatear número con ceros a la izquierda (6 dígitos)
  const paddedNumber = counter.lastNumber.toString().padStart(6, '0');
  return `${serie}${currentYear}-${paddedNumber}`;
}

/**
 * Obtiene el siguiente número de factura sin incrementar el contador
 * (útil para previsualización)
 */
export function peekNextInvoiceNumber(serie: string): string {
  const counter = getInvoiceCounter(serie);
  const currentYear = new Date().getFullYear();

  const nextNumber = counter.year === currentYear ? counter.lastNumber + 1 : 1;
  const paddedNumber = nextNumber.toString().padStart(6, '0');
  return `${serie}${currentYear}-${paddedNumber}`;
}

// ==================== Tax Calculation ====================

/**
 * Calcula el desglose de impuestos para un total
 * El total incluye IVA, así que calculamos la base imponible
 */
export function calculateTaxBreakdown(
  total: number,
  taxRate: number = DEFAULT_TAX_RATE
): TaxBreakdownItem {
  // total = baseAmount * (1 + taxRate/100)
  // baseAmount = total / (1 + taxRate/100)
  const taxMultiplier = 1 + taxRate / 100;
  const baseAmount = Math.round((total / taxMultiplier) * 100) / 100;
  const taxAmount = Math.round((total - baseAmount) * 100) / 100;

  return {
    rate: taxRate,
    baseAmount,
    taxAmount,
  };
}

/**
 * Calcula el desglose de impuestos para múltiples tipos impositivos
 * (para futuras implementaciones con IVA reducido, superreducido, etc.)
 */
export function calculateMultipleTaxBreakdown(
  items: Array<{ total: number; taxRate: number }>
): TaxBreakdownItem[] {
  const breakdownMap = new Map<number, TaxBreakdownItem>();

  for (const item of items) {
    const breakdown = calculateTaxBreakdown(item.total, item.taxRate);
    const existing = breakdownMap.get(item.taxRate);

    if (existing) {
      existing.baseAmount = Math.round((existing.baseAmount + breakdown.baseAmount) * 100) / 100;
      existing.taxAmount = Math.round((existing.taxAmount + breakdown.taxAmount) * 100) / 100;
    } else {
      breakdownMap.set(item.taxRate, breakdown);
    }
  }

  return Array.from(breakdownMap.values());
}

// ==================== Validation ====================

/**
 * Valida que un pedido sea facturable
 */
export function validateOrder(order: Order): InvoiceValidationResult {
  const errors: string[] = [];

  // Verificar estado
  if (order.status !== 'paid') {
    errors.push('El pedido debe estar pagado para emitir factura');
  }

  // Verificar total
  if (order.total <= 0) {
    errors.push('El total del pedido debe ser mayor que 0');
  }

  // Verificar items
  if (!order.items || order.items.length === 0) {
    errors.push('El pedido debe tener al menos un producto');
  }

  // Verificar que no tenga factura aceptada previa
  if (order.aeat?.invoiceStatus === 'accepted') {
    errors.push('El pedido ya tiene una factura aceptada por AEAT');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida los datos fiscales del negocio
 */
export function validateBusinessData(businessData: AEATBusinessData): BusinessDataValidationResult {
  const errors: string[] = [];

  // Validar NIF
  if (!businessData.nif || businessData.nif.trim() === '') {
    errors.push('El NIF/CIF es obligatorio');
  } else if (!/^[A-Z0-9]{9}$/i.test(businessData.nif.trim())) {
    errors.push('El NIF/CIF debe tener 9 caracteres alfanuméricos');
  }

  // Validar razón social
  if (!businessData.nombreRazon || businessData.nombreRazon.trim() === '') {
    errors.push('La razón social es obligatoria');
  } else if (businessData.nombreRazon.trim().length < 2) {
    errors.push('La razón social debe tener al menos 2 caracteres');
  }

  // Validar serie de factura
  if (!businessData.serieFactura || businessData.serieFactura.trim() === '') {
    errors.push('El prefijo de serie de factura es obligatorio');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ==================== Request Building ====================

/**
 * Formatea la fecha actual en formato AEAT (DD-MM-YYYY)
 */
function formatAEATDate(date: Date = new Date()): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Construye la cabecera de la petición AEAT
 */
function buildCabecera(businessData: AEATBusinessData): AEATCabecera {
  return {
    ObligadoEmision: {
      NombreRazon: businessData.nombreRazon,
      NIF: businessData.nif.toUpperCase(),
    },
    TipoComunicacion: 'A0', // A0 = Alta de factura
  };
}

/**
 * Construye el identificador de factura
 */
function buildIDFactura(businessData: AEATBusinessData, invoiceNumber: string): IDFactura {
  return {
    IDEmisorFactura: businessData.nif.toUpperCase(),
    NumSerieFactura: invoiceNumber,
    FechaExpedicion: formatAEATDate(),
  };
}

/**
 * Construye el desglose de impuestos para AEAT
 */
function buildDesglose(taxBreakdown: TaxBreakdownItem[]): Desglose {
  return {
    DetalleDesglose: taxBreakdown.map((item) => ({
      Impuesto: '01' as const, // 01 = IVA
      ClaveRegimen: '01', // 01 = Régimen general
      BaseImponible: item.baseAmount,
      TipoImpositivo: item.rate,
      CuotaRepercutida: item.taxAmount,
    })),
  };
}

/**
 * Construye el registro de factura para AEAT
 */
function buildRegistroFactura(
  order: Order,
  businessData: AEATBusinessData,
  invoiceNumber: string,
  taxBreakdown: TaxBreakdownItem[]
): RegistroFacturaAlta {
  return {
    IDFactura: buildIDFactura(businessData, invoiceNumber),
    NombreRazonEmisor: businessData.nombreRazon,
    TipoFactura: businessData.tipoFactura,
    Desglose: buildDesglose(taxBreakdown),
    Importe: {
      TotalFactura: order.total,
    },
    DescripcionOperacion: businessData.descripcionOperacion || `Venta TPV - Pedido #${order.id}`,
  };
}

/**
 * Construye la petición completa para registrar factura en AEAT
 */
export function buildInvoiceRequest(
  order: Order,
  businessData: AEATBusinessData,
  taxRate: number = DEFAULT_TAX_RATE
): { request: RegistrarFacturaRequest; invoiceNumber: string; taxBreakdown: TaxBreakdownItem[] } {
  // Generar número de factura
  const invoiceNumber = generateInvoiceNumber(businessData.serieFactura);

  // Calcular desglose de impuestos
  const taxBreakdown = [calculateTaxBreakdown(order.total, taxRate)];

  // Construir petición
  const request: RegistrarFacturaRequest = {
    Cabecera: buildCabecera(businessData),
    RegistroFactura: [buildRegistroFactura(order, businessData, invoiceNumber, taxBreakdown)],
  };

  return {
    request,
    invoiceNumber,
    taxBreakdown,
  };
}

// ==================== Export Service Object ====================

export const invoiceBuilderService = {
  generateInvoiceNumber,
  peekNextInvoiceNumber,
  calculateTaxBreakdown,
  calculateMultipleTaxBreakdown,
  validateOrder,
  validateBusinessData,
  buildInvoiceRequest,
};

export default invoiceBuilderService;
