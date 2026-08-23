# ADR r15 — v0.2.0 M6 Extendido: Polish + Blockers Cohesionados

**Status**: Locked
**Date**: 2026-08-23
**Author**: meta-orchestrator
**Scope**: M6 — extiende scope original (polish rubric + AppImage) con bloqueantes layout-integrity
**Locked by**: waxin vía AskUserQuestion (4 opciones, opción B seleccionada)

---

## 1. Contexto

### 1.1 Estado pre-M6

- M1 ✅ done — design tokens + CVA Button + Animations
- M2 ✅ done — splash + auth (Onboarding/Login)
- M3 ✅ done — sidebar + nav (mobile bottom nav)
- M4 ✅ done — orders flow (POS hot-path)
- M5 ✅ done — resto sections polish (Home/Customers/AEAT/History/Settings/AuditLog + Login)

### 1.2 Audit post-M5 (4 auditores layout-integrity)

waxin lock: "para las guidelines lanza mas executors" — dispatch 4 auditores read-only
en paralelo, cada uno audita 3 reglas de `/Users/mks/dotfiles/guidelines/layout-integrity.md`,
con positive controls obligatorios (waxin lock 2026-08-18). Reportes persistidos en
`/tmp/v0.2.0-layout-audit-{1,2,3,4}.md`.

**Síntesis del audit** (4 auditores, 12 reglas, todos reportes firmados):

| Regla | Severidad | Bloquea release? | Auditor |
|---|---|---|---|
| 1 (overflow blindado) | HIGH ×2 | SÍ | #1 |
| 2 (z-index scale) | HIGH ×1 (z-9999) + medium ×5 (z-tier mismatch) | NO | #2 |
| 3 (isolate en backdrop-blur) | HIGH ×2 (Login+LicenseSplash) + medium ×14 | NO | #2 |
| 4 (flex shrink) | medium ×3 (OrderTable, PaymentModal, ConfirmPayment) | NO | #1 |
| 5 (responsive ≥320px) | verde | NO | #4 |
| 6 (truncation strategy) | HIGH ×2 (OrderHistory, Customers) | SÍ | #1 |
| 7 (hit areas ≥40×40) | HIGH ×2 (ModeToggleSolid) + medium ×N | borderline | #3 |
| 8 (padding scale 4/8) | verde | NO | #3 |
| 9 (NO transition-all) | HIGH ×44 | SÍ | #3 |
| 10 (semantic HTML) | medium ×10 | NO | #4 |
| 11 (glass anti-pattern) | HIGH ×1 (Home stat-cards) | NO | #2 |
| 12 (popovers anchored) | verde | NO | #4 |

