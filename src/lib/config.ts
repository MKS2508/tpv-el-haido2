/**
 * Centralized Configuration Helper
 *
 * All configuration values from environment variables with sensible defaults.
 * This provides a single source of truth for all configurable values in the app.
 */

import type { StorageMode } from '@/services/storage-adapter.interface';

export interface Config {
  api: {
    baseUrl: string;
    timeout: number;
  };
  aeat: {
    port: number;
    baseUrl: string;
    timeout: number;
    startupTimeout: number;
    maxRestartAttempts: number;
    healthCheckInterval: number;
  };
  printer: {
    timeout: number;
  };
  storage: {
    defaultMode: StorageMode;
  };
  performance: {
    forceHighPerformance: boolean;
  };
  debug: {
    enabled: boolean;
    masterEmail: string;
    masterKey: string;
  };
  onboarding: {
    forceOnboarding: boolean;
  };
}

export const config: Config = {
  /**
   * API/Backend configuration
   */
  api: {
    /** Base URL for the haido-db REST API */
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    /** Request timeout in milliseconds */
    timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 10000,
  },

  /**
   * AEAT VERI*FACTU configuration
   */
  aeat: {
    /** Default port for AEAT sidecar */
    port: Number(import.meta.env.VITE_AEAT_SIDECAR_PORT) || 3001,
    /** Base URL for AEAT service (external mode) */
    baseUrl: import.meta.env.VITE_AEAT_BASE_URL || 'http://localhost:3001',
    /** Request timeout for AEAT operations */
    timeout: Number(import.meta.env.VITE_AEAT_REQUEST_TIMEOUT) || 30000,
    /** Startup timeout for sidecar */
    startupTimeout: Number(import.meta.env.VITE_AEAT_STARTUP_TIMEOUT) || 15000,
    /** Maximum restart attempts for sidecar */
    maxRestartAttempts: Number(import.meta.env.VITE_AEAT_MAX_RESTART_ATTEMPTS) || 3,
    /** Health check interval in milliseconds */
    healthCheckInterval: Number(import.meta.env.VITE_AEAT_HEALTH_CHECK_INTERVAL) || 10000,
  },

  /**
   * Printer configuration
   */
  printer: {
    /** Timeout for printer operations */
    timeout: Number(import.meta.env.VITE_PRINTER_TIMEOUT) || 3000,
  },

  /**
   * Storage configuration
   */
  storage: {
    /** Default storage mode: 'sqlite' | 'http' | 'indexeddb' */
    defaultMode: (import.meta.env.VITE_STORAGE_MODE as StorageMode) || 'sqlite',
  },

  /**
   * Performance configuration
   */
  performance: {
    /** Force high performance mode (bypasses performance detection) */
    forceHighPerformance: import.meta.env.VITE_FORCE_HIGH_PERFORMANCE === 'true',
  },

  /**
   * Debug configuration
   */
  debug: {
    /** Enable debug mode */
    enabled: import.meta.env.VITE_DEBUG_MODE === 'true',
    /** Master license email for development/testing */
    masterEmail: import.meta.env.VITE_MASTER_LICENSE_EMAIL || 'admin@haido.local',
    /** Master license key for development/testing */
    masterKey: import.meta.env.VITE_MASTER_LICENSE_KEY || 'HAI-MASTER-DEV-KEY-2026',
  },

  /**
   * Onboarding configuration
   */
  onboarding: {
    /** Force onboarding to show even if completed */
    forceOnboarding: import.meta.env.VITE_FORCE_ONBOARDING === 'true',
  },
};

export default config;
