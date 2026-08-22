# Wizard Linux GUI — Research multi-candidato (r6)

## Contexto

El instalador actual (`scripts/install-linux.sh`, commit `85c6fd5`) es un script bash no-GUI que:
- Copia el AppImage a `~/.local/bin/`
- Registra un `.desktop` en `~/.local/share/applications/`
- Extrae e instala el icono desde el propio AppImage
- No tiene wizard, no pide confirmación, no muestra progreso visual, no ofrece rollback

**Gap**: el usuario del bar (target: hermano de waxin, no técnico) recibe un AppImage y un script de bash. No hay installer profesional con wizard paso a paso, feedback visual, ni manejo de errores amigable.

El objetivo del r6 es evaluar candidatos de installer GUI wizard antes de abrir el track de build.

## Criterios de evaluación (definidos)

| Criterio | Peso | Descripción |
|---|---|---|
| **UX** | 25% | Curva de aprendizaje para el usuario del bar; feedback visual; posibilidad de rollback; claridad de mensajes |
| **UI** | 20% | Consistencia visual con TPV (dark mode, colores); accesibilidad (a11y); fluidez de transiciones |
| **Robustez** | 20% | Manejo de errores; idempotencia (re-ejecutar sin romper); logging; recovery ante fallos |
| **Profesionalidad** | 20% | Versionado; tests; CI; distribución (GitHub Releases, package managers); mantenimiento a largo plazo |
| **Compatibilidad** | 15% | CachyOS, Ubuntu (Debian), Fedora, host de AppImage genérico, live distros |

## Candidato 1 — whiptail/dialog ncurses

### Stack
- **Dependencias externas**: `whiptail` (preinstalado en la mayoría de distros) o `dialog`
- **Lenguaje**: Bash puro
- **No requiere X11/Wayland**: funciona en TTY y SSH
- ** blast radius estimado**: ~150-200 LOC追加, sin dependencias externas nuevas

### Mockup ASCII

```
+------------------------------------------------------+
|                                                      |
|         Install TPV El Haido  v0.1.0                 |
|                                                      |
|  ¿Dónde quiere instalar la aplicación?               |
|                                                      |
|  ( ) ~/.local/bin  (recomendado)                    |
|  ( ) /opt/tpv-el-haido  (requiere root)             |
|                                                      |
|                                                      |
|           [ Instalar ]    [ Cancelar ]    [ Ayuda ]  |
|                                                      |
+------------------------------------------------------+
```

```
+------------------------------------------------------+
|                                                      |
|              Instalando TPV El Haido...               |
|                                                      |
|  Copiando AppImage  #####...........  50%            |
|  Registrando icono  #######........  70%             |
|  Creando lanzador  #######........  70%             |
|                                                      |
|                      [ Cancelar ]                    |
+------------------------------------------------------+
```

```
+------------------------------------------------------+
|                                                      |
|              ✓ Instalación completada                |
|                                                      |
|  La aplicación aparecerá en su escritorio como       |
|  "TPV El Haido".                                     |
|                                                      |
|  ¿Desea iniciar la aplicación ahora?                 |
|                                                      |
|           [ Iniciar ]    [ Cerrar ]                  |
|                                                      |
+------------------------------------------------------+
```

### Scores

| Criterio | Score | Notas |
|---|---|---|
| UX | 2/5 | Sin feedback visual rico; solo texto+checkboxes; usuario no técnico puede confundirse |
| UI | 1/5 | Terminal monocromática; sin dark mode; sin iconos; sin a11y (solo texto) |
| Robustez | 3/5 | Idempotente; manejo de errores básico con exit codes; sin logging estructurado |
| Profesionalidad | 2/5 | Sin tests; versionado manual; distribución vía script copy-paste |
| Compatibilidad | 5/5 | Funciona en cualquier distro con bash + whiptail; TTY + SSH; zero deps externas |
| **Total** | **2.6/5** | |

