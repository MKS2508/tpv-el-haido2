# TKT-03 - Coolify Migration (License Server + Docs)

> **🚫 SUPERSEDED por r1 (2026-05-09)** — split en sub-resoluciones.
>
> **HaidoDocs (era 0.4.0.C)**: ✅ DONE. Verificación r1 prep mostró que `haidodocs` ya está en Coolify lab1 con status `running:healthy` (subdomain `haido-docs.mks2508.systems`). NO hace falta migrar.
>
> **License-server (era 0.4.0.B)**: ❌ replaced. R1 D2 + D6 lockearon **reemplazar** (no revivir) el license-server actual (`exited:unhealthy`) por **tpv-cloud unified** ([TKT-07](./TKT-07-build-tpv-cloud.md)) que consolida updates + license en un solo servicio Bun + Elysia + Drizzle.
>
> **Cleanup del license-server old**: tracked en [TKT-11](./TKT-11-cleanup-old-license-server.md) post-smoke-test.
>
> **Acción**: NO ejecutar este ticket, las sub-tareas se cumplen vía TKT-07 + TKT-11.

**Milestone**: 0.4.0.B (replaced) + 0.4.0.C (done)
**Priority**: high (was)
**Status**: 🚫 superseded (split: HaidoDocs done, license-server → TKT-07)
**Created**: 2026-05-09
**Superseded**: 2026-05-09 (r1)
**Assigned**: -
**Estimated**: 3-4h (NO LONGER NEEDED — work split into TKT-07 + TKT-11)

## Context

Actualmente license server y docs son apps standalone que corren localmente. Para producción necesitamos:

1. **Infra unificada** en Coolify (mejor control de updates, releases)
2. **Acceso remoto** para management
3. **Single source of truth** para todas las configuraciones

**Apps a migrar**:
- `/apps/license-server/` - Elysia.js (Bun runtime)
- `/apps/haidodocs/` - Next.js (documentation site)

**Herramienta disponible**: `coolify-cli-mcp` (SDK + CLI + MCP)

## Scope

### IN scope
- ✅ Audit license server: dependencias, ports, env vars
- ✅ Audit docs site: dependencias, ports, build process
- ✅ Crear apps en Coolify via `coolify-cli-mcp`
- ✅ Configurar deployments (GitHub integration)
- ✅ Test deploy: ambas apps accesibles vía URLs de Coolify
- ✅ Verificar health checks funcionando
- ✅ Documentar: configuración en `.coolify.json`

### OUT of scope
- ❌ Migrar base de datos (si license server tiene DB,另行 discutir)
- ❌ Configurar custom domains (deferred)
- ❌ Auto-deploy on every commit (can be done later)

## Dependencies

- TKT-01 (updater audit) - necesitas entender cómo funcionan los releases

## Acceptance Criteria

- [ ] **License server auditado**: entiendes cómo arranca y qué necesita
- [ ] **Docs site auditado**: entiendes build process y dependencias
- [ ] **Apps creadas en Coolify**: ambas apps visibles en dashboard
- [ ] **Deploy test**: `coolify-cli deploy` funciona para ambas
- [ ] **URLs accesibles**: license server + docs responden
- [ ] **Health checks**: `/health` endpoints responden 200
- [ ] **Config documentada**: `.coolify.json` commit al repo
- [ ] **Guía escrita**: `/docs/deployment/coolify.md` con pasos

## Technical Notes

**Qué verificar en código**:
1. `/apps/license-server/package.json` - dependencies, scripts
2. `/apps/license-server/src/index.ts` - port, startup
3. `/apps/haidodocs/package.json` - dependencies, build command
4. `/apps/haidodocs/next.config.js` - port, build config

**Comandos útiles**:
```bash
# Audit apps
cd apps/license-server && cat package.json && bun run dev  # verify startup
cd apps/haidodocs && cat package.json && bun run dev  # verify startup

# Coolify CLI
coolify-cli init                    # Crear .coolify.json
coolify-cli active-deployments       # Ver deploys en curso
coolify-cli deploy                   # Deploy manual

# MCP (si Claude tiene acceso)
# Verificar coolify-mks-cli-mcp skill
```

**Riesgos conocidos**:
- License server puede necesitar DB (Drizzle?) → hay que migrar también
- Apps pueden tener hardcoded ports que colisionan
- Environment variables pueden no estar documentadas
- Coolify puede no tener soporte para alguna dependencia

**Environment vars probables**:
```bash
# License server
DATABASE_URL=?
PORT=3000
MASTER_LICENSE_EMAIL=?
MASTER_LICENSE_KEY=?

# Docs
NEXT_PUBLIC_API_URL=?
PORT=3001
```

## Sub-tasks

### 0.4.0.B - License Server
- [ ] 1. Audit `/apps/license-server/` completo
- [ ] 2. Entender dependencias y startup
- [ ] 3. Crear app en Coolify (coolify-cli init)
- [ ] 4. Configurar GitHub integration
- [ ] 5. Test deploy local
- [ ] 6. Verify health check
- [ ] 7. Documentar env vars

### 0.4.0.C - Docs Site
- [ ] 1. Audit `/apps/haidodocs/` completo
- [ ] 2. Entender build process
- [ ] 3. Crear app en Coolify
- [ ] 4. Configurar GitHub integration
- [ ] 5. Test deploy local
- [ ] 6. Verify site accessible
- [ ] 7. Documentar build config

### Unificar
- [ ] 8. Crear `.coolify.json` con ambas apps
- [ ] 9. Test deploy simultaneous
- [ ] 10. Documentar en `/docs/deployment/coolify.md`

## Blocked by

- TKT-01 (entender releases en GitHub)

## Blocks

- TKT-04 (Windows production setup) - necesitas apps en Coolify primero

## Findings

*(Post-execución: llenar con discoveries reales)*

- [ ] ¿License server tiene DB? ¿Hay que migrarla?
- [ ] ¿Puertos de las apps? ¿Colisionan?
- [ ] ¿Env vars necesarias?
- [ ] ¿Coolify tiene soporte para todas dependencias?
- [ ] ¿GitHub integration funciona?

## References

- Coolify MCP skill: `coolify-mks-cli-mcp` (verificar disponible)
- License server docs: `/apps/license-server/README.md` (si existe)
- Docs site config: `/apps/haidodocs/next.config.js`
