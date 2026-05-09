# Next Session: Axon Pre-Interview Review + Lock Decisions

**Para**: Axon meta-orchestrator (next session)
**De**: Previous session (prep work completed)
**Fecha**: 2026-05-09 21:00
**Estado**: Preparation complete, pending interview + lock

---

## Executive Summary

Se ha completado **toda la preparación** para los milestones críticos de producción (0.4.0 + 0.5.0). Esta sesión debe:

1. **Verificar correctness** de toda la documentación vs código real
2. **Auditar contra /guidelines** y otras skills relevantes
3. **Ajustar preguntas, diagramas y propuestas** si hay flaws
4. **Ejecutar /interview** con el usuario para lock decisions
5. **Documentar decisiones lockeadas** en progress-log + decisions docs

---

## What's Been Done (Previous Session)

### 1. Code Exploration (6 background agents)

```
✅ Frontend SolidJS audit — 4950 LOC, no stubs, 35+ actions
✅ Backend Rust audit — 34 Tauri commands, hardcoded credentials issue
✅ Services layer audit — 3 storage adapters real, platform abstraction unused
✅ Apps auxiliares audit — License server + Docs ready for Coolify
✅ Technical debt audit — 0% test coverage, 30+ console.log
✅ Exploration summary — Executive findings document
```

### 2. Documentation Created

**Modular DEV guides** (5 docs):
- `docs/modules/frontend-solidjs-DEV.md` — Development guide frontend
- `docs/modules/backend-rust-DEV.md` — Development guide backend
- `docs/modules/services-DEV.md` — Development guide services
- `docs/modules/apps-auxiliares-DEV.md` — License server + Docs
- `docs/modules/technical-debt.md` — Debt analysis

**Tickets** (6 docs):
- `docs/tickets/TKT-01-audit-updater-flow.md` — Updater audit (2-3h)
- `docs/tickets/TKT-01.1-fix-hardcoded-credentials.md` — Security blocker (30min)
- `docs/tickets/TKT-02-thermal-printer-windows.md` — Printer (NEEDS REFORMULATION)
- `docs/tickets/TKT-03-coolify-migration.md` — Coolify migration (3-4h)
- `docs/tickets/TKT-04-windows-production-setup.md` — Windows setup (2-3h)
- `docs/tickets/TKT-05-migrate-logging.md` — Post-production
- `docs/tickets/TKT-06-add-test-coverage.md` — Post-production

**Proposals + Questions**:
- `docs/PROPOSALS-INTERVIEW.md` — Two concrete proposals (0.4.0 + 0.5.0)
- `docs/INTERVIEW-QUESTIONS.md` — 4 concrete questions with options
- `docs/TICKETS-REVIEW.md` — Ticket review + dependencies map

**Architecture audit**:
- `docs/ARCHITECTURE-AUDIT-2026-05-09.md` — Compliance vs /guidelines

**Diagrams** (enhanced HTML/CSS):
- `/tmp/0.4.0-enhanced.html` — Deployment architecture
- `/tmp/0.5.0-enhanced.html` — Printer strategy

**Progress log**:
- `docs/progress-log.md` — Updated with today's work

---

## What This Session Must Do

### Step 1: Verification Pass (Explore agents)

**Launch 2-3 Explore agents in PARALLEL** (single message):

#### Agent A: Documentation vs Code verification
```
description: Verify documentation matches real code
subagent_type: Explore
prompt: |
  En el repo <cwd>:

  1. Verificar que docs/modules/ son correctos:
     - frontend-solidjs-DEV.md — ¿Los 8 sections existen? ¿Store usa createStore + produce?
     - backend-rust-DEV.md — ¿34 comandos Tauri expuestos? ¿Hardcoded credentials en lib.rs:282-284?
     - services-DEV.md — ¿3 storage adapters? ¿Platform abstraction unused?

  2. Verificar que tickets TKT-01 a TKT-04 son correctos:
     - ¿TKT-01.1 (credentials) es BLOCKER para TKT-01?
     - ¿TKT-02 (printer) necesita reformulación TCP?
     - ¿TKT-03 debe splittearse en A/B?

  3. Verificar que propuestas PROPOSALS-INTERVIEW.md son correctas:
     - ¿0.4.0 proposal tiene GitHub Actions + Multi-source updater + Coolify?
     - ¿0.5.0 proposal tiene TCP MVP (2-4h) → USB fallback (8-12h)?

  Reporta ≤400 palabras:
    - docs_correct: true/false + qué está mal
    - tickets_correct: true/false + qué está mal
    - proposals_correct: true/false + qué está mal
    - corrections_needed: [lista de ajustes]
```

