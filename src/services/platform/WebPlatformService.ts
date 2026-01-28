import type { PlatformService } from './PlatformService';
import type Order from '@/models/Order';

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

    console.log(`[WebPlatformService] Opening ticket URL: ${ticketUrl}`);

    try {
      window.open(ticketUrl, '_blank');
    } catch (error) {
      console.error('[WebPlatformService] Failed to open ticket URL:', error);
      alert('No se pudo abrir el ticket. Por favor, inténtalo de nuevo.');
    }
  }

  async printReceipt(_order: Order): Promise<void> {
    // Receipt printing not available in PWA version
    console.warn('[WebPlatformService] Receipt printing not available in PWA version');
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
    console.log('[WebPlatformService] Opening file dialog (prompt)');

    try {
      const filePath = prompt(
        'Introduce la ruta del archivo que quieres importar:\n' +
        '(O déjalo vacío para cancelar)',
        ''
      );

      if (!filePath || filePath.trim() === '') {
        console.log('[WebPlatformService] File dialog cancelled');
        return null;
      }

      return filePath;
    } catch (error) {
      console.error('[WebPlatformService] File dialog failed:', error);
      return null;
    }
  }

  async saveFileDialog(): Promise<string | null> {
    // In PWA, use browser prompt for filename
    // File can then be downloaded via browser download mechanism
    console.log('[WebPlatformService] Opening save dialog (prompt)');

    try {
      const filename = prompt(
        'Introduce el nombre para guardar el archivo:\n' +
        '(O déjalo vacío para cancelar)',
        'datos_exportados.json'
      );

      if (!filename || filename.trim() === '') {
        console.log('[WebPlatformService] Save dialog cancelled');
        return null;
      }

      return filename;
    } catch (error) {
      console.error('[WebPlatformService] Save dialog failed:', error);
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
    console.log('[WebPlatformService] Update check not applicable in PWA');
    console.log('[WebPlatformService] Service worker manages PWA updates');
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
    console.log('[WebPlatformService] Reloading page for service worker update');

    try {
      window.location.reload();
    } catch (error) {
      console.error('[WebPlatformService] Failed to reload page:', error);
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
      console.log(`[WebPlatformService] App version: ${version}`);
      return version;
    }

    console.warn('[WebPlatformService] No version found, using default');

    return '1.0.0';
  }
}
