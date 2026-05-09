# TKT-02 - Thermal Printer Integration (Windows + RPi)

**Milestone**: 0.5.0
**Priority**: 🔥 CRITICAL
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 4-6h (debug pesado)

## Context

La impresora de tickets es **crítica** para el funcionamiento del TPV en producción. Sin ella, no se pueden imprimir comandas para la cocina ni tickets para clientes.

**Hardware disponible**:
- Impresora térmica (marca/modelo por confirmar)
- Máquina Windows (production target)
- Raspberry Pi (fallback para impresión por red)

**Estado actual según CLAUDE.md**:
- Servicio existe: `/src/services/thermal-printer.service.ts`
- Protocolo: ESC/POS
- Status: "service exists but no sidecar"
- "Multiple PoCs available but not working correctly"

**PEO**: Hay que auditar el código real, conectar la impresora física, y hacer funcionar el flow end-to-end.

## Scope

### IN scope
- ✅ Auditar `thermal-printer.service.ts` - código real, no claims
- ✅ Identificar todas las PoCs existentes
- ✅ Conectar impresora a Windows via USB
- ✅ Probar detección de drivers
- ✅ Enviar comando de prueba (ESC/POS)
- ✅ Si USB falla, probar RPi network fallback
- ✅ Implementar "Imprimir ticket" button en UI
- ✅ End-to-end: click → print → thermal output

### OUT of scope
- ❌ Crear sidecar para impresión (deferred si necesario)
- ❌ Soporte para múltiples impresoras simultáneas
- ❌ Configuración avanzada (formatos personalizados, logos, etc.)

## Dependencies

- TKT-01 (updater) debería completarse primero, pero no es blocker

## Acceptance Criteria

- [ ] **Código auditado**: Entender qué está implementado vs qué falta
- [ ] **Impresora detectada**: Windows ve la impresora en Device Manager
- [ ] **Driver instalado**: Driver correcto instalado
- [ ] **Comando prueba**: ESC/POS `@` (test print) funciona
- [ ] **UI button**: "Imprimir ticket" button implementado
- [ ] **End-to-end**: Click en NewOrder → ticket sale impreso
- [ ] **Fallback RPi**: Si USB falla, network print funciona
- [ ] **Documentado**: Guía para configurar impresora en `/docs/deployment/printer.md`

## Technical Notes

**Qué verificar en código**:
1. `/src/services/thermal-printer.service.ts` - ¿ESC/POS real o stub?
2. ¿Llama a Tauri commands o sidecar?
3. ¿Hay PoCs en comentarios o archivos separados?

**Comandos útiles**:
```bash
# Buscar PoCs
find . -name "*print*" -o -name "*printer*" -o -name "*thermal*"
grep -r "ESC/POS\|escpos" src/ --include="*.ts" --include="*.tsx"

# Verificar sidecar
ls -la src-tauri/sidecars/

# Windows Device Manager
# Buscar "Ports (COM & LPT)" o "Universal Serial Bus controllers"
```

**Prueba ESC/POS manual** (si hay PoCs):
```bash
# Si hay PoC con bun/node
bun run scripts/test-printer.ts  # si existe
```

**Riesgos conocidos**:
- Driver puede no estar instalado en Windows
- Impresora puede necesitar configuración específica (baud rate, etc.)
- USB puede no ser fiable → fallback a RPi network
- PoCs pueden estar desactualizadas

**Hardware specs needed**:
- Marca/modelo de impresora
- Tipo de conexión (USB serial? USB virtual COM?)
- ¿Tiene network interface?
- ¿Manuel de comandos ESC/POS disponible?

## Sub-tasks

- [ ] 1. Auditar `thermal-printer.service.ts` completo
- [ ] 2. Buscar todas las PoCs (grep, find)
- [ ] 3. Conectar impresora a Windows (USB)
- [ ] 4. Verificar detección en Device Manager
- [ ] 5. Instalar driver si es necesario
- [ ] 6. Enviar comando prueba (ESC/POS)
- [ ] 7. Si falla USB, probar RPi network
- [ ] 8. Implementar "Imprimir ticket" button
- [ ] 9. Test end-to-end: NewOrder → print → thermal
- [ ] 10. Documentar configuración

## Blocked by

- Hardware disponible (waxin tiene la máquina)

## Blocks

- Nada - este ticket NO bloquea otros tickets

## Findings

*(Post-execución: llenar con discoveries reales)*

- [ ] ¿Qué PoCs existen?
- [ ] ¿Cuál es el estado del servicio real?
- [ ] ¿Impresora detectada en Windows?
- [ ] ¿Driver instalado?
- [ ] ¿Comando prueba funciona?
- [ ] ¿USB o network funciona mejor?
- [ ] ¿Qué hace falta para producción?

## References

- Existing plan: Revisar `/todo-plans/` (puede haber docs sobre printer)
- ESC/POS reference: https://reference.epson-biz.com/modules/ref_escpos/index.php
- Tauri plugins: https://v2.tauri.app/plugin/ (ver si hay printer plugin)
