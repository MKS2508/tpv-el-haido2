# r2 — desktop-release-hub Architecture (multi-tenant + Pocket ID)

**Fecha lock**: 2026-05-10 (~01:30, sesión continuada de r1)
**Lockeado por**: 2 rondas AskUserQuestion + previews + audit Explore mks-workspaces / mks-scaffolder / mks-ui
**Supersede**: amplía r1 (no contradice). Reformula 0.4.0.D-F como nueva fase 0.4.1.
**Path**: pragmático — hub MVP + smoke esta noche, admin UI react = post-prod.

---

## Contexto

`r1` (2026-05-09) lockeó:
- Sin GitHub.
- `tpv-cloud` unified (Bun + Elysia + Drizzle).
- DB `tpv-cloud-db` (Postgres) en project Coolify haido.
- `tauri.conf.json` apunta a `updates.mks2508.systems`.

`tpv-cloud` se desplegó (commit `844cddf`, container `qimtbkxjvjjp23wgrnv3vs9h-230538121204` running:healthy, bind mount `/srv/binaries` activo, DB con 3 tablas creadas, build macOS local verificada al 85%).

Antes de hacer `0.4.0.D` (build en bar) + `0.4.0.E` (smoke OTA), waxin levantó scope ampliado:

> "esto que vamos a hacer, gestión de releases de apps de desktop, no lo hagamos específico de haido o tauri. Hagámoslo más agnóstico y reusable siguiendo las guidelines."

> "vamos a ir directos a por admin endpoints directos con auth con Pocket ID, ya lo tengo desplegado, 0 TCP."

> "te voy a pasar un repo que ya tiene server y frontend admin básico (es un repo de workspace). pero quiero que LITERALMENTE copies y borres lo que no necesites."

Esto reformula la fase: **`tpv-cloud` no será el destino final**. Se construye `desktop-release-hub` agnóstico que reemplaza la parte de updates/admin (y absorbe licenses), con admin via Pocket ID, multi-tenant, reusable para futuros desktop apps.

---

## Decisiones lockeadas

### D10 — Repo layout: multi-repo

**Lock**: 2 repos nuevos en `mks2508/`.

| Repo | Package npm | Rol |
|---|---|---|
| `mks2508/auth-oidc-elysia` | `@mks2508/auth-oidc-elysia` | Pocket ID OIDC plugin reusable para Elysia. Encapsula PKCE flow, JWKS cache, session JWT, middleware `requireAuth()`, callback routes. |
| `mks2508/desktop-release-hub` | (no publish, deploy-only) | Monorepo Bun workspaces: `apps/server` (Elysia + Drizzle multi-tenant) + `apps/admin` (post-prod) + `packages/shared` (types) + `packages/sdk` (TS client). Consume `@mks2508/auth-oidc-elysia` desde npm. |

**Rationale**:
- Plugin de auth tiene ciclo independiente (versionado + issues + PRs separados).
- Reusable inmediato para futuros proyectos de waxin.
- Cambios cross-repo más lentos pero el plugin es estable después de v0.1.0.

**Trade-off aceptado**: doble overhead CI/release. Mitigación: el plugin es ~600 LOC, cambios serán raros tras v0.1.0.

---

### D11 — Tenant model: subdomain por proyecto

