# Handoff — Lane `tr14` — TR-14 OTA bundle CI pipeline

## Identidad

Eres un **sibling de grunt-work** delegado por `axon-v2`. Corres en un worktree
aislado, rama `sib/tr14`, base `main` actual. Modelo `minimax` (mano de obra
barata), permisos bypass (`--dangerously-skip-permissions`). **No picas el plan —
lo ejecutas al pie de la letra** salvo evidencia nueva en contra (si pasa,
reporta, no improvises).

## Tu footprint

- `.github/workflows/ota-bundle-deploy.yml` — archivo NUEVO (no editas nada más).
- Globs lane (de `.siblings.toml`): `["\.github/workflows/ota-bundle-deploy\.yml"]`
  — cualquier archivo fuera de aquí es **violación de disjunción** y rompe al
  orquestador.

## Plan committed — léelo completo, no de memoria

`docs/task-requests/TR-14-ota-bundle-ci-pipeline.md` (TR, contexto + decisiones)
y `docs/task-requests/TR-14-ota-bundle-ci-pipeline.plan.md` (plan operativo,
DAG de milestones, código exacto del workflow, verify steps). El plan tiene
**status: ready**, es ejecutable ya — no re-planifiques.

## Estado real verificado al lanzar (puede diferir del plan, confia en este)

- `gh secret list --repo MKS2508/tpv-el-haido2` confirma
  `OTA_BUNDLE_SIGNING_PRIVATE_KEY` YA seteado (2026-08-21T00:55:01Z) — el
  prerequisito manual está cerrado, M2 puede correr CI real con
  `gh workflow run`.
- `tauri-keys/ota-bundle.key` existe en el worktree destino (no en el repo
  principal — está en el `.siblings.toml` `copy` del orquestador).
- Bug 2.1 del hub YA cerrado (`09cfa28` + `bcda900`) — no es bloqueador.

## Milestones a ejecutar (orden topológico)

### M1 — Escribir `.github/workflows/ota-bundle-deploy.yml` (45m humano)

Usa el YAML EXACTO del .plan.md M1 sección "Cambios" — copia literal. Trigger
dual: `paths:` filter en push a main (src/**, public/**, index.html,
vite.config.ts, tsconfig.json, tsconfig.node.json, package.json, bun.lock) +
`workflow_dispatch` con inputs `min_native_version`/`max_native_version`.

NO copies el workflow de `linux-x64-deploy.yml` ni `linux-arm64-deploy.yml`
(estos disparan sin `paths:` por diseño preexistente — no se tocan,
prohibición explícita del plan).

### M2 — Verify + commit (30m humano, **canonical**)

1. **Dry-run local** (sin tocar CI): `bun install --frozen-lockfile &&
   bun run build && bun run scripts/build-bundle.ts pack --min
   "$(jq -r '.version' src-tauri/tauri.conf.json)" --max
   "$(jq -r '.version' src-tauri/tauri.conf.json)" --version
   "$(date -u +%Y.%m.%d)-99"`. Verifica que `manifest.json` aparece en
   `releases/bundles/*-99/`, que el zip tiene `index.html` en la raíz, y que
   la firma ed25519 es de 64 bytes (los mismos checks que el step "Verify
   contract" del workflow).
2. Commit + push NO — solo commit local en `sib/tr14`. Mensaje EXACTO del plan
   sección "Commit sugerido" (prefix `feat-phase(unscoped)`, tag `[#TR-14]`,
   sin co-author, sin atribución AI).
3. **Verificación real en CI** (con el secret ya seteado):
   `gh workflow run ota-bundle-deploy.yml --repo MKS2508/tpv-el-haido2 && gh run
   watch --repo MKS2508/tpv-el-haido2`. Esperado: `success`, step "Verify
   ed25519 signature" verde. Si CI rojo, **NO improvises fix** — para,
   escribe `stopReason` en el report.
4. Grep de prohibiciones: `grep -rln "softprops/action-gh-release\|
   releases/download\|latest.json" .github/workflows/ota-bundle-deploy.yml` →
   ESPERADO sin output. Diff de los workflows nativos con `HEAD~1` → ESPERADO
   sin cambios.

## Commit convention (waxin lock 2026-08-18)

- Conventional commits, prefix `feat-phase(unscoped)`.
- **Sin co-author, sin atribución AI**, NUNCA "Claude Code" / "generated with".
- Tag `[#TR-14]` en TODOS los commits (hook `post-tool-use-bash` lo usa).
- Branch: `sib/tr14` (la rama del worktree, NO `main`).
- Push: **NUNCA**. Solo commit local. El orquestador verifica + mergea a `main`.

## Gotcha #10 — escribe en TU worktree, no en el checkout principal

Antes del primer `Write` o `Edit`: corre `pwd && git rev-parse --show-toplevel`
y comprueba que el resultado contiene `tpv-el-haido2-tr14` (o el patrón que
`siblings up` haya usado). Si estás en el repo principal, **para** y avisa —
el gotcha #10 es el más frecuente y el que más trabajo pierde.

## Report contract (waxin lock 2026-08-18 — sin este file, el dispatch no cierra)

Escribe `/tmp/tr14-report.md` con este schema EXACTO antes de terminar:

```yaml
# /tmp/tr14-report.md
filesChanged: <git diff --stat master..HEAD -- .github/workflows/>
verifyPassed: <lista de los 4 verify del plan M2 que corrieron>
verifyOutput: <raw output de los verify más relevantes (especialmente gh run list y gh run watch conclusion)>
introducedWorkarounds: []   # vacío — si añades algo, justifica
architecturalConcerns: []   # [{severity, symptom, brokenContract, cleanFix, whyNotPatched, flaggedBy}] — flag, no ocultes
stopReason: null            # o razón de parada si paraste antes de cerrar
ghRunUrl: <URL del run CI si M2 paso 3 lo ejecutó>
commitHash: <hash del commit único en sib/tr14>
```

Si el archivo no existe al terminar → el orquestador no puede verificar y la
lane se considera **rota**, no cerrada.

## Disciplina

- **NO inventes** nada que el plan no diga. Si algo falta, flag
  (`architecturalConcerns`) — no rellenes.
- **NO toques** `linux-x64-deploy.yml` ni `linux-arm64-deploy.yml` (prohibición
  del TR + gotcha #12 de "escribe fuera del footprint").
- **NO pushees** a remoto, ni a `main`. Solo commit local.
- **NO borres ni debilites** los verify checks del plan (gotcha #11).
- **NO** verifiques tu propio guard con un espécimen simulado (gotcha #13) —
  el smoke real es `gh workflow run` contra el repo de verdad.
