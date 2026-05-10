# Progress Log - TPV El Haido

Log de progreso por fase. Mantenido al día con cada milestone completado.

---

## 2026-05-09 — Locked decision r1: Deployment Architecture

**Doc**: [`docs/decisions/r1-deployment-architecture-2026-05-09.md`](./decisions/r1-deployment-architecture-2026-05-09.md)

**Interview**: 3 rondas de AskUserQuestion con previews ASCII + diagrama unified arquitectura (`/tmp/tpv-cloud-architecture.html`, generado con mks-diagram D2).

**Decisiones lockeadas (D1-D9)**:

- **D1** — Sin GitHub: distribución 100% via Coolify, no GitHub Releases ni Actions
- **D2** — Arquitectura `tpv-cloud` unified (Bun + Elysia + Drizzle) consolidando updates + license validation
- **D3** — DB nueva `tpv-cloud-db` (PostgreSQL) en project `haido` (NO reusar `mks-postgres` cross-project)
- **D4** — Build Windows directo en máquina del bar (1 vez), después OTA. dockur/windows descartado (Hetzner Cloud sin KVM nested verificado).
- **D5** — `tauri.conf.json` updater endpoints → `https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}`
- **D6** — License-server actual (`exited:unhealthy`): replace, no revivir
- **D7** — HaidoDocs: ya `running:healthy` en Coolify, no tocar
- **D8** — Printer (0.5.0): postpone scope tonight, requires hardware research
- **D9** — Orden ejecución: paralelo donde se pueda

**Reminder post-prod**: TKT-09 — Hetzner upgrade research (cloud builds reproducibles con KVM nested)

**Verificaciones realizadas pre-lock**:
- 3 agentes Explore verificaron docs vs código real (frontend, backend, services)
- Coolify lab1 explorado: 17 apps, project haido tiene 4 apps + 0 DBs
- KVM nested verificado en lab1: `/dev/kvm` ausente, vmx/svm flags vacíos → dockur/windows no viable
- Hetzner Cloud docs oficiales confirman policy "no nested virt en cloud"

---

## Fase 0.4.0 — Production deploy (CURRENT, post-r1)

### Sub-fases (post-r1 reformuladas)

| Sub | Goal | Ticket | Status | Effort |
|---|---|---|---|---|
| 0.4.0.A | Master license production hardening | [TKT-01.1](./tickets/TKT-01.1-fix-hardcoded-credentials.md) (reformulado) | next | 30m |
| 0.4.0.B | Build tpv-cloud unified service | [TKT-07](./tickets/TKT-07-build-tpv-cloud.md) | next | 3-4h |
| 0.4.0.C | Update tauri.conf.json endpoints | [TKT-08](./tickets/TKT-08-update-tauri-conf.md) | next | 30m |
| 0.4.0.D | Build NSIS en bar + first install | [TKT-04](./tickets/TKT-04-windows-production-setup.md) (reformulado) | next | 1-2h |
| 0.4.0.E | Smoke test OTA end-to-end | [TKT-10](./tickets/TKT-10-smoke-test-ota.md) | next | 30m |
| 0.4.0.F | Cleanup license-server old | [TKT-11](./tickets/TKT-11-cleanup-old-license-server.md) | queued | 15m |

### Tickets superseded por r1

- ~~[TKT-01](./tickets/TKT-01-audit-updater-flow.md)~~ — superseded by TKT-08 (sin GitHub)
- ~~[TKT-03](./tickets/TKT-03-coolify-migration.md)~~ — superseded (split: HaidoDocs done, license-server → TKT-07)

### Tickets deferred por r1

- ~~[TKT-02](./tickets/TKT-02-thermal-printer-windows.md)~~ — deferred (printer 0.5.0 postpone, requires hardware research)

### Task-requests creados (input para `@task-decomposer`)

