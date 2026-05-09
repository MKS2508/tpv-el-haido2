# TPV El Haido - Documentación Modular

Esta estructura contiene documentación específica por módulo, mantenida al día con el código real.

## Módulos

- [`frontend-solidjs.md`](./frontend-solidjs.md) - Frontend SolidJS (components, store, hooks)
- [`backend-rust.md`](./backend-rust.md) - Backend Rust (Tauri commands, database)
- [`services.md`](./services.md) - Services layer (storage, platform, printer)
- [`apps-auxiliares.md`](./apps-auxiliares.md) - License server + Docs
- [`build-infra.md`](./build-infra.md) - Build config, scripts, deployment

## Convenciones

Cada módulo doc contiene:
- **Estado actual** - Qué está implementado vs qué falta
- **Archivos clave** - Paths y responsibilidades
- **Dependencias** - Qué otros módulos consume
- **Technical debt** - Issues conocidos
- **TKTs relacionados** - Tickets pendientes

## Actualización

Los docs se regeneran desde código real vía:
```bash
# Explorar módulo específico
@task-decompiler "Re-auditar módulo X y actualizar docs"
```
