# Propuestas para /interview - Milestones Críticos

**Enfoque**: 2 propuestas CONCRETAS para los milestones de esta noche (0.4.0 y 0.5.0)

---

## Propuesta 0.4.0: Auto-update + Coolify + Windows Production

### Contexto Crítico

**BLOCKER para producción**: Windows machine en bar de tu hermano con acceso limitado.

**Sub-fases**:
- 0.4.0.A: Audit updater (2-3h)
- 0.4.0.B: Coolify license server (2-3h)
- 0.4.0.C: HaidoDocs (1-2h, **postponable**)
- 0.4.0.D: Windows production setup (2-3h)

### Findings de Agentes

**TKT-03 + TKT-04** - Issues detectados:
- Build strategy NO clara (cross-compile vs native)
- Smoke test INSUFICIENTE (test básico, no update real)
- HaidoDocs puede ir a CDN en lugar de Coolify

### Decisión Arquitectónica

**Recomendación** (mejor opción, más costosa):

1. **Windows Build**: GitHub Actions (Windows runner)
   - ❌ NO cross-compilar desde Mac (experimental)
   - ✅ Code signing ya configurado
   - ✅ Releases automatizados

2. **Auto-updater**: Multi-source
   - Primary: GitHub Releases
   - Fallback: Mirror en VPS Helsinki
   - ✅ Elimina SPOF crítico

3. **Coolify**: License server SOLAMENTE
   - HaidoDocs → CDN (Cloudflare Pages)
   - ✅ Más rápido para España
   - ✅ Más barato

### Diagrama

**Ver**: `/tmp/0.4.0-deployment.html` (abierto en navegador)

### Coste vs Beneficio

| Item | Coste | Beneficio |
|------|-------|----------|
| GitHub Actions setup | 2-3h | Builds automatizados |
| Multi-source updater | 3-4h | Resilience (SPOF eliminado) |
| Coolify license server | 2-3h | Services manageables |
| HaidoDocs CDN | 1-2h | Performance |
| **Total** | **8-12h** | **Production-ready** |

**Ratio**: ✅ **VALE LA PENA** - Inversión de 1 día por architectural correctness

---

## Propuesta 0.5.0: Thermal Printer Integration

### Contexto Crítico

**BLOCKER para producción**: Printer debe funcionar para abrir el bar.

**Problema descubierto** (Agent 2):
- ❌ Binary sidecar `thermal-printer-cli` NO existe
- ❌ Modelo `ThermalPrinter.ts` es 100% stub (console.log)
- ⚠️ 4-6h es **irreal** → más bien 16-24h reales

### Decisión Arquitectónica

**Recomendación** (mejor opción, más costosa):

**Fase 1 - MVP Network TCP (2-4h)**:
- ❌ Eliminar sidecar approach (binary no existe)
- ✅ Implementar TCP directo desde Rust
- ✅ Usar `tokio` + `socket2` crate
- ✅ Comandos ESC/POS básicos (text, cut, cash drawer)
- ✅ Frontend: `invoke('print_order', { orderId })`

**Fase 2 - USB Serial (post-MVP, 8-12h)**:
- ✅ Agregar `serialport` crate en Rust
- ✅ Si USB falla → fallback a RPi network

### Diagrama

**Ver**: `/tmp/0.5.0-printer.html` (abierto en navegador)

### Coste vs Beneficio

| Fase | Coste | Beneficio |
|------|-------|----------|
| Fase 1: TCP MVP | 2-4h | **Funcional HOY**, sin stubs |
| Fase 2: USB Serial | 8-12h | Flexibilidad (printer local) |
| **MVP Total** | **2-4h** | **Production-ready** |

**Ratio**: ✅ **VALE LA PENA** - MVP en 4h vs 16-24h del approach actual

---

## Resumen para /interview

**Dos decisiones arquitectónicas concretas**:

1. **0.4.0**: GitHub Actions + Multi-source Updater + Coolify (license only) + CDN (docs)
2. **0.5.0**: TCP Network MVP (2-4h) → USB Serial (post-MVP)

**Diagramas abiertos** en navegador para visualizar.

---

**Última actualización**: 2026-05-09 20:40
**Agentes**: 4/5 completados (1 stale)
**Diagramas**: Generados con mks-diagram ✅
