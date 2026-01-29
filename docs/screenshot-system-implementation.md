# Sistema de Capturas con Detección Contextual - Implementación Completada

## Resumen de Cambios

### Archivos Creados

1. **`/src/types/screenshot.ts`** - Tipos y constantes del sistema
   - `ViewState` enum: 'list' | 'detail' | 'form' | 'empty' | 'panel'
   - `ScreenshotContext` interface: Información contextual completa
   - `SECTION_NUMBERS`: Mapeo de números alineado con DOCUMENTO_PRESENTACION.md
   - `SECTION_LABELS`: Etiquetas legibles de secciones
   - `SETTINGS_TAB_LABELS`: Etiquetas de tabs de settings
   - `VIEW_STATE_LABELS`: Etiquetas de estados de vista

### Archivos Modificados

2. **`/src/components/ScreenshotOverlay.tsx`** - UI de capturas mejorada
   - **Eliminado**: Mapeo estático `SECTION_CONFIG`
   - **Agregado**: Detección dinámica de contexto con `detectContext()`
   - **Agregado**: Detección de sub-tabs en settings (`detectViewState`)
   - **Agregado**: Conteo de elementos visibles (`countVisibleEntities`)
   - **Agregado**: Generación de nombres descriptivos (`generateFilename`)
   - **Mejorado**: Panel de previsualización con contexto detectado
   - **Agregado**: Logging del contexto en consola

3. **`/src/hooks/useScreenshot.ts`** - Hook de capturas actualizado
   - **Agregado**: Parámetro `context` en `ScreenshotOptions`
   - **Agregado**: Logging del contexto de captura en consola
   - **Mantenido**: Funcionalidad de captura existente

## Características Implementadas

### 1. Detección de Sección Principal
- Detecta la sección actual basándose en `props.activeSection`
- Muestra etiqueta legible (ej: "Productos" en lugar de "products")

### 2. Detección de Sub-Tab en Settings
- Detecta automáticamente el tab activo en settings
- Busca el elemento `[data-state="active"][role="tab"][data-value]`
- Soporta todos los 9 tabs: general, users, printing, verifactu, about, appearance, database, advanced, shortcuts

### 3. Detección de Estado de Vista
- **panel**: Para settings (siempre)
- **detail**: Cuando hay un diálogo abierto `[role="dialog"][data-state="open"]`
- **form**: Cuando hay formularios visibles
- **empty**: Cuando hay indicadores de estado vacío
- **list**: Por defecto para listas de elementos

### 4. Conteo de Elementos Visibles
- Cuenta elementos por sección usando selectores específicos:
  - `products`: `[data-product-id]`
  - `customers`: `[data-customer-id]`
  - `aeatInvoices`: `[data-invoice-id]`
  - `newOrder`: `[data-order-item]`
  - `orderHistory`: `[data-order-id]`
- No cuenta en vistas de detalle, formulario o panel

### 5. Generación de Nombres Descriptivos
- **Casos especiales** (números fijos):
  - `02_settings_usuarios` - Settings → Usuarios
  - `08_settings_verifactu` - Settings → VERI*FACTU
  - `10_settings_about` - Settings → Acerca de
  - `12_settings_appearance` - Settings → Temas y Apariencia
  - `09_aeatInvoices_detail` - Facturas AEAT (detalle)

- **Formato general**: `{numero}_{seccion}{subseccion}_{estado}_{conteo}items`
  - `01_home.png` - Inicio
  - `03_products.png` - Productos (lista)
  - `04_customers.png` - Clientes (lista)
  - `05_newOrder_empty.png` - Nueva comanda vacía
  - `05_newOrder_3items.png` - Nueva comanda con 3 productos
  - `06_orderHistory.png` - Historial (lista)
  - `07_aeatInvoices.png` - Facturas AEAT (lista)

### 6. UI Mejorada
El panel de captura ahora muestra:
- **Sección**: Etiqueta legible de la sección actual
- **Sub-sección**: Solo si aplica (ej: "VERI*FACTU" en settings)
- **Vista**: Estado de vista actual (ej: "Lista de elementos", "Vista de detalle")
- **Elementos**: Conteo de items visibles si aplica

## Ejemplos de Uso

### Captura en Home
```
Sección: Inicio
Vista: Lista de elementos
Nombre: 01_home.png
```

### Captura en Settings → VERI*FACTU
```
Sección: Ajustes
Sub-sección: VERI*FACTU
Vista: Panel de configuración
Nombre: 08_settings_verifactu.png
```

### Captura en Products con 24 items
```
Sección: Productos
Vista: Lista de elementos
Elementos: 24 elementos
Nombre: 03_products_24items.png
```

### Captura en NewOrder vacía
```
Sección: Nueva Comanda
Vista: Vista vacía
Nombre: 05_newOrder_empty.png
```

### Captura en AEAT Invoices (detalle)
```
Sección: Facturas AEAT
Vista: Vista de detalle
Nombre: 09_aeatInvoices_detail.png
```

## Logging y Debugging

El sistema implementa logging automático en dos puntos:

1. **Al abrir el panel** (`handleExpand`):
```javascript
console.log('[Screenshot] Contexto detectado:', context);
```

2. **Al capturar** (`useScreenshot`):
```javascript
console.log('[Screenshot] Contexto de captura:', {
  section, sectionLabel, subSection, subSectionLabel,
  viewState, entityCount
});
```

## Testing Manual

Para verificar el funcionamiento:

1. Navega a cada sección de la app
2. Abre el panel de capturas (botón flotante)
3. Verifica que se detecte correctamente:
   - Sección principal
   - Sub-tab (en settings)
   - Estado de vista
   - Conteo de elementos
4. Verifica el nombre de archivo sugerido
5. Captura y revisa el resultado en Downloads

## Próximos Pasos (Nivel Avanzado)

Esta implementación es el **Nivel Intermedio**. Para expandir al **Nivel Avanzado**:

1. **Metadatos completos**:
   - Detectar tema actual (claro/oscuro)
   - Detectar tamaño de ventana
   - Detectar versión de la app

2. **Archivo JSON sidecar**:
   - Guardar metadatos junto con la imagen
   - Permitir búsqueda y filtrado de capturas

3. **Registro histórico**:
   - Base de datos local de capturas
   - Panel de gestión de capturas anteriores
   - Re-captura con mismos metadatos

4. **Integración con Kit Digital**:
   - Generación automática de documentación
   - Exportación a Markdown con imágenes
   - Sincronización con DOCUMENTO_PRESENTACION.md

## Notas Técnicas

- El sistema usa **SolidJS** con reactividad (`createSignal`, `createMemo`)
- La detección de sub-tabs depende de los atributos `data-state` y `data-value` de los tabs
- El conteo de elementos requiere que los componentes tengan los atributos `data-*` apropiados
- El logging está deshabilitado en producción (puede habilitarse si se desea)

## Conclusión

El sistema de capturas ahora detecta automáticamente el contexto de la pantalla, generando nombres de archivo descriptivos y facilitando la identificación rápida de capturas para la documentación del Kit Digital.
