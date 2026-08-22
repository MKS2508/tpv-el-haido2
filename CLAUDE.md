# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tpv-haido** is a Point of Sale (TPV/POS) desktop application for restaurants/bars built with Tauri 2 + SolidJS + TypeScript.

- **App ID**: `com.elhaido.tpv`
- **Features**: Order management, product catalog, thermal receipt printing, PIN-based user authentication, and Spanish AEAT tax compliance (VerificaTu)
- **Auto-updater**: Checks the release-hub endpoint `https://haido.releases.mks2508.systems/api/updates/{{target}}/{{arch}}/{{current_version}}` (Tauri 2 dynamic template — moved off GitHub Releases per R1 decision)

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
bun run build              # tsgo check + vite build (default, fast)
bun run build:tsc          # tsc check + vite build (alternative)
bun run tauri build        # Complete Tauri app
bun run deploy:rpi         # Build for Raspberry Pi

# Database seeding
bun run seed               # Seed demo data
bun run seed:clear         # Clear and reseed

# Auxiliary apps
bun run license-server     # License validation server (Elysia.js)
bun run docs               # Documentation site (Next.js)
bun run docs:build         # Build documentation
bun run docs:rpi           # Generate docs for Raspberry Pi deployment
bun run build:pwa          # Build PWA version (sets /tpv/ base path)
bun run deploy:pwa         # Full PWA deployment (build + docs)

# Sidecar builds
bun run build:aeat-sidecar       # Build AEAT sidecar for current platform
bun run build:aeat-sidecar:all   # Build AEAT sidecar for all platforms

# Code quality
bun run lint               # Biome linter
bun run lint:fix           # Auto-fix with Biome
bun run lint:solid         # ESLint with SolidJS plugin
bun run lint:ox            # Oxlint (OxC-based, ultra-fast)
bun run format             # Format with Biome
bun run check              # Biome + ESLint
bun run typecheck          # TypeScript validation (tsgo, fast)
bun run typecheck:tsc      # Alternative: traditional tsc --noEmit
```

### Environment Variables

```bash
# PWA build mode (sets base path to /tpv/ for subdirectory deployment)
PWA_BUILD=true bun run build