#### Agent B: Diagrams + Questions verification
```
description: Verify diagrams and interview questions
subagent_type: Explore
prompt: |
  En el repo <cwd>:

  1. Verificar diagramas:
     - Leer /tmp/0.4.0-enhanced.html — ¿HTML válido? ¿CSS correcto? ¿Mermaid diagram visible?
     - Leer /tmp/0.5.0-enhanced.html — ¿HTML válido? ¿CSS correcto? ¿Fases claras?
     - ¿Se pueden abrir en navegador? (test con open command si es posible)

  2. Verificar interview questions:
     - Leer docs/INTERVIEW-QUESTIONS.md
     - ¿4 preguntas concretas (no marabunta)?
     - ¿Cada pregunta tiene 2-4 opciones con previews?
     - ¿Opción recomendada marcada?
     - ¿Preguntas son suficientes para lock 0.4.0 + 0.5.0?

  3. Verificar tickets review:
     - Leer docs/TICKETS-REVIEW.md
     - ¿Dependencies map correcto? (TKT-01.1 → TKT-01 → TKT-04)
     - ¿TKT-02 reformulation recommendation está clara?

  Reporta ≤400 palabras:
    - diagrams_valid: true/false + issues
    - questions_sufficient: true/false + qué falta
    - review_complete: true/false + qué falta
```

#### Agent C (optional): Progress log + roadmap sync
```
description: Verify progress-log and roadmap are in sync
subagent_type: Explore
prompt: |
  En el repo <cwd>:

  1. Leer docs/progress-log.md — ¿Entradas de hoy (2026-05-09) están completas?
  2. Leer roadmap.spec.yml — ¿Fases 0.4.0 y 0.5.0 están marcadas como "next"?
  3. Verificar que .claude/axon.config.json tiene lockedDecisionDocs con todos los docs creados hoy

  Reporta ≤200 palabras:
    - progress_log_complete: true/false + qué falta
    - roadmap_in_sync: true/false + diferencias
    - axon_config_complete: true/false + qué falta
```

---

### Step 2: Guidelines Audit

**Load /guidelines skill** and audit:

```bash
/guidelines architecture
/guidelines errors
/guidelines services
```

**Verify**:
- ✅ Propuesta 0.4.0 respeta layer model (Consumer/Service separados)
- ✅ Propuesta 0.5.0 respeta layer model (Frontend → Rust → Device)
- ✅ Error handling: Result pattern usado en propuestas
- ⚠️ Error metadata: NO existe (deuda preexistente, documentada ya)
- ⚠️ BaseService pattern: HttpStorageAdapter no lo usa (deuda preexistente)

**Si encuentras violaciones NO documentadas** en ARCHITECTURE-AUDIT-2026-05-09.md:
1. Añadir al audit
2. Si es CRITICAL → proponer corrección antes de interview
3. Si es MEDIUM/LOW → documentar como deuda post-producción

---

### Step 3: Corrections (if needed)

**If Agent A/B/C found issues**, apply corrections:

**Examples**:
- Diagram HTML inválido → Regenerar con `mks-diagram render mermaid <file> --sink=file --out=/tmp/X-fixed.html`
- Pregunta insuficiente → Añadir a INTERVIEW-QUESTIONS.md
- Ticket dependency mal → Corregir en TICKETS-REVIEW.md
- Progress log incompleto → Añadir entradas faltantes

**Rule of thumb**: Si el issue es **typos/format**, corregir directo. Si es **substantivo** (mal cálculo de esfuerzo, arquitectura equivocada), marcar para revisión en interview y dejar que Axon decida.

---

### Step 4: Final Interview Preparation

**Before launching /interview**, verify checklist:

