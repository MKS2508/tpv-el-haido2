# r5 — gemini-commit-wizard: npm publish + SDK mínimo en release.ts

**Fecha lock**: 2026-08-22
**Lockeado por**: AskUserQuestion + preview, 1 ronda (4 opciones en install mode + 4 en
SDK unification, recomendación marcada `(Recommended)` en ambas — waxin eligió **d** en install
mode y **a** en SDK unification con preview concreto de cada uno).
**Contexto de bloqueo**: waxin pidió mejorar changelog/releases via gemini-commit-wizard
(integración ya referenciada en `.claude/axon.config.json:51` bajo `commitConvention.tool` pero
**nunca instalada** en `package.json`). Adicionalmente pidió verificar si gemini ofrece SDK y
unificar con `scripts/release.ts` (release CLI actual ya cubre los 2 modos PKCE + client_credentials
verificados, ver `r4` y commit `dfbfee8`).

---

## Contexto

**Estado verificado de gemini-commit-wizard (2026-08-22):**

- Repo local en `/Volumes/KODAK1TB/REPOS y PROYECTOS/nodejs/gemini-commit-wizard`
- `package.json` v2.1.0, **no publicado en npm** (solo `repository: github.com/MKS2508/...`, sin
  `publishConfig`)
- Single package, exports SDK (`.` → `src/index.ts`) + CLI (`./cli` → `src/commit-ui.ts`)
- Engines requiere `bun >=1.0.0` + `node >=18.0.0`
- Deps pesadas: `@google/genai`, `@openrouter/sdk`, `groq-sdk`, `octokit`, `simple-git`,
  `@anthropic-ai/claude-code`, `@mks2508/better-logger@0.18.2-alpha.1`
- En `tpv-el-haido2`: **solo referenciado** en `.claude/axon.config.json:51` como
  `commitConvention.tool`, NO en `package.json`/deps/lockfile

**Surface del SDK evaluada (relevante para este repo):**

| Export | Aplica? | Razón |
|---|---|---|
| `CommitGenerator`, `loadProjectConfig` | ✅ sí | Conventional commits con `<technical>`+`<changelog>`, tag `[#TR-NN]`, multi-provider AI |
| `VersionManager` | ✅ sí | Semver + prereleases (alpha/beta) + sync entre paquetes |
| `AutoReleaseManagerAI` | ✅ sí | Genera release notes AI-powered desde changelog — encaja en `release.ts` antes del POST al Hub |
| `createProvider`, `listProviders`, `GeminiSdkProvider`/etc. | ⚠️ parcial | Solo útil si release.ts quiere generar `--notes` con AI; no para auth OAuth2 |
| `GitHubReleaseManager` | ❌ no | Solo habla con `gh` CLI para GitHub Releases. Nuestro target es `desktop-release-hub` (Pocket ID OAuth2), no GitHub Releases |
| `GitClient`, `git-utils` | ❌ no | Bun shell ya provee `simple-git` si hace falta |

**`scripts/release.ts` confirmado para los 2 tipos de publish** (pregunta factual del usuario):

- PKCE loopback (humano): `scripts/release.ts` líneas 8, 26, 57-65, 165-169, 262-415
- `client_credentials` (CI/headless): líneas 23, 26-28, 177-179, 502-543
- Verificado por grep contra `git log -p scripts/release.ts` desde `dfbfee8` (release CLI docs) y
  `949981a` (TR-15 cierre)

---

## Decisión lockeada

### Install mode: publicar a npm como `@mks2508/gemini-commit-wizard` + dep normal

Opción elegida de las 4 presentadas con preview (`file:`, `link:`, `git+ssh`, npm publish):

- **Trade-off `file:`/`link:`**: portable local pero **rompe en CI** (path relativo no resuelve).
- **Trade-off `git+ssh`**: portable + CI-friendly pero requiere SSH key + pin por tag. Asume que el
  repo gemini es público/privado accesible desde CI, y agrega ping-pong entre 2 PRs si se edita
  gemini y tpv en paralelo.
- **Trade-off `npm publish` (esta)**: portable + CI-friendly + versionado semver + **reusable entre
  proyectos** (no solo tpv-haido). Costo: 1 publish step extra ahora (`npm login` + `npm publish
  --access public` desde el repo gemini) y bumpear a `2.1.1`.