# Remote development (enables HMR on different machine)
TAURI_DEV_HOST=192.168.1.100 bun run dev
```

## Architecture

### Tech Stack

**Frontend:**
- Framework: SolidJS 1.9.5 (NOT React)
- UI: Kobalt UI + custom components + Tailwind CSS 4.1
- State: SolidJS store with Immer middleware
- Animation: MotionOne
- Icons: Lucide-Solid
- Charts: @amad3v/solid-chart (Chart.js wrapper)
- Toast: Solid-Sonner
- Theme: @mks2508/shadcn-basecoat-theme-manager (12 themes)
- Virtual Lists: @tanstack/solid-virtual
- Screenshots: modern-screenshot (base64 capture + save via Tauri)
- Date Utils: date-fns
- Class Utils: clsx + tailwind-merge (via `cn()` helper in `/src/lib/utils.ts`)
- Component Variants: class-variance-authority (CVA)
- Tailwind Animations: tailwindcss-animate
- Dev Orchestration: concurrently (runs license server + docs + Tauri in parallel)

**Backend:**
- Framework: Tauri 2 (Rust)
- Database: Embedded SQLite via rusqlite (bundled, no sidecar)
- Error Handling: `@mks2508/no-throw` Result pattern

**Build:**
- Vite 7.3.1 with solid-plugin
- Dev server: Fixed port 1420, `strictPort: true` (fails if port unavailable)
- TypeScript 5.9.3
- tsgo for type checking (faster alternative to tsc)
- Dual linting: Biome (fast) + ESLint with solid-plugin (SolidJS-specific rules)

### Database (Rust Backend)

The app uses **embedded SQLite** via `rusqlite` crate (not a sidecar):
- Database file: `{app_data_dir}/tpv-haido.db`
  - macOS: `~/Library/Application Support/com.elhaido.tpv/`
  - Linux: `~/.config/com.elhaido.tpv/`
  - Windows: `%APPDATA%\com.elhaido.tpv\`
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

// Batch multiple state updates (prevents multiple re-renders)
batch(() => {
  setState('field1', value1);
  setState('field2', value2);
});

// Access reactive state
store.state.products  // Reactive signal

// Update with produce (Immer-like for SolidJS)
setState(produce((s) => {
  s.products.push(newProduct);
}));

// Complex actions (order management)
store.addToOrder(orderId, item);           // Add item to order
store.removeFromOrder(orderId, productId);  // Remove item from order
store.handleTableChange(tableId);          // Handle table assignment
```
```

### Triple Storage System (`/src/services/storage/`)

Three storage adapters implementing `IStorageAdapter`:

1. **SqliteStorageAdapter** - Calls Rust Tauri commands (primary for desktop)
2. **HttpStorageAdapter** - REST API client (for remote server mode)
3. **IndexedDbStorageAdapter** - Browser storage (for PWA/web fallback)

Storage mode switchable at runtime via `store.setStorageMode(mode)`:
- Default: `isTauri() ? 'sqlite' : 'indexeddb'` (or `config.storage.defaultMode` if set)
- Stored in localStorage: `tpv-storage-mode` (debounced, 300ms delay)
- Fallthrough chain: sqlite → http → indexeddb

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
- Sections (9 total in `/src/components/Sections/`):
  - `Home` - Dashboard with quick actions
  - `Products` - Product catalog management
  - `NewOrder` - Active order creation
  - `OrderHistory` - Past orders view
  - `Customers` - Customer management
  - `Settings` - App configuration
  - `AEATInvoices` - Tax invoice validation
  - `Login` - PIN authentication
  - `SectionHeader` - Shared header component
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
- `/src/lib/themes/` - Theme system with 12 presets (Light, Dark, Ocean, Forest, Sunset, Lavender, Rose, Slate, Amber, Emerald, Crimson, Midnight)
- `/src-tauri/src/` - Rust backend (database.rs, lib.rs, license.rs, models/)
- `/apps/license-server/` - Elysia.js license validation server
- `/apps/haidodocs/` - Next.js documentation site

## Sidecars

Only one sidecar is currently configured:
- **aeat-bridge**: Spanish AEAT VerificaTu integration for tax invoice validation
  - Built from: `scripts/build-aeat-sidecar.ts`
  - Config: `src-tauri/tauri.conf.json` → `externalBin: ["sidecars/aeat-bridge"]`
  - **External dependency**: Requires `tpv-soap-aeat` project cloned in one of:
    - `../../tpv-soap-aeat`
    - `/Users/mks/tpv-soap-aeat`
  - **Cross-compilation**: Uses Bun `--target=bun-{platform}` flag for:
    - `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `windows-x64`
  - **Prebuild check**: `prebuild` script runs before Tauri commands to ensure sidecars exist

## Tauri Plugins Used

```json
"@tauri-apps/api": "^2.8.0",
"@tauri-apps/plugin-dialog": "^2.6.0",
"@tauri-apps/plugin-http": "^2.5.6",
"@tauri-apps/plugin-opener": "^2.5.3",
"@tauri-apps/plugin-process": "^2.3.1",
"@tauri-apps/plugin-shell": "^2.3.4",
"@tauri-apps/plugin-updater": "^2.9.0"
```

**Permissions** (`src-tauri/capabilities/default.json`):
- `core:default`, `opener:default`, `shell:default`, `http:default`, `updater:default`, `dialog:default`
- `process:allow-restart` - Allows app to restart itself (useful for config changes)

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
- PWA support — hand-rolled `public/sw.js` (STATIC/DYNAMIC/IMAGE/FONT cache layers) registered in `src/main.tsx` (gated by `!isTauri()`), `public/manifest.json` (icons, scope, screenshots, shortcuts), `index.html` PWA meta tags, and `scripts/build-pwa.ts` deploy script (copies dist + manifest + sw + icons + theme CSS into `apps/haidodocs/public/tpv/` with `/tpv/` base path)

### Partially Implemented ⚠️
- Platform abstraction (interface exists but `isTauri()` scattered everywhere - 5 implementations)
- Thermal printer integration — service layer works (HTTP client to external `tickmaster-daemon` via `@mks2508/tickmaster/sdk`); daemon runs on `RPI-BAR` (Raspberry Pi on the tailnet) and talks to an Epson TM-U210PD (matrix 9-pin, USB-parallel via Prolific PL2305) over `bun:ffi` + `libusb-1.0`. **Not** a Tauri sidecar.

### Not Implemented ❌
- Tauri Mobile support (would need major refactoring)
- Offline-first web mode