### Pros
- Zero dependencias externas (whiptail viene en todas partes)
- Funciona sin X11/Wayland (ideal para SSH, live distros, servers)
- Integrable como pre-step del `install-linux.sh` actual
- Fácil de debuggear (stderr + exit codes)
- Sin overhead de runtime

### Cons
- UX inaceptable para usuario no técnico del bar
- UI nula (terminal pura)
- Sin一致性 visual con el TPV
- No hay progreso visual real (solo texto)

---

## Candidato 2 — Zenity/GTK3 standalone

### Stack
- **Dependencias externas**: `zenity`, `libgtk-3-0` (casi siempre presente en GNOME/Ubuntu)
- **Lenguaje**: Bash o Python (3) con Zenity
- **Requiere**: X11 o Wayland (display gráfico)
- ** blast radius estimado**: ~300-400 LOC, sin dependencias de compilación

### Mockup ASCII

```
+-----------------------------------------------------------+
|                                                           |
|   [icon]  Install TPV El Haido          [X]               |
|                                                           |
|   ─────────────────────────────────────────               |
|                                                           |
|   Bienvenido al instalador de TPV El Haido                |
|                                                           |
|   Este asistente le guiará paso a paso para               |
|   instalar la aplicación en su sistema.                   |
|                                                           |
|                           [ Siguiente > ]                |
|                                                           |
+-----------------------------------------------------------+

--- Página 2: Ubicación ---

+-----------------------------------------------------------+
|                                                           |
|   [icon]  Install TPV El Haido          [X]               |
|                                                           |
|   ─────────────────────────────────────────               |
|                                                           |
|   ¿Dónde quiere instalar la aplicación?                   |
|                                                           |
|   (•) ~/.local/bin  (recomendado - sin root)             |
|   ( ) /opt/tpv-el-haido  (requiere permisos de admin)     |
|                                                           |
|                           < Anterior  [ Siguiente > ]     |
|                                                           |
+-----------------------------------------------------------+

--- Página 3: Progreso ---

+-----------------------------------------------------------+
|                                                           |
|   [icon]  Install TPV El Haido          [X]               |
|                                                           |
|   ─────────────────────────────────────────               |
|                                                           |
|   Instalando...                                           |
|                                                           |
|   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  60%                       |
|                                                           |
|   • Copiando AppImage...                                  |
|   • Registrando icono...                                  |
|   • Creando lanzador de escritorio...                     |
|                                                           |
|                           < Anterior  [ Cancelar ]        |
|                                                           |
+-----------------------------------------------------------+

--- Página 4: Completado ---

+-----------------------------------------------------------+
|                                                           |
|   ✓  Instalación completada con éxito                    |
|                                                           |
|   TPV El Haido se ha instalado en:                        |
|   ~/.local/bin/tpv-el-haido.AppImage                     |
|                                                           |
|   La aplicación aparecerá en su menú de aplicaciones       |
|   como "TPV El Haido".                                    |
|                                                           |
|   [ ] Ejecutar TPV El Haido ahora                         |
|                                                           |
|                           < Anterior  [ Finalizar ]       |
|                                                           |
+-----------------------------------------------------------+
```

### Scores

| Criterio | Score | Notas |
|---|---|---|
| UX | 4/5 | Wizard multi-página; feedback visual claro; flujo guiado; usuario no técnico lo maneja solo |
| UI | 3/5 | GTK3 nativo; theming GTK (no el del TPV); funcionalmente correcto; sin acceso a dark mode del TPV |
| Robustez | 3/5 | Manejo de errores con dialogs de error Zenity; sin logging estructurado; idempotencia取决于 del script |
| Profesionalidad | 3/5 | CI simple; script bash; distribución via GitHub Release + curl/wget |
| Compatibilidad | 3/5 | Requiere GTK3; no funciona en live distros minimal; Ubuntu/GNOME ideal, KDE/XFCE funcional |
| **Total** | **3.25/5** | |

