# TKT-01.1 - Master License Production Hardening (No Fallback in Prod)

**Milestone**: 0.4.0.A
**Priority**: 🔥 CRITICAL (security)
**Status**: proposed (REFORMULADO post-r1)
**Created**: 2026-05-09
**Reformulated**: 2026-05-09 (post r1 verification)
**Assigned**: -
**Estimated**: 30min
**Decision doc**: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md)

## Context

Verificación en r1 prep: el código **ya usa `std::env::var()` con fallback** (no es hardcoded const como decía la formulación original). Estado actual `src-tauri/src/lib.rs:281-284`:

```rust
let master_email = std::env::var("MASTER_LICENSE_EMAIL")
    .unwrap_or_else(|_| "admin@haido.local".to_string());
let master_key = std::env::var("MASTER_LICENSE_KEY")
    .unwrap_or_else(|_| "HAI-MASTER-DEV-KEY-2026".to_string());
```

**Issue real (no resuelto)**:
- En **builds de producción**, el fallback se mantiene activo. Si las env vars NO se setean al instalar/runtime, queda activo el master key conocido (visible en repo + en binary).
- El "fallback" sirve para development local. **En production builds debe panicar** o usar valores que fallen explícitamente, NO defaultear a credenciales conocidas.

## Scope

### IN scope
- ✅ Cambiar la lógica para que en **builds de release/production** falle si las env vars no están seteadas
- ✅ Mantener fallback solo en builds de development (`#[cfg(debug_assertions)]`)
- ✅ Documentar cómo configurar las env vars en NSIS installer (env vars per-user en Windows)
- ✅ Verificar que `tauri.conf.json` o build script setea las env vars en el build de producción si waxin lo prefiere así (vs setearlas en runtime install)
- ✅ Actualizar `.env.example` con las claves esperadas
- ✅ Documentar en `docs/deployment/env-vars.md`

### OUT of scope
- ❌ Implementar secrets manager (overkill para 1 cliente)
- ❌ Rotación automática de master key (manual via update si es necesario)
- ❌ Eliminar master license entirely (sigue siendo válido como offline fallback de tpv-cloud)

## Dependencies

- None (cambio aislado en `src-tauri/src/lib.rs`)

## Acceptance Criteria

- [ ] **Production behavior**: si `MASTER_LICENSE_EMAIL` o `MASTER_LICENSE_KEY` no están seteadas en runtime AND build es release → panic con mensaje explícito O retorna error de license-not-configured (NO usa fallback hardcoded conocido)
- [ ] **Development behavior**: mantiene el fallback `admin@haido.local` / `HAI-MASTER-DEV-KEY-2026` para no romper dev workflow
- [ ] **Conditional compilation**: usa `#[cfg(debug_assertions)]` o env var de build flag para distinguir
- [ ] **Test dev**: `bun run tauri dev` → master license sigue funcionando con env-not-set
- [ ] **Test prod**: build de release SIN env vars → app falla clara o muestra "license configuration required"
- [ ] **Test prod with env vars**: build de release CON env vars seteadas → master license funciona
- [ ] **Doc**: `docs/deployment/env-vars.md` explica cómo setear env vars persistentes en Windows install (NSIS install hooks, registry, o user env vars)
- [ ] **No new hardcoded strings**: grep de `admin@haido.local` y `HAI-MASTER-DEV-KEY-2026` solo aparece en branch dev-only

## Technical Notes

### Approach 1: cfg debug_assertions (sencillo)

```rust
#[tauri::command]
async fn validate_and_activate_license(
    key: String,
    email: String,
    state: State<'_, DbState>
) -> Result<LicenseStatus, String> {
    let machine_fingerprint = generate_machine_fingerprint()?;

    // Master credentials: env var required in release, fallback OK in dev
    let master_email = std::env::var("MASTER_LICENSE_EMAIL")
        .unwrap_or_else(|_| {
            #[cfg(debug_assertions)]
            { "admin@haido.local".to_string() }
            #[cfg(not(debug_assertions))]
            { panic!("MASTER_LICENSE_EMAIL env var required in production build") }
        });
    let master_key = std::env::var("MASTER_LICENSE_KEY")
        .unwrap_or_else(|_| {
            #[cfg(debug_assertions)]
            { "HAI-MASTER-DEV-KEY-2026".to_string() }
            #[cfg(not(debug_assertions))]
            { panic!("MASTER_LICENSE_KEY env var required in production build") }
        });

    if email == master_email && key == master_key {
        // ... existing master license logic
    }
    // ... rest
}
```

