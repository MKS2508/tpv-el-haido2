import type { ErrorCode, ResultError } from '@mks2508/no-throw';

// ==================== Storage Errors ====================
export const StorageErrorCode = {
  ConnectionFailed: 'STORAGE_CONNECTION_FAILED',
  ReadFailed: 'STORAGE_READ_FAILED',
  WriteFailed: 'STORAGE_WRITE_FAILED',
  DeleteFailed: 'STORAGE_DELETE_FAILED',
  NotFound: 'STORAGE_NOT_FOUND',
  InvalidData: 'STORAGE_INVALID_DATA',
} as const;

// ==================== Printer Errors ====================
export const PrinterErrorCode = {
  ConnectionFailed: 'PRINTER_CONNECTION_FAILED',
  PrintFailed: 'PRINTER_PRINT_FAILED',
  CashDrawerFailed: 'PRINTER_CASH_DRAWER_FAILED',
  ConfigError: 'PRINTER_CONFIG_ERROR',
  TestFailed: 'PRINTER_TEST_FAILED',
} as const;

// ==================== Order Errors ====================
export const OrderErrorCode = {
  CreateFailed: 'ORDER_CREATE_FAILED',
  UpdateFailed: 'ORDER_UPDATE_FAILED',
  DeleteFailed: 'ORDER_DELETE_FAILED',
  NotFound: 'ORDER_NOT_FOUND',
  InvalidState: 'ORDER_INVALID_STATE',
} as const;

// ==================== Product Errors ====================
export const ProductErrorCode = {
  LoadFailed: 'PRODUCT_LOAD_FAILED',
  CreateFailed: 'PRODUCT_CREATE_FAILED',
  UpdateFailed: 'PRODUCT_UPDATE_FAILED',
  DeleteFailed: 'PRODUCT_DELETE_FAILED',
} as const;

// ==================== Category Errors ====================
export const CategoryErrorCode = {
  LoadFailed: 'CATEGORY_LOAD_FAILED',
  CreateFailed: 'CATEGORY_CREATE_FAILED',
  UpdateFailed: 'CATEGORY_UPDATE_FAILED',
  DeleteFailed: 'CATEGORY_DELETE_FAILED',
} as const;

// ==================== Customer Errors ====================
export const CustomerErrorCode = {
  LoadFailed: 'CUSTOMER_LOAD_FAILED',
  CreateFailed: 'CUSTOMER_CREATE_FAILED',
  UpdateFailed: 'CUSTOMER_UPDATE_FAILED',
  DeleteFailed: 'CUSTOMER_DELETE_FAILED',
  NotFound: 'CUSTOMER_NOT_FOUND',
} as const;

// ==================== Auth Errors ====================
export const AuthErrorCode = {
  InvalidPin: 'AUTH_INVALID_PIN',
  UserNotFound: 'AUTH_USER_NOT_FOUND',
  SessionExpired: 'AUTH_SESSION_EXPIRED',
} as const;

// ==================== Network Errors ====================
export const NetworkErrorCode = {
  Timeout: 'NETWORK_TIMEOUT',
  Offline: 'NETWORK_OFFLINE',
  ServerError: 'NETWORK_SERVER_ERROR',
} as const;

// ==================== AEAT VERI*FACTU Errors ====================
export const AEATErrorCode = {
  // Conexión
  ConnectionFailed: 'AEAT_CONNECTION_FAILED',
  ServiceUnavailable: 'AEAT_SERVICE_UNAVAILABLE',
  Timeout: 'AEAT_TIMEOUT',
  CircuitBreakerOpen: 'AEAT_CIRCUIT_BREAKER_OPEN',

  // Certificados
  CertificateNotFound: 'AEAT_CERT_NOT_FOUND',
  CertificateInvalid: 'AEAT_CERT_INVALID',
  CertificateExpired: 'AEAT_CERT_EXPIRED',

  // Facturación
  RegistrationFailed: 'AEAT_REGISTRATION_FAILED',
  ConsultationFailed: 'AEAT_CONSULTATION_FAILED',
  ValidationError: 'AEAT_VALIDATION_ERROR',

  // Respuestas AEAT
  RejectedComplete: 'AEAT_REJECTED_COMPLETE',
  RejectedPartial: 'AEAT_REJECTED_PARTIAL',
  AcceptedWithWarnings: 'AEAT_ACCEPTED_WITH_WARNINGS',

  // Sidecar
  SidecarStartFailed: 'AEAT_SIDECAR_START_FAILED',
  SidecarStopFailed: 'AEAT_SIDECAR_STOP_FAILED',
  SidecarNotRunning: 'AEAT_SIDECAR_NOT_RUNNING',
  SidecarCrashed: 'AEAT_SIDECAR_CRASHED',

  // Configuración
  ConfigurationInvalid: 'AEAT_CONFIG_INVALID',
  ModeNotAvailable: 'AEAT_MODE_NOT_AVAILABLE',
} as const;

// ==================== Type Definitions ====================
export type StorageErrorCode = ErrorCode<typeof StorageErrorCode>;
export type PrinterErrorCode = ErrorCode<typeof PrinterErrorCode>;
export type OrderErrorCode = ErrorCode<typeof OrderErrorCode>;
export type ProductErrorCode = ErrorCode<typeof ProductErrorCode>;
export type CategoryErrorCode = ErrorCode<typeof CategoryErrorCode>;
export type CustomerErrorCode = ErrorCode<typeof CustomerErrorCode>;
export type AuthErrorCode = ErrorCode<typeof AuthErrorCode>;
export type NetworkErrorCode = ErrorCode<typeof NetworkErrorCode>;
export type AEATErrorCode = ErrorCode<typeof AEATErrorCode>;

// All error codes union
export type AppErrorCode =
  | StorageErrorCode
  | PrinterErrorCode
  | OrderErrorCode
  | ProductErrorCode
  | CategoryErrorCode
  | CustomerErrorCode
  | AuthErrorCode
  | NetworkErrorCode
  | AEATErrorCode;

// Type alias for storage-related Result errors
export type StorageResultError = ResultError<StorageErrorCode>;
export type PrinterResultError = ResultError<PrinterErrorCode>;
export type AEATResultError = ResultError<AEATErrorCode>;

// Re-export from no-throw for convenience
export type { ErrorCode, ResultError } from '@mks2508/no-throw';
