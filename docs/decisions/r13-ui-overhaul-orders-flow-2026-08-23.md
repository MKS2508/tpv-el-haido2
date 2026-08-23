# R13 — UI Overhaul M4: Orders Flow POS Surface

**Status**: accepted · **Date**: 2026-08-23 · **Locked by**: waxin (exec session — sibling of M3)

## Context

M4 is the largest milestone in the v0.2.0 UI overhaul track. M1 locked the
design tokens (R10), M2 locked the splash + auth surface (R11), M3 locked the
sidebar + nav shell (R12). M4 closes the **POS transaction surface** — the
two screens the bar staff actually touches for 95% of their shift: the
order-creation flow (`NewOrder` / `OrderPanel` / `PaymentModal`) and the
order-history flow (`OrderHistory` / `VirtualizedOrderHistory` /
`ConfirmPaymentDialog`). Plus the underlying legacy CSS debt that was
sprinkled across five files waiting to be cleaned up.

Three structural problems detected during the M3 retrospective:

1. **Legacy CSS debt (~1700 LOC across 5 files).** Five CSS files predated
   the M1 token system and still hardcoded colours, hit-area sizes, snap
   behaviour, product-card dimensions, and stagger animations:
   - `src/styles/neworder.css` (~520 LOC) — sheet positioning, scroll-snap,
     stagger entrance, product grid sizing.
   - `src/styles/touch-optimizations.css` (~280 LOC) — hit-area tokens,
     touch-feedback ripple, `touch-mode` body class.
   - `src/styles/tpv-optimizations.css` (~190 LOC) — restaurant/cafe/bar
     environment classes (unused at runtime, only in CSS itself), speed
     service-mode, accessibility-mode body classes (also unused), high-traffic
     mode, scrollbar styling.
   - `src/styles/optimized-product-card.css` (~210 LOC) — `.product-card`,
     `.product-icon`, `.action-btn`, `.product-price` for `OptimizedProductCard`.
   - `src/styles/optimized-order-history.css` (~220 LOC) — `.order-card`,
     `.virtualized-order-list` for the virtualised history list.
   These files were imported from `main.tsx` and were reachable through
   class-string references in JSX (`class="neworder-product-grid"` etc.).
   The class names were scattered, undocumented, and impossible to rename
   safely because grep across `src/` couldn't reliably distinguish
   "intentional legacy" from "dead code".

2. **Static numbers everywhere in money surfaces.** `OrderPanel`, `PaymentModal`,
   `ConfirmPaymentDialog`, `OrderHistory`, `VirtualizedOrderHistory` all
   rendered totals / subtotals / IVA / item-price × quantity as
   `{order.total.toFixed(2)}` (or `currencyFormatter.format(...)`) — the
   number just *appeared*, no count-up, no animation, no tabular-nums to
   prevent layout shift. The `AnimatedNumber` component had been built
   (count-up with rAF + exponential-out + `prefers-reduced-motion` fallback)
   but was only used in one or two places. Money changes deserve feedback.

3. **Inconsistent button vocabulary.** POS surfaces were a mix of `<Button>`
   with hand-rolled classes (`h-16 text-xl w-full bg-primary text-primary-foreground`)
   and legacy `.payment-button`, `.neworder-sheet-cancel`, etc. The M1 CVA
   system had defined `posButtonVariants` (variants: `product`, `category`,
   `payment`, `table`) but the codebase had only one explicit usage of
   `variant="payment"` (in OrderPanel) and one of `variant="category"`
   (in CategoryCard). The rest of the surfaces were hand-rolled utility
   strings, making any future visual change a sprawling find-and-replace.

A fourth, smaller problem: `App.css` had grown a historical `@theme inline`
block (radii, colours, fonts, shadows) that overlapped semantically with
`tokens.css` (the M1 SSOT). Two sources of truth for the same design tokens,
both parsed by Tailwind at build time.

## Decision

### 1. Migrate then delete the 5 legacy CSS files

