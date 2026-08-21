# r3 — Tickmaster npm packaging (unify → subpath exports)

**Fecha lock**: 2026-08-21
**Lockeado por**: AskUserQuestion + preview, 1 ronda (3 opciones), confirmación explícita de waxin
in-chat ("hay que unificar los exports, habíamos quedado" — decisión previa nunca escrita, ahora
lockeada formalmente).
**Contexto de bloqueo**: TR-12 (rebuild CI pipelines Linux x64/ARM64) — blocker #1 de 2.

---

## Contexto

`tpv-el-haido2` depende de dos paquetes hoy no publicados a npm:

```json
"@mks2508/tickmaster-core": "^0.3.0",
"@mks2508/tickmaster-sdk": "^0.2.0"
```

Local funciona vía symlink manual (`node_modules/@mks2508/tickmaster-{core,sdk}` →
`/Users/mks/tickmaster/packages/{core,sdk}`, creados 2026-08-20 17:50) — no vía npm, no vía
workspace declarado. `bun.lock` no tiene entradas tickmaster (nunca se regeneró tras el merge de
TR-08). CI (clean `bun install --frozen-lockfile`) falla en 55s: `404 Not Found` para ambos
nombres de paquete completos — no es una versión ausente, el paquete entero nunca se publicó.

Verificado (`npm view @mks2508/tickmaster-core versions` / `...sdk versions`): E404 en ambos,
2026-08-21. Root cause de por qué no está publicado — confirmado por waxin en este turno: falta
la unificación de exports acordada verbalmente en sesión previa (nunca quedó escrita — ni en
`docs/decisions/`, ni en `tickmaster/HANDOFF.md`, ni en ningún TR).

## Decisión lockeada

**Unificar `tickmaster-core` + `tickmaster-sdk` en un único paquete `@mks2508/tickmaster` con
subpath exports**, en vez de publicar los 2 paquetes tal cual o saltarse npm con git-dependency.

```jsonc
// tickmaster/package.json (repo raíz, tras merge de los 2 packages)
{
  "name": "@mks2508/tickmaster",
  "version": "0.1.0",
  "exports": {
    "./core": "./packages/core/src/index.ts",
    "./sdk": "./packages/sdk/src/index.ts"
  }
}
```

```jsonc
// tpv-el-haido2/package.json (tras el cambio)
{ "@mks2508/tickmaster": "^0.1.0" }
```

```ts
// imports en tpv-el-haido2 (cambian desde @mks2508/tickmaster-core / -sdk)
import { ... } from '@mks2508/tickmaster/core'
import { ... } from '@mks2508/tickmaster/sdk'
```

**Rationale**: matchea el plan ya acordado por waxin (no relitigar). Un solo ciclo de release
para ambos paquetes (hoy `sdk` depende de `core` con el mismo versionado acoplado igualmente).
Menos overhead de publish/CI que 2 paquetes separados.

**Trade-off aceptado**: la unificación es trabajo real antes de poder publicar — no es
"solo publish". Alcance: merge de 2 `package.json` en 1 con `exports` map, mover/ajustar los
`src/` de cada paquete bajo el nuevo layout, actualizar internal imports de `sdk` que hoy
apuntan a `@mks2508/tickmaster-core` como dependency externa (pasan a ser relativos o
self-referencing vía el propio export map), publish a npm, y en `tpv-el-haido2`: bump de
dependency + rewrite de imports en los ficheros tocados por TR-08 (`thermal-printer.service.ts`,
`ThermalPrinter.ts` model, `TauriPlatformService.ts`, `SettingsPanel.tsx`, etc — grep
`tickmaster-(core|sdk)` da la lista exacta) + regenerar `bun.lock`.

**No decidido en esta ronda** (fuera de scope, no bloquea el lock): naming del entrypoint SDK vs
core (¿el paquete raíz reexporta algo en `.`, o exports es solo `./core`+`./sdk` sin root?);
versión inicial publicada (¿0.1.0 fresh, o mantener 0.3.0 heredado de core como base?). Ambos
quedan para quien ejecute TR-13.

## Blocker #2 de TR-12 (no relacionado, documentado aparte)

`linuxdeploy` falla en el bundling AppImage tras pasar el install (run `32417966021`, ~11min in):
`failed to decode secret key: ... Invalid symbol 32, offset 9` — el GitHub Secret
`TAURI_SIGNING_PRIVATE_KEY` tiene un espacio embebido (símbolo ASCII 32) rompiendo el base64.
Acción de waxin (tiene el valor real de la key, anti-leak rule aplica): resetear el secret limpio
vía `gh secret set TAURI_SIGNING_PRIVATE_KEY` con el valor sin espacios/newlines extra, re-run.

## Siguiente

`TR-13-tickmaster-packaging-unification.md` (nuevo, este mismo turno) — scope del merge +
publish + consumer-side migration. Depende de: nada (repo tickmaster es independiente).
Bloquea: TR-12 blocker #1.
