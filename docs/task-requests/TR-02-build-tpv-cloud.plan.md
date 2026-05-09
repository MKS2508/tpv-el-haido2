---
type: task-plan
source: docs/task-requests/TR-02-build-tpv-cloud.md
status: draft
changes: 22
effort: medio
commit-strategy: single
commit-prefix: feat-phase(0.4.0.B)
---

# TR-02 Plan — Build tpv-cloud Unified Service

> Generado por task-decomposer. Ejecutor: no modificar código fuera de `apps/tpv-cloud/`.
> Decision doc lockeada: `docs/decisions/r1-deployment-architecture-2026-05-09.md` (D1-D9).

---

## Pre-flight checks (verificar antes de tocar nada)

```bash
# 1. Estado Coolify
coolify-cli list
# Esperado: server awgcco0k48g4kgw8cckkc808 visible, 17 apps

# 2. Confirmar project haido existe
coolify-cli projects
# Esperado: vg48wsk4808ocoggoco8444g aparece como "haido"

# 3. Git status limpio
git status
# Esperado: solo .claude/MESSAGES.md modificado (del git status del inicio)

# 4. Bun version
bun --version
# Esperado: >= 1.1.43

# 5. Verificar DNS (CRÍTICO para cert Let's Encrypt)
dig updates.mks2508.systems +short
# Esperado: 77.42.25.248 (IP de lab1-helsinki)

# 6. Verificar que license-server old está dead (no revivir)
coolify-cli status license-server 2>/dev/null || echo "not found or dead"
# OK si exited:unhealthy o not found
```

**Blocker**: Si `dig updates.mks2508.systems` no devuelve `77.42.25.248`, el cert HTTPS fallará.
Resolución: añadir registro A en DNS del dominio antes de hacer deploy.

---

