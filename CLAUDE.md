# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TPV El Haido is a Point of Sale (POS) desktop application built with React + Tauri, optimized for Raspberry Pi 3 (ARM64). It provides a complete retail POS system with product management, order processing, and thermal receipt printing.

## Commands

### Development
```bash
npm run dev          # Start Vite dev server (port 1420)
npm run tauri:dev    # Run full Tauri app with hot reload
```

### Building
```bash
npm run build        # Production build (TypeScript + Vite)
npm run tauri        # Tauri production build
npm run deploy:rpi   # Cross-compile for Raspberry Pi ARM64
npm run build:rpi-full  # Full RPi build with documentation
```

### Preview
```bash
npm run preview      # Preview production build locally
```

## Architecture

### Frontend (src/)
- **React 19** with **TypeScript 5.9** and **Vite 7**
- **shadcn/ui** components (Radix UI + **TailwindCSS 4**)
- **Zustand 5** for state management (`src/store/`)
- **Framer Motion 12** for animations
- **Recharts 3** for data visualization
- **react-window 2** for virtualized lists

### Backend (src-tauri/)
- **Rust** with **Tauri 2.0**
- Plugins: tauri-plugin-opener, tauri-plugin-http, tauri-plugin-shell, tauri-plugin-updater, tauri-plugin-process

### Key Directories
```
src/
├── components/          # React components
│   ├── ui/              # shadcn/ui base components
│   └── Sections/        # Page components (Home, Login, Products, etc.)
├── services/            # Business logic & API layer
│   ├── thermal-printer.service.ts  # ESC-POS thermal printing
│   ├── indexeddb-storage-adapter.ts
│   └── http-storage-adapter.ts
├── store/               # Zustand store and selectors
├── models/              # TypeScript interfaces
├── hooks/               # Custom React hooks
└── lib/                 # Utilities and theme system
```

### Data Storage
- **Primary**: IndexedDB via `indexeddb-storage-adapter.ts`
- **Optional**: HTTP sync via `http-storage-adapter.ts`
- **Adapter Pattern**: Both implement `storage-adapter.interface.ts`

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

## Build Targets

- **ARM64 Linux** (Raspberry Pi 3): `aarch64-unknown-linux-gnu`
- **x64 Linux**: native build
- **Formats**: DEB, RPM, AppImage, executable

### Docker Build (Linux x64)
```bash
docker-compose up --build          # Build and extract artifacts
docker-compose run dev             # Development container
```

## CI/CD

GitHub Actions workflows:
- `.github/workflows/rpi-deploy.yml` - ARM64 builds for Raspberry Pi
- `.github/workflows/linux-x64-deploy.yml` - x64 builds + Docker

## OTA Updates

Auto-updates via `tauri-plugin-updater`:
- **Hook**: `src/hooks/useUpdater.ts`
- **Component**: `src/components/UpdateChecker.tsx`
- **Config**: `src-tauri/tauri.conf.json` (plugins.updater)

### Setup for releases:
1. Add `TAURI_SIGNING_PRIVATE_KEY` to GitHub secrets
2. Tag releases with `vX.Y.Z` format
3. Workflow generates `latest.json` automatically
