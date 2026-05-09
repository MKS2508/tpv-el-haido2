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
    apiLogger.error('Unhandled error', { code, message: msg })
    set.status = 500
    return { error: 'Internal Server Error', code }
  })
  .use(healthRoutes)
  .use(updateRoutes)
  .use(downloadRoutes)
  .use(licenseRoutes)
  .listen(PORT)

apiLogger.success('tpv-cloud started', {
  url: `http://0.0.0.0:${PORT}`,
  endpoints: ['/health', '/updates/:target/:arch/:version', '/dl/*', '/license/validate', '/license/activate']
})
