# TPV El Haido - Plan PWA + Tauri Mobile

> **Actualizado:** 2026-01-29
> **Estado:** Listo para implementar
> **Tiempo estimado:** 4h total

---

## Objetivo

Hacer que el frontend funcione en **3 plataformas**:
1. **Desktop** (Tauri + SQLite) - Ya funciona ✅
2. **PWA Web** (IndexedDB) - Arquitectura lista, falta setup
3. **Tauri Mobile** (iOS/Android) - Preparar base

---

## Estado Actual (Análisis Real del Código)

### ✅ Lo que funciona bien

| Componente | Estado | Notas |
|------------|--------|-------|
| **SQLite embebido** | ✅ Completo | rusqlite en Rust, 25/25 métodos |
| **IndexedDB Adapter** | ✅ Completo | 25/25 métodos, PWA-ready |
| **HTTP Adapter** | ✅ Parcial | 19/25 métodos, fallback automático |
| **Storage switching** | ✅ Funciona | Runtime switch vía store |
| **PlatformService interface** | ✅ Definida | 8 métodos en interface |
| **WebPlatformService** | ✅ Implementada | Fallbacks para web |
| **AEAT Sidecar** | ✅ Funciona | Para facturas (solo desktop) |

### ⚠️ Problemas Identificados

#### 1. `isTauri()` duplicado en 5 lugares

```
src/services/platform/PlatformDetector.ts  ← Debería ser el único
src/utils/environment.ts                   ← Duplicado
src/store/store.ts                         ← Función local
src/hooks/useAEATSidecar.ts                ← Función local
src/services/http-storage-adapter.ts       ← Check diferente (__TAURI_IPC__)
```

**Impacto:** Inconsistencia y código duplicado.

#### 2. `getPlatformService()` existe pero NUNCA se usa

```typescript
// src/services/platform/index.ts
export function getPlatformService(): PlatformService {
  // Esta función existe pero 0 componentes la llaman
}
```

**Impacto:** La abstracción existe pero nadie la usa. Los componentes siguen llamando a Tauri directamente.

#### 3. TauriPlatformService tiene 6 stubs

```typescript
// src/services/platform/TauriPlatformService.ts
async printTicket(order: Order): Promise<void> {
  console.log('TODO: Implement printing'); // ← STUB
}
```

**Métodos stub:** printTicket, printReceipt, openFileDialog, saveFileDialog, checkForUpdates, downloadAndInstall

#### 4. 16 archivos con imports directos de Tauri

| Acoplamiento | Archivos |
|--------------|----------|
| **Alto** | sqlite-storage-adapter.ts, thermal-printer.service.ts, LicenseDialog.tsx, LicenseStatus.tsx, LicenseSplashScreen.tsx |
| **Medio** | useUpdater.ts, setupNativeMenu.ts, SettingsPanel.tsx |
| **Bajo** | http-storage-adapter.ts (tiene fallback), VersionInfo.tsx, useScreenshot.ts |

#### 5. PWA: 0% implementado

- ❌ No existe `manifest.json`
- ❌ No existe service worker
- ❌ No hay iconos PWA (192, 512)
- ❌ No hay `vite-plugin-pwa`
- ✅ Meta tags básicos en index.html (viewport, theme-color)

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Componentes UI                           │
│                      (Solid.js)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ getPlatform │  │   Store     │  │  Services   │
│  Service()  │  │  (Zustand)  │  │             │
└──────┬──────┘  └──────┬──────┘  └─────────────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│   Tauri     │  │  Storage    │
│  Platform   │  │  Adapter    │
│  Service    │  │             │
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────────────────────┐
│   Web       │  │  SQLite │ HTTP │ IndexedDB  │
│  Platform   │  │(Desktop)│(API) │   (PWA)    │
│  Service    │  └─────────────────────────────┘
└─────────────┘
```

---

## Plan de Implementación

### Fase 0: Consolidar isTauri (30 min) 🔴 CRÍTICO

**Objetivo:** Una única fuente de verdad para detección de plataforma.

| Archivo | Acción |
|---------|--------|
| `src/services/platform/PlatformDetector.ts` | Mantener como fuente única |
| `src/store/store.ts` | Eliminar función local, importar de platform |
| `src/hooks/useAEATSidecar.ts` | Eliminar función local, importar de platform |
| `src/components/VersionInfo.tsx` | Usar `isPlatformTauri` export |
| `src/components/Sections/Login.tsx` | Usar `isPlatformTauri` export |
| `src/utils/environment.ts` | Re-exportar desde platform o deprecar |

---

### Fase 1: Conectar Platform Abstraction (1h 30min)

**Objetivo:** Que `getPlatformService()` se use realmente.

#### 1.1 Completar TauriPlatformService

```typescript
// src/services/platform/TauriPlatformService.ts

