# Mensaje para Axon (Next Session)

## Hola Axon,

Mira lo que tenemos pendiente de lockear y demás. Antes de nada, lanza un par de agentes Explore para verificar que la documentación es correcta acorde al código, lanza la skill de /guidelines y otras skills relevantes para auditar, verifica que las preguntas son suficientes, bien estructuradas, los diagramas, etc.

Una vez tengas todo verificado y ajustado lo que no esté del todo bien, ejecuta el /interview para lockear las decisiones de los milestones 0.4.0 y 0.5.0.

---

## Contexto Rápido

**Proyecto**: TPV El Haido (Tauri 2 + SolidJS POS)
**Target**: Producción en el bar de mi hermano (night of 2026-05-09)
**Milestones críticos**:
- **0.4.0**: Auto-update + Coolify migration + Windows setup
- **0.5.0**: Thermal printer integration

---

## Lo que está hecho (Previous Session)

✅ **Exploración completa** (6 agentes background)
- Frontend: 4950 LOC, no stubs, 35+ store actions
- Backend: 34 Tauri commands, hardcoded credentials issue
- Services: 3 storage adapters, platform abstraction unused
- Technical debt: 0% test coverage, 30+ console.log

✅ **Documentación creada**
- 5 guías modulares DEV (docs/modules/)
- 7 tickets (TKT-01 a TKT-06)
- 2 propuestas arquitectónicas (0.4.0 + 0.5.0)
- Audit contra /guidelines (9/10 y 8.5/10)
- 4 preguntas concretas para interview
- Diagramas enhanced HTML/CSS

✅ **Handoff completo** en `docs/handoffs/next-session-axon-pre-interview.md`

---

## Lo que necesitas hacer tú

### 1. Verificación (Explore agents)

Lanza **3 agentes en PARALELO** (un solo mensaje con 3 tool calls):

**Agent A**: Docs vs code verification
- ¿docs/modules/ son correctos? (frontend, backend, services)
- ¿tickets TKT-01 a TKT-04 están bien formulados?
- ¿propuestas PROPOSALS-INTERVIEW.md son correctas?

**Agent B**: Diagrams + questions verification
- ¿Diagramas /tmp/*.html son válidos y abren en browser?
- ¿INTERVIEW-QUESTIONS.md tiene 4 preguntas concretas con previews?
- ¿TICKETS-REVIEW.md tiene dependencies map correcto?

**Agent C**: Progress log + roadmap sync
- ¿progress-log.md está completo con entradas de hoy?
- ¿roadmap.spec.yml tiene 0.4.0 y 0.5.0 como "next"?
- ¿axon.config.json tiene lockedDecisionDocs completo?

### 2. Guidelines Audit

Lanza las skills:
```
/guidelines architecture
/guidelines errors
/guidelines services
```

Verifica:
- ✅ Propuestas respetan layer model
- ✅ Error handling con Result pattern
- ⚠️ Error metadata NO existe (deuda documentada)
- ⚠️ BaseService pattern no usado en HttpStorageAdapter (deuda)

Si encuentras **violaciones CRÍTICAS no documentadas**, corregir antes de interview.

### 3. Correcciones (si hacen falta)

Si los agentes encontraron issues:
- **Typos/format**: Corregir directo
- **Substantivo** (mal cálculo, arquitectura equivocada): Marcar para revisión en interview

### 4. Interview Checklist

Antes de lanzar /interview, verificar:
- [ ] Todos los docs son **correctos** (Agent A/B/C pasó)
- [ ] Todos los docs están **en sync** (progress-log ↔ roadmap ↔ axon.config)
- [ ] Diagramas son **HTML válido** y **abren** en browser
- [ ] Preguntas son **suficientes** (4 concretas, no marabunta)
- [ ] Architecture audit **completo** vs /guidelines
- [ ] No **violaciones críticas** sin address
- [ ] **Locked decision docs** list completo en axon.config
- [ ] **Tickets review** con dependencies correcto
- [ ] **Propuestas** con trade-offs claros

Si **ALGO no está GREEN**, arreglar antes de interview.

### 5. Ejecutar /interview

Una vez checklist GREEN, ejecutar el interview con el usuario.

**Propuesta 0.4.0** (Deployment):
- Opción A (Recommended): Híbrida GitHub Actions + Multi-source updater + Coolify (license) + CDN (docs) — 8-12h
- Opción B: Minimal solo GitHub — 4-6h (SPOF risk)

**Propuesta 0.5.0** (Printer):
- Opción A (Recommended): TCP Network MVP (2-4h) → USB Serial fallback (8-12h post-MVP)
- Opción B: Salvar sidecar actual (16-24h, arriesgado)

**Dependencies**: TKT-01.1 → TKT-01 → TKT-04 → TKT-02

**Preguntas adicionales**:
1. HaidoDocs (0.4.0.C): ¿Ahora o postponemos?
2. Orden: ¿Secuencial o paralelo donde sea posible?

### 6. Post-Interview

Una vez el usuario lockee decisiones:
1. Actualizar `docs/progress-log.md` con "## YYYY-MM-DD — Locked decision: ..."
2. Crear `docs/decisions/r{N}-{topic}-2026-05-09.md` con rationale completo
3. Reformular TKT-02 si se aprueba TCP
4. Crear handoff para executor session
5. Actualizar `roadmap.spec.yml` si las fases cambian
6. Actualizar `.claude/axon.config.json` con nuevo estado

---

## Handoff Completo

Todo el detalle está en `docs/handoffs/next-session-axon-pre-interview.md`:
- Read-first list (8 archivos en orden)
- Verification prompts para Agent A/B/C
- Guidelines audit checklist
- Correction workflow
- Interview script completo
- Post-interview tasks
- Risk register
- Success criteria

---

## Estado del Repo

✅ **Commit completado**: `8bd828a` — "feat-phase(0.4.0-0.5.0): complete prep work for production milestones"

Todos los archivos están commiteados:
- 30 files changed, 5210 insertions(+)
- Axon config, roadmap spec, progress log
- 5 módulos DEV, 7 tickets
- Proposals, questions, review, audit
- Handoff para next session

**Worktree limpio** — listo para que Axon trabaje.

---

## Target

Entregar todo **lockeado y documentado** para que la siguiente sesión pueda ejecutar directamente los milestones 0.4.0 y 0.5.0 sin demoras.

**Deadline**: Producción en el bar de mi hermano mañana (2026-05-10).

---

**Confío en ti, Axon. 🚀**

---

*(P.D.: Todo el trabajo previo ya pasó guidelines audit (9/10 y 8.5/10). Solo falta tu verificación final y ajustes si hacen falta antes del interview.)*
