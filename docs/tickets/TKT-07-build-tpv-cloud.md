# TKT-07 - Build tpv-cloud Unified Service (Bun + Elysia + Drizzle + Postgres)

**Milestone**: 0.4.0.B
**Priority**: 🔥 CRITICAL
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 3-4h
**Decision doc**: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md)

## Context

R1 D2 lockeada: arquitectura **tpv-cloud unified** que consolida updates + license validation en un solo servicio Bun + Elysia + Drizzle + PostgreSQL desplegado en Coolify lab1, project `haido`.

Razones:
- License-server actual (`exited:unhealthy`) → replace > revivir
- Updates endpoint propio → eliminar GitHub de la ecuación (D1)
- Una app a mantener vs dos separadas
- Mismo stack que el resto del ecosistema mks2508

## Scope

### IN scope
- ✅ Crear estructura de proyecto Bun + Elysia + Drizzle (siguiendo `/guidelines` architecture)
- ✅ DB schema Drizzle: `licenses`, `releases`, `activations`
- ✅ Routes:
  - `GET /updates/:target/:arch/:current_version` (semver compare server-side)
  - `GET /dl/:version/*` (static serve volume — sirve `.exe` para first install, `.nsis.zip` para OTA, y los `.sig` correspondientes)
    - `setup.exe` + `setup.exe.sig` → first install manual
    - `setup.nsis.zip` + `setup.nsis.zip.sig` → **OTA Tauri** (es lo que el cliente descarga via `update.downloadAndInstall()`)
  - `POST /license/validate` (online license check)
  - `POST /license/activate` (license activation)
  - `GET /health` (healthcheck para Coolify)
- ✅ DB nueva `tpv-cloud-db` (Postgres) en project haido via `coolify-cli db create`
- ✅ Dockerfile + docker-compose.yml con persistent volume `/srv/binaries`
- ✅ Deploy en Coolify, subdomain `updates.mks2508.systems`
- ✅ Verificar healthy + endpoints alcanzables HTTPS

### OUT of scope
- ❌ Migrar data del `license-server` actual (probablemente está vacío, verificar)
- ❌ Cleanup license-server old (TKT-11)
- ❌ Auth en endpoints (público + minisign verify suficiente)
- ❌ Rate limiting (post-prod si hace falta)
- ❌ Subir binarios reales (TKT-04 + TKT-10 lo hacen después)

## Dependencies

- None (puede empezar inmediatamente, paralelo con TKT-01.1)

## Acceptance Criteria

- [ ] **DB creada**: `tpv-cloud-db` (Postgres) running:healthy en Coolify project haido
- [ ] **App deployed**: `tpv-cloud` running:healthy en Coolify, subdomain `updates.mks2508.systems` con cert válido
- [ ] **Healthcheck**: `GET https://updates.mks2508.systems/health` → 200 OK
- [ ] **Updates endpoint**:
  - `GET /updates/windows/x86_64/0.0.0` → 200 con JSON v2 si hay release
  - `GET /updates/windows/x86_64/0.4.0` → 204 No Content si la última release es 0.4.0
  - JSON shape: `{ version, notes, pub_date, url, signature }`
- [ ] **Static dl**: `GET /dl/:version/setup.exe` → 200 con binary (first install) ; `GET /dl/:version/setup.nsis.zip` → 200 con zip (OTA Tauri)
- [ ] **License endpoints**: `POST /license/validate` y `POST /license/activate` responden con shape correcto (incluso si DB sin data, retornan 404 o estructura controlada)
- [ ] **Drizzle schema migrado**: 3 tablas existen en DB, índices apropiados
- [ ] **Volume persistente**: `/srv/binaries` montado, sobrevive restart del container
- [ ] **Logs limpios**: sin errors en `coolify-cli logs tpv-cloud`
- [ ] **Result pattern**: handlers usan `@mks2508/no-throw` o equivalente Elysia (status returns), errores con códigos específicos (no genéricos)
- [ ] **JSDoc en exports**: routes y services documentadas (project guideline regla 1)

## Technical Notes

### Stack lockeado

```
Runtime: Bun
Framework: Elysia (typesafe)
ORM: Drizzle (mismo que license-server old)
DB: PostgreSQL (mks-postgres pattern, instancia nueva)
Validation: TypeBox (built-in Elysia) o Arktype
Logger: @mks2508/better-logger (regla 2 guidelines)
Errors: @mks2508/no-throw Result pattern (regla 3)
Deploy: Coolify dockerfile-based
```

