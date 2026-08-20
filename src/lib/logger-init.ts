/**
 * Logger Initialization
 *
 * Configures @mks2508/better-logger with log levels and transports
 * controlled via environment variables.
 *
 * Environment Variables:
 * - VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' | 'critical' (default: 'debug')
 * - VITE_LOG_CONSOLE: 'true' | 'false' (default: 'true')
 * - VITE_LOG_FILE: 'true' | 'false' (default: 'false')
 * - VITE_LOG_FILE_PATH: Ruta del archivo de log (ej: 'logs/app.log', default: 'tpv-haido.log')
 * - VITE_LOG_HTTP: 'true' | 'false' (default: 'false')
 * - VITE_LOG_HTTP_URL: URL para HTTP transport (ej: https://logs.example.com/api/logs) - REQUERIDO si LOG_HTTP=true
 * - VITE_LOG_OTLP: 'true' | 'false' (default: 'false')
 * - VITE_LOG_OTLP_URL: URL del OTel collector (ej: https://collector.example.com:4318) - REQUERIDO si VITE_LOG_OTLP=true
 * - VITE_LOG_OTLP_ENV: Entorno reportado a OTel (default: import.meta.env.MODE)
 *
 * Transports:
 * - ConsoleTransport: Styled console output
 * - FileTransport: Tauri desktop only (logs to {app_data_dir}/path)
 * - HttpTransport: Sends logs to remote server (requires VITE_LOG_HTTP_URL)
 * - OtlpTransport: Sends logs to an OTel collector (requires VITE_LOG_OTLP_URL)
 */

import logger, { type LogLevel } from '@mks2508/better-logger';
import {
  ConsoleTransport,
  FileTransport,
  HttpTransport,
  OtlpTransport,
} from '@mks2508/better-logger/transports';
import { isTauri } from '@/services/platform';

/**
 * Get log level from environment variable or use default
 */
function getLogLevel(): LogLevel {
  const envLevel = import.meta.env.VITE_LOG_LEVEL || 'debug';
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
  return validLevels.includes(envLevel as LogLevel) ? (envLevel as LogLevel) : 'debug';
}

/**
 * Parse boolean env var with default
 */
function parseBoolEnv(envVar: string | undefined, defaultValue: boolean): boolean {
  if (envVar === undefined) return defaultValue;
  return envVar === 'true' || envVar === '1' || envVar === 'yes';
}

/**
 * Initialize logger with environment-specific configuration
 *
 * This function should be called ONCE at app startup, before any other logging.
 * Configures transports and log levels based on VITE_* environment variables.
 */
export function initializeLogger(): void {
  const logLevel = getLogLevel();
  const inTauri = isTauri();

  // Get transport config from env vars
  const enableConsole = parseBoolEnv(import.meta.env.VITE_LOG_CONSOLE, true);
  const enableFile = parseBoolEnv(import.meta.env.VITE_LOG_FILE, false);
  const enableHttp = parseBoolEnv(import.meta.env.VITE_LOG_HTTP, false);
  const enableOtlp = parseBoolEnv(import.meta.env.VITE_LOG_OTLP, false);
  const filePath = import.meta.env.VITE_LOG_FILE_PATH || 'tpv-haido.log';
  const httpUrl = import.meta.env.VITE_LOG_HTTP_URL || '';
  const otlpUrl = import.meta.env.VITE_LOG_OTLP_URL || '';
  const otlpEnv = import.meta.env.VITE_LOG_OTLP_ENV || import.meta.env.MODE;

  // Set global log level
  logger.setVerbosity(logLevel);

  // Console transport
  if (enableConsole) {
    logger.addTransport({ target: new ConsoleTransport({ level: logLevel }), level: logLevel });
  }

  // File transport (Tauri desktop only, not in PWA)
  if (enableFile && inTauri) {
    try {
      logger.addTransport({
        target: new FileTransport({ level: logLevel, destination: filePath }),
        level: logLevel,
      });
    } catch (error) {
      // Silently fail if file transport unavailable
      // This can happen in web/PWA mode
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[Logger] File transport unavailable: ${msg}`);
    }
  }

  // HTTP transport (requires VITE_LOG_HTTP_URL)
  if (enableHttp && httpUrl) {
    try {
      logger.addTransport({
        target: new HttpTransport({ level: logLevel, url: httpUrl }),
        level: logLevel,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[Logger] HTTP transport unavailable: ${msg}`);
    }
  }

  // OTLP transport (requires VITE_LOG_OTLP_URL)
  if (enableOtlp && otlpUrl) {
    try {
      logger.addTransport({
        target: new OtlpTransport({
          endpoint: otlpUrl,
          serviceName: 'tpv-haido',
          environment: otlpEnv,
        }),
        level: logLevel,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[Logger] OTLP transport unavailable: ${msg}`);
    }
  }

  // Log initialization event
  const transports = [
    enableConsole && 'console',
    enableFile && inTauri && `file(${filePath})`,
    enableHttp && httpUrl && `http(${httpUrl})`,
    enableOtlp && otlpUrl && `otlp(${otlpUrl})`,
  ]
    .filter(Boolean)
    .join(', ');
  const mode = inTauri ? 'Tauri desktop' : 'web/PWA';
  logger.info(
    `Logger initialized: ${mode}, level=${logLevel}, transports=[${transports || 'none'}]`
  );
}

export default initializeLogger;
