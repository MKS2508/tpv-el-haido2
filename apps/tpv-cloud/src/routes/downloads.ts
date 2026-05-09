import { Elysia } from 'elysia'
import { staticPlugin } from '@elysiajs/static'
import { apiLogger } from '../lib/logger'

export const downloadRoutes = new Elysia()
  .use(
    staticPlugin({
      assets: process.env.BINARIES_DIR ?? '/srv/binaries',
      prefix: ''
    })
  )
  .onRequest(({ request }) => {
    if (request.url.includes('/dl/')) {
      apiLogger.info('Download request', { url: request.url })
    }
  })
