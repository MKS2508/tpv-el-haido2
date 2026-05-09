# TKT-11 - Cleanup License-Server Antiguo + tpv-pwa

**Milestone**: 0.4.0.F
**Priority**: ⏠️ LOW
**Status**: proposed (post-smoke OK)
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 15m
**Decision doc**: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md)

## Context

R1 D6: license-server (`exited:unhealthy` en Coolify) se reemplaza por tpv-cloud (TKT-07), no se intenta revivir. Una vez tpv-cloud verified end-to-end (post smoke test TKT-10), eliminar la app vieja.

Adicional: hay también `tpv-pwa` `exited:unhealthy`. Verificar si es legacy y se borra también.

## Scope

### IN scope
- ✅ Verificar tpv-cloud está healthy + smoke test OTA pasó (TKT-10 done)
- ✅ Backup data del license-server old si existe (probablemente vacío)
- ✅ Delete app `license-server` (UUID `csw844gw8w0w4gkcgkk8sk04`) en Coolify
- ✅ Verificar subdomain `haidolicense.mks2508.systems` queda libre
- ✅ Verificar `tpv-pwa` (UUID `ag40ossc0cs4sk8g4gggoo04`) — si waxin confirma que era PWA antigua, delete también
- ✅ Verificar `m-k-s2508/tpv-el-haido2` (UUID `ws0k0o0w4k8gkgwwoo0s8gkk`, `running:unhealthy`) — qué hace? ¿auto-deploy GitHub PWA fallido? consultar a waxin

### OUT of scope
- ❌ DNS cleanup automático (manual via UI Cloudflare/proveedor DNS)
- ❌ Cleanup de Headscale routes (no aplica, license-server era público)

## Dependencies

- TKT-10 (smoke test OTA pasó) — no cleanup hasta verified

## Acceptance Criteria

- [ ] **Smoke OK confirmado**: TKT-10 status `done`, tpv-cloud handling traffic
- [ ] **Backup verificado**: si license-server tenía data, exportada (probablemente vacía)
- [ ] **license-server deleted**: `coolify-cli list` ya no muestra la app
- [ ] **tpv-pwa decisión**: si delete confirmada por waxin, también deleted
- [ ] **Subdomain freed**: `haidolicense.mks2508.systems` deja de resolver (o redirect a updates.mks2508.systems si waxin quiere)
- [ ] **Coolify project haido**: muestra solo `haidodocs` + `tpv-cloud` (apps activas tras cleanup)

## Technical Notes

### Inventory antes de cleanup

Apps en project haido (estado pre-cleanup):

| UUID | Name | Status | Action |
|---|---|---|---|
| vsks88o4g8wc44c0oo8ckwcc | haidodocs | running:healthy | KEEP |
| csw844gw8w0w4gkcgkk8sk04 | license-server | exited:unhealthy | DELETE |
| ws0k0o0w4k8gkgwwoo0s8gkk | m-k-s2508/tpv-el-haido2 | running:unhealthy | INVESTIGATE |
| ag40ossc0cs4sk8g4gggoo04 | tpv-pwa | exited:unhealthy | DELETE (confirm waxin) |

### Backup license-server (paranoia)

```bash
# Antes de delete, intentar dump
coolify-cli exec license-server "ls -la /data 2>&1 || echo 'no /data'"
coolify-cli exec license-server "find / -name '*.db' 2>/dev/null"

# Si encuentra DB:
coolify-cli exec license-server "sqlite3 /path/to.db .dump > /tmp/backup.sql"
# scp local
```

Probable output: container ya muerto, no se puede exec → no backup necesario, era dev vacío.

### Delete commands

```bash
# License server
coolify-cli delete csw844gw8w0w4gkcgkk8sk04

# tpv-pwa (si confirm)
coolify-cli delete ag40ossc0cs4sk8g4gggoo04

# m-k-s2508/tpv-el-haido2 (verificar primero qué es)
coolify-cli show ws0k0o0w4k8gkgwwoo0s8gkk
# Si es auto-deploy gh PWA fallido y waxin quiere delete:
coolify-cli delete ws0k0o0w4k8gkgwwoo0s8gkk
```

### Verificación final

```bash
coolify-cli projects --apps vg48wsk4808ocoggoco8444g
# Esperado:
# - haidodocs (running:healthy)
# - tpv-cloud (running:healthy)
```

## Sub-tasks

- [ ] 1. Verificar smoke test OTA done (TKT-10 status)
- [ ] 2. Backup license-server data (si exec funciona)
- [ ] 3. `coolify-cli delete license-server`
- [ ] 4. Confirmar con waxin: ¿delete tpv-pwa también?
- [ ] 5. Investigar `m-k-s2508/tpv-el-haido2` UUID `ws0k0o0...` (probable auto-deploy fallido)
- [ ] 6. Delete según decisión waxin
- [ ] 7. Verificar `coolify-cli list` clean state
- [ ] 8. Verificar subdomain `haidolicense.mks2508.systems` ya no resuelve (o redirect)

## Blocked by

- TKT-10 (smoke test OTA verified)

## Blocks

- None (es cleanup final)

## References

- r1 decision: D6 (license-server replace, no revivir)
- Coolify list output preview en r1 (17 apps total)