Se publica con `--access public --tag beta` primero para validar el flujo de publish desde
fuera; waxin decide después si bumpear a `stable`. Una vez publicada, en `tpv-el-haido2`:

```json
// package.json
{
  "devDependencies": {
    "gemini-commit-wizard": "^2.1.1"
  },
  "scripts": {
    "commit": "bun node_modules/gemini-commit-wizard/src/commit-ui.ts",
    "commit:quick": "bun node_modules/gemini-commit-wizard/src/commit-ui.ts --quick",
    "commit:dry": "bun node_modules/gemini-commit-wizard/src/commit-generator.ts --dry-run",
    "version:minor": "bun node_modules/gemini-commit-wizard/src/version-manager.ts --type minor",
    "version:patch": "bun node_modules/gemini-commit-wizard/src/version-manager.ts --type patch"
  }
}
```

### SDK unification: MÍNIMO — solo `AutoReleaseManagerAI` en release.ts

Opción elegida de las 4 (mínimo/medio/profundo/defer):

- **Mínimo (esta)**: `CommitGenerator` para `git commit` (script npm `commit` arriba),
  `VersionManager` para semver (scripts `version:minor`/`version:patch` arriba),
  `AutoReleaseManagerAI` en `scripts/release.ts` para generar `--notes` AI-powered **solo cuando
  `--notes` no se pasa y `GEMINI_API_KEY` existe**. Blast radius: ~30 líneas en release.ts + 2-5
  scripts npm. Flujo PKCE/client_credentials **NO cambia**.
- **Medio/Profundo**: descartados. `createProvider` está diseñado para AI text-in/text-out, no
  para OAuth2 con code+PKCE — forzarlo sería apologia code smell. `GitHubReleaseManager` solo
  habla con `gh` CLI, NO con Pocket ID/desktop-release-hub.

Cambio concreto esperado en `scripts/release.ts` (esquema):

```typescript
// Antes del POST al Hub (~línea 380-420 según impl actual):
if (opts.notes) {
  payload.notes = opts.notes;
} else if (process.env.GEMINI_API_KEY) {
  // NUEVO: AI-generated release notes via gemini-commit-wizard SDK
  const { AutoReleaseManagerAI } = await import('gemini-commit-wizard');
  const ai = new AutoReleaseManagerAI({ provider: 'gemini-sdk' });
  payload.notes = await ai.generate(opts.version);   // contract exacto se confirma en lane de impl
}
// Resto del flujo (PKCE / client_credentials) NO cambia.
```

Sub-track `track/gemini-integration` cubre ambos pasos (publish + integración).

---

## Consecuencias

- **Positivas**: better changelog/release notes con AI, commits conventional enforced, version
  management unificado. Waxin puede usar `bun run commit` en cualquier sesión sin memorizar el
  flag. Multi-provider (Gemini/Groq/OpenRouter) permite failover si un rate-limita.
- **Negativas / riesgos**:
  - `gemini-commit-wizard` se hace público al publicar a npm. Si contiene código/secretos que
    waxin prefiere mantener privados, hay que sanitizar antes del publish (revisar src/).
  - Dep pesa (~30 MB con todas las AI SDKs). Aceptable en devDependencies, no llega a bundle.
  - Riesgo de version drift: bumpear gemini a 2.2.x puede romper la integración. Mitigación:
    pin `^2.1.1` (caret) en tpv-haido y tests de smoke en el lane de integración.
- **Defer (explícito)**: medium/profundo SDK unification queda cerrado por esta decisión. Si más
  adelante se quiere reemplazar el auth flow de release.ts con algo del SDK, abrir sub-TR separado
  con tiempo para diseñar bien — `createProvider` no es OAuth2.

## Referencias

- `.claude/axon.config.json:51` — referencia previa (aún no instalada)
- `r4-auth-ci-hub-client-credentials-2026-08-21.md` — release CLI con 2 modos PKCE + client_credentials
- `scripts/release.ts` líneas 8, 26, 57-65, 165-169, 502-543 — auth flow ya operativo
- `track/gemini-integration` (nuevo, queued) — el TR/track que ejecuta esta decisión
