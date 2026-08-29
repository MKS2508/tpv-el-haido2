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
import type { LicenseStatus } from '@/types/license';
import { err, type Result } from '@mks2508/no-throw';
import type {
  AuditPlatformResult,
  PlatformError,
  PlatformService,
  StoragePlatformResult,
  UpdateCheckResult,
} from './PlatformService';

const log = createContextLogger('WebPlatformService');

/**
 * PlatformService implementation for PWA (Web Standalone)
 *
 * Uses browser APIs and fallbacks for platform-specific features.
 * Stub implementations for features that are Tauri-only.
 */
export class WebPlatformService implements PlatformService {
  // ================================
  // THERMAL PRINTER - STUB IMPLEMENTATION
  // ================================
  async printTicket(order: Order): Promise<void> {
    // In PWA, open ticket in new tab/window
    // This is a browser-based "printing" solution
    const ticketUrl = `/ticket/${order.id}_${new Date().toISOString().split('T')[0]}.pdf`;

    log.debug(`Opening ticket URL: ${ticketUrl}`);

    try {
      window.open(ticketUrl, '_blank');
    } catch (error) {
      log.error('Failed to open ticket URL:', error instanceof Error ? error : undefined);
      alert('No se pudo abrir el ticket. Por favor, inténtalo de nuevo.');
    }
  }

  async printReceipt(_order: Order): Promise<void> {
    // Receipt printing not available in PWA version
    log.warn('Receipt printing not available in PWA version');
    alert(
      'Impresión de recibo no disponible en la versión web.\n' +
        'Usa el ticket completo en su lugar.'
    );
  }

  // ================================
  // FILE DIALOGS - PROMPT-BASED FALLBACK
  // ================================
  async openFileDialog(): Promise<string | null> {
    // In PWA, use browser prompt for file path
    // This is a simple implementation - can be improved with File System Access API
    log.debug('Opening file dialog (prompt)');

    try {
      const filePath = prompt(
        'Introduce la ruta del archivo que quieres importar:\n' + '(O déjalo vacío para cancelar)',
        ''
      );

      if (!filePath || filePath.trim() === '') {
        log.debug('File dialog cancelled');
        return null;
      }

      return filePath;
    } catch (error) {
      log.error('File dialog failed:', error instanceof Error ? error : undefined);
      return null;
    }
  }

  async saveFileDialog(): Promise<string | null> {
    // In PWA, use browser prompt for filename
    // File can then be downloaded via browser download mechanism
    log.debug('Opening save dialog (prompt)');

    try {
      const filename = prompt(
        'Introduce el nombre para guardar el archivo:\n' + '(O déjalo vacío para cancelar)',
        'datos_exportados.json'
      );

      if (!filename || filename.trim() === '') {
        log.debug('Save dialog cancelled');
        return null;
      }

      return filename;
    } catch (error) {
      log.error('Save dialog failed:', error instanceof Error ? error : undefined);
      return null;
    }
  }

  // ================================
  // UPDATER - NOT APPLICABLE IN PWA
  // ================================
  async checkForUpdates(): Promise<Result<UpdateCheckResult, PlatformError>> {
    return err({
      code: 'UNSUPPORTED_PLATFORM',
      message: 'OTA updates are only available in the Tauri desktop app, not the PWA',
    });
  }

  async downloadAndInstall(): Promise<Result<void, PlatformError>> {
    return err({
      code: 'UNSUPPORTED_PLATFORM',
      message: 'OTA updates are only available in the Tauri desktop app, not the PWA',
    });
  }

  // ================================
  // PLATFORM DETECTION
  // ================================
  isTauri(): boolean {
    // This is running in PWA mode (not Tauri)
    return false;
  }

  /**
   * Get application version.
   *
   * In PWA, version is typically from build config or env variable.
   * Uses VITE_APP_VERSION if available (defined in vite.config.ts).
   * Fallback to default version.
   */
  getVersion(): string {
    // VITE_ variables are injected by Vite during build
    const version = import.meta.env.VITE_APP_VERSION;

    if (version) {
      log.debug(`App version: ${version}`);
      return version;
    }

    log.warn('No version found, using default');

    return '1.0.0';
  }

  // ================================
  // LICENSE MANAGEMENT - PWA FALLBACK
  // ================================

  canUseLicenseSystem(): boolean {
    return false;
  }

  async checkLicense(): Promise<LicenseStatus> {
    log.debug('License system not available in PWA');
    return {
      isActivated: true,
      isValid: true,
      licenseType: 'pwa',
      email: 'pwa@web.local',
      daysRemaining: null,
      expiresAt: null,
    };
  }

  async validateLicense(_key: string, _email: string): Promise<LicenseStatus> {
    log.debug('License validation skipped in PWA');
    return {
      isActivated: true,
      isValid: true,
      licenseType: 'pwa',
      email: 'pwa@web.local',
      daysRemaining: null,
      expiresAt: null,
    };
  }

  async clearLicense(): Promise<void> {
    log.debug('License clear not applicable in PWA');
  }

  async getMachineFingerprint(): Promise<string> {
    log.debug('Machine fingerprint not available in PWA');
    return '';
  }