### Estructura de proyecto sugerida

```
apps/tpv-cloud/
├── src/
│   ├── index.ts              # Elysia app entry
│   ├── routes/
│   │   ├── updates.ts        # GET /updates/:target/:arch/:current_version
│   │   ├── downloads.ts      # GET /dl/:version/*
│   │   ├── license.ts        # POST /license/validate, /license/activate
│   │   └── health.ts         # GET /health
│   ├── services/
│   │   ├── update.service.ts # Semver compare + manifest lookup
│   │   ├── license.service.ts# License validation logic (port from old license-server)
│   │   └── crypto.service.ts # Hash, fingerprint utilities
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema
│   │   └── client.ts         # DB connection
│   ├── types/
│   │   └── index.ts          # Shared types (request/response)
│   └── lib/
│       ├── error-codes.ts    # Domain-specific error codes
│       └── logger.ts         # better-logger setup
├── drizzle/
│   └── migrations/           # Drizzle Kit generated migrations
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

### DB schema (Drizzle)

```typescript
// licenses
export const licenses = pgTable('licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyHash: varchar('key_hash', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  machineFingerprint: varchar('machine_fingerprint', { length: 128 }).notNull(),
  licenseType: varchar('license_type', { length: 32 }).notNull(), // 'master' | 'regular'
  activatedAt: timestamp('activated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => ({
  keyHashIdx: index('licenses_key_hash_idx').on(t.keyHash),
  emailIdx: index('licenses_email_idx').on(t.email)
}))

