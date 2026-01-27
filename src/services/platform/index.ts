// ================================
// PLATFORM SERVICE EXPORTS
// ================================
// This module provides unified access to platform-specific services.

// Export the main interface
export * from './PlatformService';

// Export platform detection utility
export * from './PlatformDetector';

// Export platform implementations
export * from './WebPlatformService';
export * from './TauriPlatformService';

// ================================
// PLATFORM DETECTION FACTORY
// ================================

import { isTauri } from './PlatformDetector';
import { PlatformService } from './PlatformService';
import { WebPlatformService } from './WebPlatformService';
import { TauriPlatformService } from './TauriPlatformService';

/**
 * Get the appropriate PlatformService implementation
 * for the current environment (PWA vs Tauri).
 *
 * @returns PlatformService instance
 *          - WebPlatformService for PWA (browser)
 *          - TauriPlatformService for Tauri (desktop app)
 */
export function getPlatformService(): PlatformService {
  const isTauriEnv = isTauri();

  console.log(
    `[Platform Index] Detected environment: ${isTauriEnv ? 'Tauri' : 'PWA (Web)'}`
  );

  // Return the appropriate service based on environment
  if (isTauriEnv) {
    console.log('[Platform Index] Returning TauriPlatformService');
    return new TauriPlatformService();
  } else {
    console.log('[Platform Index] Returning WebPlatformService');
    return new WebPlatformService();
  }
}

/**
 * Convenience function to check if currently running in Tauri.
 * Re-exported for easy access throughout the app.
 */
export { isTauri as isPlatformTauri };
