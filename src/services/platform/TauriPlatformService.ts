import { isErr } from '@mks2508/no-throw';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import type Order from '@/models/Order';
import { loadPrinterConfig, printOrder } from '@/services/thermal-printer.service';
import type { LicenseStatus } from '@/types/license';
import type { PlatformService } from './PlatformService';

/**
 * PlatformService implementation for Tauri (Desktop)
 *
 * Uses Tauri plugins for native platform features.
 */
export class TauriPlatformService implements PlatformService {
  private cachedUpdate: Update | null = null;

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
      console.log('[TauriPlatformService] File selected:', selected);
      return selected as string | null;
    } catch (error) {
      console.error('[TauriPlatformService] Error opening file dialog:', error);
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
      console.log('[TauriPlatformService] Save path selected:', filePath);
      return filePath;
    } catch (error) {
      console.error('[TauriPlatformService] Error opening save dialog:', error);
      return null;
    }
  }

  // ================================
  // UPDATER
  // ================================

  /**
   * Check for application updates
   * Caches the update object for subsequent downloadAndInstall call
   */
  async checkForUpdates(): Promise<void> {
    try {
      const update = await check();
      this.cachedUpdate = update;

      if (update) {
        console.log(`[TauriPlatformService] Update available: ${update.version}`);
      } else {
        console.log('[TauriPlatformService] No updates available');
      }
    } catch (error) {
      console.error('[TauriPlatformService] Error checking for updates:', error);
      throw error;
    }
  }

  /**
   * Download and install the cached update
   * Must call checkForUpdates first
   */
  async downloadAndInstall(): Promise<void> {
    if (!this.cachedUpdate) {
      // Try to check for updates first
      await this.checkForUpdates();

      if (!this.cachedUpdate) {
        throw new Error('No update available to install');
      }
    }

    try {
      console.log('[TauriPlatformService] Downloading and installing update...');
      await this.cachedUpdate.downloadAndInstall();
      console.log('[TauriPlatformService] Update installed, relaunching...');
      await relaunch();
    } catch (error) {
      console.error('[TauriPlatformService] Error installing update:', error);
      throw error;
    }
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
      console.error('[TauriPlatformService] Error checking license:', error);
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
      console.error('[TauriPlatformService] Error validating license:', error);
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
      console.log('[TauriPlatformService] License cleared successfully');
    } catch (error) {
      console.error('[TauriPlatformService] Error clearing license:', error);
      throw error;
    }
  }

  async getMachineFingerprint(): Promise<string> {
    try {
      return await invoke<string>('get_machine_fingerprint');
    } catch (error) {
      console.error('[TauriPlatformService] Error getting fingerprint:', error);
      return '';
    }
  }
}