### Technical Debt
1. **Platform abstraction unused**: 16+ files directly call `invoke()` instead of using PlatformService
2. **Scattered platform detection**: 5 different `isTauri()` implementations across codebase
3. **No testing**: Zero test coverage

## Utility Scripts

Located in `/scripts/`:

- `prebuild-sidecars.ts` - Check and build sidecars before Tauri commands
- `build-aeat-sidecar.ts` - Build AEAT bridge for current/all platforms
- `build-pwa.ts` - PWA build orchestration
- `seed.ts` - Database seeding with `--clear` option
- `codemods/` - React-to-SolidJS conversion scripts:
  - `className-to-class.ts` - Convert className to class attribute
  - `react-imports-to-solid.ts` - Convert React imports to SolidJS
  - `useEffect-to-createEffect.ts` - Convert useEffect to createEffect
  - `useState-to-createSignal.ts` - Convert useState to createSignal

### Public Assets

- `public/manifest.json` - PWA manifest (icons, scope, screenshots, shortcuts); paired with hand-rolled `public/sw.js` registered from `src/main.tsx`
- `public/themes/registry.json` - Theme registry for the 12 available themes

### Configuration Files

- `components.json` - Shadcn UI component configuration
- `tsconfig.node.json` - TypeScript config for Node.js scripts (build scripts, etc.)
- `.vscode/extensions.json` - Recommended VS Code extensions for the project
- `.claude/settings.local.json` - Claude Code local settings (project-specific)

### Linting & Formatting Configuration

- `biome.json` - Biome linter and formatter configuration (for src/)
- `eslint.config.js` - ESLint configuration with solid-plugin
- `oxlint.json` - Oxlint configuration (ultra-fast linting)

### Library Utilities (`/src/lib/`)

- `config.ts` - App configuration (storage defaults, etc.)
- `utils.ts` - General utilities including `cn()` className helper
- `theme-utils.ts` - Theme management utilities
- `themes/preset-themes.ts` - 12 preset theme definitions
- `error-codes.ts` - Centralized error code definitions (9 domains, 70+ error codes)

### Assets & Data (`/src/assets/`)

- `seed-data.json` - Initial database seeding data
- `products.json` - Product catalog backup/reference
- `categories.json` - Category definitions
- `utils/icons/iconOptions.ts` - Icon configuration and options
- `utils/utils.ts` - Asset-related utility functions

### Models (`/src/models/`)

TypeScript interfaces for domain entities:
- `User.ts` - User accounts with PIN authentication
- `Product.ts` - Product catalog items
- `Category.ts` - Product categories
- `Order.ts` - Orders with items, table assignments
- `Table.ts` - Restaurant tables
- `Customer.ts` - Customer information
- `ThermalPrinter.ts` - Printer configuration
- `AEAT.ts` - Spanish tax invoice types

### Utilities (`/src/utils/`)

- `aeat-certificates.ts` - AEAT certificate handling

### Services (`/src/services/`)

- `sqlite-storage-adapter.ts` - SQLite via Tauri commands (desktop)
- `http-storage-adapter.ts` - REST API client (remote server mode)
- `indexeddb-storage-adapter.ts` - IndexedDB (PWA/web fallback)
- `storage-adapter.interface.ts` - Common storage interface
- `thermal-printer.service.ts` - HTTP client to external `tickmaster-daemon` (Raspberry Pi on tailnet runs the daemon, talks to Epson TM-U210PD over `bun:ffi` + `libusb-1.0` — not a Tauri sidecar, not ESC/POS)
- `stock-images.service.ts` - Stock image management
- `data-migration.service.ts` - Data migration utilities
- `platform/` - Platform detection and abstraction (currently unused)

### Rust Backend (`/src-tauri/src/`)

- `lib.rs` - Main Tauri command registry (25+ commands exposed to frontend)
- `database.rs` - SQLite schema initialization and CRUD operations
- `license.rs` - License validation logic (master key + online validation)
- `models/` - Rust structs mirroring frontend TypeScript interfaces
  - `mod.rs` - Module exports
  - `license.rs` - License-related models
- `screenshot.rs` - Screenshot capture and save functionality
- `build.rs` - Rust build script (compile-time configuration)

### Tauri Configuration (`/src-tauri/`)

- `tauri.conf.json` - Main Tauri app configuration (windows, bundle, plugins)
- `capabilities/default.json` - Permission definitions for the main window
- `icons/` - App icons in various sizes (32x32, 128x128, 256x256, .icns for macOS)
- `sidecars/` - External binaries (aeat-bridge for AEAT integration)

