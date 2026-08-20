---
type: plan
profile: compact
unit: TR-09
status: ready
source: docs/task-requests/TR-09-master-license-prod-hardening.md
effort: S
commit-strategy: single
commit-prefix: feat-phase(0.4.0.A)
generatedBy: task-decomposer
roadmapItemId: TR-09
suggestedBranch: main
---

# Plan: TR-09 — Master license: required en prod, fallback solo en dev

## Goal

Cerrar el gap de seguridad: las credenciales master hardcoded (`admin@haido.local` /
`HAI-MASTER-DEV-KEY-2026`) dejan de estar disponibles incondicionalmente en builds de
producción — Rust paniquea en runtime si faltan las env vars, frontend las elimina del
bundle vía dead-code-elimination. Dev sigue funcionando sin fricción, sin env vars nuevas.

## Contexto verificado

- `src-tauri/src/lib.rs`: el bloque a tocar está HOY en líneas **297-301** (no 281-284 como
  dice el TR) — TR-08 insertó `read_json_config` (líneas 232-247, **sin commitear**, ver
  `git diff src-tauri/src/lib.rs`) más arriba en el mismo archivo, desplazando todo lo
  posterior ~17 líneas. Función distinta (`read_json_config` vs
  `validate_and_activate_license`), sin overlap real de líneas — pero el executor DEBE
  correr `git diff src-tauri/src/lib.rs` antes de editar para confirmar que TR-08 no siga
  mid-edit ahí y anclar el cambio por contenido (el comentario
  `// Check if these are master credentials`), no por número de línea.
- Único otro consumo de `config.debug.masterEmail`/`masterKey` en frontend:
  `src/components/LicenseSplashScreen.tsx:176,179` — display-only, detrás de
  `<Show when={config.debug.enabled}>`. Ninguna lógica funcional depende del valor.
- `import.meta.env.DEV`/`.PROD` son built-ins de Vite — `vite.config.ts` no los
  sobreescribe (solo define `PWA_BUILD` y `__PWA_BASE__`), disponibles sin config nueva.
- Grep repo-wide (`MASTER_LICENSE\|HAI-MASTER-DEV-KEY\|admin@haido.local`) confirma que en
  CÓDIGO FUENTE (excluyendo `*.md` de docs/tickets/planes) solo aparecen en los 2 archivos
  de este plan. `apps/tpv-cloud/src/services/license.service.ts` ya usa `process.env.*`
  sin fallback hardcoded — confirmado por lectura directa, fuera de scope (no tocar).
- Ningún script (`scripts/release.ts`, `scripts/build-release.ts`, `.github/workflows/*`,
  `.env`, `.env.example`) setea hoy `MASTER_LICENSE_*` ni `VITE_MASTER_LICENSE_*`. Un
  build de prod actual (`bun run tauri build` sin env vars) **seguirá compilando limpio**
  (`cfg!(debug_assertions)` se evalúa en runtime, no es gate de compilación) pero
  **paniqueará en runtime** la primera vez que alguien invoque
  `validate_and_activate_license` — es exactamente el gap que este TR cierra, no un bug
  del executor. Antes del próximo release en el bar, las system env vars deben setearse en
  la máquina Windows destino (patrón ya documentado en `docs/tickets/TKT-04-windows-production-setup.md:162-163`,
  `[Environment]::SetEnvironmentVariable`) — prerequisito de deployment, fuera de este plan.

## Decisión: mecanismo frontend — (b), no (a)

El TR proponía (a) — throw en module-load si falta la var en prod — "si es igual de
simple". No lo es: `VITE_*` se inlinea en **build time** (no runtime como el lado Rust).
Bajo (a), un build de prod "bien configurado" hornearía las credenciales REALES en el
bundle JS público servido al cliente — recrea el mismo agujero que este TR cierra, con
secrets reales en vez de los de dev. Y sin las vars (el caso de hoy, confirmado arriba), la
app entera no bootearía en el próximo release. Se usa **(b)**: ternario inline
`VITE_* || (DEV ? fallback : '')`. Vite reemplaza `import.meta.env.DEV` por `false`
estáticamente en builds de prod y el minifier hace DCE de la rama dev-only — el bundle de
prod queda limpio de las credenciales sin requerir ninguna var nueva. El único consumo es
display-only (ver Contexto verificado), así que no hay pérdida funcional.

## Cambios

### `src-tauri/src/lib.rs` (~línea 297, dentro de `validate_and_activate_license` — anclar
por el comentario `// Check if these are master credentials`, NO por número de línea)

```diff
-    // Check if these are master credentials (local validation, no server required)
-    let master_email = std::env::var("MASTER_LICENSE_EMAIL")
-        .unwrap_or_else(|_| "admin@haido.local".to_string());
-    let master_key = std::env::var("MASTER_LICENSE_KEY")
-        .unwrap_or_else(|_| "HAI-MASTER-DEV-KEY-2026".to_string());
+    // Check if these are master credentials (local validation, no server required)
+    let master_email = std::env::var("MASTER_LICENSE_EMAIL").unwrap_or_else(|_| {
+        if cfg!(debug_assertions) {
+            "admin@haido.local".to_string()
+        } else {
+            panic!("MASTER_LICENSE_EMAIL no seteada en build de producción — requerida para validar licencia master (ver CLAUDE.md § License System)")
+        }
+    });
+    let master_key = std::env::var("MASTER_LICENSE_KEY").unwrap_or_else(|_| {
+        if cfg!(debug_assertions) {
+            "HAI-MASTER-DEV-KEY-2026".to_string()
+        } else {
+            panic!("MASTER_LICENSE_KEY no seteada en build de producción — requerida para validar licencia master (ver CLAUDE.md § License System)")
+        }
+    });
```

