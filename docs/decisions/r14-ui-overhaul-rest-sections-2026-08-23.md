# ADR r14 — v0.2.0 UI/UX Overhaul: Rest Sections Polish (M5)

**Status**: Locked
**Date**: 2026-08-23
**Author**: meta-orchestrator (executor session)
**Scope**: M5 — final polish of remaining sections + Login, eliminate last legacy CSS

**Lane**: `track/v0.2.0-ui-overhaul/m5-rest-sections`

---

## 1. Contexto

M1-M4 sentaron las bases del design system v0.2.0 (tokens semánticos + CVA Button +
Animations + POS hot-path). Quedaba el polish visual de las 7 secciones restantes
(Home + Products + Customers + AEATInvoices + OrderHistory + SettingsPanel + AuditLog)
+ Login (552 LOC), totalizando **6,472 LOC**.

Único CSS legacy restante: `src/styles/optimized-login.css` (88 LOC) — bloqueador para
cerrar la saga de migración a Tailwind tokens.

### 1.1 Audit pre-M5

- **Home.tsx** (996 LOC): `text-4xl font-black` outlier (L90), gradient text deco
  (`bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent
  animate-gradient`) — efecto "show off" deco. Tokens ganan a creatividad decorativa.
- **AuditLog.tsx** (1414 LOC): 24 hardcoded hex colors (`#60a5fa`, `#34d399`,
  `#f87171`, `#a78bfa`, etc.) + ~50 `rgba(...)` strings en `OP_META` y
  `CATEGORY_COLOR`. Rompe theming global.
- **SettingsPanel.tsx** (1173 LOC, 11 tabs): `text-[10px]` outliers en storage mode
  panel.
- **AEATInvoices.tsx** (573 LOC): `text-green-600`, `text-yellow-600`, `text-red-600`
  hardcoded — deben ser tokens semánticos.
- **Customers.tsx** (413 LOC): `bg-green-100`/`text-green-700`/`dark:bg-green-900/30`
  hardcoded palette — debe ser `bg-success/15` + `text-success`.
- **Products.tsx** (523 LOC): `bg-destructive/10` + `border-destructive/30` + `class="border-red-500"`
  hardcoded — debe usar tokens.
- **Login.tsx** (552 LOC): depende de `optimized-login.css` legacy con clases
  `.user-card`, `.login-container`, `.avatar-ring` (no se usan todas, pero la dependencia
  bloquea delete).

### 1.2 Productos del scope M4 verificados

- Products.tsx usa `ProductCard` + `CategoryCard` con CVA wiring interno (no requiere
  `variant="product"` explícito en este archivo — es a nivel de card component).
- OrderHistory.tsx tiene **24 instancias de `AnimatedNumber`** wired (verificado).
  No se duplica trabajo de M4.

---

## 2. Decisión

### 2.1 Login.tsx polish completo + delete `optimized-login.css`

Migrar las clases legacy a Tailwind utilities + tokens semánticos:

```tsx
// ANTES (.user-card de optimized-login.css):
<button class="user-card flex flex-col items-center cursor-pointer p-4 rounded-2xl ...">

// DESPUÉS (Tailwind utilities inline, sin CSS legacy):
<button class="user-card group flex flex-col items-center cursor-pointer p-4 rounded-2xl bg-transparent border-none
  will-change-transform backface-hidden touch-manipulation
  transition-[transform,background-color] duration-200 ease-out
  hover:scale-[1.02] hover:bg-white/30 dark:hover:bg-gray-800/30
  active:scale-[0.98] active:duration-100
  focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
  motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100
  motion-reduce:hover:bg-white/10 dark:motion-reduce:hover:bg-gray-800/10">
```

Reemplazos de colores legacy:
- `text-gray-900 dark:text-white` → `text-foreground` (8 sitios)
- `text-gray-500 dark:text-gray-400` → `text-muted-foreground`
- `text-gray-700 dark:text-gray-300` → `text-foreground/80`
- `border-gray-300/50 dark:border-gray-600/50` → `border border-border`
- `border-gray-400/50 dark:border-gray-600/50` → `border-2 border-border`
- `text-[10px]` outlier → `text-xs` o `text-sm`

`src/main.tsx`: removido `import './styles/optimized-login.css'`.

### 2.2 Home.tsx polish

