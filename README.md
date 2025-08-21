# 🍓 TPV El Haido - Point of Sale System

Una aplicación TPV (Terminal Punto de Venta) moderna desarrollada con React + Tauri, optimizada para Raspberry Pi 3.

## 🚀 Características

- ✨ Interfaz moderna con React y TailwindCSS
- 🍓 **Soporte nativo para Raspberry Pi 3 ARM64**
- 📦 Múltiples formatos de distribución (DEB, RPM, ejecutable)
- 🎨 Temas personalizables
- 📱 Diseño responsive y touch-friendly
- 🏪 Gestión completa de productos y pedidos

## 🍓 Instalación en Raspberry Pi 3

### Opción 1: Paquete DEB (Recomendado)
```bash
# Descargar desde GitHub Releases
wget https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/TPV\ El\ Haido_0.1.0_arm64.deb

# Instalar
sudo dpkg -i "TPV El Haido_0.1.0_arm64.deb"
sudo apt-get install -f  # Resolver dependencias si es necesario

# Ejecutar
tpv-el-haido
```

### Opción 2: Ejecutable Directo
```bash
# Descargar ejecutable ARM64
wget https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/tpv-el-haido

# Dar permisos y ejecutar
chmod +x tpv-el-haido
./tpv-el-haido
```

## 💻 Desarrollo Local

### Requisitos
- Node.js 18+
- Rust 1.70+
- Tauri CLI

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/MKS2508/tpv-el-haido2.git
cd tpv-el-haido2

# Instalar dependencias
npm install

# Desarrollo
npm run tauri:dev
```

## 🏗️ Compilación para Raspberry Pi

### Scripts Disponibles

```bash
# Compilación completa para RPi3
npm run build:rpi-full

# Solo compilación ARM64
npm run deploy:rpi

# Generar documentación
npm run docs:rpi

# Explorador CLI
npm run explorer:rpi
```

### Compilación Manual

```bash
# 1. Instalar target ARM64
rustup target add aarch64-unknown-linux-gnu

# 2. Configurar cross-compilation (ya incluido en .cargo/config.toml)

# 3. Compilar
npm run build
npm run tauri build -- --target aarch64-unknown-linux-gnu
```

## 🤖 CI/CD Automatizado

El proyecto incluye GitHub Actions que automáticamente:

- ✅ Compila para ARM64/RPi3 en cada push
- ✅ Genera paquetes DEB, RPM y ejecutable
- ✅ Crea releases automáticos con documentación MD incluida
- ✅ Incluye documentación completa como artifacts

Ver: [`.github/workflows/rpi-deploy.yml`](.github/workflows/rpi-deploy.yml)

## 📂 Estructura del Proyecto

```
tpv-el-haido2/
├── src/                    # Frontend React
├── src-tauri/             # Backend Rust/Tauri
├── .cargo/                # Configuración cross-compilation
├── .github/workflows/     # GitHub Actions
├── generate-docs.ts       # Generador de documentación
├── rpi-explorer.ts        # CLI explorador
└── RPi-Build-Documentation.md  # Documentación detallada
```

## 🎯 Compatibilidad

### ✅ Probado en:
- Raspberry Pi 3 (ARM64)
- Debian ARM64
- Ubuntu ARM64

### 🔧 Arquitecturas Soportadas:
- `aarch64-unknown-linux-gnu` (ARM64)
- `armv7-unknown-linux-gnueabihf` (ARMv7)

## 📚 Documentación

- [RPi-Build-Documentation.md](RPi-Build-Documentation.md) - Guía completa de compilación
- [GitHub Releases](https://github.com/MKS2508/tpv-el-haido2/releases) - Descargas

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'feat: añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---
*🍓 Optimizado para Raspberry Pi 3 | 🤖 CI/CD con GitHub Actions*
