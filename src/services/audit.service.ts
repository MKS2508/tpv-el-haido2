/**
 * Servicio de auditoría que registra todas las operaciones del TPV.
 * Envuelve los comandos Tauri de auditoría con el Result pattern de @mks2508/no-throw.
 *
 * Las operaciones de logging son fire-and-forget: no bloquean la UI
 * y los fallos se registran en el logger pero no interrumpen la operación principal.
 */
import { type Result, type ResultError, tryCatchAsync } from '@mks2508/no-throw';
import { invoke } from '@tauri-apps/api/core';
import { AuditErrorCode, type AuditErrorCode as AuditErrorCodeType } from '@/lib/error-codes';
import { auditLog } from '@/lib/logger';
import type {
  AuditEntityType,
  AuditOperationType,
  IAuditLog,
  IAuditLogCreateRequest,
  IAuditLogExportOptions,
  IAuditLogExportResult,
  IAuditLogFilter,
} from '@/models/AuditLog';

type AuditResult<T> = Result<T, ResultError<AuditErrorCodeType>>;

/**
 * Crea un log de auditoría en la base de datos.
 * @param request - Datos del log a crear
 * @returns Result con el ID del log creado o error
 */
export async function createAuditLog(
  request: IAuditLogCreateRequest
): Promise<AuditResult<number>> {
  return tryCatchAsync(
    async () => invoke<number>('create_audit_log', { request }),
    AuditErrorCode.CreateFailed
  );
}

/**
 * Consulta logs de auditoría con filtros opcionales.
 * @param filter - Filtros de búsqueda
 * @returns Result con array de logs o error
 */
export async function getAuditLogs(filter?: IAuditLogFilter): Promise<AuditResult<IAuditLog[]>> {
  return tryCatchAsync(
    async () => invoke<IAuditLog[]>('get_audit_logs', { filter: filter ?? {} }),
    AuditErrorCode.ReadFailed
  );
}

/**
 * Exporta logs de auditoría en formato JSON o CSV.
 * @param options - Opciones de exportación (formato y filtros)
 * @returns Result con el contenido exportado o error
 */
export async function exportAuditLogs(
  options: IAuditLogExportOptions
): Promise<AuditResult<IAuditLogExportResult>> {
  return tryCatchAsync(
    async () => invoke<IAuditLogExportResult>('export_audit_logs', { options }),
    AuditErrorCode.ExportFailed
  );
}

/**
 * Elimina logs anteriores a la fecha de corte.
 * @param cutoffDate - Fecha límite en formato YYYY-MM-DD
 * @returns Result con el número de registros eliminados o error
 */
export async function cleanupAuditLogs(cutoffDate: string): Promise<AuditResult<number>> {
  return tryCatchAsync(
    async () => invoke<number>('cleanup_audit_logs', { cutoffDate }),
    AuditErrorCode.CleanupFailed
  );
}

// ==================== Métodos de conveniencia ====================

/**
 * Contexto base para crear un audit log.
 * Extraído del store (usuario activo + NIF del negocio).
 */
export interface IAuditContext {
  userId: number;
  userName: string;
  businessNif: string;
  sessionId?: string;
}

/**
 * Registra una operación de auditoría de forma no bloqueante.
 * Si falla, se registra en el logger pero no interrumpe la operación principal.
 */
async function logOperation(
  ctx: IAuditContext,
  operationType: AuditOperationType,
  entityType: AuditEntityType,
  options?: {
    entityId?: string;
    operationDetails?: string;
    oldValues?: unknown;
    newValues?: unknown;
    success?: boolean;
    errorCode?: string;
    errorMessage?: string;
    tableNumber?: number;
    orderId?: number;
    paymentMethod?: string;
  }
): Promise<void> {
  const request: IAuditLogCreateRequest = {
    userId: ctx.userId,
    userName: ctx.userName,
    operationType,
    entityType,
    businessNif: ctx.businessNif,
    sessionId: ctx.sessionId,
    entityId: options?.entityId,
    operationDetails: options?.operationDetails,
    oldValues: options?.oldValues ? JSON.stringify(options.oldValues) : undefined,
    newValues: options?.newValues ? JSON.stringify(options.newValues) : undefined,
    success: options?.success ?? true,
    errorCode: options?.errorCode,
    errorMessage: options?.errorMessage,
    tableNumber: options?.tableNumber,
    orderId: options?.orderId,
    paymentMethod: options?.paymentMethod,
  };

  const result = await createAuditLog(request);
  if (!result.ok) {
    auditLog.warn(`Failed to log ${operationType} on ${entityType}:`, result.error.message);
  }
}

// ==================== Auth ====================

/** Registra un login exitoso o fallido */
export async function logLogin(
  ctx: IAuditContext,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await logOperation(ctx, 'login', 'session', { success, errorMessage });
}

/** Registra un logout */
export async function logLogout(ctx: IAuditContext): Promise<void> {
  await logOperation(ctx, 'logout', 'session');
}

// ==================== Products ====================

/** Registra la creación de un producto */
export async function logProductCreate(
  ctx: IAuditContext,
  productId: string,
  newValues: unknown
): Promise<void> {
  await logOperation(ctx, 'product_create', 'product', { entityId: productId, newValues });
}

/** Registra la actualización de un producto */
export async function logProductUpdate(
  ctx: IAuditContext,
  productId: string,
  oldValues: unknown,
  newValues: unknown
): Promise<void> {
  await logOperation(ctx, 'product_update', 'product', {
    entityId: productId,
    oldValues,
    newValues,
  });
}

