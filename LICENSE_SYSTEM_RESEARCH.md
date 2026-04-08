# Sistema de Licencias para TPV El Haido - Prompt de Research

## Contexto del Proyecto

- **Nombre:** TPV El Haido (Point of Sale System)
- **Repositorio principal:** `/Users/mks/Documents/GitHub/tpv-tauri2/tpv-el-haido`
- **Framework Frontend:** SolidJS con TypeScript
- **Backend Tauri:** Rust con Tauri v2
- **Base de datos local:** SQLite (rusqlite) ya configurada en `src-tauri/src/database.rs`
- **Plugins Tauri ya instalados:**
  - `tauri-plugin-http` (para peticiones HTTP)
  - `tauri-plugin-shell`
  - `tauri-plugin-updater`
  - `tauri-plugin-opener`
  - `tauri-plugin-process`
- **Directorio de app:** Usa `app.path().app_data_dir()` (ya implementado en `write_json_config` command)
- **Database path:** `app_dir.join("tpv-haido.db")` (ya en setup)

## Backend de Licencias (Nuevo)

- **Ubicación:** `/Users/mks/Documents/GitHub/tpv-tauri2/apps/license-server/`
- **Runtime:** Bun (nativo)
- **Framework:** Elysia.js
- **Base de datos:** SQLite con `bun:sqlite` (native adapter)
- **Criptografía:** APIs nativas de Bun (`Bun.password`, `Bun.crypto`, etc.)

## Requisitos del Sistema de Licencias

### 1. Backend Bun + Elysia (apps/license-server)

**Estructura del directorio:**
```
apps/license-server/
├── src/
│   ├── db/
│   │   └── schema.ts           # Definición de tablas SQLite
│   ├── routes/
│   │   ├── license.ts           # Endpoints de validación
│   │   └── admin.ts             # Endpoints de administración
│   ├── services/
│   │   ├── license.service.ts   # Lógica de negocio
│   │   └── crypto.service.ts    # Generación/hash de keys con Bun APIs
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── index.ts                 # Entry point Elysia
├── db/
│   └── licenses.db              # SQLite database (se crea al iniciar)
├── package.json
├── bun.lockb
└── tsconfig.json
```

**a) package.json:**
```json
{
  "name": "license-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "start": "bun run src/index.ts",
    "db:init": "bun run src/db/schema.ts",
    "db:seed": "bun run scripts/seed.ts"
  },
  "dependencies": {
    "elysia": "^1.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

**b) src/db/schema.ts (Crear tablas):**
```typescript
import { Database } from "bun:sqlite";

const db = new Database("db/licenses.db");

// Tabla de licencias
db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    key_plain TEXT NOT NULL,  // Solo para admin, no exponer en API
    email TEXT NOT NULL,
    machine_fingerprint TEXT,
    license_type TEXT NOT NULL,  -- 'basic', 'pro', 'enterprise'
    expires_at INTEGER,  -- NULL = lifetime
    activated_at INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    activation_count INTEGER DEFAULT 0,
    max_activations INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`);

// Tabla de logs de validaciones
db.exec(`
  CREATE TABLE IF NOT EXISTS validation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL,
    machine_fingerprint TEXT NOT NULL,
    valid BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    validated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (license_id) REFERENCES licenses(id)
  );
`);

export default db;
```

**c) src/services/crypto.service.ts:**
Usar APIs nativas de Bun:
```typescript
import { crypto } from "bun";

export class CryptoService {
  /**
   * Genera una license key única
   * Formato: XXXX-XXXX-XXXX-XXXX
   */
  static generateLicenseKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments: string[] = [];
    
    for (let i = 0; i < 4; i++) {
      let segment = "";
      for (let j = 0; j < 4; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(segment);
    }
    
    return segments.join("-");
  }

  /**
   * Hashea una license key usando SHA-256 (Bun crypto)
   */
  static hashLicenseKey(key: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Genera un machine fingerprint básico
   * Nota: En producción, esto debería venir del cliente
   */
  static generateMachineFingerprint(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  /**
   * Verifica si un hash corresponde a una key
   */
  static verifyLicenseKey(key: string, storedHash: string): boolean {
    const keyHash = this.hashLicenseKey(key);
    return keyHash === storedHash;
  }
}
```