// releases
export const releases = pgTable('releases', {
  version: varchar('version', { length: 32 }).notNull(),
  target: varchar('target', { length: 32 }).notNull(), // 'windows' | 'darwin' | 'linux'
  arch: varchar('arch', { length: 32 }).notNull(),     // 'x86_64' | 'aarch64'
  url: varchar('url', { length: 512 }).notNull(),
  signature: text('signature').notNull(),
  pubDate: timestamp('pub_date').notNull().defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => ({
  pk: primaryKey({ columns: [t.version, t.target, t.arch] }),
  pubDateIdx: index('releases_pub_date_idx').on(t.pubDate)
}))

// activations
export const activations = pgTable('activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  licenseId: uuid('license_id').notNull().references(() => licenses.id),
  machineFingerprint: varchar('machine_fingerprint', { length: 128 }).notNull(),
  activatedAt: timestamp('activated_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 64 })
})
```

### Endpoint specs

#### `GET /updates/:target/:arch/:current_version`

Returns:
- **200 OK**: cuando hay release más nueva que `current_version`
  ```json
  {
    "version": "0.4.1",
    "notes": "Bug fixes",
    "pub_date": "2026-05-09T23:00:00Z",
    "url": "https://updates.mks2508.systems/dl/0.4.1/TPV-El-Haido_0.4.1_x64-setup.nsis.zip",
    "signature": "<contenido literal del .nsis.zip.sig>"
  }
  ```
- **204 No Content**: cuando no hay update (current es latest)
- **404 Not Found**: target/arch no soportado

Logic:
```typescript
1. SELECT * FROM releases WHERE target=? AND arch=? ORDER BY pub_date DESC LIMIT 1
2. Si no hay → 404
3. semverCompare(latest.version, current_version)
   - latest > current → 200 con JSON v2 dynamic
   - latest <= current → 204
```

Use `semver` npm package, NO compare manual.

#### `POST /license/validate` y `/license/activate`

Body:
```json
{ "key": "HAI-XXX-...", "email": "user@haido.local", "machine_fingerprint": "..." }
```

Logic (port del license-server actual si tiene lógica + master license fallback):
- `validate`: lookup `licenses` table por `key_hash`, verify match
- `activate`: insert + linked activation row, retorna `LicenseStatus`

Master license soportado server-side TAMBIÉN (no solo client-side fallback). Las env vars `MASTER_LICENSE_EMAIL` y `MASTER_LICENSE_KEY` se setean en Coolify env vars.

#### `GET /health`

Returns: `{ "status": "ok", "version": "0.0.1", "db": "connected" }`

Coolify usa esto para healthcheck.

### Coolify deployment

```bash
# 1. Crear DB
coolify-cli db create postgresql \
  --server awgcco0k48g4kgw8cckkc808 \
  --project vg48wsk4808ocoggoco8444g \
  --environment production \
  --name tpv-cloud-db

# 2. Conectar a la DB para inicializar (auto via Drizzle migrations en startup, o manual con drizzle-kit push)

# 3. Crear app
coolify-cli create \
  --type dockerfile \
  --project vg48wsk4808ocoggoco8444g \
  --name tpv-cloud \
  --domain updates.mks2508.systems \
  --git https://github.com/MKS2508/tpv-el-haido2 \
  --base-dir /apps/tpv-cloud \
  --branch main

# 4. Linkear DB
coolify-cli env tpv-cloud --add DATABASE_URL=<from coolify db connection string>

# 5. Persistent volume
# Vía Coolify UI o config: mount /srv/binaries

# 6. Deploy
coolify-cli deploy tpv-cloud

# 7. Verificar
coolify-cli logs tpv-cloud --since 5m
curl https://updates.mks2508.systems/health
```

### Migration data del license-server old

Antes de matar el old, verificar:
```bash
# Conectar al container actual y dump
coolify-cli exec license-server "sqlite3 /data/licenses.db .dump > /tmp/licenses.sql"
# scp + importar a tpv-cloud-db si hay data crítica
```

Probable: license-server vacío o con data dev → no migrar nada.

### Riesgos conocidos

- **WebView2 / Coolify auto-deploy**: si autoDeployEnabled=false, deploys son manuales. Verificar.
- **Drizzle migrations en startup**: usar `drizzle-kit push` o `drizzle-kit migrate` en script de startup. NO hacer `drop` automático.
- **Persistent volume**: si Coolify no soporta config declarative para volumes via CLI, configurar via UI.
- **Subdomain DNS**: `updates.mks2508.systems` debe estar configurado en DNS apuntando a lab1 (77.42.25.248). Verificar antes de deploy.
- **HTTPS cert**: Coolify Let's Encrypt automático, pero requiere DNS resuelto.

## Sub-tasks

- [ ] 1. Verificar/crear estructura `apps/tpv-cloud/` con package.json y tsconfig
- [ ] 2. Setup Bun + Elysia + Drizzle + PostgreSQL driver
- [ ] 3. Definir schema Drizzle (licenses, releases, activations)
- [ ] 4. Implementar `routes/updates.ts` (semver compare)
- [ ] 5. Implementar `routes/downloads.ts` (static serve volume)
- [ ] 6. Implementar `routes/license.ts` (port lógica del actual + master license)
- [ ] 7. Implementar `routes/health.ts`
- [ ] 8. Logger + error codes (regla 2+3 guidelines)
- [ ] 9. Crear Dockerfile + docker-compose.yml
- [ ] 10. `coolify-cli db create` para tpv-cloud-db
- [ ] 11. `coolify-cli create` para tpv-cloud app
- [ ] 12. Configurar env vars (DATABASE_URL, MASTER_LICENSE_*)
- [ ] 13. Configurar persistent volume `/srv/binaries`
- [ ] 14. DNS verificar `updates.mks2508.systems`
- [ ] 15. `coolify-cli deploy` + verificar logs limpios
- [ ] 16. Smoke test: curl healthcheck + endpoints sin data → respuestas correctas

## Blocked by

- None

## Blocks

- TKT-08 (tauri.conf.json update — necesita endpoint vivo para verificar)
- TKT-04 (build en bar — necesita endpoint live para que app apunte ahí)
- TKT-10 (smoke test OTA — necesita app + binary en volume)
- TKT-11 (cleanup old license-server — solo cuando tpv-cloud verified)

## Findings

*(Post-execución: llenar con discoveries reales)*

- [ ] ¿Coolify CLI permite todo el flow o hay que tocar UI?
- [ ] ¿Hay data en license-server old que migrar?
- [ ] ¿Persistent volume config OK via CLI?
- [ ] ¿Performance del endpoint OK desde España?

## References

- Decision doc: [`r1`](../decisions/r1-deployment-architecture-2026-05-09.md)
- Diagrama: `/tmp/tpv-cloud-architecture.html`
- Skill elysiajs: `~/.claude/skills/elysiajs/`
- Tauri updater spec: https://v2.tauri.app/plugin/updater/
- License-server old (referencia): `apps/license-server/`