## Tabla de cambios

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `apps/tpv-cloud/package.json` | CREATE | Config Bun + deps Elysia + Drizzle |
| `apps/tpv-cloud/tsconfig.json` | CREATE | TS config, ESNext, bun-types |
| `apps/tpv-cloud/drizzle.config.ts` | CREATE | Drizzle Kit config apuntando a DB |
| `apps/tpv-cloud/src/index.ts` | CREATE | Entry point Elysia, registro de routes |
| `apps/tpv-cloud/src/db/schema.ts` | CREATE | Drizzle schema (licenses, releases, activations) |
| `apps/tpv-cloud/src/db/client.ts` | CREATE | Drizzle + postgres client |
| `apps/tpv-cloud/src/db/migrate.ts` | CREATE | Script run migrations on startup |
| `apps/tpv-cloud/src/routes/updates.ts` | CREATE | GET /updates/:target/:arch/:current_version |
| `apps/tpv-cloud/src/routes/downloads.ts` | CREATE | GET /dl/:version/* static serve |
| `apps/tpv-cloud/src/routes/license.ts` | CREATE | POST /license/validate + /license/activate |
| `apps/tpv-cloud/src/routes/health.ts` | CREATE | GET /health con DB check |
| `apps/tpv-cloud/src/services/update.service.ts` | CREATE | Semver compare + DB lookup |
| `apps/tpv-cloud/src/services/license.service.ts` | CREATE | License validation, master license, activations |
| `apps/tpv-cloud/src/services/crypto.service.ts` | CREATE | SHA-256 hash (port desde license-server) |
| `apps/tpv-cloud/src/types/index.ts` | CREATE | Interfaces IUpdateResponse, ILicenseRequest, etc. |
| `apps/tpv-cloud/src/lib/error-codes.ts` | CREATE | CloudErrorCode const |
| `apps/tpv-cloud/src/lib/logger.ts` | CREATE | better-logger scopes |
| `apps/tpv-cloud/drizzle/` | CREATE | Dir para migrations generadas por drizzle-kit |
| `apps/tpv-cloud/Dockerfile` | CREATE | Multi-stage, non-root, healthcheck |
| `apps/tpv-cloud/docker-compose.yml` | CREATE | Dev local con postgres + volume |
| `apps/tpv-cloud/.env.example` | CREATE | Template de env vars |
| `apps/tpv-cloud/README.md` | SKIP | No documentación salvo que se pida |

---

## Phase A — Estructura base `apps/tpv-cloud/`

**Estimación**: 20-30 min
**Criterio de cierre**: `bun install` sin errores en `apps/tpv-cloud/` y `bun run typecheck` pasa.

### A.1 — `package.json`

```json
{
  "name": "tpv-cloud",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun run src/db/migrate.ts",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@elysiajs/cors": "^1.2.0",
    "@elysiajs/static": "^1.1.0",
    "@mks2508/better-logger": "^5.0.2",
    "@mks2508/no-throw": "^0.2.0",
    "drizzle-orm": "^0.36.0",
    "elysia": "^1.4.28",
    "postgres": "^3.4.4",
    "semver": "^7.6.3"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/semver": "^7.5.8",
    "bun-types": "latest",
    "drizzle-kit": "^0.27.0",
    "typescript": "^5.9.3"
  }
}
```

**Nota**: `@elysiajs/static` para servir binarios del volume. `postgres` (npm package) es el driver PG para Drizzle. `semver` package oficial (NO comparación manual).

### A.2 — `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "drizzle"]
}
```

### A.3 — `.env.example`

```bash
# DB — Coolify inyecta DATABASE_URL automáticamente si se linkea la DB
DATABASE_URL=postgresql://user:pass@localhost:5432/tpv-cloud-db

# License master (server-side validation)
MASTER_LICENSE_EMAIL=admin@haido.local
MASTER_LICENSE_KEY=HAI-MASTER-DEV-KEY-2026

# Server
PORT=3003
LOG_LEVEL=info
NODE_ENV=production
```

### A.4 — Verificación Phase A

```bash
cd /Volumes/KODAK1TB/REPOS\ y\ PROYECTOS/tauri/tpv-el-haido2/apps/tpv-cloud
bun install
# Esperado: exit 0, lockfile generado

ls src/routes/ src/services/ src/db/ src/lib/ src/types/
# Esperado: directorios vacíos o con archivos

bun run typecheck 2>&1 | tail -5
# Esperado: exit 0 sin errores TS
```

---

## Phase B — Drizzle schema + DB client

**Estimación**: 20-25 min
**Criterio de cierre**: `bun run db:generate` genera archivos SQL en `drizzle/migrations/`.

### B.1 — `src/db/schema.ts`

Schema Drizzle según spec lockeada en TKT-07/r1-D3. Campos exactos:

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, index, primaryKey } from 'drizzle-orm/pg-core'

export const licenses = pgTable('licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyHash: varchar('key_hash', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  machineFingerprint: varchar('machine_fingerprint', { length: 128 }),
  licenseType: varchar('license_type', { length: 32 }).notNull(), // 'master' | 'regular'
  activatedAt: timestamp('activated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => ({
  keyHashIdx: index('licenses_key_hash_idx').on(t.keyHash),
  emailIdx: index('licenses_email_idx').on(t.email)
}))

export const releases = pgTable('releases', {
  version: varchar('version', { length: 32 }).notNull(),
  target: varchar('target', { length: 32 }).notNull(),   // 'windows' | 'darwin' | 'linux'
  arch: varchar('arch', { length: 32 }).notNull(),       // 'x86_64' | 'aarch64'
  url: varchar('url', { length: 512 }).notNull(),
  signature: text('signature').notNull(),                // contenido literal del .sig
  pubDate: timestamp('pub_date').notNull().defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => ({
  pk: primaryKey({ columns: [t.version, t.target, t.arch] }),
  pubDateIdx: index('releases_pub_date_idx').on(t.pubDate)
}))

export const activations = pgTable('activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  licenseId: uuid('license_id').notNull().references(() => licenses.id),
  machineFingerprint: varchar('machine_fingerprint', { length: 128 }).notNull(),
  activatedAt: timestamp('activated_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 64 })
})
```

### B.2 — `src/db/client.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL env var is required')
}

const sql = postgres(connectionString)
export const db = drizzle(sql, { schema })
export type DB = typeof db
```

### B.3 — `src/db/migrate.ts`

Script de migración que se ejecuta en startup del container:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL required for migrations')
}

const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql)

await migrate(db, { migrationsFolder: './drizzle/migrations' })
console.log('Migrations complete')
await sql.end()
```

### B.4 — `drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost/tpv-cloud-db'
  }
} satisfies Config
```

### B.5 — Verificación Phase B

```bash
# Generar migrations (requiere schema correcto)
cd apps/tpv-cloud
bun run db:generate
# Esperado: drizzle/migrations/0000_*.sql creado

ls drizzle/migrations/
# Esperado: al menos 1 archivo SQL con CREATE TABLE licenses, releases, activations

# Verificar SQL generado tiene las 3 tablas
grep -l "CREATE TABLE" drizzle/migrations/*.sql
```

---

## Phase C — Routes + Services

**Estimación**: 60-75 min (es el core del servicio)
**Criterio de cierre**: `bun run dev` arranca sin errores de import. Todos los handlers responden con shapes correctos (aunque DB esté vacía).

### C.0 — `src/lib/error-codes.ts`

Primero crear esto porque los services dependen de él:

```typescript
import type { ErrorCode, ResultError } from '@mks2508/no-throw'

export const CloudErrorCode = {
  // Update errors
  ReleaseNotFound: 'CLOUD_RELEASE_NOT_FOUND',
  UnsupportedTarget: 'CLOUD_UNSUPPORTED_TARGET',
  // License errors
  LicenseNotFound: 'CLOUD_LICENSE_NOT_FOUND',
  LicenseExpired: 'CLOUD_LICENSE_EXPIRED',
  LicenseDeactivated: 'CLOUD_LICENSE_DEACTIVATED',
  LicenseMaxActivations: 'CLOUD_LICENSE_MAX_ACTIVATIONS',
  InvalidKeyFormat: 'CLOUD_INVALID_KEY_FORMAT',
  InvalidEmail: 'CLOUD_INVALID_EMAIL',
  // DB / infra errors
  DatabaseError: 'CLOUD_DATABASE_ERROR',
  CryptoError: 'CLOUD_CRYPTO_ERROR',
  InternalError: 'CLOUD_INTERNAL_ERROR',
} as const

export type CloudErrorCode = ErrorCode<typeof CloudErrorCode>
export type CloudResultError = ResultError<CloudErrorCode>
```

### C.1 — `src/lib/logger.ts`

Port directo del logger del license-server, cambiando scope names:

```typescript
import logger from '@mks2508/better-logger'

logger.preset('cyberpunk')
logger.showTimestamp()
logger.showLocation()

export const updateLogger = logger.scope('[UpdateService]')
export const licenseLogger = logger.scope('[LicenseService]')
export const cryptoLogger = logger.scope('[CryptoService]')
export const dbLogger = logger.scope('[Database]')
export const apiLogger = logger.scope('[API]')

export default logger
```

### C.2 — `src/types/index.ts`

```typescript
/**
 * Response shape v2 para Tauri updater (exacto según spec)
 * https://v2.tauri.app/plugin/updater/
 */
export interface IUpdateResponse {
  version: string
  notes: string
  pub_date: string // ISO 8601
  url: string
  signature: string
}

/**
 * Request body para license validate/activate
 */
export interface ILicenseRequest {
  key: string
  email: string
  machine_fingerprint: string
}

/**
 * Response de license validate exitosa
 */
