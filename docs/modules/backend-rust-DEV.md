# Backend Rust - Guía de Desarrollo

**Módulo**: Backend Rust (Tauri commands, Database, License)
**Stack**: Rust, Tauri 2.10.1, rusqlite, serde
**Última actualización**: 2026-05-09 (basado en exploración de código real)

---

## Consideraciones Arquitectónicas

### Tauri Commands Pattern

**Ubicación**: `/src-tauri/src/lib.rs`

**Total commands**: 34 expuestos al frontend

**Pattern**:
```rust
#[tauri::command]
pub async fn get_products(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Product>, String> {
    // 1. Get database handle from state
    let db = state.db.lock().unwrap();
    
    // 2. Execute query
    let products = db.get_products()?;
    
    // 3. Serialize with serde
    Ok(products)
}
```

**Reglas**:
- ✅ Commands retornan `Result<T, String>` (T serializable)
- ✅ Database handle en `AppState` (mutex protected)
- ✅ Errors se convierten a `String` (simple pero efectivo)
- ❌ NO usar `unwrap()` en production (panics crash app)

### Error Handling

**Strategy**: Simple String errors

```rust
// MAL - unwrap() puede crashear
let products = db.get_products().unwrap();

// BIEN - Propagar error
let products = db.get_products()
    .map_err(|e| format!("Failed to get products: {}", e))?;
```

**Mejora futura**: Usar `thiserror` para errors tipados.

---

## Database Layer

**Ubicación**: `/src-tauri/src/database.rs`

**Stack**: rusqlite (SQLite embedded)

### Schema (8 tablas)

| Table | Columns | Indexes | Notas |
|-------|---------|---------|-------|
| products | 9 | ❌ | Missing indexes |
| categories | 4 | ❌ | Missing indexes |
| orders | 10 | ❌ | Missing indexes |
| order_items | 6 | ✅ | Solo tabla con indexes |
| tables | 4 | ❌ | Missing indexes |
| users | 5 | ❌ | Missing indexes |
| licenses | 7 | ✅ | Audit trail |
| audit_logs | 22 | ✅ | Comprehensive audit |

### Issues Conocidos

1. **No migration system**
   - Schema changes = manual intervention
   - **Mejora**: Implementar migrations o documentar manual process

2. **Missing indexes** (7/8 tablas)
   - Performance issues con datos reales
   - **Fix**: Añadir indexes a tablas principales

```rust
// FIX: Añadir indexes
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

---

## License System

**Ubicación**: `/src-tauri/src/license.rs`

### Architecture

**Two-tier validation**:
1. **Master key** (local validation)
   - Email: `admin@haido.local` (HARDCODED - 🔴 SECURITY ISSUE)
   - Key: `HAI-MASTER-DEV-KEY-2026` (HARDCODED - 🔴 SECURITY ISSUE)

2. **Online validation** (server check)
   - POST to license server
   - Verify signature + expiration

### Implementation

```rust
pub fn validate_license(
    license_key: &str,
    machine_fingerprint: &str,
) -> Result<LicenseStatus, String> {
    // 1. Check master key first
    if is_master_key(license_key) {
        return Ok(LicenseStatus::Valid);
    }
    
    // 2. Check local database
    if let Some(status) = db.get_license_status(license_key)? {
        return Ok(status);
    }
    
    // 3. Validate online
    let response = http_post_license_server(license_key, machine_fingerprint)?;
    
    // 4. Cache result
    db.save_license(license_key, &response)?;
    
    Ok(response)
}
```

**🔴 CRITICAL ISSUE**: Hardcoded master credentials en `lib.rs:282-284`

**Fix inmediato**:
```rust
// ANTES
const MASTER_LICENSE_EMAIL: &str = "admin@haido.local";
const MASTER_LICENSE_KEY: &str = "HAI-MASTER-DEV-KEY-2026";

// DESPUÉS
fn get_master_email() -> String {
    std::env::var("MASTER_LICENSE_EMAIL")
        .unwrap_or_else(|_| "admin@haido.local".to_string())
}
```

---

## Screenshot Functionality

**Ubicación**: `/src-tauri/src/screenshot.rs`

**Implementation**: ✅ Complete

```rust
#[tauri::command]
pub fn save_screenshot_from_base64(
    base64_data: String,
    filename: String,
    location: ScreenshotLocation,
) -> Result<String, String> {
    // 1. Decode base64
    let bytes = base64_decode(&base64_data)?;
    
    // 2. Resolve path (cross-platform)
    let path = resolve_screenshot_path(location, &filename)?;
    
    // 3. Create parent dirs
    std::fs::create_dir_all(path.parent().unwrap())?;
    
    // 4. Write bytes
    std::fs::write(&path, bytes)?;
    
    Ok(path.to_string_lossy().to_string())
}
```

**Features**:
- ✅ Base64 encoding/decoding
- ✅ Flexible locations (app data / downloads)
- ✅ Cross-platform paths
- ✅ Directory creation automática

---

## Audit System (NUEVO - No Documentado)

**Ubicación**: `/src-tauri/src/lib.rs` (commands audit)

**4 commands nuevos**:
- `create_audit_log` - Registrar evento
- `get_audit_logs` - Obtener logs
- `export_audit_logs` - Exportar a CSV/JSON
- `cleanup_audit_logs` - Limpiar logs viejos

**Schema**: `audit_logs` table con 22 columnas

**No documentado en CLAUDE.md** - descubierta en exploración.

---

## Anti-Patterns a Evitar

### ❌ unwrap() en production

```rust
// MAL - puede crashear la app
let db = state.db.lock().unwrap();

// BIEN - manejar error
let db = state.db.lock()
    .map_err(|e| format!("Database lock poisoned: {}", e))?;
```

### ❌ Hardcoded credentials

```rust
// MAL - security issue
const MASTER_KEY = "HAI-MASTER-DEV-KEY-2026";

// BIEN - env vars
let master_key = std::env::var("MASTER_LICENSE_KEY")
    .unwrap_or_else(|_| get_default_master_key());
```

### ❌ String errors genéricos

```rust
// MAL - no hay contexto
Err("Failed".to_string())

// BIEN - error con contexto
.map_err(|e| format!("Failed to get products: {}", e))?
```

---

## Testing Strategy (FUTURO)

**Estado actual**: 0% coverage

**Planned**:
- Unit tests para database operations
- Integration tests para commands
- License validation tests

**Patrón**:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_master_key() {
        let result = validate_license("HAI-MASTER-DEV-KEY-2026", "test-fp");
        assert!(result.is_ok());
    }
}
```

---

## Security Considerations

### 🔴 Issues Críticos

1. **Hardcoded master credentials**
   - **Fix**: Mover a env vars (TKT-01.1)
   - **Priority**: BLOCKER para producción

2. **No input sanitization** en algunos commands
   - **Risk**: SQL injection si no se usa prepared statements
   - **Fix**: Verificar que rusqlite usa prepared statements

3. **No rate limiting** en license validation
   - **Risk**: Abuse del license server
   - **Fix**: Implementar rate limiting

---

## Referencias

- Tauri commands: https://v2.tauri.app/develop/invoking/
- rusqlite docs: https://docs.rs/rusqlite/
- License implementation: `/src-tauri/src/license.rs`