**d) src/services/license.service.ts:**
```typescript
import db from "../db/schema.ts";
import { CryptoService } from "./crypto.service.ts";

export class LicenseService {
  /**
   * Crea una nueva licencia
   */
  static createLicense(
    email: string,
    licenseType: "basic" | "pro" | "enterprise",
    expiresInDays?: number
  ): { key: string; keyHash: string } {
    const key = CryptoService.generateLicenseKey();
    const keyHash = CryptoService.hashLicenseKey(key);
    
    const expiresAt = expiresInDays 
      ? Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60)
      : null;

    const query = db.prepare(`
      INSERT INTO licenses (key_hash, key_plain, email, license_type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    query.run(keyHash, key, email, licenseType, expiresAt);

    return { key, keyHash };
  }

  /**
   * Valida una licencia
   */
  static validateLicense(
    key: string,
    machineFingerprint: string
  ): {
    valid: boolean;
    expiresAt?: number;
    userEmail: string;
    licenseType: string;
    error?: string;
  } {
    const keyHash = CryptoService.hashLicenseKey(key);

    const query = db.prepare(`
      SELECT * FROM licenses WHERE key_hash = ?
    `);
    
    const license = query.get(keyHash) as any;

    if (!license) {
      return {
        valid: false,
        userEmail: "",
        licenseType: "",
        error: "License key not found"
      };
    }

    // Verificar si está activa
    if (!license.is_active) {
      return {
        valid: false,
        userEmail: license.email,
        licenseType: license.license_type,
        error: "License is deactivated"
      };
    }

    // Verificar expiración
    if (license.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now > license.expires_at) {
        return {
          valid: false,
          userEmail: license.email,
          licenseType: license.license_type,
          error: "License has expired"
        };
      }
    }

    // Verificar activaciones
    if (license.machine_fingerprint && license.machine_fingerprint !== machineFingerprint) {
      if (license.activation_count >= license.max_activations) {
        return {
          valid: false,
          userEmail: license.email,
          licenseType: license.license_type,
          error: "Maximum activations exceeded"
        };
      }
    }

    // Actualizar registro de activación
    const updateQuery = db.prepare(`
      UPDATE licenses 
      SET machine_fingerprint = ?, activated_at = ?, activation_count = activation_count + 1
      WHERE id = ?
    `);
    updateQuery.run(machineFingerprint, Math.floor(Date.now() / 1000), license.id);

    // Log de validación
    const logQuery = db.prepare(`
      INSERT INTO validation_logs (license_id, machine_fingerprint, valid)
      VALUES (?, ?, 1)
    `);
    logQuery.run(license.id, machineFingerprint);

    return {
      valid: true,
      expiresAt: license.expires_at,
      userEmail: license.email,
      licenseType: license.license_type
    };
  }

  /**
   * Lista todas las licencias (admin)
   */
  static listLicenses(): any[] {
    const query = db.prepare(`
      SELECT id, email, license_type, expires_at, is_active, activated_at, activation_count, created_at
      FROM licenses
      ORDER BY created_at DESC
    `);
    return query.all() as any[];
  }

  /**
   * Revoca una licencia
   */
  static revokeLicense(licenseId: number): boolean {
    const query = db.prepare(`
      UPDATE licenses SET is_active = 0 WHERE id = ?
    `);
    const result = query.run(licenseId);
    return result.changes > 0;
  }

  /**
   * Reactiva una licencia
   */
  static reactivateLicense(licenseId: number): boolean {
    const query = db.prepare(`
      UPDATE licenses SET is_active = 1 WHERE id = ?
    `);
    const result = query.run(licenseId);
    return result.changes > 0;
  }

  /**
   * Obtiene info de una licencia por email
   */
  static getLicensesByEmail(email: string): any[] {
    const query = db.prepare(`
      SELECT id, license_type, expires_at, is_active, created_at
      FROM licenses WHERE email = ?
    `);
    return query.all(email) as any[];
  }
}
```

**e) src/types/index.ts:**
```typescript
export interface LicenseValidationRequest {
  key: string;
  email: string;
  machine_fingerprint: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  expires_at?: number;
  user_email: string;
  license_type: string;
  error?: string;
}

