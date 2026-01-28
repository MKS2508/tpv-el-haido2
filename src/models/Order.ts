export interface OrderItem {
  quantity: number;
  id: number;
  name: string;
  price: number;
  category: string;
}

/**
 * Desglose de impuestos por tipo impositivo
 */
export interface TaxBreakdownItem {
  /** Tipo impositivo (ej: 21, 10, 4) */
  rate: number;
  /** Base imponible */
  baseAmount: number;
  /** Cuota de impuesto */
  taxAmount: number;
}

/**
 * Información de facturación AEAT VERI*FACTU
 */
export interface OrderAEATInfo {
  /** Si la factura ha sido enviada a AEAT */
  invoiceSent: boolean;
  /** Número de factura interno */
  invoiceNumber?: string;
  /** Número de serie de factura AEAT (ej: TPV-2024-000001) */
  numSerieFactura?: string;
  /** Código Seguro de Verificación devuelto por AEAT */
  csv?: string;
  /** Fecha/hora de envío de la factura */
  invoiceSentAt?: string;
  /** Estado de la factura en AEAT */
  invoiceStatus?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'error';
  /** Mensaje de error si la factura fue rechazada */
  invoiceError?: string;
  /** Código de respuesta de AEAT */
  aeatResponseCode?: string;
  /** Desglose de impuestos */
  taxBreakdown?: TaxBreakdownItem[];
}

export default interface Order {
  id: number;
  date: string;
  total: number;
  change: number;
  totalPaid: number;
  itemCount: number;
  tableNumber: number;
  paymentMethod: 'efectivo' | 'tarjeta' | string;
  ticketPath: string;
  status: 'paid' | 'unpaid' | 'canceled' | 'inProgress' | string;
  items: OrderItem[];
  /** Información de facturación AEAT */
  aeat?: OrderAEATInfo;
}
