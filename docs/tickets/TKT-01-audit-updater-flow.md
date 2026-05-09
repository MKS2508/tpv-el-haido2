# TKT-01 - Audit Existing Auto-updater Implementation

> **⚠️ SUPERSEDED por r1 (2026-05-09)** — replaced by [TKT-08](./TKT-08-update-tauri-conf.md).
>
> Este ticket asumía mantener el endpoint GitHub. R1 D1 lockeó "sin GitHub" → endpoint cambia a `updates.mks2508.systems` (servido por tpv-cloud TKT-07).
>
> El "audit" ya se hizo en r1 prep (sesión anterior). Findings:
> - `useUpdater.ts` real, no stub
> - Endpoint actual GitHub (a reemplazar por TKT-08)
> - Minisign pubkey configurada
> - Bundle config OK (`createUpdaterArtifacts: true`)
>
> **Acción**: NO ejecutar este ticket, ir directo a TKT-08.

**Milestone**: 0.4.0.A
**Priority**: 🔥 CRITICAL
**Status**: 🚫 superseded (by TKT-08)
**Created**: 2026-05-09
**Superseded**: 2026-05-09 (r1)
**Assigned**: -
**Estimated**: 2-3h (NO LONGER NEEDED)

## Context

El TPV se desplegará en una máquina Windows con acceso limitado en el bar del hermano de waxin. Necesitamos un sistema de actualización fiable que permita updates remotos sin acceso físico.

CLAUDE.md claims:
- Plugin instalado: `@tauri-apps/plugin-updater` v2.9.0
- Endpoint: `https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/latest.json`
- Configurado en tauri.conf.json

**PEO**: No confiamos en claims - hay que auditar el código real y verificar que funciona end-to-end.

## Scope

### IN scope
- ✅ Leer código real de `@tauri-apps/plugin-updater` usage
- ✅ Verificar endpoint URL en `tauri.conf.json` + `v2/` prefix check
- ✅ Revisar `useUpdater.ts` hook - ¿implementación real o stub?
- ✅ Verificar minisign key configuration
- ✅ Test manual del flow: check → download → install → restart
- ✅ Documentar pasos para publicar release en GitHub

### OUT of scope
- ❌ Modificar el updater (si está roto, crear TKT-01.1)
- ❌ Configurar CI/CD para releases automáticos
- ❌ Code signing de binarios (deferred to 0.3.0)

## Dependencies

- None (puede empezar inmediatamente)

## Acceptance Criteria

- [ ] **Código auditado**: `useUpdater.ts` leído y entendido
- [ ] **Endpoint verificado**: URL correcta en tauri.conf.json
- [ ] **Minisign key**: Configurada y documentada
- [ ] **Flow testeado**: Check update → download → install → restart funciona en dev
- [ ] **Documentado**: Pasos para publicar release escritos en `/docs/deployment/releases.md`
- [ ] **Issue tracking**: Si algo no funciona, reportado en findings

## Technical Notes

**Qué verificar**:
1. `/src/hooks/useUpdater.ts` - ¿usa `check()`, `download()`, `install()`?
2. `src-tauri/tauri.conf.json` - buscar `updater` section
3. `/public/` o `/releases/` - ¿existe `latest.json` template?
4. `package.json` - ¿`@tauri-apps/plugin-updater` instalado?

**Comandos útiles**:
```bash
# Verificar endpoint
grep -r "github.com/MKS2508" src-tauri/ --include="*.json" --include="*.rs"

# Verificar uso del plugin
grep -r "check.*update\|downloadUpdate\|installUpdate" src/ --include="*.ts" --include="*.tsx"

# Test manual
bun run tauri dev  # Probar updater en dev mode
```

**Riesgos conocidos**:
- Endpoint puede necesitar `/v2/` prefix (Tauri 2 vs Tauri 1)
- Minisign key puede no estar configurada
- `useUpdater.ts` puede ser un stub que no hace nada

## Sub-tasks

- [ ] 1. Leer `useUpdater.ts` completo
- [ ] 2. Leer `tauri.conf.json` updater section
- [ ] 3. Verificar plugin instalado en package.json
- [ ] 4. Test manual: abrir DevTools, llamar `checkUpdate()`, ver logs
- [ ] 5. Documentar pasos para release
- [ ] 6. Crear `/docs/deployment/releases.md` con guía

## Blocked by

- None

## Blocks

- TKT-02 (Coolify migration) - necesitas saber cómo funcionan los releases
- TKT-03 (Windows production setup) - necesitas updater funcionando

## Findings

*(Post-execución: llenar con discoveries reales)*

- [ ] ¿El updater está implementado o es un stub?
- [ ] ¿Endpoint URL es correcta?
- [ ] ¿Hay algún error en los logs cuando se llama `checkUpdate()`?
- [ ] ¿Se descarga el update correctamente?
- [ ] ¿Se instala y restart la app?

## References

- Tauri updater docs: https://v2.tauri.app/plugin/updater/
- Existing plan: `/todo-plans/pwa-architecture-plan.json` (puede tener contexto)
