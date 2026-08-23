---
type: task-request
id: TR-v0.2.0-ui-overhaul
status: open
priority: P1
created: 2026-08-23
lockedBy: waxin (AskUserQuestion 2026-08-23)
dependsOn: []
blocks: [v0.2.0 release]
refs: [audit-ui-state, audit-appimage-icon, audit-wizard-step5, audit-skills-uiux]
---

# TR — v0.2.0 UI/UX Overhaul

> **Resumen ejecutivo**: rehacer la UI completa respetando los tokens themeable. Sidebar,
> spans, margins, buttons, animaciones, todo el flow de orders (agregar items → completar pago),
> animaciones con tabular-nums en cifras, profundidades, backgrounds, splash, todo. Coherente
> con los 3 themes existentes (synthwave84/graphite/darkmatteviolet) + extensión a 4to tema
> brand "TPV Amber" para hospitality. Skills: `/redesign-existing-projects` + `/impeccable`
> v3.9.1 + `/ui-ux-pro-max` + `/make-interfaces-feel-better` (checklist PR).

---

## Contexto

waxin (2026-08-23) reporta odio frontal al design actual de la app tras instalar v0.1.5 en el
bar y ver el wizard + POS en pantalla. Tres ofensores concretos:

1. **AppSplashScreen (213 LOC)** — Art Deco retro overload (mesh gradient + burbujas + patrón
   SVG + glow logo sobre fondo `stone-950` plano). Flash negro horrible en cada arranque.
2. **POS (NewOrder + OrderPanel + ProductGrid)** — usa CSS legacy custom
   (`.product-button`, `.category-button`, `.payment-button`, `.table-button`,
   `.restaurant-theme`, `.bar-theme`) en `/src/styles/tpv-optimizations.css` + `neworder.css` +
   `optimized-*.css` (~26k de deuda). Eso es lo que da vibe legacy en la pieza donde el
   usuario pasa el 80% del tiempo.
3. **Inconsistencia entre screens** — Home/BottomNavigation/Sidebar son modernos; POS/
   AuditLog/AEATInvoices son legacy. Parece 2 apps distintas.

Mentira en docs: CLAUDE.md dice "12 temas", realidad es **3** (synthwave84/graphite/
darkmatteviolet). Cualquier plan que asuma 12 está basado en docs obsoletas.

Bonus issues (no visuales pero relacionados al flujo de primer arranque):

- **Wizard step 5 stuck** — `useOnboarding()` se instancia 3 veces en `App.tsx` (líneas 58,
  446, 595). Cuando waxin completa el wizard, instancia #2 setea `wizard.completed=true` pero
  instancia #1 (que decide el `<Show>` del wizard) nunca se entera → wizard queda visible.
  Step que waxin percibe como "5" es en realidad el `CompleteStep` (step 6).
- **AppImage sin icono** — `.desktop` autogenerado usa `Icon=tpv-el-haido` (nombre tema
  freedesktop) en lugar de path absoluto. Los iconos viven en FUSE-mount, dock no los ve.
  Bug arrastrado desde v0.1.0.

---

## Outcome

App visualmente coherente, themeable end-to-end (los 3 themes actuales siguen funcionando +
4to tema brand), con animaciones de calidad profesional. Splash, sidebar, todo el flow de
orders rediseñados. CSS legacy eliminado, todo via tokens. AppImage con icono correcto.

---

## Scope detallado

### Dentro (✅)
- **Splash screens**: AppSplash rewrite (213→~50 LOC), LicenseSplash refresh
- **Sidebar**: rediseño con depth/glass, coherente con tokens
- **Onboarding wizard**: type-scale unificado, numbering fix (4→6), single provider refactor
  (fix wizard step 5 stuck)
- **Orders flow completo**: NewOrder + OrderPanel + ProductGrid + OrderTable + PaymentModal +
  ConfirmPaymentDialog + OrderSheet + CategorySidebar + CategoryForm + ProductDialog +
  ProductForm + todos los `.css` legacy migrados a CVA variants
- **Animaciones con tabular-nums**: count-up en cifras que cambian (total carrito, subtotal,
  IVA, etc.) usando `font-variant-numeric: tabular-nums` + MotionOne spring
