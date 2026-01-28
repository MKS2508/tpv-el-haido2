import type { ErrorCode } from '@mks2508/no-throw';

/**
 * License server error codes
 * Following project error code pattern from main codebase
 */
export const LicenseErrorCode = {
  // Validation errors
  InvalidKeyFormat: 'LICENSE_INVALID_KEY_FORMAT',
  InvalidEmail: 'LICENSE_INVALID_EMAIL',
  MissingRequiredField: 'LICENSE_MISSING_REQUIRED_FIELD',

  // License status errors
  NotFound: 'LICENSE_NOT_FOUND',
  AlreadyRevoked: 'LICENSE_ALREADY_REVOKED',
  AlreadyActivated: 'LICENSE_ALREADY_ACTIVATED',
  Expired: 'LICENSE_EXPIRED',
  MaxActivations: 'LICENSE_MAX_ACTIVATIONS',
  MachineMismatch: 'LICENSE_MACHINE_MISMATCH',
  Deactivated: 'LICENSE_DEACTIVATED',

  // Server errors
  DatabaseError: 'LICENSE_DATABASE_ERROR',
  CryptoError: 'LICENSE_CRYPTO_ERROR',
  InternalError: 'LICENSE_INTERNAL_ERROR',

  // Network errors
  Offline: 'LICENSE_OFFLINE',
  Timeout: 'LICENSE_TIMEOUT',
} as const;

export type LicenseErrorCode = ErrorCode<typeof LicenseErrorCode>;