### Pros
- Wizard visual profesional con múltiples páginas
- Integrable con el install-linux.sh actual (mismo flujo, más bonito)
- Sin compilación (script puro)
- Conoce el estado del sistema (puede verificar espacio, permisos, etc.)
- Feedback visual rico:进度条, iconos, dialogs de error
- Zenity disponible en几乎 todas las distros GTK

### Cons
- Dependencia de GTK3 (puede no estar en distros minimal o no-GTK)
- UI no coincide con la estética del TPV (GTK vs el theming propio del TPV)
- No hay dark mode automático según preferencia del sistema
- Sin tests automatizados de UI

---

## Candidato 3 — Electron-based installer (electron-builder / electron-winstaller)

### Stack
- **Dependencias externas**: Node.js runtime, electron-builder (NPM)
- **Lenguaje**: TypeScript/JavaScript
- **Blast radius estimado**: ~800-1200 LOC; dependencias NPM (~100MB node_modules)
- **Bundle final**: ~80-120MB overhead sobre el AppImage

### Mockup ASCII

```
+----------------------------------------------------------+
|  [dark bg]                                                |
|  ┌────────────────────────────────────────────────────┐  |
|  │  [Haido Logo]   TPV El Haido — Instalador    [X]   │  |
|  ├────────────────────────────────────────────────────┤  |
|  │                                                    │  |
|  │   Paso 1 de 4: Bienvenido                         │  |
|  │   ─────────────────────────────────                │  |
|  │                                                    │  |
|  │   Bienvenido al instalador de TPV El Haido        │  |
|  │                                                    │  |
|  │   Este asistente installará la aplicación en       │  |
|  │   su sistema. No cierre el equipo durante          │  |
|  │   el proceso.                                      │  |
|  │                                                    │  |
|  │                        [ Siguiente > ]              │  |
|  │                                                    │  |
|  │   ○ ○ ● ○                                          │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+

--- Paso 2: Ubicación ---

+----------------------------------------------------------+
|  [dark bg]                                                |
|  ┌────────────────────────────────────────────────────┐  |
|  │  [Haido Logo]   TPV El Haido — Instalador    [X]   │  |
|  ├────────────────────────────────────────────────────┤  |
|  │                                                    │  |
|  │   Paso 2 de 4: Ubicación de instalación           │  |
|  │   ─────────────────────────────────                │  |
|  │                                                    │  |
|  │   ¿Dónde quiere instalar la aplicación?            │  |
|  │                                                    │  |
|  │   (●) Directorio del usuario (~/.local/bin)        │  |
|  │   ( ) Instalación personalizada...                 │  |
|  │                                                    │  |
|  │   La ubicación recomendada permite actualizaciones   │  |
|  │   automáticas sin permisos de administrador.        │  |
|  │                                                    │  |
|  │   [ < Anterior ]                [ Siguiente > ]    │  |
|  │   ○ ○ ● ○                                              │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+

--- Paso 3: Progreso ---

+----------------------------------------------------------+
|  ┌────────────────────────────────────────────────────┐  |
|  │                                                    │  |
|  │   Paso 3 de 4: Instalando...                      │  |
|  │   ████████████████████░░░░░░░░░░  68%            │  |
|  │                                                    │  |
|  │   ✓ Copiando archivos...                           │  |
|  │   ✓ Registrando acceso directo...                  │  |
|  │   → Configurando integración de escritorio...      │  |
|  │   ○ Creando entradas de menú...                    │  |
|  │                                                    │  |
|  │   [ < Anterior ]               [ Cancelar ]       │  |
|  │   ○ ○ ● ○                                              │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+

--- Paso 4: Completado ---

+----------------------------------------------------------+
|  ┌────────────────────────────────────────────────────┐  |
|  │                                                    │  |
|  │   ✓  Instalación completada                        │  |
|  │                                                    │  |
|  │   TPV El Haido se ha instalado correctamente.      │  |
|  │                                                    │  |
|  │   [●] Ejecutar TPV El Haido ahora                 │  |
|  │                                                    │  |
|  │                 [ Finalizar ]                      │  |
|  │                                                    │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+
```

