# Informe de validación del PR #6 (4 de noviembre de 2026)

**Estado:** PR #6 **abierto y sin fusionar**. Nada se desplegó a producción. La política de privacidad sigue en BORRADOR.
**Rama:** `audit-remediation-2026-11` @ `efb0714`.
**Vista previa:** `jf-solutions-git-audit-remediation-2026-11-jose-forero.vercel.app`, protegida por Vercel. El enlace temporal para compartir caduca el 5-nov a las 02:21 (hora de Nueva York).

## 1. Resumen por condición de la aprobación

| # | Condición | Resultado | Evidencia |
|---|---|---|---|
| 1 | Pruebas de la vista previa en iPhone y Android | **Parcial.** Hecho con emulación de Chromium (iPhone 13 y Pixel 7) sobre el mismo código. **Sin dispositivos físicos.** | `evidencias/capturas/evidencia-iphone13.png`, `evidencia-pixel7.png`; pruebas C04-iPhone 13 y C04-Pixel 7 |
| 2 | Política: 24 meses con justificación y eliminación anticipada; respuesta en 30 días | **Hecho.** Sigue en BORRADOR. | `/privacidad/`, `/en/privacy/` |
| 3 | Opción B: Turnstile gratuito + honeypot, sin servicios de pago | **Hecho, con ajuste técnico aprobado** (Turnstile verificado por una función propia; ver §2) | API 11/11, navegador 35/35 |
| 4 | Envío real de prueba con datos ficticios | **Pendiente.** Requiere un navegador real (ver §4). | — |
| 5 | PR abierto, sin fusionar ni desplegar | **Cumplido** | PR #6 `open`, `merged: false` |

## 2. Problemas detectados y correcciones realizadas

| # | Problema | Corrección | Verificación |
|---|---|---|---|
| P-1 | Según la documentación de Web3Forms, la verificación de Turnstile **es de pago (Pro)**. Un Turnstile sin esa verificación sería solo visual: un bot podría enviar directamente a la API. | Elegiste (4-nov) Turnstile + función propia. Se creó `api/contact.js` (Vercel Function, sin dependencias), que verifica el token con la API gratuita de Cloudflare y solo entonces reenvía a Web3Forms. | API-3, API-4: sin token o con token falso no se reenvía nada |
| P-2 | La clave de Web3Forms viajaba en el navegador. | Ahora solo la usa el servidor. El navegador envía a `/api/contact/` y la CSP ya no permite conexiones directas a Web3Forms. | C04-ok: `access_key_en_navegador=False` |
| P-3 | El honeypot solo existía en el cliente. | Se conserva en el formulario y además se comprueba en el servidor: si está marcado, se responde "éxito" sin enviar nada. | API-5 |
| P-4 | No había control de origen ni de tamaño en el envío. | La función solo acepta envíos desde jfsolutionsq.com, las vistas previas del proyecto y el entorno local. Limita longitudes (mensaje de 5000 caracteres) y elimina caracteres de control. | API-2, API-7 |
| P-5 | Riesgo de que producción funcione sin protección si falta configuración. | En Production, si falta `TURNSTILE_SECRET_KEY`, la función **rechaza** el envío (código `config`) en lugar de usar la clave de prueba. El visitante ve el mensaje de error con las alternativas de WhatsApp y correo. | API-10 |
| P-6 | Tras corregir un campo, seguía marcado en rojo hasta el siguiente envío (visto en las capturas). | La marca de error se quita al escribir en el campo. | Revisión visual y 35/35 |
| P-7 | Un análisis de accesibilidad marcó contraste bajo en `manos.html`. | **Falso positivo.** axe midió durante la animación de entrada de 0,35 s. Tras esperar a que terminara, hubo 0 violaciones en 44 escenarios. | `evidencias/axe-after.json` |
| P-8 | En las pruebas de Chrome, las herramientas de navegador del escritorio no estaban disponibles en esta sesión (Chrome sin conexión con la extensión; navegador integrado no vinculado). | No se pudo hacer el envío real desde aquí (§4). | — |

