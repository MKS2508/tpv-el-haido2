import { tryCatchAsync } from '@mks2508/no-throw';
import type { Result, ResultError } from '@mks2508/no-throw';
import { CryptoService } from './crypto.service.js';
import { db } from '../db/schema.js';
import { LicenseErrorCode } from '../lib/error-codes.js';
import { licenseLogger } from '../lib/logger.js';

/**
 * License types supported by the system
 */
export type LicenseType = 'basic' | 'pro' | 'enterprise';

/**
 * License creation data
 */
export interface CreateLicenseDto {
  email: string;
  license_type: LicenseType;
  expires_in_days?: number;
}

/**
 * License validation data
 */
export interface ValidateLicenseDto {
  key: string;
  email: string;
  machine_fingerprint: string;
}

/**
 * License response data
 */
export interface LicenseDto {
  key: string;
  key_hash: string;
  email: string;
  license_type: LicenseType;
  expires_at?: number;
}

/**
 * License validation response data
 */
export interface LicenseValidationDto {
  valid: true;
  expires_at?: number;
  user_email: string;
  license_type: LicenseType;
}

/**
 * License validation error response
 */
export interface LicenseValidationErrorDto {
  valid: false;
  error: string;
  code: string;
  user_email?: string;
  license_type?: LicenseType;
}

/**
 * License service for managing license lifecycle
 * Provides creation, validation, revocation, and reactivation operations
 */
export class LicenseService {
  /**
   * Creates a new license with validation and database persistence
   *
   * Generates a unique license key, hashes it, and stores it in the database
   * with the provided email and license type. Optionally sets an expiration date.
   *
   * @param {CreateLicenseDto} data - License creation data
   * @returns {Promise<Result<LicenseDto, ResultError<LicenseErrorCode>>>}
   *          Result containing created license or error
   *
   * @error LICENSE_DATABASE_ERROR - If database operation fails
   * @error LICENSE_CRYPTO_ERROR - If key hashing fails
   * @error LICENSE_INVALID_EMAIL - If email format is invalid
   *
   * @example
   * const result = await LicenseService.createLicense({
   *   email: 'user@example.com',
   *   license_type: 'pro',
   *   expires_in_days: 30
   * });
   *
   * if (result.ok) {
   *   console.log('License key:', result.value.key);
   * } else {
   *   console.error('Error:', result.error.code, result.error.message);
   * }
   */
  static async createLicense(
    data: CreateLicenseDto
  ): Promise<Result<LicenseDto, ResultError<LicenseErrorCode>>> {
    licenseLogger.info('Creating license', { email: data.email, type: data.license_type });

    // Validate email format
    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.ok) {
      return emailValidation;
    }

