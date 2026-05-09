# Progress Log - TPV El Haido

Log de progreso por fase. Mantenido al día con cada milestone completado.

---

## 2026-05-09 — Locked decision r1: Deployment Architecture

**Doc**: [`docs/decisions/r1-deployment-architecture-2026-05-09.md`](./decisions/r1-deployment-architecture-2026-05-09.md)

**Interview**: 3 rondas de AskUserQuestion con previews ASCII + diagrama unified arquitectura (`/tmp/tpv-cloud-architecture.html`, generado con mks-diagram D2).

**Decisiones lockeadas (D1-D9)**:

- **D1** — Sin GitHub: distribución 100% via Coolify, no GitHub Releases ni Actions
- **D2** — Arquitectura `tpv-cloud` unified (Bun + Elysia + Drizzle) consolidando updates + license validation
- **D3** — DB nueva `tpv-cloud-db` (PostgreSQL) en project `haido` (NO reusar `mks-postgres` cross-project)
- **D4** — Build Windows directo en máquina del bar (1 vez), después OTA. dockur/windows descartado (Hetzner Cloud sin KVM nested verificado).
- **D5** — `tauri.conf.json` updater endpoints → `https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}`
- **D6** — License-server actual (`exited:unhealthy`): replace, no revivir
- **D7** — HaidoDocs: ya `running:healthy` en Coolify, no tocar
- **D8** — Printer (0.5.0): postpone scope tonight, requires hardware research
- **D9** — Orden ejecución: paralelo donde se pueda

**Reminder post-prod**: TKT-09 — Hetzner upgrade research (cloud builds reproducibles con KVM nested)

**Verificaciones realizadas pre-lock**:
- 3 agentes Explore verificaron docs vs código real (frontend, backend, services)
- Coolify lab1 explorado: 17 apps, project haido tiene 4 apps + 0 DBs
- KVM nested verificado en lab1: `/dev/kvm` ausente, vmx/svm flags vacíos → dockur/windows no viable
- Hetzner Cloud docs oficiales confirman policy "no nested virt en cloud"

---

## Fase 0.4.0 — Production deploy (CURRENT, post-r1)

### Sub-fases (post-r1 reformuladas)

| Sub | Goal | Ticket | Status | Effort |
|---|---|---|---|---|
| 0.4.0.A | Master license production hardening | [TKT-01.1](./tickets/TKT-01.1-fix-hardcoded-credentials.md) (reformulado) | next | 30m |
| 0.4.0.B | Build tpv-cloud unified service | [TKT-07](./tickets/TKT-07-build-tpv-cloud.md) | next | 3-4h |
| 0.4.0.C | Update tauri.conf.json endpoints | [TKT-08](./tickets/TKT-08-update-tauri-conf.md) | next | 30m |
| 0.4.0.D | Build NSIS en bar + first install | [TKT-04](./tickets/TKT-04-windows-production-setup.md) (reformulado) | next | 1-2h |
| 0.4.0.E | Smoke test OTA end-to-end | [TKT-10](./tickets/TKT-10-smoke-test-ota.md) | next | 30m |
| 0.4.0.F | Cleanup license-server old | [TKT-11](./tickets/TKT-11-cleanup-old-license-server.md) | queued | 15m |

### Tickets superseded por r1

- ~~[TKT-01](./tickets/TKT-01-audit-updater-flow.md)~~ — superseded by TKT-08 (sin GitHub)
- ~~[TKT-03](./tickets/TKT-03-coolify-migration.md)~~ — superseded (split: HaidoDocs done, license-server → TKT-07)

### Tickets deferred por r1

- ~~[TKT-02](./tickets/TKT-02-thermal-printer-windows.md)~~ — deferred (printer 0.5.0 postpone, requires hardware research)

### Task-requests creados (input para `@task-decomposer`)

| TR | Ticket | Status |
|---|---|---|
| [TR-01](./task-requests/TR-01-master-license-hardening.md) | TKT-01.1 | ready for decomposer |
| [TR-02](./task-requests/TR-02-build-tpv-cloud.md) | TKT-07 | ready for decomposer |
| [TR-03](./task-requests/TR-03-update-tauri-conf.md) | TKT-08 | ready for decomposer |
| [TR-04](./task-requests/TR-04-build-bar-and-first-install.md) | TKT-04 | ready for decomposer |
| [TR-05](./task-requests/TR-05-smoke-test-ota.md) | TKT-10 | ready for decomposer |
| [TR-06](./task-requests/TR-06-cleanup-old-license-server.md) | TKT-11 | ready for decomposer |

