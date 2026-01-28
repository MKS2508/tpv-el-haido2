import logger from '@mks2508/better-logger';

/**
 * Better logger configuration for License Server
 * Uses cyberpunk preset for server-side operations with timestamps and location
 */

// Apply cyberpunk preset for server-side operations
logger.preset('cyberpunk');
logger.showTimestamp();
logger.showLocation();

/**
 * License service logger
 * Use for license creation, validation, revocation operations
 */
export const licenseLogger = logger.createLogger('[LicenseService]');

/**
 * Crypto service logger
 * Use for license key generation and hashing operations
 */
export const cryptoLogger = logger.createLogger('[CryptoService]');

/**
 * Database logger
 * Use for database connection, query execution, and transaction logging
 */
export const dbLogger = logger.createLogger('[Database]');

/**
 * API request logger
 * Use for HTTP request/response logging and middleware operations
 */
export const apiLogger = logger.createLogger('[API]');

/**
 * Admin operations logger
 * Use for administrative actions like license management
 */
export const adminLogger = logger.createLogger('[Admin]');

/**
 * Validation logger
 * Use for request validation and schema checking
 */
export const validationLogger = logger.createLogger('[Validation]');

export default logger;
