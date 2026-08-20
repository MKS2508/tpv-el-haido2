# TR-09 — Master license: required en prod, fallback solo en dev (0.4.0.A)

**Ticket**: [TKT-01.1](../tickets/TKT-01.1-fix-hardcoded-credentials.md)
**Phase**: 0.4.0.A (roadmap.spec.yml, status `next` desde 2026-05-09, nunca ejecutado)
**Priority**: critical (security) pero low-effort
**Estimated**: 30m humano (~4-5m LLM real, cambio mecánico en 2 archivos)

## Contexto

Criterio ya definido en `roadmap.spec.yml` (0.4.0.A): "MASTER_LICENSE_KEY/EMAIL son
required en build prod (panic si faltan), nunca usar fallback hardcoded fuera de dev".

**Nunca se ejecutó** — confirmado por grep, hoy en `main` (commit `3772974`):

- `src-tauri/src/lib.rs:281-284` (`validate_and_activate_license`, comando Tauri) —
  fallback hardcoded incondicional: `std::env::var("MASTER_LICENSE_EMAIL").unwrap_or_else(|_|
  "admin@haido.local".to_string())` (idem `MASTER_LICENSE_KEY` → `"HAI-MASTER-DEV-KEY-2026"`).
  Esto es "no server required" — validación 100% local en el cliente. **Cualquier build de
  release (Windows/Linux/macOS ya publicados en el hub) trae estas credenciales horneadas en
  el binario** si nadie seteó las env vars al buildear — cualquiera que las conozca (están en
  `CLAUDE.md`, documentadas a propósito para dev) activa el TPV gratis.
- `src/lib/config.ts:102,104` — mismo patrón en el frontend:
  `import.meta.env.VITE_MASTER_LICENSE_EMAIL || 'admin@haido.local'` (idem key).

**NO tocar** `apps/tpv-cloud/src/services/license.service.ts` — ya está bien
(`process.env.MASTER_LICENSE_EMAIL` sin fallback hardcoded, falla cerrado si no está seteada
— confirmado por lectura directa, fuera de scope de este TR).

## Objetivo

- **Build de release/prod**: si `MASTER_LICENSE_EMAIL`/`MASTER_LICENSE_KEY` no están seteadas,
  **panic** (Rust) / **error explícito al build** o **fail-closed en runtime con log claro**
  (frontend Vite, no existe "panic" ahí — decidir el mecanismo correcto, ver Output esperado).
- **Build de dev**: mantener el fallback actual, sin fricción para desarrollo local.
- Distinguir dev/prod: Rust → `cfg!(debug_assertions)` (idiomático, sin flag nuevo). Frontend
  Vite → `import.meta.env.DEV`/`import.meta.env.PROD` (ya disponible, sin config nueva).

## Output esperado del decomposer

`.plan.md` corto (esto es un TR chico, no hace falta la escala de TR-07/08) con:

1. Diff exacto para `src-tauri/src/lib.rs` — reemplazar el `unwrap_or_else` incondicional por
   algo tipo:
   ```rust
   let master_email = std::env::var("MASTER_LICENSE_EMAIL").unwrap_or_else(|_| {
       if cfg!(debug_assertions) {
           "admin@haido.local".to_string()
       } else {
           panic!("MASTER_LICENSE_EMAIL no seteada en build de producción")
       }
   });
   ```
   (mismo patrón para `MASTER_LICENSE_KEY`). Verificar que el mensaje de panic es claro y que
   esto no rompe el flujo si las env vars SÍ están seteadas en prod (caso normal, no debería
   paniquear nunca en un release bien configurado).
2. Diff exacto para `src/lib/config.ts` — mismo criterio pero mecanismo Vite-idiomático (Vite
   no tiene "panic" en runtime del navegador/Tauri webview; decidir entre: (a) throw en
   inicialización del módulo si `import.meta.env.PROD && !import.meta.env.VITE_MASTER_LICENSE_EMAIL`,
   o (b) dejar `undefined` en prod sin fallback y que el flujo de validación normal falle
   limpio más abajo — preferir (a) si es igual de simple, es más explícito y falla rápido en
   vez de silencioso).
3. Verificar que NINGÚN build actual de CI/local setea estas env vars por defecto — si el
   plan detecta que un build de prod normal (ej. `bun run tauri build` sin env vars) VA a
   paniquear/fallar con el cambio, eso es intencional (es justo el gap que se está cerrando),
   pero debe quedar explícito en el plan para que el executor no lo interprete como bug propio.
4. Grep de otros posibles usos de estas constantes hardcoded que se me hayan escapado (busqué
   `MASTER_LICENSE\|HAI-MASTER-DEV-KEY\|admin@haido.local` y solo salieron los 3 archivos
   mencionados, confirmar que sigue siendo así).

## Constraints

- NO tocar `apps/tpv-cloud/` (ya está bien, confirmado).
- NO romper el flujo de dev (`bun run tauri dev` sin env vars debe seguir funcionando con el
  fallback, igual que hoy).
- Mantener `CLAUDE.md` como está (documenta las credenciales master para dev a propósito) —
  no es un secret leak, es la convención de dev del proyecto, fuera de scope tocarlo.

## Acceptance

- `cargo check` / `bun run typecheck` limpios.
- Grep de `admin@haido.local`/`HAI-MASTER-DEV-KEY-2026` sigue encontrando 2 archivos (los del
  fallback dev, ahora condicionados), no crece a más sitios.
- Build de dev sigue arrancando sin env vars seteadas (smoke: `bun run tauri dev` boot OK, o
  al menos `bun run typecheck && bun run build` verde si no hay tiempo de correr Tauri dev
  completo).

## Suggested executor agent

`task-executor` directo tras un `.plan.md` corto de `task-decomposer` — no requiere
exploración pesada, ya está todo localizado en este TR.

## Notas operativas

- Corre en paralelo a TR-07 (bloqueado esperando a waxin) y TR-08 (en progreso) — archivos
  completamente distintos (`src-tauri/src/lib.rs` lo toca también TR-08 en M4, pero en una
  función DIFERENTE — `read_json_config` vs `validate_and_activate_license`, sin overlap de
  líneas; igual, avisar en el prompt del executor para que revise `git diff` antes de tocar
  ese archivo por si TR-08 ya está mid-edit ahí).
- Doc sync (roadmap.spec.yml + progress-log) se difiere, igual que TR-07/08 — axon lo hace
  después en un solo pase.
