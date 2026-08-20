# TR-11 — Migrar a `@mks2508/better-logger@0.18.3` + wire OTel (supersede TKT-05)

**Ticket**: supersede [TKT-05](../tickets/TKT-05-migrate-logging.md) (scope ampliado: no solo
console.log de 2 archivos, migración de versión + OTel)
**Phase**: sin numerar todavía (candidato 0.6.0 "production polish" u `unscoped`, decidir post
ejecución — mismo criterio que TR-07)
**Priority**: medium (calidad/observabilidad, no bloquea producción esta noche)
**Estimated**: 3-4h humano (migración de API + audit de 77 console.* + OTLP wiring)

## Contexto — por qué esto NO es solo "bump de versión"

`package.json:59` tiene `"@mks2508/better-logger": "^5.0.2"`. Verificado con `npm view
@mks2508/better-logger versions/dist-tags`: existen versiones `1.0.0` hasta `5.0.2` publicadas,
pero **`dist-tags.latest` es `0.18.3`** — el paquete tuvo un reset de versión real (confirmado
también por la skill `better-logger-usage`: "0.18.x is a full reset... pre-0.18 had a different
API"). Un caret `^5.0.2` NUNCA resuelve a `0.18.3` (semver lo ve como más viejo) — **hace falta
pin exacto `"0.18.3"`**, no rango.

**Usar la skill `better-logger-usage`** (`~/dotfiles/skills/better-logger-usage/SKILL.md`) como
referencia de arquitectura, PERO fetchear la doc viva antes de escribir código — la skill
misma lo indica: `https://mks2508.github.io/advanced-logger/docs/llms.txt` primero (índice),
después los `.md` puntuales (`/docs/transports.md`, `/docs/migration-v0.18.md`,
`/docs/context.md`, `/docs/hooks.md`) para la sintaxis exacta. No asumir de memoria — la 0.18.x
introduce **subpath exports** (`@mks2508/better-logger/transports`,
`@mks2508/better-logger/hooks`, `@mks2508/better-logger/context`, etc.) que reemplazan los
named exports actuales del top-level.

## Estado actual del proyecto (verificado hoy)

- `src/lib/logger.ts` — loggers por componente ya existen (`auditLog`, `storeLog`,
  `storageLog`, `printerLog`, `aeatLog`, `authLog` vía `logger.component(...)`) + helper
  `logResultError()`. Este archivo probablemente sobrevive casi intacto (el patrón
  `component()` sigue existiendo en 0.18.x según la skill), pero verificar contra la doc viva.
- `src/lib/logger-init.ts` — configura `ConsoleTransport`/`FileTransport`/`HttpTransport` desde
  env vars `VITE_LOG_*`. Esto SÍ necesita revisión — en 0.18.x estos transports se importan
  desde el subpath `/transports`, no del top-level (confirmar contra doc viva si el top-level
  los sigue re-exportando o no). El commit `27b8e05` (sesión de esta madrugada) ya tuvo que
  castear `TransportTarget` por un problema de inferencia tsgo — señal de fricción de tipos
  con la API actual, puede desaparecer o cambiar de forma con 0.18.3.
- **Cero uso de `OtlpTransport`** — confirmado por grep, no existe en el proyecto. Es 100%
  trabajo nuevo. No hay endpoint OTel/SigNoz conocido para este proyecto — el plan debe dejarlo
  **configurable por env var** (`VITE_LOG_OTLP_URL` o similar, siguiendo el patrón ya
  establecido de `VITE_LOG_HTTP_URL`), sin hardcodear ningún endpoint real ni asumir que hay un
  collector corriendo — si no hay endpoint configurado, el transport simplemente no se registra
  (mismo patrón condicional que ya usa `HttpTransport` hoy en `logger-init.ts`).
- **77 `console.*` sueltos en 16 archivos** de `src/` (grep `console\.\(log\|error\|warn\|debug\|info\)`).
  Lista exacta de archivos a obtener por el decomposer (no la relevo acá para no desincronizar
  si algo cambia entre este TR y la ejecución).
- `apps/` (tpv-cloud + haidodocs) tiene ~280 `console.*` — **fuera de scope de este TR**, escala
  mucho mayor, dos sub-proyectos distintos con su propio logger setup posible. Si el decomposer
  lo ve trivial extender, que lo proponga, pero no es el foco.

## Objetivo

1. Pin `@mks2508/better-logger` a `"0.18.3"` exacto (no caret) en `package.json`.
2. Migrar `logger-init.ts`/`logger.ts` a la API 0.18.x real (subpath imports donde aplique,
   verificado contra doc viva, no supuesto).
3. Wire `OtlpTransport`, condicional a env var (ver arriba), sin backend real requerido para
   que el proyecto siga funcionando sin él configurado.
4. Auditar y migrar los 77 `console.*` de `src/` a loggers estructurados (reusar los
   `component()` loggers ya existentes en `logger.ts` donde el módulo ya tiene uno; crear
   nuevos `component()` scopes puntuales donde no exista uno obvio — no crear un logger nuevo
   por archivo si varios archivos son del mismo dominio, seguir el patrón ya establecido).
5. Checklist de auditoría de la skill como criterio de cierre (ver Acceptance).

## Constraints

- **NO tocar `apps/tpv-cloud/` ni `apps/haidodocs/`** — fuera de scope, son sub-proyectos
  aparte con sus propios `package.json`/loggers.
- **NO tocar archivos que TR-08 esté reescribiendo si sigue sin commitear al momento de
  ejecutar esto** (`src/services/thermal-printer.service.ts`, `src/models/ThermalPrinter.ts`)
  — revisar `git status`/`git diff` antes de empezar. Esos 2 archivos YA quedan sin
  `console.*` en la reescritura de TR-08 (confirmado en su plan), así que probablemente no
  necesitan nada de este TR una vez TR-08 cierre — si para cuando esto se ejecuta TR-08 ya
  commiteó, simplemente confirmar que siguen limpios (grep), no re-tocarlos.
- **NO inventar un endpoint OTLP real** — configurable, deshabilitado por defecto si no hay
  env var, ver Contexto.
- Mantener el patrón `component()`/`scope()` ya establecido en `logger.ts` — no introducir un
  segundo mecanismo paralelo de scoping.
- Seguir la regla del proyecto (CLAUDE.md global, REGLA 2 citada en el propio TKT-05): NUNCA
  `console.log` en código nuevo.

## Acceptance

Basado en el "Audit checklist" de la skill `better-logger-usage`, aplicado a `src/` (no `apps/`):
- [ ] `package.json` tiene `"@mks2508/better-logger": "0.18.3"` exacto
- [ ] `bun install` limpio, sin errores de resolución
- [ ] 0 `console.*` en `src/**` (excepto si algún archivo es genuinamente CLI/playground, no
  debería haber ninguno en este proyecto — confirmar)
- [ ] Logger/scoped loggers usados consistentemente (patrón `component()` existente)
- [ ] Al menos un transport async configurado condicionalmente (Http u OTLP) además de Console
- [ ] `OtlpTransport` wireado, condicional a env var, proyecto sigue arrancando sin ella
- [ ] `flushTransports`/cleanup wireado en shutdown si el proyecto tiene un hook de cierre
  (Tauri `onCloseRequested` o similar — investigar si existe, no inventar uno si no hay patrón)
- [ ] `bun run typecheck && bun run lint:fix && bun run build` los 3 verdes (protocolo
  obligatorio CLAUDE.md)
- [ ] Smoke: `bun run tauri dev` bootea, logs aparecen en consola con el estilo esperado

## Suggested executor agent

`task-decomposer` primero — el scope real (qué API exacta trae 0.18.3, subpath imports, si
`logger.ts`/`logger-init.ts` sobreviven o se reescriben) depende de leer la doc viva, no se
puede escribir un diff exacto sin eso. Luego `task-executor`, posiblemente en 2 milestones
(migración de versión+init primero, audit de los 77 console.* después — son independientes
una vez el logger base está migrado).

## Notas operativas

- Corre en paralelo a TR-07 (bloqueado en BW), TR-08 (bloqueado en Pi/npm/token) y TR-10
  (tests, recién decompuesto) — revisar overlap de archivos con TR-10 si ese ya está tocando
  `src/lib/logger.ts` o similar (poco probable, pero confirmar `git status` antes de empezar).
- Doc sync (roadmap.spec.yml + progress-log + cierre de TKT-05 como superseded) se difiere,
  mismo patrón que el resto de TRs de esta sesión.
