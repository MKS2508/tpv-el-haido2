import type { Result, ResultError } from '@mks2508/no-throw';
import type {
  IAuditLog,
  IAuditLogCreateRequest,
  IAuditLogExportOptions,
  IAuditLogExportResult,
  IAuditLogFilter,
} from '@/models/AuditLog';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type User from '@/models/User';
import type { LicenseStatus } from '@/types/license';

/**
 * Generic platform-level error code. Surface method results (storage CRUD, audit)
 * map to a small set of platform-runtime failure modes (UNSUPPORTED_PLATFORM,
 * BACKEND_FAILED, INVALID_PAYLOAD).
 */
export type PlatformErrorCode = 'UNSUPPORTED_PLATFORM' | 'BACKEND_FAILED' | 'INVALID_PAYLOAD';

/** Structured error returned by PlatformService methods. */
export type PlatformError = ResultError<PlatformErrorCode>;

/** Audit method return shape (mirrors existing audit.service.ts). */
export type AuditPlatformResult<T> = Promise<Result<T, PlatformError>>;

/** Storage CRUD method return shape (mirrors the audit pattern). */
export type StoragePlatformResult<T> = Promise<Result<T, PlatformError>>;

export interface PlatformService {
  // ================================
  // PRINTER - Thermal Printer Service
  // ================================
  /**
   * Print a complete ticket for an order
   * In Tauri: uses thermal printer plugin
   * In PWA: opens in new tab/window
   */
  printTicket(order: Order): Promise<void>;

  /**
   * Print just the receipt part of an order
   * In Tauri: uses thermal printer plugin
   * In PWA: alerts (not available)
   */
  printReceipt(order: Order): Promise<void>;

  // ================================
  // FILE DIALOGS
  // ================================
  /**
   * Open native file picker to select a file for import
   * In Tauri: uses @tauri-apps/plugin-dialog
   * In PWA: uses browser prompt
   * @returns File path as string, or null if cancelled
   */
  openFileDialog(): Promise<string | null>;

  /**
   * Open native file picker to save/export a file
   * In Tauri: uses @tauri-apps/plugin-dialog
   * In PWA: uses browser prompt/download
   * @returns File path as string, or null if cancelled
   */
  saveFileDialog(): Promise<string | null>;

  // ================================
  // PLATFORM DETECTION
  // ================================
  /**
   * Check if running in Tauri environment
   * @returns true if Tauri, false if PWA (web)
   */
  isTauri(): boolean;

  /**
   * Get application version
   * In Tauri: reads from package.json or env
   * In PWA: reads from process.env or build config
   * @returns Version string (e.g., "1.0.0")
   */
  getVersion(): string;

  // ================================
  // LICENSE MANAGEMENT
  // ================================
  /**
   * Check if the platform supports the license system
   * In Tauri: true (has machine fingerprint)
   * In PWA: false (no native fingerprinting)
   * @returns true if license system is available
   */
  canUseLicenseSystem(): boolean;

  /**
   * Check current license status
   * In Tauri: queries local SQLite database
   * In PWA: returns always-valid status (skip license)
   * @returns Current license status
   */
  checkLicense(): Promise<LicenseStatus>;

  /**
   * Validate and activate a license
   * In Tauri: validates with server and stores locally
   * In PWA: no-op, returns valid status
   * @param key License key (format: XXXX-XXXX-XXXX-XXXX)
   * @param email User email
   * @returns Updated license status
   */
  validateLicense(key: string, email: string): Promise<LicenseStatus>;

  /**
   * Clear/revoke the current license
   * In Tauri: removes from local SQLite database
   * In PWA: no-op
   */
  clearLicense(): Promise<void>;

  /**
   * Get machine fingerprint for license binding
   * In Tauri: generates unique machine ID
   * In PWA: returns empty string (not available)
   * @returns Machine fingerprint string
   */
  getMachineFingerprint(): Promise<string>;

  // ================================
  // AUDIT LOGS (AEAT VERI*FACTU regulatory surface)
  // ================================
  /**
   * Create an audit log entry.
   * In Tauri: persists to SQLite via `create_audit_log` command.
   * In PWA: stub returning `UNSUPPORTED_PLATFORM` so compliance gaps stay visible.
   * @returns Result with the created log row id, or platform-level error.
   */
  createAuditLog(request: IAuditLogCreateRequest): AuditPlatformResult<number>;

  /**
   * Query audit logs with optional filters.
   * In Tauri: queries SQLite via `get_audit_logs` command.
   * In PWA: stub returning `UNSUPPORTED_PLATFORM`.
   * @returns Result with array of audit logs, or platform-level error.
   */
  getAuditLogs(filter?: IAuditLogFilter): AuditPlatformResult<IAuditLog[]>;

  /**
   * Export audit logs in CSV or JSON format.
   * In Tauri: invokes `export_audit_logs` (returns content or file path).
   * In PWA: stub returning `UNSUPPORTED_PLATFORM`.
   * @returns Result with export payload, or platform-level error.
   */
  exportAuditLogs(options: IAuditLogExportOptions): AuditPlatformResult<IAuditLogExportResult>;

  /**
   * Delete audit logs older than the cutoff date.
   * In Tauri: invokes `cleanup_audit_logs` (returns deleted row count).
   * In PWA: stub returning `UNSUPPORTED_PLATFORM`.
   * @returns Result with deleted row count, or platform-level error.
   */
  cleanupAuditLogs(cutoffDate: string): AuditPlatformResult<number>;

  // ================================
  // STORAGE CRUD (SQLite via Tauri commands)
  // ================================
  // 1:1 port of the 23 raw `invoke()` calls previously in
  // src/services/sqlite-storage-adapter.ts. Each method maps to a single
  // Tauri command. Wrapped in `tryCatchAsync` with `PlatformError` so the
  // adapter can convert to its own `StorageResult<T>` via a small
  // `toStorageError<T>()` bridge, mirroring the audit pattern.

  // Products
  getProducts(): StoragePlatformResult<Product[]>;
  createProduct(product: Product): StoragePlatformResult<void>;
  updateProduct(product: Product): StoragePlatformResult<void>;
  deleteProduct(product: Product): StoragePlatformResult<void>;

  // Categories
  getCategories(): StoragePlatformResult<Category[]>;
  createCategory(category: Category): StoragePlatformResult<void>;
  updateCategory(category: Category): StoragePlatformResult<void>;
  deleteCategory(category: Category): StoragePlatformResult<void>;

  // Orders
  getOrders(): StoragePlatformResult<Order[]>;
  createOrder(order: Order): StoragePlatformResult<void>;
  updateOrder(order: Order): StoragePlatformResult<void>;
  deleteOrder(order: Order): StoragePlatformResult<void>;

  // Tables
  getTables(): StoragePlatformResult<Table[]>;
  createTable(table: Table): StoragePlatformResult<void>;
  updateTable(table: Table): StoragePlatformResult<void>;
  deleteTable(table: Table): StoragePlatformResult<void>;

  // Users
  getUsers(): StoragePlatformResult<User[]>;
  createUser(user: User): StoragePlatformResult<void>;
  updateUser(user: User): StoragePlatformResult<void>;
  deleteUser(user: User): StoragePlatformResult<void>;

  // Utility
  clearAllData(): StoragePlatformResult<void>;
  exportData(): StoragePlatformResult<{
    products: Product[];
    categories: Category[];
    orders: Order[];
  }>;
  importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): StoragePlatformResult<void>;
}