- **Resto de sections**: Home (ya moderno, refinar), Products, Customers, AEATInvoices,
  OrderHistory, SettingsPanel, AuditLog
- **SectionHeader, BottomNavigation**: coherencia con sidebar nuevo
- **4to tema "TPV Amber"** brand-coherente (hospitality: amber/copper/cream)
- **AppImage icon fix**: añadir `square-icon.png` (512x512) a `bundle.icon[]` + poblar
  `bundle.category`/`bundle.publisher`
- **Tokens**: design system completo en código (color/type/spacing/motion/shadow/radius)
- **Sketch de styles legacy eliminados**: `/src/styles/neworder.css`,
  `optimized-*.css`, `tpv-optimizations.css`, `touch-optimizations.css` → migrar a
  CVA variants en `/src/components/ui/` o tokens

### Fuera (❌)
- **No migrar de Kobalt UI → shadcn/ui** (incompatible, demasiado trabajo)
- **No tocar funcionalidad de negocio** (orders, payments, AEAT, license, etc.) — solo visual
- **No tocar PWA / service worker** (separado)
- **No migrar storage adapters** (separado, ya hecho en R1)
- **No tocar backend Rust** salvo mínimo (database.rs para app_state ya hecho en v0.1.5)

---

## Milestones

### M1 — Design system foundation ([track/v0.2.0-ui-overhaul/m1-design-foundation])

**Verificado 2026-08-23**: `node_modules/@mks2508/shadcn-basecoat-theme-manager/dist/index.d.ts:1403-1407`
confirma que ThemeCore YA emite `data-theme` + `data-mode` + `.dark` class. NO se necesita
extender `theme-context.tsx` ni `theme-utils.ts`.

**Scope locked** (waxin 2026-08-23 AskUserQuestion):
- Tokens OKLCH para los 3 temas actuales (synthwave84, graphite, darkmatteviolet)
- **+ 4to tema "TPV Amber"** (amber/copper/cream, Fraunces+Inter+JetBrains Mono, radius 10px hospitality)
- **CSS scoping refactor**: pasar los 6 CSS actuales de `:root`/`.dark` a
  `[data-theme="..."][data-mode="..."]` (fix del bug "último CSS gana")
- **AnimatedNumber component** nuevo (MotionOne spring + tabular-nums + prefers-reduced-motion)
- CVA variants extension sobre `Button.tsx`: añadir `product`, `category`, `payment`, `table`
- `tokens.css` nuevo con `@theme` block para Tailwind v4

**Salida**:
- `/src/lib/design-tokens.ts` (NUEVO)
- `/src/lib/cva-variants.ts` (NUEVO)
- `/src/components/ui/animated-number.tsx` (NUEVO)
- `/src/hooks/use-theme-density.ts` (NUEVO)
- `/src/styles/tokens.css` (NUEVO, importado en main.tsx)
- `/public/themes/{synthwave84,graphite,darkmatteviolet}-{light,dark}.css` (refactor selector)
- `/public/themes/tpv-amber-{light,dark}.css` (NUEVOS)
- `/public/themes/registry.json` (+1 entry tpv-amber)
- `/src/components/ui/button.tsx` (1 línea: import posButtonVariants)
- `/docs/decisions/r10-ui-overhaul-design-tokens-2026-08-23.md` (NUEVO — ADR)

**NO tocar** (M4): `/src/styles/{neworder,tpv-optimizations,touch-optimizations,optimized-*}.css`,
ProductCard vs OptimizedProductCard unificación.

**Close criterion**: typecheck + build verde + 4 themes cargan sin FOUC + AnimatedNumber demo
funciona + CVA variants compilan + CSS legacy sigue funcionando (coexistencia durante M1-M3).

**Handoff completo**: `/tmp/v0.2.0-M1-handoff.md` (330+ líneas, copy-pasteable snippets).

### M2 — Splash + Auth shell ([track/v0.2.0-ui-overhaul/m2-splash-auth])
- AppSplashScreen rewrite: ~50 LOC, fondo `bg-background` (theme), logo + brand wordmark,
  MotionOne fade+scale, sin Art Deco, sin flash negro