Sin helper — duplicado tal cual, matchea que el resto de la función no abstrae este tipo de
lookups. Las líneas siguientes de la función (`master_email.clone()`, `Some(master_email)`,
uso de `master_key` en la comparación `if email == master_email && key == master_key`)
quedan intactas — el tipo sigue siendo `String` en ambos branches del `unwrap_or_else`
(`panic!` es `!`, coerciona a cualquier tipo).

### `src/lib/config.ts` (líneas 101-104, dentro del objeto `config.debug`)

```diff
     /** Enable debug mode */
     enabled: import.meta.env.VITE_DEBUG_MODE === 'true',
-    /** Master license email for development/testing */
-    masterEmail: import.meta.env.VITE_MASTER_LICENSE_EMAIL || 'admin@haido.local',
-    /** Master license key for development/testing */
-    masterKey: import.meta.env.VITE_MASTER_LICENSE_KEY || 'HAI-MASTER-DEV-KEY-2026',
+    /** Master license email — fallback SOLO en dev; vacío en prod (VITE_* se inlinea en
+     * build time, el minifier elimina el string dev-only del bundle de producción) */
+    masterEmail: import.meta.env.VITE_MASTER_LICENSE_EMAIL || (import.meta.env.DEV ? 'admin@haido.local' : ''),
+    /** Master license key — mismo criterio */
+    masterKey: import.meta.env.VITE_MASTER_LICENSE_KEY || (import.meta.env.DEV ? 'HAI-MASTER-DEV-KEY-2026' : ''),
```

Sin helper — dos ternarios inline, matchea el estilo existente del archivo (todo el objeto
`config` son expresiones inline, cero funciones auxiliares).

## Milestones (claude tasks)

| # | Subject | Estimate | addBlockedBy | role |
|---|---|---|---|---|
| M1 | Hardening `validate_and_activate_license` (lib.rs) — panic en prod si faltan env vars | 10m | — | — |
| M2 | Hardening `config.debug.masterEmail/masterKey` (config.ts) — fallback dev-only vía DCE | 10m | — | — |
| M3 | Verificación (cargo check + typecheck + grep acceptance) + commit | 10m | M1, M2 | **canonical** |

**Metadata común a todas las milestones**:
- `roadmapItemId: "TR-09"`
- `phase: "0.4.0.A"`
- `tags: ["TR-09", "milestone:M<n>", "phase:0.4.0.A", "category:bug"]`

**Metadata específica de M3 (canonical, `commit-strategy: single`)**:
- `role: "canonical"`

## Git context

- Rama sugerida: `main` — este repo no usa feature branches (confirmado en planes previos
  TR-02/03/07 vía `git log`), aunque este TR sí tenga `roadmapItemId` con phase numerada
  real (`0.4.0.A` existe en `roadmap.spec.yml`, a diferencia de TR-07/08).
- Commit prefix: `feat-phase(0.4.0.A)` (phase real, no `unscoped`).
- Tag para hook: `[#TR-09]` — incluir en el commit único para que el hook
  `post-tool-use-bash` de `@mks-agentics/task-sync` popule `gitcommit`/`gitcommits`/
  `gitcommitscount` en TW (si dual mode activo). Si no hay TW (FS only), el tag es noop.
- Estrategia: `single` (un commit al final, tras cerrar M1+M2+M3).

## Prohibiciones

- NO tocar `apps/tpv-cloud/` (ya está bien, confirmado por lectura directa de
  `license.service.ts`).
- NO tocar `CLAUDE.md` (documenta las credenciales dev a propósito, fuera de scope).
- NO tocar `roadmap.spec.yml` ni `docs/progress-log.md` — doc sync lo hace axon después.
- NO tocar el bloque `read_json_config` de `lib.rs` (TR-08, mid-edit sin commitear) ni
  ningún otro comando Tauri del archivo.
- NO introducir un helper/función compartida para el lookup de env vars — ninguno de los 2
  lados lo tiene hoy; sería abstracción no pedida para 2 usos puntuales.

## Verify

- `cd src-tauri && cargo check && cd .. && bun run typecheck` → ambos limpios, sin errores
  ni warnings nuevos.
- `grep -rl "admin@haido.local\|HAI-MASTER-DEV-KEY-2026" src src-tauri/src` → exactamente 2
  rutas: `src/lib/config.ts` y `src-tauri/src/lib.rs` (no crece a más sitios).
- Smoke dev: `bun run tauri dev` bootea sin env vars seteadas, igual que hoy (fallback dev
  intacto). Si no hay tiempo de correr Tauri completo, `bun run typecheck && bun run build`
  verde alcanza como proxy — no llega a ejercitar el panic runtime (esperado, requiere
  invocar el comando desde la UI con credenciales master).
