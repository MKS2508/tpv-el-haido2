import { isErr, tryCatchAsync, type Result } from '@mks2508/no-throw';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { createContextLogger } from '@/lib/logger';
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
import { loadPrinterConfig, printOrder } from '@/services/thermal-printer.service';
import type { LicenseStatus } from '@/types/license';
import type {
  AuditPlatformResult,
  PlatformError,
  PlatformService,
  StoragePlatformResult,
  UpdateCheckResult,
} from './PlatformService';

const log = createContextLogger('TauriPlatformService');

/**
 * PlatformService implementation for Tauri (Desktop)
 *
 * Uses Tauri plugins for native platform features.
 */
export class TauriPlatformService implements PlatformService {
  // ================================
  // THERMAL PRINTER
  // ================================

  async printTicket(order: Order): Promise<void> {
    // Sin callers hoy (verificado: cero referencias a platformService.printTicket en
    // components — el path real de impresión vive en NewOrder.tsx, que sí tiene acceso a
    // store.state.taxRate). Se mantiene por conformidad de interfaz; ivaRate=0 (sin
    // desglose) al no tener acceso al store desde esta capa.
    const configResult = await loadPrinterConfig();
    if (isErr(configResult) || configResult.value === null) {
      throw new Error('Impresora no configurada. Ve a Ajustes > Impresión.');
    }
    const result = await printOrder(order, configResult.value, 0);
    if (isErr(result)) throw new Error(result.error.message);
  }

  async printReceipt(order: Order): Promise<void> {
    return this.printTicket(order);
  }

  // ================================
  // FILE DIALOGS
  // ================================

