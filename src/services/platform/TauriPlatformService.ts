import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import type Order from '@/models/Order';
import { runThermalPrinterCommand } from '@/services/thermal-printer.service';
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

  /**
   * Format order items into ESC/POS print sequence
   */
  private formatOrderForPrint(order: Order): string {
    const lines: string[] = [];

    // Header
    lines.push('[ALIGN:CENTER]');
    lines.push('[BOLD:ON]TPV EL HAIDO[BOLD:OFF]');
    lines.push(`Ticket #${order.id}`);
    lines.push(`Mesa: ${order.tableNumber || 'Barra'}`);
    lines.push(`Fecha: ${order.date}`);
    lines.push('[ALIGN:LEFT]');
    lines.push('--------------------------------');

    // Items
    for (const item of order.items) {
      const qty = item.quantity.toString().padStart(2, ' ');
      const name = item.name.substring(0, 18).padEnd(18, ' ');
      const price = (item.price * item.quantity).toFixed(2).padStart(7, ' ');
      lines.push(`${qty} ${name} ${price}€`);
    }

    // Total
    lines.push('--------------------------------');
    lines.push('[BOLD:ON]');
    lines.push(`TOTAL: ${order.total.toFixed(2)}€`.padStart(32, ' '));
    lines.push('[BOLD:OFF]');

    // Payment info
    if (order.paymentMethod) {
      lines.push(`Pago: ${order.paymentMethod}`);
    }
    if (order.totalPaid && order.totalPaid > order.total) {
      lines.push(`Entregado: ${order.totalPaid.toFixed(2)}€`);
      lines.push(`Cambio: ${order.change?.toFixed(2) || '0.00'}€`);
    }

    // Footer
    lines.push('');
    lines.push('[ALIGN:CENTER]');
    lines.push('¡Gracias por su visita!');
    lines.push('[CUT]');

    return lines.join('\n');
  }

  async printTicket(order: Order): Promise<void> {
    try {
      const printSequence = this.formatOrderForPrint(order);
      await runThermalPrinterCommand(printSequence);
      console.log('[TauriPlatformService] Ticket printed successfully');
    } catch (error) {
      console.error('[TauriPlatformService] Error printing ticket:', error);
      throw error;
    }
  }

  async printReceipt(order: Order): Promise<void> {
    // Receipt is same as ticket for now
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
        is_activated: false,
        is_valid: false,
        error_message: 'Error al verificar licencia',
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
        is_activated: false,
        is_valid: false,
        error_message: 'Error de conexión con el servidor de licencias',
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
