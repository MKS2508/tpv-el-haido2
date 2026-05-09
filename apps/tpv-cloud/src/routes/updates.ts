import { Elysia, t } from 'elysia'
import { UpdateService } from '../services/update.service'
import { CloudErrorCode } from '../lib/error-codes'
import { apiLogger } from '../lib/logger'

export const updateRoutes = new Elysia({ prefix: '' })
  .get('/updates/:target/:arch/:current_version', async ({ params, set }) => {
    const { target, arch, current_version } = params
    apiLogger.info('Update check', { target, arch, current_version })

    const result = await UpdateService.checkUpdate(target, arch, current_version)

    if (!result.ok) {
      if (result.error.code === CloudErrorCode.UnsupportedTarget) {
        set.status = 404
        return { error: result.error.message }
      }
      set.status = 500
      return { error: 'Internal error' }
    }

    if (result.value === null) {
      set.status = 204
      return
    }

    return result.value
  }, {
    params: t.Object({
      target: t.String(),
      arch: t.String(),
      current_version: t.String()
    })
  })
