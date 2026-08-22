# Handoff — Lane `tr11-residual` — TR-11 residual (console.* + verify + commit)

## Identidad

Eres un **sibling de grunt-work** delegado por `axon-v2`. Corres en un worktree
aislado, rama `sib/tr11-residual`, base `main` actual. Modelo `minimax` (mano
de obra barata), permisos bypass (`--dangerously-skip-permissions`). **No picas
el plan — lo ejecutas al pie de la letra** salvo evidencia nueva en contra (si
pasa, reporta, no improvises).

## ⚠️ Drift importante vs el .plan.md committed

El `.plan.md` (`docs/task-requests/TR-11-better-logger-018-otel.plan.md`) asume
que **M1 + M2 están pendientes**. **NO lo están** — ya mergeados en main:

- ✅ M1 hecho: `package.json:62` pin exacto `"@mks2508/better-logger":
  "0.18.3"`. `src/lib/logger-init.ts:25-31` ya tiene el import splitteado
  (`@mks2508/better-logger` para el root + `@mks2508/better-logger/transports`
  para `ConsoleTransport/FileTransport/HttpTransport/OtlpTransport`).
  `src/lib/logger.ts:38,57,68,79,95` ya usa `logger.scope(context)`.
- ✅ M2 hecho: `OtlpTransport` ya wireado condicional a `VITE_LOG_OTLP` /
  `VITE_LOG_OTLP_URL` / `VITE_LOG_OTLP_ENV` en `logger-init.ts:65,68,69,
  108-122`. El bloque doc del header (líneas 14-16) ya documenta las env vars.

**Tu scope es solo M3 + M4 + M5 + M6** (los milestones del plan original que
quedan). El plan sirve de spec para esos 4 milestones — leelo entero, no de
memoria. NO toques `package.json` (pin ya hecho), `logger-init.ts` (M1+M2 ya
hechos), ni `logger.ts` (M1 ya hecho).

## Gap del plan que el orquestador encontró y tú NO tienes que resolver

`src/lib/ota-ready.ts` y `src/lib/ota-updates.ts` importan `@mks2508/better-logger`
con `import logger from '@mks2508/better-logger'` (default export). El plan no
los nombra, pero existen y el default export sigue funcionando en 0.18.3 (es un
`Proxy` lazy, verificado por el `.d.ts` del tarball). **No los toques — son
read-only, no tienen `console.*`**, verificado.

## Tu footprint

- `src/**` — archivos con `console.*` remanentes (ver tabla M3-M5 del plan +
  `TauriPlatformService.ts` que ahora SÍ está en scope porque TR-08 ya mergeó,
  ver "Scope ampliado" abajo).
- Globs lane (de `.siblings.toml`): `["src/**"]`. Cualquier archivo fuera de
  aquí es **violación de disjunción**.

## Scope ampliado — `TauriPlatformService.ts` ahora SÍ entra

El plan original lo dejaba "diferido por overlap con TR-08 sin commitear". TR-08
mergeó en `949981a "Add Vitest tests, tickmaster printer & CI updates"`. El
overlap ya no aplica — los 15 `console.*` de `TauriPlatformService.ts` se
migran con el mismo criterio que `WebPlatformService.ts` (mismo archivo espejo
del platform layer, mismo patrón `[Tag] mensaje`). Esto baja el residual
esperado de 26 a **11** (los 8 de `ErrorBoundary.tsx` exención + 1 de
`theme-utils.ts` exención + 1 de `script.js` dead file + 1 comentario en
`thermal-printer.service.ts:93`).

## Milestones a ejecutar (orden topológico)

### M3 — UI/hooks (3 archivos, 9 calls)

`src/components/PaymentModal.tsx` (2), `src/components/PWAStatus.tsx` (1),
`src/hooks/usePerformanceConfig.ts` (6). Patrón: `import {
createContextLogger } from '@/lib/logger'; const log = createContextLogger('<Scope>');`
cerca de imports. Strip prefijo `[Tag]`. Mapeo semántico (no 1:1):
`console.log` de operación de negocio → `.info()`; diagnóstico verboso →
`.debug()`; `console.warn` → `.warn()`; `console.error` → `.error()` con guard
`err instanceof Error ? err : undefined` para catch genérico. En
`usePerformanceConfig.ts` MANTÉN el guard `if (import.meta.env.DEV)` tal cual
(los 6 logs están gateados).

