# Testing

Baseline de tests unitarios con Vitest, introducido en TR-10 (0.7.0). Cubre `store.ts`
(acciones de order), los storage adapters (SQLite mockeado, IndexedDB con `fake-indexeddb`)
y módulos puros de cálculo/utilidad. Objetivo: **20% de coverage mínimo**, no 100% — es una
base de regresión, no cobertura exhaustiva.

## Cómo correr

```bash
bun run test              # corre todos los tests una vez (vitest run)
bun run test:coverage     # igual, + reporte de coverage (text + html + lcov)
```

El reporte HTML queda en `coverage/lcov-report/index.html` — ábrelo en el navegador para ver
detalle línea por línea de qué está cubierto en cada archivo.

Los tests están co-localizados junto al código que testean (`*.test.ts` al lado del archivo
fuente), no en una carpeta `__tests__/` separada. `tsconfig.json` los incluye en el scope de
`bun run typecheck` (tsgo) porque `include: ["src"]` cubre todo `src/**`.

No hay `test.globals: true` en `vite.config.ts` ni `types: ["vitest/globals"]` en
`tsconfig.json` a propósito — cada test file importa `describe`/`it`/`expect`/`vi`/`beforeEach`
explícitamente desde `'vitest'`.

## Entorno: jsdom + fake-indexeddb

Los tests corren en `environment: 'jsdom'` (configurado en `vite.config.ts`, bloque `test`).
jsdom **no implementa IndexedDB** de forma nativa — es una decisión explícita del proyecto
jsdom, no un bug. Como `src/store/store.ts` instancia `IndexedDbStorageAdapter` a nivel de
módulo (`const indexedDbAdapter = new IndexedDbStorageAdapter()`), importar `store.ts` sin
polyfill revienta con `ReferenceError: indexedDB is not defined`.

Fix: `vitest.setup.ts` (raíz del repo) importa `'fake-indexeddb/auto'`, que registra
`indexedDB`/`IDBKeyRange` en `globalThis` como side-effect global. Está wireado vía
`test.setupFiles` en `vite.config.ts`, así que corre antes que cualquier test file.

`fake-indexeddb` es un singleton en memoria **por proceso de test** (no se resetea entre
tests salvo llamada explícita a `indexedDB.deleteDatabase(...)`). Si escribís un test nuevo
sobre `IndexedDbStorageAdapter`, usá IDs únicos por test (no reutilices los mismos ids entre
`it()` blocks) para evitar colisiones de `store.add()`.

El modo de storage por defecto en el entorno de test resuelve a `'indexeddb'`, no `'sqlite'`
— `isTauri()` devuelve `false` en jsdom (no hay `window.__TAURI_INTERNALS__`), así que
`getInitialStorageMode()` en `store.ts` cae al fallback `'indexeddb'`. Los tests de
`store.test.ts` ejercitan de verdad `IndexedDbStorageAdapter` a través del store, sin mockear
`storageAdapter()`.

## Mockear Tauri `invoke`

Para testear `SqliteStorageAdapter` (que llama `invoke()` de `@tauri-apps/api/core` para
hablar con el backend Rust), mockeamos el módulo completo:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { SqliteStorageAdapter } from '@/services/sqlite-storage-adapter';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('SqliteStorageAdapter', () => {
  let adapter: SqliteStorageAdapter;

  beforeEach(() => {
    adapter = new SqliteStorageAdapter();
    vi.mocked(invoke).mockReset();
  });

  it('getProducts delega en el comando Tauri get_products', async () => {
    vi.mocked(invoke).mockResolvedValueOnce([/* ... */]);
    const result = await adapter.getProducts();
    expect(invoke).toHaveBeenCalledWith('get_products');
    expect(result.ok).toBe(true);
  });
});
```

## Reset del store singleton entre tests

`useStore()` (`src/store/store.ts`) es un singleton creado una sola vez dentro de
`createRoot()` — no expone un hook de reset (y no se le añadió uno para no forzar un refactor
no pedido en producción). El patrón usado en `store.test.ts` es:

```ts
beforeEach(() => {
  store.setActiveOrders([{ ...emptyOrder, items: [] }]);
});
```

Es decir: **resetear el slice relevante vía los setters que ya existen** (`setActiveOrders`,
`setOrderHistory`, `setSelectedOrderId`, etc.), no recrear la instancia del store. Cualquier
test nuevo sobre `store.ts` debe seguir este mismo patrón — si no reseteás el slice que usás,
un test puede leer estado dejado por un test anterior del mismo archivo (los test files no
comparten estado entre sí, pero los `it()` dentro de un mismo `describe` sí, salvo reset
explícito).

## Qué queda fuera de scope (por ahora)

- **Componentes SolidJS / JSX** (`src/components/**`) — excluidos explícitamente del
  `coverage.exclude` en `vite.config.ts`. Requieren `@solidjs/testing-library`, que no se
  instaló en este pase (deferred, no es que no se pueda).
- **Hooks** (`useUpdater`, `useScreenshot`, `useAEATSidecar`, etc.) — mismo motivo, fuera de
  scope pragmático de TR-10.
- **E2E** (Playwright) — fuera de scope explícito del ticket original.
- `src/services/thermal-printer.service.ts` y `src/models/ThermalPrinter.ts` — excluidos de
  este pase porque estaban mid-edit (sin commitear) por otro trabajo en curso en paralelo al
  momento de escribir estos tests. Buenos candidatos para una futura ampliación una vez que
  ese trabajo cierre.
- `src/services/http-storage-adapter.ts` — fuera del scope pragmático ajustado (solo SQLite +
  IndexedDB por ahora).
