# TR-10 — Test coverage baseline (0.7.0, TKT-06)

**Ticket**: [TKT-06](../tickets/TKT-06-add-test-coverage.md)
**Phase**: 0.7.0 (roadmap.spec.yml, status `queued`, low priority — pero sin blockers, se puede
adelantar mientras TR-07/TR-08 esperan por waxin)
**Priority**: medium (calidad, no bloquea producción)
**Estimated**: 8-12h humano (ticket original) → decompone en milestones, no hace falta cerrarlo
entero en un pase

## Contexto

Confirmado hoy por grep: **0 archivos de test en todo `src/`** (`*.test.ts`, `*.test.tsx`,
`*.spec.ts` → cero resultados). El ticket TKT-06 ya trae scope + sub-tasks detallados, usalo
como base pero con dos ajustes respecto al ticket original:

1. **NO está bloqueado por TKT-01..04** como decía el ticket (esos ya están done/superseded,
   confirmado en roadmap.spec.yml — 0.4.0.A/B/C done o en curso, 0.4.0.D/E superseded). Sin
   blocker real hoy.
2. **CI (GitHub Actions)** — el ticket original lo incluye como sub-task. Este proyecto tiene
   una decisión lockeada (r1, D1): "Sin GitHub: distribución 100% via Coolify, no GitHub
   Releases ni Actions". Esa decisión es sobre DISTRIBUCIÓN de releases, no sobre CI de tests —
   pero decidí no asumir la lectura. **El decomposer debe flaggear esto explícitamente en el
   plan como pregunta abierta** (¿un workflow de GH Actions que solo corre `bun test` en push,
   sin tocar releases/publish, viola el espíritu de D1 o no?) en vez de simplemente incluirlo o
   excluirlo sin más. Si genera dudas, dejarlo como milestone separado/opcional, no bloquear el
   resto del plan por esto.

## Objetivo (ajustado de scope, pragmático)

Bajar de "8-12h todo junto" a milestones incrementales, priorizando lo que más protege contra
regresiones reales dado el resto de trabajo en curso esta noche (TR-07 build multi-target,
TR-08 reescribió servicios enteros):

1. Setup Vitest (verificar/configurar, `bun run test` funciona sin tests)
2. Tests de `store.ts` — acciones core (`addToOrder`, `removeFromOrder`, table management,
   order completion) — es el módulo más central y más tocado históricamente
3. Tests de storage adapters — al menos `sqlite-storage-adapter.ts` (CRUD) e
   `indexeddb-storage-adapter.ts`, mockeando lo necesario
4. Tests de modelos/utils puros sin side-effects (buenos candidatos para coverage barato y
   alto valor: cualquier función de cálculo — impuestos, totales, `orderToTicket` si TR-08 ya
   cerró para entonces)
5. Coverage report configurado (`bun run test:coverage`), apuntar a **20% mínimo** (criterio
   del ticket original, no inventar uno más ambicioso)
6. Doc corta `/docs/development/testing.md` (patterns usados, cómo correr)
7. CI — ver nota de arriba, milestone separado/opcional

## Constraints

- NO tests E2E (Playwright) — fuera de scope, ya lo decía el ticket original
- NO perseguir 100% coverage — 20% es la meta, parar ahí
- NO tocar código de producción para "hacerlo testeable" de forma intrusiva — si algo es
  genuinamente difícil de testear sin refactor, documentarlo como gap y seguir con lo demás,
  no forzar un refactor no pedido (regla de la casa: cambios quirúrgicos)
- Evitar testear código que TR-08 está reescribiendo en paralelo esta misma noche
  (`thermal-printer.service.ts`, `ThermalPrinter.ts`) — si para cuando esto se ejecute TR-08 ya
  commiteó, esos archivos son buenos candidatos también; si no, saltarlos y priorizar otros

## Acceptance

- `bun run test` corre sin errores
- `bun run test:coverage` reporta ≥20%
- Al menos store + 1 storage adapter + 1 módulo de cálculo puro tienen tests reales
  (no placeholders vacíos)
- `/docs/development/testing.md` existe con lo mínimo útil (cómo correr, patterns)

## Suggested executor agent

`task-decomposer` primero (el scope tiene deps internas reales — setup antes que tests, y
varios milestones paralelizables entre sí una vez el setup está listo) → `task-executor` por
milestone o en un solo pase si el decomposer lo ve manejable.

## Notas operativas

- Corre en paralelo a TR-07 (bloqueado esperando BW) y TR-08 (bloqueado esperando Pi/npm/token)
  — sin overlap de archivos esperado, salvo que decida testear algo que TR-08 esté tocando (ver
  Constraints).
- Doc sync (roadmap.spec.yml + progress-log, más el ticket TKT-05 que queda superseded por
  TR-08) se difiere igual que el resto — axon lo hace después en un solo pase.