export interface ILicenseValidResponse {
  valid: true
  license_type: 'master' | 'regular'
  email: string
  expires_at: string | null
}

/**
 * Response de license validate fallida (controlada)
 */
export interface ILicenseInvalidResponse {
  valid: false
  error: string
  code: string
}

export type ILicenseResponse = ILicenseValidResponse | ILicenseInvalidResponse

/**
 * Response del healthcheck
 */
export interface IHealthResponse {
  status: 'ok'
  version: string
  db: 'connected' | 'error'
}
```

### C.3 — `src/services/crypto.service.ts`

Port de `apps/license-server/src/services/crypto.service.ts`. La lógica es idéntica (SHA-256 con Bun.CryptoHasher). Adaptar imports a CloudErrorCode:

```typescript
// Puerto directo, cambiar LicenseErrorCode → CloudErrorCode
// CryptoService.hashLicenseKey(key) → same API
// CryptoService.verifyLicenseKey(key, hash) → same API
// generateLicenseKey() NO necesaria (no creamos licenses desde este server, solo validamos)
```

**Nota al executor**: la función `generateMachineFingerprint()` no es necesaria en el server. Solo `hashLicenseKey` y `verifyLicenseKey`.

### C.4 — `src/services/update.service.ts`

```typescript
import semver from 'semver'
import { db } from '../db/client'
import { releases } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { tryCatchAsync, ok, fail } from '@mks2508/no-throw'
import type { Result } from '@mks2508/no-throw'
import type { IUpdateResponse } from '../types'
import { CloudErrorCode, type CloudResultError } from '../lib/error-codes'
import { updateLogger } from '../lib/logger'

/**
 * Targets soportados
 */
const SUPPORTED_TARGETS = ['windows', 'darwin', 'linux'] as const
const SUPPORTED_ARCHES = ['x86_64', 'aarch64'] as const

/**
 * Busca si hay update disponible para target/arch comparando semver.
 * Retorna ok(response) si latest > current, ok(null) si no hay update, fail(...) si error.
 */
export class UpdateService {
  /**
   * @param target - plataforma: 'windows' | 'darwin' | 'linux'
   * @param arch - arquitectura: 'x86_64' | 'aarch64'
   * @param currentVersion - versión actual del cliente (semver)
   * @returns Result<IUpdateResponse | null, CloudResultError>
   *   - ok(IUpdateResponse) → hay update disponible
   *   - ok(null) → no hay update (cliente ya tiene latest)
   *   - fail(UnsupportedTarget) → target/arch no válidos
   *   - fail(ReleaseNotFound) → no hay releases en DB para este target/arch
   *   - fail(DatabaseError) → error de DB
   */
  static async checkUpdate(
    target: string,
    arch: string,
    currentVersion: string
  ): Promise<Result<IUpdateResponse | null, CloudResultError>> {
    // Validar target/arch
    if (!SUPPORTED_TARGETS.includes(target as any) || !SUPPORTED_ARCHES.includes(arch as any)) {
      updateLogger.warn('Unsupported target/arch', { target, arch })
      return fail(CloudErrorCode.UnsupportedTarget, `Unsupported: ${target}/${arch}`)
    }

    return tryCatchAsync(async () => {
      // SELECT latest release para target+arch
      const [latest] = await db
        .select()
        .from(releases)
        .where(and(eq(releases.target, target), eq(releases.arch, arch)))
        .orderBy(desc(releases.pubDate))
        .limit(1)

      if (!latest) {
        updateLogger.info('No releases found', { target, arch })
        return null // → 404 en el handler
      }

      // Semver compare
      if (!semver.valid(currentVersion) || !semver.valid(latest.version)) {
        updateLogger.warn('Invalid semver', { currentVersion, latestVersion: latest.version })
        return null
      }

      const hasUpdate = semver.gt(latest.version, currentVersion)
      updateLogger.info('Update check', { target, arch, currentVersion, latestVersion: latest.version, hasUpdate })

      if (!hasUpdate) return null // → 204 en el handler

      // Construir URL de descarga
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
```

### C.5 — `src/services/license.service.ts`

Combina lógica del license-server + master license server-side:

```typescript
import { db } from '../db/client'
import { licenses, activations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { tryCatchAsync, ok, fail } from '@mks2508/no-throw'
import type { Result } from '@mks2508/no-throw'
import { CryptoService } from './crypto.service'
import type { ILicenseResponse } from '../types'
import { CloudErrorCode, type CloudResultError } from '../lib/error-codes'
import { licenseLogger } from '../lib/logger'

export class LicenseService {
  /**
   * Valida una license key. Soporta master license via env vars (sin DB).
   * @param key - raw license key (sin hash)
   * @param email - email del usuario
   * @param machineFingerprint - fingerprint de la máquina
   * @returns Result<ILicenseResponse, CloudResultError>
   *   - ok({ valid: true, ... }) → license válida
   *   - ok({ valid: false, ... }) → license inválida (respuesta controlada)
   *   - fail(...) → error interno (DB, crypto)
   */
  static async validate(
    key: string,
    email: string,
    machineFingerprint: string
  ): Promise<Result<ILicenseResponse, CloudResultError>> {
    licenseLogger.info('Validating license', { email })

    // Master license: verificar contra env vars (sin DB, sin activar)
    const masterEmail = process.env.MASTER_LICENSE_EMAIL
    const masterKey = process.env.MASTER_LICENSE_KEY

    if (!masterEmail || !masterKey) {
      licenseLogger.warn('MASTER_LICENSE_EMAIL or MASTER_LICENSE_KEY not set in env')
    }

    if (masterEmail && masterKey && email === masterEmail && key === masterKey) {
      licenseLogger.info('Master license validated', { email })
      return ok({
        valid: true,
        license_type: 'master',
        email,
        expires_at: null
      })
    }

    // Regular license: lookup en DB
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
        license_type: 'regular',
        email: license.email,
        expires_at: license.expiresAt?.toISOString() ?? null
      }
    }, CloudErrorCode.DatabaseError)
  }

  /**
   * Activa una license: inserta en licenses (si no existe) + crea activation record.
   * @param key - raw license key
   * @param email - email del usuario
   * @param machineFingerprint - fingerprint de la máquina
   * @param ipAddress - IP del request (opcional, para audit)
   */
  static async activate(
    key: string,
    email: string,
    machineFingerprint: string,
    ipAddress?: string
  ): Promise<Result<ILicenseResponse, CloudResultError>> {
    licenseLogger.info('Activating license', { email })

    // Master license: no persiste activations, solo valida
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

    // Regular license activation
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

      // Insertar activation record
      await db.insert(activations).values({
        licenseId: license.id,
        machineFingerprint,
        ipAddress: ipAddress ?? null
      })

      // Actualizar machineFingerprint en license si aún no tiene
      if (!license.machineFingerprint) {
        await db
          .update(licenses)
          .set({ machineFingerprint, activatedAt: new Date() })
          .where(eq(licenses.id, license.id))
      }

      licenseLogger.info('License activated', { email, machineFingerprint })

      return {
        valid: true,
        license_type: 'regular',
        email: license.email,
        expires_at: license.expiresAt?.toISOString() ?? null
      }
    }, CloudErrorCode.DatabaseError)
  }
}
```

### C.6 — `src/routes/health.ts`

```typescript
import { Elysia, t } from 'elysia'
import { db } from '../db/client'
import { sql } from 'drizzle-orm'
import { apiLogger } from '../lib/logger'

