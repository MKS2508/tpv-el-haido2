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
export const licenseLogger = logger.scope('[LicenseService]');

/**
 * Crypto service logger
 * Use for license key generation and hashing operations
 */
export const cryptoLogger = logger.scope('[CryptoService]');

/**
 * Database logger
 * Use for database connection, query execution, and transaction logging
 */
export const dbLogger = logger.scope('[Database]');

/**
 * API request logger
 * Use for HTTP request/response logging and middleware operations
 */
export const apiLogger = logger.scope('[API]');

/**
 * Admin operations logger
 * Use for administrative actions like license management
 */
export const adminLogger = logger.scope('[Admin]');

/**
 * Validation logger
 * Use for request validation and schema checking
 */
export const validationLogger = logger.scope('[Validation]');

export default logger;