export interface CreateLicenseRequest {
  email: string;
  license_type: "basic" | "pro" | "enterprise";
  expires_in_days?: number;
}

export interface CreateLicenseResponse {
  key: string;
  key_hash: string;
  email: string;
  license_type: string;
  expires_at?: number;
}
```

**f) src/routes/license.ts (API pública para Tauri):**
```typescript
import { Elysia, t } from "elysia";
import { LicenseService } from "../services/license.service.ts";
import { LicenseValidationRequest, LicenseValidationResponse } from "../types/index.ts";

export const licenseRoutes = new Elysia({ prefix: "/api/license" })
  .post("/validate", async ({ body }: { body: LicenseValidationRequest }) => {
    try {
      const result = LicenseService.validateLicense(
        body.key,
        body.machine_fingerprint
      );

      const response: LicenseValidationResponse = {
        valid: result.valid,
        user_email: result.userEmail,
        license_type: result.licenseType,
        expires_at: result.expiresAt,
        error: result.error
      };

      return response;
    } catch (error) {
      console.error("Error validating license:", error);
      return {
        valid: false,
        user_email: "",
        license_type: "",
        error: "Internal server error"
      };
    }
  }, {
    body: t.Object({
      key: t.String(),
      email: t.String(),
      machine_fingerprint: t.String()
    })
  })
  .get("/health", () => {
    return { status: "ok", service: "license-server", timestamp: Date.now() };
  });
```

**g) src/routes/admin.ts (API para administración):**
```typescript
import { Elysia, t } from "elysia";
import { LicenseService } from "../services/license.service.ts";
import { CreateLicenseRequest, CreateLicenseResponse } from "../types/index.ts";

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
  .get("/licenses", () => {
    return LicenseService.listLicenses();
  })

  .post("/licenses", async ({ body }: { body: CreateLicenseRequest }) => {
    const { key, keyHash } = LicenseService.createLicense(
      body.email,
      body.license_type,
      body.expires_in_days
    );

    const response: CreateLicenseResponse = {
      key,
      key_hash: keyHash,
      email: body.email,
      license_type: body.license_type,
      expires_at: body.expires_in_days 
        ? Math.floor(Date.now() / 1000) + (body.expires_in_days * 24 * 60 * 60)
        : undefined
    };

    return response;
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
      license_type: t.Union([t.Literal("basic"), t.Literal("pro"), t.Literal("enterprise")]),
      expires_in_days: t.Optional(t.Number())
    })
  })

  .post("/licenses/:id/revoke", async ({ params }: { params: { id: string } }) => {
    const success = LicenseService.revokeLicense(parseInt(params.id));
    return { success };
  })

  .post("/licenses/:id/reactivate", async ({ params }: { params: { id: string } }) => {
    const success = LicenseService.reactivateLicense(parseInt(params.id));
    return { success };
  })

  .get("/licenses/:email", async ({ params }: { params: { email: string } }) => {
    return LicenseService.getLicensesByEmail(params.email);
  });
```

**h) src/index.ts (Entry point):**
```typescript
import { Elysia } from "elysia";
import { licenseRoutes } from "./routes/license.ts";
import { adminRoutes } from "./routes/admin.ts";
import db from "./db/schema.ts";

const app = new Elysia()
  .use(licenseRoutes)
  .use(adminRoutes)
  .onError(({ code, error, set }) => {
    console.error("Server error:", error);
    
    set.status = 500;
    
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: "Validation error",
        details: error
      };
    }

    return {
      error: "Internal server error",
      message: error.message
    };
  })
  .listen(3000);

console.log("🦄 License Server running at http://localhost:3000");
```

### 2. Backend Rust (src-tauri/src/lib.rs)

Agrega un nuevo módulo `mod license;` en `lib.rs` e implementa:

**a) Estructuras en `src-tauri/src/models/license.rs` (nuevo archivo):**
```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LicenseKey {
    pub key_hash: String,
    pub email: String,
    pub machine_fingerprint: String,
    pub activated_at: i64,
    pub expires_at: Option<i64>,
    pub is_active: bool,
    pub license_type: String,
}