/**
 * Healthcheck route.
 * GET /health → { status, version, db }
 * Coolify usa este endpoint para determinar si el container está healthy.
 */
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
```

**Importante**: Coolify configura healthcheck en Dockerfile, ruta `/health`.

### C.7 — `src/routes/updates.ts`

```typescript
import { Elysia, t } from 'elysia'
import { UpdateService } from '../services/update.service'
import { apiLogger } from '../lib/logger'

/**
 * Update check route.
 * GET /updates/:target/:arch/:current_version
 *
 * Retorna:
 *   200 + JSON v2 si hay release más nueva
 *   204 No Content si cliente ya tiene latest
 *   404 si target/arch no soportado o sin releases
 */
export const updateRoutes = new Elysia({ prefix: '' })
  .get('/updates/:target/:arch/:current_version', async ({ params, set }) => {
    const { target, arch, current_version } = params
    apiLogger.info('Update check', { target, arch, current_version })

    const result = await UpdateService.checkUpdate(target, arch, current_version)

    if (!result.ok) {
      // error interno o unsupported target
      if (result.error.code === 'CLOUD_UNSUPPORTED_TARGET') {
        set.status = 404
        return { error: result.error.message }
      }
      set.status = 500
      return { error: 'Internal error' }
    }

    if (result.value === null) {
      // No hay update O no hay releases: diferenciar
      set.status = 204
      return
    }

    // Hay update disponible
    return result.value
  }, {
    params: t.Object({
      target: t.String(),
      arch: t.String(),
      current_version: t.String()
    })
  })
```

**CRÍTICO**: `204 No Content` NO envía body (Elysia: `return` sin valor con `set.status = 204`).
El check de "no hay releases" vs "ya tiene latest" ambos devuelven 204 — el spec del Tauri updater no diferencia.

### C.8 — `src/routes/downloads.ts`

```typescript
import { Elysia } from 'elysia'
import { staticPlugin } from '@elysiajs/static'
import { apiLogger } from '../lib/logger'

/**
 * Static binary serve desde volume /srv/binaries.
 *
 * GET /dl/:version/setup.exe      → binary
 * GET /dl/:version/setup.exe.sig  → minisign signature
 *
 * Elysia staticPlugin sirve el directorio completo.
 * El volume /srv/binaries debe tener estructura:
 *   /srv/binaries/dl/0.4.0/TPV-El-Haido_0.4.0_x64-setup.exe
 *   /srv/binaries/dl/0.4.0/TPV-El-Haido_0.4.0_x64-setup.exe.sig
 */
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
```

**Nota importante**: `@elysiajs/static` v1.1.x sirve el directorio raíz como `/`. Con `prefix: ''` y `assets: '/srv/binaries'`, los archivos en `/srv/binaries/dl/0.4.0/setup.exe` se sirven en `GET /dl/0.4.0/setup.exe`. Verificar versión del plugin — puede requerir `prefix: '/'` o ajuste. El executor debe testear localmente con docker-compose.

### C.9 — `src/routes/license.ts`

```typescript
import { Elysia, t } from 'elysia'
import { LicenseService } from '../services/license.service'
import { apiLogger } from '../lib/logger'

const LicenseRequestBody = t.Object({
  key: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  machine_fingerprint: t.String({ minLength: 1 })
})

/**
 * License validation and activation routes.
 * POST /license/validate → { valid, license_type, email, expires_at } | { valid: false, error, code }
 * POST /license/activate → same shape
 */
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
```

### C.10 — `src/index.ts`

```typescript
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
```

### C.11 — Verificación Phase C

```bash
cd apps/tpv-cloud

# Typecheck con todos los archivos
bun run typecheck
# Esperado: 0 errors

# Dev server arranca (requiere DATABASE_URL, usar docker-compose local o mock)
DATABASE_URL="postgresql://test:test@localhost/test" bun run dev 2>&1 | head -20
# Esperado: "tpv-cloud started" en logs (puede fallar la DB connection, no el import)
```

---

## Phase D — Dockerfile + docker-compose.yml

**Estimación**: 20-25 min
**Criterio de cierre**: `docker build -t tpv-cloud .` pasa. `docker compose up` en local levanta app + postgres.

### D.1 — `Dockerfile`

```dockerfile
FROM oven/bun:1.1.43-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.1.43-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

