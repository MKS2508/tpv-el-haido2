# Tickets (TKT) - TPV El Haido

Este directorio contiene task-requests para el workflow Axon.

## Convención de Nombres

```
TKT-<NUMBER>-<SLUG>.md
```

Ejemplos:
- `TKT-01-audit-updater-flow.md`
- `TKT-02-thermal-printer-windows.md`
- `TKT-03-coolify-migration.md`

## Template

```markdown
# TKT-XX - <Title>

**Milestone**: [0.X.Y]
**Priority**: critical | high | medium | low
**Status**: proposed | in-progress | blocked | done
**Created**: 2026-05-09
**Assigned**: -

## Context
¿Por qué existe este ticket? ¿Qué problema resuelve?

## Scope
Qué está IN scope y qué está OUT of scope.

## Dependencies
- TKT-XX debe completarse primero
- Algún módulo debe estar listo

## Acceptance Criteria
- [ ] Criterio 1 verificable
- [ ] Criterio 2 verificable

## Technical Notes
Notas técnicas para el executor.

## Sub-tasks (si aplica)
- [ ] Sub-task 1
- [ ] Sub-task 2
```

## Estados

| Estado | Descripción |
|--------|-------------|
| `proposed` | Ticket creado, no asignado |
| `in-progress` | Executor trabajando en ello |
| `blocked` | Esperando dependencies |
| `done` | Completado y verificado |

## Workflow

1. Crear TKT via `@task-decomposer "brief"`
2. Descomponer en plan ejecutable
3. Ejecutar via `@task-executor <plan>`
4. Verificar y marcar `done`
