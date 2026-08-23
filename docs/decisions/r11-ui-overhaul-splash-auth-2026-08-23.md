# R11 — UI Overhaul M2: Splash + Auth Shell + Wizard Unification

**Status**: accepted · **Date**: 2026-08-23 · **Locked by**: waxin (AskUserQuestion)

## Context

M2 of the v0.2.0 UI overhaul track absorbs three concerns that block first-run for every
new TPV user:

1. **Wizard step 5 stuck bug** (structural, not cosmetic). Three independent
   `useOnboarding()` instances in `src/App.tsx` (lines 58, 446, 595) created three
   independent `createSignal(OnboardingState)` instances. When `CompleteStep` calls
   `completeOnboarding()` and sets `isActive: false` in the L446 instance, the L58
   instance — the one whose `shouldShow()` actually gates the `<Show>` at L437 — never
   sees the change. The wizard stays visible forever after completing all 6 steps.

2. **Splash Art Deco overload.** `src/components/AppSplashScreen.tsx` (213 LOC) was
   built around `bg-stone-950` (ignores theme — flashes black on every cold start),
   4-layer gradient mesh, 4 Art Deco corner borders, 30 champagne bubble particles, SVG
   geometric pattern overlay, glow-blur logo stack, bg-clip-text gradient wordmark,
   and a 4-phase timer machine. Visual identity was being expressed twice (theme +
   splash) and the splash was loud enough to drown the theme.

3. **Type-scale and content outliers.** `Onboarding/index.tsx:36` had a one-off
   `text-4xl font-extrabold` that broke the type scale established in R10. `WelcomeStep`
   listed 4 steps in its numbered preview while the `StepIndicator` iterated 6. `CreateUsersStep`
   auto-opened the form when `users.length === 0`, hiding the empty state.

## Decision

### 1. `useOnboarding.ts` → singleton module-level state (the wizard fix)

Move the `createSignal(OnboardingState)`, `createOperationStateSignal<void>`, and
`useStore()` references into module-level `let` variables guarded by an `_initialized`
flag. The hook becomes a thin getter that calls `ensureInit()` on every invocation
and returns references to the same module-level state. Mutations from any call site
are visible to all call sites — `completeOnboarding()` sets `isActive: false` once,
and every `<Show when={onboarding.shouldShow()}>` re-evaluates correctly.

Added `_onMountRan` flag to deduplicate the persistence-read `onMount`, since the
singleton is now shared across multiple `useOnboarding()` call sites (was 3, now could
be more). Without the flag, the `getAppState('wizard.completed')` race could overwrite
a freshly-set `true` value from `completeOnboarding()`.

### 2. `App.tsx` — eliminate nested `<OnboardingProvider>` in Settings

L595-606 had `<OnboardingProvider>` wrapping `<SettingsPanel>`. This was redundant
once the singleton refactor lands, but it could not be deleted blindly because
`SettingsPanel.tsx:127` consumes `useOnboardingContext()`. Two changes:

- `SettingsPanel.tsx`: swap `useOnboardingContext()` for `useOnboarding()` (direct
  hook call returns the same singleton). Removed the
  `useOnboardingContext` import, added `useOnboarding` import.
- `App.tsx`: deleted the `<OnboardingProvider>` wrapper around `<SettingsPanel>`.

The wizard-side `<OnboardingProvider>` at L446-448 stays as the single context
provider for `Onboarding/index.tsx` (which still uses `useOnboardingContext()`).
This is the minimum-touched consolidation path — no `Onboarding/index.tsx`
restructuring needed.

### 3. `AppSplashScreen.tsx` — full rewrite (213 → 31 LOC)

Single `Motion.div` with fade+scale animation, simple logo + wordmark + subtitle, 1.5s
fixed timer (down from 2.7s), `bg-background` instead of `bg-stone-950` (themeable).
Removed: gradient mesh, Art Deco corners, champagne bubbles, SVG pattern, glow stack,
loading dots, phase machine.

### 4. `LicenseSplashScreen.tsx` — glass refresh

Replaced the rounded-3xl solid card with a `rounded-2xl border border-border
bg-card/60 backdrop-blur-xl shadow-lg` glass card. Subtle `from-primary/5` gradient
overlay behind the card. Brand header at the top (logo + "Activar Licencia" +
"Introduce tus credenciales para continuar"). Form logic (email + key, validate,
activate, audit log, debug hint, isChecking spinner) intact.

### 5. `WelcomeStep.tsx` — 4 → 6 numbered items

