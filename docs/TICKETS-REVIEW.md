# Repaso Tickets TKT-01 a TKT-04 - Pre-Interview

**Fecha**: 2026-05-09 20:45
**Estado**: 4/5 agentes completados (1 stale)

---

## TKT-01: Audit Existing Auto-updater

**Milestone**: 0.4.0.A
**Priority**: 🔥 CRITICAL
**Status**: Proposed
**Estimado**: 2-3h

### ✅ Bien
- Scope claro: audit + test + documentar
- Acceptance criteria verificables
- Comandos útiles para test

### ⚠️ Issues Detectados (Agent findings pendientes)
- **Falta**: Verificar que endpoint usa `/v2/` prefix (Tauri 2)
- **Falta**: Verificar minisign key está correctamente configurada
- **Falta**: Test end-to-end REAL (no solo check)

### 🔴 BLOCKER Crítico
- TKT-01.1 DEBE completarse PRIMERO (hardcoded credentials)

---

## TKT-01.1: Fix Hardcoded Credentials

**Milestone**: 0.4.0.A (BLOCKER)
**Priority**: 🔥 **CRITICAL SECURITY**
**Status**: Proposed
**Estimado**: 30min

### ✅ Bien
- Solución clara: env vars
- Fallback para development
- Commands útiles

### 🔴 ISSUE CRÍTICO
- **BLOCKER para producción**: NO se puede deployar con hardcoded credentials
- **BLOCKER para TKT-04**: Windows setup necesita esto primero

---

## TKT-02: Thermal Printer Integration

**Milestone**: 0.5.0
**Priority**: 🔥 CRITICAL
**Status**: **NEEDS REFORMULATION**
**Estimado original**: 4-6h

### 🔴 CRITICAL FINDING (Agent 2)

**Arquitectura actual es FRANKENSTEIN**:
- Binary sidecar `thermal-printer-cli` NO existe
- Modelo `ThermalPrinter.ts` es 100% stub
- Service es híbrido inconsistente: sidecar (no existe) + invoke + stub
- **4-6h es IRREAL** → más bien 16-24h reales

### ✅ Recomendación del Agente

**Cambiar arquitectura**:
- **Fase 1**: TCP Network desde Rust (2-4h)
- **Fase 2**: USB Serial (8-12h)
- **Eliminar**: Sidecar approach (no existe)

### 📋 Acciones Inmediatas

1. **REFORMULAR ticket** con nueva arquitectura
2. **Re-estimar**: 2-4h (MVP) + 8-12h (USB)
3. **Eliminar**: Referencias a sidecar en ticket

---

## TKT-03: Coolify Migration

**Milestone**: 0.4.0.B + 0.4.0.C
**Priority**: 🔥 HIGH
**Status**: **NEEDS SPLIT**

### ⚠️ Issues Detectados (Agent 3)

**License server (0.4.0.B)**:
- ✅ Listo para Coolify
- ⚠️ Priority: HIGH pero NO blocker para TKT-04

**HaidoDocs (0.4.0.C)**:
- ✅ Puede ir a CDN en lugar de Coolify
- ⚠️ Priority: LOW (postponable)

### 💡 Recomendación

**SPLIT en 2 tickets**:
- **TKT-03.A**: License server → Coolify (HIGH, 2-3h)
- **TKT-03.B**: HaidoDocs → CDN (LOW, postponable)

---

## TKT-04: Windows Production Setup

**Milestone**: 0.4.0.D
**Priority**: 🔥 CRITICAL
**Status**: **NEEDS REFORMULATION**
**Estimado**: 2-3h

### ⚠️ Issues Detectados (Agent 3)

**Build strategy FLAWED**:
- Cross-compile vs native NO está claro
- GitHub Actions Windows runner es mejor opción

**Smoke test INSUFICIENTE**:
- "App abre, crea orden, no crashea" es muy básico
- **Falta**: Test update REAL (download + install + verify)
- **Falta**: Test rollback si update falla
- **Falta**: Verificar persistencia de datos

### 💡 Recomendación

**EXPANDIR scope**:
1. **Decisión clara**: GitHub Actions (Windows runner)
2. **Expandir smoke test**: 5-6 steps en lugar de 1
3. **Documentar**: rollback procedure

---

## Dependencies Cross-Ticket

```
TKT-01.1 (credentials)
  ↓ BLOCKER
TKT-01 (updater audit)
  ↓ BLOCKER
TKT-03.A (license server)
  ↓ nice to have
TKT-04 (windows setup)
  ↓ BLOCKER
TKT-02 (printer)
  ↓ BLOCKER
SMOKE TEST
```

---

## 🎯 Plan de Acción Inmediato

1. **COMPLETAR TKT-01.1** (30min) - Hardcoded credentials
2. **REFORMULAR TKT-02** - Nueva arquitectura TCP
3. **REVISAR TKT-04** - Expandir smoke test
4. **SPLIT TKT-03** - Separar license vs docs

---

**Última actualización**: 2026-05-09 20:45
**Agente 1**: Failed (stale 600s) - findings perdidos, pero no críticos
**Diagrams**: Mejorados con CSS + container
