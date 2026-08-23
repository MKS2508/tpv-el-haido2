<!-- GENERATED from roadmap.model.yml por `axon gen`. La autoridad es el modelo (.yml); NO editar este archivo a mano. -->

# Roadmap — tpv-el-haido

modelo: tpv-haido-roadmap (authority=true) · 1 outcomes · 17 tracks · 0 spikes · 22 milestones

⚠ 1 violación(es) de governance derivable(s) — detalle al final.

## Outcomes

### outcome/tpv-produccion  ● in_progress
TPV El Haido en producción real en el bar — release-hub propio operativo (updates + licensing)
deps: (ninguna)
refs: r1 r2 r3 r4
gate: G1✓ G2✓ G3✓ G4✓  (pass=4 provisional=0 partial=0 open=0)

## Tracks

### track/core-tpv  ✓ done
Core TPV — SolidJS migration + AEAT compliance + PWA/platform abstraction (0.1.0-0.2.0)
deps: (ninguna)

### track/deployment-hub  ● in_progress
Deploy producción: tpv-cloud → desktop-release-hub multi-tenant (Coolify) + builds Windows/Linux (0.4.0-0.4.1)
deps: track/core-tpv✓(done)
refs: r1 r2
milestones:
  ▸ track/deployment-hub/master-license-hardening  ✓ done — 0.4.0.A — Master license required en prod, fallback solo en dev (TR-09)
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/deployment-hub/windows-build  ✓ done — 0.4.0.B/C/D — tpv-cloud unified + tauri.conf endpoints + Windows NSIS build/publish en el bar
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/deployment-hub/hub-scaffold-deploy  ✓ done — 0.4.1.A/B/E — auth-oidc-elysia + desktop-release-hub scaffold + deploy Coolify/Pocket ID/DNS
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/deployment-hub/admin-publish-cli  ✓ done — 0.4.1.C/G — admin endpoints del hub + scripts/release.ts CLI (PKCE loopback)
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/deployment-hub/migrate-haido-hub  ● in_progress — 0.4.1.F/H — Migrar haido tpv-cloud → hub + smoke OTA Windows
    gate: U1✓ U2○  (pass=1 provisional=0 partial=0 open=1)
  ▸ track/deployment-hub/admin-ui-postprod  ✓ done — 0.4.1.D-postprod — Admin UI React del hub (shippeada, vive en repo desktop-release-hub)
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/deployment-hub/cleanup-old-license-server  ○ queued — 0.4.0.F — Cleanup license-server viejo + liberar subdomain (nunca ejecutado)
  ▸ track/deployment-hub/license-migration  ◑ conditional — Migración de licencias tpv-cloud → hub (cuando haya licencias reales que migrar)
  ▸ track/deployment-hub/tpv-cloud-deprecation  ◑ conditional — Deprecar tpv-cloud (updates.mks2508.systems fuera de servicio)

### track/linux-build-bar  ● in_progress
TR-07 — Build Linux nativo en supermicro-pcbar (máquina real del bar, CachyOS)
deps: track/deployment-hub○(in_progress)
gate: U1✓ U2~  (pass=1 provisional=1 partial=0 open=0)

### track/printer  ✓ done
TR-08 — Impresión térmica real vía @mks2508/tickmaster SDK (revive 0.5.0)
deps: (ninguna)
gate: U1✓ U2○  (pass=1 provisional=0 partial=0 open=1)

### track/testing  ✓ done
TR-10 — Test coverage baseline (Vitest, 0.7.0)
deps: (ninguna)
gate: U1✓  (pass=1 provisional=0 partial=0 open=0)

### track/observability  ● in_progress
TR-11 — Migración @mks2508/better-logger@0.18.3 + wire OTel
deps: (ninguna)
gate: U1✓ U2✓  (pass=2 provisional=0 partial=0 open=0)

### track/ci-release-pipeline  ● in_progress
TR-12/13/14/15/16 — CI Linux x64/ARM64 + auth CI→hub + OTA bundle pipeline
deps: track/deployment-hub○(in_progress)
milestones:
  ▸ track/ci-release-pipeline/tickmaster-packaging  ✓ done — TR-13 — Unificar @mks2508/tickmaster (core+sdk) en un paquete publicable con subpath exports
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/ci-release-pipeline/ci-green  ✓ done — TR-12 — CI Linux x64/ARM64 en verde (firma minisign verificada, 5 blockers resueltos)
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/ci-release-pipeline/auth-ci-hub  ✓ done — TR-15 — Auth CI→release-hub vía OAuth2 client_credentials (Pocket ID)
    gate: U1✓  (pass=1 provisional=0 partial=0 open=0)
  ▸ track/ci-release-pipeline/admin-whitelist  ✓ done — TR-16 — Activar whitelist de admin (OIDC_ADMIN_SUBS) en desktop-release-hub
    gate: U1✓ U2○  (pass=1 provisional=0 partial=0 open=1)
  ▸ track/ci-release-pipeline/ota-bundle-ci  ● in_progress — TR-14 — Pipeline CI para canal OTA parcial (bundles JS): build+sign hecho, upload al hub pendiente
    gate: U1✓ U2○  (pass=1 provisional=0 partial=0 open=1)