FROM oven/bun:1.1.43-alpine AS runtime
WORKDIR /app

# Non-root user (Coolify best practice)
RUN addgroup -g 1001 -S nodejs && adduser -S bun -u 1001
USER bun

COPY --from=builder --chown=bun:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bun:nodejs /app/src ./src
COPY --from=builder --chown=bun:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=bun:nodejs /app/package.json ./
COPY --from=builder --chown=bun:nodejs /app/tsconfig.json ./

# Volume para binarios
VOLUME ["/srv/binaries"]

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

# Entrypoint: migrar primero, luego arrancar
CMD ["sh", "-c", "bun run src/db/migrate.ts && bun run src/index.ts"]
```

**Decisiones del Dockerfile**:
- `oven/bun:1.1.43-alpine` — imagen oficial Bun (Alpine para tamaño mínimo)
- Multi-stage: deps → builder → runtime (solo copiamos lo necesario)
- Non-root user `bun` (uid 1001)
- `HEALTHCHECK` usa `wget` (disponible en Alpine) en vez de `curl`
- Entrypoint corre `migrate.ts` primero → si la DB no está lista, el container falla (Coolify retry)

### D.2 — `docker-compose.yml`

Para desarrollo local (NO para Coolify — Coolify usa el Dockerfile directamente):

```yaml
version: '3.8'

services:
  tpv-cloud:
    build: .
    ports:
      - "3003:3003"
    environment:
      DATABASE_URL: postgresql://tpv:tpv@postgres:5432/tpv-cloud-db
      MASTER_LICENSE_EMAIL: admin@haido.local
      MASTER_LICENSE_KEY: HAI-MASTER-DEV-KEY-2026
      PORT: 3003
      LOG_LEVEL: info
      NODE_ENV: development
    volumes:
      - binaries:/srv/binaries
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: tpv
      POSTGRES_PASSWORD: tpv
      POSTGRES_DB: tpv-cloud-db
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tpv -d tpv-cloud-db"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  binaries:
  pgdata:
```

### D.3 — Verificación Phase D

```bash
cd apps/tpv-cloud

# Build imagen
docker build -t tpv-cloud:local .
# Esperado: exit 0, imagen creada

docker images tpv-cloud:local
# Esperado: tamaño ~200-400MB

# Test local con docker-compose
docker compose up -d
# Esperar 10-15s para postgres healthy + migrations

curl -s http://localhost:3003/health | jq
# Esperado: {"status":"ok","version":"0.1.0","db":"connected"}

# Test update (sin data en DB → 204)
curl -sv http://localhost:3003/updates/windows/x86_64/0.0.0 2>&1 | grep "< HTTP"
# Esperado: HTTP/1.1 204

# Test license validate (sin data → 422 con valid: false)
curl -s -X POST http://localhost:3003/license/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"TEST-TEST-TEST-TEST","email":"test@test.com","machine_fingerprint":"test"}' | jq
# Esperado: {"valid":false,"error":"License not found",...}

# Test master license
curl -s -X POST http://localhost:3003/license/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"HAI-MASTER-DEV-KEY-2026","email":"admin@haido.local","machine_fingerprint":"test"}' | jq
# Esperado: {"valid":true,"license_type":"master",...}

docker compose down
```

---

## Phase E — Coolify deployment

**Estimación**: 30-40 min
**Criterio de cierre**: `curl https://updates.mks2508.systems/health` devuelve `{"status":"ok","db":"connected"}`.

### E.1 — Verificar DNS antes de crear app

```bash
# CRÍTICO: DNS debe estar resuelto antes de deploy
dig updates.mks2508.systems +short
# Debe retornar 77.42.25.248 (IP de lab1-helsinki)

# Si NO está configurado, añadir registro A en el DNS del dominio mks2508.systems
# (gestionar en proveedor DNS — Cloudflare, Hetzner, etc.)
# A   updates.mks2508.systems   77.42.25.248   TTL=300
```

### E.2 — Crear DB PostgreSQL

```bash
# Crear DB nueva en project haido
coolify-cli db create postgresql \
  --server awgcco0k48g4kgw8cckkc808 \
  --project vg48wsk4808ocoggoco8444g \
  --environment production \
  --name tpv-cloud-db

# Esperar hasta healthy
coolify-cli status tpv-cloud-db
# Polling hasta: running:healthy

# Obtener connection string (Coolify la genera)
coolify-cli env tpv-cloud-db
# Buscar DATABASE_URL o POSTGRES_URL
# Guardar el valor para el siguiente paso
```

**Gap identificado**: `coolify-cli db create` puede no tener flag `--environment`. Verificar `coolify-cli db create --help`. Si no existe el flag, omitir (Coolify usa el environment por defecto del project).

### E.3 — Crear app tpv-cloud

```bash
coolify-cli create \
  --type dockerfile \
  --project vg48wsk4808ocoggoco8444g \
  --name tpv-cloud \
  --domain updates.mks2508.systems \
  --git https://github.com/MKS2508/tpv-el-haido2 \
  --base-dir /apps/tpv-cloud \
  --branch main
```

**Gap**: `coolify-cli create` puede necesitar flags distintos. Verificar `coolify-cli create --help`. Si el subcommand no existe, usar `coolify-cli app create` o equivalente.

### E.4 — Configurar env vars

