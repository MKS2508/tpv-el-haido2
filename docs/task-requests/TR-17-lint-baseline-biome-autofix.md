# TR-17 — Limpiar lint baseline (33 errores biome pre-existentes post-TR-11)

**Ticket**: nuevo
**Phase**: sin numerar (candidato `track/production-polish` 0.6.0, "hardening & monitoring")
**Priority**: medium (calidad, no bloquea producción — app corre fine)
**Estimated**: 30-45m humano (biome --write + verify), ~10 min LLM

## Contexto — por qué esto existe separado

Tras mergear `5979f91` (TR-11 M3-M6 residual) el `track/observability` queda cerrado
(U2 pass). Pero la verificación independiente del merge detectó que **`bun run lint` en
`main` falla con 33 errores baseline pre-existentes** que NO fueron introducidos por TR-11:

- 0 errores son en `src/services/platform/TauriPlatformService.ts` (verificado con
  `bun run lint 2>&1 | grep TauriPlatformService` → vacío).
- 33 errores son pre-existentes en `main` antes del merge (la lane TR-11 lo verificó
  con stash: stash de sus cambios, lint sigue mostrando el mismo baseline).
- Distribución confirmada: 14+ archivos en `src/components/` (no `src/services/` ni
  `src/lib/` ni `src/hooks/`).

Regla de cambios quirúrgicos del CLAUDE.md + regla de disjunción de lanes del
`sibling-dispatch`: TR-11 NO absorbió los biome auto-fixes (habrían sido 17 archivos
adicionales de format/organizeImports sin nada que ver con console.*). Quedó como
recordatorio explícito en el `stopReason` del report.

## Estado actual del baseline (verificado 2026-08-22)

```bash
$ bun run lint
Found 33 errors. Found 21 warnings. Found 2 infos.
# Archivos代表性的:
# - src/components/AEATSettings.tsx       (format + noUnusedImports)
# - src/components/AppSplashScreen.tsx    (useIterableCallbackReturn)
# - src/components/DemoDataLoader.tsx     (organizeImports)
# - src/components/InvoiceStatusBadge.tsx (useOptionalChain)
# - src/components/LicenseSplashScreen.tsx (organizeImports)
# - src/components/LicenseStatus.tsx       (format + organizeImports)
# - src/components/OrderPanel.tsx          (format + noUnusedImports)
# - src/components/OrderTable.tsx          (format)
# - src/components/Sections/AuditLog.tsx   (noStaticElementInteractions, useKeyWithClickEvents)
# - src/components/Sections/Home.tsx       (noExplicitAny)
# - src/components/Sections/Login.tsx      (organizeImports)
# - src/components/Sections/SectionHeader.tsx (noExplicitAny)
# - src/components/SideBar.tsx             (format + noUnusedVariables)
# - src/components/ui/state-views.tsx      (noSvgWithoutTitle, format)
# - ... y más archivos listados en `bun run lint`
```

## Reglas biome involucradas (todas auto-fixables excepto las semánticas)

| Regla | Auto-fix? | Tipo |
|---|---|---|
| `format` (formatter) | ✅ sí | Cosmético |
| `organizeImports` | ✅ sí | Cosmético |
| `noUnusedImports` | ✅ sí | Cosmético (borra el import) |
| `noUnusedVariables` | ✅ sí | Cosmético (borra la var) |
| `useIterableCallbackReturn` | ❌ no | Semántica — requiere fix manual |
| `useOptionalChain` | ❌ no | Semántica — requiere fix manual |
| `noStaticElementInteractions` | ❌ no | UX/a11y — refactor recomendado |
| `useKeyWithClickEvents` | ❌ no | UX/a11y — añadir keydown handler |
| `noExplicitAny` | ❌ no | Tipo — requiere narrowing |
| `noSvgWithoutTitle` | ❌ no | a11y — añadir `<title>` |

**Mitigación de blast radius**: el 90% de los errores son auto-fixables con
`bun run lint:fix`. Los errores semánticos (~10%, estimado 3-5 archivos) requieren
intervención manual — listados individualmente en el acceptance del plan.

## Objetivo

1. Correr `bun run lint:fix` para resolver los errores auto-fixables (format,
   organizeImports, noUnusedImports, noUnusedVariables).
2. Listar los errores semánticos residuales (useIterableCallbackReturn,
   useOptionalChain, noStaticElementInteractions, useKeyWithClickEvents,
   noExplicitAny, noSvgWithoutTitle) — uno por archivo y línea.
3. Fix manual SOLO de los errores semánticos que sean trivialmente seguros
   (1-2 líneas, sin cambio de comportamiento). Diff de cada uno justificado.
4. Si un error semántico requiere refactor >5 líneas o cambio de comportamiento,
   abrir ticket separado (no scope creep).
5. Verificación end-to-end del protocolo CLAUDE.md: typecheck + lint:fix + build
   los 3 verdes.

## Constraints

- **NO tocar lógica de negocio** — solo format, imports, tipos triviales, fixes
  a11y/UX si son 1-2 líneas sin cambio de comportamiento observable.
- **NO añadir suppressions** (`// biome-ignore`) sin justificación documentada —
  el default es arreglar la causa, no silenciar el linter.
- **NO tocar archivos fuera de los listados en el baseline** — si `bun run lint`
  reporta un archivo nuevo, flag y abrir sub-TR.
- **NO absorber fixes semánticos grandes** (>5 líneas o cambio de comportamiento)
  en este TR — abrir sub-tickets separados para que el decomposer los evalúe
  individualmente.
- **NO** regenerar `bun.lock`/`package.json` (side-effect observado en sesiones
  previas — `bun install` puede bumpear minor versions dentro del caret sin OK
  explícito). Si lockfile cambia durante `bun run lint:fix`, reversar.

## Acceptance

- [ ] `bun run lint:fix` corre limpio (exit 0)
- [ ] `bun run lint` después del fix reporta **0 errores** (o solo errores
  semánticos residuales que requieren sub-tickets separados, cada uno con su
  rationale)
- [ ] `bun run typecheck && bun run lint:fix && bun run build` los 3 verdes
  (protocolo CLAUDE.md)
- [ ] Si hubo cambios a `bun.lock`/`package.json` durante el proceso, reversados
  con `git checkout HEAD --`
- [ ] Diff atómico (preferentemente un solo commit con mensaje conventional
  `fix(lint): biome autofix baseline + manual semantic fixes [#TR-17]`)
- [ ] Report al orquestador con: archivos tocados, errores auto-fixeados vs
  manuales, sub-tickets abiertos para residuales semánticos

## Suggested executor agent

`task-decomposer` primero (vale un `.plan.md` porque la decisión de qué errores
semánticos son trivialmente seguros vs requieren sub-ticket es juicio no
mecánico) → `task-executor` para el autofix + los fixes manuales seguros.

Alternativa rápida si el decomposer ve que todos los errores son auto-fixables:
skip decomposer, executor directo con `bun run lint:fix && bun run lint` y
verificar que llega a 0.

## Notas operativas

- Corre independiente de TR-11/TR-14. No tiene prerequisites bloqueantes.
- Si TR-16 u otro TR se ejecuta antes que este y vuelve a ensuciar el lint
  baseline, re-medir antes de empezar.
- El modelo `track/observability` queda cerrado (U2 pass) — este TR NO es
  pre-requisito de eso. Es trabajo de calidad separado.
- Doc sync (roadmap.model.yml + ROADMAP.md + progress-log) en la misma pasada
  que el cierre — abrir nodo `track/lint-baseline` o agregar milestone al
  `track/production-polish` (decisión del decomposer).