- **Type-scale**: `text-4xl font-black` (L90) → `text-3xl font-bold text-foreground`.
  `font-black` (900) → `font-bold` (700). Consistencia con StatCard.
- **Gradient text REMOVED**: bloque `bg-gradient-to-r from-primary via-accent to-primary
  bg-clip-text text-transparent animate-gradient` + `bg-[length:300%_100%]` eliminados.
  Waxin lock: "tokens ganan a creatividad decorativa".
- **StatCard `font-black`**: → `font-bold text-card-foreground`.
- **Mobile-only `text-[10px]` outlier en StatCard title**: removido, queda `text-xs`
  uniforme (mobile y desktop).
- Charts siguen usando `var(--chart-N)` tokens — mantener.

### 2.3 Customers.tsx polish

- Reemplazada badge `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
  → `bg-success/15 text-success` (estado activo).
- Reemplazada badge `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
  → `bg-destructive/15 text-destructive` (estado inactivo).

### 2.4 AEATInvoices.tsx polish

- `text-green-600` → `text-success` (Aceptadas).
- `text-yellow-600` → `text-warning` (Pendientes).
- `text-red-600` → `text-destructive` (Rechazadas).

### 2.5 OrderHistory.tsx polish

Sin cambios estructurales. M4 wired 24 instancias de `<AnimatedNumber>` con suffix ` €`
y prefix ` ` para "1.234,56 €". Verificado que sigue verde, no hay regresión.

### 2.6 SettingsPanel.tsx polish

- 3 ocurrencias de `text-[10px]` en storage mode panel (SQLite / HTTP API / IndexedDB)
  → `text-xs`. Layout intacto.
- 11 tabs sin consolidar (fuera de scope — scope creep deferred a M6+).

### 2.7 AuditLog.tsx polish — colores hardcoded → tokens themeable

**Estrategia**: introducir CSS custom properties en el `<style>` block existente de
`.audit-root` que mapean a OKLCH values themeables. `OP_META`, `CATEGORY_COLOR`, e
inline `style={{ color: ... }}` referencian estas variables.

```css
:root .audit-root {
  /* Operation category palette — themeable via tokens.css semantics. */
  --audit-op-auth:           oklch(0.72 0.16 250);
  --audit-op-auth-bg:        oklch(0.72 0.16 250 / 0.12);
  --audit-op-auth-border:    oklch(0.72 0.16 250 / 0.35);
  --audit-op-auth-soft:      oklch(0.80 0.10 250);
  --audit-op-auth-soft-bg:   oklch(0.80 0.10 250 / 0.10);
  --audit-op-auth-soft-border: oklch(0.80 0.10 250 / 0.30);
  /* ... (product, category, order, success, warning, danger, payment,
   *      table, user, license, muted + soft variants) */
}
```

24 hex colors + ~50 rgba strings → `var(--audit-op-*)` references.

#### AuditLog colors migration table

| Old (hex/rgba) | New (token) | Uso |
|---|---|---|
| `#60a5fa` / `rgba(96,165,250,*)` | `var(--audit-op-auth)` | login |
| `#93c5fd` / `rgba(147,197,253,*)` | `var(--audit-op-auth-soft)` | logout |
| `#34d399` / `rgba(52,211,153,*)` | `var(--audit-op-product)` | product_create |
| `#6ee7b7` / `rgba(110,231,183,*)` | `var(--audit-op-product-soft)` | product_update |
| `#f87171` / `rgba(248,113,113,*)` | `var(--audit-op-danger)` | deletes, errors, dot |
| `#2dd4bf` / `rgba(45,212,191,*)` | `var(--audit-op-category)` | category_create |
| `#5eead4` / `rgba(94,234,212,*)` | `var(--audit-op-category-soft)` | category_update |
| `#fbbf24` / `rgba(251,191,36,*)` | `var(--audit-op-order)` | order_create |
| `#fde68a` / `rgba(253,230,138,*)` | `var(--audit-op-order-soft)` | order_update |
| `#4ade80` / `rgba(74,222,128,*)` | `var(--audit-op-success)` | order_complete, success dot |
| `#fb923c` / `rgba(251,146,60,*)` | `var(--audit-op-warning)` | order_cancel, data_export |
| `#fdba74` / `rgba(253,186,116,*)` | `var(--audit-op-warning-soft)` | data_import |
| `#a78bfa` / `rgba(167,139,250,*)` | `var(--audit-op-payment)` | payment_process, paymentMethod label |
| `#38bdf8` / `rgba(56,189,248,*)` | `var(--audit-op-table)` | table_assign |
| `#7dd3fc` / `rgba(125,211,252,*)` | `var(--audit-op-table-soft)` | table_clear |
| `#f472b6` / `rgba(244,114,182,*)` | `var(--audit-op-user)` | user_create |
| `#f9a8d4` / `rgba(249,168,212,*)` | `var(--audit-op-user-soft)` | user_update |
| `#94a3b8` / `rgba(148,163,184,*)` | `var(--audit-op-muted)` | settings_change, default |
| `#818cf8` / `rgba(129,140,248,*)` | `var(--audit-op-license)` | license_activate, header badge |

