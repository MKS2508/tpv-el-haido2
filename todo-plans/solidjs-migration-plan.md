# Plan de Migración: React → SolidJS

> **Objetivo**: Migrar el frontend de React a SolidJS para mejorar rendimiento y reducir consumo de memoria en dispositivos de bajos recursos.

## Resumen Ejecutivo

| Métrica | React (actual) | SolidJS (objetivo) |
|---------|----------------|-------------------|
| Bundle size | ~100 KB | ~10-15 KB |
| RAM idle | ~80-100 MB | ~30-50 MB |
| Tiempo de render | Base | 30-50% más rápido |

---

## Fase 0: Preparación (Pre-migración)

### 0.1 Configurar herramientas de migración

```bash
# Instalar dependencias de desarrollo
bun add -D jscodeshift @types/jscodeshift eslint-plugin-solid
```

### 0.2 Crear codemods personalizados

Crear directorio `scripts/codemods/` con los siguientes transforms:

#### Transform 1: `useState-to-createSignal.ts`
```typescript
// scripts/codemods/useState-to-createSignal.ts
import { API, FileInfo } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Reemplazar useState por createSignal
  root
    .find(j.CallExpression, {
      callee: { name: 'useState' }
    })
    .replaceWith(path => {
      path.node.callee = j.identifier('createSignal');
      return path.node;
    });

  return root.toSource();
}
```

#### Transform 2: `useEffect-to-createEffect.ts`
```typescript
// scripts/codemods/useEffect-to-createEffect.ts
import { API, FileInfo } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Reemplazar useEffect por createEffect (sin array de deps)
  root
    .find(j.CallExpression, {
      callee: { name: 'useEffect' }
    })
    .replaceWith(path => {
      path.node.callee = j.identifier('createEffect');
      // Eliminar segundo argumento (dependency array)
      if (path.node.arguments.length > 1) {
        path.node.arguments = [path.node.arguments[0]];
      }
      return path.node;
    });

  return root.toSource();
}
```

#### Transform 3: `react-imports-to-solid.ts`
```typescript
// scripts/codemods/react-imports-to-solid.ts
import { API, FileInfo } from 'jscodeshift';

const HOOK_MAPPING: Record<string, string> = {
  'useState': 'createSignal',
  'useEffect': 'createEffect',
  'useMemo': 'createMemo',
  'useRef': '', // Manejo especial
  'useCallback': '', // No existe en Solid
};

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Encontrar imports de React
  root
    .find(j.ImportDeclaration, {
      source: { value: 'react' }
    })
    .forEach(path => {
      const solidImports: string[] = [];

      path.node.specifiers?.forEach(spec => {
        if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
          const solidName = HOOK_MAPPING[spec.imported.name];
          if (solidName) {
            solidImports.push(solidName);
          }
        }
      });

      if (solidImports.length > 0) {
        path.node.source.value = 'solid-js';
        path.node.specifiers = solidImports.map(name =>
          j.importSpecifier(j.identifier(name))
        );
      }
    });

  return root.toSource();
}
```

#### Transform 4: `className-to-class.ts`
```typescript
// scripts/codemods/className-to-class.ts
import { API, FileInfo } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // className → class
  root
    .find(j.JSXAttribute, {
      name: { name: 'className' }
    })
    .forEach(path => {
      path.node.name.name = 'class';
    });

  // htmlFor → for
  root
    .find(j.JSXAttribute, {
      name: { name: 'htmlFor' }
    })
    .forEach(path => {
      path.node.name.name = 'for';
    });

  return root.toSource();
}
```

### 0.3 Script de ejecución de codemods

```bash
#!/bin/bash
# scripts/run-codemods.sh

TRANSFORMS_DIR="scripts/codemods"
TARGET_DIR="src"

echo "🔄 Ejecutando codemods..."

# Orden de ejecución importante
npx jscodeshift -t "$TRANSFORMS_DIR/react-imports-to-solid.ts" "$TARGET_DIR/**/*.tsx" --parser=tsx
npx jscodeshift -t "$TRANSFORMS_DIR/useState-to-createSignal.ts" "$TARGET_DIR/**/*.tsx" --parser=tsx
npx jscodeshift -t "$TRANSFORMS_DIR/useEffect-to-createEffect.ts" "$TARGET_DIR/**/*.tsx" --parser=tsx
npx jscodeshift -t "$TRANSFORMS_DIR/className-to-class.ts" "$TARGET_DIR/**/*.tsx" --parser=tsx

echo "✅ Codemods completados. Ejecuta ESLint para ver errores restantes."
```

