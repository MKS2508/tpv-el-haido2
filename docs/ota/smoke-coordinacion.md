# Contrato de coordinación — smoke del release-hub

**Entre**: sesión de `tpv-el-haido2` (cliente Tauri) y sesión de `desktop-release-hub` (servidor).
**Fecha**: 2026-08-21 · **Estado del cliente**: canal parcial implementado y ejercitado de punta
a punta contra un hub falso, sobre el hardware de producción.

Este documento existe para que los dos lados sepan **qué pueden probar ya sin esperarse**, y
dónde está el único punto en el que se bloquean mutuamente.

---

## 0. Lo que hay que entender antes de nada: son dos canales y van en orden

| | Canal nativo | Canal parcial (bundles JS) |
|---|---|---|
| Qué mueve | binario entero (`.AppImage`) | `dist/` comprimido y firmado |
| Endpoint | `/api/updates/:target/:arch/:current_version` | `/api/bundles/latest`, `/api/bundles/:id/download` |
| Firma | minisign (Tauri) | ed25519 (nuestra) |
| Estado hub | **en producción desde 0.4.1** | recién implementado (`d27461e`) |
| Estado cliente | en producción | **sólo existe a partir del build que aún no se ha publicado** |

**La dependencia que manda**: el TPV instalado en el bar es 0.1.0 y **no tiene el cliente OTA
parcial**. Hasta que no se publique un binario nuevo por el canal nativo, no hay ningún
dispositivo real que consulte `/api/bundles/latest`.

```
FASE A  hub solo, con curl          ← podéis empezar YA, no dependéis de mí
FASE B  publicar binario nuevo      ← lo hago yo, con el canal nativo
FASE C  bundle real contra el bar   ← requiere A y B
```

---

## FASE A — Smoke del hub sin cliente (empezad por aquí)

No necesita nada de mi lado salvo los artefactos que ya os dejo. Verifica que vuestros
endpoints hacen lo que dice el contrato.

### A.0 Cargar la clave pública del proyecto

En `projects.bundle_pubkey` del proyecto `haido`:

```
xIK/I9Xm75KrqnvGWRmYhYM3augM9oRLq70cdcqHYMc=
```

Son **los 32 bytes crudos en base64**, no el envoltorio SPKI/PEM. Si se guarda en otro formato,
la verificación del cliente fallará y el síntoma será "el dispositivo no se actualiza y no hay
error en ninguna parte".

### A.1 Bundle canario

Os dejo un bundle real firmado con la clave de arriba en
`docs/handoffs/fixtures/ota-canary/` de vuestro repo (`bundle.zip` + `manifest.json`).

Está acotado a **`minNativeVersion: 99.0.0`, `maxNativeVersion: 99.0.x`** a propósito: es
subible y consultable, pero **ningún TPV real lo recibe jamás**, porque ninguno corre la 99.
Podéis dejarlo cargado en producción sin riesgo.

Verificación independiente de que el artefacto es bueno (Bun trae Ed25519 en WebCrypto):

```ts
const key = await crypto.subtle.importKey('raw', Buffer.from(PUBKEY, 'base64'),
  { name: 'Ed25519' }, false, ['verify'])
await crypto.subtle.verify('Ed25519', key, Buffer.from(manifest.signature, 'base64'), zipBytes)
// → true   (y false si se altera un solo byte del zip)
```

### A.2 Casos a comprobar

| Petición | Esperado |
|---|---|
| `GET /api/bundles/latest?nativeVersion=99.0.0&deviceId=test` | 200 + manifest del canario |
| `GET /api/bundles/latest?nativeVersion=0.2.0&deviceId=test` | **204** (fuera de ventana) |
| `GET /api/bundles/latest` (sin `nativeVersion`) | 400 |
| `GET /api/bundles/latest?nativeVersion=pepe` | 400 |
| `GET /api/bundles/<id>/download` | 200, `application/zip`, bytes idénticos al subido |
| tras `yank` → `latest?nativeVersion=99.0.0` | 204 |
| pin del device a `null` → `latest` | 204 aunque haya bundle aplicable |
| pin del device al canario → `latest?nativeVersion=0.2.0` | 200 (el pin gana sobre la ventana) |

El campo `url` del manifest tiene que salir **absoluto** (vuestro `toManifest` ya lo compone con
`Host` + `x-forwarded-proto`); el cliente lo usa tal cual, sin reescribirlo.

