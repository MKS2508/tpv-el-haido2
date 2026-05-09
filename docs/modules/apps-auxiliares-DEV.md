# Apps Auxiliares - Guía de Desarrollo

**Módulo**: License Server + HaidoDocs
**Stack**: Elysia.js (Bun), Next.js 16.2.2
**Última actualización**: 2026-05-09 (basado en exploración de código real)

---

## License Server

**Ubicación**: `/apps/license-server/`

### Stack

```json
{
  "runtime": "Bun",
  "framework": "Elysia.js",
  "database": "SQLite (Drizzle ORM)",
  "features": ["License validation", "Audit logs", "Crypto"]
}
```

### Architecture

```
Request → Elysia Router → License Service → Drizzle ORM → SQLite
                ↓
         Crypto Service (SHA-256)
                ↓
           Response (JSON)
```

### Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/health` | GET | Health check | None |
| `/validate` | POST | Validate license key | None |
| `/admin/licenses` | GET | List all licenses | ⚠️ Missing auth |
| `/admin/licenses` | POST | Create license | ⚠️ Missing auth |

### Code Organization

```
src/
├── index.ts              # Elysia server setup
├── routes/
│   ├── license.ts        # License endpoints
│   └── admin.ts          # Admin endpoints
├── services/
│   ├── license.service.ts    # Business logic
│   └── crypto.service.ts     # SHA-256 hashing
└── db/
    └── schema.ts         # Drizzle ORM schema
```

### Implementation Details

**License validation flow**:
```typescript
// license.service.ts
export async function validateLicense(
  key: string,
  machineFingerprint: string
): Promise<LicenseStatus> {
  // 1. Check if master key
  if (isMasterKey(key)) {
    return { valid: true, type: 'master' };
  }
  
  // 2. Check database
  const license = await db.getLicense(key);
  if (!license) {
    return { valid: false, reason: 'not_found' };
  }
  
  // 3. Verify fingerprint
  if (license.fingerprint !== machineFingerprint) {
    return { valid: false, reason: 'fingerprint_mismatch' };
  }
  
  // 4. Check expiration
  if (license.expiresAt < Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  
  // 5. Log validation attempt
  await db.createAuditLog({ key, fingerprint, result: 'valid' });
  
  return { valid: true, type: 'standard' };
}
```

**Crypto service**:
```typescript
// crypto.service.ts
export function hashFingerprint(fingerprint: string): string {
  return createHash('sha256').update(fingerprint).digest('hex');
}

export function signLicense(license: License): string {
  // HMAC signature for verification
  const data = JSON.stringify(license);
  return createHmac('sha256', SECRET).update(data).digest('hex');
}
```

### Issues Conocidos

1. **🔴 No authentication en admin endpoints**
   - Cualquiera puede crear/eliminar licencias
   - **Fix**: Implementar API key auth antes de producción

2. **⚠️ No rate limiting**
   - Vulnerable a abuse
   - **Fix**: Implementar rate limiting middleware

3. **⚠️ Hardcoded SECRET** (probable)
   - Si HMAC secret está hardcoded
   - **Fix**: Mover a env vars

---

## HaidoDocs

**Ubicación**: `/apps/haidodocs/`

### Stack

```json
{
  "runtime": "Node.js (Bun compatible)",
  "framework": "Next.js 16.2.2",
  "docs": "Fumadocs 16.7.11",
  "features": ["MDX support", "i18n (es/en)", "Search"]
}
```

### Architecture

```
User Request → Next.js App Router → Fumadocs → MDX/Markdown → HTML
                                               ↓
                                          Search (local)
```

### Pages Structure

```
src/app/
├── (home)/
│   └── page.tsx          # Homepage
├── docs/
│   └── [...slug]/page.tsx  # Spanish docs
├── en/docs/
│   └── [...slug]/page.tsx  # English docs
├── api/search/
│   └── route.ts          # Search API (local)
└── manual-print/
    └── page.tsx          # Printable manual
```