### 0.4 Configurar ESLint para SolidJS

```javascript
// eslint.config.js (añadir)
import solid from 'eslint-plugin-solid/configs/recommended';

export default [
  // ... config existente
  {
    ...solid,
    rules: {
      ...solid.rules,
      'solid/reactivity': 'error',
      'solid/no-destructure': 'error',
      'solid/prefer-for': 'warn',
      'solid/jsx-no-undef': 'error',
    }
  }
];
```

---

## Fase 1: Infraestructura Base

### 1.1 Actualizar dependencias

```bash
# Eliminar React
bun remove react react-dom @types/react @types/react-dom

# Instalar SolidJS
bun add solid-js
bun add -D vite-plugin-solid

# Reemplazar librerías React-específicas
bun remove framer-motion lucide-react @radix-ui/react-*
bun add lucide-solid @motionone/solid
```

### 1.2 Configurar Vite para SolidJS

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Mantener config de Tauri
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

### 1.3 Actualizar TypeScript config

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    // ... resto igual
  }
}
```

---

## Fase 2: Store (Zustand → SolidJS Store)

### 2.1 Crear nuevo store nativo

```typescript
// src/store/store.ts (nuevo)
import { createStore, produce } from 'solid-js/store';
import { createEffect, createRoot, createSignal } from 'solid-js';
import type { User, Order, Product, Category, ITable } from '@/models';
import type { IStorageAdapter, StorageMode } from '@/services/storage-adapter.interface';
import { getStorageAdapterForMode, getInitialStorageMode } from '@/lib/config';

// Tipos
export interface AppState {
  // Datos
  users: User[];
  selectedUser: User | null;
  selectedOrder: Order | null;
  selectedOrderId: number | null;
  tables: ITable[];
  categories: Category[];
  products: Product[];
  orderHistory: Order[];
  activeOrders: Order[];
  recentProducts: Product[];

  // Configuración
  thermalPrinterOptions: ThermalPrinterServiceOptions | null;
  paymentMethod: string;
  cashAmount: string;
  showTicketDialog: boolean;
  storageMode: StorageMode;
  useStockImages: boolean;
  touchOptimizationsEnabled: boolean;
  debugMode: boolean;
  isBackendConnected: boolean;
  autoOpenCashDrawer: boolean;
  taxRate: number;
}

// Estado inicial
const initialState: AppState = {
  users: [],
  selectedUser: null,
  selectedOrder: null,
  selectedOrderId: null,
  tables: [],
  categories: [],
  products: [],
  orderHistory: [],
  activeOrders: [],
  recentProducts: [],
  thermalPrinterOptions: null,
  paymentMethod: 'efectivo',
  cashAmount: '',
  showTicketDialog: false,
  storageMode: getInitialStorageMode(),
  useStockImages: localStorage.getItem('tpv-use-stock-images') === 'true',
  touchOptimizationsEnabled: localStorage.getItem('tpv-touch-optimizations') === 'true',
  debugMode: localStorage.getItem('tpv-debug-mode') === 'true',
  isBackendConnected: false,
  autoOpenCashDrawer: localStorage.getItem('tpv-auto-open-drawer') === 'true',
  taxRate: Number(localStorage.getItem('tpv-tax-rate')) || 21,
};

