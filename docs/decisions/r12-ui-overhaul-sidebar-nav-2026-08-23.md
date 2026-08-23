# R12 — UI Overhaul M3: Sidebar + Navigation Shell

**Status**: accepted · **Date**: 2026-08-23 · **Locked by**: waxin (AskUserQuestion)

## Context

M3 of the v0.2.0 UI overhaul track targets the persistent navigation chrome — the
two surfaces (desktop sidebar, mobile bottom navigation) that frame every
section the user actually touches. M1 locked the design tokens, M2 locked the
first-run shell; this milestone closes the gap between "the chrome exists" and
"the chrome is on-system, on-tokens, on-scale".

Three structural problems detected during the M2 retrospective:

1. **Duplicated UI primitives in SideBar.** `Avatar`, `AvatarImage`,
   `AvatarFallback`, and an unused `_ScrollArea` were defined inline in
   `SideBar.tsx` (L11-72, ~62 LOC) while Kobalte-backed versions of the same
   three Avatar primitives already lived in `src/components/ui/avatar.tsx`,
   and a custom `ScrollArea` already lived in `src/components/ui/scroll-area.tsx`.
   Two sources of truth, identical names, divergent APIs (the inline Avatar
   used a `<div>` wrapper; the Kobalte one uses `<span>` + `Image` from
   `@kobalte/core/image` with `fallbackDelay`). Future consumers would have
   picked the wrong one without realising there were two.

2. **Type-scale outliers in SideBar.** L168 used `text-[10px]` for the
   "GERMAN ASENSIO BLASCO" caption and L171 used `text-[9px]` for the NIF line,
   breaking the M1 type-scale (`text-xs` = 12px is the smallest step on the
   token ladder). Both labels are decorative metadata for the sidebar's
   collapsed-open state; readability mattered less than scale coherence.

3. **Scale-on-press inconsistency in BottomNavigation.** Press animation used
   `scale: 0.9` (and hover `scale: 1.05`), which is the "default" bouncy
   microinteraction. `/make-interfaces-feel-better` and the Waxin lock target
   `scale: 0.96` for press and `scale: 1.02` for hover — barely-perceptible,
   clearly-felt. Two motion magnitudes in one app (0.9 vs 0.96) trained the
   user's finger to expect a heavy press on mobile that didn't match the rest
   of the system.

A fourth, smaller issue: `getBusinessName()` was inline in
`Sections/SectionHeader.tsx` (L20-31) while its sibling `getBusinessNif()` was
already exported from `@/store/store`. Two helpers for one domain concept,
different locations, no shared typing — a 12-line copy-paste that would have
multiplied the next time someone needed business metadata.

## Decision

### 1. Consolidate Avatar primitives — use `src/components/ui/avatar.tsx`

`SideBar.tsx` deleted L11-58 (Avatar + AvatarImage + AvatarFallback local
definitions) and replaced with:

```ts
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
```

The local versions were `<div>` wrappers with manual class concatenation; the
shared versions are Kobalte `Image` primitives with `fallbackDelay` support —
a strict superset of behaviour. The SideBar's call sites (`<Avatar>` wrapping
`<AvatarImage>` / `<AvatarFallback>` with `bg-sidebar-accent` overrides) work
unchanged because the Kobalte API accepts the same `class` and `children`
props.

### 2. Delete unused `_ScrollArea` from SideBar

The local `_ScrollArea` (L60-72 in the original) was a 12-line dead helper —
no `<_ScrollArea>` call site exists in `SideBar.tsx` (the nav uses
`<nav class="overflow-y-auto">` directly). Removed in the same edit. The
shared `ScrollArea` in `src/components/ui/scroll-area.tsx` remains available
for future consumers (e.g. NewOrder table list, OrderHistory) but is not
imported by SideBar — minimum-touched consolidation.

### 3. Sidebar glass sutil — `backdrop-blur-xl` on the Card wrapper