### Frontend Entry Point

- `src/App.tsx` - Main SolidJS app component with section routing
- `vite.config.ts` - Vite configuration (SolidJS plugin, Tailwind, path aliases, dev server)
- `index.html` - HTML entry point (Vite injects built assets here)
- `tsconfig.json` - TypeScript configuration with path aliases (@/ → ./src)

### TypeScript Types (`/src/types/`)

- `license.ts` - License status and validation types

### Components (`/src/components/`)

- `Sections/` - Main app sections (Home, Products, NewOrder, OrderHistory, Customers, Settings, AEATInvoices, Login, SectionHeader)
- `ui/` - Reusable UI components (Kobalt-based + custom)

### Custom Hooks (`/src/hooks/`)

- `useUpdater.ts` - Tauri auto-updater with download progress
- `useScreenshot.ts` - Screenshot capture and save functionality
- `useAEATSidecar.ts` - AEAT sidecar communication

### State Management (`/src/store/`)

- `store.ts` - Main SolidJS store with:
  - `createStore` for reactive state
  - `produce` for immutable updates (Immer-like for SolidJS)
  - `batch` for batching multiple state updates
  - Debounced localStorage persistence (300ms delay)
  - Storage adapter selection logic
  - Complex actions (order management, table handling)

### Rust Build Configuration

- `Cargo.toml` - Rust dependencies and crate configuration (rusqlite, serde, tauri, etc.)
- `Cargo.lock` - Locked Rust dependency versions for reproducible builds

### Package Management

- `package.json` - npm/Bun dependencies and scripts (SolidJS, Tauri, UI libs)
- `bun.lockb` - Locked Bun dependency versions for reproducible installs

### Documentation

- `README.md` - Project overview and getting started guide (note: mentions outdated React info - use this doc for accurate stack details)
- `CLAUDE.md` - This file (guidance for Claude Code working in this repository)

### Git & Planning

- `.gitignore` - Git ignore patterns (node_modules, dist, .env, etc.)
- `todo-plans/` - Planning documents for future features (includes PWA architecture plan)

### Utility Scripts

See "Utility Scripts" section above for details on:
- Build scripts (sidecars, PWA, RPi)
- Codemods (React to SolidJS conversion)
- Seeding and data management

### Build Outputs

- `dist/` - Frontend build output (Vite production build)
- `src-tauri/target/` - Rust build output (cargo build artifacts)
  - `release/` - Release binaries (final app bundles)
  - `debug/` - Debug binaries (development builds)

### Development Files

- `node_modules/` - npm/Bun dependencies (auto-generated, gitignored)
- `.env` - Environment variables (create local copy, gitignored)
- `.env.example` - Environment variable template (if exists)

### App Assets

- `src-tauri/icons/` - App icons in multiple formats/sizes for different platforms
- `src/assets/` - Frontend assets (images, seed data, icons, categories, products)
- `public/` - Static assets served directly (manifest, themes, other public files)

### Sidecar Binaries

- `src-tauri/sidecars/` - External binaries bundled with the Tauri app
  - `aeat-bridge-{triple}` - AEAT VerificaTu integration binary
    - Platform-specific naming: `aeat-bridge-x86_64-unknown-linux-gnu`, etc.
    - Auto-built by `prebuild` script if missing
    - Executed as subprocess from Rust backend

### Auxiliary Apps

See "Monorepo Structure" section above for details on:
- `apps/license-server/` - Elysia.js license validation server
- `apps/haidodocs/` - Next.js documentation site with MDX support

### Data Seeding

- `scripts/seed-data.json` - Seed data for products, categories, users, tables
- `scripts/seed.ts` - Seed script that calls Tauri commands to populate database
  - `bun run seed` - Add seed data to existing database
  - `bun run seed --clear` - Clear database and reseed (via `seed:clear` npm script)

### Documentation Generation

- `generate-docs.ts` - Root-level docs generation (tries node, falls back to bun)
- `releases/documentation/generate-docs.ts` - Release-specific doc generation
- `releases/documentation/generate-docs.ts` - Also has scripts for manual/PDF generation
  - `scripts/improve-cover.ts` - Enhance documentation cover
  - `scripts/generate-manual.ts` - Generate user manual
  - `scripts/generate-pdf.ts` - Export documentation as PDF
  - `scripts/fix-manual-html.ts` - Fix HTML in manual output

