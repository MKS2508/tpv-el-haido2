# Services Layer - Estado Actual

**Última actualización**: 2026-05-09 20:15 (agente completado)
**Estado**: ✅ Explorado - findings importantes

## Storage Adapters

| Adapter | Estado | Detalles |
|---------|--------|----------|
| **SQLite** | ✅ Real | Usa `invoke()` para comunicación directa con backend Tauri. CRUD completo para todas las entidades. |
| **HTTP** | ✅ Real | Cliente HTTP completo con timeout handling y abort controllers. Usa Tauri HTTP plugin en entorno Tauri. |
| **IndexedDB** | ✅ Real | Implementación completa con offline support y sync queue. Usa localStorage para persistir queue. |

### Issue detectado
- 🔴 **Resource waste**: Los 3 adapters se instancian al startup regardless de mode (`store.ts:89-91`), gastando memoria innecesariamente

## Platform Abstraction

**Interface**: `/src/services/platform/PlatformService.ts`

| Componente | Estado | Uso real |
|------------|--------|----------|
| **PlatformService interface** | ✅ Existe | Interface comprehensiva definida |
| **TauriPlatformService** | ✅ Completo | Implementación full: thermal printer, file dialogs, updates, license management |
| **WebPlatformService** | ✅ Completo | Stubs con browser fallbacks |
| **PlatformDetector** | ⚠️ Issue | `isTauri()` no se cachea - se llama múltiples veces |

### Usage real
- **8+ archivos** usan `getPlatformService()` en toda la app

## Thermal Printer

**Archivo**: `/src/services/thermal-printer.service.ts`

### Status
- ✅ **REAL** - No es stub ni PoC
- Usa `Command.sidecar` para llamar binary externo `thermal-printer-cli`

### ESC/POS commands implementados (7)
- `[ALIGN:CENTER]`
- `[BOLD:ON]` / `[BOLD:OFF]`
- `[CUT]`
- `[IMAGE:...]`
- `[CASH_DRAWER]`

### 🔴 CRITICAL ISSUE para producción
- **Binary externo NO incluido en repo**
- Referenciado como `binaries/thermal-printer-cli`
- **Deployment risk**: Si el binary no existe, el printer no funciona

### Otros issues
- Path handling de `printerSettings.json` puede fallar
- No hay error handling para printer connection failures

## Other Services

| Service | Estado | Notas |
|---------|--------|-------|
| **stock-images.service.ts** | ✅ Real | Mapping service para product images con fallbacks |
| **data-migration.service.ts** | ✅ Real | Bidirectional migration entre HTTP e IndexedDB adapters |

## Critical Findings

### Architectural Issues 🏗️

1. **Storage Adapter Selection**
   - Todos los 3 adapters instanciados al startup
   - **Waste**: Gastan memoria incluso si no se usan
   - **Fix**: Lazy loading basado en storage mode

2. **Platform Detection**
   - `isTauri()` no se cachea
   - **Waste**: Llamado múltiples veces
   - **Fix**: Cache en variable o usar singleton

3. **Thermal Printer Dependency**
   - Binary externo `thermal-printer-cli` no tracked en repo
   - **Risk**: Deployment fallará si binary missing
   - **Fix**: Incluir binary en repo o documentar instalación

### Incomplete Implementations ⚠️

1. **HTTP Adapter Server**
   - Sync queue en IndexedDB solo se limpia
   - No hay sync real al servidor remoto
   - **Missing**: Sync algorithm

2. **PWA Limitations**
   - File dialogs usan browser prompts (poor UX)
   - Thermal printer no disponible en PWA
   - **Expected**: Documentar limitaciones

3. **License System**
   - PWA version bypasses license validation entirely
   - **Security issue**: Cualquiera puede usar sin licencia
   - **Fix**: Implementar licencia para PWA o documentar

4. **Storage Mode Switching**
   - Runtime switching NO implementado
   - Requiere app restart para cambiar modo
   - **Expected**: Documentar o implementar hot-switch

### Conclusión

La arquitectura está bien diseñada con proper abstraction layers, pero necesita:
- Resource management refinement
- Production readiness para thermal printer
- Error handling improvements

---

**Agente**: `a0f70d5c436daf829` ✅ completado (2:10 min)
