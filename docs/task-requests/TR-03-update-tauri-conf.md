# TR-03 — Update tauri.conf.json Updater Endpoints

**Ticket**: [TKT-08](../tickets/TKT-08-update-tauri-conf.md)
**Phase**: 0.4.0.C
**Priority**: critical
**Estimated**: 30min
**Decision doc**: [r1](../decisions/r1-deployment-architecture-2026-05-09.md)

## Brief para decomposer

Editar `src-tauri/tauri.conf.json` para cambiar updater endpoints de GitHub a `updates.mks2508.systems`.

## Output esperado del decomposer

`.plan.md` con:

1. Verificar acceso al `tauri-private-key.key` (minisign) — abort si missing
2. Editar `bundle.updater.endpoints` con URL nueva (schema dinámico)
3. Añadir `bundle.updater.windows.installMode: "passive"`
4. Confirmar `createUpdaterArtifacts: true`
5. Test local: `bun run tauri dev` + DevTools `check()`
6. Verificar request llega a tpv-cloud (logs Coolify)
7. Crear `docs/deployment/releases.md` con pasos de release

## Constraints

- **NO regenerar minisign pubkey** — todos los clientes que ya tendrán el pubkey actual rejectarán updates si cambia
- **NO añadir endpoints de fallback** — r1 lockeó solo 1 endpoint (Coolify SLA suficiente)
- **NO commitear el private key** — solo verificar accesible

## Endpoint target lockeado

```json
"endpoints": [
  "https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}"
]
```

## Files a modificar

- `src-tauri/tauri.conf.json` (single file edit)
- `docs/deployment/releases.md` (create)

## Dependencies

- TR-02 (TKT-07 tpv-cloud) debe estar deployed y `/health` 200 antes de testear

## Acceptance

Ver `Acceptance Criteria` completo en TKT-08.

## Suggested executor agent

`task-executor` (single config edit, low complexity).