- [ ] All docs from previous session are **correct** (Agent A/B/C verification passed)
- [ ] All docs are **in sync** (progress-log ↔ roadmap ↔ axon.config)
- [ ] Diagrams are **valid HTML** and **openable** in browser
- [ ] Interview questions are **sufficient** (4 concretas, no marabunta)
- [ ] Architecture audit is **complete** vs /guidelines
- [ ] No **critical violations** unaddressed
- [ ] **Locked decision docs** list in axon.config.json is complete
- [ ] **Tickets review** has correct dependency map
- [ ] **Proposals** have clear trade-offs and recommendations

**If ANY checklist item fails**:
1. Fix the issue
2. Re-run verification
3. Don't proceed to interview until checklist is GREEN

---

### Step 5: Execute /interview

**Once checklist is GREEN**, launch the interview:

```
## Interview para lock milestones 0.4.0 + 0.5.0

### Contexto

Deployment en producción en el bar de tu hermano (night of 2026-05-09). Dos milestones críticos que deben lockearse TONIGHT:

- **0.4.0**: Auto-update system + Coolify migration + Windows production setup
- **0.5.0**: Thermal printer integration

### Propuesta 0.4.0 — Deployment Architecture

**Opción A (RECOMMENDED)**: Híbrida Coolify + GitHub Actions + CDN (8-12h)

```
GitHub Actions (Windows runner) → Releases
                ↓
        TPV App (Auto-updater multi-source)
                ↓
    GitHub Releases (Primary) + VPS Mirror (Fallback)
                ↓
        Coolify (License server SOLAMENTE)
                ↓
        CDN (HaidoDocs — Cloudflare Pages / BunnyCDN)
```

**Ventajas**:
- ✅ SPOF eliminado (multi-source updater)
- ✅ Builds automatizados y reproducibles
- ✅ Performance para España (CDN)
- ✅ Services manageables (Coolify)

**Opción B**: Minimal solo GitHub (4-6h)

**Desventajas**:
- ❌ SPOF crítico (GitHub down = paperweight)
- ❌ No services manageables

**¿Cuál prefieres para producción esta noche?**

---

### Propuesta 0.5.0 — Thermal Printer

**Opción A (RECOMMENDED)**: TCP Network MVP (2-4h) → USB Serial fallback (8-12h post-MVP)

```
Frontend → invoke('print_order')
    ↓
Rust Backend → TCP Socket → Network Printer
```

**Ventajas**:
- ✅ MVP funcional en 4h
- ✅ Elimina sidecar stub (binary no existe)
- ✅ Arquitectura limpia
- ✅ Progressive enhancement

**Opción B**: Intentar salvar sidecar actual (16-24h)

**Issues**:
- ❌ Binary sidecar NO existe, hay que escribirlo
- ❌ Arriesgado: puede fallar

**¿Cuál prefieres para producción esta noche?**

---

### Dependencies detectadas

```
TKT-01.1 (credentials) → TKT-01 (updater) → TKT-04 (windows)
                                        ↓
                                     TKT-02 (printer)
```

**Orden recomendado**: Secuencial con algo de paralelismo posible
1. TKT-01.1 (30min) — BLOCKER
2. TKT-01 (2-3h) — BLOCKER
3. TKT-04 (2-3h) — BLOCKER
4. TKT-02 (2-4h) — BLOCKER

**Total**: 7-13h (hasta 6-7AM)

---

### Preguntas adicionales

1. **HaidoDocs (0.4.0.C)**: ¿Ahora (Coolify o CDN) o postponemos?
2. **Orden de ejecución**: ¿Secuencial o paralelo donde sea posible?

---

**Decisiones a lockear**:
- Deployment architecture (híbrida vs minimal)
- Printer strategy (TCP MVP vs sidecar)
- Execution order
- HaidoDocs timing

Una vez lockeadas, Axon debe:
1. Actualizar progress-log.md con "## YYYY-MM-DD — Locked decision: ..."
2. Crear doc en docs/decisions/r{N}-{topic}-{date}.md
3. Reformular TKT-02 si se aprueba TCP
4. Crear handoff para executor session
```

---

### Step 6: Post-Interview Work

**After interview completes**, Axon must:

