import { createContextLogger } from '@/lib/logger';
import type Order from '@/models/Order';
import type { LicenseStatus } from '@/types/license';
import type { PlatformService } from './PlatformService';

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
  /**
   * PWA updates are managed by service worker.
   *
   * Updates are downloaded and installed in the background.
   * User is notified when update is ready.
   *
   * This stub returns immediately.
   */
  async checkForUpdates(): Promise<void> {
    log.debug('Update check not applicable in PWA');
    log.debug('Service worker manages PWA updates');
    // Update check happens via service worker
    // New service worker version is installed on page reload
    // User is prompted to reload when update is ready
    // No action needed here
  }

  /**
   * Reload page to apply service worker update.
   *
   * This is the PWA equivalent of "download and install".
   * When service worker has a new version installed, page needs to reload.
   */
  async downloadAndInstall(): Promise<void> {
    log.debug('Reloading page for service worker update');

    try {
      window.location.reload();
    } catch (error) {
      log.error('Failed to reload page:', error instanceof Error ? error : undefined);
      alert('No se pudo recargar la página. Por favor, recárgala manualmente.');
    }
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
}