**Type-scale outliers**: 37 ocurrencias de `text-[9px|10px|11px]` reemplazadas
masivamente con `perl -i -pe` → `text-xs` (12px). Compensa densidad terminal-style
subiendo ligeramente el tamaño — close criterion 0 outliers estricto.

### 2.8 Products.tsx polish

- `bg-destructive/10 border border-destructive/30` → `hover:bg-muted/50 transition-colors`
  (categoría checkbox row). Mantiene feedback visual sin hardcoded destructive.
- `class="border-red-500"` redundante en Checkbox → removido (el componente ya tiene
  styling via `Checkbox` component).

---

## 3. Trade-offs

### 3.1 AuditLog: density vs tokens

**Decisión**: reemplazar 37 outliers `text-[9px|10px|11px]` con `text-xs` (12px).

**Riesgo**: el componente es terminal-style (densidad alta). Subir a 12px reduce
esa densidad ligeramente. La escencia (monospace, dense rows, OKLCH accent borders)
se mantiene — sigue siendo legible como log de auditoría.

**Alternativa rechazada**: mantener `text-[Npx]` y modificar el close criterion para
excluir AuditLog. Justificación: el criterio mide type-scale outliers globalmente,
excluir un componente deja la puerta abierta a regresión futura. Mejor matar los
outliers ahora.

### 3.2 AuditLog 1414 LOC — polish visual SOLAMENTE

**Decisión**: NO rewrite, NO feature additions. Solo colores + type-scale + token
migration. La deuda técnica (lógica de filtros, demo data generator, mock log
generation ~280 LOC) queda para 0.2.x o M7.x.

**Justificación**: scope creep. Polish visual era el objetivo M5 lockeado. Refactor
de AuditLog requiere tests, lo cual está deferred a 0.7.0.

### 3.3 SettingsPanel 11 tabs — sin consolidar

**Decisión**: NO consolidar tabs. Solo polish de type-scale.

**Justificación**: scope creep explícitamente fuera de M5 (waxin lock). Consolidar
tabs requiere decidir modelado de features (qué se queda, qué se mueve, qué se
depreca) — mejor en un milestone dedicado con debate de UX.

### 3.4 NewOrder.tsx — outlier fix oportunista

**Decisión**: 1 outlier `text-[10px]` reemplazado con `text-xs`.

**Justificación**: NewOrder está fuera del scope M5 lockeado pero la métrica
close-criterion cubre todos los `Sections/*.tsx`. Mantener consistencia.

---

## 4. Verificación

```bash
cd "/Volumes/KODAK1TB/REPOS y PROYECTOS/tauri/tpv-el-haido2"

# 1. Typecheck + Build
bun run typecheck   # ✓ verde
bun run build       # ✓ verde (21.95s)

# 2. Greps close criterion:
ls src/styles/optimized-login.css       # ✓ No such file
grep -rn "optimized-login.css" src/     # ✓ 0 matches
grep -E 'text-\[(9|10|11|13)px\]' src/components/Sections/*.tsx  # ✓ 0 matches
grep -E "#[0-9a-f]{6}" src/components/Sections/AuditLog.tsx    # ✓ 0 matches
grep "AnimatedNumber" src/components/Sections/OrderHistory.tsx # ✓ 24 matches (M4 wired)
grep -E "bg-clip-text|animate-gradient|from-primary via-accent" src/components/Sections/Home.tsx  # ✓ 0 matches

# 3. Lint
bun run lint  # ✗ 10 pre-existing errors (aria-label en LoadingSpinner, error: any en
              #    useScreenshot, etc.) — NO introducidos por M5. Fuera de scope.
```