    return tryCatchAsync(
      async () => {
        // Generate license key and hash
        const key = CryptoService.generateLicenseKey();
        const hashResult = await CryptoService.hashLicenseKey(key);

        if (!hashResult.ok) {
          return hashResult;
        }

        // Calculate expiration if provided
        const expiresAt = data.expires_in_days
          ? Math.floor(Date.now() / 1000) + data.expires_in_days * 24 * 60 * 60
          : undefined;

        // Create license in database
        const createResult = await db.createLicense({
          keyHash: hashResult.value,
          keyPlain: key,
          email: data.email,
          licenseType: data.license_type,
          expiresAt
        });

        if (!createResult.ok) {
          return createResult;
        }

        const licenseDto: LicenseDto = {
          key,
          key_hash: hashResult.value,
          email: data.email,
          license_type: data.license_type,
          expires_at: expiresAt
        };

        licenseLogger.success('License created successfully', {
          id: createResult.value.id,
          email: data.email
        });

        return licenseDto;
      },
      LicenseErrorCode.InternalError,
      { context: { operation: 'createLicense', email: data.email } }
    );
  }

  /**
   * Validates a license key against database and business rules
   *
   * Performs comprehensive validation including:
   * - Key existence check
   * - Active status verification
   * - Expiration date validation
   * - Machine fingerprint matching
   * - Maximum activations enforcement
   *
   * @param {ValidateLicenseDto} data - Validation data
   * @returns {Promise<Result<LicenseValidationDto | LicenseValidationErrorDto, ResultError<LicenseErrorCode>>>}
   *          Result containing validation status or error
   *
   * @error LICENSE_NOT_FOUND - Key doesn't exist in database
   * @error LICENSE_DEACTIVATED - License has been deactivated
   * @error LICENSE_EXPIRED - License has passed expiration date
   * @error LICENSE_MAX_ACTIVATIONS - Too many different machines activated
   * @error LICENSE_MACHINE_MISMATCH - Different machine but within activation limits
   *
   * @example
   * const result = await LicenseService.validateLicense({
   *   key: 'AB12-CD34-EF56-GH78',
   *   email: 'user@example.com',
   *   machine_fingerprint: 'server01-linux-x64-abc123'
   * });
   *
   * if (result.ok && result.value.valid) {
   *   console.log('License valid until:', result.value.expires_at);
   * }
   */
  static async validateLicense(
    data: ValidateLicenseDto
  ): Promise<Result<LicenseValidationDto | LicenseValidationErrorDto, ResultError<LicenseErrorCode>>> {
    licenseLogger.info('Validating license', { email: data.email });

    return tryCatchAsync(
      async () => {
        // Hash the provided key
        const hashResult = await CryptoService.hashLicenseKey(data.key);
        if (!hashResult.ok) {
          return hashResult;
        }

        // Look up license in database
        const license = db.getLicenseByKeyHash(hashResult.value);

        if (!license) {
          licenseLogger.warn('License not found', { email: data.email });
          const errorResponse: LicenseValidationErrorDto = {
            valid: false,
            error: 'License key not found',
            code: LicenseErrorCode.NotFound
          };
          return errorResponse;
        }

        // Check if license is active
        if (!license.is_active) {
          licenseLogger.warn('License is deactivated', {
            id: license.id,
            email: license.email
          });
          const errorResponse: LicenseValidationErrorDto = {
            valid: false,
            error: 'License has been deactivated',
            code: LicenseErrorCode.Deactivated,
            user_email: license.email,
            license_type: license.license_type
          };
          return errorResponse;
        }

        // Check expiration
        if (license.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          if (now > license.expires_at) {
            licenseLogger.warn('License has expired', {
              id: license.id,
              email: license.email,
              expired_at: license.expires_at
            });
            const errorResponse: LicenseValidationErrorDto = {
              valid: false,
              error: 'License has expired',
              code: LicenseErrorCode.Expired,
              user_email: license.email,
              license_type: license.license_type
            };
            return errorResponse;
          }
        }

        // Check machine fingerprint and activations
        if (
          license.machine_fingerprint &&
          license.machine_fingerprint !== data.machine_fingerprint
        ) {
          // Different machine - check activation limits
          if (license.activation_count >= license.max_activations) {
            licenseLogger.warn('Maximum activations exceeded', {
              id: license.id,
              email: license.email,
              count: license.activation_count,
              max: license.max_activations
            });
            const errorResponse: LicenseValidationErrorDto = {
              valid: false,
              error: 'Maximum activations exceeded for this license',
              code: LicenseErrorCode.MaxActivations,
              user_email: license.email,
              license_type: license.license_type
            };
            return errorResponse;
          }

          // Different machine but within limits - allow activation
          licenseLogger.info('New machine activation', {
            id: license.id,
            email: license.email
          });
        }

        // Update activation information
        await db.updateActivation(license.id, data.machine_fingerprint);

        // Log the validation
        await db.logValidation({
          licenseId: license.id,
          machineFingerprint: data.machine_fingerprint,
          valid: true
        });

        const successResponse: LicenseValidationDto = {
          valid: true,
          expires_at: license.expires_at ?? undefined,
          user_email: license.email,
          license_type: license.license_type
        };

        licenseLogger.success('License validated successfully', {
          id: license.id,
          email: license.email
        });

        return successResponse;
      },
      LicenseErrorCode.InternalError,
      { context: { operation: 'validateLicense', email: data.email } }
    );
  }

  /**
   * Lists all licenses in the system
   *
   * Returns all licenses with their current status, ordered by creation date
   * descending (newest first).
   *
   * @returns {Promise<Result<License[], ResultError<LicenseErrorCode>>>}
   *          Result containing array of licenses or error
   *
   * @error LICENSE_DATABASE_ERROR - If query fails
   *
   * @example
   * const result = await LicenseService.listLicenses();
   * if (result.ok) {
   *   console.log(`Found ${result.value.length} licenses`);
   * }
   */
  static async listLicenses(): Promise<Result<unknown[], ResultError<LicenseErrorCode>>> {
    licenseLogger.info('Listing all licenses');
    return db.listLicenses();
  }

  /**
   * Revokes a license, making it invalid for validation
   *
   * Sets the license's is_active flag to false, causing all subsequent
   * validation attempts to fail.
   *
   * @param {number} licenseId - ID of license to revoke
   * @returns {Result<boolean, ResultError<LicenseErrorCode>>}
   *          True if license was revoked, false if not found
   *
   * @error LICENSE_DATABASE_ERROR - If update operation fails
   *
   * @example
   * const result = await LicenseService.revokeLicense(123);
   * if (result.ok && result.value) {
   *   console.log('License revoked');
   * }
   */
  static async revokeLicense(licenseId: number): Promise<Result<boolean, ResultError<LicenseErrorCode>>> {
    licenseLogger.info('Revoking license', { id: licenseId });
    return db.revokeLicense(licenseId);
  }

  /**
   * Reactivates a previously revoked license
   *
   * Sets the license's is_active flag to true, allowing validation attempts
   * to succeed again.
   *
   * @param {number} licenseId - ID of license to reactivate
   * @returns {Result<boolean, ResultError<LicenseErrorCode>>}
   *          True if license was reactivated, false if not found
   *
   * @error LICENSE_DATABASE_ERROR - If update operation fails
   *
   * @example
   * const result = await LicenseService.reactivateLicense(123);
   * if (result.ok && result.value) {
   *   console.log('License reactivated');
   * }
   */
  static async reactivateLicense(
    licenseId: number
  ): Promise<Result<boolean, ResultError<LicenseErrorCode>>> {
    licenseLogger.info('Reactivating license', { id: licenseId });
    return db.reactivateLicense(licenseId);
  }

  /**
   * Retrieves all licenses for a specific email address
   *
   * Returns all licenses associated with the provided email, regardless of
   * their activation status.
   *
   * @param {string} email - Email address to search for
   * @returns {Result<License[], ResultError<LicenseErrorCode>>}
   *          Result containing array of licenses or error
   *
   * @error LICENSE_DATABASE_ERROR - If query fails
   *
   * @example
   * const result = await LicenseService.getLicensesByEmail('user@example.com');
   * if (result.ok) {
   *   console.log(`Found ${result.value.length} licenses for user`);
   * }
   */
  static async getLicensesByEmail(email: string): Promise<Result<unknown[], ResultError<LicenseErrorCode>>> {
    licenseLogger.info('Retrieving licenses by email', { email });
    return db.getLicensesByEmail(email);
  }

  /**
   * Validates email format using a simple regex pattern
   *
   * @param {string} email - Email address to validate
   * @returns {Result<void, ResultError<LicenseErrorCode>>}
   *          Result indicating validation success or failure
   *
   * @error LICENSE_INVALID_EMAIL - If email format is invalid
   * @private
   */
  private static validateEmail(email: string): Result<void, ResultError<LicenseErrorCode>> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      licenseLogger.warn('Invalid email format', { email });
      return {
        ok: false,
        error: {
          code: LicenseErrorCode.InvalidEmail,
          message: 'Invalid email format',
          context: { email }
        }
      };
    }

    return { ok: true, value: undefined };
  }
}