### Documentation Site Structure (`apps/haidodocs/`)

- `src/app/` - Next.js App Router pages
  - `(home)/` - Homepage with search
  - `docs/` - Spanish documentation pages
  - `en/docs/` - English documentation pages
  - `api/search/` - Search API endpoint
  - `manual-print/` - Printable manual view
  - `og/docs/` - Open Graph image generation
- `src/components/` - React components
  - `language-selector.tsx` - Language switcher (es/en)
  - `markdown-actions.tsx` - Markdown action buttons
  - `mdx/` - MDX components (Checklist, ComparisonTable, FeatureGrid, FileTree, Kbd, Mermaid, Pre, Terminal)
  - `ui/` - UI components (TypewriterCode for code examples)
- `src/lib/` - Library utilities
  - `layout.shared.tsx` - Shared layout components
  - `source.ts` - Content source configuration
- `src/config/site.config.ts` - Site configuration (title, description, URLs)
- `src/mdx-components.tsx` - MDX component mappings
- `messages/` - i18n messages (en.json, es.json)
- `biome.json` - Biome configuration for docs
- `oxlint.json` - Oxlint configuration for docs
- `package.json` - Dependencies (Next.js, Shadcn, MDX, etc.)
- `tsconfig.json` - TypeScript configuration
- `source.config.ts` - Content source configuration

### License Server Structure (`apps/license-server/`)

- `src/index.ts` - Elysia.js server entry point
- `src/routes/` - API route handlers
  - `license.ts` - License validation endpoints
  - `admin.ts` - Admin endpoints for license management
- `src/services/` - Business logic
  - `license.service.ts` - License validation and activation
  - `crypto.service.ts` - Cryptographic utilities (signatures, hashing)
- `src/db/` - Database layer
  - `schema.ts` - Drizzle ORM schema
- `src/schemas/` - Validation schemas
  - `license.schema.ts` - License request/response validation
- `src/lib/` - Library utilities
  - `error-codes.ts` - Server-specific error codes
  - `logger.ts` - Logging configuration
- `src/types/index.ts` - TypeScript type definitions
- `scripts/seed.ts` - Database seeding script
- `package.json` - Dependencies (Elysia, Drizzle, etc.)
- `tsconfig.json` - TypeScript configuration

- `generate-docs.ts` - Documentation generation (fallback to bun if node fails)
- `releases/documentation/generate-docs.ts` - Release-specific doc generation

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
│   ├── license-server/    # Elysia.js license validation server (Bun)
│   │   └── src/
│   │       ├── routes/    # API endpoints (admin, license)
│   │       ├── services/  # License validation, crypto
│   │       └── db/        # Drizzle ORM schema
│   └── haidodocs/         # Next.js documentation site
│       └── src/
│           ├── app/       # App router pages (docs, search, OG)
│           ├── components/# MDX components (Checklist, FileTree, Mermaid, etc.)
│           └── config/    # Site configuration
└── src/                   # Main SolidJS + Tauri app
```

## License System

- **Master credentials** (for dev):
  - Email: `admin@haido.local` (or `MASTER_LICENSE_EMAIL` env var)
  - Key: `HAI-MASTER-DEV-KEY-2026` (or `MASTER_LICENSE_KEY` env var)
- Master licenses validate locally without server connection
- Regular licenses require online validation against license server

## Release CLI (`scripts/release.ts`) — publish to desktop-release-hub

CLI que autentica contra Pocket ID y publica artefactos firmados a
`desktop-release-hub` (`haido.releases.mks2508.systems` / `admin.releases.mks2508.systems`).
Dos modos de auth — **elegí el que corresponda, no son intercambiables**:

| Modo | Cuándo | Auth | Cache |
|---|---|---|---|
| **PKCE loopback** (humano) | `bun run scripts/release.ts auth login` (una vez) → `publish` sin flags | Navegador, passkey Pocket ID | `~/.config/release-hub/token.json` (refresh automático) |
| **`client_credentials`** (CI/headless) | `publish --client-credentials` | `RELEASE_HUB_CLIENT_ID` / `RELEASE_HUB_CLIENT_SECRET` (env vars, GitHub Secrets en CI) | **Ninguno** — mintea token nuevo en memoria cada invocación, se descarta al salir |

```bash
# Humano, una vez por máquina
bun run scripts/release.ts auth login
bun run scripts/release.ts auth status   # ver token cacheado / expiry
bun run scripts/release.ts auth logout   # borrar cache