```bash
# Obtener DATABASE_URL del step E.2 (connection string de la DB creada)
# Reemplazar <DB_CONNECTION_STRING> con el valor real

coolify-cli env tpv-cloud --add DATABASE_URL=<DB_CONNECTION_STRING>
coolify-cli env tpv-cloud --add MASTER_LICENSE_EMAIL=admin@haido.local
coolify-cli env tpv-cloud --add MASTER_LICENSE_KEY=HAI-MASTER-DEV-KEY-2026
coolify-cli env tpv-cloud --add LOG_LEVEL=info
coolify-cli env tpv-cloud --add NODE_ENV=production
coolify-cli env tpv-cloud --add PORT=3003

# Verificar
coolify-cli env tpv-cloud
```

**Alternativa si coolify-cli env no soporta `--add`**: configurar via Coolify dashboard UI (sección Environment Variables de la app).

### E.5 — Configurar persistent volume

```bash
# Coolify persistent volume para /srv/binaries
# Intentar via CLI primero:
coolify-cli volume tpv-cloud --add /srv/binaries

# Si CLI no soporta volumes: configurar via Coolify dashboard UI
# App tpv-cloud → Settings → Volumes → Add Volume
# Host path: /data/coolify/volumes/tpv-cloud-binaries (o Coolify-managed)
# Container path: /srv/binaries
```

**Gap identificado (TKT-07)**: Coolify puede no soportar config declarativa de volumes via CLI. En ese caso el executor usa el dashboard. El volumen es crítico para que los binarios sobrevivan restarts.

### E.6 — Deploy

```bash
# Push código al main primero (si hay cambios)
git add apps/tpv-cloud/
git status
# Verificar que solo hay nuevos archivos en apps/tpv-cloud/

# Deploy via CLI
coolify-cli deploy tpv-cloud

# Seguir logs
coolify-cli logs tpv-cloud --since 5m
# Esperado: "Migrations complete" + "tpv-cloud started"
```

### E.7 — Verificar estado en Coolify

```bash
# Estado del container
coolify-cli status tpv-cloud
# Esperado: running:healthy

# Ver logs recientes
coolify-cli logs tpv-cloud --errors --since 10m
# Esperado: sin errores
```

---

## Phase F — Verification (smoke test)

**Estimación**: 15-20 min
**Criterio de cierre**: todos los curls devuelven los HTTP status y shapes esperados.

```bash
BASE="https://updates.mks2508.systems"

# F.1 — Healthcheck (CRÍTICO)
curl -s "$BASE/health" | jq
# ESPERADO: {"status":"ok","version":"0.1.0","db":"connected"}

# F.2 — Update endpoint sin data (204)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/updates/windows/x86_64/0.0.0")
echo "Status: $STATUS"
# ESPERADO: 204

# F.3 — Update endpoint target inválido (404)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/updates/android/arm64/0.0.0")
echo "Status: $STATUS"
# ESPERADO: 404

# F.4 — License validate con key inválida (422)
curl -s -X POST "$BASE/license/validate" \
  -H "Content-Type: application/json" \
  -d '{"key":"FAKE-FAKE-FAKE-FAKE","email":"fake@fake.com","machine_fingerprint":"fp123"}' | jq
# ESPERADO: {"valid":false,"error":"License not found","code":"CLOUD_LICENSE_NOT_FOUND"}

# F.5 — Master license validate (200 + valid: true)
curl -s -X POST "$BASE/license/validate" \
  -H "Content-Type: application/json" \
  -d '{"key":"HAI-MASTER-DEV-KEY-2026","email":"admin@haido.local","machine_fingerprint":"bar-windows-x64"}' | jq
# ESPERADO: {"valid":true,"license_type":"master","email":"admin@haido.local","expires_at":null}

# F.6 — HTTPS cert válido
curl -sv "$BASE/health" 2>&1 | grep "SSL certificate verify ok"
# ESPERADO: "SSL certificate verify ok"

# F.7 — DB tables exist (verificar via psql o Coolify DB console)
# coolify-cli exec tpv-cloud-db "psql -U tpv -d tpv-cloud-db -c '\dt'"
# ESPERADO: licenses, releases, activations tables

# F.8 — Volume persiste (test restart)
coolify-cli restart tpv-cloud
# Esperar 20s
curl -s "$BASE/health" | jq
# ESPERADO: {"status":"ok","db":"connected"}

# Resumen final
echo "=== ACCEPTANCE CRITERIA ==="
echo "[ ] DB running:healthy" 
echo "[ ] App running:healthy"
echo "[ ] GET /health → 200 + db:connected"
echo "[ ] GET /updates/windows/x86_64/0.0.0 → 204"
echo "[ ] GET /updates/android/arm64/0.0.0 → 404"
echo "[ ] POST /license/validate (fake) → 422 + valid:false"
echo "[ ] POST /license/validate (master) → 200 + valid:true"
echo "[ ] HTTPS cert válido"
echo "[ ] 3 tablas en DB"
echo "[ ] Volume /srv/binaries persiste tras restart"
```

---

## Milestones (claude tasks)

Una `TaskCreate` por milestone. El executor las crea todas upfront con metadata + `addBlockedBy`, luego itera `TaskUpdate(in_progress|completed)` en orden topológico.

| # | Subject | Estimate | addBlockedBy | role |
|---|---|---|---|---|
| M1 | M1 — Estructura base apps/tpv-cloud (package.json, tsconfig, .env.example) | 25m | — | — |
| M2 | M2 — Drizzle schema + DB client + migrate script | 25m | M1 | — |
| M3 | M3 — Logger, error-codes, types, crypto service | 20m | M1 | — |
| M4 | M4 — Routes + Services (updates, downloads, license, health) | 70m | M2, M3 | — |
| M5 | M5 — Dockerfile + docker-compose + test local | 25m | M4 | — |
| M6 | M6 — Coolify deployment (DB, app, env vars, volume) + verification | 40m | M5 | canonical |

**Metadata común a todas las milestones**:
- `roadmapItemId: "TR-02"`
- `phase: "0.4.0.B"`
- `tags: ["TR-02", "tpv-cloud", "elysia", "drizzle", "coolify"]`
- `category: "feature"`
- `priority: "critical"`