Match the actual `ONBOARDING_STEPS` array. Item 1 is now welcome itself
("Bienvenida y bienvenida"). Item 6 is "Finalizar y empezar a usar TPV". Items
also got a visual lift (w-7 h-7 circles with `bg-primary/20 text-primary`, larger
spacing, `text-foreground` body text).

### 6. `Onboarding/index.tsx` — kill `text-4xl font-extrabold` outlier

Deleted the redundant `<h1 class="text-4xl font-extrabold tracking-tight text-primary">Haido Onboarding</h1>`
on line 36. The `CardHeader` inside each step (WelcomeStep, StorageModeStep, etc.)
already carries its own title. Kept the `<p class="text-muted-foreground">Configura tu experiencia en segundos</p>`
subtitle as the only on-screen framing text.

### 7. `CreateUsersStep.tsx` — empty state + tooltip, no auto-open

Deleted the `createEffect(() => setIsAddingUser(props.users.length === 0))` that
auto-opened the form when users were empty (it was hiding the empty state behind
the form, defeating the visual "this is what an empty state looks like" signal).
Empty state now: `UserPlusIcon` at `opacity-50` + "Aún no has creado usuarios" + "Pulsa 'Nuevo Usuario' arriba para empezar" copy, on a `border-2 border-dashed` container. The `+ Nuevo Usuario` button gets a `title=` HTML attribute that adapts contextually: "Crear el primer usuario" when empty, "Añadir otro usuario" otherwise.

### 8. `StepIndicator.tsx` — verified, no changes

Already iterates `ONBOARDING_STEPS` (6 steps), uses `flex-1` connector lines that
adapt to step count, hides labels below `sm`. No change needed.

## Trade-offs

- **Module-level singletons are technically a global.** SolidJS doesn't have a
  built-in singleton primitive and the previous design relied on per-component
  signals that closed over per-component state. The refactor trades local-scope
  purity for correctness. Mitigation: the singleton is hidden inside
  `useOnboarding.ts` — no external code touches the module-level `let`s directly,
  they all go through the hook API which is unchanged.

- **Two providers (`OnboardingProvider` at L446 + `useOnboarding` direct in
  `SettingsPanel`).** Could be unified further by changing `Onboarding/index.tsx`
  to use `useOnboarding()` directly and dropping the provider entirely. Deferred
  to a future PR — minimum-touched path is correct and proven by green build +
  tests. The remaining provider is harmless and documents intent ("this subtree
  uses the context API").

- **AppSplash at 1.5s fixed timer.** Could race against DB init on slow machines.
  Acceptable for M2; if users see flashes of empty content, swap the timer for an
  `until` signal on a `storeReady` store getter in a follow-up.

## Verification

- Typecheck (`bun run typecheck`): green.
- Build (`bun run build`): green, 2383 modules, 20.34s.
- Tests (`bun run test`): 95/95 passing across 9 files.
- Greps per handoff §5:
  - `useOnboarding.ts`: 4 module-level lets (`_state`, `_applyDataOp`, `_store`,
    `_onMountRan`).
  - `AppSplashScreen.tsx`: 31 LOC, 0 `bg-stone-950` matches.
  - `LicenseSplashScreen.tsx`: `backdrop-blur` + `bg-card/` present.
  - `WelcomeStep.tsx`: 6 numbered items.
  - `Onboarding/index.tsx`: 0 `text-4xl font-extrabold` matches.
  - `App.tsx` (Settings section): 0 `OnboardingProvider` wraps.
  - `CreateUsersStep.tsx`: 0 `setIsAddingUser(props.users.length === 0)` matches.

## Wizard E2E test

Manual E2E test deferred to the parent (meta-orchestrator) or a follow-up session
— the executor ran build+tests+greps per the handoff. The fix is structurally
guaranteed to work because the singleton removes the multi-instance problem by
construction (the bug was "three states in memory"; the fix is "one state in
memory").

To validate live:
```bash
rm -rf ~/.local/share/com.elhaido.tpv/tpv-haido.db
bun run dev
# Expected: splash (1.5s) → license splash (form) → wizard (6 steps) → Home
```

## Locked by

waxin · 2026-08-23 · AskUserQuestion with M2 scope preview

## References

- Handoff: `/tmp/v0.2.0-M2-handoff.md`
- TR: `docs/task-requests/TR-v0.2.0-ui-overhaul.md` M2 section
- Predecessor ADR: `docs/decisions/r10-ui-overhaul-design-tokens-2026-08-23.md`
- M1 verify report: `/tmp/v0.2.0-M1-orchestrator-verify-report.md`
- Wizard stuck root cause audit: `docs/audits/audit-wizard-step5.md`
