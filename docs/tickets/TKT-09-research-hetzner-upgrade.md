# TKT-09 - Research: Hetzner Upgrade Evaluation (Nested Virt para builds cloud)

**Milestone**: 0.8.0 (post-prod reminder)
**Priority**: ⏠️ LOW
**Status**: proposed (post-prod, NO tonight)
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 1-2h research
**Decision doc**: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md) (reminder lockeado)

## Context

🔔 **Reminder lockeado por waxin en r1**: investigar coste y opciones para upgrade a un servidor con KVM nested para builds cloud reproducibles.

**Background**:
- Verificado en r1 que Hetzner Cloud (CX/CCX/CPX/CAX) NO permite nested virt — policy del provider, no del guest OS.
- VPS actual lab1 (Hetzner Cloud, AMD EPYC-Genoa) confirma: `/dev/kvm` ausente, vmx/svm flags vacíos.
- Implica que `dockur/windows` (o cualquier VM Windows en container) **no es viable** en lab1 actual.

**Para tonight (0.4.0)**: build Windows directo en máquina del bar (1 vez, después OTA). Funciona.

**Para futuro**: si waxin quiere builds cloud reproducibles (cada release built igual, sin depender de máquina física), necesita evaluar opciones de provider.

## Scope

### IN scope

Research **post-producción**, una vez tonight esté shipped:

1. **Hetzner Robot/Dedicated** (AX, EX series — bare-metal)
   - Coste mensual mínimo viable
   - Specs (CPU, RAM, disk) que cubran KVM + Windows VM
   - Datacenter Helsinki disponible? (latencia consistente con lab1)
   - Migration path: ¿reusar mks2508.systems setup en server nuevo? ¿setup paralelo?

2. **Otros providers con nested virt habilitado**:
   - **AWS EC2 `.metal` instances** (c6g.metal, m5.metal, etc.) — coste / hora
   - **OVH dedicated** — Eco / Rise / Advance / Infrastructure series
   - **DigitalOcean droplets** — algunos planes permiten nested virt
   - **Hetzner Auction Server** (servered.de / robot)
   - **GCE / Azure** — nested virt support en algunas SKUs

3. **Alternativas sin upgrade**:
   - **GitHub Actions Windows runner** (rejected en r1, pero si cambia perspectiva post-prod, mantiene como option)
   - **Build runner self-hosted en Mac mini local** (1 ARM, 1 Intel para cross-compile sin VM)
   - **VM Windows local en M1 (UTM/Parallels)** + script de release manual

4. **Coste/beneficio**:
   - ¿Cuánto cuesta vs builds manuales 1-2h por release?
   - Frequencia esperada de releases (¿semanal? ¿mensual?)
   - Break-even point: a partir de qué frecuencia compensa cloud build

### OUT of scope
- ❌ Implementación tonight
- ❌ Migrar lab1 actual (mks2508.systems está running fine en Cloud)
- ❌ Setup del nuevo server (eso sería ticket separado post-research)

## Dependencies

- None
- Blocks: nothing (post-prod, no critical path)

## Acceptance Criteria

- [ ] **Doc creado**: `docs/research/hetzner-upgrade-evaluation.md` con findings
- [ ] **Comparación tabla**: providers con coste mensual + specs + nested virt confirmation
- [ ] **Recomendación**: opción preferida + justificación + path de migration
- [ ] **Decision pendiente**: doc deja claro qué decisión espera waxin para próximo lock

## Technical Notes

### Findings preliminares (verificados en r1)

```
Hetzner Cloud → NO nested virt (cualquier plan)
Hetzner Dedicated → SÍ KVM nativo, varios planes desde €30-50/mes
AWS EC2 `.metal` → SÍ nested, ~$100-300/mes según instance
OVH dedicated → SÍ varios planes, desde €15-50/mes (Kimsufi/Eco)
DigitalOcean → algunos droplets permiten, verificar plan exacto
```

### Comandos research

```bash
# Hetzner pricing (Robot)
curl https://www.hetzner.com/dedicated-rootserver/

# OVH pricing
curl https://www.ovhcloud.com/en/bare-metal/

# AWS EC2 metal pricing (regional)
aws ec2 describe-instance-types --filters Name=metal,Values=true
```

### Migration consideraciones

Si waxin upgrade a Hetzner Dedicated:
- ¿Reuso de IP `77.42.25.248` o IP nueva?
- ¿Cómo se reasigna `lab1-helsinki.mks2508.systems` (DNS update)?
- ¿Coolify se reinstala o migra config? (export apps + import en server nuevo)
- ¿Headscale + middleware Traefik se reaplican?
- ¿Backup current state → restore en nuevo server?

Tarea grande, NO tonight. Solo research.

## Sub-tasks (research mode)

- [ ] 1. Pricing Hetzner Robot AX/EX series
- [ ] 2. Pricing OVH dedicated lineup completo
- [ ] 3. Pricing AWS EC2 `.metal` (Frankfurt region equivalente)
- [ ] 4. Verificar nested virt en cada opción (docs oficiales)
- [ ] 5. Tabla comparativa coste mensual + specs + datacenter location
- [ ] 6. Estimación frequencia releases TPV → break-even point
- [ ] 7. Recomendación final + path de migration high-level
- [ ] 8. Crear `docs/research/hetzner-upgrade-evaluation.md`

## Blocked by

- None (no es critical path)

## Blocks

- Decision sobre infra cloud builds (post-prod)

## Findings

*(Post-execución llenar)*

- Provider preferido:
- Coste mensual:
- Path migration:

## References

- r1 decision: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md) sección "Reminder post-producción"
- Hetzner Cloud FAQ (verified): https://docs.hetzner.com/cloud/servers/faq/
- dockur/windows: https://github.com/dockur/windows