#[derive(Serialize, Deserialize)]
pub struct LicenseValidationRequest {
    pub key: String,
    pub email: String,
    pub machine_fingerprint: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LicenseValidationResponse {
    pub valid: bool,
    pub expires_at: Option<i64>,
    pub user_email: String,
    pub license_type: String,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct LicenseStatus {
    pub is_activated: bool,
    pub is_valid: bool,
    pub expires_at: Option<i64>,
    pub email: Option<String>,
    pub days_remaining: Option<i64>,
    pub license_type: Option<String>,
    pub error_message: Option<String>,
}
```

**b) Funciones en `src-tauri/src/license.rs` (nuevo módulo):**
```rust
use sha2::{Sha256, Digest};
use hex;
use std::process::Command;

/// Genera un machine fingerprint básico
pub fn generate_machine_fingerprint() -> Result<String, String> {
    // Intentar obtener MAC address
    if cfg!(target_os = "windows") {
        let output = Command::new("getmac")
            .output()
            .map_err(|e| format!("Failed to get MAC: {}", e))?;
        let mac = String::from_utf8_lossy(&output.stdout);
        Ok(mac.lines().next().unwrap_or("unknown").to_string())
    } else {
        // macOS/Linux
        let output = Command::new("ifconfig")
            .args(&["en0", "ether"])
            .output()
            .map_err(|e| format!("Failed to get MAC: {}", e))?;
        let mac = String::from_utf8_lossy(&output.stdout);
        Ok(mac.trim().to_string())
    }
}

/// Hashea una license key usando SHA-256
pub fn hash_license_key(key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// Valida una licencia online contra la API
pub async fn validate_license_online(
    key: String,
    email: String,
    machine_fingerprint: String
) -> Result<models::LicenseValidationResponse, String> {
    let client = reqwest::Client::new();
    
    let request_body = serde_json::json!({
        "key": key,
        "email": email,
        "machine_fingerprint": machine_fingerprint
    });

    let response = client
        .post("http://localhost:3000/api/license/validate")
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Error de conexión: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Error de API: {}", response.status()));
    }

    let result: models::LicenseValidationResponse = response.json().await
        .map_err(|e| format!("Error parseando respuesta: {}", e))?;

    Ok(result)
}
```

**c) Commands en `src-tauri/src/lib.rs`:**
```rust
#[tauri::command]
async fn check_license_status(state: State<'_, DbState>) -> Result<models::LicenseStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;

    match db.get_active_license().map_err(|e| e.to_string())? {
        Some(license) => {
            let now = chrono::Utc::now().timestamp();
            let is_valid = if let Some(expires) = license.expires_at {
                now < expires
            } else {
                true
            };

            let days_remaining = license.expires_at.map(|exp| (exp - now) / 86400);

            Ok(models::LicenseStatus {
                is_activated: true,
                is_valid,
                expires_at: license.expires_at,
                email: Some(license.email),
                days_remaining,
                license_type: Some(license.license_type),
                error_message: None,
            })
        }
        None => Ok(models::LicenseStatus {
            is_activated: false,
            is_valid: false,
            expires_at: None,
            email: None,
            days_remaining: None,
            license_type: None,
            error_message: Some("No license found"),
        })
    }
}

#[tauri::command]
async fn validate_and_activate_license(
    key: String,
    email: String,
    state: State<'_, DbState>
) -> Result<models::LicenseStatus, String> {
    // Generar fingerprint
    let machine_fingerprint = license::generate_machine_fingerprint()?;

    // Validar online
    let response = license::validate_license_online(key, email, machine_fingerprint.clone()).await?;

    if !response.valid {
        return Ok(models::LicenseStatus {
            is_activated: false,
            is_valid: false,
            expires_at: response.expires_at,
            email: Some(response.user_email),
            days_remaining: response.expires_at.map(|exp| {
                let now = chrono::Utc::now().timestamp();
                (exp - now) / 86400
            }),
            license_type: Some(response.license_type),
            error_message: response.error,
        });
    }

    // Guardar en DB
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let db = db.as_ref().ok_or("Database not initialized")?;

    let license = models::LicenseKey {
        key_hash: license::hash_license_key(&key),
        email: response.user_email.clone(),
        machine_fingerprint,
        activated_at: chrono::Utc::now().timestamp(),
        expires_at: response.expires_at,
        is_active: true,
        license_type: response.license_type,
    };

    db.save_license(&license).map_err(|e| e.to_string())?;

    let days_remaining = response.expires_at.map(|exp| {
        let now = chrono::Utc::now().timestamp();
        (exp - now) / 86400
    });

    Ok(models::LicenseStatus {
        is_activated: true,
        is_valid: true,
        expires_at: response.expires_at,
        email: Some(response.user_email),
        days_remaining,
        license_type: Some(response.license_type),
        error_message: None,
    })
}

#[tauri::command]
async fn get_machine_fingerprint() -> Result<String, String> {
    license::generate_machine_fingerprint()
}
```

### 3. Base de Datos (src-tauri/src/database.rs)

Agrega tablas para licencias:
```sql
CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    machine_fingerprint TEXT NOT NULL,
    activated_at INTEGER NOT NULL,
    expires_at INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    license_type TEXT NOT NULL
);
```

Y métodos:
```rust
pub fn save_license(&self, license: &LicenseKey) -> Result<()> { /* ... */ }
pub fn get_active_license(&self) -> Result<Option<LicenseKey>> { /* ... */ }
pub fn update_license_status(&self, key_hash: &str, is_active: bool) -> Result<()> { /* ... */ }
```

### 4. Frontend SolidJS (Igual que antes, pero sin trial)

**Archivos a crear:**
- `src/components/LicenseDialog.tsx` (Modal de activación)
- `src/hooks/useLicense.ts` (Hook de licencia)
- `src/services/license.ts` (Servicios de Tauri)
- `src/types/license.ts` (Tipos TypeScript)

**Modificar `src/App.tsx`:**
- En `onMount`, llamar `checkLicense()`
- Si `showDialog` es true, mostrar `<LicenseDialog />`
- Si la licencia expiró o no es válida, bloquear acceso

### 5. Configuración de Tauri

**Actualizar `src-tauri/Cargo.toml`:**
```toml
[dependencies]
sha2 = "0.10"
hex = "0.4"
reqwest = { version = "0.11", features = ["json"] }
chrono = "0.4"
```

**Actualizar `src-tauri/tauri.conf.json`:**
```json
{
  "app": {
    "security": {
      "capabilities": [
        {
          "identifier": "default",
          "windows": ["*"],
          "permissions": [
            "core:default",
            "shell:default",
            "http:default",
            "http:allow-fetch",
            "http:allow-fetch-cancel",
            "http:allow-fetch-read-body",
            "http:allow-fetch-send"
          ]
        }
      ]
    }
  }
}
```

### 6. Scripts útiles para el backend

**scripts/seed.ts (Opcional):**
```typescript
import { LicenseService } from "../src/services/license.service.ts";
import db from "../src/db/schema.ts";

// Crear algunas licencias de prueba
console.log("Creando licencias de prueba...");

const license1 = LicenseService.createLicense("user1@example.com", "pro", 30);
console.log("License 1:", license1);

const license2 = LicenseService.createLicense("user2@example.com", "enterprise");
console.log("License 2 (lifetime):", license2);

console.log("Done!");
```

## Requisitos de Implementación

1. **Sin trial period** - Solo licencias pagadas
2. **Backend Bun + Elysia** - Usar APIs nativas de Bun
3. **SQLite con bun:sqlite** - Native adapter
4. **Generación de keys** - Formato XXXX-XXXX-XXXX-XXXX
5. **Validación online** - Contra el servidor
6. **Persistencia local** - Guardar licencia validada en SQLite del TPV
7. **Error handling** - Offline, invalid key, expired, max activations
8. **Admin API** - Para crear, listar, revocar licencias
9. **Type safety** - TypeScript estricto
10. **Consistencia** - Seguir estilo del proyecto

## Output esperado

1. Estructura completa del directorio `apps/license-server/`
2. Todos los archivos con código completo
3. Comandos para inicializar el backend
4. Instrucciones de cómo testear
5. Cómo integrar con el TPV
