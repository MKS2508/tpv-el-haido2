# /tmp/tr11-residual-report.md

```yaml
filesChanged: |
  src/services/platform/TauriPlatformService.ts | 33 +++++++++++++++------------
  1 file changed, 18 insertions(+), 15 deletions(-)

verifyPassed:
  - "bun run typecheck": exit 0 (tsgo --noEmit, clean)
  - "bun run lint:fix": exit 1 — PRE-EXISTING baseline failure, NOT introduced by this lane (see stopReason)
  - "bun run build": exit 0 (tsgo + vite build, 2345 modules transformed, no errors)
  - "grep -rn 'console.*' src/ | wc -l": 11 — matches expected residual exactly

verifyOutput: |
  ## typecheck
  $ bun run typecheck
  $ tsgo --noEmit
  EXIT=0

  ## lint
  $ bun run lint
  Found 31 errors. Found 21 warnings. Found 2 infos.
  error: script "lint" exited with code 1
  (verified before my changes via stash: same baseline on clean sib/tr11-residual — 0 errors attributable to TauriPlatformService.ts)

  ## build
  $ bun run build
  $ tsgo --noEmit && vite build
  vite v8.0.7 building client environment for production...
  ✓ 2345 modules transformed.
  ✓ built in 4.26s
  EXIT=0
  (warnings are unrelated pre-existing bundle-size / dynamic-import notes about @tauri-apps/plugin-process and @tauri-apps/plugin-updater, no errors)

  ## grep residual
  $ grep -rn 'console\.\(log\|error\|warn\|debug\|info\)' src/ | wc -l
  11

introducedWorkarounds: []   # vacio — la migracion es quirurgica

architecturalConcerns:
  - "createContextLogger().debug firma exige Record<string,unknown> | undefined como meta; los 2 casos de file dialog pasaban el valor crudo (string|null) como 2do arg posicional estilo console.log. Resuelto interpolando en template literal (mismo patron que el ejemplo del plan para `log.info(\`Update available: ${update.version}\`)`). Mantiene la informacion del valor sin inventar un wrapper."

stopReason: |
  null — la migracion del scope del lane esta completa y commiteada.

  ### Anomalia documentada (no bloqueante, no fix por disciplina de lane)
  El protocolo del handoff exige `bun run typecheck && bun run lint:fix && bun run build` los 3 verdes. En este branch, `bun run lint` falla en baseline con 31 errores y 21 warnings ANTES de cualquier cambio de esta lane (verificado con stash: stash de todos mis cambios, lint sigue mostrando 11 errores baseline que escalan a 31 cuando biome aplica auto-fix de format y organizeImports). Cero errores son en `src/services/platform/TauriPlatformService.ts` (verificado con `bun run lint 2>&1 | grep TauriPlatformService` -> vacio). Los errores son pre-existentes en:
  - src/components/AEATSettings.tsx (format + noUnusedImports)
  - src/components/AppSplashScreen.tsx (useIterableCallbackReturn)
  - src/components/DemoDataLoader.tsx (organizeImports)
  - src/components/InvoiceStatusBadge.tsx (useOptionalChain)
  - src/components/LicenseSplashScreen.tsx (organizeImports)
  - src/components/LicenseStatus.tsx (format + organizeImports)
  - src/components/OrderPanel.tsx (format + noUnusedImports)
  - src/components/OrderTable.tsx (format)
  - src/components/Sections/AuditLog.tsx (noStaticElementInteractions, useKeyWithClickEvents)
  - src/components/Sections/Home.tsx (noExplicitAny)
  - src/components/Sections/Login.tsx (organizeImports)
  - src/components/Sections/SectionHeader.tsx (noExplicitAny)
  - src/components/SideBar.tsx (format + noUnusedVariables)
  - src/components/ui/state-views.tsx (noSvgWithoutTitle, format)
  - ... y mas archivos listados en `bun run lint`

  Decision: NO incluyo los biome auto-fixes en este commit. Serian 17 archivos adicionales de format/organizeImports/noUnusedImports sin nada que ver con TR-11 (regla de cambios quirurgicos del CLAUDE.md y regla de disjuntion del lane — mi scope era `src/**` pero el TR-11 manda migrar SOLO los console.* de archivos especificos, no aplicar format global). Reportado en lugar de absorbido para que la sesion principal decida si los auto-fixes van en otro TR o commit aparte.

  Los otros 2 verify checks (typecheck, build) SI pasan limpios contra el codigo real (no specs simulados), confirmado por stash check.