**Metadata específica de M6 (canonical)**:
- `role: "canonical"`

---

## Decisiones tomadas

### DT-1: Port de license-server → NO migrar schema completo

El license-server actual usa SQLite con `integer` IDs, `key_plain` (texto plano!), `activation_count`, `max_activations`. El nuevo schema Drizzle usa PostgreSQL con `uuid` IDs, sin `key_plain` (por seguridad), sin `activation_count`/`max_activations` (simplificado).

**Rationale**: El license-server estaba `exited:unhealthy` y probablemente sin data. No tiene sentido hacer el schema compatible. El nuevo schema es más limpio.

### DT-2: `activate` endpoint — sin límite de activaciones

La spec de TKT-07 no menciona `max_activations`. Decisión: `activate` siempre crea un registro de activation y actualiza el `machineFingerprint` de la license si no tenía uno. No hay límite de activaciones en v1.

### DT-3: `@elysiajs/static` para downloads

Alternativa a servir con `Bun.file()` manual. `@elysiajs/static` sirve un directorio entero, más simple para estructura `/dl/version/filename`. **Riesgo**: la config `prefix` puede necesitar ajuste. El executor debe verificar el comportamiento con un archivo de prueba en local.

### DT-4: `semver` npm package (no `@biomejs/biome/semver`)

El package `semver` es el estándar de Node/Bun ecosystem. Verificar que funciona con Bun (sí — es ESM compatible).

### DT-5: Migrate on startup vs separate job

Se elige `CMD ["sh", "-c", "bun run src/db/migrate.ts && bun run src/index.ts"]` en Dockerfile. Si la DB no está ready en el momento del startup, el container falla y Coolify lo reinicia. Coolify healthcheck da tiempo suficiente (`--start-period=15s`).

### DT-6: `204 No Content` para dos casos

Tanto "cliente ya tiene latest" como "no hay releases en DB para target/arch" devuelven 204. Esto es correcto según el Tauri updater spec — el cliente simplemente no actualiza. El caso "target/arch no soportado" devuelve 404.

---

## Risk register

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| R1 | DNS `updates.mks2508.systems` no resuelve a 77.42.25.248 | Media | CRÍTICO (HTTPS falla, cert no emite) | Verificar DNS en pre-flight. Configurar registro A antes de deploy. |
| R2 | `coolify-cli db create` no soporta `--environment` flag | Alta | Bajo (workaround: omitir flag) | Probar `coolify-cli db create --help` y adaptar comando. |
| R3 | `coolify-cli create`/`deploy` sintaxis distinta a la documentada | Alta | Medio (retraso) | Probar `coolify-cli --help` y ajustar. Fallback: Coolify UI. |
| R4 | Persistent volume `/srv/binaries` no configurable via CLI | Media | Bajo (usar UI de Coolify) | Documentado en TKT-07. Fallback: Coolify dashboard → Settings → Volumes. |
| R5 | `@elysiajs/static` con `prefix: ''` no sirve `/dl/*` correctamente | Media | Medio | Testear en local con `docker compose up` antes de deploy. Ajustar prefix si necesario. |
| R6 | `drizzle-kit generate` genera SQL incompatible con la versión de postgres del container | Baja | Medio | Testear `db:push` en local con docker-compose. Revisar SQL generado. |
| R7 | Tauri updater cliente espera URL exacta: `TPV-El-Haido_{version}_x64-setup.exe` | Media | Alto (OTA broken) | La URL la construye `update.service.ts` — verificar que el naming coincide con el binary real que se sube al volume en TKT-04/TKT-10. |
| R8 | `bun run db:migrate` en startup falla si la DB no está lista | Media | Bajo (Coolify reinicia) | `--start-period=15s` en healthcheck da tiempo. Aumentar a 30s si hay problemas. |

---

## Dependencias y orden de ejecución

```
M1 (estructura)
  ↓
M2 (schema/DB)    M3 (logger/types/crypto)
  ↓                      ↓
       M4 (routes + services) ← ambos
              ↓
       M5 (Dockerfile + docker test)
              ↓
       M6 (Coolify deploy + verify) ← CANONICAL
```

M2 y M3 son disjuntos — pueden ejecutarse en paralelo si hay dos agentes. M4 los require a ambos.

---

## Notas para el executor

1. **No tocar `src/` del root ni `apps/license-server/`**. Todo el código nuevo va en `apps/tpv-cloud/`.

2. **Antes de Phase E (Coolify)**, hacer commit con `[#TR-02]` en el mensaje:
   ```
   feat-phase(0.4.0.B): add tpv-cloud unified service (Elysia + Drizzle + Postgres) [#TR-02]
   ```

3. **La `bun.lockb`** de `apps/tpv-cloud/` es independiente del root. No confundir. El monorepo tiene `bun.lockb` raíz, pero `apps/tpv-cloud/` tiene su propio `bun install`.

4. **`bun:sqlite` NO está disponible** en tpv-cloud (no lo necesitamos). El driver es `postgres` npm package con Drizzle.

5. **El license-server antiguo** tiene `key_plain` en BD (dato sensible). El nuevo NO almacena el key plain, solo el hash SHA-256. Comportamiento más seguro.

6. **`coolify-cli logs tpv-cloud`** puede requerir UUID del app en vez del nombre. Obtener UUID con `coolify-cli list` o `coolify-cli status tpv-cloud`.

---

## Git context

- Rama sugerida: `main` (el proyecto trabaja directamente en main según git log)
  (inferida de: el proyecto usa commits directos a main, no feature branches)
- Commit prefix: `feat-phase(0.4.0.B)` (del campo `commit-prefix` en TR-02 frontmatter)
- Tag para hook: `[#TR-02]` — incluir en TODOS los commits de este task
  para que el hook `post-tool-use-bash` linkee el commit a la UDA `gitcommit`
