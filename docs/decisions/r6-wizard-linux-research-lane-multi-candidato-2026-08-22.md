# r6 — Wizard GUI Linux: research lane multi-candidato robusto + profesional

**Fecha lock**: 2026-08-22
**Lockeado por**: AskUserQuestion + preview, 1 ronda (4 opciones de wizard + nota libre de waxin
en el answer: *"probemos varios casos, uno robusto y profesional y con buena ux y ui"* — esto
cambió el alcance del lock: en vez de elegir 1 opción abstracta, lockear una **research lane que
evalúe varios candidatos con profundidad antes de elegir**).
**Contexto de bloqueo**: waxin pidió "lane de instalador wizard gui para linux ultrathink". El
instalador actual `scripts/install-linux.sh` (commit `85c6fd5`, 2026-08-21) es bash no-GUI: copia
AppImage a `~/.local/bin`, registra `.desktop` + icono, extrae del propio AppImage para que sigan
a la versión. **Funciona**, pero no es wizard. Waxin quiere UX/UI profesional para producción.

---

## Contexto

**Instalador actual** (`scripts/install-linux.sh`, bash, 1 comando, no interactivo):

- Copia AppImage a `~/.local/bin/` (NO `/opt` a propósito — `tauri-plugin-updater` reescribe el
  AppImage donde corre, path tiene que ser user-writable)
- Registra `.desktop` + icono en `~/.local/share/applications/` y `~/.local/share/icons/`,
  extrayéndolos del propio AppImage (siguen a la versión instalada)
- Sin wizard, sin preguntas, sin opciones

**Gap para producción**: instalar TPV El Haido en el bar del hermano de waxin es 1 sola
operación hoy (ejecutar el `.sh`). Funciona. Pero un wizard profesional añade:

- Selección de install path (default `~/.local` vs `/opt` con sudo)
- Activación de license key durante install (en vez de post-install en el TPV)
- Selección de impresora térmica (USB/network/skip)
- Creación de acceso directo en dock/apps
- Autostart al login del usuario del bar
- Diagnóstico pre-install (¿AppImage ejecutable? ¿whiptail/zenity disponibles? ¿X11 forward?)

**Por qué NO elegir opción concreta ahora (sin research lane previa):**

- Las 4 opciones iniciales (whiptail ncurses, GTK3 .deb, Tauri-native first-launch, defer) tienen
  blast radius muy distinto: <100 LOC bash vs >500 LOC Python+GTK3 vs refactor de App.tsx vs nada
- UX/UI "profesional" depende del contexto del bar (¿hay display? ¿qué distro? ¿qué permisos del
  usuario?) — no se puede asumir desde la oficina de waxin
- Una evaluación robusta requiere mockups + criterios explícitos + quizás spike de factibilidad
  técnica (ej: ¿whiptail viene en CachyOS? ¿GTK3 es demasiado para un AppImage installer?)

---

## Decisión lockeada

### Research lane (`track/wizard-linux-research`) **antes** de track de build

Nuevo track `track/wizard-linux-research` (zone=client, status=queued). Lane write-only:

1. **Inventario de candidatos** con 3-5 opciones concretas (no las 4 abstractas; cada una con:
   stack, blast radius estimado, dependencias externas, ventana de tiempo)
2. **Criterios de evaluación** explícitos y rankeados:
   - UX (curva de aprendizaje del usuario del bar, feedback visual, capacidad de rollback)
   - UI (consistencia visual con el TPV nativo, dark/light mode support, accesibilidad)
   - Robustez (manejo de errores, recovery, idempotencia, logs)
   - Profesionalidad (versionado, tests, CI, distribución, mantenimiento)
   - Compatibilidad (CachyOS/Ubuntu/Fedora/AppImage host/distro live)
3. **Mockups de los 2-3 finalistas** (ASCII para ncurses, GTK3 visual para full-GUI, Tauri-native
   para in-app). Presentados con preview a waxin via AskUserQuestion en la misma lane.
4. **Recomendación locked** con preview, evidencia, y trade-offs honestos
5. **Handoff al track de build** (`track/wizard-linux-build`, queued al cerrar research): plan
   completo, criterios de aceptación verificables, criterios de done

**Out of scope de la research lane**:

- No se escribe código de wizard (eso es el track de build)
- No se modifica `install-linux.sh` (queda como fallback funcional)
- No se modifica `App.tsx` ni componentes del TPV
- No se abre `.deb` ni se publica nada

**Por qué research lane en vez de elegir ahora**: la nota libre de waxin fue clara — "varios
casos", "robusto", "profesional", "buena UX/UI". Saltarse la research sería saltarse el "ultrathink"
que pidió. Es mejor 1-2 sprints de research que 1 sprint de build con la opción equivocada.

---

## Consecuencias

- **Positivas**:
  - Decisión informada con evidencia (no opinión) — el track de build no se re-planea
  - Mockups disponibles para review antes de invertir tiempo de impl
  - Criterios de "profesional" explícitos (no implícitos) — evita que un track de build "termine"
    sin cumplir el criterio real
  - Compatible con la regla de **decomposition** del meta-orchestrator: research + build son
    sub-units con dependencies explícitas + close criterion
- **Negativas / riesgos**:
  - Costo: 1-2 sesiones de orchestrator + research antes de poder empezar a build. Tiempo hasta
    tener wizard real: +1-2 sprints vs "elige whiptail y ya"
  - Riesgo de analysis paralysis: si la research no converge, hay que forzar lock con preview y
    opción fallback (whiptail ncurses, la más barata)
  - El bar del hermano sigue usando `install-linux.sh` durante la research (sin wizard) — es
    aceptable porque install-linux.sh ya está mergeado y funciona
- **Defer (explícito)**:
  - Implementación concreta del wizard (track de build posterior)
  - Decisión de scope entre in-app (Tauri-native) vs pre-install (instalador externo) — eso es el
    output principal de la research lane
  - Integración con auto-updater (`tauri-plugin-updater`) — el wizard tiene que sobrevivir updates

## Referencias

- `scripts/install-linux.sh` — instalador actual bash no-GUI (commit `85c6fd5`, 2026-08-21)
- `track/linux-build-bar` — TR-07 build nativo en supermicro-pcbar (in_progress)
- `track/wizard-linux-research` (nuevo, queued) — la lane que ejecuta esta decisión
- `track/wizard-linux-build` (será creado al cerrar research) — sub-TR dependiente