- LicenseSplashScreen refresh: glass card + mesh sutil del theme, mantener form
- Onboarding wizard unificado:
  - Type-scale consistente (eliminar `text-4xl font-extrabold` outlier)
  - Numbering fix: WelcomeStep anuncia 6 steps (no 4)
  - Single provider refactor: un solo `<OnboardingProvider>` raíz en App.tsx, consumir via
    context en todos lados → fix wizard step 5 stuck bug
  - Disabled confuso en CreateUsersStep → empty state con tooltip explicativo
- **Salida**: 3 componentes rediseñados + wizard step 5 fix verificado
- **Close criterion**: wizard se completa end-to-end y la app entra a Home tras
  "Empezar a usar TPV", sin stuck

### M3 — Sidebar + Navigation shell ([track/v0.2.0-ui-overhaul/m3-sidebar-nav])
- Sidebar: glass/elevation, iconos lucide consistentes, hover/active states con tokens,
  collapse animation con motion
- BottomNavigation: coherencia con sidebar (mismo icon style, mismo spacing)
- SectionHeader: rediseño (header pegadizo con breadcrumb + acciones)
- App.tsx shell: paddings, margins, background unificados
- **Salida**: Sidebar.tsx + BottomNavigation.tsx + SectionHeader.tsx rediseñados
- **Close criterion**: navegación visualmente coherente desktop+mobile

### M4 — Orders flow (POS) ([track/v0.2.0-ui-overhaul/m4-orders-flow])
- NewOrder.tsx, OrderPanel.tsx, ProductGrid/ProductButton.tsx, OrderTable.tsx,
  PaymentModal.tsx, ConfirmPaymentDialog.tsx, OrderSheet.tsx, CategorySidebar.tsx
- CVA variants: `product-button`, `category-button`, `payment-button`, `table-button` →
  `<Button variant="product|category|payment|table">` o componentes `<PosButton>` dedicados
- **Animaciones tabular-nums**: cuando cambia total/subtotal/IVA, count-up con MotionOne
  spring + `font-variant-numeric: tabular-nums` → cifras no saltan al cambiar
- Migrar `/src/styles/neworder.css` (~11k) + `tpv-optimizations.css` (~7k) +
  `optimized-product-card.css` (~5k) + `optimized-order-history.css` (~2.5k) +
  `optimized-login.css` (~2k) → CVA variants y tokens
- **Salida**: 8+ componentes rediseñados, 5 archivos CSS eliminados
- **Close criterion**: orders flow visualmente moderno, animaciones suaves, theme-switch
  coherente, cero CSS legacy en /src/styles/

### M5 — Resto de sections ([track/v0.2.0-ui-overhaul/m5-rest-sections])
- Home (refinar el gradient + charts + cards que ya están bien)
- Products, Customers, AEATInvoices (form-heavy, simplificable)
- OrderHistory, SettingsPanel (11 tabs), AuditLog (1414 LOC)
- **Salida**: 7 secciones con look coherente
- **Close criterion**: navegación completa sin "saltos" visuales entre sections

### M6 — Polish rubric + AppImage icon fix ([track/v0.2.0-ui-overhaul/m6-polish-icon])
- Pass de polish con `/make-interfaces-feel-better` (16 principios, tabla Before/After):
  concentric border radius, optical alignment, shadows sobre borders, interruptible
  animations, `tabular-nums`, `text-wrap: balance`, `antialiased`, scale-on-press `0.96`
  exacto, hit area 40×40, no `transition: all`, `will-change` solo en transform/opacity/filter
- Checklist de PR con esos principios
- AppImage icon fix:
  - Añadir `square-icon.png` (512x512) a `bundle.icon[]`
  - Poblar `bundle.category` = `"Office"` (o "Business")
  - Poblar `bundle.publisher` = `"El Haido Team"`
  - (Opcional, medium effort) Hook post-bundle que reescriba `Icon=$APPDIR/...png`
    en `.desktop` autogen para path absoluto
- **Salida**: build limpio, AppImage con icono visible en dock pre-launch
- **Close criterion**: PR checklist pasado, smoke build OK, AppImage con icono

### M7 — Release v0.2.0 ([track/v0.2.0-ui-overhaul/m7-release])
- Bump versions: `package.json` 0.1.5 → 0.2.0, `src-tauri/tauri.conf.json` 0.1.5 → 0.2.0,
  `src-tauri/Cargo.toml` 0.1.5 → 0.2.0