// Crear store global
function createAppStore() {
  const [state, setState] = createStore<AppState>(initialState);

  // Storage adapter como signal separado (no serializable)
  const [storageAdapter, setStorageAdapter] = createSignal<IStorageAdapter>(
    getStorageAdapterForMode(initialState.storageMode)
  );

  // === ACCIONES SIMPLES ===

  const setUsers = (users: User[]) => setState('users', users);
  const setSelectedUser = (user: User | null) => setState('selectedUser', user);
  const setTables = (tables: ITable[]) => setState('tables', tables);
  const setCategories = (categories: Category[]) => setState('categories', categories);
  const setOrderHistory = (orders: Order[]) => setState('orderHistory', orders);
  const setActiveOrders = (orders: Order[]) => setState('activeOrders', orders);
  const setRecentProducts = (products: Product[]) => setState('recentProducts', products);
  const setPaymentMethod = (method: string) => setState('paymentMethod', method);
  const setCashAmount = (amount: string) => setState('cashAmount', amount);
  const setShowTicketDialog = (show: boolean) => setState('showTicketDialog', show);
  const setThermalPrinterOptions = (options: ThermalPrinterServiceOptions | null) =>
    setState('thermalPrinterOptions', options);

  // Productos con deduplicación
  const setProducts = (products: Product[]) => {
    const uniqueProducts = products.filter(
      (product, index, self) => index === self.findIndex(p => p.id === product.id)
    );
    setState('products', uniqueProducts);
  };

  // Selección de orden
  const setSelectedOrderId = (orderId: number | null) => {
    setState('selectedOrderId', orderId);
    if (orderId !== null) {
      const order = state.activeOrders.find(o => o.id === orderId) || null;
      setState('selectedOrder', order);
    } else {
      setState('selectedOrder', null);
    }
  };

  // === SETTINGS CON PERSISTENCIA ===

  const setUseStockImages = (use: boolean) => {
    setState('useStockImages', use);
    localStorage.setItem('tpv-use-stock-images', use.toString());
  };

  const setTouchOptimizationsEnabled = (enabled: boolean) => {
    setState('touchOptimizationsEnabled', enabled);
    localStorage.setItem('tpv-touch-optimizations', enabled.toString());
  };

  const setDebugMode = (enabled: boolean) => {
    setState('debugMode', enabled);
    localStorage.setItem('tpv-debug-mode', enabled.toString());
  };

  const setAutoOpenCashDrawer = (enabled: boolean) => {
    setState('autoOpenCashDrawer', enabled);
    localStorage.setItem('tpv-auto-open-drawer', enabled.toString());
  };

  const setTaxRate = (rate: number) => {
    setState('taxRate', rate);
    localStorage.setItem('tpv-tax-rate', rate.toString());
  };

  // === STORAGE MODE ===

  const setStorageMode = (mode: StorageMode) => {
    setState('storageMode', mode);
    setStorageAdapter(getStorageAdapterForMode(mode));
  };

  // === ACCIONES COMPLEJAS (ASYNC) ===

  const addToOrder = async (orderId: number, item: Product | OrderItem) => {
    // Fase 1: Update optimista
    setState(
      produce((s) => {
        const order = s.activeOrders.find(o => o.id === orderId);
        if (!order) return;

        const existingItem = order.items.find(i => i.id === item.id);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          order.items.push({
            ...item,
            quantity: 'quantity' in item ? item.quantity : 1,
          });
        }

        // Recalcular totales
        order.itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
        order.total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      })
    );

    // Fase 2: Sync con storage
    const updatedOrder = state.activeOrders.find(o => o.id === orderId);
    if (updatedOrder) {
      const adapter = storageAdapter();
      await adapter.updateOrder(updatedOrder);
    }
  };

  const removeFromOrder = async (orderId: number, productId: number) => {
    setState(
      produce((s) => {
        const order = s.activeOrders.find(o => o.id === orderId);
        if (!order) return;

        const itemIndex = order.items.findIndex(i => i.id === productId);
        if (itemIndex === -1) return;

        const item = order.items[itemIndex];
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          order.items.splice(itemIndex, 1);
        }

        // Recalcular totales
        order.itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
        order.total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      })
    );

    const updatedOrder = state.activeOrders.find(o => o.id === orderId);
    if (updatedOrder) {
      const adapter = storageAdapter();
      await adapter.updateOrder(updatedOrder);
    }
  };

  const handleCompleteOrder = async (order: Order) => {
    const completedOrder: Order = {
      ...order,
      status: 'completed',
      completedAt: new Date().toISOString(),
      itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    };

    const adapter = storageAdapter();
    await adapter.updateOrder(completedOrder);

    setState(
      produce((s) => {
        // Mover de activas a historial
        s.activeOrders = s.activeOrders.filter(o => o.id !== order.id);
        s.orderHistory.unshift(completedOrder);

        // Limpiar estado de pago
        s.paymentMethod = 'efectivo';
        s.cashAmount = '';
        s.selectedOrder = null;
        s.selectedOrderId = null;
      })
    );
  };

  const closeOrder = async (orderId: number) => {
    const adapter = storageAdapter();
    await adapter.deleteOrder(orderId);

    setState(
      produce((s) => {
        s.activeOrders = s.activeOrders.filter(o => o.id !== orderId);
        s.orderHistory = s.orderHistory.filter(o => o.id !== orderId);

        if (s.selectedOrderId === orderId) {
          s.selectedOrderId = null;
          s.selectedOrder = null;
        }
      })
    );
  };

  const handleTableChange = async (tableId: number) => {
    // Buscar orden existente para esta mesa
    let order = state.activeOrders.find(o => o.tableId === tableId);

    if (!order) {
      // Buscar orden vacía sin mesa asignada
      order = state.activeOrders.find(o => !o.tableId && o.items.length === 0);

      if (order) {
        // Asignar mesa a orden existente
        setState(
          produce((s) => {
            const o = s.activeOrders.find(ao => ao.id === order!.id);
            if (o) o.tableId = tableId;
          })
        );
        const adapter = storageAdapter();
        await adapter.updateOrder({ ...order, tableId });
      } else {
        // Crear nueva orden
        const newOrder: Order = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          tableId,
          items: [],
          total: 0,
          itemCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        const adapter = storageAdapter();
        await adapter.createOrder(newOrder);

        setState(
          produce((s) => {
            s.activeOrders.push(newOrder);
          })
        );

        order = newOrder;
      }
    }

    setSelectedOrderId(order.id);
  };

  return {
    // State (readonly)
    state,
    storageAdapter,

    // Acciones simples
    setUsers,
    setSelectedUser,
    setTables,
    setCategories,
    setProducts,
    setOrderHistory,
    setActiveOrders,
    setRecentProducts,
    setSelectedOrderId,
    setPaymentMethod,
    setCashAmount,
    setShowTicketDialog,
    setThermalPrinterOptions,

    // Settings
    setUseStockImages,
    setTouchOptimizationsEnabled,
    setDebugMode,
    setAutoOpenCashDrawer,
    setTaxRate,
    setStorageMode,

    // Acciones complejas
    addToOrder,
    removeFromOrder,
    handleCompleteOrder,
    closeOrder,
    handleTableChange,
  };
}

