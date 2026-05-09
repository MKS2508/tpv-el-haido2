# TKT-06 - Add Basic Test Coverage (Unit + Integration)

**Milestone**: 0.7.0 (Post-production testing infrastructure)
**Priority**: ⚠️ MEDIUM - Quality debt
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 8-12h (testing infrastructure + initial tests)

## Context

Exploración reveló **0% test coverage**:
- Total test files: **0**
- Total .ts files: **149**
- Coverage: **0%**

**Por qué es un problema**:
- Refactors son peligrosos sin tests
- Bugs no se detectan hasta producción
- Cambios en código roto no se notan

**Stack disponible**:
- Vitest configurado (ver CLAUDE.md - REGLA 15)
- `@testing-library` para componentes SolidJS

## Scope

### IN scope
- ✅ Configurar Vitest correctamente (si no lo está)
- ✅ Escribir tests críticos para:
  - Store actions (add/remove from order, etc.)
  - Storage adapters (SQLite, HTTP, IndexedDB)
  - Hooks (useUpdater, useScreenshot)
  - Models (validaciones)
- ✅ Configurar CI para correr tests automáticamente
- ✅ Alcanzar **20% coverage** mínimo (mínimo viable)

### OUT of scope
- ❌ E2E tests (Playwright, etc.) - overkill ahora
- ❌ Visual regression tests - post-production
- ❌ 100% coverage - unrealistic para MVP

## Dependencies

- TKT-01 through TKT-04 deben estar completos (production first)

## Acceptance Criteria

- [ ] **Vitest configurado**: `bun run test` funciona
- [ ] **Tests críticos escritos**: Store + storage adapters + hooks
- [ ] **Coverage ≥ 20%**: `bun run test:coverage` reporta ≥20%
- [ ] **CI configurado**: Tests corren en push/PR
- [ ] **Documentado**: `/docs/development/testing.md` creado

## Technical Notes

**Patrón de tests**:

```typescript
// Example: store actions
import { describe, it, expect } from 'vitest';
import useStore from '@/store/store';

describe('Store - Order Management', () => {
  it('should add item to order', () => {
    const [store, { addToOrder }] = useStore();
    const order = createTestOrder();
    
    addToOrder(order.id, testProduct);
    
    expect(store.orders[order.id].items).toHaveLength(1);
  });

  it('should remove item from order', () => {
    // ...
  });
});
```

**Comandos útiles**:
```bash
# Verificar que Vitest está instalado
grep -r "vitest" package.json

# Correr tests
bun run test
bun run test:coverage

# Ver coverage report
open coverage/index.html
```

## Sub-tasks

### Setup (1h)
- [ ] 1. Verificar Vitest configurado en `vite.config.ts`
- [ ] 2. Crear `vitest.setup.ts` si no existe
- [ ] 3. Configurar coverage reporter
- [ ] 4. Test: `bun run test` funciona sin tests

### Store tests (2h)
- [ ] 5. Tests para addToOrder / removeFromOrder
- [ ] 6. Tests para table management
- [ ] 7. Tests para order completion
- [ ] 8. Tests para storage adapter selection

### Storage adapter tests (3h)
- [ ] 9. Tests para SQLite adapter (CRUD)
- [ ] 10. Tests para HTTP adapter (si es testeable unitariamente)
- [ ] 11. Tests para IndexedDB adapter (mock localStorage)

### Hooks tests (2h)
- [ ] 12. Tests para useUpdater (mock Tauri commands)
- [ ] 13. Tests para useScreenshot (mock file system)
- [ ] 14. Tests para useAEATSidecar (mock sidecar)

### CI setup (1h)
- [ ] 15. Configurar GitHub Actions workflow
- [ ] 16. Verificar que tests corren en push

### Docs (30min)
- [ ] 17. Crear `/docs/development/testing.md`
- [ ] 18. Documentar patterns y conventions

## Blocked by

- TKT-01, TKT-02, TKT-03, TKT-04 (production blockers first)

## Blocks

- Nada - calidad de código a largo plazo

## References

- Vitest docs: https://vitest.dev/
- SolidJS Testing: https://solid-js.github.io/solid-testing-library/
