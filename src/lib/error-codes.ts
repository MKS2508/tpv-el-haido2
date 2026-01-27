import { type ErrorCode, type ResultError } from '@mks2508/no-throw'

// ==================== Storage Errors ====================
export const StorageErrorCode = {
  ConnectionFailed: 'STORAGE_CONNECTION_FAILED',
  ReadFailed: 'STORAGE_READ_FAILED',
  WriteFailed: 'STORAGE_WRITE_FAILED',
  DeleteFailed: 'STORAGE_DELETE_FAILED',
  NotFound: 'STORAGE_NOT_FOUND',
  InvalidData: 'STORAGE_INVALID_DATA',
} as const

// ==================== Printer Errors ====================
export const PrinterErrorCode = {
  ConnectionFailed: 'PRINTER_CONNECTION_FAILED',
  PrintFailed: 'PRINTER_PRINT_FAILED',
  CashDrawerFailed: 'PRINTER_CASH_DRAWER_FAILED',
  ConfigError: 'PRINTER_CONFIG_ERROR',
  TestFailed: 'PRINTER_TEST_FAILED',
} as const

// ==================== Order Errors ====================
export const OrderErrorCode = {
  CreateFailed: 'ORDER_CREATE_FAILED',
  UpdateFailed: 'ORDER_UPDATE_FAILED',
  DeleteFailed: 'ORDER_DELETE_FAILED',
  NotFound: 'ORDER_NOT_FOUND',
  InvalidState: 'ORDER_INVALID_STATE',
} as const

// ==================== Product Errors ====================
export const ProductErrorCode = {
  LoadFailed: 'PRODUCT_LOAD_FAILED',
  CreateFailed: 'PRODUCT_CREATE_FAILED',
  UpdateFailed: 'PRODUCT_UPDATE_FAILED',
  DeleteFailed: 'PRODUCT_DELETE_FAILED',
} as const

// ==================== Category Errors ====================
export const CategoryErrorCode = {
  LoadFailed: 'CATEGORY_LOAD_FAILED',
  CreateFailed: 'CATEGORY_CREATE_FAILED',
  UpdateFailed: 'CATEGORY_UPDATE_FAILED',
  DeleteFailed: 'CATEGORY_DELETE_FAILED',
} as const

// ==================== Auth Errors ====================
export const AuthErrorCode = {
  InvalidPin: 'AUTH_INVALID_PIN',
  UserNotFound: 'AUTH_USER_NOT_FOUND',
  SessionExpired: 'AUTH_SESSION_EXPIRED',
} as const

// ==================== Network Errors ====================
export const NetworkErrorCode = {
  Timeout: 'NETWORK_TIMEOUT',
  Offline: 'NETWORK_OFFLINE',
  ServerError: 'NETWORK_SERVER_ERROR',
} as const

// ==================== Type Definitions ====================
export type StorageErrorCode = ErrorCode<typeof StorageErrorCode>
export type PrinterErrorCode = ErrorCode<typeof PrinterErrorCode>
export type OrderErrorCode = ErrorCode<typeof OrderErrorCode>
export type ProductErrorCode = ErrorCode<typeof ProductErrorCode>
export type CategoryErrorCode = ErrorCode<typeof CategoryErrorCode>
export type AuthErrorCode = ErrorCode<typeof AuthErrorCode>
export type NetworkErrorCode = ErrorCode<typeof NetworkErrorCode>

// All error codes union
export type AppErrorCode =
  | StorageErrorCode
  | PrinterErrorCode
  | OrderErrorCode
  | ProductErrorCode
  | CategoryErrorCode
  | AuthErrorCode
  | NetworkErrorCode

// Type alias for storage-related Result errors
export type StorageResultError = ResultError<StorageErrorCode>
export type PrinterResultError = ResultError<PrinterErrorCode>

// Re-export from no-throw for convenience
export { type ErrorCode, type ResultError } from '@mks2508/no-throw'