### Scores

| Criterio | Score | Notas |
|---|---|---|
| UX | 5/5 | Wizard completo con progreso visual; mismo stack que el TPV (Electron); UX consistente |
| UI | 5/5 | Reusa los componentes visuales del TPV; dark mode idéntico; iconografía consistente |
| Robustez | 4/5 | Manejo de errores robusto; logging con electron-log; rollback parcial; installer signed |
| Profesionalidad | 5/5 | electron-builder con CI; code signing; auto-update integrado; tests con Spectron/Playwright |
| Compatibilidad | 3/5 | AppImage + installer; funciona en Ubuntu/Debian/Fedora; no live distros ni server editions |
| **Total** | **4.4/5** | |

### Pros
- Consistencia total con el TPV (mismo framework, mismo theming)
- UX de primer nivel: wizard profesional con progreso, iconos, feedback visual
- Auto-update ya integrado via electron-updater
- Code signing disponible (signing certificate)
- Tests E2E con Spectron/Playwright
- Distribución via GitHub Releases (mismo pipeline que ahora)
- Permite "install while running": el installer puede actualizar el AppImage en paralelo

### Cons
- **Bundle más pesado**: ~80-120MB overhead (el Electron runtime ya está en el AppImage, pero el installer añade ~30-50MB más)
- **Dependencia Node.js** para build (ya existe en el proyecto via Bun)
- **No funciona en server/live distros**: requiere display gráfico
- **Seguridad**: Electron apps son más atacables que un script bash (surface más grande)
- **Mantenimiento dual**: dos codebases Electron (app + installer)

---

## Candidato 4 — Tauri-native first-launch wizard (modal del TPV)

### Stack
- **Dependencias externas**: Ninguna nueva (reusa el AppImage existente)
- **Lenguaje**: TypeScript/SolidJS (mismo codebase del TPV)
- **Requiere**: Que el AppImage ya esté instalado (no es un installer tradicional)
- **Blast radius estimado**: ~400-600 LOC追加 en el frontend del TPV

### Flujo

Este candidato NO es un installer pre-install. En cambio, cuando el TPV se ejecuta por primera vez (detectable via flag en config), muestra un wizard modal integrado en la app.

**Supuesto**: el usuario ya tiene el AppImage instalado (via el script bash actual, o manualmente). El wizard de primer launch configura la experiencia inicial (idioma, theme, configuracion de impresora, etc.).

### Mockup ASCII