| TR | Ticket | Status |
|---|---|---|
| [TR-01](./task-requests/TR-01-master-license-hardening.md) | TKT-01.1 | ready for decomposer |
| [TR-02](./task-requests/TR-02-build-tpv-cloud.md) | TKT-07 | ready for decomposer |
| [TR-03](./task-requests/TR-03-update-tauri-conf.md) | TKT-08 | ready for decomposer |
| [TR-04](./task-requests/TR-04-build-bar-and-first-install.md) | TKT-04 | ready for decomposer |
| [TR-05](./task-requests/TR-05-smoke-test-ota.md) | TKT-10 | ready for decomposer |
| [TR-06](./task-requests/TR-06-cleanup-old-license-server.md) | TKT-11 | ready for decomposer |

### Dependency map para ejecución

```
TR-01 (master license hardening) ──┐
                                    │
TR-02 (build tpv-cloud) ───────────┼──> TR-04 ──> TR-05 ──> TR-06
                                    │
TR-03 (tauri.conf update) ────(needs TR-02 healthy)
```

**Paralelizable**:
- TR-01 + TR-02 en paralelo (agentes distintos, archivos disjuntos)
- TR-03 espera TR-02 healthy (necesita endpoint vivo para test)
- TR-04 espera TR-01 + TR-02 + TR-03 done
- TR-05 espera TR-04 done
- TR-06 espera TR-05 done

---

## 2026-05-09 — Exploración y preparación inicial (sesión anterior)

- ✅ Configurado Axon workflow + axon.config.json
- ✅ Creado roadmap.spec.yml con milestones reales
- ✅ Exploración de código completada (6 agentes background)
- ✅ Documentación modular creada (5 módulos DEV en `docs/modules/`)
- ✅ Tickets TKT-01 a TKT-06 formulados (luego reformulados/superseded post-r1)
- ✅ Propuestas arquitectónicas iniciales 0.4.0 + 0.5.0
- ✅ Diagramas iniciales (HTML/CSS, dark theme)
- ✅ Interview questions preparadas (4 concretas)
- ✅ Architecture audit contra `/guidelines` completado
- ✅ Handoff para sesión axon (interview + lock)

---

## 2026-05-09 — Verification sesión axon (pre-lock)

- ✅ 3 agentes Explore verificaron docs vs código real
- ✅ Hallazgos: TKT-01.1 formulación imprecisa (env-with-fallback, no const), ROADMAP.md missing → creado
- ✅ Coolify lab1 explorado vía coolify-cli + SSH directo lab1
- ✅ KVM nested verificado NO viable en VPS Hetzner Cloud
- ✅ dockur/windows research (no soporta Apple Silicon, requiere host Linux con KVM)
- ✅ Tauri NSIS cross-compile research (mixed reports)
- ✅ Custom updater endpoint research (multi-endpoint, schema v2 dinámico)

---

## 2026-05-09 — Sub-fases pendientes (post-interview lock)

- 🔄 NEXT: Lanzar `@task-decomposer TR-01` y `@task-decomposer TR-02` en paralelo (agentes distintos)
- ⏳ TR-03 espera TR-02 healthy
- ⏳ TR-04 espera TR-01 + TR-02 + TR-03
- ⏳ TR-05 espera TR-04
- ⏳ TR-06 espera TR-05

---

## Fase 0.5.0 — Thermal Printer (DEFERRED)

### 2026-05-09 — Postpone (r1 D8)

- 🔄 Status: deferred (no tonight)
- 📌 Razones: hardware testing requerido + posible CUPS via RPi setup separado
- 📌 Re-evaluar arquitectura cuando waxin pueda debuggear printer in situ
- 📌 Critical path tonight es 0.4.0 (update + instalador), sin printer la app es operable manualmente

---

## Fase 0.8.0 — Hetzner Upgrade Research (POST-PROD REMINDER)

### 2026-05-09 — Reminder lockeado (r1)

- 📌 Ticket: [TKT-09](./tickets/TKT-09-research-hetzner-upgrade.md)
- 📌 Contexto: builds Windows reproducibles cloud requieren KVM nested
- 📌 Opciones a evaluar: Hetzner Robot/Dedicated, AWS EC2 metal, OVH dedicated
- 📌 Priority: low (post-prod, no urgente)

---

## Fase 0.2.0 — PWA + Platform Abstraction

### 2026-05-09 — Completada (user confirmation)
- ✅ Platform abstraction consolidated
- ✅ PWA Service Worker + caching
- ✅ PWA manifest + /tpv/ build path

