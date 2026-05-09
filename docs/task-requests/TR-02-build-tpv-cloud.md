# TR-02 — Build tpv-cloud Unified Service

**Ticket**: [TKT-07](../tickets/TKT-07-build-tpv-cloud.md)
**Phase**: 0.4.0.B
**Priority**: critical
**Estimated**: 3-4h
**Decision doc**: [r1](../decisions/r1-deployment-architecture-2026-05-09.md)

## Brief para decomposer

Construir un nuevo servicio Bun + Elysia + Drizzle + PostgreSQL en `apps/tpv-cloud/` que sirva:

- `GET /updates/:target/:arch/:current_version` (semver compare server-side)
- `GET /dl/:version/setup.exe` (static binary serve desde volume)
- `GET /dl/:version/setup.exe.sig` (minisign signature)
- `POST /license/validate`
- `POST /license/activate`
- `GET /health`

Y deployar en Coolify lab1 (project `haido`, subdomain `updates.mks2508.systems`).

DB nueva `tpv-cloud-db` (Postgres) creada via `coolify-cli db create postgresql`.

## Output esperado del decomposer

`.plan.md` con:

1. **Phase A**: Estructura de proyecto (`apps/tpv-cloud/` con package.json, tsconfig, Dockerfile)
2. **Phase B**: Drizzle schema (`licenses`, `releases`, `activations`) + migrations
3. **Phase C**: Routes (updates, downloads, license, health) + services + types siguiendo `/guidelines` architecture
4. **Phase D**: Logger (`@mks2508/better-logger`) + error codes (`@mks2508/no-throw` Result pattern)
5. **Phase E**: Coolify deploy (db create + app create + env vars + volume + DNS)
6. **Phase F**: Verification (curl healthcheck, endpoint shapes, DB schema)

Cada phase con criterio de cierre concreto y commands exactos.

## Constraints

- **Stack obligatorio**: Bun + Elysia + Drizzle + PostgreSQL (no inventar otro)
- **Layers según `/guidelines`**: routes/ → services/ → db/
- **Result pattern** para errores (no throw)
- **JSDoc en exports** (regla 1)
- **Logger** no console.log (regla 2)
- **No GitHub** en cualquier endpoint o config
- **Schema response v2 de Tauri** exact match: `{ version, notes, pub_date, url, signature }`
- **204 No Content** cuando no hay update (NO 200 con `{available: false}`)

## Files a crear

```
apps/tpv-cloud/
├── src/
│   ├── index.ts
│   ├── routes/{updates,downloads,license,health}.ts
│   ├── services/{update,license,crypto}.service.ts
│   ├── db/{schema,client}.ts
│   ├── types/index.ts
│   └── lib/{error-codes,logger}.ts
├── drizzle/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Coolify commands lockeados

```bash
# DB
coolify-cli db create postgresql \
  --server awgcco0k48g4kgw8cckkc808 \
  --project vg48wsk4808ocoggoco8444g \
  --environment production \
  --name tpv-cloud-db

# App
coolify-cli create \
  --type dockerfile \
  --project vg48wsk4808ocoggoco8444g \
  --name tpv-cloud \
  --domain updates.mks2508.systems \
  --git https://github.com/MKS2508/tpv-el-haido2 \
  --base-dir /apps/tpv-cloud \
  --branch main
```

## Acceptance

Ver `Acceptance Criteria` completo en TKT-07.

## Skills a cargar

- `elysiajs` (`~/.claude/skills/elysiajs/`)
- `coolify-mks-cli-mcp`
- `/guidelines architecture errors services`

## Suggested executor agent

`task-executor` con context cargado de elysiajs skill. Si el plan es muy grande (>4h estimado), `plan-architect` para descomposición primero.