### Issues Conocidos

1. **🔴 MDX instalado pero NO usado**
   - `fumadocs-mdx` package.json
   - **Pero**: No hay archivos `.mdx` en el repo
   - Solo: `/public/manual-usuario.md` (Markdown estático)
   - **Fix**: O usar MDX o quitar dependency

2. **🔴 Search no implementado en UI**
   - Fumadocs tiene search built-in
   - **Pero**: No hay search bar en ninguna página
   - **Fix**: Implementar search component

3. **⚠️ Documentación incompleta**
   - Solo 1 archivo markdown
   - **Expected**: Multi-page docs con navegación

### Content Strategy

**Actual**: 1 archivo markdown estático

**Propuesto** (post-production):
```
docs/
├── guia-usuario.mdx         # User guide
├── guia-admin.mdx           # Admin guide
├── api-reference.mdx         # API docs
├── deployment.mdx            # Deployment guide
└── troubleshooting.mdx      # Common issues
```

---

## Deployment (Coolify)

### License Server

**Configuración actual**:
- Runtime: Bun
- Port: 3000 (default)
- Database: SQLite bundled

**Coolify setup**:
```json
{
  "name": "tpv-license-server",
  "buildCommand": "bun run build",
  "startCommand": "bun run start",
  "env": {
    "DATABASE_URL": "/app/data/licenses.db",
    "MASTER_LICENSE_EMAIL": "${MASTER_LICENSE_EMAIL}",
    "MASTER_LICENSE_KEY": "${MASTER_LICENSE_KEY}"
  }
}
```

**Consideraciones**:
- ✅ SQLite bundled → no necesita DB externa
- ✅ Bun runtime soportado por Coolify
- ⚠️ Persistencia: usar volume para database

### HaidoDocs

**Configuración actual**:
- Runtime: Node.js (o Bun)
- Build: Static export
- Port: 3001 (default)

**Coolify setup**:
```json
{
  "name": "tpv-haidodocs",
  "buildCommand": "bun run build",
  "startCommand": "bun run start",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://license-server.example.com"
  }
}
```

**Consideraciones**:
- ✅ Static export → puede servir con CDN
- ✅ Next.js standard → soportado por Coolify
- ⚠️ Search: Local search, no backend

---

## Development Workflow

### License Server

```bash
cd apps/license-server

# Instalar
bun install

# Desarrollo
bun run dev  # Port 3000

# Build
bun run build

# Test endpoint
curl http://localhost:3000/health
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"test-key","fingerprint":"abc"}'
```

### HaidoDocs

```bash
cd apps/haidodocs

# Instalar
bun install

# Desarrollo
bun run dev  # Port 3001

# Build
bun run build

# Static export
bun run build:static
```

---

## Anti-Patterns a Evitar

### ❌ No authentication en admin endpoints

```typescript
// MAL - público sin auth
app.get('/admin/licenses', async () => {
  return await db.getLicenses();
});

// BIEN - API key auth
app.get('/admin/licenses', async ({ request }) => {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    throw new UnauthorizedError();
  }
  return await db.getLicenses();
});
```

### ❌ MDX package sin usar

```json
// MAL - dependency bloat
{
  "dependencies": {
    "fumadocs-mdx": "^16.7.11"  // Instalado pero no usado
  }
}

// BIEN - quitar si no se usa
{
  "dependencies": {
    // Quitar fumadocs-mdx si usas markdown estático
  }
}
```

---

## Testing Strategy (FUTURO)

**Estado actual**: 0% coverage

**Planned**:
- License server: Unit tests para validation logic
- HaidoDocs: E2E tests para navegación

---

## Referencias

- License server: `/apps/license-server/`
- HaidoDocs: `/apps/haidodocs/`
- Elysia docs: https://elysiajs.com/
- Fumadocs docs: https://fumadocs.vercel.app/