# Publish manual (usa el token PKCE cacheado)
bun run scripts/release.ts publish --target macos-arm64 --slug haido [--dry-run]

# Publish headless (CI, o local si exportás las env vars) — nunca abre navegador
RELEASE_HUB_CLIENT_ID=... RELEASE_HUB_CLIENT_SECRET=... \
  bun run scripts/release.ts publish --client-credentials --skip-build --target linux-x64 --slug haido
```

**Flags de `publish`**: `--target <macos-arm64|macos-x64|windows-x64|linux-x64|linux-arm64|all>`
· `--slug <project>` (default implícito `haido`) · `--hub <url>` (default
`https://admin.releases.mks2508.systems`) · `--notes "..."` · `--skip-build` (asume artifacts ya
compilados en `releases/<version>/<target>/`) · `--client-credentials` (ver tabla arriba) ·
`--dry-run` (loguea qué subiría, sin `POST` real — **excepción**: con `--client-credentials`
igual mintea un token real, para poder probar el grant sin arriesgar un upload real).

**CI**: `linux-x64-deploy.yml` / `linux-arm64-deploy.yml` corren `publish --client-credentials
--skip-build` en tags `v*` (nunca en push a `main`, que es solo smoke build) — auto si
`RELEASE_HUB_CLIENT_ID`/`SECRET` existen como GitHub Secrets, cae a instrucciones manuales en el
step summary si faltan o si el publish automático falla (nunca un rojo sin salida). Verificado
end-to-end real en el tag `v0.1.3` (2026-08-21) — ver `docs/task-requests/TR-15-*.md` y
`docs/decisions/r4-auth-ci-hub-client-credentials-2026-08-21.md` para el detalle de investigación
(por qué OAuth2 `client_credentials` y no las otras 2 opciones evaluadas) y la evidencia de
verificación (logs de CI + `GET` real al hub + descarga del artifact).

**Secrets**: `RELEASE_HUB_CLIENT_ID`/`SECRET` viven en GitHub Secrets (CI) y en `.env.local`
(gitignored, para smoke manual) — nunca en commit/log/doc. El client Pocket ID (`ci-tpv-haido`,
`client_credentials` grant) fue creado vía Admin API de Pocket ID, no por UI — ver TR-15 si hace
falta rotarlo o crear uno nuevo para otro proyecto.

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

## Tauri Configuration (`src-tauri/tauri.conf.json`)

- **Product Name**: TPV El Haido
- **Version**: 0.1.0
- **Identifier**: com.elhaido.tpv
- **Window**: 1200x800 default size
- **Dev URL**: http://localhost:1420 (strictPort, fails if unavailable)
- **Frontend Dist**: ../dist
- **Updater**: release-hub endpoint with minisign public key (`https://haido.releases.mks2508.systems/api/updates/{{target}}/{{arch}}/{{current_version}}`, Tauri 2 dynamic template)
- **External Binaries**: sidecars/aeat-bridge
- **Build Targets**: "all" (creates artifacts for all platforms)
- **CSP**: null (no content security policy restriction)

## Workflow

Este proyecto usa **Axon** (meta-orchestrator para multi-session projects).

**Configuración**: `.claude/axon.config.json`

**Archivos clave**:
- `docs/roadmap.model.yml` — SSOT del roadmap (schema de nodos `axon` v0.2.2: outcome/track +
  milestones anidados + gates per-item). Mutaciones solo vía `axon` CLI/MCP, nunca edición manual.
- `docs/ROADMAP.md` — roadmap legible (generado desde el modelo, guard `bun run check:roadmap`)
- `docs/task-requests/` — task-requests para @task-decomposer
- `docs/progress-log.md` — log de progreso por fase
- `docs/handoffs/` — handoffs entre sesiones

**Comandos útiles**:
```
/setup-workflow              # Re-configurar workflow del proyecto
/planning-roadmap "<brief>"  # Generar roadmap + task-requests
@task-decomposer <TR>         # Descomponer task-request en plan
@task-executor <plan>        # Ejecutar plan
```

**Milestone actual**: 0.4.0 + 0.5.0 (Production deployment at brother's bar)

**Fases críticas**:
- **0.4.0**: Auto-update system + Coolify migration (BLOCKER)
- **0.5.0**: Thermal printer integration (BLOCKER)