Added `backdrop-blur-xl` to the outer `<Card>` className (L75). Waxin's
three-glass-sites lock (Sidebar, BottomNavigation, LicenseSplashScreen) gets
its first concrete realization here. Combined with the existing
`bg-[color-mix(in_oklch,var(--sidebar)_85%,var(--foreground)_15%)]` it gives
the sidebar a real frosted layer over the parent — visible on the
desktop-only desktop chrome, since the sidebar itself is hidden on mobile.

### 4. Normalize type-scale outliers in SideBar

- L168 `text-[10px]` → `text-xs` (GERMAN ASENSIO BLASCO caption)
- L171 `text-[9px]` → `text-xs` (NIF line)

`text-xs` = 12px, the smallest step on the M1 token ladder. Decorative
metadata only — neither label is read for content, both appear once when the
sidebar is expanded.

### 5. BottomNavigation scale tuning — 0.96 press / 1.02 hover

Four call sites aligned with the system lock:

- L57 (nav items, press): `scale: 0.9` → `scale: 0.96`
- L60 (nav items, hover): `scale: 1.05` → `scale: 1.02`
- L134 (user logout button, press): `scale: 0.9` → `scale: 0.96`
- L137 (user logout button, hover): `scale: 1.05` → `scale: 1.02`

The active-indicator dot animation (`scale: 0.8 → 1` on enter, `1 → 0.8` on
exit) is left untouched — it is a separate animation, not a press response,
and lives on the indicator not the button itself.

### 6. Move `getBusinessName` to `src/lib/business.ts`

New file. Consolidates the two business helpers:

```ts
import { getBusinessNif } from '@/store/store';

export function getBusinessName(): string {
  try {
    const saved = localStorage.getItem('tpv-aeat-config');
    if (saved) {
      const aeatConfig = JSON.parse(saved);
      return aeatConfig?.businessData?.nombreRazon ?? '';
    }
  } catch {
    // Ignore parse errors
  }
  return '';
}

export { getBusinessNif };
```

`Sections/SectionHeader.tsx` imports `getBusinessName, getBusinessNif` from
`@/lib/business` and drops both the local `getBusinessName` definition (12
LOC) and the `@/store/store` import for `getBusinessNif`. Net: 16 lines
deleted from SectionHeader, 24 lines added to `lib/business.ts`, single
import surface for "give me business metadata" (`@/lib/business`).

### 7. App.tsx shell — verify-only, no edits

Lines 480-625 verified consistent:

- Sidebar `<Show when={!isMobile()}>` (L59-60 in SideBar) — desktop only.
- BottomNavigation `<Show when={isMobile()}>` (L614 in App.tsx) — mobile only.
- Padding differential: `px-3 pt-3` mobile / `px-4 pt-4` desktop (L505).
- Bg differential: `bg-card` mobile / `rounded-2xl border border-foreground/8`
  + 90/10 color-mix desktop (L494-503). Consistent with the desktop "card
  inside a frame" pattern locked in M1.