**Build green**: sí. Typecheck verde. Lint con errores pre-existentes (no regresión).

---

## 5. Lock

**Locked by**: waxin 2026-08-23 (scope original)
**Decisión lockeada por**: executor session 2026-08-23 (implementación)
**M5 close criterion**: ✅ todos los puntos verdes.

### 5.1 Files modificados

| File | LOC delta | Cambio |
|---|---|---|
| `src/components/Sections/Login.tsx` | 552 → 552 (~0) | Tokens semánticos + removal user-card CSS dependency |
| `src/components/Sections/Home.tsx` | 996 → 991 (-5) | Gradient text removed, font-black → font-bold |
| `src/components/Sections/Customers.tsx` | 413 → 413 (~0) | Success/destructive tokens |
| `src/components/Sections/AEATInvoices.tsx` | 573 → 573 (~0) | green/yellow/red → semantic |
| `src/components/Sections/OrderHistory.tsx` | — | Sin cambios (M4 verified) |
| `src/components/Sections/SettingsPanel.tsx` | 1173 → 1173 (~0) | 3 × text-[10px] → text-xs |
| `src/components/Sections/AuditLog.tsx` | 1414 → 1448 (+34) | OP_META CSS vars + palette additions |
| `src/components/Sections/Products.tsx` | 523 → 522 (-1) | Removed redundant border-red-500, destructive → hover muted |
| `src/components/Sections/NewOrder.tsx` | 529 → 529 (~0) | 1 × text-[10px] → text-xs (oportunistic) |
| `src/main.tsx` | — | Removido `optimized-login.css` import |
| `src/styles/optimized-login.css` | **DELETED** (-88 LOC) | — |

**LOC neto**: +~28 LOC (AuditLog palette additions + ADR), -88 LOC (CSS deleted).

### 5.2 Archivos nuevos

- `docs/decisions/r14-ui-overhaul-rest-sections-2026-08-23.md` (este archivo).

---

## 6. Known issues / deferred

### 6.1 AuditLog deuda técnica (~280 LOC mock data + filters)

- `generateDemoLogs()` en L600-883 — hardcoded mock data para Kit Digital demo.
  Debería estar en `mocks/` o detrás de un flag `IS_DEMO`.
- Lógica de filtros dispersa en `createMemo` (L927-946). Migrar a custom hook
  `useAuditFilters()`.
- OP_META inline en el archivo — mejor en `lib/audit-meta.ts` para reutilización
  desde tests / other consumers.

**DEFER**: a 0.2.x o M7.x. No bloquea M5.

### 6.2 SettingsPanel 11 tabs overwhelming

- Tabs actuales: `general`, `appearance`, `users`, `printing`, `pos`, `verifactu`,
  `license`, `audit`, `security`, `notifications`, `about` (11).
- Posible agrupación: General (general+appearance), Commerce (pos+printing),
  Compliance (verifactu+audit+license), Security (security+users+notifications),
  About.
- Requiere debate UX + decisión de qué features se mantienen/deprecan.

**DEFER**: a milestone dedicado (M6 o más).

### 6.3 Lint errors pre-existentes

10 errores de lint pre-existen en `LoadingSpinner.tsx` (aria-label sin role),
`useScreenshot.ts` (`error: any`), etc. NO introducidos por este milestone.

**DEFER**: cleanup global post-v0.2.0.

---

## 7. Referencias

- Handoff: `/tmp/v0.2.0-M5-handoff.md`
- TR: `docs/task-requests/TR-v0.2.0-ui-overhaul.md` (M5 section)
- M1 ADR: `docs/decisions/r10-ui-overhaul-design-tokens-2026-08-23.md`
- M2 ADR: `docs/decisions/r11-ui-overhaul-splash-auth-2026-08-23.md`
- M3 ADR: `docs/decisions/r12-ui-overhaul-sidebar-nav-2026-08-23.md`
- M4 ADR: `docs/decisions/r13-ui-overhaul-orders-flow-2026-08-23.md`
- Tokens: `src/styles/tokens.css`
- CVA: `src/lib/cva-variants.ts`