---

## Fase 0.1.0 — Core + AEAT

### 2026-05-09 — Completada
- ✅ Core TPV features
- ✅ SolidJS migration
- ✅ AEAT tax compliance

---

## 2026-05-10 — Locked decision r2: desktop-release-hub multi-tenant

**Doc**: [`docs/decisions/r2-release-hub-architecture-2026-05-10.md`](./decisions/r2-release-hub-architecture-2026-05-10.md)

**Interview**: 2 rondas AskUserQuestion + previews + 2 Explore audits (mks-workspaces, mks-scaffolder/mks-ui).

**Decisiones lockeadas (D10-D14)**:

- **D10** — Multi-repo: `mks2508/auth-oidc-elysia` (publicar `@mks2508/auth-oidc-elysia` a npm) + `mks2508/desktop-release-hub` (consume desde npm, deploy-only)
- **D11** — Tenant via subdomain: `<slug>.releases.mks2508.systems` (read public, sin auth) + `admin.releases.mks2508.systems` (admin único, Pocket ID)
- **D12** — CLI auth Pocket ID OIDC PKCE loopback (estilo gh/vercel CLI), token cacheado `~/.config/release-hub/token.json`
- **D13** — Endpoints públicos sin token, integridad por minisign (modelo estándar Tauri)
- **D14** — Path pragmático: hub MVP server + auth + admin endpoints + CLI publish + smoke OTA esta noche. Admin UI react = post-prod (~4h aisladas).

**Sub-fases (0.4.1.A → 0.4.1.H)**: ver roadmap.spec.yml + ROADMAP.md.

**Spawn plan**:
- T+0: 2 executors paralelos — A (auth-oidc-elysia) + B (release-hub scaffold + schema)
- T+2h: C (admin endpoints, depende A+B) + E (Pocket ID + Coolify + DNS, axon ejecuta)
- T+3h: G (release.ts CLI) paralelo, F (migrate haido) secuencial
- T+5h: H (smoke OTA macOS verde)

**Trade-offs aceptados**:
- Sin admin UI visual esta noche (upload via release.ts CLI suficiente)
- License migration diferida (sigue en tpv-cloud temporalmente)
- tpv-cloud no se deprecia hasta migración licenses completa (post-prod)

**Status sub-fases r1 0.4.0**:
- 0.4.0.A — pendiente (master license hardening, no tocado tonight)
- 0.4.0.B — ✅ done (commit 844cddf, container healthy)
- 0.4.0.C — ✅ done (commit 2e10c41 drysift)
- 0.4.0.D — superseded por 0.4.1.F+H
- 0.4.0.E — superseded por 0.4.1.H
- 0.4.0.F — diferido post-prod

---

## 2026-05-10 — 0.4.1.A + 0.4.1.B + 0.4.1.E ejecutados (multi-agent paralelo + axon ops)

**Status sub-fases**:

| Sub | Subject | Status | Hash / UUID |
|---|---|---|---|
| 0.4.1.A | `@mks2508/auth-oidc-elysia` v0.1.0 npm | ✅ done | repo `mks2508/auth-oidc-elysia` `6a03aac`, npm `@mks2508/auth-oidc-elysia@0.1.0` |
| 0.4.1.B | `desktop-release-hub` scaffold + schema | ✅ done | repo `mks2508/desktop-release-hub` `5a329b0` |
| 0.4.1.G-prep | `scripts/build-release.ts` (en `tpv-el-haido2`) | ✅ done | local commits `d65664e` + `cc2168b` |
| 0.4.1.E | Pocket ID + Coolify deploy + DNS | 🟡 in-progress (deploy queued) | ver UUIDs abajo |

