import { db } from '../db/client'
import { licenses, activations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { tryCatchAsync, ok, fail } from '@mks2508/no-throw'
import type { Result } from '@mks2508/no-throw'
import { CryptoService } from './crypto.service'
import type { ILicenseResponse } from '../types'
import { CloudErrorCode } from '../lib/error-codes'
import { licenseLogger } from '../lib/logger'

export class LicenseService {
  /**
   * Validates a license key. Supports master license via env vars (no DB).
   */
  static async validate(
    key: string,
    email: string,
    machineFingerprint: string
  ): Promise<Result<ILicenseResponse, { code: string; message: string }>> {
    licenseLogger.info('Validating license', { email })

    // Master license: check against env vars (no DB, no activation)
    const masterEmail = process.env.MASTER_LICENSE_EMAIL
    const masterKey = process.env.MASTER_LICENSE_KEY

    if (masterEmail && masterKey && email === masterEmail && key === masterKey) {
      licenseLogger.info('Master license validated', { email })
      return ok({
        valid: true,
        license_type: 'master',
        email,
        expires_at: null
      })
    }

    // Regular license: DB lookup
    return tryCatchAsync(async () => {
      const hashResult = await CryptoService.hashLicenseKey(key)
      if (!hashResult.ok) {
        return { valid: false, error: 'Crypto error', code: CloudErrorCode.CryptoError }
      }

      const [license] = await db.select().from(licenses).where(eq(licenses.keyHash, hashResult.value))

      if (!license) {
        return { valid: false, error: 'License not found', code: CloudErrorCode.LicenseNotFound }
      }

      if (!license.isActive) {
        return { valid: false, error: 'License deactivated', code: CloudErrorCode.LicenseDeactivated }
      }

      if (license.expiresAt && license.expiresAt < new Date()) {
        return { valid: false, error: 'License expired', code: CloudErrorCode.LicenseExpired }
      }

      return {
        valid: true,
        license_type: 'regular' as const,
        email: license.email,
        expires_at: license.expiresAt?.toISOString() ?? null
      }
    }, CloudErrorCode.DatabaseError)
  }

  /**
   * Activates a license: creates activation record + updates license fingerprint.
   */
  static async activate(
    key: string,
    email: string,
    machineFingerprint: string,
    ipAddress?: string
  ): Promise<Result<ILicenseResponse, { code: string; message: string }>> {
    licenseLogger.info('Activating license', { email })

    // Master license: no persistence
    const masterEmail = process.env.MASTER_LICENSE_EMAIL
    const masterKey = process.env.MASTER_LICENSE_KEY

    if (masterEmail && masterKey && email === masterEmail && key === masterKey) {
      licenseLogger.info('Master license activated (noop)', { email })
      return ok({
        valid: true,
        license_type: 'master',
        email,
        expires_at: null
      })
    }

    return tryCatchAsync(async () => {
      const hashResult = await CryptoService.hashLicenseKey(key)
      if (!hashResult.ok) {
        return { valid: false, error: 'Crypto error', code: CloudErrorCode.CryptoError }
      }

      const [license] = await db.select().from(licenses).where(eq(licenses.keyHash, hashResult.value))

      if (!license) {
        return { valid: false, error: 'License not found', code: CloudErrorCode.LicenseNotFound }
      }

      if (!license.isActive) {
        return { valid: false, error: 'License deactivated', code: CloudErrorCode.LicenseDeactivated }
      }

      // Create activation record
      await db.insert(activations).values({
        licenseId: license.id,
        machineFingerprint,
        ipAddress: ipAddress ?? null
      })

      // Update machineFingerprint on license if empty
      if (!license.machineFingerprint) {
        await db
          .update(licenses)
          .set({ machineFingerprint, activatedAt: new Date() })
          .where(eq(licenses.id, license.id))
      }

      licenseLogger.info('License activated', { email, machineFingerprint })

      return {
        valid: true,
        license_type: 'regular' as const,
        email: license.email,
        expires_at: license.expiresAt?.toISOString() ?? null
      }
    }, CloudErrorCode.DatabaseError)
  }
}
