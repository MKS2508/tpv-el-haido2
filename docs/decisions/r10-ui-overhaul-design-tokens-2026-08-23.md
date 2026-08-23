# R10 — UI Overhaul: OKLCH Design Tokens + CSS Scoping Refactor + TPV Amber Theme

**Status**: accepted · **Date**: 2026-08-23 · **Locked by**: waxin

## Context

TPV El Haido's UI grew organically: 3 hand-rolled themes (`synthwave84`, `graphite`,
`darkmatteviolet`) each defined in their own `<theme>-{light,dark}.css` using a mix of
`:root` and `.dark` selectors, with no central token registry. This created three concrete
problems:

1. **CSS scoping bug (R1 from handoff).** The `synthwave84-dark.css` et al. used
   `.dark { ... }` while `graphite-light.css` used `:root { ... }`. When ThemeCore applied
   `data-theme="graphite"` + `.dark`, the last CSS file loaded won regardless of which theme
   the user selected. Theme switching worked only because load order was deterministic, not
   because the CSS was correctly scoped.

2. **No semantic tokens.** Hex/OKLCH values were hardcoded inside individual CSS files with
   no shared reference. A "primary" hue change required editing six files plus the registry.
   No POS-specific semantics existed (`pos-total`, `pos-success`, `pos-pending` for the
   cashier-critical highlights).

3. **No design system primitive for variant extension.** `Button.tsx` had the standard
   shadcn six variants but no POS-specific variants for product cards, categories, payment
   buttons, and table selection — the four most-touched controls in NewOrder.

Additionally, a new hospitality-tinted theme "TPV Amber" (copper/cream/terracotta/sage)
was requested to match the warm-light ambiance of the bar where the POS will be deployed.

## Decision

M1 of the v0.2.0 UI overhaul track introduces:

1. **`src/lib/design-tokens.ts`** — single source of truth for OKLCH semantic tokens,
   type-scale, spacing, motion, elevation, radius, z-index, and hit-area minimums. Includes
   `cn()` (the existing `clsx + tailwind-merge` helper, relocated here from
   `src/lib/utils.ts` is NOT replaced — design-tokens re-exports its own `cn` for
   ergonomic single-import use from new components, but existing `cn` import paths still
   resolve).

2. **CSS scoping refactor** — all six existing `<theme>-{light,dark}.css` files now scope
   variables under `[data-theme="<id>"][data-mode="light"]` and
   `[data-theme="<id>"][data-mode="dark"]`. This matches what `ThemeCore` already emits
   (`data-theme` + `data-mode` + `.dark` class, verified at
   `node_modules/@mks2508/shadcn-basecoat-theme-manager/dist/index.d.ts:1406`),
   eliminating the load-order race.

3. **`src/lib/cva-variants.ts`** — extends `Button.tsx` with four POS variants
   (`product`, `category`, `payment`, `table`) plus density variants (`compact`,
   `comfortable`). Legacy six variants preserved unchanged. Button component itself
   unchanged; only the `buttonVariants` import source flips to
   `posButtonVariants as buttonVariants`.

4. **`src/components/ui/animated-number.tsx`** — count-up component using `motionone`
   spring easing with `tabular-nums` to prevent layout shift. Respects
   `prefers-reduced-motion`. Designed for the POS total/subtotal/IVA readouts.

5. **`src/hooks/use-theme-density.ts`** — returns `'compact'` for `synthwave84` (speed-POS
   mode) and `'comfortable'` for every other theme.

6. **`src/styles/tokens.css`** — Tailwind v4 `@theme` block re-exporting OKLCH CSS
   variables as Tailwind color tokens (`bg-pos-total`, `text-pos-success`, etc.) plus
   motion/radius variables consumed by the CVA Button extension. Coexists with the
   existing `@theme inline` block in `App.css`.

7. **`public/themes/tpv-amber-{light,dark}.css`** — new built-in theme using warm cream
   canvas (`oklch(0.97 0.012 75)`), copper-amber primary (`oklch(0.68 0.155 55)`),
   terracotta accent, sage success. Fraunces (serif) for `h1/h2/h3`; Inter for body;
   JetBrains Mono for tabular-nums. Loaded via `<link>` from
   `public/themes/registry.json` new entry, no ThemeCore changes needed.

8. **`public/themes/registry.json`** — adds `tpv-amber` entry alongside the existing
   three themes. No changes to existing entries.

## Trade-offs

**Won**
- Theme switch is now deterministic: each theme owns its own CSS variables under its own
  selector.
- New POS semantics (`pos-total`, etc.) are part of the contract — components stop
  hardcoding colors.
- Button CVA extension is additive: zero breaking change to the six existing variants.
- Animated number with `tabular-nums` prevents the layout jitter that the plain
  `<span>{total.toFixed(2)}</span>` produced when totals updated on every keystroke.

**Lost**
- `posButtonVariants` renames `size: 'default'` to `size: 'md'`. No call site used
  `size="default"` (verified via grep across `src/`), so this is a no-op in practice but
  is a breaking change in the public type if any external consumer imports `buttonVariants`
  directly. Acceptable — only this repo consumes it.
- The two `@theme` blocks (`@theme inline` in `App.css` and `@theme` in `tokens.css`)
  coexist; CSS cascade resolves duplicates, but the convention now has two homes for
  token declarations. M4 should consolidate into a single block.

## Scope guards (deferred)

- CSS legacy `/src/styles/{neworder,tpv-optimizations,touch-optimizations,optimized-*}.css`
  remains untouched. It coexists with the new tokens during M1–M3 and is removed in M4
  once every consumer migrates.
- `ProductCard.tsx` vs `OptimizedProductCard.tsx` duplication is M4 scope, not M1.
- `theme-context.tsx` / `theme-utils.ts` are NOT modified — the existing dual-emit
  (`data-theme` + `data-mode` + `.dark` class) from ThemeCore is sufficient.

## Verification

- `bun run typecheck` (tsgo --noEmit) passes clean.
- `bun run build` (vite build) passes clean.
- All six legacy CSS files now start with `[data-theme="<id>"][data-mode="..."] {` —
  zero `:root` or `.dark` selectors remain in `public/themes/*.css`.
- `registry.json` has 4 theme entries; `tpv-amber` is the 4th.
- `Button.tsx` exports `buttonVariants` (re-exported from `cva-variants`).

## Risks

- **R3 (low): OKLCH gamut on pre-2018 sRGB monitors.** Chroma is capped at 0.16 across
  all themes — within safe sRGB clipping range.
- **R4 (medium): TPV Amber contrast under warm bar lighting.** `surface-elevated` differs
  from `background` by only 0.03 in L. Smoke test in production bar lighting before M2.
- **R9 (medium): Legacy CSS precedence.** Legacy CSS uses raw class selectors and still
  wins for the components it targets. M4 removes the legacy files.

## References

- Handoff: `/tmp/v0.2.0-M1-handoff.md` (full plan)
- Task request: `docs/task-requests/TR-v0.2.0-ui-overhaul-*.md`
- Roadmap source of truth: `docs/roadmap.model.yml` — milestone `track/v0.2.0-ui-overhaul/m1-design-foundation`
- ThemeCore verification: `node_modules/@mks2508/shadcn-basecoat-theme-manager/dist/index.d.ts:1406`
  (emits `data-theme`, `data-mode`, and `.dark` class)
