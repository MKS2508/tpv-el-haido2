# TR-06 — Cleanup License-Server Antiguo + Apps Stale

**Ticket**: [TKT-11](../tickets/TKT-11-cleanup-old-license-server.md)
**Phase**: 0.4.0.F
**Priority**: low (post-smoke)
**Estimated**: 15min
**Decision doc**: [r1](../decisions/r1-deployment-architecture-2026-05-09.md)

## Brief para decomposer

Una vez TR-05 (smoke test OTA) pasó GREEN, eliminar las apps obsoletas de Coolify en project haido:

- `license-server` (UUID `csw844gw8w0w4gkcgkk8sk04`, exited:unhealthy) — replaced by tpv-cloud
- `tpv-pwa` (UUID `ag40ossc0cs4sk8g4gggoo04`, exited:unhealthy) — confirmar con waxin antes de delete
- `m-k-s2508/tpv-el-haido2` (UUID `ws0k0o0w4k8gkgwwoo0s8gkk`, running:unhealthy) — investigar qué es, probable auto-deploy gh PWA fallido

## Output esperado del decomposer

`.plan.md` con:

1. **Pre-condition check**: TR-05 status `done`
2. **Backup attempt** (paranoia): exec license-server container, check si hay data, dump si existe
3. **Confirm with user**: tpv-pwa delete? m-k-s2508 app delete?
4. **Delete commands**: `coolify-cli delete <uuid>` por cada app aprobada
5. **Verify**: `coolify-cli list` clean state, `coolify-cli projects --apps vg48wsk4808ocoggoco8444g` muestra solo haidodocs + tpv-cloud
6. **DNS cleanup note**: subdomain `haidolicense.mks2508.systems` queda sin app — manual DNS update opcional

## Constraints

- **NO delete sin confirmar smoke test OK** — si TR-05 pendiente o failed, abortar
- **NO delete tpv-pwa sin confirm** explícita de waxin (preguntar antes)
- **NO delete m-k-s2508/tpv-el-haido2** sin investigar qué deployaba (`coolify-cli show <uuid>` primero)

## Dependencies

- TR-05 done

## Acceptance

Ver `Acceptance Criteria` completo en TKT-11.

## Suggested executor agent

`task-executor` (CLI commands sequenciales). Mid-task pause para confirm con waxin sobre tpv-pwa.

## Notas

- Cleanup es low priority — si tonight no hay tiempo, postpone a mañana sin bloquear nada.
- Mantener license-server old `exited:unhealthy` no consume recursos (container parado), solo es ruido en `coolify-cli list`.
