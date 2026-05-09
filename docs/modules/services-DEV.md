# Services - Guía de Desarrollo

**Módulo**: Services Layer (Storage, Platform, Printer)
**Stack**: TypeScript, Tauri commands, Service Pattern
**Última actualización**: 2026-05-09 (basado en exploración de código real)

---

## Consideraciones Arquitectónicas

### Service Pattern (Adapter)

**Ubicación**: `/src/services/`

**Interface común**: `/src/services/storage-adapter.interface.ts`

```typescript
export interface IStorageAdapter {
  // CRUD operations
  getProducts(): Promise<Result<Product[], Error>>;
  createProduct(product: Product): Promise<Result<Product, Error>>;
  updateProduct(id: string, product: Product): Promise<Result<Product, Error>>;
  deleteProduct(id: string): Promise<Result<void, Error>>;
  
  // Same for categories, orders, tables, users, customers
  
  // Data management
  exportData(): Promise<Result<string, Error>>;
  importData(json: string): Promise<Result<void, Error>>;
  clearAllData(): Promise<Result<void, Error>>;
}
```

**3 implementaciones**:
1. **SqliteStorageAdapter** - Desktop (Tauri commands)
2. **HttpStorageAdapter** - Remote server mode
3. **IndexedDbStorageAdapter** - PWA/web fallback

---

## Storage Adapters

### SQLite Adapter (Desktop)

**Ubicación**: `/src/services/sqlite-storage-adapter.ts`

**Pattern**: Direct `invoke()` calls a backend Rust

```typescript
class SqliteStorageAdapter implements IStorageAdapter {
  async getProducts(): Promise<Result<Product[], Error>> {
    return tryCatchAsync(
      async () => invoke<Product[]>('get_products'),
      StorageErrorCode.ReadFailed
    );
  }
  
  // ... 16+ invoke() calls (CRUD completo)
}
```

**Issue identificado**:
- 🔴 Usa `invoke()` directamente (no usa PlatformService)
- **Impact**: Rompe abstraction layer
- **Fix**: Delegar a PlatformService cuando se consolide

### HTTP Adapter (Remote Server)

**Ubicación**: `/src/services/http-storage-adapter.ts`

**Pattern**: REST API client

```typescript
class HttpStorageAdapter implements IStorageAdapter {
  private baseUrl: string;
  
  async getProducts(): Promise<Result<Product[], Error>> {
    const response = await fetch(`${this.baseUrl}/products`);
    
    if (!response.ok) {
      return err(new Error(`HTTP ${response.status}`));
    }
    
    const data = await response.json();
    return ok(data);
  }
}
```

**Features**:
- ✅ Timeout handling (15s default)
- ✅ Abort controllers para cancel requests
- ✅ Usa Tauri HTTP plugin en entorno Tauri

**Issue**:
- ⚠️ Sync queue en IndexedDB se limpia pero no hace sync real
- **Fix**: Implementar sync algorithm

### IndexedDB Adapter (PWA/Web)

**Ubicación**: `/src/services/indexeddb-storage-adapter.ts`

**Pattern**: Browser storage + offline support

```typescript
class IndexedDbStorageAdapter implements IStorageAdapter {
  private db: IDBDatabase;
  private syncQueue: any[]; // Queue para sync cuando vuelve online
  
  async getProducts(): Promise<Result<Product[], Error>> {
    return this.transaction('products', 'readonly');
  }
  
  async createProduct(product: Product): Promise<Result<Product, Error>> {
    // Guarda en IndexedDB + añade a sync queue
    await this.put('products', product);
    this.syncQueue.push({ action: 'create', entity: 'products', data: product });
    await this.persistQueue();
    return ok(product);
  }
}
```

**Features**:
- ✅ Offline-first
- ✅ Sync queue para cuando vuelve online
- ✅ LocalStorage para persistir queue

---

## Platform Abstraction

**Interface**: `/src/services/platform/PlatformService.ts`

```typescript
export interface IPlatformService {
  // Info
  isTauri(): boolean;
  
  // File dialogs
  openFile(options: FileDialogOptions): Promise<string | null>;
  saveFile(options: SaveDialogOptions): Promise<string | null>;
  
  // Updates
  checkUpdate(): Promise<UpdateInfo>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  
  // License
  validateLicense(key: string): Promise<LicenseStatus>;
  
  // Thermal printer
  printTicket(content: string): Promise<void>;
}
```

### Implementaciones