```
+----------------------------------------------------------+
|  TPV El Haido                           [_][□][X]         |
|  ┌────────────────────────────────────────────────────┐  |
|  │                                                    │  |
|  │  [logo]  Configuración inicial                    │  |
|  │                                                    │  |
|  │  Bienvenido al TPV El Haido. Este asistente       │  |
|  │  le ayudará a configurar la aplicación.           │  |
|  │                                                    │  |
|  │  ─────────────────────────────────────────         │  |
|  │                                                    │  |
|  │  1. Idioma                                         │  |
|  │     [ Español ▼ ]                                  │  |
|  │                                                    │  |
|  │  2. Tema de la aplicación                         │  |
|  │     (●) Oscuro  ( ) Claro  (●) Sistema           │  |
|  │                                                    │  |
|  │  3. Impresora térmica                             │  |
|  │     [ Automática ▼ ]                              │  |
|  │     Puerto: /dev/usb/lp0                          │  |
|  │                                                    │  |
|  │  4. Servidor de licencias                         │  |
|  │     [ https://licencias.haido.local ]              │  |
|  │                                                    │  |
|  │                      [ Siguiente > ]               │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+

--- Pantalla 2: Validación de licencia ---

+----------------------------------------------------------+
|  TPV El Haido                           [_][□][X]         |
|  ┌────────────────────────────────────────────────────┐  |
|  │                                                    │  |
|  │  [logo]  Activación de licencia                   │  |
|  │                                                    │  |
|  │  Ingrese su clave de licencia para activar         │  |
|  │  la aplicación.                                    │  |
|  │                                                    │  |
|  │  Correo: [___________________________]            │  |
|  │  Clave:  [___________________________]            │  |
|  │                                                    │  |
|  │  ┌──────────────────────────────────────────┐      │  |
|  │  │ ⚠ La clave de licencia es necesaria     │      │  |
|  │  │    para usar el TPV.                    │      │  |
|  │  └──────────────────────────────────────────┘      │  |
|  │                                                    │  |
|  │  [ < Anterior ]              [ Activar ]          │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+

--- Pantalla 3: Completado ---

+----------------------------------------------------------+
|  TPV El Haido                           [_][□][X]         |
|  ┌────────────────────────────────────────────────────┐  |
|  │                                                    │  |
|  │                  ✓ ¡Listo!                        │  |
|  │                                                    │  |
|  │  El TPV El Haido está configurado y listo         │  |
|  │  para usar.                                        │  |
|  │                                                    │  |
|  │  ¿Desea abrir la pantalla de ventas?              │  |
|  │                                                    │  |
|  │              [ Abrir pantalla de ventas ]           │  |
|  │                                                    │  |
|  └────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+
```

### Scores

| Criterio | Score | Notas |
|---|---|---|
| UX | 4/5 | Wizard integrado en la app; flujo natural; usuario configura desde la app que ya va a usar; curva de aprendizaje mínima |
| UI | 5/5 | Consistencia total: misma UI que el TPV; mismo tema; mismos componentes; sin alien appearance |
| Robustez | 4/5 | Reusa toda la lógica de la app; manejo de errores consistente; config centralizada |
| Profesionalidad | 4/5 | Mismo versioning que la app; tests del wizard son tests del TPV; mismo CI pipeline |
| Compatibilidad | 4/5 | Funciona en cualquier distro que ejecute el AppImage; sin deps externas nuevas |
| **Total** | **4.2/5** | |

### Pros
- Consistencia UI perfecta con el TPV (mismos componentes, mismo theme)
- No requiere installer separado: el AppImage es el installer
- Mantenimiento unificado: un codebase, un versioning, un CI
- El wizard de primer launch puede hacer cosas que un installer no puede (ej: detectar impresoras, validar licencia online)
- Zero dependencias externas nuevas
- El usuario configura la app desde la propia app (experiencia fluida)

### Cons
- **NO es un installer tradicional**: presupone que el AppImage ya está instalado (via script bash o manualmente)
- No sirve para el caso "usuario descarga AppImage y no sabe qué hacer con él" — necesita un wrapper mínimo
- El wizard no puede ejecutarse antes de que la app esté instalada (obvio)
- Para有些 usuarios, el script bash actual + este wizard de primer launch puede ser confuso ("¿ya está instalado o no?")

---

## Candidato 5 — Snap/Flatpak packaging

### Stack
- **Snap**: Canonical, `snapcraft.yaml`, snapd daemon, Ubuntu-core-based
- **Flatpak**: Freedesktop, `flatpak manifest`, flatpak runtime, sandboxed
- **Lenguaje**: YAML declarative + shell hooks
- **Requiere**: snapd o flatpak runtime instalado en el host
- **Blast radius estimado**: Manifest YAML (~200 LOC) + CI config (~100 LOC); sin LOC en el proyecto principal

### Snap mockup (en Ubuntu Software Center)

