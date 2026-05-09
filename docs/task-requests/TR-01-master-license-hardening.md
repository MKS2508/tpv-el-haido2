# TR-01 — Master License Production Hardening

**Ticket**: [TKT-01.1](../tickets/TKT-01.1-fix-hardcoded-credentials.md)
**Phase**: 0.4.0.A
**Priority**: critical
**Estimated**: 30min
**Decision doc**: [r1](../decisions/r1-deployment-architecture-2026-05-09.md)

## Brief para decomposer

Refactor `src-tauri/src/lib.rs` función `validate_and_activate_license` (líneas ~270-310) para que en builds de release/production, las env vars `MASTER_LICENSE_EMAIL` y `MASTER_LICENSE_KEY` sean **required** (sin fallback hardcoded).

Approach lockeado en TKT-01.1: Result-based con `#[cfg(debug_assertions)]` para mantener fallback en dev.

## Output esperado del decomposer

`.plan.md` con:
- Lista de archivos a modificar (`src-tauri/src/lib.rs`)
- Diff exacto del refactor (función `get_master_credentials() -> Result<(String, String), String>`)
- Test plan (dev mode con/sin env vars + simulación release)
- `.env.example` updated
- `docs/deployment/env-vars.md` created
- Verification commands (grep de strings hardcoded)
- Commit message draft

## Constraints

- NO cambiar la lógica de master license validation, solo el fetch de credentials
- Mantener compatibility con dev workflow (sin env vars seteadas en dev)
- En prod build sin env vars → retornar error controlado (NO panic recommended)

## Files relevantes

- `src-tauri/src/lib.rs` (líneas 270-310)
- `.env.example` (crear si no existe)

## Acceptance

Ver `Acceptance Criteria` completo en TKT-01.1.

## Suggested executor agent

`task-executor` (cambio aislado Rust, mid complexity).
