import type Order from '@/models/Order';

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
  // UPDATER (Tauri Only)
  // ================================
  /**
   * Check for application updates
   * In Tauri: uses @tauri-apps/plugin-updater
   * In PWA: always returns null (updates via service worker)
   * @returns Update info if available, null otherwise
   */
  checkForUpdates(): Promise<void>;

  /**
   * Download and install the latest update
   * In Tauri: triggers update from @tauri-apps/plugin-updater
   * In PWA: reloads page (service worker updates in background)
   */
  downloadAndInstall(): Promise<void>;

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
}
