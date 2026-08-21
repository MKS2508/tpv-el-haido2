# TR-13 — Unificar tickmaster-core + tickmaster-sdk en un paquete con subpath exports

**Ticket**: nuevo
**Phase**: sin numerar (feeds TR-12 blocker #1 — CI Linux x64/ARM64)
**Priority**: high — bloquea TR-12 (CI verde) y bloquea que cualquier clone limpio de
`tpv-el-haido2` pueda `bun install` (main es hoy unbuildable fuera de la máquina de waxin, que
tiene los symlinks manuales a `/Users/mks/tickmaster/packages/*`)
**Estimated**: 2-3h humano (repo restructure + publish + consumer migration en 2 repos)
**Decisión lockeada**: `docs/decisions/r3-tickmaster-packaging-2026-08-21.md`

## Contexto

`tpv-el-haido2` declara dependencias npm normales que no existen en el registry:

```json
"@mks2508/tickmaster-core": "^0.3.0",
"@mks2508/tickmaster-sdk": "^0.2.0"
```

`npm view @mks2508/tickmaster-core versions` / `...sdk versions` → `E404` para AMBOS nombres
completos (no es una versión faltante, el paquete nunca se publicó). Local funciona solo porque
`node_modules/@mks2508/tickmaster-{core,sdk}` son symlinks manuales a
`/Users/mks/tickmaster/packages/{core,sdk}` (creados 2026-08-20, fuera de cualquier mecanismo
declarado — no `bun link`, no workspace, no entrada en `bun.lock`). CI (`bun install
--frozen-lockfile` en clean runner) falla en 55s con el 404. Ver run `32420104820`.

Repo fuente: `/Users/mks/tickmaster` (local, no confirmado si tiene remoto en GitHub — verificar
al ejecutar). Estructura actual: monorepo Bun workspaces con `packages/core` (`@mks2508/tickmaster-core@0.3.0`,
motor ESC/POS + parsing de papel) y `packages/sdk` (`@mks2508/tickmaster-sdk@0.2.0`, cliente HTTP
vía `@elysiajs/eden` contra un daemon, depende de `core` como dependency externa `^0.3.0`).
Ambos `"main": "./src/index.ts"` — **src-only, sin build/dist step**. Ver
`tickmaster/HANDOFF.md` (2026-08-20) para el resto del roadmap de ese repo — no tocar nada de
lo ahí descrito (TUI, daemon, discovery UDP), es hilo independiente.

## Objetivo

1. **En `tickmaster/`**: fusionar `packages/core` + `packages/sdk` en un único paquete publicable
   `@mks2508/tickmaster` con `exports` map (`./core`, `./sdk`) — ver preview exacto en la
   decisión r3. Decidir (el ejecutor, con criterio, sin bloquearse): ¿mantiene el layout de
   carpetas `packages/core/src` + `packages/sdk/src` con exports apuntando ahí, o aplana a
   `src/core/` + `src/sdk/` bajo un único `src/`? Cualquiera es válido siempre que el resto del
   repo (TUI, daemon, tests, `check:declarations` script) siga resolviendo — grep de imports
   internos antes de mover nada.
2. Publicar `@mks2508/tickmaster@0.1.0` a npm (o la versión que decida el ejecutor — ver "No
   decidido" en r3). Confirmar con `npm view` post-publish que resuelve.
3. **En `tpv-el-haido2`**: bump `package.json` (quitar las 2 deps viejas, añadir
   `@mks2508/tickmaster`), reescribir el único import real (`src/services/thermal-printer.service.ts:8`,
   hoy `from '@mks2508/tickmaster-sdk'` → `from '@mks2508/tickmaster/sdk'`), regenerar
   `bun.lock` (`bun install`, sin `--frozen-lockfile`), confirmar `bun run typecheck` limpio.
4. Borrar los symlinks manuales en `node_modules/@mks2508/tickmaster-{core,sdk}` como parte de
   la limpieza (quedan huérfanos tras el bump, `bun install` los debería reemplazar solo, pero
   confirmar).

## Verificación de cierre

- `npm view @mks2508/tickmaster` (sin sufijo) resuelve con `./core` y `./sdk` en `exports`.
- Clone limpio simulado: `rm -rf node_modules && bun install --frozen-lockfile` en
  `tpv-el-haido2` termina en verde (sin 404, sin drift de lock).
- `bun run typecheck` verde en `tpv-el-haido2`.
- Re-run del workflow `linux-x64-deploy.yml`/`linux-arm64-deploy.yml` en GitHub Actions pasa el
  step de install (llega más lejos que hoy — puede que siga fallando en blocker #2, ver TR-12).
- En `tickmaster/`: `bun run typecheck` + `bun test` de los workspaces afectados siguen verdes
  (153 tests reportados en el HANDOFF antes del merge — confirmar que no regresionan).

## Constraints

- NO tocar nada del roadmap propio de `tickmaster/` (TUI redesign, hostname/MagicDNS, discovery
  UDP F5) — ese repo tiene su propio HANDOFF.md, fuera de scope aquí.
- NO decidir la versión publicada por tu cuenta si hay ambigüedad real (0.1.0 fresh vs heredar
  0.3.0 de core) — proponer en el plan, no ejecutar a ciegas.
- El GH Secret `TAURI_SIGNING_PRIVATE_KEY` malformado (blocker #2 de TR-12, ver r3) es
  independiente y NO se toca en este TR — acción directa de waxin (tiene la key real).

## Suggested executor agent

`task-decomposer` primero (toca 2 repos, vale la pena un `.plan.md` aunque sea corto) →
`task-executor` o sibling si el decomposer confirma que el restructure de `tickmaster/` es
mecánico.

## Notas operativas

- Cross-repo: el executor necesita cwd en `/Users/mks/tickmaster` para la parte 1-2, y en
  `tpv-el-haido2` para la parte 3-4. Si se dispatchea como sibling, dos worktrees separados (uno
  por repo) o un executor con acceso a ambos paths absolutos.
- Doc sync (roadmap.spec.yml + progress-log) se difiere — axon lo hace después en un solo pase,
  igual que TR-07/08/09.
