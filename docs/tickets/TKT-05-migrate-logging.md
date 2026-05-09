# TKT-05 - Migrate Console Logging to Structured Logger

**Milestone**: 0.6.0 (Post-production polish)
**Priority**: ⚠️ MEDIUM - Quality issue
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 2-3h

## Context

Exploración de código reveló **30+ console.log/error statements** sin logger estructurado:

| Archivo | Console count |
|---------|---------------|
| `/src/models/ThermalPrinter.ts` | 15 |
| `/src/services/thermal-printer.service.ts` | 15 |

**Problema**:
- Logging descontrolado es difícil de debug en producción
- No hay log levels (info, warn, error)
- No hay structured logging (JSON, timestamps)
- No hay log aggregation posible

**Solución disponible**: `@mks2508/better-logger` v4.0.0 ya instalado pero **NO usado**.

## Scope

### IN scope
- ✅ Reemplazar todos `console.log/error` con `logger.component()`
- ✅ Configurar `@mks2508/better-logger` para producción
- ✅ Verificar que logs aparecen correctamente en dev
- ✅ Documentar logging strategy

### OUT of scope
- ❌ Log aggregation (Sentinel, Datadog, etc.) - overkill ahora
- ❌ Log rotation - manejado por el logger

## Dependencies

- None (puede hacerse post-production)

## Acceptance Criteria

- [ ] **console.log eliminados**: 0 instancias en `/src/`
- [ ] **Logger configurado**: `@mks2508/better-logger` importado y usado
- [ ] **Log levels correctos**: info/warn/error usados apropiadamente
- [ ] **Test smoke**: Abrir app y verificar logs en console
- [ ] **Documentado**: `/docs/development/logging.md` creado

## Technical Notes

**Ejemplo de migración**:

```typescript
// ANTES:
console.log('Printer initialized');
console.error('Failed to connect to printer', error);

// DESPUÉS:
import logger from '@mks2508/better-logger';
const printerLog = logger.component('ThermalPrinter');

printerLog.info('Printer initialized');
printerLog.error('Failed to connect to printer', { error });
```

**Archivos a actualizar**:
1. `/src/models/ThermalPrinter.ts` - 15 console.log/error
2. `/src/services/thermal-printer.service.ts` - 15 console.log/error

**Comandos útiles**:
```bash
# Encontrar todos console.log
grep -rn "console\." src/ --include="*.ts" --include="*.tsx"

# Verificar que no quedan después del refactor
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | wc -l
# Output debe ser 0
```

## Sub-tasks

- [ ] 1. Verificar que `@mks2508/better-logger` está instalado
- [ ] 2. Leer docs del logger (o CLAUDE.md global)
- [ ] 3. Migrar `/src/models/ThermalPrinter.ts` (15 console.*)
- [ ] 4. Migrar `/src/services/thermal-printer.service.ts` (15 console.*)
- [ ] 5. Verificar que no quedan más console.* en `/src/`
- [ ] 6. Test en dev: logs aparecen structured en console
- [ ] 7. Documentar logging strategy
- [ ] 8. Commit: "refactor(logging): migrate to @mks2508/better-logger"

## Blocked by

- None (post-production task)

## Blocks

- Nada - calidad de código

## References

- `@mks2508/better-logger` docs: (disponibles en ~/dotfiles o package docs)
- CLAUDE.md global: REGLA 2 - Logging - NUNCA console.log
