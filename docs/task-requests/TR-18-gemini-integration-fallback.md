---
type: task-request
id: TR-18
title: gemini-integration-fallback — instalar SDK @2.1.1 + scripts npm + integrar release.ts
status: open
priority: high
zone: cross
ts: 2026-08-22
source: r5-gemini-commit-wizard-npm-publish-sdk-minimo-2026-08-22
targetMilestone: track/gemini-integration
blockedBy: []
effort: small
acceptance:
  - gemini-commit-wizard@2.1.1 instalado en devDependencies (pin exacto, NO ^latest por ahora — dist-tags están polluted: latest=2.1.0, beta=2.1.1)
  - scripts npm agregados al package.json root (NO a scripts/release.ts): commit, commit:quick, commit:manual, commit:auto, commit:dry, version:minor, version:major, version:patch, version:beta, version:sync
  - scripts/release.ts integrado con AutoReleaseManagerAI (~30 líneas, carga + fallback graceful si AI falla — NO replace publish flow, solo ENHANCEMENT opcional)
  - typecheck + build + lint todos EXIT 0
  - bun.lock regenerado, NO introduces new top-level deps fuera de gemini-commit-wizard
outOfScope:
  - Resolver dist-tags npm polluted (latest=2.1.0 vs 2.1.1 registrado como beta) — bloqueado en waxin con OTP
  - Modificar version-manager.ts o commit-ui.ts del repo gemini (proyecto separado)
  - Migrar TODO el flujo de release.ts a AutoReleaseManagerAI (este TR es integración mínima viable + fallback seguro)
---

# TR-18 — gemini-integration-fallback

## Contexto

El package `gemini-commit-wizard@2.1.1` está publicado en npm (registrado como `beta:2.1.1` por bug del `--tag beta` flag). Waxin tiene pendiente arreglar los dist-tags con `npm dist-tag add ...@2.1.1 latest --otp=CODE` (requiere OTP fresco). Mientras tanto, integramos con pin exacto `@2.1.1` para no bloquear la integración SDK.

El SDK expone (verificado en repo `gemini-commit-wizard/src/`):
- `CommitGenerator` (commit message generation con multi-provider: Gemini/Groq/OpenRouter)
- `VersionManager` (gestión de versiones + changelog)
- `AutoReleaseManagerAI` (orquestación AI del release flow)

## Plan (compact)

### Paso 1 — Instalar dep
```bash
bun add -d gemini-commit-wizard@2.1.1
```

### Paso 2 — Agregar scripts npm
Editar `package.json` → `scripts`:

```json
{
  "commit": "bun node_modules/gemini-commit-wizard/src/commit-ui.ts",
  "commit:quick": "bun node_modules/gemini-commit-wizard/src/commit-ui.ts --quick",
  "commit:manual": "bun node_modules/gemini-commit-wizard/src/commit-generator.ts",
  "commit:auto": "bun node_modules/gemini-commit-wizard/src/commit-generator.ts --auto-approve",
  "commit:dry": "bun node_modules/gemini-commit-wizard/src/commit-generator.ts --dry-run",
  "version:minor": "bun node_modules/gemini-commit-wizard/src/version-manager.ts --type minor",
  "version:major": "bun node_modules/gemini-commit-wizard/src/version-manager.ts --type major",
  "version:patch": "bun node_modules/gemini-commit-wizard/src/version-manager.ts --type patch",
  "version:beta": "bun node_modules/gemini-commit-wizard/src/version-manager.ts --prefix beta",
  "version:sync": "bun node_modules/gemini-commit-wizard/src/version-manager.ts --sync"
}
```

**NOTA**: NO usar `"version"` script (es hook npm que sobrescribe package.json). Solo `version:*` con flag explícito.

### Paso 3 — Integrar AutoReleaseManagerAI en scripts/release.ts
Agregar función helper al inicio (~30 líneas):

```typescript
// Integración opcional con AutoReleaseManagerAI para generar release notes
// FALLBACK: si AI falla o no hay API key, usa template default
async function generateAIReleaseNotes(version: string, changes: string): Promise<string> {
  try {
    const { AutoReleaseManagerAI } = await import('gemini-commit-wizard');
    const manager = new AutoReleaseManagerAI({ provider: 'groq' }); // o env-driven
    return await manager.generateNotes({ version, changes });
  } catch (err) {
    log.warn('AI release notes failed, using template', { err });
    return generateTemplateNotes(version, changes); // función existente en release.ts
  }
}
```

Y agregar flag `--ai-notes` al CLI de `release.ts`:
```typescript
.option('--ai-notes', 'Generate release notes via AutoReleaseManagerAI')
```

### Paso 4 — Verificación
```bash
bun run typecheck      # EXIT 0
bun run build          # EXIT 0
bun run lint           # 0 nuevos errores (los 13 residuales son baseline)
bun run commit:dry     # smoke test del SDK integrado
```

### Paso 5 — Smoke test del SDK
```typescript
// quick smoke: en /tmp/_smoke-gemini.mjs
import { CommitGenerator, VersionManager } from 'gemini-commit-wizard';
console.log(typeof CommitGenerator);     // 'function'
console.log(typeof VersionManager);      // 'function'
const vm = new VersionManager({ changelogPath: '/tmp/_smoke-changelog.json' });
console.log(vm.getCurrentVersion());     // '0.1.0' default
```

## Reporte esperado

Persiste a `/tmp/tr18-gemini-integration-<ts>.md` con:
- TL;DR (✓/✗ cada acceptance criterion)
- Diff resumido por archivo
- Output verbatim de `bun run typecheck` + `bun run build` + `bun run lint`
- Smoke test del SDK output
- Stop reason
- Anomalías

## Notas para el executor

- **NO instalar dependencias nuevas** fuera de `gemini-commit-wizard`. Si `bun add` sugiere transitive deps, NO las aceptes sin consultar.
- **NO modificar** `scripts/release.ts` más allá del bloque de integración AI. El flujo OAuth2 (PKCE + client_credentials) sigue mandando.
- **NO commitear** — waxin hace el commit después de verificar.
- **NO push** a remote — prohibido sin OK explícito.
- Persiste reporte a `/tmp/tr18-gemini-integration-<ts>.md` ANTES de retornar (waxin lock 2026-08-18).