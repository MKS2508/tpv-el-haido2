/**
 * Tipos de operaciones de auditoría.
 * Deben coincidir con AuditOperationType en src-tauri/src/models/audit.rs (snake_case via serde).
 */
export type AuditOperationType =
  // Autenticación
  | 'login'
  | 'logout'
  // Productos
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  // Categorías
  | 'category_create'
  | 'category_update'
  | 'category_delete'
  // Pedidos
  | 'order_create'
  | 'order_update'
  | 'order_delete'
  | 'order_complete'
  | 'order_cancel'
  // Pagos
  | 'payment_process'
  // Mesas
  | 'table_assign'
  | 'table_clear'
  // Usuarios
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  // Datos
  | 'data_export'
  | 'data_import'
  // Sistema
  | 'settings_change'
  | 'license_activate'
  | 'license_deactivate';

/**
 * Tipos de entidades de auditoría.
 * Deben coincidir con AuditEntityType en src-tauri/src/models/audit.rs (snake_case via serde).
 */
export type AuditEntityType =
  | 'product'
  | 'category'
  | 'order'
  | 'table'
  | 'user'
  | 'license'
  | 'settings'
  | 'payment'
  | 'session'
  | 'system';

/** Formato de exportación de logs de auditoría */
export type AuditExportFormat = 'json' | 'csv';

/**
 * Entrada de log de auditoría.
 * Refleja AuditLog en src-tauri/src/models/audit.rs (camelCase via serde).
 */
export interface IAuditLog {
  id: number;
  timestamp: number;
  date: string;
  time: string;
  userId: number;
  userName: string;
  operationType: string;
  entityType: string;
  entityId?: string;
  businessNif: string;
  operationDetails?: string;
  oldValues?: string;
  newValues?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  tableNumber?: number;
  orderId?: number;
  paymentMethod?: string;
  createdAt: number;
}

/**
 * Request para crear un log de auditoría.
 * Refleja AuditLogCreateRequest en src-tauri/src/models/audit.rs.
 */
export interface IAuditLogCreateRequest {
  userId: number;
  userName: string;
  operationType: AuditOperationType;
  entityType: AuditEntityType;
  entityId?: string;
  businessNif: string;
  operationDetails?: string;
  oldValues?: string;
  newValues?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  sessionId?: string;
  tableNumber?: number;
  orderId?: number;
  paymentMethod?: string;
}

/**
 * Filtros para consultar logs de auditoría.
 * Refleja AuditLogFilter en src-tauri/src/models/audit.rs.
 */
export interface IAuditLogFilter {
  startDate?: string;
  endDate?: string;
  userId?: number;
  operationType?: AuditOperationType;
  entityType?: AuditEntityType;
  businessNif?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Opciones para exportar logs de auditoría.
 * Refleja AuditLogExportOptions en src-tauri/src/models/audit.rs.
 */
export interface IAuditLogExportOptions {
  format: AuditExportFormat;
  filter?: IAuditLogFilter;
}

/**
 * Resultado de exportación de logs de auditoría.
 * Refleja AuditLogExportResult en src-tauri/src/models/audit.rs.
 */
export interface IAuditLogExportResult {
  format: string;
  recordCount: number;
  filePath?: string;
  content?: string;
}

export default IAuditLog;