---

## FASE B — Publicar un binario nuevo (lado tpv-el-haido2)

Lo hago yo. Lo apunto aquí para que sepáis qué esperar y cuándo.

1. Bump de versión `0.1.0 → 0.2.0` en `package.json` y `src-tauri/tauri.conf.json`.
2. Build nativo linux-x64 (en `supermicro-pcbar`, que es el builder) vía `build-release.ts`.
3. `release.ts auth login` (Pocket ID) y `release.ts publish --target linux-x64 --slug haido`.
4. El TPV instalado se actualiza solo por el canal nativo.

**Dos avisos que os afectan:**

- **La primera actualización borra el `localStorage` del dispositivo** (onboarding, tema, modo
  de almacenamiento). Es consecuencia de que la webview pasa a cargar desde un esquema propio,
  necesario para el canal parcial. Está asumido, pero si veis al TPV "como recién instalado"
  tras actualizar, es esto y no un fallo del hub.
- El AppImage se re-empaqueta y **se vuelve a firmar** durante el build (arreglo de aceleración
  gráfica). Es la primera vez que ese paso corre en un release de verdad: si el hub rechaza la
  firma de un artefacto linux, avisadme, porque el sospechoso soy yo y no vosotros.

---

## FASE C — Bundle real contra el TPV del bar

Requiere A y B. Aquí sí nos necesitamos los dos.

1. Empaqueto un bundle del frontend real: `build-bundle.ts pack --build --min 0.2.0 --max 0.2.x`.
2. Os paso `bundle.zip` + los campos del manifest; lo subís por el endpoint admin.
3. El TPV lo recoge en ≤5 min, lo verifica, lo prepara, y lo aplica **cuando la caja esté
   quieta** (sin pedido en pantalla y un minuto sin actividad). No es inmediato a propósito.
4. Verificado si: la UI cambia sin reinstalar y `ota_status` reporta `verified: true`.

### Cotas de versión a usar en el smoke — importante

Usad **`min = 0.2.0`, `max = 0.2.x`**. Con ese patrón vuestra implementación y la mía coinciden,
así que el smoke pasa **sin necesidad de arreglar antes el bug 2.1**:

| | hub (`gte` + `satisfies`) | cliente | |
|---|---|---|---|
| `min=0.2.0, max=0.2.x`, nativo `0.2.0` | ✅ | ✅ | coinciden |
| `min=0.2.0, max=0.2.x`, nativo `0.2.3` | ✅ | ✅ | coinciden |
| `min=0.1.0, max=0.3.0`, nativo `0.2.0` | ❌ | ✅ | **divergen** ← el bug |

Es decir: **no os bloqueo con 2.1 para el smoke**, pero sigue siendo un bug que hay que arreglar
antes de publicar bundles con cotas peladas, porque en producción la forma natural de rellenar
los campos deja fuera a casi todos los dispositivos, en silencio. Detalle y arreglo propuesto en
`docs/handoffs/ota-bundles-js-hub-side.md`, sección 2.1.

---

## Puntos de bloqueo mutuo, explícitos

| Quién espera | A qué | Se puede evitar |
|---|---|---|
| Hub | nada para la FASE A | — |
| Hub | un binario publicado, para ver tráfico real de bundles | no |
| Cliente | `bundle_pubkey` cargada | no |
| Cliente | endpoint admin operativo para subir | podéis cargar el canario a mano en BD |
| Ambos | fix del 2.1 antes de **producción** | para el smoke sí, con las cotas de arriba |

## Lo que pido al hub, por prioridad

1. **FASE A completa** — con el canario, sin esperarme.
2. **Fix 2.1** — antes de publicar bundles de verdad, no antes del smoke.
3. **Verificar la firma al subir** — hoy se guarda sin comprobar, y una firma mal generada sólo
   se descubre en el dispositivo, en silencio. El snippet de A.1 es exactamente lo que hace falta.
4. **`POST /api/bundles/:id/report`** — el cliente ya revierte solo por dos vías; sin este
   endpoint, un rollback en el bar es indistinguible desde el hub de que nunca se aplicó.

## Contacto entre sesiones

Cambios del contrato del manifest: se tocan **los dos** documentos o no se toca ninguno —
`docs/ota/canal-parcial.md` (aquí) y `docs/handoffs/ota-bundles-js-hub-side.md` (allí).
