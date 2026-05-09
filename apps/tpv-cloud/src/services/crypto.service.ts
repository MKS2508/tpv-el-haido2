import { tryCatchAsync, ok } from '@mks2508/no-throw'
import type { Result } from '@mks2508/no-throw'
import { CloudErrorCode } from '../lib/error-codes'
import { cryptoLogger } from '../lib/logger'

/**
 * Cryptographic service for license key operations
 * Provides hashing and verification using Bun's crypto APIs
 */
export class CryptoService {
  /**
   * Hashes a license key using SHA-256.
   * @param key - Raw license key string
   * @returns Result with hex-encoded hash
   */
  static async hashLicenseKey(key: string): Promise<Result<string, { code: string; message: string }>> {
    return tryCatchAsync(
      async () => {
        const hasher = new Bun.CryptoHasher('sha256')
        hasher.update(key)
        return hasher.digest('hex')
      },
      CloudErrorCode.CryptoError
    )
  }

  /**
   * Verifies a license key against a stored hash.
   * @param key - Raw license key
   * @param storedHash - The stored SHA-256 hash to compare against
   * @returns Result with boolean indicating match
   */
  static async verifyLicenseKey(key: string, storedHash: string): Promise<Result<boolean, { code: string; message: string }>> {
    const hashResult = await this.hashLicenseKey(key)
    if (!hashResult.ok) return hashResult
    return ok(hashResult.value === storedHash)
  }
}
