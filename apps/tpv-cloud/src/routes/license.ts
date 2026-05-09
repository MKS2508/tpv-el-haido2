import { Elysia, t } from 'elysia'
import { LicenseService } from '../services/license.service'
import { apiLogger } from '../lib/logger'

const LicenseRequestBody = t.Object({
  key: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  machine_fingerprint: t.String({ minLength: 1 })
})

export const licenseRoutes = new Elysia({ prefix: '/license' })
  .post('/validate', async ({ body, set }) => {
    apiLogger.info('License validate', { email: body.email })
    const result = await LicenseService.validate(body.key, body.email, body.machine_fingerprint)

    if (!result.ok) {
      set.status = 500
      return { valid: false, error: 'Internal error', code: result.error.code }
    }

    if (!result.value.valid) {
      set.status = 422
    }

    return result.value
  }, { body: LicenseRequestBody })

  .post('/activate', async ({ body, set, request }) => {
    const ip = request.headers.get('x-forwarded-for') ?? undefined
    apiLogger.info('License activate', { email: body.email })
    const result = await LicenseService.activate(body.key, body.email, body.machine_fingerprint, ip)

    if (!result.ok) {
      set.status = 500
      return { valid: false, error: 'Internal error', code: result.error.code }
    }

    if (!result.value.valid) {
      set.status = 422
    }

    return result.value
  }, { body: LicenseRequestBody })
