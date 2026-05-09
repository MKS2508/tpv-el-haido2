import { Elysia, t } from 'elysia'
import { db } from '../db/client'
import { sql } from 'drizzle-orm'
import { apiLogger } from '../lib/logger'

export const healthRoutes = new Elysia({ prefix: '' })
  .get('/health', async ({ set }) => {
    let dbStatus: 'connected' | 'error' = 'error'

    try {
      await db.execute(sql`SELECT 1`)
      dbStatus = 'connected'
    } catch (e) {
      apiLogger.error('DB health check failed', { error: e })
    }

    if (dbStatus === 'error') {
      set.status = 503
    }

    return {
      status: 'ok' as const,
      version: '0.1.0',
      db: dbStatus
    }
  }, {
    response: t.Object({
      status: t.Literal('ok'),
      version: t.String(),
      db: t.Union([t.Literal('connected'), t.Literal('error')])
    })
  })