- Estrategia: `single` (un commit al final, en M6 canonical)

Mensaje de commit sugerido (M6):
```
feat-phase(0.4.0.B): add tpv-cloud unified service (Elysia + Drizzle + Postgres + Coolify) [#TR-02]

<technical>
- New app apps/tpv-cloud/ with Bun + Elysia framework
- Drizzle ORM with PostgreSQL (licenses, releases, activations tables)
- Routes: GET /updates/:target/:arch/:version, GET /dl/:version/*, POST /license/validate, POST /license/activate, GET /health
- Services: UpdateService (semver compare), LicenseService (master license + DB), CryptoService (SHA-256)
- @mks2508/better-logger scoped loggers, @mks2508/no-throw Result pattern throughout
- Multi-stage Dockerfile with non-root user, healthcheck on /health
- docker-compose.yml for local dev with postgres
- Drizzle migrations auto-run on container startup
- Deployed to Coolify project haido, subdomain updates.mks2508.systems
</technical>

<changelog>
## [Feature] tpv-cloud unified service
- Replaces exited:unhealthy license-server with new unified service
- Eliminates GitHub dependency for updates (D1 decision locked)
- Provides OTA update endpoint for Tauri updater (204/200 v2 schema)
- Provides license validation with master license support
- PostgreSQL-backed with Drizzle ORM, persistent volume for binaries
</changelog>
```

> El hook `post-tool-use-bash` de `@mks-agentics/task-sync` lee el tag `[#TR-02]`
> del mensaje de commit y popula las UDAs `gitcommit` + `gitcommits` +
> `gitcommitscount` en TW (si dual mode activo en el repo).
> Si NO hay TW (FS only), el tag es noop — el commit sigue siendo válido.

---

# 🚨 ADDENDUM CRÍTICO — Tauri 2 OTA artifact format (post-decomposer fix)

**Descubrimiento del decomposer TR-03**: Tauri 2 OTA usa `.nsis.zip` + `.nsis.zip.sig`, **NO** el `.exe` + `.exe.sig`. El `.exe` es para INSTALACIÓN INICIAL manual (download + run). El `.zip` es lo que el cliente Tauri descarga vía `update.downloadAndInstall()`.

## Implicación para este plan TR-02

Las routes y la URL en `update.service.ts` que originalmente decían `setup.exe` deben servir **ambos formatos** desde el volume y la DB debe apuntar al `.nsis.zip` para OTA.

### Route handler `/dl/:version/*` debe servir ambos

El `@elysiajs/static` con prefix correcto sirve directorio entero. Asegurar que en `/srv/binaries/dl/:version/` puedan coexistir:
```
/srv/binaries/dl/0.4.0/
├── TPV-El-Haido_0.4.0_x64-setup.exe          # Para first install manual
├── TPV-El-Haido_0.4.0_x64-setup.exe.sig      # Sig del exe
├── TPV-El-Haido_0.4.0_x64-setup.nsis.zip     # Para OTA
└── TPV-El-Haido_0.4.0_x64-setup.nsis.zip.sig # Sig del zip
```

Static serve los expone todos en `/dl/:version/*`. **NO hace falta cambiar el handler**, solo entender que ambos archivos van al mismo dir.

### `update.service.ts` — corregir URL OTA

**Cambio en línea ~490 del plan**:

```typescript
// ❌ ORIGINAL (incorrecto, sirve para first install pero NO para OTA Tauri):
const url = `https://updates.mks2508.systems/dl/${latest.version}/TPV-El-Haido_${latest.version}_x64-setup.exe`

// ✅ CORREGIDO (para OTA Tauri):
const url = `https://updates.mks2508.systems/dl/${latest.version}/TPV-El-Haido_${latest.version}_x64-setup.nsis.zip`
```

### `releases` table en DB

**El campo `url` debe almacenar la URL del `.nsis.zip`** (es lo que retorna el endpoint `/updates/...`).

Cuando se inserta una row en `releases` (TKT-10 smoke), la URL es la del `.nsis.zip`, NO del `.exe`. La `signature` es la del `.nsis.zip.sig` (no del `.exe.sig`).

```sql
INSERT INTO releases (version, target, arch, url, signature, pub_date)
VALUES (
  '0.4.0',
  'windows',
  'x86_64',
  'https://updates.mks2508.systems/dl/0.4.0/TPV-El-Haido_0.4.0_x64-setup.nsis.zip',  -- ← .nsis.zip
  '<contenido de TPV-El-Haido_0.4.0_x64-setup.nsis.zip.sig>',                          -- ← sig del zip
  NOW()
);
```

### Route adicional opcional (nice-to-have, NO blocker tonight)

Si quieres URL "amigable" para el primer install:
```
GET /install/windows/x86_64/latest → redirect 302 al .exe del último release
```

Esto da un link estable para waxin compartir/usar en el bar (`https://updates.mks2508.systems/install/windows/x86_64/latest`). Pero NO es blocker, postponable a 0.4.1.

### Nota sobre R7 del risk register

El R7 original del plan ("Tauri updater cliente espera URL exacta `_x64-setup.exe`") queda **invalidado por este addendum**. El cliente Tauri NO espera un naming concreto, sino que descarga la URL EXACTA que recibe del endpoint. Por tanto:

- La URL puede ser cualquiera siempre que el archivo en esa URL sea un `.nsis.zip` válido
- El executor puede usar el naming que quiera (mismo que produce `tauri build`, comprobar en TKT-04)

---

**Source del addendum**: decomposer TR-03 verification + Tauri docs https://v2.tauri.app/plugin/updater/

**Acción para el executor**: implementar el `update.service.ts` con `.nsis.zip` desde el inicio (no requiere refactor mid-plan).
