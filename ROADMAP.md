# Roadmap — TPV El Haido

> Source of truth: [`roadmap.spec.yml`](./roadmap.spec.yml). Este doc se regenera desde la spec.
> Última actualización: 2026-05-09 (post r1 decision lock)

**Target milestone**: Production deployment at brother's bar (2026-05-09 night)
**Workflow**: Max agent orchestration + parallelization
**Naming scheme**: semver-like (0.X.Y)
**Decision doc**: [`docs/decisions/r1-deployment-architecture-2026-05-09.md`](./docs/decisions/r1-deployment-architecture-2026-05-09.md)

---

## Tabla resumen

| Fase | Goal | Status | Priority | Effort |
|---|---|---|---|---|
| 0.1.0 | Core TPV + SolidJS migration + AEAT compliance | ✅ done | — | — |
| 0.2.0 | PWA + platform abstraction consolidation | ✅ done | — | — |
| 0.3.0 | Code signing + multiplatform builds | ⏳ queued | low | — |
| **0.4.0** | **Production deploy: tpv-cloud + NSIS + OTA (sin GitHub)** | 🔥 **next** | **critical** | **~6-8h** |
| 0.4.0.A | Master license fallback hardening | next | critical | 30m |
| 0.4.0.B | Build tpv-cloud unified (Bun + Elysia + Drizzle) | next | critical | 3-4h |
| 0.4.0.C | Update tauri.conf.json endpoints | next | critical | 30m |
| 0.4.0.D | Build NSIS en máquina del bar + first install | next | critical | 1-2h |
| 0.4.0.E | Smoke test OTA end-to-end | next | critical | 30m |
| 0.4.0.F | Cleanup license-server old | queued | low | 15m |
| 0.5.0 | Thermal printer integration | ⏸️ **deferred** | high | TBD |
| 0.6.0 | Production polish (post-deploy) | ⏳ queued | medium | — |
| 0.7.0 | Testing infrastructure | ⏳ queued | low | — |
| 0.8.0 | Hetzner upgrade research (post-prod reminder) | ⏳ queued | low | — |

---

## Fase 0.4.0 — Production Deploy (CRITICAL)

**Decisiones lockeadas** en [r1](./docs/decisions/r1-deployment-architecture-2026-05-09.md):

- **D1** Sin GitHub — distribución 100% via Coolify
- **D2** `tpv-cloud` unified service (Bun + Elysia + Drizzle)
- **D3** DB nueva `tpv-cloud-db` (Postgres) en project haido
- **D4** Build Windows en máquina del bar (1 vez), después OTA
- **D5** `tauri.conf.json` endpoints → `updates.mks2508.systems`
- **D6** License-server old: replace, no revivir
- **D7** HaidoDocs: ya done, no tocar
- **D8** Printer (0.5.0): postponed
- **D9** Orden: paralelo donde se pueda

### Sub-fases (con dependency map)

```
0.4.0.A (master license hardening)  ──┐
                                       ├──> 0.4.0.D ──> 0.4.0.E ──> 0.4.0.F
0.4.0.B (build tpv-cloud) ────────────┤
                                       │
0.4.0.C (update tauri.conf) ──────────┘ (depends on B)
```

**Paralelizable**: 0.4.0.A + 0.4.0.B (agents distintos). 0.4.0.C depende de B (necesita endpoint vivo). 0.4.0.D depende de A+B+C.

### Tickets

| Ticket | Sub-phase | Effort | Status |
|---|---|---|---|
| [TKT-01.1](./docs/tickets/TKT-01.1-fix-hardcoded-credentials.md) (reformulado) | 0.4.0.A | 30m | proposed |
| [TKT-07](./docs/tickets/TKT-07-build-tpv-cloud.md) | 0.4.0.B | 3-4h | proposed |
| [TKT-08](./docs/tickets/TKT-08-update-tauri-conf.md) | 0.4.0.C | 30m | proposed |
| [TKT-04](./docs/tickets/TKT-04-windows-production-setup.md) (reformulado) | 0.4.0.D | 1-2h | proposed |
| [TKT-10](./docs/tickets/TKT-10-smoke-test-ota.md) | 0.4.0.E | 30m | proposed |
| [TKT-11](./docs/tickets/TKT-11-cleanup-old-license-server.md) | 0.4.0.F | 15m | proposed |

### Tickets superseded por r1

- ~~TKT-01 (audit GitHub updater)~~ → reemplazado por TKT-08 (update endpoints sin GitHub)
- ~~TKT-03 (Coolify migration monolítico)~~ → split: HaidoDocs done, license-server reemplazado por TKT-07 (tpv-cloud)

---

## Fase 0.5.0 — Thermal Printer (DEFERRED)

**Status**: postponed por r1 D8.

**Razones**:
- Necesita research hardware (qué printer, qué protocolo soporta)
- Posible integración con CUPS via Raspberry Pi (network printer) requiere setup separado
- Decisión arquitectónica (TCP / USB / RPi-CUPS) depende de testing en situ

**Re-evaluar**: cuando waxin pueda testear printer en bar.

**Tickets relacionados**:
- [TKT-02](./docs/tickets/TKT-02-thermal-printer-windows.md) — status: deferred, needs reformulation post-research

---

## Fase 0.8.0 — Hetzner Upgrade Research (POST-PROD REMINDER)

🔔 **Lockeado en r1 como reminder**: investigar coste y opciones para server con KVM nested.

**Útil para**: builds Windows reproducibles cloud (dockur/windows o equivalente).

**Opciones a evaluar**:
- Hetzner Robot/Dedicated (AX/EX series) — bare-metal, KVM nativo
- AWS EC2 `.metal` instances
- OVH dedicated
- DigitalOcean droplet con nested virt habilitado

**Ticket**: [TKT-09-research-hetzner-upgrade](./docs/tickets/TKT-09-research-hetzner-upgrade.md)

---

## Decisiones lockeadas (cronológico)

### 2026-05-09 — Production milestone priority
Auto-updates + thermal printers eran críticos. Printer postpone a 0.5.0 deferred.

### 2026-05-09 — Coolify migration
Stack unificado en Coolify lab1.

### 2026-05-09 (r1) — Sin GitHub
Distribución 100% propia desde Coolify (`updates.mks2508.systems`).

### 2026-05-09 (r1) — Arquitectura tpv-cloud unified
Bun + Elysia + Drizzle consolida updates + license. Replace license-server roto.

### 2026-05-09 (r1) — DB tpv-cloud-db en project haido
PostgreSQL dedicada via `coolify-cli db create`, no cross-project sharing.

### 2026-05-09 (r1) — Build Windows en bar (1 vez)
dockur/windows descartado (Hetzner Cloud sin KVM nested verificado). Build directo en máquina del bar, después OTA.

### 2026-05-09 (r1) — Printer postpone
Postpone scope tonight, re-evaluar tras hardware testing.

---

## Deferred items

| Item | Reason |
|---|---|
| Code signing + multiplatform builds (0.3.0) | No crítico para producción inicial |
| Testing infrastructure (0.7.0) | Post-production focus |
| Tauri Mobile support (iOS/Android) | Post-production milestone |
| Thermal printer integration (0.5.0) | Requires hardware testing + CUPS/RPi setup |

---

**Source**: `roadmap.spec.yml` (canónico, regenerar este doc cuando cambie la spec).