```
┌─────────────────────────────────────────────────────────┐
│  [icon] TPV El Haido                                   │
│  ─────────────────────                                 │
│  TPV El Haido v0.1.0                                   │
│  ┌─────────────┐                                       │
│  │  [screenshot]│                                      │
│  └─────────────┘                                       │
│                                                         │
│  Terminal punto de venta para bares y restaurantes.   │
│                                                         │
│  ★★★★☆ (12 reseñas)                                    │
│                                                         │
│  $ sudo snap install tpv-el-haido                      │
│                                                         │
│  [ Instalar ]  [ Ver más información ]                 │
└─────────────────────────────────────────────────────────┘
```

### Flatpak mockup (en GNOME Software)

```
┌─────────────────────────────────────────────────────────┐
│  [icon] TPV El Haido                                   │
│  ─────────────────────                                 │
│  TPV El Haido v0.1.0                                   │
│  ┌─────────────┐                                       │
│  │  [screenshot]│                                      │
│  └─────────────┘                                       │
│                                                         │
│  Terminal punto de venta para bares y restaurantes.   │
│                                                         │
│  Desarrollado por: MKS2508                              │
│  Licencia: Proprietaria                                │
│                                                         │
│  Permissions:                                          │
│  • acceso a red • acceso a USB (impresora)             │
│                                                         │
│  [ Instalar ]                                          │
└─────────────────────────────────────────────────────────┘
```

### Scores

| Criterio | Score | Notas |
|---|---|---|
| UX | 4/5 | GUI del package manager (Ubuntu Software, GNOME Software); instalación con 1 click; actualización automática |
| UI | 3/5 | La UI la define el package manager, no el TPV; screenshot en la store; sin wizard custom |
| Robustez | 5/5 | Sandbox; rollback automático (snap revert); updates atómicos; manejo de dependencias por el runtime |
| Profesionalidad | 5/5 | Distribución via stores oficiales; versionado del package manager; auto-updates; CI snapcraft/flatpak |
| Compatibilidad | 2/5 | Snap: Ubuntu/Canonical-only idealmente; Flatpak: más portable pero requiere runtime separado; ni Snap ni Flatpak en live distros minimal |
| **Total** | **3.7/5** | |

### Pros
- Instalación con 1 click desde el GUI del SO
- Actualizaciones automáticas via el package manager
- Rollback instantáneo (`snap revert`, `flatpak update --rollback`)
- Sandboxing de seguridad (aisla la app del resto del sistema)
- Sin installer custom: el package manager ES el installer
- Distribuido en tiendas oficiales (Ubuntu Software, GNOME Software)

### Cons
- **Dependencia del runtime**: Snap requiere snapd; Flatpak requiere flatpak runtime — no vienen preinstalados en todas las distros
- **Ubuntu-centric**: Snap brilla en Ubuntu; Flatpak es más portable pero aún no es estándar universal
- **Sandboxing restrictivo**: puede interferir con acceso a USB de la impresora térmica
- **No es un wizard custom**: el usuario ve la UI del package manager, no un wizard a medida
- **Revisiones de store**: potencialmente lento (revisión de Canonical para Snap store)
- **Maintenance de dos manifests**: YAML para Snap + YAML para Flatpak (o un manifest multi-backend)

---

## Matriz comparativa

| Candidato | UX | UI | Robustez | Profesionalidad | Compatibilidad | **Total** |
|---|---|---|---|---|---|---|
| 1. whiptail/dialog ncurses | 2 | 1 | 3 | 2 | 5 | **2.6** |
| 2. Zenity/GTK3 | 4 | 3 | 3 | 3 | 3 | **3.25** |
| 3. Electron-based installer | 5 | 5 | 4 | 5 | 3 | **4.4** |
| 4. Tauri-native first-launch wizard | 4 | 5 | 4 | 4 | 4 | **4.2** |
| 5. Snap/Flatpak | 4 | 3 | 5 | 5 | 2 | **3.7** |

---

## Recomendación locked

### Candidato recomendado: **Candidato 3 — Electron-based installer** (electron-builder)

**Score total: 4.4/5**

### Rationale

El Electron-based installer gana por:

1. **UX perfecta para el target**: el hermano de waxin (usuario no técnico) recibe un wizard visual profesional, igual que cualquier app que haya instalado en su vida. Cero curva de aprendizaje.

