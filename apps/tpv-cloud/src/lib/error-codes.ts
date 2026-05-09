/**
 * Cloud service error codes
 * Centralized error code definitions for all cloud operations
 */

export const CloudErrorCode = {
  // Update errors
  ReleaseNotFound: 'CLOUD_RELEASE_NOT_FOUND',
  UnsupportedTarget: 'CLOUD_UNSUPPORTED_TARGET',

  // License errors
  LicenseNotFound: 'CLOUD_LICENSE_NOT_FOUND',
  LicenseExpired: 'CLOUD_LICENSE_EXPIRED',
  LicenseDeactivated: 'CLOUD_LICENSE_DEACTIVATED',
  LicenseMaxActivations: 'CLOUD_LICENSE_MAX_ACTIVATIONS',
  InvalidKeyFormat: 'CLOUD_INVALID_KEY_FORMAT',
  InvalidEmail: 'CLOUD_INVALID_EMAIL',

  // DB / infra errors
  DatabaseError: 'CLOUD_DATABASE_ERROR',
  CryptoError: 'CLOUD_CRYPTO_ERROR',
  InternalError: 'CLOUD_INTERNAL_ERROR',
} as const;

export type CloudErrorCode = (typeof CloudErrorCode)[keyof typeof CloudErrorCode];