// Delegar a servicios existentes:
async printTicket(order: Order): Promise<void> {
  await thermalPrinterService.printTicket(order);
}

async checkForUpdates(): Promise<void> {
  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check();
  // ... lógica de useUpdater.ts
}
```

#### 1.2 Migrar useUpdater

```typescript
// src/hooks/useUpdater.ts
// ANTES: import { check } from '@tauri-apps/plugin-updater'
// DESPUÉS:
import { getPlatformService } from '@/services/platform';

const platform = getPlatformService();
await platform.checkForUpdates();
```

#### 1.3 Crear LicenseService

```typescript
// src/services/LicenseService.ts (nuevo)
export class LicenseService {
  async checkStatus(): Promise<LicenseStatus> {
    if (isPlatformTauri()) {
      return invoke('check_license_status');
    }
    // PWA: siempre válida o check remoto
    return { valid: true, type: 'pwa' };
  }
}
```

---

### Fase 2: PWA Setup (1h)

#### 2.1 Crear manifest.json

```json
// public/manifest.json
{
  "name": "TPV El Haido",
  "short_name": "TPV Haido",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

#### 2.2 Generar iconos

```bash
# Desde logo.svg generar:
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon-512-maskable.png
public/icons/apple-touch-icon.png
```

#### 2.3 Instalar vite-plugin-pwa

```bash
bun add -D vite-plugin-pwa
```

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
})
```

#### 2.4 Actualizar index.html

```html
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="TPV El Haido" />
```

---

### Fase 3: Tauri Mobile Prep (1h)

#### 3.1 Inicializar targets

```bash
bun tauri ios init
bun tauri android init
```

#### 3.2 Añadir plugin SQL para mobile

```toml
# src-tauri/Cargo.toml
[target.'cfg(any(target_os = "ios", target_os = "android"))'.dependencies]
tauri-plugin-sql = "2"
```

#### 3.3 AEAT Fallback

El sidecar AEAT no funciona en mobile. Opciones:
1. **API Remota:** Crear endpoint en servidor que haga la validación
2. **Desactivar:** Skip en mobile (no crítico para uso básico)
3. **Plugin nativo:** Reescribir en Rust puro (más trabajo)

---

## Checklist de Verificación

### Fase 0 ✓
- [ ] Solo existe UN `isTauri()` en todo el código
- [ ] Todos los archivos importan de `@/services/platform`

### Fase 1 ✓
- [ ] TauriPlatformService no tiene TODOs
- [ ] useUpdater usa getPlatformService()
- [ ] LicenseService creado y usado en componentes

### Fase 2 ✓
- [ ] `bun run build` genera manifest.json
- [ ] Service worker se registra
- [ ] App instalable en Chrome/Safari
- [ ] Lighthouse PWA score > 90

### Fase 3 ✓
- [ ] `bun tauri ios dev` funciona
- [ ] `bun tauri android dev` funciona
- [ ] SQLite funciona en mobile

---

## Quick Wins (Primeras victorias rápidas)

| Tarea | Tiempo | Impacto |
|-------|--------|---------|
| Consolidar isTauri | 30 min | Elimina deuda técnica |
| Crear manifest + iconos | 30 min | App instalable en browser |
| vite-plugin-pwa | 15 min | Service worker automático |

---

## Archivos Clave

```
src/
├── services/
│   ├── platform/
│   │   ├── PlatformService.ts      # Interface
│   │   ├── TauriPlatformService.ts # Implementación Tauri
│   │   ├── WebPlatformService.ts   # Implementación Web
│   │   ├── PlatformDetector.ts     # isTauri() ÚNICO
│   │   └── index.ts                # Factory getPlatformService()
│   ├── storage/
│   │   ├── storage-adapter.interface.ts
│   │   ├── sqlite-storage-adapter.ts
│   │   ├── http-storage-adapter.ts
│   │   └── indexeddb-storage-adapter.ts
│   └── LicenseService.ts           # NUEVO
├── store/
│   └── store.ts                    # Storage mode switching
public/
├── manifest.json                   # NUEVO
├── icons/                          # NUEVO
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
```

---

## Referencias

- **Plan JSON:** `todo-plans/pwa-architecture-plan.json`
- **CLAUDE.md:** Documentación actualizada del proyecto
- **Tauri Mobile:** https://v2.tauri.app/guides/mobile/
- **Vite PWA:** https://vite-pwa-org.netlify.app/