**Bloqueantes reales** (auditores #1 + #3 unanimous, todos HIGH):

1. **R1-1**: `src/components/Sections/Home.tsx:923` — `flex flex-col h-full overflow-hidden`
   sin `min-h-0`. Dashboard principal — con 50+ órdenes filtradas, scroll puede fallar y
   empujar al header/footer.
2. **R1-2**: `src/components/Sections/Customers.tsx:138` — `<div class="flex flex-col h-full">`
   root sin `min-h-0`. Tabla clientes en flujo de facturación AEAT — sin scroll correcto,
   no se puede operar.
3. **R6-1**: `src/components/Sections/OrderHistory.tsx` — 0 truncate + 0 min-w-0 en filas.
   Items con nombres largos (`Coca-Cola Zero Azúcar 330ml Lata`) rompen el layout. Lista diaria.
5. **R6-2**: `src/components/Sections/Customers.tsx` — 0 truncate + 0 min-w-0. Emails
   40+ chars / NIFs largos rompen grid. Uso crítico en facturas AEAT.
6. **R9**: 44 `transition-all` en `src/components/` cuando `src/lib/design-tokens.ts:381`
   declara la regla BANNED. **El design system se contradice** — incoherencia sistémica,
   top offender Home.tsx (6 ocurrencias).

### 1.3 Pre-existing scope M6

M6 original (locked en TR v0.2.0 inicial):
- Polish rubric `/make-interfaces-feel-better` (16 principios: border radius concéntrico,
  optical alignment, shadows vs borders, tabular-nums, text-wrap balance, antialiased,
  scale-on-press 0.96, hit area 40×40, NO transition-all, will-change disciplinado,
  focus-visible, color contrast AA, prefers-reduced-motion, safe-area, loading states,
  interruptible animations)
- AppImage icon fix (añadir 512x512 + category + publisher + descriptions)

### 1.4 Trade-off planteado

Waxin tenía 4 opciones via AskUserQuestion. La seleccionada es **B (M6 extendido)** vs las
alternativas:

| Opción | Pros | Contras |
|---|---|---|
| **A** M5.5 surgical → M6 normal | M6 parte de base sólida | 1 milestone extra, 2 dispatches, M6 tiene que RE-auditear |
| **B** ← **LOCKED** M6 = polish + blockers | 1 milestone vs 2, cohesión total | M6 grande, si algo falla saber qué sin walk-back |
| C cerrar M5 → M6 normal → release con gaps | tag rápido | deshonesto, contradice "release-ready" claims M1-M5 |
| D mismo que C + issues gh separados | tracking visible | mismo riesgo de sustancia que C |

Waxin eligió B. Razón implícita: trade-off entre overhead de coordinación (A) y cohesión
de milestone (B). B maximiza la cohesión: 1 milestone = "todo lo que falta para
release-ready real" en una sola ejecución.

---

## 2. Decisión

**M6 extiende su scope para incluir los 5 hallazgos HIGH bloqueantes + urgent
recomendados por auditores.** El scope total de M6 queda:

### 2.1 Layout-integrity blockers (P0 — bloqueantes)

| ID | Regla | Hallazgo | Fix |
|---|---|---|---|
| B1 | R1 | Home.tsx:923 `h-full` sin `min-h-0` | `min-h-0` en body intermedio (L932) + `shrink-0` en HomeHeader |
| B2 | R1 | Customers.tsx:138 `h-full` sin `min-h-0` | `min-h-0` root + body tabla |
| B3 | R6 | OrderHistory.tsx sin truncate/min-w-0 | `flex-1 min-w-0` + `<span class="truncate">` en item.name y AnimatedNumber |
| B4 | R6 | Customers.tsx sin truncate/min-w-0 | mismo patrón en celdas NIF/email/nombre |
| B5 | R9 | 44 `transition-all` | Mechanical batch replacement con token específico (`transition-[transform,box-shadow,color,opacity]`) auditado por uso |

### 2.2 Layout-integrity urgent (P1 — mejora real)

| ID | Regla | Hallazgo | Fix |
|---|---|---|---|
| U1 | R7 | ModeToggleSolid 36×36 (falla regla) | `h-11 w-11` (44×44) |
| U2 | R10 | 9 icon-only buttons sin `aria-label` | añadir `aria-label` descriptivo (1-2 líneas por archivo) |
| U3 | R11 | Home stat-cards glass sobre body denso (4 ocurrencias) | quitar `backdrop-blur-sm` → `bg-card` plano |
| U4 | R3 | 16 archivos backdrop-blur sin `isolate` | añadir `isolate` al wrapper — `GlassContainer` sienta precedente |
| U5 | R2 | ScreenshotOverlay `z-[9999]` | `z-55` (toast/snackbar tier) |
| U6 | stale | `ProductCard.tsx.bak` | `rm src/components/ui/ProductCard.tsx.bak` |
| U7 | R10 | 2 Card/Row onClick sin `role="button"` | `role="button" tabindex="0"` + `onKeyDown` Enter/Space |

### 2.3 Polish rubric (P2 — desktop-feel polish)

16 principios de `/make-interfaces-feel-better` (lock pre-existente en M6 original):
border radius concéntrico, optical alignment, shadows vs borders, tabular-nums,
text-wrap balance, antialiased, scale-on-press 0.96, hit areas ≥40×40 (parcialmente
cubierto por U1), transition specific (cubierto por B5), will-change disciplinado,
focus-visible, color contrast AA, prefers-reduced-motion, safe-area, loading states,
interruptible animations.

### 2.4 AppImage icon fix (P2 — Linux bundle hygiene)

- `src-tauri/icons/square-icon.png` (512x512) ya existe, NO está en array bundle
- `category` (`Office` o `Business`), `publisher` (mks2508), `shortDescription`,
  `longDescription`

### 2.5 NO dentro de M6 (perímetro)

- ❌ Refactor OP_META a `lib/audit-meta.ts` (deferred a 0.2.1)
- ❌ SettingsPanel 11 tabs consolidation (per waxin lock)
- ❌ Lint pre-existentes cleanup (10 errors no relacionados)
- ❌ AuditLog mock data refactor (`generateDemoLogs()` L600-883)
- ❌ CVA variants infrautilizados (infraestructura ya está, M6 NO aumenta uso)
- ❌ Tests (perimeter post-prod, deferred a 0.7.0)

---

## 3. Estimación (LLM executor divisor 8x per `effort-estimation.md`)

| Bucket | LOC tocado | Tiempo humano | Tiempo LLM |
|---|---|---|---|
| B1-B4 (4 P0 surgical overflow/truncate) | ~25 LOC | ~2h | ~15-20min |
| B5 (44 transition-all mechanical) | ~60 LOC | ~3h | ~20-30min |
| U1-U7 (urgent misc) | ~50 LOC | ~1.5h | ~10-15min |
| Polish rubric 16 principios (revisión parcial — varios ya cubiertos por B5/U1/U4) | scattered | ~3h | ~20-30min |
| AppImage icon fix (config only) | tauri.conf.json | ~10min | ~5min |
| **Total M6 extendido** | ~135 LOC + config | **~10h humano** | **~75-100min LLM** |

Más overhead de dispatch (5min) + verify (5-10min) = **~90min wall clock** para M6 completo.

---

## 4. Acceptance criteria (M6 close criterion)

1. **Build verde**: `bun run typecheck` 0 errors, `bun run build` success
2. **Layout-integrity blockers**: 0 matches de R1-1/R1-2/R6-1/R6-2/R9 con positive controls
   ejecutados (grep de cada uno + verificación visual con datos sintéticos largos)
3. **Layout-integrity urgent**: 0 matches de U1/U2/U3/U4/U5/U7 (U6 = delete file)
4. **Polish rubric**: 12/16 principios cumplidos (los 4 restantes son post-prod por diseño)
5. **AppImage icon**: `bun run tauri build` produce AppImage con icono visible en dock
   pre-launch + `category`/`publisher` poblados en `tauri.conf.json`
6. **Audit log M6** persistido en `/tmp/v0.2.0-M6-exec-report.md`
7. **Independent verify**: meta-orchestrator verifica con positive controls propios
   (NO confiar ciegamente en report del executor)
8. **Commit OK**: padre hace commit al finalizar verify, NO push (per waxin lock +
   execution gate)

---

## 5. Estado de docs derivadas

- `docs/roadmap.model.yml` — M6 title + docs fields actualizados via `axon set-node`
- `docs/ROADMAP.md` regenerado (147 líneas, sync verificado)
- `/tmp/v0.2.0-M6-handoff.md` reescrito con scope extendido (meta-orchestrator pre-execution spec)
- `docs/progress-log.md` entry M5 done + M6 re-scope (post-dispatch)

---

## 6. Referencias cruzadas

- Audit reports: `/tmp/v0.2.0-layout-audit-{1,2,3,4}.md`
- M5 exec report: `/tmp/v0.2.0-M5-exec-report.md`
- M6 handoff (nuevo): `/tmp/v0.2.0-M6-handoff.md`
- Guidelines skill: `/Users/mks/dotfiles/guidelines/layout-integrity.md` (12 reglas)
- Polish rubric: `/Users/mks/.claude/commands/make-interfaces-feel-better.md` (16 principios)
- ADR precedente: `r14-ui-overhaul-rest-sections-2026-08-23.md`

---

## 7. Riesgo residual post-M6

Bloqueantes 100% cubiertos por scope M6 extendido. Riesgo residual conocido:

- **R7 audit incompleto**: solo ModeToggleSolid tiene 36×36 confirmado; el resto de los
  154 buttons / 45 inputs sin auditoría archivo-por-archivo. Se acepta: positive control
  falla por diseño (gap histórico), pero ningún botón crítico adicional sale del 40×40
  per auditoría spot-check.
- **R3 isolate preventivo**: los `backdrop-blur` actuales tienen comportamiento
  determinístico (ningún parent usa `transform`/`filter`/`mix-blend`). El fix es
  preventivo contra regresiones futuras.

Triage post-v0.2.0:

- R7 audit completo (sweep todos los buttons/inputs) → 0.2.1 o 0.7.0 con tests
- R3 preventiva extendida a Onboarding steps → ya cubierto en scope U4