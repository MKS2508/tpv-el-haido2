# Technical Debt - Estado Actual

**Última actualización**: 2026-05-09 20:15 (agente completado)
**Estado**: ✅ Explorado - debt significativo detectado

## isTauri() Scattered

**CLAUDE.md claim**: "5 different isTauri() implementations"

### Realidad: **2 implementaciones** (menos grave que claim)
1. `/src/services/platform/PlatformDetector.ts:1-6` - Implementación base
2. `/src/services/platform/index.ts:34` - Wrapper con console.log adicional
3. `/src/utils/environment.ts` - Re-export sin implementación propia

### Veredicto
- ✅ **Menos grave** de lo que parecía
- ⚠️ Pero aún hay duplicación innecesaria

## invoke() Scattered

**CLAUDE.md claim**: "16+ files call invoke() directly"

### Realidad: **20 llamadas en 4 archivos**

| Archivo | invoke() calls | Notas |
|---------|----------------|-------|
| **Audit service** | 1 | `check_license_status` |
| **TauriPlatformService** | 3 | License commands |
| **SQLite Storage Adapter** | 16 | CRUD operations |
| **Thermal Printer Service** | 1 | `write_json_config` |

### Veredicto
- ✅ **Menos disperso** de lo que parecía (solo 4 archivos)
- ⚠️ Pero SQLite adapter usa invoke() directamente (esperado)
- 🔴 **Issue**: No usa PlatformService abstraction

## Test Coverage

**CLAUDE.md claim**: "Zero test coverage"

### Realidad: **0% confirmado** 🔴

| Métrica | Valor |
|---------|-------|
| **Total test files** | 0 |
| **Total .ts files** | 149 |
| **Coverage** | 0% |

### Veredicto
- 🔴 **CRITICAL**: No hay ABSOLUTAMENTE ningún test
- **Risk**: Refactors serán peligrosos
- **Action**: Prioridad alta agregar tests (deferido a post-production)

## Console Logging (sin logger)

### Realidad: **30+ console.log/error statements**

| Archivo | Console count |
|---------|---------------|
| `/src/models/ThermalPrinter.ts` | 15 |
| `/src/services/thermal-printer.service.ts` | 15 |

### Veredicto
- 🔴 **CRITICAL**: Logging descontrolado
- **Issue**: No usa `@mks2508/better-logger` (instalado pero no usado)
- **Action**: Reemplazar todos console.log/logger calls

## TODOs / FIXMEs

### Realidad: **NONE encontrados** ✅
- No hay comentarios TODO o FIXME en el código
- **Bueno**: Código está limpio de pendientes explícitos

## Type Safety Issues

### Realidad: **4 type assertions `: any`**

| Archivo | Context |
|---------|---------|
| `/src/models/Product.ts` | Icon type - `Component<JSX.IntrinsicElements> \| ((props: any) => JSX.Element)` |
| `/src/hooks/useAEATSidecar.ts` | Error handling - `(error: any)` |
| `/src/hooks/useUpdater.ts` | Event callbacks - `(event: any)` |

### Veredicto
- ⚠️ **Medium**: No es terrible pero podría mejorarse
- **Action**: Reemplazar `any` con tipos proper

## Priority Issues to Fix

### 🔴 CRITICAL (Blockers para producción)

1. **Tests cero** - 0% coverage
   - **Risk**: Bugs no detectados, refactors peligrosos
   - **Action**: Deferido a post-production (TKT-06)

2. **Logging descontrolado** - 30+ console.log/error
   - **Risk**: Difficult debugging en production
   - **Action**: Migrar a `@mks2508/better-logger` (TKT-05)

3. **Hardcoded master credentials** - `lib.rs:282-284`
   - **Risk**: Security issue
   - **Action**: Mover a env vars ANTES de production (TKT-01.1)

4. **Thermal printer binary missing** - `binaries/thermal-printer-cli`
   - **Risk**: Printer no funcionará en production
   - **Action**: Incluir binary en repo o documentar instalación (TKT-02)

### ⚠️ MEDIUM (Post-production)

5. **invoke() scattered** - 20+ llamadas sin PlatformService
   - **Action**: Refactor a usar PlatformService (deferido)

6. **Platform detection duplicada** - 3 archivos con isTauri()
   - **Action**: Consolidar en singleton (deferido)

7. **Type assertions inseguros** - 4+ `: any`
   - **Action**: Reemplazar con tipos proper (deferido)

### ✅ LOW (Opcional)

8. **TODOs no documentados** - No hay items pendientes
   - **Bueno**: Código está limpio

## Conclusión

Technical debt es **manejable** para production milestone. Los críticos son:
1. Hardcoded credentials (quick fix)
2. Printer binary (documentar o incluir)
3. Logging (puede esperar post-production?)

Tests están completamente ausentes pero eso es **expected** para MVP v1.

---

**Agente**: `a5047a79d10e10ec3` ✅ completado (1:23 min)