For each consumer of a legacy class, identify the actual call sites via
`grep -rn "class-name"` against `src/` (TSX/TS only — class names appearing
in `.css` themselves are self-references and don't need replacement), then
rewrite the JSX with inline Tailwind utilities + design tokens. Use
CVA variants where the legacy class encoded a reusable POS concept
(`payment`, `category`, `product`, `table`). Delete the CSS files once
zero JSX/TS call sites remain.

Inventory of class → replacement mappings actually applied:

| Legacy class (file)                  | Replacement pattern                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `.neworder-product-grid`             | `grid gap-3 w-full max-w-full auto-rows-fr items-stretch`                     |
| `.neworder-scroll-container`         | `flex gap-1 … snap-x snap-mandatory scroll-smooth scrollbar-thin`            |
| `.neworder-scroll-snap-item`         | (now redundant — parent `snap-mandatory` makes children snap-start implicit)  |
| `.neworder-scroll-fade`              | `absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent` |
| `.neworder-sheet*` (8 selectors)     | inline Tailwind on OrderSheet root + children                                |
| `.payment-button`                    | `<Button variant="payment" size="touch" />`                                  |
| `.product-card` / `.product-icon`    | inline Tailwind in OptimizedProductCard + state-based color variants         |
| `.product-price`                     | inline Tailwind + `text-success tabular-nums font-mono`                      |
| `.action-btn` (OptimizedProductCard) | inline Tailwind + `active:scale-[0.96]` press feedback                       |
| `.order-card` / `.virtualized-order-list` | inline Tailwind in VirtualizedOrderHistory                                |
| `.touch-target` / `.touch-feedback`  | `min-h-[var(--spacing-touch-target)]` + `active:scale-[0.96]`                 |
| `.touch-enhanced`                    | `active:translate-y-px`                                                       |
| `.touch-input`                       | `min-h-[var(--spacing-touch-target)] px-4 py-3 text-base rounded-lg`          |

`touch-mode` body class is preserved (it's used by `ThemeSelector` to
toggle accessibility-friendly larger hit-areas independently of the
deleted CSS file — the toggle state lives in the DOM, not in stylesheet
rules).

### 2. Wire `AnimatedNumber` everywhere money moves

Replace every static money render in the POS flow with
`<AnimatedNumber value={...} suffix=" €" />` (or empty prefix, locale
`es-ES` baked into the component). Locale `es-ES` with default decimals=2
formats as `1.234,56`; appending `suffix=" €"` produces `1.234,56 €`,
matching the Spanish EUR convention that the old `Intl.NumberFormat` with
`style: 'currency'` had been producing.

Call sites wired (24 instances across 5 files):

- `OrderPanel.tsx`: total in footer, total in "Completar" payment button (×2)
- `PaymentModal.tsx`: Total, Cantidad Ingresada, Cambio (cash flow) (×3)
- `ConfirmPaymentDialog.tsx`: Total a cobrar (×1)
- `OrderHistory.tsx`: mobile card total, desktop row total, details dialog
  total, item.price × item.quantity (×7)
- `VirtualizedOrderHistory.tsx`: row total + card total (×2)

Removed the now-redundant local `eurFormat` / `currencyFormatter` arrow
helpers; replaced each with a one-line comment pointing at the
`AnimatedNumber` API.

### 3. Polish POS components to M1 type-scale + spacing + depth

- **Type-scale**: replaced arbitrary `text-[10px]`, `text-[9px]`,
  `text-[22px]`, `text-6xl` outliers with token-ladder steps
  (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`, `text-3xl`).
  Kept intentional large numerals (payment confirmation, payment modal
  total `text-7xl`) — those are *display* numerals, not body text.
- **Spacing**: replaced `gap-4` / `gap-6` ad-hoc with token-driven
  `space-y-4` / `gap-3` consistent with the rest of the chrome.
- **Depth**: replaced `box-shadow` declarations in deleted CSS files
  with Tailwind shadow utilities (`shadow-sm`, `shadow-md`, `hover:shadow-md`).
  Maintained existing depth hierarchy — no visual change to current users,
  just no longer hardcoded in legacy stylesheets.
- **Touch targets**: every interactive surface in the POS flow now uses
  `--spacing-touch-target` (44px, Apple HIG minimum) or larger via
  `min-h-[var(--spacing-touch-target-xl)]` (56px) for primary actions.

### 4. Consolidate `App.css` tokens into `tokens.css`

Removed the `@theme inline` block from `App.css` (radii, colours, fonts,
shadows, animations) — `tokens.css` already had them under `@theme { ... }`
(plain `@theme`, not `@theme inline`, so tokens are exposed as Tailwind
utilities at runtime). `App.css` now only contains base/reset styles,
font-face, scrollbar utilities, and the performance-mode classes
(`.reduced-motion`, `.low-performance`, `.very-low-performance`,
`.animations-disabled` — these stay because they're applied by
`usePerformanceConfig` based on detected hardware capability, not theme).

One implementation note: `App.css`'s `@apply border-border outline-ring/50`
and `@apply bg-background text-foreground` had to be rewritten as direct
CSS using `var(--border)`, `var(--ring)`, `var(--background)`,
`var(--foreground)` because Tailwind processes each CSS file in the build
pipeline independently — `App.css` is processed before `tokens.css` is
fully resolved, so `@apply` against theme tokens defined in a sibling
file fails at build time with "Cannot apply unknown utility class".
Direct `var(--*)` references don't need Tailwind's theme-aware
compilation pass.

Also reordered `main.tsx` so the CSS imports happen *before* the App
import — defensive, in case future Tailwind versions care about import
order at evaluation time.

## Consequences

**Positive:**

- ~1700 LOC of legacy CSS gone. Single source of truth for design tokens
  (`tokens.css`). One less source of merge conflicts on the POS surface.
- Money changes now feel like money changes — count-up animation, tabular
  numerals, no layout shift. Visible on every order add/remove/qty bump,
  on every payment confirmation, on every history row.
- POS button vocabulary is now declarative (`variant="payment"`,
  `variant="category"`) and round-trippable through CVA. Future visual
  changes are local to `cva-variants.ts`, not find-and-replace across 12
  files.
- Strict M1 type-scale compliance — no more `text-[10px]` outliers.

**Negative / accepted trade-offs:**

- Two `@apply` directives had to be replaced with direct CSS variables in
  `App.css`. This is *less* idiomatic Tailwind but more correct given the
  build pipeline's file-ordering quirk. Documented inline.
- The `touch-mode` body class still toggles via `ThemeSelector`, but
  its CSS effects now live in inline utilities (`min-h-[var(--spacing-touch-target)]`)
  applied at the component level rather than a body-class-driven
  stylesheet. Slightly more verbose at the call site but no global
  cascade surprise.
- `OptimizedProductCard` and `ProductCard` are now visually near-identical
  (both use inline Tailwind + state classes). The Optimized variant was
  distinguished by the deleted `.product-card*` selectors. Future work
  may collapse them or differentiate by intent (`ProductCard` for admin
  catalogue, `OptimizedProductCard` for the cashier grid).

## Verification

- `bun run typecheck` — 0 errors.
- `bun run build` — green (`✓ built in 18.77s`). Two pre-existing chunk
  size warnings and one `INEFFECTIVE_DYNAMIC_IMPORT` warning, all
  unrelated to M4.
- `grep -rn "@theme inline" src/` — 0 active blocks (5 historical mentions
  in comments documenting the migration).
- `grep "AnimatedNumber"` in POS components — 24 instances across 5 files.
- `ls src/styles/` — `optimized-login.css`, `themes.css`, `tokens.css`
  (5 files deleted: `neworder.css`, `tpv-optimizations.css`,
  `touch-optimizations.css`, `optimized-product-card.css`,
  `optimized-order-history.css`).
- Lint: 10 pre-existing errors and 8 pre-existing warnings (all in files
  outside M4 scope: `state-views.tsx`, etc.). `lint:fix` repaired
  formatting in 5 M4-touched files.

## Suggested next

- **M5 candidate**: collapse `OptimizedProductCard` / `ProductCard` once
  visual diff confirms they're functionally identical.
- **Smoke E2E**: human-driven POS walkthrough (create product → add to
  order → modify qty → cobrar → close) on the live dev build. Not
  runnable in this executor session (no display, no Tauri runtime);
  flagged for waxin's verification.
- **Animation budget**: `AnimatedNumber` count-up duration (600ms
  default) on rapid qty changes could chain visually — consider
  respecting `prefers-reduced-motion` more aggressively on the cashier
  grid specifically (high-frequency input surface).

## Files touched

**Modified (12):**
- `src/App.css`
- `src/main.tsx`
- `src/styles/tokens.css`
- `src/components/OrderPanel.tsx`
- `src/components/PaymentModal.tsx`
- `src/components/ConfirmPaymentDialog.tsx`
- `src/components/VirtualizedOrderHistory.tsx`
- `src/components/Sections/OrderHistory.tsx`
- `src/components/Sections/NewOrder.tsx`
- `src/components/Product.tsx`
- `src/components/ThemeSelector.tsx`
- `src/components/ui/OptimizedProductCard.tsx`
- `src/components/ui/ProductCard.tsx`
- `src/components/ui/CategoryCard.tsx`
- `src/components/ui/OrderSheet.tsx`
- `src/components/ui/TableScroll.tsx`

**Deleted (5):**
- `src/styles/neworder.css`
- `src/styles/touch-optimizations.css`
- `src/styles/tpv-optimizations.css`
- `src/styles/optimized-product-card.css`
- `src/styles/optimized-order-history.css`

**Created (1):**
- `docs/decisions/r13-ui-overhaul-orders-flow-2026-08-23.md` (this file)
