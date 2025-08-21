# 🍓 TPV El Haido - Releases ARM64

Esta carpeta contiene todos los ejecutables y paquetes compilados localmente para Raspberry Pi 3 y sistemas ARM64.

## 📂 Estructura de Archivos

### 🔧 Ejecutables
```
releases/executables/linux/arm64/
└── tpv-el-haido                    # Ejecutable directo (34.7MB)
```

### 📦 Paquetes de Instalación
```
releases/packages/deb/
└── TPV El Haido_0.1.0_arm64.deb    # Paquete DEB (21MB)

releases/packages/rpm/
└── TPV El Haido-0.1.0-1.aarch64.rpm # Paquete RPM (21MB)
```

### 📱 AppImage (Parcial)
```
releases/appimage/
└── TPV El Haido.AppDir/             # Directorio AppImage funcional
    └── usr/bin/tpv-el-haido        # Ejecutable dentro de AppDir
```

### 📚 Documentación
```
releases/documentation/
├── README.md                       # Documentación principal
├── RPi-Build-Documentation.md      # Guía completa de compilación
└── generate-docs.ts               # Script generador de documentación
```

## 🍓 Instalación en Raspberry Pi 3

### Opción 1: Paquete DEB (Recomendado)
```bash
sudo dpkg -i releases/packages/deb/TPV\ El\ Haido_0.1.0_arm64.deb
sudo apt-get install -f
tpv-el-haido
```

### Opción 2: Ejecutable Directo
```bash
chmod +x releases/executables/linux/arm64/tpv-el-haido
./releases/executables/linux/arm64/tpv-el-haido
```

### Opción 3: AppImage Parcial
```bash
cd "releases/appimage/TPV El Haido.AppDir"
./usr/bin/tpv-el-haido
```

## 🎯 Compatibilidad

- ✅ Raspberry Pi 3 (ARM64)
- ✅ Raspberry Pi 4 (ARM64)
- ✅ Debian ARM64
- ✅ Ubuntu ARM64
- ✅ Otros sistemas Linux ARM64

## 📊 Información de Compilación

- **Target**: `aarch64-unknown-linux-gnu`
- **Rust**: 1.89.0
- **Tauri**: v2.8.2
- **Cross-compilation**: ✅ Configurada
- **Dependencias**: GTK3, WebKit2, GLib

---
*Compilado localmente en Debian ARM64 - Listos para distribuir*