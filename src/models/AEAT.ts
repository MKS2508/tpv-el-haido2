/**
 * AEAT VERI*FACTU Types
 *
 * Tipos para la integración con el sistema de facturación electrónica
 * VERI*FACTU de la Agencia Estatal de Administración Tributaria.
 */

// ==================== Configuración ====================

/**
 * Modo de conexión con el servicio AEAT
 */
export type AEATMode = 'disabled' | 'external' | 'sidecar';

/**
 * Entorno de AEAT (pruebas o producción)
 */
export type AEATEnvironment = 'test' | 'production';

/**
 * Tipo de certificado digital
 */
export type AEATCertificateType = 'personal' | 'sello';

/**
 * Configuración del certificado
 */
export interface AEATCertificateConfig {
  type: AEATCertificateType;
  // PFX format (recomendado)
  pfxPath?: string;
  pfxPassword?: string;
  // PEM format
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  passphrase?: string;
}

/**
 * Configuración completa de AEAT
 */
export interface AEATConfig {
  /** Modo de conexión */
  mode: AEATMode;
  /** Entorno (pruebas o producción) */
  environment: AEATEnvironment;
  /** URL del servidor (solo para modo externo) */
  externalUrl?: string;
  /** Puerto del sidecar (solo para modo sidecar) */
  sidecarPort: number;
  /** Configuración del certificado */
  certificate?: AEATCertificateConfig;
  /** Auto-iniciar sidecar al arrancar la app */
  autoStartSidecar: boolean;
  /** Enviar facturas automáticamente al completar pedidos */
  autoSendInvoices: boolean;
  /** Timeout para requests (ms) */
  requestTimeout: number;
}

/**
 * Configuración por defecto de AEAT
 */
export const DEFAULT_AEAT_CONFIG: AEATConfig = {
  mode: 'disabled',
  environment: 'test',
  sidecarPort: 3001,
  autoStartSidecar: false,
  autoSendInvoices: false,
  requestTimeout: 30000,
};

// ==================== Estado del Servicio ====================

/**
 * Estado del circuit breaker
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Información del circuit breaker
 */
export interface CircuitBreakerInfo {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime: string | null;
}

/**
 * Respuesta del health check básico
 */
export interface AEATHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  environment: string;
  endpoint: string;
}

/**
 * Respuesta del health check SOAP
 */
export interface AEATSoapHealthResponse {
  connected: boolean;
  endpoint: string;
  circuitBreaker: CircuitBreakerInfo;
  timestamp: string;
}

/**
 * Estado de conexión del servicio AEAT
 */
export interface AEATConnectionStatus {
  isConnected: boolean;
  mode: AEATMode;
  endpoint: string;
  lastCheck: Date | null;
  circuitBreaker?: CircuitBreakerInfo;
  error?: string;
}

/**
 * Estado del sidecar
 */
export type SidecarStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Estado completo del sidecar
 */
export interface AEATSidecarState {
  status: SidecarStatus;
  pid?: number;
  port: number;
  startedAt?: Date;
  error?: string;
}

// ==================== Datos Fiscales ====================

/**
 * Datos del obligado tributario (emisor)
 */
export interface ObligadoEmision {
  NombreRazon: string;
  NIF: string;
}

/**
 * Cabecera de comunicación con AEAT
 */
export interface AEATCabecera {
  ObligadoEmision: ObligadoEmision;
  TipoComunicacion?: 'A0' | 'A1'; // A0 = Alta, A1 = Anulación
}

/**
 * Identificador de factura
 */
export interface IDFactura {
  IDEmisorFactura: string;
  NumSerieFactura: string;
  FechaExpedicion: string; // Formato: DD-MM-YYYY
}

/**
 * Detalle del desglose de impuestos
 */
export interface DetalleDesglose {
  Impuesto: '01' | '02' | '03'; // 01=IVA, 02=IGIC, 03=IPSI
  ClaveRegimen: string;
  BaseImponible: number;
  TipoImpositivo: number;
  CuotaRepercutida: number;
}

/**
 * Desglose de impuestos
 */
export interface Desglose {
  DetalleDesglose: DetalleDesglose[];
}