### Dependency map para ejecución

```
TR-01 (master license hardening) ──┐
                                    │
TR-02 (build tpv-cloud) ───────────┼──> TR-04 ──> TR-05 ──> TR-06
                                    │
TR-03 (tauri.conf update) ────(needs TR-02 healthy)
```

**Paralelizable**:
- TR-01 + TR-02 en paralelo (agentes distintos, archivos disjuntos)
- TR-03 espera TR-02 healthy (necesita endpoint vivo para test)
- TR-04 espera TR-01 + TR-02 + TR-03 done
- TR-05 espera TR-04 done
- TR-06 espera TR-05 done

---

## 2026-05-09 — Exploración y preparación inicial (sesión anterior)

- ✅ Configurado Axon workflow + axon.config.json
- ✅ Creado roadmap.spec.yml con milestones reales
- ✅ Exploración de código completada (6 agentes background)
- ✅ Documentación modular creada (5 módulos DEV en `docs/modules/`)
- ✅ Tickets TKT-01 a TKT-06 formulados (luego reformulados/superseded post-r1)
- ✅ Propuestas arquitectónicas iniciales 0.4.0 + 0.5.0
- ✅ Diagramas iniciales (HTML/CSS, dark theme)
- ✅ Interview questions preparadas (4 concretas)
- ✅ Architecture audit contra `/guidelines` completado
- ✅ Handoff para sesión axon (interview + lock)

---

## 2026-05-09 — Verification sesión axon (pre-lock)

- ✅ 3 agentes Explore verificaron docs vs código real
- ✅ Hallazgos: TKT-01.1 formulación imprecisa (env-with-fallback, no const), ROADMAP.md missing → creado
- ✅ Coolify lab1 explorado vía coolify-cli + SSH directo lab1
- ✅ KVM nested verificado NO viable en VPS Hetzner Cloud
- ✅ dockur/windows research (no soporta Apple Silicon, requiere host Linux con KVM)
- ✅ Tauri NSIS cross-compile research (mixed reports)
- ✅ Custom updater endpoint research (multi-endpoint, schema v2 dinámico)

---

## 2026-05-09 — Sub-fases pendientes (post-interview lock)

- 🔄 NEXT: Lanzar `@task-decomposer TR-01` y `@task-decomposer TR-02` en paralelo (agentes distintos)
- ⏳ TR-03 espera TR-02 healthy
- ⏳ TR-04 espera TR-01 + TR-02 + TR-03
- ⏳ TR-05 espera TR-04
- ⏳ TR-06 espera TR-05

---

## Fase 0.5.0 — Thermal Printer (DEFERRED)

### 2026-05-09 — Postpone (r1 D8)

- 🔄 Status: deferred (no tonight)
- 📌 Razones: hardware testing requerido + posible CUPS via RPi setup separado
- 📌 Re-evaluar arquitectura cuando waxin pueda debuggear printer in situ
- 📌 Critical path tonight es 0.4.0 (update + instalador), sin printer la app es operable manualmente

---

## Fase 0.8.0 — Hetzner Upgrade Research (POST-PROD REMINDER)

### 2026-05-09 — Reminder lockeado (r1)

- 📌 Ticket: [TKT-09](./tickets/TKT-09-research-hetzner-upgrade.md)
- 📌 Contexto: builds Windows reproducibles cloud requieren KVM nested
- 📌 Opciones a evaluar: Hetzner Robot/Dedicated, AWS EC2 metal, OVH dedicated
- 📌 Priority: low (post-prod, no urgente)

---

## Fase 0.2.0 — PWA + Platform Abstraction

### 2026-05-09 — Completada (user confirmation)
- ✅ Platform abstraction consolidated
- ✅ PWA Service Worker + caching
- ✅ PWA manifest + /tpv/ build path

---

## Fase 0.1.0 — Core + AEAT

### 2026-05-09 — Completada
- ✅ Core TPV features
- ✅ SolidJS migration
- ✅ AEAT tax compliance