  async openFileDialog(): Promise<string | null> {
    try {
      const selected = await open({
        title: 'Seleccionar archivo',
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'Todos los archivos', extensions: ['*'] },
        ],
      });
      log.debug(`File selected: ${selected as string | null}`);
      return selected as string | null;
    } catch (error) {
      log.error('Error opening file dialog:', error instanceof Error ? error : undefined);
      return null;
    }
  }

  async saveFileDialog(): Promise<string | null> {
    try {
      const filePath = await save({
        title: 'Guardar archivo',
        defaultPath: 'datos_exportados.json',
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'Todos los archivos', extensions: ['*'] },
        ],
      });
      log.debug(`Save path selected: ${filePath as string | null}`);
      return filePath;
    } catch (error) {
      log.error('Error opening save dialog:', error instanceof Error ? error : undefined);
      return null;
    }
  }

  // ================================
  // UPDATER — full OTA channel via mks-ota v0.3.0
  // ================================

  async checkForUpdates(): Promise<Result<UpdateCheckResult, PlatformError>> {
    return tryCatchAsync(
      () => invoke<UpdateCheckResult>('check_full_update'),
      'BACKEND_FAILED',
    );
  }

  async downloadAndInstall(): Promise<Result<void, PlatformError>> {
    return tryCatchAsync(
      async () => { await invoke('download_and_install_update'); },
      'BACKEND_FAILED',
    );
  }

  // ================================
  // PLATFORM DETECTION
  // ================================

  isTauri(): boolean {
    return true;
  }

  getVersion(): string {
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
  }

  // ================================
  // LICENSE MANAGEMENT
  // ================================

  canUseLicenseSystem(): boolean {
    return true;
  }

  async checkLicense(): Promise<LicenseStatus> {
    try {
      return await invoke<LicenseStatus>('check_license_status');
    } catch (error) {
      log.error('Error checking license:', error instanceof Error ? error : undefined);
      return {
        isActivated: false,
        isValid: false,
        errorMessage: 'Error al verificar licencia',
      };
    }
  }

  async validateLicense(key: string, email: string): Promise<LicenseStatus> {
    try {
      return await invoke<LicenseStatus>('validate_and_activate_license', {
        key,
        email,
      });
    } catch (error) {
      log.error('Error validating license:', error instanceof Error ? error : undefined);
      return {
        isActivated: false,
        isValid: false,
        errorMessage: 'Error de conexión con el servidor de licencias',
      };
    }
  }

  async clearLicense(): Promise<void> {
    try {
      await invoke('clear_license');
      log.info('License cleared successfully');
    } catch (error) {
      log.error('Error clearing license:', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async getMachineFingerprint(): Promise<string> {
    try {
      return await invoke<string>('get_machine_fingerprint');
    } catch (error) {
      log.error('Error getting fingerprint:', error instanceof Error ? error : undefined);
      return '';
    }
  }

  // ================================
  // AUDIT LOGS (AEAT VERI*FACTU regulatory surface)
  // ================================
  // 1:1 port of the four raw `invoke()` calls previously in
  // src/services/audit.service.ts. Same Tauri command strings, same payload
  // shapes (`{ request }`, `{ filter }`, `{ options }`, `{ cutoffDate }`).
  // Wrapped in `tryCatchAsync` with `PlatformError` so consumers get the
  // unified Result<…, PlatformError> shape required by PlatformService.

  async createAuditLog(request: IAuditLogCreateRequest): AuditPlatformResult<number> {
    return tryCatchAsync(() => invoke<number>('create_audit_log', { request }), 'BACKEND_FAILED');
  }

  async getAuditLogs(filter?: IAuditLogFilter): AuditPlatformResult<IAuditLog[]> {
    return tryCatchAsync(
      () => invoke<IAuditLog[]>('get_audit_logs', { filter: filter ?? {} }),
      'BACKEND_FAILED'
    );
  }

  async exportAuditLogs(
    options: IAuditLogExportOptions
  ): AuditPlatformResult<IAuditLogExportResult> {
    return tryCatchAsync(
      () => invoke<IAuditLogExportResult>('export_audit_logs', { options }),
      'BACKEND_FAILED'
    );
  }

  async cleanupAuditLogs(cutoffDate: string): AuditPlatformResult<number> {
    return tryCatchAsync(
      () => invoke<number>('cleanup_audit_logs', { cutoffDate }),
      'BACKEND_FAILED'
    );
  }

  // ================================
  // STORAGE CRUD (SQLite via Tauri commands)
  // ================================
  // 1:1 port of the 23 raw `invoke()` calls previously in
  // src/services/sqlite-storage-adapter.ts. Same Tauri command strings,
  // same payload shapes (e.g. `{ product }`, `{ id: x.id }`, `{ data }`).
  // Wrapped in `tryCatchAsync` with `PlatformError` for unified Result shape.

  // Products
  async getProducts(): StoragePlatformResult<Product[]> {
    return tryCatchAsync(() => invoke<Product[]>('get_products'), 'BACKEND_FAILED');
  }
  async createProduct(product: Product): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('create_product', { product }), 'BACKEND_FAILED');
  }
  async updateProduct(product: Product): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('update_product', { product }), 'BACKEND_FAILED');
  }
  async deleteProduct(product: Product): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('delete_product', { id: product.id }), 'BACKEND_FAILED');
  }

  // Categories
  async getCategories(): StoragePlatformResult<Category[]> {
    return tryCatchAsync(() => invoke<Category[]>('get_categories'), 'BACKEND_FAILED');
  }
  async createCategory(category: Category): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('create_category', { category }), 'BACKEND_FAILED');
  }
  async updateCategory(category: Category): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('update_category', { category }), 'BACKEND_FAILED');
  }
  async deleteCategory(category: Category): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('delete_category', { id: category.id }), 'BACKEND_FAILED');
  }

  // Orders
  async getOrders(): StoragePlatformResult<Order[]> {
    return tryCatchAsync(() => invoke<Order[]>('get_orders'), 'BACKEND_FAILED');
  }
  async createOrder(order: Order): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('create_order', { order }), 'BACKEND_FAILED');
  }
  async updateOrder(order: Order): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('update_order', { order }), 'BACKEND_FAILED');
  }
  async deleteOrder(order: Order): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('delete_order', { id: order.id }), 'BACKEND_FAILED');
  }

  // Tables
  async getTables(): StoragePlatformResult<Table[]> {
    return tryCatchAsync(() => invoke<Table[]>('get_tables'), 'BACKEND_FAILED');
  }
  async createTable(table: Table): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('create_table', { table }), 'BACKEND_FAILED');
  }
  async updateTable(table: Table): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('update_table', { table }), 'BACKEND_FAILED');
  }
  async deleteTable(table: Table): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('delete_table', { id: table.id }), 'BACKEND_FAILED');
  }

  // Users
  async getUsers(): StoragePlatformResult<User[]> {
    return tryCatchAsync(() => invoke<User[]>('get_users'), 'BACKEND_FAILED');
  }
  async createUser(user: User): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('create_user', { user }), 'BACKEND_FAILED');
  }
  async updateUser(user: User): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('update_user', { user }), 'BACKEND_FAILED');
  }
  async deleteUser(user: User): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('delete_user', { id: user.id }), 'BACKEND_FAILED');
  }

  // Utility
  async clearAllData(): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('clear_all_data'), 'BACKEND_FAILED');
  }
  async exportData(): StoragePlatformResult<{
    products: Product[];
    categories: Category[];
    orders: Order[];
  }> {
    return tryCatchAsync(() => invoke('export_data'), 'BACKEND_FAILED');
  }
  async importData(data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): StoragePlatformResult<void> {
    return tryCatchAsync(() => invoke('import_data', { data }), 'BACKEND_FAILED');
  }
}