/** Registra la eliminación de un producto */
export async function logProductDelete(
  ctx: IAuditContext,
  productId: string,
  oldValues: unknown
): Promise<void> {
  await logOperation(ctx, 'product_delete', 'product', { entityId: productId, oldValues });
}

// ==================== Categories ====================

/** Registra la creación de una categoría */
export async function logCategoryCreate(
  ctx: IAuditContext,
  categoryId: string,
  newValues: unknown
): Promise<void> {
  await logOperation(ctx, 'category_create', 'category', { entityId: categoryId, newValues });
}

/** Registra la actualización de una categoría */
export async function logCategoryUpdate(
  ctx: IAuditContext,
  categoryId: string,
  oldValues: unknown,
  newValues: unknown
): Promise<void> {
  await logOperation(ctx, 'category_update', 'category', {
    entityId: categoryId,
    oldValues,
    newValues,
  });
}

/** Registra la eliminación de una categoría */
export async function logCategoryDelete(
  ctx: IAuditContext,
  categoryId: string,
  oldValues: unknown
): Promise<void> {
  await logOperation(ctx, 'category_delete', 'category', { entityId: categoryId, oldValues });
}

// ==================== Orders ====================

/** Registra la creación de un pedido */
export async function logOrderCreate(
  ctx: IAuditContext,
  orderId: number,
  newValues: unknown,
  tableNumber?: number
): Promise<void> {
  await logOperation(ctx, 'order_create', 'order', {
    entityId: String(orderId),
    newValues,
    orderId,
    tableNumber,
  });
}

/** Registra la actualización de un pedido */
export async function logOrderUpdate(
  ctx: IAuditContext,
  orderId: number,
  oldValues: unknown,
  newValues: unknown
): Promise<void> {
  await logOperation(ctx, 'order_update', 'order', {
    entityId: String(orderId),
    oldValues,
    newValues,
    orderId,
  });
}

/** Registra la finalización de un pedido */
export async function logOrderComplete(
  ctx: IAuditContext,
  orderId: number,
  details: unknown,
  paymentMethod?: string
): Promise<void> {
  await logOperation(ctx, 'order_complete', 'order', {
    entityId: String(orderId),
    newValues: details,
    orderId,
    paymentMethod,
  });
}

/** Registra la cancelación de un pedido */
export async function logOrderCancel(
  ctx: IAuditContext,
  orderId: number,
  reason?: string
): Promise<void> {
  await logOperation(ctx, 'order_cancel', 'order', {
    entityId: String(orderId),
    operationDetails: reason,
    orderId,
  });
}

// ==================== Payments ====================

/** Registra el procesamiento de un pago */
export async function logPayment(
  ctx: IAuditContext,
  orderId: number,
  paymentMethod: string,
  details: unknown
): Promise<void> {
  await logOperation(ctx, 'payment_process', 'payment', {
    entityId: String(orderId),
    newValues: details,
    orderId,
    paymentMethod,
  });
}

// ==================== Tables ====================

/** Registra la asignación de una mesa */
export async function logTableAssign(
  ctx: IAuditContext,
  tableNumber: number,
  orderId?: number
): Promise<void> {
  await logOperation(ctx, 'table_assign', 'table', {
    entityId: String(tableNumber),
    tableNumber,
    orderId,
  });
}

/** Registra la liberación de una mesa */
export async function logTableClear(ctx: IAuditContext, tableNumber: number): Promise<void> {
  await logOperation(ctx, 'table_clear', 'table', { entityId: String(tableNumber), tableNumber });
}

// ==================== Users ====================

/** Registra la creación de un usuario */
export async function logUserCreate(
  ctx: IAuditContext,
  userId: string,
  newValues: unknown
): Promise<void> {
  await logOperation(ctx, 'user_create', 'user', { entityId: userId, newValues });
}

/** Registra la actualización de un usuario */
export async function logUserUpdate(
  ctx: IAuditContext,
  userId: string,
  oldValues: unknown,
  newValues: unknown
): Promise<void> {
  await logOperation(ctx, 'user_update', 'user', { entityId: userId, oldValues, newValues });
}

/** Registra la eliminación de un usuario */
export async function logUserDelete(
  ctx: IAuditContext,
  userId: string,
  oldValues: unknown
): Promise<void> {
  await logOperation(ctx, 'user_delete', 'user', { entityId: userId, oldValues });
}

// ==================== Data ====================

/** Registra una exportación de datos */
export async function logDataExport(ctx: IAuditContext, details?: string): Promise<void> {
  await logOperation(ctx, 'data_export', 'system', { operationDetails: details });
}

/** Registra una importación de datos */
export async function logDataImport(ctx: IAuditContext, details?: string): Promise<void> {
  await logOperation(ctx, 'data_import', 'system', { operationDetails: details });
}

// ==================== System ====================

/** Registra un cambio en la configuración */
export async function logSettingsChange(
  ctx: IAuditContext,
  setting: string,
  oldValue: unknown,
  newValue: unknown
): Promise<void> {
  await logOperation(ctx, 'settings_change', 'settings', {
    operationDetails: setting,
    oldValues: oldValue,
    newValues: newValue,
  });
}

/** Registra la activación de una licencia */
export async function logLicenseActivate(ctx: IAuditContext, licenseKey: string): Promise<void> {
  await logOperation(ctx, 'license_activate', 'license', {
    operationDetails: `License activated: ${licenseKey}`,
  });
}

/** Registra la desactivación de una licencia */
export async function logLicenseDeactivate(ctx: IAuditContext): Promise<void> {
  await logOperation(ctx, 'license_deactivate', 'license');
}
