import { tryCatchAsync } from '@mks2508/no-throw';
import type { Result, ResultError } from '@mks2508/no-throw';
import { LicenseErrorCode } from '../lib/error-codes.js';
import { cryptoLogger } from '../lib/logger.js';

/**
 * Cryptographic service for license key operations
 * Provides key generation, hashing, and verification using Bun's crypto APIs
 */
export class CryptoService {
  /**
   * Generates a unique license key in format XXXX-XXXX-XXXX-XXXX
   * Uses alphanumeric characters (A-Z, 0-9) for each segment
   *
   * @returns {string} Generated license key in XXXX-XXXX-XXXX-XXXX format
   *
   * @example
   * const key = CryptoService.generateLicenseKey();
   * // => "AB12-CD34-EF56-GH78"
   */
  static generateLicenseKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments: string[] = [];

    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(segment);
    }

    const key = segments.join('-');
    cryptoLogger.debug('Generated new license key');

    return key;
  }

  /**
   * Hashes a license key using SHA-256
   * Uses Bun's CryptoHasher for hashing
   *
   * @param {string} key - License key to hash
   * @returns {Result<string, ResultError<LicenseErrorCode>>}
   *          Result containing hex-encoded hash or error
   *
   * @error LICENSE_CRYPTO_ERROR - If hashing operation fails
   *
   * @example
   * const result = await CryptoService.hashLicenseKey('AB12-CD34-EF56-GH78');
   * if (result.ok) {
   *   console.log('Hash:', result.value);
   * }
   */
  static async hashLicenseKey(
    key: string
  ): Promise<Result<string, ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        // Use Bun's CryptoHasher for SHA-256 hashing
        const hasher = new Bun.CryptoHasher('sha256');
        hasher.update(key);
        const hash = hasher.digest('hex');

        cryptoLogger.debug('License key hashed successfully');

        return hash;
      },
      LicenseErrorCode.CryptoError
    );
  }

  /**
   * Verifies if a license key matches a stored hash
   * Compares the hash of the provided key with the stored hash
   *
   * @param {string} key - License key to verify
   * @param {string} storedHash - Hash to compare against
   * @returns {Result<boolean, ResultError<LicenseErrorCode>>}
   *          Result containing verification result or error
   *
   * @error LICENSE_CRYPTO_ERROR - If hashing operation fails during verification
   *
   * @example
   * const result = await CryptoService.verifyLicenseKey('AB12-CD34...', 'a1b2c3...');
   * if (result.ok && result.value) {
   *   console.log('Key is valid');
   * }
   */
  static async verifyLicenseKey(
    key: string,
    storedHash: string
  ): Promise<Result<boolean, ResultError<LicenseErrorCode>>> {
    const hashResult = await this.hashLicenseKey(key);

    if (!hashResult.ok) {
      return hashResult;
    }

    const isValid = hashResult.value === storedHash;

    cryptoLogger.debug('License key verification completed', { isValid });

    return { ok: true, value: isValid };
  }

  /**
   * Generates a machine fingerprint from hardware information
   * Creates a unique identifier based on system characteristics
   *
   * @param {string} hostname - System hostname
   * @param {string} platform - Operating system platform
   * @param {string} arch - System architecture
   * @returns {string} Generated machine fingerprint
   *
   * @example
   * const fingerprint = CryptoService.generateMachineFingerprint('server01', 'linux', 'x64');
   * // => "server01-linux-x64-abc123"
   */
  static generateMachineFingerprint(
    hostname: string,
    platform: string,
    arch: string
  ): string {
    const base = `${hostname}-${platform}-${arch}`;
    const timestamp = Date.now().toString(36);
    const fingerprint = `${base}-${timestamp}`;

    cryptoLogger.debug('Machine fingerprint generated');

    return fingerprint;
  }
}
