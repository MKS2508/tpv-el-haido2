# TPV El Haido - Point of Sale System

Una aplicación TPV (Terminal Punto de Venta) moderna desarrollada con React 19 + Tauri v2, optimizada para rendimiento y usabilidad en dispositivos táctiles.

## Características

### Funcionalidades Principales
- **Gestión de Pedidos**: Crear, modificar y completar pedidos con interfaz táctil optimizada
- **Catálogo de Productos**: CRUD completo con categorías, filtros y búsqueda
- **Historial de Pedidos**: Vista virtualizada para alto rendimiento con miles de registros
- **Sistema de Usuarios**: Autenticación por PIN con perfiles personalizables
- **Impresión Térmica**: Soporte para impresoras ESC/POS y apertura de cajón

### Base de Datos
- **SQLite Integrado**: Base de datos embebida en Rust para máximo rendimiento
- **Fallback IndexedDB**: Almacenamiento local cuando no hay backend Tauri
- **Persistencia Automática**: Sincronización automática de datos

### Interfaz de Usuario
- **12 Temas de Color**: Light, Dark, Ocean, Forest, Sunset, Lavender, Rose, Slate, Amber, Emerald, Crimson, Midnight
- **Modo Oscuro/Claro**: Detección automática de preferencia del sistema
- **Diseño Responsive**: Adaptación automática a desktop, tablet y móvil
- **Optimizaciones Táctiles**: Targets de 44px+, feedback visual, sin hover en touch

### Rendimiento
- **Virtualización**: Listas virtualizadas con react-window para grandes datasets
- **Selectores Memoizados**: Prevención de re-renders innecesarios
- **Detección de Rendimiento**: Ajuste automático de animaciones según dispositivo
- **Debounce en Persistencia**: Escrituras optimizadas a localStorage (300ms)

## Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Frontend | React | 19.2.4 |
| Backend | Tauri | 2.x |
| Estado | Zustand + Immer | 5.0.10 |
| Bundler | Vite | 7.3.1 |
| Estilos | TailwindCSS | 4.1.18 |
| Animaciones | Framer Motion | 12.29.2 |
| UI Components | Radix UI + shadcn/ui | latest |
| Base de Datos | rusqlite (Rust) | 0.31 |
| Runtime | Bun | latest |

## Desarrollo Local

### Requisitos
- Bun (recomendado) o Node.js 18+
- Rust 1.70+
- Tauri CLI v2

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/MKS2508/tpv-el-haido2.git
cd tpv-el-haido2

# Instalar dependencias
bun install

# Desarrollo (solo frontend)
bun run dev

# Desarrollo completo (frontend + Tauri)
bun run tauri dev

# Build de producción
bun run build
bun run tauri build
```

## Arquitectura

### Estructura del Proyecto

```
tpv-el-haido2/
├── src/
│   ├── components/
│   │   ├── Sections/          # Secciones principales (Home, Products, NewOrder, etc.)
│   │   └── ui/                # Componentes reutilizables (shadcn/ui)
│   ├── services/
│   │   ├── sqlite-storage-adapter.ts    # Adapter SQLite (Tauri)
│   │   ├── indexeddb-storage-adapter.ts # Adapter IndexedDB (fallback)
│   │   ├── storage-adapter.interface.ts # Interface común
│   │   └── thermal-printer.service.ts   # Servicio de impresión
│   ├── store/
│   │   ├── store.ts           # Store Zustand principal
│   │   └── selectors.ts       # Selectores memoizados
│   ├── hooks/
│   │   ├── usePerformanceConfig.ts # Detección de rendimiento
│   │   └── useResponsive.ts        # Breakpoints responsive
│   ├── models/                # Interfaces TypeScript
│   └── styles/
│       └── themes/            # Sistema de temas CSS
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs            # Comandos Tauri
│   │   ├── database.rs       # Módulo SQLite
│   │   └── models.rs         # Structs Rust
│   └── Cargo.toml
└── public/
```

### Patrones de Arquitectura

#### Sistema de Storage Adapters
```typescript
// Interface común para todos los adapters
interface IStorageAdapter {
  getProducts(): Promise<Product[]>
  createProduct(product: Product): Promise<void>
  updateProduct(product: Product): Promise<void>
  deleteProduct(product: Product): Promise<void>
  // ... más métodos
}