- No cross-leaks (Sidebar's `mr-3` desktop gap is fine since it's hidden on
  mobile; BottomNavigation is `fixed` so it doesn't disturb flex flow).

No edits made — explicitly out of scope for M3, flagged in the verification
grep list for the parent if it wants a follow-up.

## Trade-offs

- **Kobalte Avatar uses `<span>` instead of `<div>`.** The local Avatar used
  `<div class="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">`.
  The Kobalte one wraps `<KobalteImage>` which renders a `<span>`. Visual
  output identical (both are inline-block by default, both apply the same
  classes), but any CSS selector that targets `.avatar > div` from the parent
  SideBar context would silently break. Searched the codebase — no such
  selector exists. Acceptable.

- **Consolidating `_ScrollArea` away from SideBar even though the shared
  `ScrollArea` exists.** The local helper was unused; the shared helper is
  unused in SideBar too. Could have imported the shared one for symmetry, but
  SideBar's nav doesn't need a scroll wrapper — `<nav class="overflow-y-auto">`
  is simpler and lighter (no extra `<div>` layer). Left the SideBar without
  any ScrollArea import.

- **`getBusinessName` reads `localStorage` directly instead of going through
  the store.** The store has `businessData` only as part of AEAT config which
  lives in `localStorage` (it's a user-side setting, not app state). Going
  through the store would mean adding a derived getter + a side-effect that
  mirrors AEAT config into the store on every change — overhead with no
  observability win. localStorage read is the same pattern that
  `getBusinessNif` already uses downstream of the AEAT save handler.

- **`text-xs` (12px) might feel large for the NIF line.** Original was 9px
  which is genuinely small. 12px is a system-readable step and the line is
  decorative — if it reads too prominent after release, a `text-[11px]`
  in-between would be acceptable, but the system lock (`text-xs` is the
  smallest token step) takes precedence for M3.

## Verification

- Typecheck (`bun run typecheck`): green.
- Build (`bun run build`): green, 2384 modules, 17.39s. No new warnings
  related to M3 changes (pre-existing chunk-size and `useUpdater` dynamic
  import warnings are unchanged).
- Tests (`bun run test`): 95/95 passing across 9 files.
- Greps per handoff §5:
  - `src/lib/business.ts`: 2 exports (`getBusinessName`, `getBusinessNif`)
    at L11 and L24.
  - `src/components/SideBar.tsx`: 0 `function Avatar*` matches.
  - `src/components/SideBar.tsx`: 0 `text-[9px]|text-[10px]` matches.
  - `src/components/SideBar.tsx`: 1 `backdrop-blur` match at L75.
  - `src/components/BottomNavigation.tsx`: 2 `scale: 0.96` matches (L57
    nav items, L134 logout) and 2 `scale: 1.02` matches (L61 nav hover,
    L138 logout hover).
  - `src/components/Sections/SectionHeader.tsx`: 1
    `from '@/lib/business'` match at L3.
- LOC deltas: SideBar 313 → 252 (-61), SectionHeader 69 → 53 (-16),
  BottomNavigation 182 → 182 (unchanged), new `src/lib/business.ts` 24 LOC.

## Manual visual verification

Deferred to the parent (meta-orchestrator) — the executor ran build + tests +
greps per the handoff. Brief mental walkthrough of the changes:

- Desktop: Sidebar opens with the Card now showing a real frosted-glass layer
  (`backdrop-blur-xl` over `bg-[color-mix(...)]`). On the open sidebar the
  business caption "GERMAN ASENSIO BLASCO" + "NIF 16639695T" reads at 12px
  (consistent with the rest of the typography ladder) instead of 9-10px.
- Mobile: BottomNavigation buttons feel slightly snappier on press (0.96 vs
  0.9 — barely perceptible but the active indicator dot still does its
  spring entrance so the overall motion vocabulary is intact). Hover scale
  reduced from 1.05 to 1.02 — less "bouncy" on touchend hold.
- Cross-section: SectionHeader's business info chip still renders El Haido +
  razón social + NIF when both are available in localStorage. Source
  changed from inline + store to single `@/lib/business` import.

## Locked by

waxin · 2026-08-23 · AskUserQuestion with M3 scope preview

## References

- Handoff: `/tmp/v0.2.0-M3-handoff.md`
- TR: `docs/task-requests/TR-v0.2.0-ui-overhaul.md` M3 section
- Predecessor ADRs:
  - `docs/decisions/r10-ui-overhaul-design-tokens-2026-08-23.md` (M1)
  - `docs/decisions/r11-ui-overhaul-splash-auth-2026-08-23.md` (M2)
- Skills: `/make-interfaces-feel-better`, `/impeccable`, `/redesign-existing-projects`
- Existing primitives reused:
  - `src/components/ui/avatar.tsx` (Kobalte `Image` based)
  - `src/components/ui/scroll-area.tsx` (custom, available but unused in SideBar)
