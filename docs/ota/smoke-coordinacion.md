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

## FASE B — Publicar un binario nuevo (lado tpv-el-haido2) — ✅ HECHA

**0.1.1 y después 0.1.2 publicadas** el 2026-08-21 (lo vigente es 0.1.2). Build nativo en `supermicro-pcbar`, firmado y subido.
El endpoint responde 200 a un 0.1.0 y 204 a un 0.1.1. **Pero no es instalable todavía**: ver el
bloqueante de la URL relativa más abajo.

1. Bump de versión `0.1.0 → 0.2.0` en `package.json` y `src-tauri/tauri.conf.json`.
2. Build nativo linux-x64 (en `supermicro-pcbar`, que es el builder) vía `build-release.ts`.
3. `release.ts auth login` (Pocket ID) y `release.ts publish --target linux-x64 --slug haido`.
4. El TPV instalado lo detecta por el canal nativo. **Ojo, no se instala solo**: `UpdateChecker`
   consulta al arrancar y cada hora, y abre un diálogo que alguien tiene que aceptar. Así que
   entre publicar y ver el binario nuevo corriendo puede pasar hasta una hora, más el clic.

**Dos avisos que os afectan:**

- **La primera actualización, cuando se acepte, borra el `localStorage` del dispositivo** (onboarding, tema, modo
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

### ✅ Paso 1 HECHO — bundle empaquetado y entregado

En vuestro repo: `docs/handoffs/fixtures/ota-fase-c/` (`bundle.zip` + `manifest.json`).

Frontend real de 0.1.1, 15.98 MB, firmado con la clave del proyecto. Verificado por dos vías:
hash y firma comprobados de forma independiente con WebCrypto, y **pasado por el mismo `stage`
que ejecuta el cliente** (descomprime, `index.html` en la raíz, 64 entradas, ventana OK).

```json
```

**Ventana `0.1.1 .. 0.1.x` a propósito**: cubre 0.1.1 y cualquier 0.1.z posterior, así que si
sale un 0.1.2 no hay que reempaquetar ni resubir.

Campos para el multipart de admin:

| Campo | Valor |
|---|---|
| `bundleVersion` | `2026.08.21-3` |
| `minNativeVersion` | `0.1.1` |
| `maxNativeVersion` | `0.1.x` |
| `signature` | el del `manifest.json` |
| `bundle` | el `bundle.zip` |

El `hash` no se manda: lo recalculáis vosotros sobre los bytes subidos.

> **Antes de subirlo, ojo al orden**: en cuanto esté cargado, el primer TPV que corra 0.1.1 se
> lo llevará en ≤5 min. Si preferís encadenarlo con que el bar acepte primero el update nativo,
> subidlo cuando lo digáis; por mi parte está listo.

### Cotas de versión — ya no hay restricción

El bug 2.1 **está arreglado** (`bcda900`): el hub trata ahora una cota superior pelada como
`lte` y sólo usa `satisfies` cuando es un rango, que es exactamente la regla del cliente.

Verificado con un test diferencial: catorce casos generados ejecutando la implementación real
del hub y comprobados contra la del cliente (`manifest.rs::coincide_con_la_ventana_del_hub`).
Coinciden en todos, incluido el que antes divergía — nativo `1.5.9` en la ventana
`[1.4.0, 1.6.0]`, que antes el hub no servía.

Ese test es la defensa contra que uno de los dos lados cambie de criterio más adelante. Si se
toca la lógica de ventana en el hub, hay que regenerar la tabla y pasarla.

---

## 🔴 BLOQUEANTE ENCONTRADO AL PUBLICAR 0.1.1 — `url` relativa en el canal NATIVO

**Estado**: 0.1.1 está **publicado y servido**, pero **ningún TPV puede instalarlo**.

`GET /api/updates/linux/x86_64/0.1.0` responde 200 con:

```json
{
  "version": "0.1.1",
  "url": "/api/dl/0.1.1/linux/x86_64/tpv-haido-0.1.1-linux-x64.AppImage",
  "signature": "dW50cnVzdGVkIGNvbW1lbnQ6…"
}
```

La `url` es **relativa**, y `tauri-plugin-updater` la deserializa en un campo de tipo
`url::Url` (`ReleaseManifestPlatform.url`, updater.rs:74). Ese tipo **no puede representar una
referencia relativa**: la respuesta entera falla al parsear y el chequeo de actualización muere
antes de descargar nada.

Comprobado, no deducido — deserializando con el mismo tipo que usa el plugin:

```
"/api/dl/0.1.1/linux/x86_64/tpv-haido-0.1.1-linux-x64.AppImage"   -> Err (relative URL without a base)
"https://haido.releases.mks2508.systems/api/dl/…/x.AppImage"      -> Ok
```

### El arreglo ya lo tenéis escrito

Es exactamente lo que hace vuestro `toManifest` en `routes/tenant/bundles.ts`: componer la
absoluta con `Host` + `x-forwarded-proto`. El canal de bundles lo hace bien; el de updates, que
es más antiguo, devuelve la fila de BD tal cual. Hay que aplicar el mismo tratamiento en
`routes/tenant/updates.ts` (o en `UpdateService.checkUpdate`).

Detrás de un proxy que termina TLS, el esquema tiene que salir de `x-forwarded-proto` y no de
`request.url`, porque Bun sólo ve el salto en http plano — vuestro comentario en `toManifest` ya
lo dice.

### Cómo verificar que quedó arreglado

```bash
curl -s https://haido.releases.mks2508.systems/api/updates/linux/x86_64/0.1.0 \
  | grep -o '"url":"[^"]*"'
# debe empezar por https://, no por /api
```

Con eso el TPV del bar recoge 0.1.1 en su siguiente chequeo (al arrancar o cada hora) sin que
haya que republicar nada: el artefacto y la firma ya están subidos y son correctos.

### Nota sobre la firma, para descartar sospechas

El AppImage de 0.1.1 se re-empaqueta durante el build (arreglo de aceleración gráfica) y se
**vuelve a firmar después** del repack. Verificado en el artefacto publicado: la firma es
posterior al fichero, el hook parcheado sobrevive al re-empaquetado, y el binario arranca con
aceleración real (172 MiB de GPU, cero errores GBM). Si al arreglar la URL el updater se
quejara de la firma, el problema no sería ese paso.

## Puntos de bloqueo mutuo, explícitos

| Quién espera | A qué | Se puede evitar |
|---|---|---|
| Hub | nada para la FASE A | — |
| Hub | un binario publicado, para ver tráfico real de bundles | no |
| Cliente | `bundle_pubkey` cargada | no |
| Cliente | endpoint admin operativo para subir | podéis cargar el canario a mano en BD |
| ~~Ambos~~ | ~~fix del 2.1~~ | **resuelto** (`bcda900`), equivalencia verificada |

## Lo que pido al hub, por prioridad

1. **FASE A completa** — con el canario, sin esperarme.
2. **`POST /api/bundles/:id/report`** — lo único de la lista original que sigue abierto. El
   cliente ya revierte solo por dos vías; sin este endpoint, un rollback en el bar es
   indistinguible desde el hub de que nunca se aplicó.

Ya resuelto por vuestro lado desde que escribí el handoff: fix de la ventana (2.1), rechazo de
rangos con `||` (2.3), verificación de firma al subir (3.1) y chequeo de `index.html` (3.2).
Comprobado leyendo `bcda900`, no supuesto.

### Aspereza menor del contrato: el manifest no expone el id del bundle

`POST /api/bundles/:id/report` resuelve `:id` contra `bundles.id` (el UUID), pero `toManifest`
no incluye ese campo: el cliente sólo recibe `bundleVersion`. El UUID llega igualmente porque
la url de descarga se compone como `/api/bundles/<uuid>/download`, así que **el cliente lo
extrae de ahí** y ya reporta correctamente — no os bloquea.

Sería más limpio añadir `"id": bundle.id` al manifest y que el cliente dejara de depender de la
forma de la url. Si lo hacéis, avisad y lo cambio; mientras tanto **la forma de esa url es
contrato de facto**. La extracción del cliente es estricta: ante una url con otra forma no
reporta, en lugar de reportar contra un id inventado.

---

## ⚠️ ACTUALIZACIÓN 2026-08-21 — 0.1.2 publicada y **rotación de signing key**

Lo que ha cambiado desde que disteis FASE C por desbloqueada. Hay una consecuencia que os
afecta directamente aunque el problema sea de nuestro lado.

### Lo publicado ahora es 0.1.2, no 0.1.1

`GET /api/updates/linux/x86_64/0.1.0` devuelve **0.1.2**. Trae el reporte al hub
(`POST /api/bundles/:id/report`), así que en cuanto corra en el bar tendréis telemetría de
aplicación y rollback.

### 🔴 El TPV del bar NO se va a actualizar solo. No es un fallo vuestro

Se rotó la signing key del updater. El TPV instalado corre un binario con la pubkey **antigua**
compilada dentro, y `tauri-plugin-updater` verifica la firma contra la pubkey **del cliente**,
no contra la del servidor:

```
pubkey del binario instalado en el bar : RWTSIzayxELfO5VU…
pubkey con la que se firma 0.1.2       : RWSxu04zRL8L250w…
```

**Una rotación de clave no se puede atravesar por auto-update.** El bar rechazará la firma de
0.1.2 haga lo que haga el hub. Hace falta **una reinstalación manual** (por SSH, ya preparada);
a partir de ahí el binario lleva la pubkey nueva y el canal queda sano para siempre.

La passphrase de la clave antigua se perdió — comprobado firmando contra cada candidata,
incluidas tres copias apartadas: sólo abre la nueva. Por eso no se pudo firmar con la vieja.

**Lo que significa para vosotros**: si estáis esperando ver el primer
`GET /api/bundles/latest` de un dispositivo real, **no va a llegar hasta que se haga esa
reinstalación**. Si veis silencio en el canal de bundles, es esto y no un problema del hub.

### 🟡 0.1.1 sigue descargable y es una trampa

`GET /api/dl/0.1.1/...` responde 206. Ese artefacto se firmó con la clave **antigua** y su
binario embebe la pubkey antigua: **quien lo instale queda en el mismo callejón sin salida** —
no podrá auto-actualizarse a 0.1.2 ni a nada posterior.

Ya no se ofrece por `/api/updates` (latest es 0.1.2), así que el riesgo es sólo de instalación
manual o de un enlace de descarga directo.

**Sugerencia**: hacedle `yank` a 0.1.1, o quitadlo de donde se listen descargas. Es la única
versión publicada que deja al dispositivo sin salida.

### Estado del bundle de FASE C

Sigue **válido y sin tocar**: su ventana `0.1.1 .. 0.1.x` cubre 0.1.2, así que no hay que
reempaquetar ni resubir nada. Los campos de subida son los mismos que ya están más arriba.

### Lo que veréis cuando el bar corra 0.1.2

| Cuándo | Qué |
|---|---|
| Al minuto del arranque | `GET /api/bundles/latest?nativeVersion=0.1.2&deviceId=4fd659…` |
| Si hay bundle aplicable | descarga, y aplicación cuando la caja esté quieta |
| Tras confirmar | `POST /api/bundles/<uuid>/report` con `outcome: "applied"` |
| Si el bundle falla | mismo endpoint con `"rolled-back"` y el motivo en `error` |

El `deviceId` de esa máquina es `4fd659707ba01a3088cf949d419d55eba76d1e92d87eeab9c6dcb3863f49f9cd`
(sha256 de su `/etc/machine-id`), por si queréis pinearlo para las pruebas.

## Contacto entre sesiones

Cambios del contrato del manifest: se tocan **los dos** documentos o no se toca ninguno —
`docs/ota/canal-parcial.md` (aquí) y `docs/handoffs/ota-bundles-js-hub-side.md` (allí).
