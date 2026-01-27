/**
 * Centralized Configuration Helper
 *
 * All configuration values from environment variables with sensible defaults.
 * This provides a single source of truth for all configurable values in the app.
 */

import type { StorageMode } from '@/services/storage-adapter.interface';

export const config = {
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
  },
} as const;

export default config;
