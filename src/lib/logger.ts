/**
 * Configuración centralizada de logging con @mks2508/better-logger.
 * Proporciona loggers por componente para trazabilidad estructurada.
 */
import logger from '@mks2508/better-logger';
import type { ResultError } from '@mks2508/no-throw';

/** Logger para el servicio de auditoría */
export const auditLog = logger.component('AuditService');

/** Logger para el store principal */
export const storeLog = logger.component('Store');

/** Logger para los storage adapters */
export const storageLog = logger.component('StorageAdapter');

/** Logger para el servicio de impresión */
export const printerLog = logger.component('PrinterService');

/** Logger para el servicio AEAT */
export const aeatLog = logger.component('AEATService');

/** Logger para autenticación */
export const authLog = logger.component('Auth');

/**
 * Log a ResultError with structured information
 *
 * @param context - Module or feature context (e.g., 'store', 'useAEAT')
 * @param operation - Operation that failed (e.g., 'loadProducts', 'testConnection')
 * @param error - The ResultError to log
 */
export function logResultError(
  context: string,
  operation: string,
  error: ResultError<string>
): void {
  logger.error(context, `${operation} failed`, {
    code: error.code,
    message: error.message,
    ...(error.cause && { cause: error.cause }),
  });
}

/**
 * Log a successful operation with optional metadata
 *
 * @param context - Module or feature context
 * @param operation - Operation that succeeded
 * @param meta - Optional metadata to include in the log
 */
export function logSuccess(
  context: string,
  operation: string,
  meta?: Record<string, unknown>
): void {
  logger.info(context, `${operation} succeeded`, meta);
}

/**
 * Debug level logging with context
 *
 * @param context - Module or feature context
 * @param message - Debug message
 * @param meta - Optional metadata
 */
export function logDebug(context: string, message: string, meta?: Record<string, unknown>): void {
  logger.debug(context, message, meta);
}

/**
 * Warning level logging with context
 *
 * @param context - Module or feature context
 * @param message - Warning message
 * @param meta - Optional metadata
 */
export function logWarn(context: string, message: string, meta?: Record<string, unknown>): void {
  logger.warn(context, message, meta);
}

/**
 * Create a context-specific logger
 *
 * Usage:
 * ```ts
 * const storeLog = createContextLogger('store');
 * storeLog.info('Products loaded', { count: 42 });
 * ```
 *
 * @param context - Context prefix for all log messages
 * @returns Logger object with info, warn, error, debug methods
 */
export function createContextLogger(context: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) => logger.info(context, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => logWarn(context, message, meta),
    error: (message: string, error?: Error | ResultError<string>) =>
      logger.error(context, message, error),
    debug: (message: string, meta?: Record<string, unknown>) => logDebug(context, message, meta),
    success: (operation: string, meta?: Record<string, unknown>) =>
      logSuccess(context, operation, meta),
    resultError: (operation: string, error: ResultError<string>) =>
      logResultError(context, operation, error),
  };
}

export default logger;