**Trade-off**: panic crashea la app si env var no está. Mejor opción: retornar error controlado y dejar que UI muestre mensaje "License configuration required, contact admin" que un crash silencioso.

### Approach 2: Result-based (mejor UX, más código)

```rust
fn get_master_credentials() -> Result<(String, String), String> {
    let email = std::env::var("MASTER_LICENSE_EMAIL").or_else(|_| {
        #[cfg(debug_assertions)]
        { Ok::<String, String>("admin@haido.local".to_string()) }
        #[cfg(not(debug_assertions))]
        { Err("MASTER_LICENSE_EMAIL not configured".to_string()) }
    })?;

    let key = std::env::var("MASTER_LICENSE_KEY").or_else(|_| {
        #[cfg(debug_assertions)]
        { Ok::<String, String>("HAI-MASTER-DEV-KEY-2026".to_string()) }
        #[cfg(not(debug_assertions))]
        { Err("MASTER_LICENSE_KEY not configured".to_string()) }
    })?;

    Ok((email, key))
}
```

Y en el handler comparar contra Result<>:
```rust
let (master_email, master_key) = match get_master_credentials() {
    Ok(creds) => creds,
    Err(_) => {
        // Master license no disponible → procede a online validation
        // (no panic, solo significa que master license no aplica)
    }
};
```

**Recomendación r1**: Approach 2 (Result-based) — UX mejor, más alineado con guidelines Result pattern.

### Setting env vars en Windows install

**Opciones**:

1. **NSIS install script (`.nsi`)**: añadir `WriteRegStr` para setear en `HKCU\Environment`
   ```nsis
   WriteRegStr HKCU "Environment" "MASTER_LICENSE_EMAIL" "${MASTER_EMAIL}"
   WriteRegStr HKCU "Environment" "MASTER_LICENSE_KEY" "${MASTER_KEY}"
   SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment"
   ```
   Tauri 2 NSIS template permite custom hook si se requiere.

2. **PowerShell post-install** (waxin lo ejecuta una vez tras install):
   ```powershell
   [Environment]::SetEnvironmentVariable("MASTER_LICENSE_EMAIL", "admin@haido.local", "User")
   [Environment]::SetEnvironmentVariable("MASTER_LICENSE_KEY", "HAI-...", "User")
   ```

3. **`.env` file en `%APPDATA%/com.elhaido.tpv`** (TPV lee al startup):
   - Más portable, no toca registry
   - Requiere modificar Rust para leer `.env` además de env vars del sistema

**Recomendación tonight**: opción 2 (PowerShell manual post-install) es más rápida. Si waxin quiere automatizar, opción 1 vía NSIS hook.

### Riesgos

- **Existing installs roto**: si hay TPVs ya instalados con env vars no seteadas, el upgrade los rompe. Mitigation: para tonight (primera install), no hay TPVs previos. Si en el futuro, asegurar env vars seteadas ANTES de update.
- **Logs leak**: NO loguear `master_key` (incluso debug). Verificar `better-logger` config no logge env vars.
- **Master key rotation**: si el master key cambia post-deploy, todos los TPVs necesitan update env var manual. Por eso master license es offline-only fallback, no operación primaria.

## Sub-tasks

- [ ] 1. Leer `src-tauri/src/lib.rs` líneas 270-310 (función `validate_and_activate_license`)
- [ ] 2. Implementar `get_master_credentials()` con cfg debug_assertions (approach 2 Result-based)
- [ ] 3. Refactorizar handler para usar Result<>
- [ ] 4. Test dev: `bun run tauri dev` sin env vars → master license funciona
- [ ] 5. Test release simulado: `cargo build --release` y comprobar binary panic o error si env vars no seteadas
- [ ] 6. Crear `.env.example` con MASTER_LICENSE_EMAIL/KEY documentadas
- [ ] 7. Crear `docs/deployment/env-vars.md` con setup Windows
- [ ] 8. Commit: `fix(security): require MASTER_LICENSE env vars in release builds`

## Blocked by

- None

## Blocks

- TKT-04 (build en bar) — el binary que se buildee debe tener este hardening, sino se deploya con fallback activo

## References

- r1 decision doc: [`r1`](../decisions/r1-deployment-architecture-2026-05-09.md) sección "Status pre-decision"
- Verification de exploration agent: el código ya usa env-with-fallback, no const
- OWASP: Hardcoded credentials https://owasp.org/www-project-top-ten/

## Changelog

- **2026-05-09 (r1 prep)**: Reformulado. La formulación original decía "hardcoded const" pero la verificación encontró que el código ya usa env vars con fallback. El issue real es que el fallback NO debe estar activo en production builds.
