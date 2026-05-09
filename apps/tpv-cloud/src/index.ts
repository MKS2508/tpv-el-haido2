import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { healthRoutes } from './routes/health'
import { updateRoutes } from './routes/updates'
import { downloadRoutes } from './routes/downloads'
import { licenseRoutes } from './routes/license'
import { apiLogger } from './lib/logger'

const PORT = Number.parseInt(process.env.PORT ?? '3003', 10)

const app = new Elysia()
  .use(cors({ origin: true }))
  .onBeforeHandle(({ request }) => {
    apiLogger.info(`${request.method} ${new URL(request.url).pathname}`)
  })
  .onError(({ code, error, set }) => {
    const msg = error instanceof Error ? error.message : String(error)

    // NOT_FOUND es route inexistente → 404, no es error real, log como info no error
    if (code === 'NOT_FOUND') {
      apiLogger.info('Route not found', { path: 'unknown' })
      set.status = 404
      return { error: 'Not Found', code: 'NOT_FOUND' }
    }

    // VALIDATION es body/params malformados → 422
    if (code === 'VALIDATION') {
      apiLogger.warn('Validation failed', { message: msg })
      set.status = 422
      return { error: 'Validation Failed', code: 'VALIDATION', details: msg }
    }

    // Cualquier otro error real
    apiLogger.error('Unhandled error', { code, message: msg })
    set.status = 500
    return { error: 'Internal Server Error', code }
  })
  // GET / — service info (evita logs de NOT_FOUND por probes externos a la raíz)
  .get('/', () => ({
    service: 'tpv-cloud',
    version: '0.1.0',
    description: 'TPV El Haido unified cloud service: updates + license validation',
    endpoints: ['/health', '/updates/:target/:arch/:version', '/dl/*', '/license/validate', '/license/activate']
  }))
  .use(healthRoutes)
  .use(updateRoutes)
  .use(downloadRoutes)
  .use(licenseRoutes)
  .listen(PORT)

apiLogger.success('tpv-cloud started', {
  url: `http://0.0.0.0:${PORT}`,
  endpoints: ['/health', '/updates/:target/:arch/:version', '/dl/*', '/license/validate', '/license/activate']
})
