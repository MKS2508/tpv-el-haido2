# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tpv-haido** is a Point of Sale (TPV/POS) desktop application for restaurants/bars built with Tauri + React + TypeScript. Features include order management, product catalog, thermal receipt printing, and PIN-based user authentication.

## Development Commands

```bash
# Frontend development (Vite dev server on port 1420)
bun run dev

# Full Tauri development (frontend + Rust backend)
bun run tauri dev

# Production builds
bun run build          # Frontend only
bun run tauri build    # Complete Tauri app (alias: bun run package)
```

**Prerequisites**: The haido-db sidecar must be running on port 3000. In development without the sidecar, the app can fall back to IndexedDB storage mode.

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Radix UI + Tailwind CSS + shadcn/ui + Framer Motion
- **State**: Zustand with Immer middleware
- **Backend**: Tauri (Rust) spawning sidecar binaries
- **Error Handling**: `@mks2508/no-throw` Result pattern

### Key Architectural Patterns

**Result Pattern for Error Handling** (`@mks2508/no-throw`):
- All async operations return `Result<T, ResultError>` instead of throwing exceptions
- Error codes defined in `/src/lib/error-codes.ts` organized by domain (Storage, Printer, Order, Product, Category, Auth, Network)
- Use `tryCatchAsync()` to wrap async operations and convert exceptions to Results
- Use `isErr()`, `unwrapOr()`, `tapErr()` to handle Results
- Example:
```typescript
import { tryCatchAsync, isErr, tapErr } from '@mks2508/no-throw'
import { StorageErrorCode } from '@/lib/error-codes'

const result = await tryCatchAsync(
  async () => invoke<Product[]>('get_products'),
  StorageErrorCode.ReadFailed
)

tapErr(result, (error) => {
  console.error('Error:', error.code, error.message)
})

if (!isErr(result)) {
  // Use result.value safely
}
```

**ErrorBoundary Component** (`/src/components/ErrorBoundary.tsx`):
- Three levels: `app` (full screen), `section` (card), `component` (inline)
- Applied at app level in `main.tsx`, section level in `App.tsx`, component level for critical UI

**Dual Storage System** (`/src/services/storage-adapter.interface.ts`):
- `IStorageAdapter` interface with three implementations:
  - `SqliteStorageAdapter`: Native SQLite via Tauri commands
  - `HttpStorageAdapter`: Communicates with haido-db REST API (port 3000)
  - `IndexedDbStorageAdapter`: Local browser storage fallback
- All methods return `StorageResult<T>` (Result pattern)
- Storage mode switchable at runtime via `storageMode` in Zustand store

**Sidecar Integration** (`/src-tauri/tauri.conf.json`):
- `haido-db`: Node.js REST API (Express + LowDB) for data persistence
- `thermal-printer-cli`: Receipt printing via ESC/POS commands
- Binaries located in `/sidecars/bin/` with platform-specific variants

**State Management** (`/src/store/store.ts`):
- Single Zustand store with Immer for immutable updates
- Contains: users, orders, products, categories, tables, printer settings
- Order operations (add/remove items, complete, close) are async and sync to storage adapter

**Section-Based Navigation** (`/src/App.tsx`):
- No router; uses `activeSection` state with animated transitions
- Sections: home, products, newOrder, orderHistory, settings
- Responsive: sidebar on desktop, bottom navigation on mobile

### Data Flow
1. App initializes sidecar via `SidecarService`
2. Services (`ProductService`, `CategoriesService`, `OrderService`) fetch initial data
3. Store holds all state; mutations sync back via `storageAdapter`
4. Components read from store, dispatch actions that update store + persist

### API Endpoints (haido-db)
REST endpoints on `http://localhost:3000/api/`:
- `/products`, `/categories`, `/orders` - Standard CRUD operations

## Path Aliases

Use `@/` to import from `/src/`:
```typescript
import useStore from '@/store/store'
import Product from '@/models/Product'
```

## Key Directories

- `/src/components/Sections/` - Main app sections (Home, Products, NewOrder, etc.)
- `/src/services/` - Business logic and storage adapters
- `/src/store/` - Zustand store
- `/src/models/` - TypeScript interfaces (User, Order, Product, Category, Table, ThermalPrinter)
- `/src-tauri/` - Rust backend