// Singleton del store
let store: ReturnType<typeof createAppStore>;

export function useStore() {
  if (!store) {
    store = createRoot(createAppStore);
  }
  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
```

### 2.2 Crear selectores (opcional, para compatibilidad)

```typescript
// src/store/selectors.ts
import { createMemo } from 'solid-js';
import { useStore } from './store';

// Selectores computados
export const useOrderStats = () => {
  const { state } = useStore();

  return createMemo(() => ({
    totalOrders: state.orderHistory.length,
    totalSales: state.orderHistory.reduce((sum, o) => sum + o.total, 0),
    averageOrderValue: state.orderHistory.length > 0
      ? state.orderHistory.reduce((sum, o) => sum + o.total, 0) / state.orderHistory.length
      : 0,
  }));
};

export const useActiveOrdersCount = () => {
  const { state } = useStore();
  return createMemo(() => state.activeOrders.length);
};
```

---

## Fase 3: Componentes UI Base

### 3.1 Orden de migración de componentes

```
Prioridad 1 (sin dependencias):
├── src/components/ui/button.tsx
├── src/components/ui/card.tsx
├── src/components/ui/input.tsx
├── src/components/ui/badge.tsx
├── src/components/ui/spinner.tsx
└── src/components/ui/tooltip.tsx

Prioridad 2 (dependen de UI base):
├── src/components/ProductCard.tsx
├── src/components/OrderItem.tsx
├── src/components/TableCard.tsx
└── src/components/InvoiceStatusBadge.tsx

Prioridad 3 (componentes compuestos):
├── src/components/ProductGrid.tsx
├── src/components/OrderSummary.tsx
├── src/components/PaymentModal.tsx
└── src/components/SideBar.tsx

Prioridad 4 (secciones completas):
├── src/components/Sections/Home.tsx
├── src/components/Sections/Products.tsx
├── src/components/Sections/NewOrder.tsx
├── src/components/Sections/OrderHistory.tsx
├── src/components/Sections/SettingsPanel.tsx
└── src/components/Sections/Login.tsx

Prioridad 5 (app shell):
├── src/App.tsx
└── src/main.tsx
```

### 3.2 Ejemplo de migración de componente

**Antes (React):**
```tsx
// src/components/ProductCard.tsx (React)
import React, { useCallback } from 'react';
import { Product } from '@/models/Product';

interface ProductCardProps {
  product: Product;
  onAction: (product: Product) => void;
  disabled?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAction,
  disabled = false
}) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onAction(product);
    }
  }, [product, onAction, disabled]);

  return (
    <button
      className={`product-card ${disabled ? 'opacity-50' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      <img src={product.image} alt={product.name} />
      <span className="product-name">{product.name}</span>
      <span className="product-price">{product.price.toFixed(2)}€</span>
    </button>
  );
};

export default ProductCard;
```

**Después (SolidJS):**
```tsx
// src/components/ProductCard.tsx (SolidJS)
import type { Component } from 'solid-js';
import type { Product } from '@/models/Product';

interface ProductCardProps {
  product: Product;
  onAction: (product: Product) => void;
  disabled?: boolean;
}

const ProductCard: Component<ProductCardProps> = (props) => {
  // No useCallback necesario - SolidJS no re-renderiza componentes
  const handleClick = () => {
    if (!props.disabled) {
      props.onAction(props.product);
    }
  };

  return (
    <button
      class={`product-card ${props.disabled ? 'opacity-50' : ''}`}
      onClick={handleClick}
      disabled={props.disabled}
    >
      <img src={props.product.image} alt={props.product.name} />
      <span class="product-name">{props.product.name}</span>
      <span class="product-price">{props.product.price.toFixed(2)}€</span>
    </button>
  );
};

export default ProductCard;
```

### 3.3 Patrones de migración comunes

#### Patrón: Listas con .map() → `<For>`

```tsx
// React
{products.map(p => <ProductCard key={p.id} product={p} />)}

// SolidJS
<For each={products()}>
  {(product) => <ProductCard product={product} />}
</For>
```

#### Patrón: Condicionales → `<Show>`

```tsx
// React
{isLoading ? <Spinner /> : <Content />}
{error && <ErrorMessage error={error} />}

// SolidJS
<Show when={!isLoading()} fallback={<Spinner />}>
  <Content />
</Show>
<Show when={error()}>
  <ErrorMessage error={error()!} />
</Show>
```

#### Patrón: Switch/Case → `<Switch>/<Match>`

```tsx
// React
{status === 'loading' && <Loading />}
{status === 'error' && <Error />}
{status === 'success' && <Success />}

// SolidJS
<Switch>
  <Match when={status() === 'loading'}><Loading /></Match>
  <Match when={status() === 'error'}><Error /></Match>
  <Match when={status() === 'success'}><Success /></Match>
</Switch>
```

---

## Fase 4: Hooks → Primitivas

### 4.1 Migración de hooks personalizados

| Hook React | Equivalente Solid | Cambios necesarios |
|------------|-------------------|-------------------|
| `useResponsive` | Módulo con signals | Exportar signals directamente |
| `useTheme` | Módulo con signals | Sin wrapper de hook |
| `usePerformanceConfig` | Módulo con signals | Memos para valores computados |
| `useAEAT` | Módulo con signals + effects | Separar estado de side-effects |
| `useOnboarding` | Módulo con store local | createStore para estado complejo |

### 4.2 Ejemplo: useResponsive

**Antes (React):**
```tsx
// src/hooks/useResponsive.ts (React)
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet };
}
```

**Después (SolidJS):**
```tsx
// src/lib/responsive.ts (SolidJS)
import { createSignal, createEffect, onCleanup } from 'solid-js';

const [isMobile, setIsMobile] = createSignal(false);
const [isTablet, setIsTablet] = createSignal(false);

// Inicializar una vez
if (typeof window !== 'undefined') {
  const checkSize = () => {
    setIsMobile(window.innerWidth < 768);
    setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
  };

  checkSize();
  window.addEventListener('resize', checkSize);
}

// Exportar signals directamente (no hook)
export { isMobile, isTablet };

// O como función si prefieres API similar
export function useResponsive() {
  return { isMobile, isTablet };
}
```

---

## Fase 5: Animaciones

### 5.1 Reemplazar Framer Motion

**Opción A: Motion One (recomendado)**
```bash
bun add @motionone/solid
```

```tsx
// Antes (Framer Motion)
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {show && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>

// Después (Motion One)
import { Motion, Presence } from '@motionone/solid';

<Presence>
  <Show when={show()}>
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      Content
    </Motion.div>
  </Show>
</Presence>
```

**Opción B: CSS Transitions (más ligero)**
```tsx
// Para transiciones simples, usar CSS nativo
import { createSignal } from 'solid-js';

const [visible, setVisible] = createSignal(false);

<div
  class="transition-all duration-300"
  classList={{
    'opacity-0 translate-y-5': !visible(),
    'opacity-100 translate-y-0': visible(),
  }}
>
  Content
</div>
```

---

## Fase 6: Librerías de terceros

### 6.1 Tabla de reemplazos

| Librería React | Alternativa Solid | Notas |
|----------------|-------------------|-------|
| `framer-motion` | `@motionone/solid` | API similar |
| `lucide-react` | `lucide-solid` | Drop-in replacement |
| `@radix-ui/react-*` | `@kobalte/core` | Primitivos headless |
| `react-window` | `@tanstack/solid-virtual` | Virtualización |
| `recharts` | `solid-chartjs` | Charts |
| `sonner` | `solid-sonner` | Toasts |
| `zustand` | `solid-js/store` | Nativo |

### 6.2 Instalación de alternativas

```bash
# UI Primitives (reemplaza Radix)
bun add @kobalte/core

# Icons
bun add lucide-solid

# Animaciones
bun add @motionone/solid

# Virtualización
bun add @tanstack/solid-virtual

# Toasts
bun add solid-sonner
```

---

## Fase 7: App Shell y Entry Point

### 7.1 main.tsx

```tsx
// src/main.tsx (SolidJS)
import { render } from 'solid-js/web';
import App from './App';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

render(() => <App />, root);
```

### 7.2 App.tsx con code splitting

```tsx
// src/App.tsx (SolidJS)
import { Component, lazy, Suspense, createSignal, Show } from 'solid-js';
import { Motion, Presence } from '@motionone/solid';
import { useStore } from '@/store/store';
import SideBar from '@/components/SideBar';
import Spinner from '@/components/ui/spinner';

// Code splitting - lazy loading de secciones
const Home = lazy(() => import('@/components/Sections/Home'));
const Products = lazy(() => import('@/components/Sections/Products'));
const NewOrder = lazy(() => import('@/components/Sections/NewOrder'));
const OrderHistory = lazy(() => import('@/components/Sections/OrderHistory'));
const Settings = lazy(() => import('@/components/Sections/SettingsPanel'));
const Login = lazy(() => import('@/components/Sections/Login'));

type Section = 'home' | 'products' | 'newOrder' | 'orderHistory' | 'settings';

const App: Component = () => {
  const { state, setSelectedUser } = useStore();
  const [activeSection, setActiveSection] = createSignal<Section>('home');

  const renderSection = () => {
    switch (activeSection()) {
      case 'home': return <Home />;
      case 'products': return <Products />;
      case 'newOrder': return <NewOrder />;
      case 'orderHistory': return <OrderHistory />;
      case 'settings': return <Settings />;
      default: return <Home />;
    }
  };

  return (
    <Show
      when={state.selectedUser}
      fallback={
        <Suspense fallback={<Spinner />}>
          <Login onLogin={setSelectedUser} />
        </Suspense>
      }
    >
      <div class="app-container flex h-screen">
        <SideBar
          activeSection={activeSection()}
          onSectionChange={setActiveSection}
        />

        <main class="flex-1 overflow-hidden">
          <Suspense fallback={<Spinner />}>
            <Presence>
              <Motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                class="h-full"
              >
                {renderSection()}
              </Motion.div>
            </Presence>
          </Suspense>
        </main>
      </div>
    </Show>
  );
};

export default App;
```

---

## Fase 8: Testing y Validación

### 8.1 Checklist de validación por componente

Para cada componente migrado, verificar:

- [ ] No hay warnings de ESLint `solid/reactivity`
- [ ] No hay warnings de ESLint `solid/no-destructure`
- [ ] Props no están destructuradas
- [ ] Signals se acceden con `()`
- [ ] Listas usan `<For>` en lugar de `.map()`
- [ ] Condicionales usan `<Show>` o `<Switch>`
- [ ] Efectos no tienen arrays de dependencias
- [ ] No hay `useCallback` o `useMemo` innecesarios

### 8.2 Script de validación

```bash
#!/bin/bash
# scripts/validate-migration.sh

echo "🔍 Validando migración a SolidJS..."

# Buscar patrones React residuales
echo "Buscando imports de React..."
grep -r "from 'react'" src/ && echo "❌ Encontrados imports de React" || echo "✅ Sin imports de React"

echo "Buscando useState..."
grep -r "useState" src/ && echo "❌ Encontrados useState" || echo "✅ Sin useState"

echo "Buscando useEffect..."
grep -r "useEffect" src/ && echo "❌ Encontrados useEffect" || echo "✅ Sin useEffect"

echo "Buscando className=..."
grep -r "className=" src/ && echo "❌ Encontrados className" || echo "✅ Sin className"

echo "Buscando .map() en JSX..."
grep -rE "\.map\s*\(" src/**/*.tsx && echo "⚠️ Revisar uso de .map()" || echo "✅ Sin .map() sospechosos"

# Ejecutar ESLint
echo "Ejecutando ESLint..."
bunx eslint src/ --ext .tsx,.ts

echo "✅ Validación completada"
```

---

## Cronograma Sugerido

| Fase | Descripción | Archivos | Complejidad |
|------|-------------|----------|-------------|
| 0 | Preparación y codemods | 4 scripts | Media |
| 1 | Infraestructura (Vite, TS) | 3 configs | Baja |
| 2 | Store | 2 archivos | Alta |
| 3 | Componentes UI | ~15 archivos | Media |
| 4 | Hooks → Primitivas | 9 archivos | Media |
| 5 | Animaciones | ~10 archivos | Media |
| 6 | Librerías terceros | package.json | Baja |
| 7 | App shell | 2 archivos | Media |
| 8 | Testing | Scripts | Baja |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Reactividad perdida | Alta | Alto | ESLint plugin + testing exhaustivo |
| Incompatibilidad Radix | Media | Medio | Usar Kobalte o implementar custom |
| Performance regression | Baja | Alto | Benchmarks antes/después |
| Breaking changes en libs | Media | Medio | Fijar versiones en package.json |

---

## Métricas de Éxito

Medir antes y después de la migración:

1. **Bundle size** (target: -60%)
2. **First Contentful Paint** (target: -30%)
3. **Memory usage idle** (target: -40%)
4. **Time to Interactive** (target: -25%)

```bash
# Medir bundle size
bunx vite-bundle-visualizer

# Medir en Tauri
# Usar Task Manager / htop para memoria
```

---

## Referencias

- [SolidJS Documentation](https://docs.solidjs.com/)
- [SolidJS for React Developers](https://www.solidjs.com/guides/comparison)
- [eslint-plugin-solid](https://github.com/solidjs-community/eslint-plugin-solid)
- [Kobalte (Radix alternative)](https://kobalte.dev/)
- [Motion One for Solid](https://motion.dev/solid/quick-start)
- [jscodeshift](https://github.com/facebook/jscodeshift)