- Release notes: hand-written en `docs/releases/v0.2.0-notes.md`
- Tag v0.2.0 + push (con OK explícito de waxin)
- CI build + publish contra hub
- Smoke Linux + Windows
- **Close criterion**: tag v0.2.0 publicado, `haido.releases.mks2508.systems` sirve la versión
  nueva, OTA llega al bar

---

## Decisiones de gusto (locked)

- **Sistema de diseño**: mantener Kobalt UI + 3 themes existentes (synthwave84, graphite,
  darkmatteviolet). NO forzar tema amber como principal — waxin lock 2026-08-23 quiere que
  el theme selector sea quien decida colores. **4to tema "TPV Amber" queda como OPCIONAL**
  (puede deferrarse a 0.2.x si no hay demanda explícita de un tema brand hospitalario).
  El default sigue siendo synthwave84.
- **Vibe general**: moderno, chulo, usable. Colores los decide el theme. **No over-design**:
  los tokens ganan a cualquier creatividad decorativa.
- **Animación cifras POS**: **count-up spring** (MotionOne, stiffness 200, damping 25).
  Cuando cambia total/subtotal/IVA, las cifras animan con spring + `tabular-nums` para que
  no salten de ancho.
- **Glassmorphism**: **sutil, solo donde aporta**. Solo Sidebar + BottomNavigation +
  LicenseSplash card. Resto de la app usa tokens planos con sombras sutiles. Waxin lock
  2026-08-23: "depth donde importa, no en todos lados".
- **Versión**: v0.2.0 (visual refresh + bugfixes absorbed, sin breaking changes de API).
- **Wizard stuck fix**: absorbe single provider refactor (estructural, no cosmético).
- **CSS legacy → CVA**: total, no gradual. `/src/styles/*.css` legacy se eliminan al final de
  M4. Mientras conviven, los tokens nuevos ganan.
- **Icono AppImage fix**: small (añadir 512x512 + category + publisher). Hook post-bundle
  queda como medium-effort deferrable si el síntoma persiste tras v0.2.0.

### Sub-decisiones locked con waxin 2026-08-23 (AskUserQuestion inline)

| Decisión | Lock | Justificación |
|---|---|---|
| Tema principal | "deja los colores al selector de theme" | Waxin quiere que el theme selector decida, no forzar amber |
| Anim cifras POS | Count-up spring | Smooth, satisfactorio, cero jumps |
| Glassmorphism scope | Sutil — Sidebar/BottomNav/LicenseSplash card | Profundidad donde importa, no saturar |
| **TPV Amber brand** | **Sí, implementarlo en M1** | Waxin lock 2026-08-23: quiere el tema brand-coherente |
| **CSS scoping refactor** | **M1 lo cierra** | Prerequisito de "temas sin FOUC coherente"; fix bug "último CSS gana" |
| **AnimatedNumber** | **Implementar ya en M1** | Para que M4 (orders flow) lo pueda usar inmediatamente |

---

## Riesgos conocidos

- **R1 (alto)**: M4 refactor de CSS legacy en POS hot-path. Riesgo de regresión funcional.
  Mitigation: implementar detrás de un feature flag por sección (`?legacy_pos=false`), smoke
  E2E del flow completo (crear producto → agregar a orden → modificar cantidad → cobrar →
  cerrar orden).
- **R2 (medio)**: M1 tokens podrían no cubrir todos los casos del POS real. Mitigation:
  audit de M1 con los componentes críticos (PaymentModal, NewOrder) antes de lockear tokens.
- **R3 (medio)**: 4to tema "TPV Amber" si no encaja con brand existente. Mitigation:
  previsualizar contra Home + POS antes de mergear.
- **R4 (bajo)**: Wizard single provider refactor podría romper SettingsPanel (que también usa
  OnboardingProvider para "Reiniciar wizard"). Mitigation: preservar la API del context.

---

## Referencias

- `audit-ui-state.md` (audit completo del estado visual actual)
- `audit-appimage-icon.md` (root cause del sin icono)
- `audit-wizard-step5.md` (root cause del wizard stuck)
- `audit-skills-uiux.md` (skills UI/UX disponibles y recomendadas)
- Skills cargadas en M1: `/redesign-existing-projects`, `/impeccable`, `/ui-ux-pro-max`,
  `/make-interfaces-feel-better`