/**
 * Importe de factura
 */
export interface ImporteFactura {
  TotalFactura: number;
}

/**
 * Registro de factura para alta
 */
export interface RegistroFacturaAlta {
  IDFactura: IDFactura;
  NombreRazonEmisor: string;
  TipoFactura: 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  Desglose: Desglose;
  Importe: ImporteFactura;
  // Campos opcionales
  DescripcionOperacion?: string;
  Contraparte?: {
    NombreRazon: string;
    NIF?: string;
  };
}

/**
 * Request para registro de facturas
 */
export interface RegistrarFacturaRequest {
  Cabecera: AEATCabecera;
  RegistroFactura: RegistroFacturaAlta[];
}

/**
 * Filtros para consulta de facturas
 */
export interface ConsultaFacturasFilters {
  Cabecera: {
    ObligadoEmision: ObligadoEmision;
  };
  Consulta: {
    PeriodoImpositivo?: {
      Ejercicio: number;
      Periodo: string; // '01' - '12'
    };
    IDFactura?: IDFactura;
    FechaDesde?: string;
    FechaHasta?: string;
  };
}

// ==================== Respuestas AEAT ====================

/**
 * Estado del envío a AEAT
 */
export type EstadoEnvio = 'Correcto' | 'AceptadoConErrores' | 'Incorrecto';

/**
 * Resultado de registro de factura individual
 */
export interface ResultadoRegistroFactura {
  IDFactura: IDFactura;
  CodigoEstadoRegistro: string;
  DescripcionEstadoRegistro?: string;
  CSV?: string; // Código Seguro de Verificación
  CodigoErrorRegistro?: string;
  DescripcionErrorRegistro?: string;
}

/**
 * Respuesta de registro de facturas
 */
export interface RegistrarFacturaResponse {
  Cabecera?: {
    NumeroRegistro?: string;
  };
  Resultado: {
    EstadoEnvio: EstadoEnvio;
    CodigoEstadoRegistro?: string;
  };
  RegistroFactura?: ResultadoRegistroFactura[];
  errors?: AEATError[];
}

/**
 * Factura en respuesta de consulta
 */
export interface FacturaConsultada {
  IDFactura: IDFactura;
  CodigoEstadoRegistro: string;
  CSV?: string;
  FechaHoraRegistro?: string;
}

/**
 * Respuesta de consulta de facturas
 */
export interface ConsultarFacturasResponse {
  Resultado: {
    EstadoConsulta: 'ConDatos' | 'SinDatos';
  };
  RegistroFactura?: FacturaConsultada[];
}

// ==================== Errores AEAT ====================

/**
 * Categoría de error AEAT
 */
export type AEATErrorCategory = 'RECHAZO_COMPLETO' | 'RECHAZO_FACTURA' | 'ADVERTENCIA';

/**
 * Error de AEAT
 */
export interface AEATError {
  category: AEATErrorCategory;
  aeatCode: string;
  message: string;
  facturaRef?: string;
}

// ==================== Respuestas API Bridge ====================

/**
 * Respuesta exitosa del bridge
 */
export interface AEATApiSuccessResponse<T> {
  success: true;
  data: T;
  traceId: string;
}

/**
 * Error del bridge
 */
export interface AEATApiErrorDetails {
  code: string;
  message: string;
  details?: {
    issues?: Array<{
      path: string[];
      message: string;
    }>;
  };
  timestamp: string;
  traceId: string;
}

/**
 * Respuesta de error del bridge
 */
export interface AEATApiErrorResponse {
  success: false;
  error: AEATApiErrorDetails;
}

/**
 * Respuesta del bridge (union type)
 */
export type AEATApiResponse<T> = AEATApiSuccessResponse<T> | AEATApiErrorResponse;

// ==================== Utilidades ====================

/**
 * Tipo guardia para respuesta exitosa
 */
export function isAEATSuccess<T>(
  response: AEATApiResponse<T>
): response is AEATApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Tipo guardia para respuesta de error
 */
export function isAEATError<T>(response: AEATApiResponse<T>): response is AEATApiErrorResponse {
  return response.success === false;
}