**0.4.1.A (auth-oidc-elysia)**:
- Repo público `mks2508/auth-oidc-elysia`, MIT, README + LICENSE.
- Stack: oauth4webapi 3.8.6 + jose 6.2.3 + @elysiajs/jwt 1.4.2 + @mks2508/no-throw 0.3.3 + @mks2508/better-logger 4.0.0.
- Tests vitest 6/6 verde (smoke + bypass + roundtrip JWT + invalid token).
- Build rolldown + tsc --emitDeclarationOnly. Sin `tsgo --emitDeclarationOnly`.
- Decisiones que el agent tomó por su cuenta: bumped `no-throw` a 0.3.3 (plan tenía 0.1.x stale), `exp` JWT como string `'604800s'` (number causaba tokens expirados), Elysia derive `global` (no `scoped`) para que `requireAuth()` vea `isAuthenticated` desde rutas consumer.
- Bug del agent: reportó npm publish OK con check `npm view` (devolvía 404 por CDN), verificado a posteriori con scope URL-encoded `%40mks2508%2F` → HTTP 200. Package realmente publicado.

**0.4.1.B (desktop-release-hub)**:
- Repo público `mks2508/desktop-release-hub`, monorepo Bun workspaces (apps/server + packages/shared + packages/sdk).
- Schema multi-tenant Drizzle: `projects(id, slug, public_pubkey)`, `releases(PK compuesta project_id+version+target+arch)`, `licenses`, `activations`, `api_keys` (deferred).
- Tenant middleware: extractSubdomain con port strip + IPv4 guard + admin/localhost bypass + cache 60s TTL.
- Storage abstraction: `IBinaryStorage` interface + `LocalFsStorage` impl. `BINARY_STORAGE_DIR` con fallback `./data/binaries` para dev, `/srv/binaries` prod.
- Dockerfile multi-stage Bun 1.2 alpine, **SIN VOLUME directive** (lección lockeada r1 verificada).
- Drizzle migration `0000_sparkling_beyonder.sql` con CREATE TABLE + FK ON DELETE cascade + composite index `(project_id, target, arch, pub_date)`.
- Smoke local: `bun run dev` arrancado :3003, `curl /api/health` 200 verde.
- Auth deferred: `@mks2508/auth-oidc-elysia` no añadido a deps (era unpublished durante scaffold), TODO en `_todos` field del package.json. Después de 0.4.1.A done, listo para incorporar en 0.4.1.C.
- Decisión del agent: PK compuesta correcta — el `id` UUID quedó como `.unique().notNull()` (Postgres no permite 2 PKs por tabla).

**0.4.1.G-prep (build-release.ts)**:
- `scripts/build-release.ts` (909 líneas) en `tpv-el-haido2`, wrapper de `tauri build` multi-target con signing keys.
- CLI: `--target macos-arm64|macos-x64|windows-x64|all` + `--no-sign` + `--output` + `--help`.
- Key resolution cross-platform (`os.homedir()`):
  - Private key file: `~/.tauri/<TAURI_KEY_NAME>.key` (default `tpv-el-haido`) → fallback `<repo>/tauri-keys/<name>.key` → env `TAURI_SIGNING_PRIVATE_KEY`.
  - Passphrase: env `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` → BW item `HAIDO` custom field `PASSPHRASE` (default, override via `BW_TAURI_KEY_ITEM`/`BW_TAURI_KEY_FIELD`).
  - BW vault locked → `bw unlock --raw` interactivo (prompt master en TTY, captura BW_SESSION en `process.env`).
  - BW unauthenticated → error claro pidiendo `bw login`.
- Output: `releases/<version>/<target>/*.app.tar.gz|*.nsis.zip + .sig` + `releases/<version>/latest.json` (Tauri updater format con `RELEASE_HUB_BASE_URL` configurable).
- Smoke verde en macOS arm64: keys cargadas correctamente desde `~/.tauri/tpv-el-haido.key` + BW item HAIDO field PASSPHRASE.
- Scripts package.json: `release:macos`, `release:windows`, `release:all`.

**0.4.1.E (Pocket ID + Coolify + DNS)** — axon ejecuta vía API directa:

- **Pocket ID app `release-hub-cli`**:
  - `client_id`: `70e7daf3-f393-4db9-b9e7-05e8775d7f6c`
  - Public client (PKCE), no client_secret
  - Callback URL: `http://127.0.0.1:54321/callback`
  - Scopes implícitos (Pocket ID default): `openid profile email`