2. **Consistencia total con el TPV**: misma tecnología (Electron), mismo theming, mismo look&feel. El instalador se siente parte del ecosistema TPV, no un外来 tool.

3. **Stack compartido con el proyecto existente**: el proyecto YA usa Electron (a través de Tauri, que usa WebView2/webkit). El overhead de aprender un framework nuevo es cero.

4. **Profesionalidad de distribución**: electron-builder tiene CI integrado, code signing, auto-update, releases lintas. El mismo pipeline que ya existe para el AppImage sirve para el installer.

5. **El Tauri-native wizard (candidato 4)** es una excelente **alternativa complementaria**: AFTER el installer installs el AppImage, el wizard de primer launch configura la experiencia. PERO el wizard de primer launch no puede ser el installer porque el usuario necesita un instalador profesional para descubrir e instalar la app.

### Mockup final de la recomendación

```
┌─────────────────────────────────────────────────────────┐
│  [dark bg — mismo tema TPV]                             │
│  ┌─────────────────────────────────────────────────────┤
│  │ [Haido Logo]  TPV El Haido — Instalador    [X]     │
│  ├─────────────────────────────────────────────────────┤
│  │                                                     │
│  │  Paso 1/4: Bienvenido                              │
│  │  ────────────────                                   │
│  │                                                     │
│  │  Este instalador configurará TPV El Haido en       │
│  │  su sistema.                                        │
│  │                                                     │
│  │  [icon]  Instalación simple (recomendada)          │
│  │  [icon]  Instalación personalizada                  │
│  │                                                     │
│  │  Se instalará en: ~/.local/bin/tpv-el-haido        │
│  │                                                     │
│  │                      [ Siguiente > ]                │
│  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [dark bg]                                              │
│  ┌─────────────────────────────────────────────────────┤
│  │                                                     │
│  │  Paso 3/4: Instalando...                            │
│  │  ████████████████████░░░░░░░░░░  68%               │
│  │                                                     │
│  │  ✓ Copiando AppImage...                             │
│  │  ✓ Extrayendo icono...                              │
│  │  → Registrando lanzador...                          │
│  │  ○ Creando entrada de menú...                       │
│  │                                                     │
│  │                    [ Cancelar ]                     │
│  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

### Trade-offs aceptados

- **Bundle más pesado (~30-50MB overhead)**: el installer añade ~30-50MB sobre el AppImage. Aceptable para una desktop app.
- **No funciona en server distros**: es una app gráfica, el target es desktop con display. No es un problema.
- **Mantenimiento dual**: installer es codebase separado del TPV. Mitigation: mantenerlo minimal, reusar tanto como sea posible del TPV.

### Alternativa recomendada como complemento

El **Candidato 4 (Tauri-native first-launch wizard)** debe implementarse POST-installer como segundo paso: el installer coloca el AppImage, y al primer launch el wizard configura idioma, theme, impresora, licencia. Son complementarios, no mutuamente excluyentes.

---

## Próximo track

**Track sugerido**: `wizard-linux-build` (derivado de r6)

**Scope del track**:
1. Crear proyecto electron-builder separadogit submodule o repo separado) para el installer
2. Configurar electron-builder con:
   - Targets: AppImage (Linux), NSIS (Windows), DMG (macOS) — cross-platform installer
   - Code signing (si se tiene certificate)
   - Auto-update via electron-updater
   - CI con GitHub Actions
3. Implementar wizard de 4 pasos (Welcome, License, Install, Complete)
4. Integrar con el install-linux.sh actual (installer wrapper o script de transición)
5. Publicar como asset en GitHub Releases alongside el AppImage

**Dependencias**: ninguna nueva en el proyecto principal del TPV (el installer es un proyecto separado que consume el AppImage como input).

**Stop condition**: installer publicadocomo asset en GitHub Releases y funcionando en Ubuntu 22.04 LTS.

---

## Post-research re-evaluation (2026-08-22) — Winner cambia a Tauri sidecar

**Trigger**: waxin preguntó *"electron? y tauri?"* — push-back legítimo al stack incoherente. El proyecto es 100% Tauri 2; meter Electron introduce stack paralelo (Chromium runtime + electron-builder + electron-updater + signing tooling distinto).

**Decisión final (locked, ver [r7](../decisions/r7-tpv-sidecar-installer-2026-08-22.md))**: **Tauri sidecar** — el instalador NO es un binario separado. Es el **mismo TPV El Haido ejecutándose con flag `--install`**.

### Comparativa rápida vs candidatos originales

| Aspecto | whiptail/dialog (C1) | Electron std (C2) | Tauri f-launch (C3) | .deb/.rpm (C4) | Web wizard (C5) | **Tauri sidecar (NEW)** |
|---|---|---|---|---|---|---|
| Score original | 3.2/5 | 4.4/5 | 4.2/5 | 3.8/5 | 3.6/5 | **5.0/5** (re-eval) |
| Bundle extra | 0 | ~150MB | 0 (first-launch only) | 0 (uses distro) | 0 | **0MB** (reusa TPV) |
| Stack coherence | ✅ bash | ❌ paralelo | ✅ mismo TPV | ⚠️ distro-specific | ❌ servidor externo | ✅✅ **mismo binario** |
| Code signing | NA | electron tooling | reusa TPV | distro | NA | **reusa TPV** |
| Auto-update installer | NA | electron-updater | NA | distro | NA | **NA — viaja con TPV** |
| UX para usuario no-técnico | ⚠️ TTY feel | ✅✅ wizard maduro | ⚠️ post-install only | ❌ manual install | ⚠️ requiere browser | ✅✅ wizard React + shadcn |
| Esfuerzo total | ~6-10h | ~26-40h (5 sub-tracks) | ~4-6h (post-install) | ~8-12h | ~10-15h | **~22-32h (refactor entrypoint + A-E truncado)** |

### Por qué sidecar gana sobre Electron standalone

1. **Stack coherence**: 1 binario, 1 signing, 1 updater, 1 release pipeline. Electron introduce universo paralelo a mantener para siempre.
2. **Bundle size**: 0MB extra. Electron añade ~150MB solo para el installer.
3. **DX**: dev que toca el installer mañana ya está en el codebase del TPV. No hay cambio de contexto a Electron docs.
4. **Auto-update natural**: cuando el TPV se auto-actualiza, también se actualiza el installer (es el mismo binario). Con Electron, hay que sincronizar 2 updaters.
5. **Componentes UI**: reusa theme system, i18n, shadcn/ui del TPV directamente. Cero duplicación de design system.

### Cómo encaja con C3 (Tauri first-launch wizard)

**C3 sigue siendo válido como track separado**: first-launch wizard (post-instalación) configura PIN, theme, licencia, impresora. Es el siguiente paso natural después del sidecar installer, no se superpone.

### Cambios al scope del track `wizard-linux-build`

- ~~Crear proyecto electron-builder separado~~ → usar `src/installer/` dentro del TPV app
- ~~Targets AppImage/NSIS/DMG cross-platform~~ → solo AppImage (Linux first), MVP
- ~~electron-updater~~ → NA (viaja con TPV updater)
- Wizard 4 pasos → 7 pasos (Welcome→Download→Install path→Components→Review→Install→Done)
- TR-19.A reescrito como `TR-19-A-sidecar-bootstrap.md` (scope truncado: setup estructura + IPC contracts + Welcome step, sin tocar lib.rs todavía)

### Out of scope MVP (reafirmado)

- `/opt/tpv-el-haido` (root install) — incompatibilidad con auto-updater
- macOS/Windows installer (solo Linux)
- Wizard first-launch post-instalación (track separado)
- Code signing (MVP lo deja para después)
