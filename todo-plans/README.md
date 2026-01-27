# 📋 TPV El Haido - Plan de Arquitectura PWA

> **Fecha:** 2026-01-27
> **Estado:** Listo para implementar
> **Tiempo estimado:** 3h 30m

---

## 🎯 Objetivo

Separar el frontend para que pueda funcionar como **PWA web standalone** (usando IndexedDB) **y** como **app nativa Tauri** (usando SQLite), sin duplicar código.

---

## 🏗️ Estado Actual

### ✅ Lo que funciona bien:

1. **Interfaz de almacenamiento unificada**
   - `IStorageAdapter` con métodos comunes para productos, categorías, órdenes
   - Abstracción limpia que permite múltiples implementaciones

2. **3 adaptadores implementados**
   - `IndexedDbStorageAdapter` → PWA web
   - `SqliteStorageAdapter` → Tauri nativa
   - `HttpStorageAdapter` → Backend remoto

3. **Detección de entorno**
   - `isTauri()` en `utils/environment.ts`
   - Funciona correctamente

4. **Cambio dinámico de storage mode**
   - `setStorageMode(mode)` en store.ts
   - Switch dinámico entre `sqlite`, `http`, `indexeddb`
   - `getStorageAdapterForMode(mode)` que retorna el adapter correcto

5. **Persistencia de configuración**
   - localStorage guarda el modo de almacenamiento
   - Funciones de debouncing para evitar escrituras redundantes

### ⚠️ Problemas Identificados:

1. **Uso disperso de Tauri APIs**
   - Componentes llaman directamente a `@tauri-apps/plugin-*` en múltiples lugares
   - No hay abstracción para platform-specific features (printer, updater, file dialogs)
   - Difícil de probar en modo web

2. **Los servicios NO usan el storage adapter**
   - `ProductService`, `CategoriesService`, `OrderService` hacen llamadas HTTP directas
   - No pasan por `UnifiedDataService` (que existe pero no se usa)
   - Lógica duplicada en servicios

3. **Lógica de negocio mezclada con infraestructura**
   - Lógica de órdenes está en el store (Zustand)
   - Servicios tienen algo de lógica pero no son la fuente de verdad
   - Responsabilidades poco claras

4. **No hay PWA-ready setup**
   - Sin service worker
   - Sin `manifest.json` para PWA
   - Sin configuración para offline-first en web

5. **La detección de entorno existe pero no se usa consistentemente**
   - Hay `isTauri()` en environment.ts
   - Pero muchos componentes ignoran la detección

---

## 🏗️ Arquitectura Propuesta

### Diagrama de Capas

```
┌───────────────────────────────────────────────────────┐
│                   Componentes UI                     │
│                      (React)                         │
│                  (Cards, Dialogs, etc.)             │
└────────────────────┬──────────────────────────────────┘
                     │
        ┌────────────▼─────────────┐
        │    Store (Zustand)       │
        │  (Estado de aplicación)  │
        └────────────┬──────────────┘
                     │
        ┌────────────▼─────────────┐
        │  UnifiedDataService     │
        │  (Capa principal datos)   │
        └────────────┬──────────────┘
                     │
        ┌────────────▼─────────────┐
        │   IStorageAdapter         │
        └────────────┬──────────────┘
                │           │
         ┌──────▼──────┐ ┌──────▼──────┐
         │  IndexedDB  │ │   SQLite     │
         │   (PWA)     │ │  (Tauri)    │
         └─────────────┘ └──────────────┘
                │           │
               ┌───────▼─────────┐
               │    HTTP         │
               │  (Backend)      │
               └────────────────┘
```

### Nueva Estructura de Carpetas

```
src/
├── services/
│   ├── platform/                    # NUEVO - Abstracción de plataforma
│   │   ├── PlatformService.ts      # Interfaz para printer, dialogs, updater
│   │   ├── PlatformDetector.ts      # Función isTauri()
│   │   ├── WebPlatformService.ts    # Implementación PWA (stubs)
│   │   └── TauriPlatformService.ts  # Implementación Tauri (wrapper real)
│   ├── data/                        # NUEVO - Capa unificada de datos
│   │   ├── UnifiedDataService.ts   # Constructor recibe IStorageAdapter
│   │   └── DataMigrationService.ts # Migraciones entre adapters
│   └── storage/                     # YA EXISTE
│       ├── storage-adapter.interface.ts
│       ├── indexeddb-storage-adapter.ts
│       ├── http-storage-adapter.ts
│       └── sqlite-storage-adapter.ts
├── components/
│   ├── Sections/
│   │   └── thermal-printer.tsx   # MIGRAR a PlatformService
│   ├── Settings/
│   │   ├── Updater.tsx            # MIGRAR a PlatformService
│   │   └── DataImport.tsx          # MIGRAR a PlatformService
└── store/
    └── store.ts                     # MIGRAR para usar PlatformService
```

### Principios de Diseño

1. **Separación de Responsabilidades**
   - **Store (Zustand)** → Estado de la aplicación
   - **UnifiedDataService** → Capa principal de datos
   - **PlatformService** → APIs específicas de plataforma
   - **Componentes** → UI y lógica de presentación

2. **Dependency Inversion**
   - Los componentes no deberían depender de `@tauri-apps/plugin-*` directamente
   - Deben depender de `PlatformService`
   - `PlatformService` es un stub en modo PWA

3. **Single Source of Truth**
   - `UnifiedDataService` es la única interfaz para datos
   - Store solo interactúa con `UnifiedDataService`
   - Servicios viejos (`ProductService`, etc.) se deprecian

---

## 🚀 Estrategia de Build

### Modo PWA Web
- Build con Vite
- Genera `manifest.json`
- Genera `sw.js`
- Despliegue en `/` o Vercel/Netlify
- Usa `IndexedDbStorageAdapter` por defecto

### Modo Tauri Nativo
- Build con `npm run tauri build`
- Genera `.deb`, `.rpm`, `.AppImage`
- Usa `SqliteStorageAdapter` por defecto
- Acceso a APIs nativas vía `TauriPlatformService`

### Compartición de Código
- Componentes UI son 100% compartidos
- Lógica de negocio compartida
- Solo cambia la implementación de `PlatformService` y el `StorageAdapter`
- `UnifiedDataService` es idéntico en ambos modos

---

## 📝 Lista de Tareas

Ver archivo `todo-plans/pwa-architecture-plan.json` para el plan detallado con:
- Tareas específicas
- Estimados de tiempo
- Dependencias
- Estrategia de paralelización

---

## ✅ Checklist de Verificación

- [ ] PWA puede desplegarse standalone
- [ ] PWA usa IndexedDB en modo offline
- [ ] Switch entre storage modes transparente para el usuario
- [ ] Tauri usa `TauriPlatformService` para todas las APIs específicas
- [ ] No hay llamadas directas a `@tauri-apps/plugin-*` en componentes
- [ ] `UnifiedDataService` es la única fuente de verdad de datos
- [ ] `PlatformService` es un stub limpio en modo PWA
- [ ] Service worker cachea recursos estáticos
- [ ] No hay duplicación de lógica de negocio