**TauriPlatformService** (`/src/services/platform/TauriPlatformService.ts`)
- ✅ Completo: todas las features implementadas
- ✅ Usa Tauri plugins nativos
- ✅ Thermal printer via sidecar

**WebPlatformService** (`/src/services/platform/WebPlatformService.ts`)
- ✅ Stubs con browser fallbacks
- ⚠️ File dialogs usan `window.prompt()` (poor UX)
- ❌ Thermal printer NO disponible (limitación esperada)

### Issue Detection

```typescript
// 🔴 ISSUE: isTauri() llamado múltiples veces sin cache
// PlatformDetector.ts
export function isTauri(): boolean {
  return '__TAURI__' in window;
}

// ✅ FIX: Singleton pattern
let cached: boolean | null = null;
export function isTauri(): boolean {
  if (cached === null) {
    cached = '__TAURI__' in window;
  }
  return cached;
}
```

---

## Thermal Printer Service

**Ubicación**: `/src/services/thermal-printer.service.ts`

**Status**: ✅ REAL (no stub)

**Architecture**: Sidecar pattern

```typescript
class ThermalPrinterService {
  async printTicket(content: string): Promise<void> {
    // 1. Formatear contenido a ESC/POS
    const escpos = this.formatToEscPos(content);
    
    // 2. Llamar sidecar binary
    await invoke('plugin:command|execute', {
      command: 'thermal-printer-cli',
      args: ['--print', escpos]
    });
  }
  
  private formatToEscPos(content: string): string {
    // [ALIGN:CENTER]
    // [BOLD:ON]
    // content
    // [BOLD:OFF]
    // [CUT]
    return escposCommands;
  }
}
```

**ESC/POS Commands implementados** (7):
- `[ALIGN:CENTER]` / `[ALIGN:LEFT]`
- `[BOLD:ON]` / `[BOLD:OFF]`
- `[CUT]` - Paper cut
- `[IMAGE:...]` - Imágenes
- `[CASH_DRAWER]` - Abrir cajón

**🔴 CRITICAL ISSUE**:
- Binary `thermal-printer-cli` NO incluido en repo
- Referenciado como `binaries/thermal-printer-cli`
- **Risk**: Deployment fallará si binary missing
- **Fix**: Incluir binary en repo o documentar instalación

---

## Anti-Patterns a Evitar

### ❌ invoke() Scattered

```typescript
// MAL - invoke() directo en service
import { invoke } from '@tauri-apps/api/core';
const products = await invoke('get_products');

// BIEN - Usar PlatformService abstraction
const platform = getPlatformService();
const products = await platform.getProducts();
```

### ❌ Storage Adapter Selection Ineficiente

```typescript
// MAL - Los 3 adapters instanciados al startup
const sqlite = new SqliteStorageAdapter();
const http = new HttpStorageAdapter();
const indexeddb = new IndexedDbStorageAdapter();
// Wasted memory

// BIEN - Lazy loading
const getAdapter = () => {
  const mode = getStorageMode();
  switch (mode) {
    case 'sqlite': return new SqliteStorageAdapter();
    case 'http': return new HttpStorageAdapter();
    case 'indexeddb': return new IndexedDbStorageAdapter();
  }
};
```

### ❌ Platform Detection Repetida

```typescript
// MAL - isTauri() llamado múltiples veces
if (isTauri()) { /* ... */ }
if (isTauri()) { /* ... */ } // Called again

// BIEN - Cache result
const tauri = isTauri(); // Call once
if (tauri) { /* ... */ }
if (tauri) { /* ... */ } // Reuse
```

---

## Testing Strategy (FUTURO)

**Estado actual**: 0% coverage

**Planned**:
- Unit tests para adapters (mock Tauri commands)
- Integration tests para sync algorithms
- Platform service tests (mock environments)

**Patrón**:
```typescript
describe('SqliteStorageAdapter', () => {
  it('should get products from Tauri', async () => {
    const mockInvoke = vi.fn().mockResolvedValue(mockProducts);
    vi.mock('@tauri-apps/api/core', () => ({
      invoke: mockInvoke
    }));
    
    const adapter = new SqliteStorageAdapter();
    const result = await adapter.getProducts();
    
    expect(mockInvoke).toHaveBeenCalledWith('get_products');
    expect(result).toEqual(ok(mockProducts));
  });
});
```

---

## Referencias

- Storage interface: `/src/services/storage-adapter.interface.ts`
- Platform service: `/src/services/platform/`
- Printer service: `/src/services/thermal-printer.service.ts`