1. **Document locked decisions**:
   - Update `docs/progress-log.md` with "## YYYY-MM-DD — Locked decision: {summary}"
   - Create `docs/decisions/r{N}-{topic}-2026-05-09.md` with full decision rationale
   - Update `roadmap.spec.yml` if phases change based on decisions

2. **Reformulate TKT-02** (if TCP approved):
   - Replace sidecar approach with TCP architecture
   - Update estimate: 2-4h (MVP) + 8-12h (USB post-MVP)
   - Remove references to non-existent binary

3. **Create executor handoff**:
   - `docs/handoffs/next-prompt-phase-0.4.0.md` — Implementation session for deployment
   - Include: read-first list, milestones, risk register, hard constraints

4. **Update axon.config.json**:
   - Add new locked decision doc to `lockedDecisionDocs`
   - Update `metadata.pendingWork` with next steps

---

## Files to Read First (Read-First List)

When starting this session, read these files **in order**:

1. `docs/progress-log.md` — What's been done, what's next
2. `docs/EXPLORATION-SUMMARY-2026-05-09.md` — Executive summary of exploration
3. `docs/PROPOSALS-INTERVIEW.md` — Two concrete proposals
4. `docs/INTERVIEW-QUESTIONS.md` — 4 concrete questions
5. `docs/TICKETS-REVIEW.md` — Tickets + dependencies
6. `docs/ARCHITECTURE-AUDIT-2026-05-09.md` — Guidelines compliance
7. `roadmap.spec.yml` — Current roadmap state
8. `.claude/axon.config.json` — Project metadata

---

## Success Criteria

This session is **complete** when:

- [ ] All verification agents (A/B/C) report **no critical issues**
- [ ] All docs are **verified correct** vs code
- [ ] /guidelines audit is **complete** (no critical violations)
- [ ] All corrections (if any) are **applied**
- [ ] **Interview checklist is GREEN**
- [ ] Interview is **executed** and user decisions are captured
- [ ] Locked decisions are **documented** in progress-log + decisions doc
- [ ] TKT-02 is **reformulated** (if TCP approved)
- [ ] Executor handoff is **created** for next implementation session
- [ ] axon.config.json is **updated** with new state

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Agent verification finds MAJOR flaws in proposals | Medium | High | Have backup plan: delay interview, fix proposals, re-verify |
| User rejects both proposals | Low | Critical | Prepare 3rd "minimal viable" option during interview |
| Diagrams are broken/invalid | Low | Medium | Regenerate with mks-diagram tool before interview |
| Guidelines audit finds CRITICAL violations | Low | High | Fix before interview OR document as "known debt" if not blocker |
| Interview takes >1h, leaving no time for fixes | Medium | Medium | Timebox interview to 45m, have "quick fixes" ready |

---

## Output Expected

End of this session, Axon should produce:

1. **Verification report** (Agent A/B/C findings)
2. **Guidelines audit supplement** (if new violations found)
3. **Locked decisions document** (`docs/decisions/r{N}-{topic}-2026-05-09.md`)
4. **Updated progress-log.md** (with locked decision entries)
5. **Reformulated TKT-02** (if TCP approved)
6. **Executor handoff** (`docs/handoffs/next-prompt-phase-0.4.0.md`)
7. **Updated axon.config.json** (new metadata state)

---

## Notes for Axon

- **Do NOT skip verification** — The agents are the safety net. If they find issues, fix them BEFORE interview.
- **Do NOT rush to interview** — Better to delay 30m and have correct proposals than to lock wrong decisions.
- **Use /guidelines proactively** — Load architecture, errors, services guidelines BEFORE auditing.
- **Be honest about flaws** — If a proposal is wrong, say so. Don't try to "make it work" in the interview.
- **Document trade-offs** — Every locked decision should have "why this option, why not the other".
- **Think in milestones** — 0.4.0 and 0.5.0 are CRITICAL for production tomorrow. Focus on what ships tonight, not what's ideal.

---

**Created**: 2026-05-09 20:55
**Target session start**: 2026-05-09 21:00
**Estimated duration**: 1-2h (verification + interview + documentation)
**Next session**: Implementation (executor) after interview completes
