# haidodocs - Documentation Template

>  Sistema TPV (Terminal Punto de Venta) de escritorio para hostelería. Construido con Tauri, SolidJS y SQL         ite.

## 🚀 Quick Start

Este es un template de documentación basado en **Fumadocs** (Next.js + MDX) listo para usar con:

- ✅ Soporte bilingüe (Español/Inglés)
- ✅ Búsqueda integrada
- ✅ Tema oscuro/claro automático
- ✅ GitHub Pages ready
- ✅ MDX con componentes de React
- ✅ Pipeline de CI/CD configurado

## 📋 Requisitos Previos

- **Bun** v1.1.43+ (recomendado) o Node.js v20+
- **GitHub** (para despliegue)

## 🔧 Instalación

### Opción 1: Usando mks-scaffolder (Recomendado)

```bash
bunx mks-scaffolder create mi-proyecto --template fumadocs
```

Sigue las instrucciones interactivas para configurar tu proyecto.

### Opción 2: Manual

```bash
git clone https://github.com/MKS2508/tpv-el-haido2.git mi-proyecto
cd mi-proyecto
bun install
```

## ⚙️ Configuración

### 1. Variables de Entorno

Crea `.env.local` en la raíz:

```bash
# Copia el template
cp .env.example .env.local

# Edita con tus valores
PROJECT_NAME=Mi Proyecto
DESCRIPTION=Descripción de mi proyecto
AUTHOR=Tu Nombre
BASE_PATH=/mi-proyecto
```

### 2. Contenido Placeholder

El template incluye contenido de ejemplo en `content-template/`:

```
content-template/
├── docs/
│   ├── index.mdx                    # Página principal (ES)
│   └── getting-started/
│       ├── index.mdx
│       ├── installation.mdx
│       └── quick-start.mdx
└── en/docs/                         # Versión en inglés
    └── (misma estructura)
```

**Para usarlo:**

```bash
# Opción A: Copiar todo el contenido
cp -r content-template/* content/

# Opción B: Copiar solo lo que necesitas
# Los archivos usan variables  que debes reemplazar
```

### 3. Reemplazar Placeholders

Los archivos de contenido usan **placeholders** que debes reemplazar:

- `haidodocs` - Nombre de tu proyecto
- ` Sistema TPV (Terminal Punto de Venta) de escritorio para hostelería. Construido con Tauri, SolidJS y SQL         ite.` - Descripción del proyecto
- `Marcos Asensio` - Tu nombre
- `MKS2508/tpv-el-haido2` - `usuario/repo`
- `/` - Path para GitHub Pages

**Ejemplo de búsqueda y reemplazo:**

```bash
# Con sed (Linux/macOS)
find content/ -type f -name "*.mdx" -exec sed -i '' 's/haidodocs/Mi Proyecto/g' {} +
find content/ -type f -name "*.mdx" -exec sed -i '' 's/ Sistema TPV (Terminal Punto de Venta) de escritorio para hostelería. Construido con Tauri, SolidJS y SQL         ite./Mi descripción/g' {} +

# O edita manualmente cada archivo
```

## 🏃 Desarrollo

```bash
# Instalar dependencias
bun install

# Servidor de desarrollo
bun run dev

# Build para producción
bun run build

# Previsualizar build
bun run start
```