### M4 — Servicios datos/storage (4 archivos, 16 calls)

`src/services/data-migration.service.ts` (7), `src/services/demo-seed.service.ts`
(2), `src/services/indexeddb-storage-adapter.ts` (5, **reusa `storageLog`** de
`@/lib/logger`, NO `createContextLogger` — es EL caso de reuso explícito del
plan, ya verificado que `storageLog` está sin usar fuera del archivo que lo
define), `src/services/invoice-builder.service.ts` (2).

### M5 — Platform layer + lib utils (4 archivos + el TauriPlatformService que el plan difirió)

`src/services/platform/index.ts` (3), `src/services/platform/WebPlatformService.ts`
(19), `src/lib/onboarding-utils.ts` (1), `src/lib/setupNativeMenu.ts` (2), Y
**`src/services/platform/TauriPlatformService.ts` (15)** — este último NO está
en el plan pero entra ahora por la condición de "TR-08 ya mergeó" (ver Scope
ampliado arriba).

Para `TauriPlatformService.ts`, mismo patrón que `WebPlatformService.ts`:
`createContextLogger('TauriPlatformService')` cerca de imports, strip del
prefijo `[TauriPlatformService]`, `.debug()` para trazas informativas,
`.error()` con guard para los catch genéricos.

### M6 — Verify e2e + commit (canonical)

1. `bun run typecheck && bun run lint:fix && bun run build` — los 3 verdes
   (protocolo obligatorio CLAUDE.md). Si alguno falla, NO improvises fix —
   para, reporta `stopReason`.
2. `grep -rn 'console\.\(log\|error\|warn\|debug\|info\)' src/ | wc -l` →
   ESPERADO **11** (los 8 de `ErrorBoundary.tsx` exención + 1 `theme-utils.ts`
   exención + 1 `script.js` dead file + 1 comentario en `thermal-printer`).
   Cualquier otro número = migración incompleta.
3. Commit único en `sib/tr11-residual`. Mensaje: `feat-phase(unscoped): migrate
   console.* to better-logger context loggers (TR-11 M3-M6) [#TR-11]` (tag
   `[#TR-11]` para el hook).

## Commit convention (waxin lock 2026-08-18)

- Conventional commits, prefix `feat-phase(unscoped)`.
- **Sin co-author, sin atribución AI**, NUNCA "Claude Code" / "generated with".
- Tag `[#TR-11]` en el commit final.
- Branch: `sib/tr11-residual` (NO `main`).
- Push: **NUNCA**. Solo commit local.

## Gotcha #10 — escribe en TU worktree, no en el checkout principal

Antes del primer `Write` o `Edit`: corre `pwd && git rev-parse --show-toplevel`
y comprueba que el resultado contiene `tpv-el-haido2-tr11-residual` (o el
patrón que `siblings up` haya usado). Si estás en el repo principal, **para** y
avisa.

## Report contract (sin este file, el dispatch no cierra)

Escribe `/tmp/tr11-residual-report.md` con este schema EXACTO antes de
terminar:

```yaml
# /tmp/tr11-residual-report.md
filesChanged: <git diff --stat master..HEAD -- src/>
verifyPassed:
  - <"bun run typecheck": exit 0 / stderr>
  - <"bun run lint:fix": exit 0 / output>
  - <"bun run build": exit 0 / output>
  - <"grep console.* src/ | wc -l": número exacto, esperado 11>
verifyOutput: <raw output crítico de los 4 verify>
introducedWorkarounds: []   # vacío
architecturalConcerns: []   # flag, no ocultes
stopReason: null
residualConsoleMatches: <lista exacta de los 11 matches residuales con archivo:línea y razón>
commitHash: <hash del commit único en sib/tr11-residual>
```

## Disciplina

- **NO toques** `package.json` (pin ya hecho en main, NO modificar).
- **NO toques** `src/lib/logger.ts` ni `src/lib/logger-init.ts` (M1+M2 ya
  mergeados).
- **NO toques** `src/components/ErrorBoundary.tsx:64-114` (intercept dev-only).
- **NO toques** `src/lib/theme-utils.ts:54-79` (string-template pre-module-graph).
- **NO toques** `src/assets/utils/script.js` (dead file, fuera de scope).
- **NO borres ni debilites** los verify checks del plan (gotcha #11).
- **NO** verifiques tu propio guard con un espécimen simulado (gotcha #13) — el
  `bun run build` y `bun run typecheck` son contra el código real.
