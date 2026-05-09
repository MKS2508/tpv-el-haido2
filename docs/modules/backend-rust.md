# Backend Rust - Estado Actual

**Última actualización**: 2026-05-09 20:15 (agente completado)
**Estado**: ✅ Explorado - findings críticos

## Tauri Commands (lib.rs)

**Archivo**: `/src-tauri/src/lib.rs`

**Total commands expuestos**: **34** (CLAUDE.md decía 25 ❌)

### Commands CRUD (estándar)
- `get_products`, `create_product`, `update_product`, `delete_product`
- `get_categories`, `create_category`, `update_category`, `delete_category`
- `get_orders`, `create_order`, `update_order`, `delete_order`
- `get_tables`, `create_table`, `update_table`, `delete_table`
- `get_users`, `create_user`, `update_user`, `delete_user`

### Commands data
- `export_data`, `import_data`, `clear_all_data`

### Commands config
- `write_json_config` (14 LOC)

### Commands license
- `check_license_status` (34 LOC)
- `validate_and_activate_license` (95 LOC)
- `get_machine_fingerprint` (2 LOC)
- `clear_license` (4 LOC)

### Commands screenshot
- `save_screenshot_from_base64` (40 LOC)
- `get_screenshots_dir` (9 LOC)

### Commands audit (nuevos, no documentados)
- `create_audit_log` (6 LOC)
- `get_audit_logs` (6 LOC)
- `export_audit_logs` (6 LOC)
- `cleanup_audit_logs` (4 LOC)

### Command misc
- `greet` (1 LOC) - test command

## Database

**Archivo**: `/src-tauri/src/database.rs`

### Tables (8 tablas, 0 indexes en la mayoría)

| Table | Columns | Indexes | Notas |
|-------|---------|---------|-------|
| products | 9 | ❌ | - |
| categories | 4 | ❌ | - |
| orders | 10 | ❌ | - |
| order_items | 6 | ✅ | Solo tabla con indexes |
| tables | 4 | ❌ | - |
| users | 5 | ❌ | - |
| licenses | 7 | ✅ | Audit trail |
| audit_logs | 22 | ✅ | Comprehensive audit |

### Issues críticos
- ❌ **No migration system** - Schema changes requieren intervención manual
- ❌ **La mayoría de tablas sin indexes** - Performance issues en producción
- ⚠️ **OrderItem model bug** - Falta campo `id` que existe en DB

## License

**Archivo**: `/src-tauri/src/license.rs`

- **Master key validation**: ✅ Real
- **Online validation**: ✅ Real
- 🔴 **SECURITY ISSUE**: Hardcoded master credentials en `lib.rs:282-284`
  - Email: `admin@haido.local`
  - Key: `HAI-MASTER-DEV-KEY-2026`
  - **Action needed**: Mover a env vars antes de production

## Screenshot

**Archivo**: `/src-tauri/src/screenshot.rs`

- **Implementation**: ✅ Complete
- **Features**:
  - Base64 decoding
  - Flexible save locations (app data o downloads)
  - Directory creation automática
  - Cross-platform paths

## Models

### Issues detectados
1. **models/license.rs** - Import paths sugieren que debería estar en `models/license/mod.rs`
2. **OrderItem struct** - Missing `id` field que existe en database schema

## Critical Findings

### Security 🔴
- **Hardcoded master credentials** en `lib.rs:282-284`
  - **Action**: Mover a env vars ANTES de production deployment

### Bugs 🐛
- **OrderItem model missing id field** - Desincronización con DB schema

### Architecture Issues 🏗️
- **No migration system** - Cambios en schema requieren intervención manual
- **Missing indexes** - La mayoría de tablas sin indexes (performance risk)

### Missing features ❌
- No hay rollback mechanism para migrations
- No hay database backup automation

---

**Agente**: `a5e90ae770d98e03b` ✅ completado (2:03 min)