## 3. Evidencias de la vista previa de Vercel (verificadas desde aquí)

| Comprobación | Resultado |
|---|---|
| `/api/contact/` y `/api/contact` (GET) | **405** `{"success":false,"code":"method"}`, `Allow: POST`, `Cache-Control: no-store`. La función está desplegada y responde en ambas rutas (con y sin barra final). |
| CSP de la vista previa | Incluye `challenges.cloudflare.com` en `script-src` y `frame-src`; no incluye Web3Forms. |
| 404, cabeceras de seguridad, `.vercelignore` | Verificado el 3-nov (comentario en el PR). |

Capturas emuladas (iPhone 13 / Pixel 7, mismo código de la rama):

1. Aviso de cookies sobre la barra inferior, sin taparla.
2. Validación: mensaje en rojo, correo marcado.
3. Bloque "Verificación de seguridad" (en local, Turnstile está simulado).
4. "Solicitud enviada".
5. "Tu mensaje está listo" tras WhatsApp. La pestaña del sitio se conserva y se abre `wa.me/12012506729?text=…`.
6. Video `holds-720.mp4` reproduciéndose: 1280×720, avanzando a 1,45 s, sin pausa.

## 4. Lo que falta: pruebas que necesitan un dispositivo y un navegador reales

Desde este entorno no puedo usar un iPhone o un Android físicos, y la sesión no tiene salida a internet hacia Vercel, Cloudflare ni Web3Forms. Por eso el envío real tiene que hacerse desde un navegador real. Te propongo hacerlo tú en tu teléfono (así cubrimos a la vez las condiciones 1 y 4) y yo verifico el resultado:

1. Abre en el **iPhone** el enlace temporal de la vista previa (te lo paso en el chat).
2. Comprueba el **aviso de cookies**: Rechazar, recargar, que no vuelva a salir.
3. Ve a **Contacto** y pulsa "Enviar solicitud" con los campos vacíos: deben aparecer los errores.
4. Rellena con **datos ficticios**:
   - Nombre: `Prueba Auditoria iPhone`
   - Correo: `prueba@example.com`
   - Mensaje: `Prueba de auditoría PR #6. No responder.`

   La casilla de Cloudflare debe marcarse sola: en la vista previa usa la clave de prueba, que siempre pasa. Pulsa **Enviar solicitud**.
5. Pulsa **Enviar por WhatsApp**: debe abrir WhatsApp con el texto y **no enviarlo** tú.
6. Baja a un **video**: debe reproducirse sin sonido y el botón "Activar sonido" debe funcionar.
7. Repite los pasos 1 a 6 en el **Android** con el nombre `Prueba Auditoria Android`.

Cuando me avises, verifico:
- en tu Gmail, la llegada de los 2 correos "New Service Request – JF Solutions" desde `notify@web3forms.com`, por remitente y asunto, sin abrir otros correos;
- en los registros de Vercel, que la función respondió 200 sin errores.

Con eso cierro las condiciones 1 y 4 en este informe.

## 5. Acciones del propietario antes de la aprobación final

1. Hacer la prueba del §4 en el iPhone y el Android.
2. Crear la cuenta gratuita de Cloudflare → Turnstile → widget para `jfsolutionsq.com` y `www.jfsolutionsq.com`.
   - Me envías la **clave de sitio**, que es pública.
   - Guardas la **clave secreta** en Vercel como `TURNSTILE_SECRET_KEY`, solo en Production. No la compartas por chat.
3. Recomendado: generar una clave nueva de Web3Forms, guardarla como `WEB3FORMS_ACCESS_KEY` y autorizarme a retirar la antigua del código (R-14).
4. Revisión final del texto de privacidad (sigue en BORRADOR).
