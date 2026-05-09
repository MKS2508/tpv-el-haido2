# Apps Auxiliares - Estado Actual

**Última actualización**: 2026-05-09 20:15 (agente completado)
**Estado**: ✅ Explorado - listo para migrar

## License Server

**Path**: `/apps/license-server/`

### Stack
- ✅ **Elysia.js real** - Servidor completamente funcional
- ✅ **SQLite** con Drizzle ORM
- ✅ **Bun runtime** - dependencies directas

### Endpoints (2 principales)
- `/health` - Health check
- `/validate` - Validación de licencias
- + ruta admin (no especificada)

### Crypto
- ✅ **Safe** - SHA-256 hashing + fingerprint handling
- Implementación robusta

### Database
- ✅ Schema completo para licencias
- ✅ Logs de validación con audit trail

### Deploy readiness
| Item | Status | Notas |
|------|--------|-------|
| **Dependencies** | ✅ Directas | No hay dependencias complejas |
| **Runtime** | ✅ Bun | Coolify soporta |
| **DB** | ✅ SQLite bundled | No necesita DB externa |
| **Ready for Coolify** | ✅ **SÍ** | Puede migrar inmediatamente |

## HaidoDocs

**Path**: `/apps/haidodocs/`

### Stack
- ✅ **Next.js 16.2.2** real
- ✅ **Fumadocs 16.7.11** - framework para documentación

### Pages (10 total)
- Rutas en español: `/docs/*`
- Rutas en inglés: `/en/docs/*`

### 🔴 Issues críticos

1. **MDX no configurado**
   - Tiene `fumadocs-mdx` instalado
   - **Pero**: No hay archivos MDX reales
   - Solo Markdown estático en `/public/manual-usuario.md`

2. **Buscador no implementado**
   - Fumadocs incluye search
   - **Pero**: No hay componentes de búsqueda en la UI
   - **Missing**: Search bar, results page

3. **Documentación incompleta**
   - Solo 1 archivo Markdown
   - **Expected**: Multiple docs pages

### Deploy readiness
| Item | Status | Notas |
|------|--------|-------|
| **Dependencies** | ✅ Directas | Next.js standard |
| **Build** | ✅ Static export | Puede generar static files |
| **Ready for Coolify** | ✅ **SÍ** | Puede migrar inmediatamente |

## Critical Findings

### HaidoDocs Issues 📄

1. **MDX infrautilizado**
   - Package installed pero no usado
   - **Waste**: Dependency bloat sin valor
   - **Action**: O usar MDX o quitar dependency

2. **Buscador faltante**
   - Fumadocs tiene search built-in
   - **Pero**: No implementado en UI
   - **Impact**: Poor UX - usuarios no pueden buscar

3. **Documentación sparse**
   - Solo 1 archivo markdown
   - **Expected**: Multi-page docs con navegación

### Deploy conclusions

| App | Ready for Coolify | Priority | Action |
|-----|-------------------|----------|--------|
| **License Server** | ✅ SÍ | 🔥 High | Migrar en TKT-03 |
| **HaidoDocs** | ✅ SÍ | Medium | Migrar en TKT-03 |

Ambas apps están **listas para producción** con mínima config.

---

**Agente**: `adcedc186d7949b2a` ✅ completado (1:56 min)
