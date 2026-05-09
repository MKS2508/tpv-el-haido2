# Frontend SolidJS - Guía de Desarrollo

**Módulo**: Frontend SolidJS (Components, Store, Hooks, Models)
**Stack**: SolidJS 1.9.12, Kobalt UI, Tailwind CSS 4.1
**Última actualización**: 2026-05-09 (basado en exploración de código real)

---

## Consideraciones Arquitectónicas

### Separación de Responsabilidades (BLO Pattern)

El código sigue el patrón **BLO** (Business Logic Organization):

```
Component (UI) → Handler (Lógica) → Hook (Reactividad) → Store (Estado)
```

**Ejemplo real** - `ProductCard`:
```
components/ProductCard/
├── index.tsx              # Solo UI (presentación)
├── ProductCard.handler.ts # Lógica de negocio (TS puro)
├── ProductCard.hook.ts    # Puente reactivo (SolidJS)
└── ProductCard.types.ts   # Interfaces TypeScript
```

**Regla de oro**: 
- ✅ Componentes SOLO renderizan UI
- ✅ Handlers tienen lógica de negocio pura
- ✅ Hooks conectan handlers con store
- ❌ NUNCA mezclar lógica en componentes

### Store Pattern (SolidJS + Produce)

**Archivo**: `/src/store/store.ts`

```typescript
// Pattern: createStore + produce (Immer-like manual)
const [state, setState] = createStore<AppState>({...});

// Update inmutable con produce
setState(produce((s) => {
  s.orders.push(newOrder); // Produce lo hace inmutable
}));

// Batch updates (prevenir re-renders múltiples)
batch(() => {
  setState('orders', orders);
  setState('selectedOrder', order);
});
```

**Reglas**:
- ✅ Usar `produce` para updates complejos
- ✅ Usar `batch` para múltiples updates
- ✅ Access state reactivo: `store.state.orders`
- ❌ NO mutar state directamente (rompe reactividad)

### Error Handling (Result Pattern)

**Uso obligatorio** de `@mks2508/no-throw`:

```typescript
import { tryCatchAsync, isErr, unwrapOr } from '@mks2508/no-throw';

const result = await tryCatchAsync(
  async () => invoke('get_products'),
  StorageErrorCode.ReadFailed
);

if (isErr(result)) {
  // Manejar error
  return;
}

// Usar result.value
const products = result.value;
```

**Regla**: TODA operación fallible debe devolver `Result<T, E>`.

---

## Componentes UI - Patrones

### Componentes con Secciones

**Ubicación**: `/src/components/Sections/`

Todos los sections siguen este patrón:

```typescript
// Home.tsx
export default function Home() {
  const products = useStore((s) => s.products);
  const { loadProducts } = useProductsHandler();
  
  return (
    <div class="home-container">
      {/* UI pura, sin lógica */}
    </div>
  );
}
```

**Reglas**:
- ✅ Components son **presentacionales** solo
- ✅ Lógica va en **handlers** (si es compleja)
- ✅ Hooks conectan handlers + store
- ✅ Responsive design: mobile-first → desktop
- ❌ NO `useEffect` para derivar datos (usar memos)

### Performance Optimizations

El código usa estas optimizaciones:

1. **Virtual lists** para datasets grandes
   ```typescript
   import { VirtualList } from '@tanstack/solid-virtual';
   // Para listas >100 items
   ```

2. **Memoization** con `createMemo`
   ```typescript
   const filteredProducts = createMemo(() => 
     products().filter(p => p.category === selectedCategory())
   );
   ```

3. **Lazy loading** de componentes pesados
   ```typescript
   const Settings = lazy(() => import('./Sections/Settings'));
   ```

**Regla**: Usar estas optimizaciones cuando datasets >100 items o renders >10x/segundo.

---

## Hooks - Custom Patterns

### useUpdater (Tauri Auto-updater)

**Ubicación**: `/src/hooks/useUpdater.ts`

```typescript
// Pattern: Resource de SolidJS para estado async
const [updater, { check, download, install }] = createResource(
  () => invoke('check_update'),
  { initialValue: null }
);
```

**Consideraciones**:
- ✅ Usa `@tauri-apps/plugin-updater`
- ✅ Progress tracking con callbacks
- ⚠️ Requiere testing en Windows real

### useScreenshot

**Ubicación**: `/src/hooks/useScreenshot.ts`

```typescript
// Pattern: Comando Tauri + save file
const screenshot = await invoke('save_screenshot_from_base64', {
  base64Data,
  filename
});
```

**Consideraciones**:
- ✅ Base64 encoding/decoding en backend
- ✅ Cross-platform paths (Tauri resuelve)
- ⚠️ No hay error handling robusto

### useAEATSidecar

**Ubicación**: `/src/hooks/useAEATSidecar.ts`

```typescript
// Pattern: Sidecar health check + lifecycle
const sidecarStatus = await invoke('check_sidecar_health');
```

**Consideraciones**:
- ✅ Monitorea sidecar AEAT
- ✅ Retry logic con exponential backoff
- ⚠️ Sidecar debe estar running antes de usar

---

## Models - Sync con Backend

**Regla crítica**: Models TypeScript DEBEN match exactamente con structs Rust.

**Ejemplo** - `Order.ts`:
```typescript
// TypeScript DEBE match Rust
export interface Order {
  id: string;
  table_id: string;
  items: OrderItem[];
  created_at: string; // ISO string
  updated_at: string;
}

// Rust backend DEBE tener:
// struct Order {
//   id: String,
//   table_id: String,
//   items: Vec<OrderItem>,
//   created_at: String,
//   updated_at: String,
// }
```

**Verificación**:
- ✅ Todos los models están en sync
- ⚠️ OrderItem missing `id` field (bug en backend)

---

## Anti-Patterns a Evitar

### ❌ useEffect para derivar datos

```typescript
// MAL
useEffect(() => {
  setFiltered(products().filter(...));
}, [products()]);

// BIEN
const filtered = createMemo(() => 
  products().filter(...)
);
```

### ❌ Estado local duplicando state global

```typescript
// MAL
const [localProducts, setLocalProducts] = createSignal([]);
// Usar store.state.products directamente

// BIEN
const products = useStore((s) => s.products);
```

### ❌ Props drilling profundo

```typescript
// MAL
<ComponentA data={data} />
  <ComponentB data={data} />
    <ComponentC data={data} />

// BIEN - Usar store o context
const data = useStore((s) => s.data);
```

---

## Testing Strategy (FUTURO)

**Estado actual**: 0% coverage

**Planned** (TKT-06):
- Unit tests para hooks (mock Tauri commands)
- Component tests para sections (solid-testing-library)
- Integration tests para store actions

**Patrón de tests**:
```typescript
describe('useUpdater', () => {
  it('should check for updates', async () => {
    const { check } = renderHook(() => useUpdater());
    await check();
    // Assertions...
  });
});
```

---

## Referencias

- SolidJS docs: https://www.solidjs.com/
- Store pattern: `/src/store/store.ts`
- BLO examples: `/src/components/Sections/NewOrder/`
- Error handling: `@mks2508/no-throw` package
