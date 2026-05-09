# TKT-01.1 - Fix Hardcoded Master Credentials (Security)

**Milestone**: 0.4.0.A (BLOCKER para producción)
**Priority**: 🔥 **CRITICAL** - Security issue
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 30min

## Context

**Issue crítico de seguridad descubierto en exploración de código**:

```rust
// src-tauri/src/lib.rs:282-284
const MASTER_LICENSE_EMAIL: &str = "admin@haido.local";
const MASTER_LICENSE_KEY: &str = "HAI-MASTER-DEV-KEY-2026";
```

**Por qué es crítico**:
- Hardcoded credentials en el binary compilado
- Cualquiera con el binary puede extraerlas
- No hay rotación posible sin recompilar
- Violación de seguridad básica

## Scope

### IN scope
- ✅ Mover master credentials a env vars
- ✅ Actualizar código para leer desde env
- ✅ Probar que funciona con env vars
- ✅ Documentar cómo configurar en producción

### OUT of scope
- ❌ Cambiar el sistema de licencias (solo mover credentials)
- ❌ Implementar secrets manager (overkill ahora)

## Dependencies

- None (puede hacerse inmediatamente)

## Acceptance Criteria

- [ ] **Código actualizado**: `lib.rs` ya no tiene hardcoded credentials
- [ ] **Env vars implementadas**: `MASTER_LICENSE_EMAIL` + `MASTER_LICENSE_KEY`
- [ ] **Test**: Validar master key funciona con env vars
- [ ] **Fallback**: Valores default para desarrollo (localhost)
- [ ] **Documentado**: `/docs/deployment/env-vars.md` creado
- [ ] **Commit**: "fix(security): migrate master credentials to env vars"

## Technical Notes

**Cambios necesarios**:

1. `src-tauri/src/lib.rs`:
```rust
// ANTES (hardcoded):
const MASTER_LICENSE_EMAIL: &str = "admin@haido.local";
const MASTER_LICENSE_KEY: &str = "HAI-MASTER-DEV-KEY-2026";

// DESPUÉS (env vars):
fn get_master_email() -> String {
    std::env::var("MASTER_LICENSE_EMAIL")
        .unwrap_or_else(|_| "admin@haido.local".to_string())
}

fn get_master_key() -> String {
    std::env::var("MASTER_LICENSE_KEY")
        .unwrap_or_else(|_| "HAI-MASTER-DEV-KEY-2026".to_string())
}
```

2. `src-tauri/tauri.conf.json` - añadir env vars:
```json
{
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      }
    }
  },
  "env": {
    "MASTER_LICENSE_EMAIL": "admin@haido.local",
    "MASTER_LICENSE_KEY": "HAI-MASTER-DEV-KEY-2026"
  }
}
```

3. `.env` para desarrollo:
```bash
MASTER_LICENSE_EMAIL=admin@haido.local
MASTER_LICENSE_KEY=HAI-MASTER-DEV-KEY-2026
```

**Comandos útiles**:
```bash
# Test que funcione
bun run tauri dev
# Test master license validation en la app

# Verificar que no quedan hardcoded credentials
grep -r "admin@haido.local\|HAI-MASTER-DEV-KEY-2026" src-tauri/src/
```

## Sub-tasks

- [ ] 1. Leer `src-tauri/src/lib.rs` líneas 280-290
- [ ] 2. Implementar `get_master_email()` y `get_master_key()` con env vars
- [ ] 3. Reemplazar hardcoded constants por calls a functions
- [ ] 4. Añadir env vars a `.env.example`
- [ ] 5. Test en development: master license valida
- [ ] 6. Documentar en `/docs/deployment/env-vars.md`
- [ ] 7. Commit y verificar que no quedan hardcoded credentials

## Blocked by

- **NONE** - puede hacerse inmediatamente
- **BLOCKER para TKT-04** - no debes deployar a producción con hardcoded credentials

## Blocks

- Nada - cambio aislado

## References

- TKT-01 (Updater audit) - relacionado pero no bloqueante
- OWASP: Hardcoded credentials https://owasp.org/www-project-top-ten/