residualConsoleMatches:
  - file: src/components/ErrorBoundary.tsx:67
    reason: EXENCION — monkey-patch dev-only de console.log/warn/error/info para overlay de error-report (capturedLogs.push + delegation). Intercepta TODA salida de consola para libs de terceros; migrar romperia el proposito. Guard isDev && typeof window !== 'undefined'.
  - file: src/components/ErrorBoundary.tsx:68
    reason: EXENCION — mismo contexto (intercepcion dev-only).
  - file: src/components/ErrorBoundary.tsx:69
    reason: EXENCION — mismo contexto (intercepcion dev-only).
  - file: src/components/ErrorBoundary.tsx:70
    reason: EXENCION — mismo contexto (intercepcion dev-only).
  - file: src/components/ErrorBoundary.tsx:99
    reason: EXENCION — reasignacion console.log = (...args) => { capturedLogs.push(...); originalConsole.log(...args); } dentro del mismo setup del intercept.
  - file: src/components/ErrorBoundary.tsx:103
    reason: EXENCION — reasignacion console.warn (mismo bloque de intercept).
  - file: src/components/ErrorBoundary.tsx:107
    reason: EXENCION — reasignacion console.error (mismo bloque de intercept).
  - file: src/components/ErrorBoundary.tsx:111
    reason: EXENCION — reasignacion console.info (mismo bloque de intercept).
  - file: src/lib/theme-utils.ts:75
    reason: EXENCION — console.error DENTRO del string template que retorna createAntiFlashScript() (lineas 54-79). Se inyecta como <script> inline crudo pre-module-graph (anti-FOUC). El logger no puede importarse en ese contexto de ejecucion. Ademas createAntiFlashScript tiene 0 callers — dead export.
  - file: src/assets/utils/script.js:226
    reason: EXENCION — dead file no importado por nada en src/ o index.html. Playground gsap+tweakpane via skypack.dev, fuera del bundle Vite. Gap para limpieza futura (borrar o documentar proposito), fuera de scope quirurgico.
  - file: src/services/thermal-printer.service.ts:93
    reason: NO ES LLAMADA REAL — comentario `// servicio viejo (\`console.log(...)\`) NO se ...`. Matchea el grep pero es texto de comentario, no codigo ejecutable.

commitHash: 5979f91c7c5ad6b70290fc4e4b16b8e1acf3736b
```

## Resumen ejecutivo

**Scope ejecutado**: 15 `console.*` migrados a `createContextLogger('TauriPlatformService')` en `src/services/platform/TauriPlatformService.ts` (único archivo con residual dentro del scope del lane; los 11 archivos de M3-M4-M5 ya estaban mergeados en main antes de este lane).

**Mapeo semántico aplicado** (criterio del plan):
- `.log` operación de negocio (file dialog selected, update available, update installed, license cleared) → `.info()`
- `.log` diagnóstico verboso (no updates available, file path selected/saved) → `.debug()`
- `.error` catch genérico → `.error()` con guard `err instanceof Error ? err : undefined` (constraint de tipo de `createContextLogger`)

**Verificación**:
- `bun run typecheck`: PASS
- `bun run build`: PASS
- `grep -rn 'console.*' src/ | wc -l`: **11** (exacto, igual al esperado del handoff)
- `bun run lint:fix`: FAIL pre-existente (31 errores en archivos fuera del scope de TR-11, ninguno en TauriPlatformService.ts). Documentado en stopReason; biome auto-fixes NO incluidos en este commit por regla de cambios quirúrgicos del CLAUDE.md.

**Residual de 11 matches**: 8 exenciones ErrorBoundary + 1 exención theme-utils (string template) + 1 dead file script.js + 1 comentario en thermal-printer. Todos verificados manualmente con lectura completa de archivo, no solo grep.

**Commit**: `5979f91` en rama `sib/tr11-residual`. Conventional prefix `feat-phase(unscoped)`, tag `[#TR-11]` para el hook task-sync. Sin co-author, sin atribución AI. NO push (per handoff).

**Drift vs el plan original**:
- El plan asumía que M3+M4+M5 estaban pendientes. En main ya estaban mergeados (los 11 archivos del plan usan `createContextLogger`/`storageLog`). El lane real solo era el residual de TauriPlatformService.ts (15 calls) que el plan difirió por overlap con TR-08 y que el handoff amplió a scope porque TR-08 mergeó en `949981a`.

**Archivos del plan no tocados** (verificado):
- `package.json` — pin ya en main, NO modificar
- `src/lib/logger.ts` — M1 ya mergeado
- `src/lib/logger-init.ts` — M1+M2 ya mergeados
- `src/components/ErrorBoundary.tsx`, `src/lib/theme-utils.ts`, `src/assets/utils/script.js` — exenciones explícitas
- `src/services/thermal-printer.service.ts` — confirmado limpio (match es comentario)
- `src/lib/ota-ready.ts`, `src/lib/ota-updates.ts` — read-only, default export sigue funcionando en 0.18.3 (Proxy lazy)