**Lock**: subdomain DNS wildcard `*.releases.mks2508.systems` → Coolify VPS (Traefik wildcard cert auto via Let's Encrypt).

| Subdomain | Rol | Auth |
|---|---|---|
| `<slug>.releases.mks2508.systems` | Read public per-project | Sin token (firma minisign valida integridad) |
| `admin.releases.mks2508.systems` | Admin único multi-tenant | Pocket ID OIDC |

**Endpoints públicos** (read, sin auth):
```
GET  https://haido.releases.mks2508.systems/api/updates/:target/:arch/:current_version
GET  https://haido.releases.mks2508.systems/api/dl/*
POST https://haido.releases.mks2508.systems/api/license/validate
```

**Endpoints admin** (auth Pocket ID, single subdomain):
```
GET  https://admin.releases.mks2508.systems/api/admin/projects
POST https://admin.releases.mks2508.systems/api/admin/projects
GET  https://admin.releases.mks2508.systems/api/admin/projects/:slug/releases
POST https://admin.releases.mks2508.systems/api/admin/projects/:slug/releases  (multipart upload)
DELETE https://admin.releases.mks2508.systems/api/admin/projects/:slug/releases/:id
GET  https://admin.releases.mks2508.systems/api/admin/projects/:slug/licenses
```

**Tenant resolution middleware**: lee `Host` header del request. Si subdomain ≠ `admin` → SELECT FROM projects WHERE slug = subdomain → adjuntar `project` al context. Si subdomain = `admin` → bypass tenant resolve, requiere auth.

**Rationale**:
- URLs limpias para clientes (`haido.releases.mks2508.systems` se lee bien en logs Tauri).
- Firma minisign garantiza integridad — no hace falta token cliente.
- Admin único = single Pocket ID app, single SPA.
- Wildcard cert via Coolify+Traefik = cero overhead operativo.

**Trade-off aceptado**: middleware tenant resolve añade 1 query por request público (cacheable in-memory con TTL).

---

### D12 — CLI auth: Pocket ID OIDC PKCE + loopback

**Lock**: `scripts/release.ts publish` autentica via PKCE loopback (igual que `gh`, `vercel`, `supabase` CLIs).

**Flow**:
```
1. CLI lee ~/.config/release-hub/token.json
   - Si existe y no expiró → usa Bearer token directo
   - Si no → inicia PKCE flow:
2. Genera code_verifier + code_challenge (S256)
3. Abre browser → https://auth-provider.mks2508.systems/authorize?
     client_id=release-hub-cli
     redirect_uri=http://127.0.0.1:54321/callback
     response_type=code
     code_challenge=...
     code_challenge_method=S256
     state=...
4. Server local en CLI escucha en 127.0.0.1:54321
5. Waxin autentica en browser con passkey
6. Pocket ID redirige a http://127.0.0.1:54321/callback?code=...&state=...
7. CLI intercambia code → access_token + refresh_token
8. Guarda en ~/.config/release-hub/token.json (chmod 600)
9. Hit POST https://admin.releases.mks2508.systems/api/admin/projects/haido/releases
   con Bearer access_token
```

**Rationale**:
- Cero credenciales long-lived que gestionar.
- Auditable (Pocket ID logs).
- Revocable (Pocket ID UI).
- Reusa Pocket ID app que ya está desplegado.

**Trade-off aceptado**: requiere browser local (no usable en CI headless). Mitigación: API key per-project como mecanismo secundario, futuro (ver D14 deferred items).

---

### D13 — Endpoints públicos sin token, integridad por minisign

**Lock**: `GET /api/updates/...`, `GET /api/dl/...`, `POST /api/license/validate` son **públicos**, sin token en cliente.

**Integridad**: cada release tiene su `signature` (minisign) en DB y embebida en response. Tauri valida con `pubkey` que está embebida en el bundle compilado (ya configurado en `tauri.conf.json` D5).

**Rationale**:
- Modelo estándar Tauri/electron-updater.
- Tokens en cliente desktop son extraibles del binary trivialmente → cero valor de seguridad.
- Sin token = cacheable por CDN (futuro) sin auth headers.
- License validate sí va POST con body `{license_key, machine_fp}` — el license key actúa como secret.

**Trade-off aceptado**: sin rate-limit per-tenant a nivel de auth. Mitigación: rate-limit per-IP en Traefik o middleware Elysia (TODO post-prod).

---

### D14 — Path pragmático: MVP esta noche, admin UI post-prod

**Lock**: tonight focus = smoke OTA verde end-to-end.

**Tonight (en orden, paralelizable)**:
1. **0.4.1.A** — `auth-oidc-elysia` package (~2h, executor paralelo)
2. **0.4.1.B** — `desktop-release-hub` scaffold + schema multi-tenant (~2h, executor paralelo)
3. **0.4.1.C** — Server admin endpoints (~2h, depende de A+B)
4. **0.4.1.E** — Pocket ID app config + Coolify deploy + DNS wildcard (~1h, depende de B, ejecuto yo + skill coolify-cli)
5. **0.4.1.G** — `scripts/release.ts` con PKCE loopback (~1.5h, depende de E, executor paralelo desde T+3h)
6. **0.4.1.F** — Migrate haido a hub (`POST /api/admin/projects` + tauri.conf.json update) (~1h, depende de E+C)
7. **0.4.1.H** — Smoke OTA macOS end-to-end (~30m, depende de F+G)

**Diferido a post-prod**:
- **0.4.1.D-postprod** — Admin UI React + TanStack Router + mks-ui + theme-manager-react (~4h)
  - Sub-fase: scaffold con `bun create bunspace --template react-starter` (trae Base UI + theme-manager pre-instalado)
  - Sub-fase: copiar auth client desde mks-workspaces (`auth-client.ts`, `use-auth.ts`, `login.tsx`, `_authenticated.tsx`, `auth.return.tsx`)
  - Sub-fase: pages (ProjectsList, ReleasesList, ReleaseUpload drag-drop, LicensesList)
  - Sub-fase: deploy en `admin.releases.mks2508.systems` (Coolify Static Site)
- **API keys per-project** — segundo mecanismo auth para CI/CD futuro
- **Migración licenses tpv-cloud → hub** — solo cuando licenses estén en uso real (actualmente master license)
- **Deprecation tpv-cloud old** — una vez migración completa, eliminar app de Coolify

**Trade-off aceptado**: esta noche **no hay panel visual** para gestionar releases. Upload via `release.ts` CLI (PKCE) que hit admin API directo. Suficiente para validar end-to-end + para waxin operar releases en próximos días.

---

## Schema multi-tenant (Drizzle)

```typescript
// packages/shared/schema.ts (compartido server + sdk)

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),       // subdomain identifier
  name: text('name').notNull(),
  publicPubkey: text('public_pubkey').notNull(), // minisign pubkey embebido en binary
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const releases = pgTable('releases', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  target: text('target').notNull(),    // darwin | windows | linux
  arch: text('arch').notNull(),        // x86_64 | aarch64
  url: text('url').notNull(),          // public CDN URL del artifact
  signature: text('signature').notNull(),  // minisign signature
  notes: text('notes'),                // changelog markdown
  pubDate: timestamp('pub_date').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.version, t.target, t.arch] }),
  versionIdx: index('releases_version_idx').on(t.projectId, t.target, t.arch, t.pubDate),
}))

export const licenses = pgTable('licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('active'),  // active | suspended | revoked
  expiresAt: timestamp('expires_at'),
  maxActivations: integer('max_activations').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqProjectKey: unique().on(t.projectId, t.key),
}))

export const activations = pgTable('activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  licenseId: uuid('license_id').notNull().references(() => licenses.id, { onDelete: 'cascade' }),
  machineFingerprint: text('machine_fingerprint').notNull(),
  activatedAt: timestamp('activated_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
}, (t) => ({
  uniqLicMachine: unique().on(t.licenseId, t.machineFingerprint),
}))

// Reservado para post-prod (API keys CI):
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull(),        // sha256 del key
  name: text('name').notNull(),         // human label
  scopes: text('scopes').array().notNull().default(sql`'{}'`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
})
```

---

## Diagrama de arquitectura

```
                                  ┌──────────────────────────────────────┐
                                  │  Pocket ID                            │
                                  │  auth-provider.mks2508.systems        │
                                  │  (Coolify, Postgres dedicada,         │
                                  │   passkey-only, ya deployed)          │
                                  └──────────────┬───────────────────────┘
                                                 │ OIDC
                                                 │ (PKCE for CLI,
                                                 │  Auth Code+PKCE for Admin SPA futuro)
                                                 │
                ┌────────────────────────────────┴───────────────────┐
                │                                                     │
                ▼                                                     ▼
   ┌────────────────────────┐                       ┌────────────────────────────┐
   │  scripts/release.ts    │                       │  apps/admin (POST-PROD)     │
   │  (CLI local, tpv-haido)│                       │  React 19 + TanStack +     │
   │                        │                       │   mks-ui + theme-mgr        │
   │  build  → tauri build  │                       │  admin.releases.mks2508.   │
   │  publish → PKCE +      │                       │   systems (Coolify Static)  │
   │            multipart   │                       └────────────┬────────────────┘
   └────────────┬───────────┘                                    │
                │                                                 │
                │  Bearer access_token                            │  cookies (httpOnly)
                │  POST /api/admin/projects/haido/releases        │  + Bearer (token-mode)
                │                                                 │
                ▼                                                 ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  apps/server (Elysia)                                                    │
   │  desktop-release-hub deploy en Coolify lab1                              │
   │                                                                           │
   │  Subdomain routing (Traefik):                                            │
   │    admin.releases.mks2508.systems  → /api/admin/* (requireAuth)          │
   │    <slug>.releases.mks2508.systems → /api/* (tenant resolve)             │
   │                                                                           │
   │  Middleware stack:                                                       │
   │    1. cors                                                               │
   │    2. logger (per request)                                               │
   │    3. tenantResolve (Host header → projects table → ctx.project)         │
   │    4. authPlugin (createAuthPlugin from @mks2508/auth-oidc-elysia)       │
   │                                                                           │
   │  Routes:                                                                 │
   │    /api/health                          (public)                         │
   │    /api/updates/:target/:arch/:ver      (tenant, public)                 │
   │    /api/dl/*                            (tenant, public, stream binary)  │
   │    /api/license/validate                (tenant, public)                 │
   │    /api/license/activate                (tenant, public)                 │
   │    /api/admin/projects                  (admin, requireAuth)             │
   │    /api/admin/projects/:slug/releases   (admin, requireAuth, multipart)  │
   │    /api/admin/projects/:slug/licenses   (admin, requireAuth)             │
   │    /auth/login/oidc                     (admin, public — start flow)     │
   │    /auth/callback/oidc                  (admin, public — finish flow)    │
   │    /auth/status                         (admin, public — read session)   │
   │    /auth/logout                         (admin, public)                  │
   └────────────┬─────────────────────────────────────────────────────────────┘
                │
                │ Drizzle ORM
                │
                ▼
   ┌──────────────────────────────────────┐         ┌────────────────────────────────┐
   │  Postgres release-hub-db             │         │  Persistent storage             │
   │  (Coolify, dedicada)                  │         │  /srv/binaries/{slug}/{ver}/    │
   │                                       │         │   {filename} + .sig             │
   │  Tables:                              │         │                                  │
   │    projects (slug, pubkey)            │         │  Bind mount Coolify:            │
   │    releases (project_id, ver, ...)    │         │   /data/coolify/applications/   │
   │    licenses                           │         │   {uuid}/binaries → /srv/...    │
   │    activations                        │         └────────────────────────────────┘
   │    api_keys (post-prod)               │
   └──────────────────────────────────────┘

                                ▲
                                │ HTTPS GET /api/updates/...
                                │ (público, sin token)
                                │
              ┌─────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
   ┌─────────────────────────┐         ┌─────────────────────────┐
   │  TPV haido (macOS)      │         │  TPV haido (Windows)    │
   │  Tauri 2 plugin-updater │         │  Tauri 2 plugin-updater │
   │  endpoint:              │         │  endpoint:              │
   │   haido.releases.mks2508│         │   haido.releases.mks2508│
   │   .systems/api/updates  │         │   .systems/api/updates  │
   │   /{{target}}/{{arch}}  │         │   /{{target}}/{{arch}}  │
   │   /{{current_version}}  │         │   /{{current_version}}  │
   │                         │         │                         │
   │  Verifica firma minisign│         │  Verifica firma minisign│
   │   con pubkey embebida   │         │   con pubkey embebida   │
   └─────────────────────────┘         └─────────────────────────┘
```

---

## Pocket ID apps a crear

### App 1: `release-hub-cli`

| Campo | Valor |
|---|---|
| Name | `release-hub-cli` |
| Type | Public client (no client_secret, PKCE only) |
| Redirect URIs | `http://127.0.0.1:54321/callback`<br>`http://127.0.0.1:54322/callback`<br>`http://127.0.0.1:54323/callback`<br>(varios puertos en caso de colisión local) |
| PKCE | Required (S256) |
| Token endpoint auth | none |
| Allowed users | waxin (single admin) |

### App 2: `release-hub-admin` (POST-PROD)

| Campo | Valor |
|---|---|
| Name | `release-hub-admin` |
| Type | Confidential client (client_secret) |
| Redirect URIs | `https://admin.releases.mks2508.systems/auth/callback/oidc` |
| Token endpoint auth | client_secret_basic |
| Allowed users | waxin (single admin) |

**Server (apps/server) usa**: client `release-hub-admin` para validar id_tokens emitidos a SPA admin (cuando se construya). Para CLI, valida access_token via JWKS sin client_id check (estándar OIDC RP).

---

## Coolify infra

### App nueva: `release-hub-server`

| Campo | Valor |
|---|---|
| Project | haido (mismo project que tpv-cloud, a corto plazo) |
| Source | github.com/mks2508/desktop-release-hub (rama main) |
| Build path | `apps/server` |
| Dockerfile | `apps/server/Dockerfile` |
| Domain | wildcard: `*.releases.mks2508.systems` (incluye admin + future tenants) |
| Env vars | `DATABASE_URL`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_SESSION_SECRET`, `OIDC_ADMIN_SUB`, `ADMIN_UI_URL`, `BINARY_STORAGE_DIR=/srv/binaries`, `PORT=3003` |
| Persistent storage | `/srv/binaries` → bind mount `/data/coolify/applications/{uuid}/binaries` |
| Health check | `GET /api/health` |

### DB nueva: `release-hub-db`

| Campo | Valor |
|---|---|
| Project | haido |
| Type | PostgreSQL 16 |
| Name | `release-hub-db` |
| Internal hostname | (asignado por Coolify) |
| Connection string | (env var `DATABASE_URL`) |

### DNS wildcard

Hetzner DNS zone `mks2508.systems`:
```
*.releases    A    77.42.25.248    (Coolify VPS lab1-helsinki)
```

Traefik wildcard cert: auto Let's Encrypt DNS-01 (Coolify config existente para `*.mks2508.systems`).

---

## Migration plan tpv-cloud → hub

### Tonight (post-smoke verde)

1. **No deprecar tpv-cloud todavía**: sigue corriendo, sirve `updates.mks2508.systems` por compat, mientras la app de macOS local ya apunta a `haido.releases.mks2508.systems`.
2. **`tauri.conf.json` en repo**: cambia endpoint a `https://haido.releases.mks2508.systems/api/updates/{{target}}/{{arch}}/{{current_version}}`.
3. **Crear project "haido"** en hub: `POST /api/admin/projects` con `{slug:"haido", name:"TPV El Haido", public_pubkey:"<minisign_pubkey>"}`.
4. **Subir release `0.1.0`** baseline a hub (build current local).
5. **Smoke**: bump a `0.1.1`, build, publish via `release.ts`, verificar app actualiza.

### Post-prod

- Migrate licenses (cuando estén en uso real, hoy es master license).
- Deprecar `updates.mks2508.systems` (tpv-cloud old) cuando ya no haya clientes en versión vieja apuntando ahí.
- Eliminar app `tpv-cloud` de Coolify.

---

## Open questions (no bloquean tonight)

1. **License validation tonight**: `tpv-cloud` actual ya valida master license. Hub server tendrá `/api/license/validate` también pero en project "haido" la única license activa es master (validated client-side en Rust). ¿Hacer migración real esta noche o quedarse con tpv-cloud para license y solo migrar updates? **Decisión axon**: solo updates esta noche. License sigue en tpv-cloud temporalmente. Migrar licenses cuando waxin necesite emitir license real (post-prod).

2. **Static site admin UI hosting**: ¿Coolify Static Site (build apps/admin → /dist) o Vercel? **Decisión axon**: Coolify Static Site (mismo infra, sin servicios externos). Lock cuando arranque 0.4.1.D-postprod.

3. **Release artifacts storage future scaling**: bind mount local OK ahora (1 proyecto, releases pequeñas). ¿Migrar a S3-compatible (R2, B2) cuando crezca? **Decisión axon**: post-prod, no urgente. Diseño dejará el storage abstraído tras un `IBinaryStorage` interface (TODO marker en server code).

---

## Trade-offs explícitos al diferir admin UI

- **Tonight cubre ~70% del valor del hub** (server multi-tenant + auth + admin endpoints + CLI publish + smoke OTA verde end-to-end).
- **Post-prod cubre el restante 30%** (admin UI visual para waxin no-cli, listas, drag-drop upload, monitoring).
- Riesgo: si en próximos días waxin necesita panel visual urgente (gestionar licenses, ver historial), tendrá que usar `release.ts` CLI o `psql` directo. Aceptable porque:
  - Smoke OTA verde = la app del bar sigue actualizable.
  - Admin UI es ~4h de trabajo aislado, lockable en próximo sprint.

---

## Referencias técnicas

- **Repo a copiar de**: `/Volumes/KODAK1TB/REPOS y PROYECTOS/nodejs-bun/mks-workspaces/apps/devenv-agent-backend/src/{auth/, middleware/, routes/auth.routes.ts, types/auth.types.ts, config/}`
- **Repo admin UI a copiar de**: `/Volumes/KODAK1TB/REPOS y PROYECTOS/nodejs-bun/mks-workspaces/apps/mks-workspaces-admin/src/{lib/auth-client.ts, lib/auth-mode.ts, hooks/use-auth.ts, stores/authStore.ts, routes/login.tsx, routes/auth.return.tsx, routes/_authenticated.tsx}`
- **Scaffolder admin**: `bun create bunspace --template react-starter` (genera React 19 + Vite 8 + Base UI + Theme Manager pre-config)
- **mks-ui**: `@mks2508/mks-ui@latest` — 35+ components React 19 + Tailwind 4 + Base UI + Motion
- **Theme manager**: `@mks2508/theme-manager-react` (separado, instalar a parte)
- **Pocket ID**: https://github.com/pocket-id/pocket-id v2.6.2 deployed at `auth-provider.mks2508.systems` (UUID `nm0f3n8z0g4pvmt0txna4gi2`)
- **OIDC libs**: `oauth4webapi` ^3.8.6 + `jose` ^6.2.3 + `@elysiajs/jwt` ^1.4.0
- **Guidelines skill**: `/guidelines architecture services react errors state` cargar en cada executor

---

## Lock signature

| Campo | Valor |
|---|---|
| Locked at | 2026-05-10 ~01:30 |
| Lock method | 2 rondas AskUserQuestion + previews + 2 Explore audits (mks-workspaces, mks-scaffolder/mks-ui) |
| Approver | waxin |
| Supersedes | r1 sub-fases 0.4.0.D/E/F (reformuladas como 0.4.1.A-H) |
| Next milestone | 0.4.1.H smoke OTA verde |
