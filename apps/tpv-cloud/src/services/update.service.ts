import semver from 'semver'
import { db } from '../db/client'
import { releases } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { tryCatchAsync, ok, fail } from '@mks2508/no-throw'
import type { Result } from '@mks2508/no-throw'
import type { IUpdateResponse } from '../types'
import { CloudErrorCode } from '../lib/error-codes'
import { updateLogger } from '../lib/logger'

const SUPPORTED_TARGETS = ['windows', 'darwin', 'linux'] as const
const SUPPORTED_ARCHES = ['x86_64', 'aarch64'] as const

export class UpdateService {
  /**
   * Check if an update is available for target/arch by comparing semver.
   * @returns ok(IUpdateResponse) if update available, ok(null) if no update, fail for errors
   */
  static async checkUpdate(
    target: string,
    arch: string,
    currentVersion: string
  ): Promise<Result<IUpdateResponse | null, { code: string; message: string }>> {
    if (!SUPPORTED_TARGETS.includes(target as any) || !SUPPORTED_ARCHES.includes(arch as any)) {
      updateLogger.warn('Unsupported target/arch', { target, arch })
      return fail(CloudErrorCode.UnsupportedTarget, `Unsupported: ${target}/${arch}`)
    }

    return tryCatchAsync(async () => {
      const [latest] = await db
        .select()
        .from(releases)
        .where(and(eq(releases.target, target), eq(releases.arch, arch)))
        .orderBy(desc(releases.pubDate))
        .limit(1)

      if (!latest) {
        updateLogger.info('No releases found', { target, arch })
        return null
      }

      if (!semver.valid(currentVersion) || !semver.valid(latest.version)) {
        updateLogger.warn('Invalid semver', { currentVersion, latestVersion: latest.version })
        return null
      }

      const hasUpdate = semver.gt(latest.version, currentVersion)
      updateLogger.info('Update check', { target, arch, currentVersion, latestVersion: latest.version, hasUpdate })

      if (!hasUpdate) return null

      const url = `https://updates.mks2508.systems/dl/${latest.version}/TPV-El-Haido_${latest.version}_x64-setup.exe`

      const response: IUpdateResponse = {
        version: latest.version,
        notes: latest.notes ?? '',
        pub_date: latest.pubDate.toISOString(),
        url,
        signature: latest.signature
      }

      return response
    }, CloudErrorCode.DatabaseError)
  }
}