- **Coolify project `release-hub`** (UUID `mcpt3lv1c3ocp8toxosnli6e`, environment `production` UUID `dprwkjbymdluxh0ecr274ihz`).
- **DB Postgres `release-hub-db`** (UUID `clk49aeprj3eiq1uxhfb56qo`, postgres:16-alpine).
  - Internal URL: `postgres://release_hub:***@clk49aeprj3eiq1uxhfb56qo:5432/release_hub`.
- **App `release-hub-server`** (UUID `d79mh3d95qhlpdd7hmmdn2sn`):
  - Repo `https://github.com/mks2508/desktop-release-hub` branch `main`, public.
  - Build pack `dockerfile`, location `/apps/server/Dockerfile`, base dir `/`, port 3003.
  - FQDN: `https://haido.releases.mks2508.systems` + `https://admin.releases.mks2508.systems`.
  - Persistent storage bind mount: `/srv/binaries` → host `/data/coolify/applications/d79mh3d95qhlpdd7hmmdn2sn/binaries`.
  - Env vars set: NODE_ENV, PORT, HOST, DATABASE_URL (internal), BINARY_STORAGE_DIR, OIDC_ISSUER_URL, OIDC_CLIENT_ID, SESSION_SECRET (random 32 bytes), ADMIN_UI_URL, COOKIE_DOMAIN.
- **DNS**: wildcard `*.mks2508.systems` ya existente apunta a 77.42.25.248 (lab1). `haido.releases.mks2508.systems` y `admin.releases.mks2508.systems` resuelven directo. Cert Let's Encrypt HTTP-01 automático Traefik.
- **Deploy queued**: deployment UUID `fw7ac91x0ativ6ikmcrldflu`, status `in_progress` al snapshot.
- **Pendiente post-deploy**: smoke `curl https://haido.releases.mks2508.systems/api/health` + insert primer project en DB (`INSERT INTO projects (slug, name, public_pubkey) VALUES ('haido', 'TPV El Haido', '<pubkey>')`) + actualizar `.env.example` del repo `desktop-release-hub` con env vars reales documentadas.

**Trade-offs aceptados**:
- App `release-hub-admin` (confidential client para SPA admin react) → diferido post-prod (no se necesita tonight).
- Wildcard cert Let's Encrypt DNS-01 → diferido. Por ahora cert per-domain HTTP-01 (basta para haido + admin tonight, futuros tenants se añaden uno a uno via FQDN CSV update).


**Resultado #10 (post-deploy smoke verde)**:

```
GET https://admin.releases.mks2508.systems/api/health → 200 {"ok":true,"service":"release-hub-server","version":"0.1.0"}
GET https://haido.releases.mks2508.systems/api/health → 200 idem
GET https://haido.releases.mks2508.systems/api/updates/darwin/aarch64/0.0.0 → 204 (no releases yet, expected)
GET https://haido.releases.mks2508.systems/api/updates/windows/x86_64/0.0.0 → 204 idem
POST /api/license/validate → 422 (schema validation, placeholder MVP)
GET (subdomain con tenant inválido) → 404 PROJECT_NOT_FOUND (middleware OK)
```

**Project seed haido**:
- INSERT `projects` row vía SSH+docker exec psql contra container DB.
- UUID generado: `fe059f0e-c509-40ff-a105-465c88c5fe40`.
- `slug=haido`, `name=TPV El Haido`, `public_pubkey` = pubkey actual de tauri.conf.json (sin rotar).

**0.4.1.E veredicto**: ✅ done. Hub multi-tenant en producción, FQDN + cert + bind mount + DNS + auth provider funcionando. Listo para que 0.4.1.C (admin endpoints) y 0.4.1.G (CLI publish) interactúen.

**Notas operativas para 0.4.1.F** (cuando waxin/agent migre tpv-el-haido2 al hub):
- Cambiar `tauri.conf.json` `plugins.updater.endpoints` de `updates.mks2508.systems/...latest.json` (Modo A, single-tenant tpv-cloud) a `https://haido.releases.mks2508.systems/api/updates/{{target}}/{{arch}}/{{current_version}}` (Modo B, hub multi-tenant).
- Tauri SDK soporta ambos modos según schema de respuesta.
- Cuando se rote la signing key (futuro), actualizar fila `projects` con nuevo `public_pubkey` antes de publicar release con la nueva key.