### track/code-signing-multiplatform  ○ queued
0.3.0 — Code signing + multiplatform builds (macOS notarize, Windows codesign) — nunca ejecutado
deps: (ninguna)

### track/production-polish  ○ queued
0.6.0 — Production polish post-deploy: hardening, monitoring, AEAT testing real
deps: (ninguna)

### track/hetzner-research  ○ queued
0.8.0 — Research: Hetzner upgrade KVM nested para builds reproducibles cloud (TKT-09)
deps: (ninguna)

### track/gemini-integration  ○ queued
r5 — gemini-commit-wizard npm publish + SDK mínimo (CommitGenerator + VersionManager + AutoReleaseManagerAI)
deps: (ninguna)

### track/wizard-linux-research  ✓ done
r6 — Wizard GUI Linux: research lane (eval 3-5 candidatos robusto+profesional antes de track build)
completed: 2026-08-22
deps: (ninguna)

### track/lint-baseline  ○ queued
TR-17 — biome lint baseline autofix (33 errores pre-existentes en src/components/)
deps: (ninguna)

### track/wizard-linux-build  ● in_progress  ⚠ sin gate (governance)
Wizard Linux GUI installer — Tauri sidecar pattern (r7)
deps: (ninguna)
milestones:
  ▸ track/wizard-linux-build/e2e-smoke  ○ queued — TR-19.E — E2E smoke del wizard Linux (download AppImage real desde release-hub, install, verify .desktop registry + xdg-mime). Desbloqueado: hub confirmo GET /api/updates + HEAD /api/dl sanos con release Linux 0.1.3 real (verificacion cruzada 2026-08-22, ver progress-log)

### track/lint-baseline-residual-svgs  ○ queued
Lint residuales — SVG title + aria-label (6 trivial)
deps: (ninguna)

### track/lint-baseline-residual-any  ○ queued
Lint residuales — noExplicitAny (7 mayor)
deps: (ninguna)

### track/v0.2.0-ui-overhaul  ● in_progress
v0.2.0 — UI/UX overhaul completo respetando tokens themeable (splash + sidebar + orders flow + AppImage icon)
deps: track/core-tpv✓(done)
refs: audit-ui-state audit-appimage-icon audit-wizard-step5 audit-skills-uiux
milestones:
  ▸ track/v0.2.0-ui-overhaul/m1-design-foundation  ✓ done — M1 — Design system foundation (tokens OKLCH 4 temas + TPV Amber brand + AnimatedNumber count-up + CSS scoping refactor + CVA variants)
    gate: U1✓ U2✓ U3✓  (pass=3 provisional=0 partial=0 open=0)
  ▸ track/v0.2.0-ui-overhaul/m2-splash-auth  ✓ done — M2 — Splash + Auth shell (AppSplash rewrite 213→50 LOC + LicenseSplash refresh + Onboarding unificado + fix wizard step 5 single provider)
    gate: U1✓ U2✓ U3✓ U4✓  (pass=4 provisional=0 partial=0 open=0)
  ▸ track/v0.2.0-ui-overhaul/m3-sidebar-nav  ✓ done — M3 — Sidebar + Navigation shell (Sidebar con depth + BottomNavigation + SectionHeader + shell unificado)
    gate: U1✓ U2✓ U3✓ U4~  (pass=3 provisional=1 partial=0 open=0)
  ▸ track/v0.2.0-ui-overhaul/m4-orders-flow  ✓ done — M4 — Orders flow POS (NewOrder + OrderPanel + PaymentModal + CVA variants + animaciones tabular-nums + 5 archivos CSS legacy eliminados)
    gate: U1✓ U2✓ U3✓ U4✓ U5~ U6✓  (pass=5 provisional=1 partial=0 open=0)
  ▸ track/v0.2.0-ui-overhaul/m5-rest-sections  ✓ done — M5 — Resto de sections (Home refinar + Products + Customers + AEAT + History + Settings + AuditLog)
    gate: U1✓ U2✓ U3✓ U4✓ U5✓ U6✓ U7○  (pass=6 provisional=0 partial=0 open=1)
  ▸ track/v0.2.0-ui-overhaul/m6-polish-icon  ✓ done — M6 — Polish rubric + layout-integrity blockers + AppImage icon fix (R1+R6+R9+R7+R10+R11+R3+R2 surgical + 16-polish + 512x512/category/publisher)
    gate: U1✓ U2✓ U3✓ U4✓ U5✓ U6✓ U7~  (pass=6 provisional=1 partial=0 open=0)
  ▸ track/v0.2.0-ui-overhaul/m7-release  ✓ done — M7 — Release v0.2.0 (bump versions + release notes + tag + push + CI publish + smoke Linux+Windows)
    gate: U1✓ U2✓ U3✓ U4✓ U5✓ U6○  (pass=5 provisional=0 partial=0 open=1)

## Decisiones locked: 0

## Deferred: 0

## Experimentos adyacentes: 0

---

## ⚠⚠ GOVERNANCE (1)
  ⚠⚠ GOVERNANCE  track/wizard-linux-build  [track-in-progress-without-gate]
      track track/wizard-linux-build está in_progress pero no tiene gate (ni propia ni en milestones) — un track en curso exige criterio de salida representado
