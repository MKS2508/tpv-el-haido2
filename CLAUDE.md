# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tpv-haido** is a Point of Sale (TPV/POS) desktop application for restaurants/bars built with Tauri 2 + SolidJS + TypeScript. Features include order management, product catalog, thermal receipt printing, PIN-based user authentication, and Spanish AEAT tax compliance (VerificaTu).

## Development Commands

```bash
# Frontend only (Vite dev server on port 1420)
bun run dev

# Full Tauri development (frontend + Rust backend)
bun run tauri dev

# Full stack with license server and docs
bun run dev:full    # license server + tauri
bun run dev:all     # license server + docs + tauri

# Production builds
bun run build              # TypeScript check + frontend build
bun run tauri build        # Complete Tauri app
bun run deploy:rpi         # Build for Raspberry Pi

# Database seeding
bun run seed               # Seed demo data
bun run seed:clear         # Clear and reseed

# Auxiliary apps
bun run license-server     # License validation server (Elysia.js)
bun run docs               # Documentation site (Next.js)

# Code quality
bun run lint               # Biome linter
bun run lint:fix           # Auto-fix with Biome
bun run format             # Format with Biome
bun run check              # Biome + ESLint
bun run typecheck          # TypeScript validation (tsgo)
```

## Architecture

### Tech Stack

**Frontend:**
- Framework: SolidJS 1.9.5 (NOT React)
- UI: Kobalt UI + custom components + Tailwind CSS 4.1
- State: SolidJS store with Immer middleware
- Animation: MotionOne
- Icons: Lucide-Solid
- Charts: Solid-Chart.js
- Toast: Solid-Sonner

**Backend:**
- Framework: Tauri 2 (Rust)
- Database: Embedded SQLite via rusqlite (bundled, no sidecar)
- Error Handling: `@mks2508/no-throw` Result pattern

**Build:**
- Vite 7.3.1 with solid-plugin
- TypeScript 5.9.3
- tsgo for type checking (faster alternative to tsc)

### Database (Rust Backend)

The app uses **embedded SQLite** via `rusqlite` crate (not a sidecar):
- Database file: `{app_data_dir}/tpv-haido.db`
- Tables: products, categories, orders, order_items, tables, users, licenses, config
- Schema initialized on first run in `src-tauri/src/database.rs`

**Tauri Commands (25 exposed to frontend):**
- CRUD: `get_products`, `create_product`, `update_product`, `delete_product` (same pattern for categories, orders, tables, users)
- Data: `export_data`, `import_data`, `clear_all_data`
- Config: `write_json_config`
- License: `check_license_status`, `validate_and_activate_license`, `get_machine_fingerprint`, `clear_license`
- Screenshot: `save_screenshot_from_base64`, `get_screenshots_dir`

### State Management (`/src/store/store.ts`)

Uses SolidJS store with fine-grained reactivity (NOT Zustand):

```typescript
// Pattern: createStore with produce for immutable updates
const [state, setState] = createStore<AppState>({
  users, products, categories, orders, tables, customers
  selectedUser, selectedOrder, storageMode
  thermalPrinterOptions, licenseStatus, debugMode
});

// Access reactive state
store.state.products  // Reactive signal

// Update with produce (Immer-like for SolidJS)
setState(produce((s) => {
  s.products.push(newProduct);
}));

// Complex actions (order management)
store.addToOrder(orderId, item);
store.removeFromOrder(orderId, productId);
store.handleTableChange(tableId);
```

### Triple Storage System (`/src/services/storage/`)

Three storage adapters implementing `IStorageAdapter`:

1. **SqliteStorageAdapter** - Calls Rust Tauri commands (primary for desktop)
2. **HttpStorageAdapter** - REST API client (for remote server mode)
3. **IndexedDbStorageAdapter** - Browser storage (for PWA/web fallback)

Storage mode switchable at runtime via `store.setStorageMode(mode)`:
- Default: `isTauri() ? 'sqlite' : 'indexeddb'`
- Stored in localStorage: `tpv-storage-mode`

### Result Pattern for Error Handling

Uses `@mks2508/no-throw` for type-safe error handling:

```typescript
import { tryCatchAsync, isErr, unwrapOr, tapErr } from '@mks2508/no-throw'
import { StorageErrorCode } from '@/lib/error-codes'

// All async operations return Result<T, ResultError>
const result = await tryCatchAsync(
  async () => invoke<Product[]>('get_products'),
  StorageErrorCode.ReadFailed
)

if (!isErr(result)) {
  // Use result.value safely
}

// Error codes organized by domain:
// - StorageErrorCode (6 types)
// - PrinterErrorCode (5 types)
// - AEATErrorCode (15 types)
// - LicenseErrorCode (9 types)
// - Plus Auth, Network, Order, Product, Category, Customer errors
```

### Platform Abstraction (`/src/services/platform/`)

Platform abstraction layer exists but is **NOT currently used**:

```typescript
// Interface exists but scattered direct invoke() calls throughout codebase
PlatformService (interface)
├── TauriPlatformService (partial implementation)
├── WebPlatformService (complete with fallbacks)
└── PlatformDetector (isTauri detection)

// Problem: 16+ files call invoke() directly instead of using PlatformService
// TODO: Consolidate platform detection (5 different isTauri() implementations)
```

### Navigation Pattern

No router; uses section-based navigation with SolidJS Switch/Match:
- Sections: home, products, newOrder, orderHistory, settings, customers, aeatInvoices
- State: `activeSection` in store
- Responsive: sidebar on desktop, bottom navigation on mobile

### Data Flow

1. App initializes database via Tauri `init_database` command
2. Store selects storage adapter based on environment (`getInitialStorageMode()`)
3. Components read from `store.state` (reactive)
4. Dispatch actions → storage adapter methods → Tauri commands → SQLite
5. State updates trigger re-renders automatically (SolidJS fine-grained reactivity)

## Path Aliases

Use `@/` to import from `/src/`:
```typescript
import useStore from '@/store/store'
import Product from '@/models/Product'
```

## Key Directories

- `/src/components/Sections/` - Main app sections (Home, Products, NewOrder, etc.)
- `/src/components/ui/` - UI components (Kobalt-based + custom)
- `/src/services/storage/` - Storage adapters (SQLite, HTTP, IndexedDB)
- `/src/services/platform/` - Platform abstraction layer (unused)
- `/src/store/` - SolidJS store
- `/src/models/` - TypeScript interfaces
- `/src/hooks/` - Custom hooks (useUpdater, useScreenshot, useAEATSidecar)
- `/src-tauri/src/` - Rust backend (database.rs, lib.rs, license.rs, models/)
- `/apps/license-server/` - Elysia.js license validation server
- `/apps/haidodocs/` - Next.js documentation site

## Sidecars

Only one sidecar is currently configured:
- **aeat-bridge**: Spanish AEAT VerificaTu integration for tax invoice validation
  - Built from: `scripts/build-aeat-sidecar.ts`
  - Config: `src-tauri/tauri.conf.json` → `externalBin: ["sidecars/aeat-bridge"]`

## Tauri Plugins Used

```json
"@tauri-apps/api": "^2.8.0",
"@tauri-apps/plugin-http": "^2.5.6",
"@tauri-apps/plugin-opener": "^2.5.3",
"@tauri-apps/plugin-process": "^2.3.1",
"@tauri-apps/plugin-shell": "^2.3.4",
"@tauri-apps/plugin-updater": "^2.9.0"
```

## Current State & Known Issues

### Implemented ✅
- Embedded SQLite with full CRUD
- Triple storage adapter pattern
- License validation (online + master key)
- AEAT sidecar for tax compliance
- Auto-updater with download progress
- Screenshot functionality
- Onboarding flow
- Theme management

### Partially Implemented ⚠️
- Platform abstraction (interface exists but `isTauri()` scattered everywhere - 5 implementations)
- Thermal printer integration (service exists but no sidecar)

### Not Implemented ❌
- PWA support (no manifest, no service worker)
- Tauri Mobile support (would need major refactoring)
- Offline-first web mode

### Technical Debt
1. **Platform abstraction unused**: 16+ files directly call `invoke()` instead of using PlatformService
2. **Scattered platform detection**: 5 different `isTauri()` implementations across codebase
3. **No testing**: Zero test coverage
4. **PWA incomplete**: Planning exists in `todo-plans/pwa-architecture-plan.json` but no implementation

## Tauri Mobile Blockers

If targeting iOS/Android via Tauri Mobile:
1. AEAT sidecar won't work (no binary spawning on mobile)
2. Direct `invoke()` calls scattered in components (need PlatformService abstraction)
3. File system operations assume desktop paths
4. No SQLite plugin configured for mobile (`@tauri-apps/plugin-sql`)

## Monorepo Structure

```
tpv-el-haido/
├── apps/
│   ├── license-server/    # Elysia.js license validation server
│   └── haidodocs/         # Next.js documentation site
└── src/                   # Main SolidJS + Tauri app
```

## License System

- **Master credentials** (for dev):
  - Email: `admin@haido.local` (or `MASTER_LICENSE_EMAIL` env var)
  - Key: `HAI-MASTER-DEV-KEY-2026` (or `MASTER_LICENSE_KEY` env var)
- Master licenses validate locally without server connection
- Regular licenses require online validation against license server

## CRITICAL: Pre-Test Validation Protocol

**OBLIGATORIO**: Antes de pedir al usuario que pruebe cualquier cambio, SIEMPRE ejecutar:

```bash
# 1. Typecheck (TypeScript validation)
bun run typecheck

# 2. Lint con auto-fix
bun run lint:fix

# 3. Build del frontend (o build completo según el contexto)
bun run build        # Frontend only
# o
bun run tauri build  # Build completo Tauri
```

**Solo después de que TODOS pasen exitosamente** sin errores, pedir al usuario que pruebe.

**Razón**: Evitar errores runtime (ej: variables no importadas como `Presence`) que el usuario descubriría primero.