  // ================================
  // AUDIT LOGS — NOT SUPPORTED IN PWA
  // ================================
  // Audit is an AEAT VERI*FACTU regulatory surface: backend writes are
  // SQLite-persistent and required for compliance. PWA cannot fulfill this,
  // so every stub returns `UNSUPPORTED_PLATFORM` AND logs a warning — silent
  // failures here would hide compliance gaps from ops, which is exactly the
  // regression this layer is meant to prevent.

  async createAuditLog(_request: IAuditLogCreateRequest): AuditPlatformResult<number> {
    log.warn(
      'PlatformService.createAuditLog not supported in web/PWA mode (AEAT VERI*FACTU compliance gap)'
    );
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'Audit logging requires Tauri runtime (AEAT VERI*FACTU compliance)',
      },
    };
  }

  async getAuditLogs(_filter?: IAuditLogFilter): AuditPlatformResult<IAuditLog[]> {
    log.warn(
      'PlatformService.getAuditLogs not supported in web/PWA mode (AEAT VERI*FACTU compliance gap)'
    );
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'Audit logging requires Tauri runtime (AEAT VERI*FACTU compliance)',
      },
    };
  }

  async exportAuditLogs(
    _options: IAuditLogExportOptions
  ): AuditPlatformResult<IAuditLogExportResult> {
    log.warn(
      'PlatformService.exportAuditLogs not supported in web/PWA mode (AEAT VERI*FACTU compliance gap)'
    );
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'Audit logging requires Tauri runtime (AEAT VERI*FACTU compliance)',
      },
    };
  }

  async cleanupAuditLogs(_cutoffDate: string): AuditPlatformResult<number> {
    log.warn(
      'PlatformService.cleanupAuditLogs not supported in web/PWA mode (AEAT VERI*FACTU compliance gap)'
    );
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'Audit logging requires Tauri runtime (AEAT VERI*FACTU compliance)',
      },
    };
  }

  // ================================
  // STORAGE CRUD — NOT SUPPORTED IN PWA
  // ================================
  // SQLite storage is Tauri-only. PWA cannot persist to the desktop SQLite
  // database — IndexedDbStorageAdapter handles web persistence via a
  // different code path. Every stub returns UNSUPPORTED_PLATFORM + log.warn
  // so missing-platform calls stay observable, matching the audit pattern.

  // Products
  async getProducts(): StoragePlatformResult<Product[]> {
    log.warn('PlatformService.getProducts not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async createProduct(_product: Product): StoragePlatformResult<void> {
    log.warn('PlatformService.createProduct not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async updateProduct(_product: Product): StoragePlatformResult<void> {
    log.warn('PlatformService.updateProduct not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async deleteProduct(_product: Product): StoragePlatformResult<void> {
    log.warn('PlatformService.deleteProduct not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }

  // Categories
  async getCategories(): StoragePlatformResult<Category[]> {
    log.warn('PlatformService.getCategories not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async createCategory(_category: Category): StoragePlatformResult<void> {
    log.warn('PlatformService.createCategory not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async updateCategory(_category: Category): StoragePlatformResult<void> {
    log.warn('PlatformService.updateCategory not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async deleteCategory(_category: Category): StoragePlatformResult<void> {
    log.warn('PlatformService.deleteCategory not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }

  // Orders
  async getOrders(): StoragePlatformResult<Order[]> {
    log.warn('PlatformService.getOrders not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async createOrder(_order: Order): StoragePlatformResult<void> {
    log.warn('PlatformService.createOrder not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async updateOrder(_order: Order): StoragePlatformResult<void> {
    log.warn('PlatformService.updateOrder not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async deleteOrder(_order: Order): StoragePlatformResult<void> {
    log.warn('PlatformService.deleteOrder not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }

  // Tables
  async getTables(): StoragePlatformResult<Table[]> {
    log.warn('PlatformService.getTables not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async createTable(_table: Table): StoragePlatformResult<void> {
    log.warn('PlatformService.createTable not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async updateTable(_table: Table): StoragePlatformResult<void> {
    log.warn('PlatformService.updateTable not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async deleteTable(_table: Table): StoragePlatformResult<void> {
    log.warn('PlatformService.deleteTable not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }

  // Users
  async getUsers(): StoragePlatformResult<User[]> {
    log.warn('PlatformService.getUsers not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async createUser(_user: User): StoragePlatformResult<void> {
    log.warn('PlatformService.createUser not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async updateUser(_user: User): StoragePlatformResult<void> {
    log.warn('PlatformService.updateUser not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async deleteUser(_user: User): StoragePlatformResult<void> {
    log.warn('PlatformService.deleteUser not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }

  // Utility
  async clearAllData(): StoragePlatformResult<void> {
    log.warn('PlatformService.clearAllData not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async exportData(): StoragePlatformResult<{
    products: Product[];
    categories: Category[];
    orders: Order[];
  }> {
    log.warn('PlatformService.exportData not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
  async importData(_data: {
    products: Product[];
    categories: Category[];
    orders: Order[];
  }): StoragePlatformResult<void> {
    log.warn('PlatformService.importData not supported in web/PWA mode');
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'SQLite storage requires Tauri runtime',
      },
    };
  }
}