// Implementaciones
- SqliteStorageAdapter  // Usa invoke() para llamar a Rust
- IndexedDbStorageAdapter  // Almacenamiento local del navegador
```

#### Sistema de Temas
```typescript
// ThemeContextProvider maneja:
- Modo claro/oscuro (light/dark/system)
- Tema de color (12 opciones)
- Persistencia en localStorage
- Transiciones suaves entre temas
```

#### Selectores del Store
```typescript
// Selectores específicos evitan re-renders masivos
export const useProducts = () => useStoreSelector(state => state.products)
export const useOrderActions = () => useStoreSelector(state => ({
  addToOrder: state.addToOrder,
  removeFromOrder: state.removeFromOrder,
  // ...
}))
```

## Configuración

### Settings Disponibles

| Sección | Configuración | Descripción |
|---------|--------------|-------------|
| **Apariencia** | Tema de color | 12 temas disponibles |
| | Modo | Light / Dark / System |
| **POS** | Abrir Caja | Comando manual de apertura |
| | Auto-abrir cajón | Abrir automáticamente al cobrar |
| | Tasa de impuestos | % de IVA (default: 21%) |
| **Impresora** | Puerto | COM/USB de la impresora |
| | Ancho de papel | 58mm / 80mm |
| | Test de conexión | Verificar comunicación |
| **Rendimiento** | Usar imágenes de stock | Optimiza carga de imágenes |

### Variables de Entorno

```env
# No se requieren variables de entorno obligatorias
# La app funciona out-of-the-box con SQLite embebido
```

## Base de Datos SQLite

### Schema

```sql
-- Productos
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    icon_type TEXT,
    selected_icon TEXT,
    uploaded_image TEXT,
    stock INTEGER DEFAULT 0
);

-- Categorías
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT
);

-- Pedidos
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'inProgress',
    payment_method TEXT DEFAULT 'efectivo',
    -- más campos...
);

-- Items de pedido
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

### Ubicación del Archivo

| Sistema | Ruta |
|---------|------|
| Windows | `%APPDATA%\com.elhaido.tpv\tpv-haido.db` |
| macOS | `~/Library/Application Support/com.elhaido.tpv/tpv-haido.db` |
| Linux | `~/.config/com.elhaido.tpv/tpv-haido.db` |

## Instalación en Raspberry Pi

### Paquete DEB (Recomendado)
```bash
# Descargar desde GitHub Releases
wget https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/TPV\ El\ Haido_0.1.0_arm64.deb

# Instalar
sudo dpkg -i "TPV El Haido_0.1.0_arm64.deb"
sudo apt-get install -f  # Resolver dependencias

# Ejecutar
tpv-el-haido
```

### Ejecutable Directo
```bash
wget https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/tpv-el-haido
chmod +x tpv-el-haido
./tpv-el-haido
```

### Compilación para RPi

```bash
# Instalar target ARM64
rustup target add aarch64-unknown-linux-gnu

# Build completo
bun run build:rpi-full

# O manual
bun run build
bun run tauri build -- --target aarch64-unknown-linux-gnu
```

## Compatibilidad

### Plataformas Probadas
- Windows 10/11 (x64)
- macOS (Intel/Apple Silicon)
- Linux (x64, ARM64)
- Raspberry Pi 3/4 (ARM64)

### Navegadores (modo web)
- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## Scripts Disponibles

```bash
bun run dev          # Servidor de desarrollo Vite
bun run build        # Build de producción frontend
bun run tauri dev    # Desarrollo completo con Tauri
bun run tauri build  # Build de producción completo
bun run lint         # Linter ESLint
bun run preview      # Preview del build
```

## Contribuir

1. Fork el repositorio
2. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'feat: añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

*Desarrollado con React 19 + Tauri v2 | Optimizado para Raspberry Pi*