Abre [http://localhost:3000](http://localhost:3000).

## 🚀 Deploy a GitHub Pages

### Pipeline Automático

El template incluye un workflow de GitHub Actions en `.github/workflows/deploy.yml` que:

1. ✅ Se ejecuta en cada push a `main`
2. ✅ Build del sitio con `bun run build`
3. ✅ Deploy automático a GitHub Pages
4. ✅ Soporte para rutas con `basePath`

### Configuración del Repositorio

1. **Activa GitHub Pages:**
   - Ve a `Settings` > `Pages`
   - Source: `GitHub Actions`

2. **Configura `BASE_PATH`:**
   - Si tu repo es `usuario/mi-proyecto`, usa `/mi-proyecto`
   - Si usas dominio custom, usa `/`

3. **Push a main:**
   ```bash
   git add .
   git commit -m "feat: initial docs"
   git push origin main
   ```

4. **Espera el workflow:**
   - Ve a la pestaña `Actions`
   - Espera a que el workflow termine
   - Tu documentación estará en `https://usuario.github.io/mi-proyecto/`

## 📁 Estructura del Proyecto

```
.
├── content/                  # Tu documentación (MDX)
│   ├── docs/                # Versión en español
│   └── en/docs/             # Versión en inglés
├── content-template/        # Contenido placeholder (ejemplos)
├── messages/                # Traducciones de la UI
│   ├── es.json
│   └── en.json
├── src/
│   ├── app/                # Next.js app directory
│   ├── components/         # Componentes React reutilizables
│   ├── config/             # Configuración centralizada
│   │   └── site.config.ts  # Configuración del sitio
│   └── lib/                # Utilidades y configuración
├── public/                 # Archivos estáticos
├── .github/workflows/      # Workflows de CI/CD
│   └── deploy.yml         # Deploy automático a GH Pages
├── .env.example            # Template de variables de entorno
├── next.config.mjs         # Configuración de Next.js
└── package.json
```

## 🎨 Personalización

### Configuración del Sitio

Edita `src/config/site.config.ts` o usa variables de entorno:

```typescript
// src/config/site.config.ts
export const siteConfig = {
  name: process.env.PROJECT_NAME || 'Mi Documentación',
  description: process.env.DESCRIPTION || 'Descripción',
  author: process.env.AUTHOR || 'Autor',
  // ...
};
```

### Logo

Opción 1: SVG en `.env.local`:

```bash
LOGO_SVG='<svg viewBox="0 0 24 24">...</svg>'
```

Opción 2: Texto:

```bash
LOGO_TEXT="Mi Proyecto"
```

Opción 3: Editar `src/lib/layout.shared.tsx` directamente.

### Colores

Edita `src/app/global.css`:

```css
:root {
  --color-primary: #0088cc;  /* Tu color primario */
  --color-dark: #0f172a;
  --color-light: #ffffff;
}
```

## 📝 Escribir Contenido

### Formato MDX

Los archivos usan **frontmatter** obligatorio:

```mdx
---
title: Título de la Página
description: Descripción para SEO
---

# Contenido aquí

Puedes usar **markdown** estándar y componentes de React.
```

### Componentes Disponibles

```mdx
import { Callout, Steps, Tabs } from 'fumadocs-ui/components';

<Callout type="info">
  Información importante
</Callout>

<Steps>
### Paso 1
### Paso 2
</Steps>

<Tabs items={['Tab 1', 'Tab 2']}>
  <Tab>Contenido 1</Tab>
  <Tab>Contenido 2</Tab>
</Tabs>
```

## 🌍 i18n (Internacionalización)

### Agregar idiomas

1. Agrega el archivo de traducción en `messages/`:

```json
// messages/fr.json
{
  "nav": {
    "gettingStarted": "Pour Commencer"
  }
}
```

2. Actualiza `.env.local`:

```bash
NEXT_PUBLIC_SUPPORTED_LOCALES=es,en,fr
```

### Traducir contenido

Crea la estructura equivalente en `content/fr/docs/`.

## 📚 Recursos

- [Fumadocs Documentation](https://fumadocs.vercel.app/)
- [Fumadocs UI Components](https://fumadocs.vercel.app/ui)
- [Next.js Documentation](https://nextjs.org/docs)
- [MDX Documentation](https://mdxjs.com/)

## 🐛 Troubleshooting

### Build falla

```bash
# Limpia cache
rm -rf .next out node_modules bun.lockb
bun install
bun run build
```

### GitHub Pages retorna 404

- Verifica que `BASE_PATH` en `.env.local` coincida con tu repo name
- Activa GitHub Pages desde `GitHub Actions` (no desde `Deploy from a branch`)
- Espera unos minutos después del deploy

### Buscador no funciona

- Verifica que `src/app/api/search/route.ts` existe
- Rebuild después de agregar contenido nuevo

## 📄 Licencia

MIT

---

**Generado con [mks-fumadocs-template](https://github.com/mks2508/mks-fumadocs-template)**
