# Informe de validación del PR #6 (4 de noviembre de 2026)

**Estado:** PR #6 **abierto y sin fusionar**. Nada se desplegó a producción. La política de privacidad sigue en BORRADOR.
**Rama:** `audit-remediation-2026-11`.
**Vista previa:** `jf-solutions-git-audit-remediation-2026-11-jose-forero.vercel.app`, protegida. El enlace temporal para compartir caduca el 5-nov a las 02:21 (hora de Nueva York).

## 1. Resumen por condición de la aprobación

| # | Condición | Resultado | Evidencia |
|---|---|---|---|
| 1 | Pruebas en iPhone y Android | **iPhone real: envío correcto** (3-nov, 23:05, versión con hCaptcha). **Faltan:** Android real, y WhatsApp y video en dispositivo real (sí probados en emulación). | Captura del propietario; `evidencias/capturas/`; C04-iPhone 13 / Pixel 7 |
| 2 | Política: 24 meses justificados con eliminación anticipada; respuesta en 30 días | **Hecho.** Sigue en BORRADOR. | `/privacidad/`, `/en/privacy/` |
| 3 | Antispam gratuito con honeypot | **Hecho con hCaptcha gratuito de Web3Forms**, elegido por el propietario tras P-1. Turnstile no es viable gratis con Web3Forms. | Navegador 35/35, axe 0 |
| 4 | Envío real de prueba | **Cumplido.** El segundo intento llegó al buzón (§2 bis). | Gmail: "New Service Request – JF Solutions" de `notify@web3forms.com`, 04:05:49 UTC |
| 5 | PR abierto, sin fusionar ni desplegar | **Cumplido** | PR #6 `open`, `merged: false` |

## 2. Problemas detectados y correcciones

| # | Problema | Corrección | Verificación |
|---|---|---|---|
| P-1 | **Prueba real en iPhone:** "No se pudo enviar". El registro de Vercel (03:28:15 UTC, función `/api/contact/`) dice `web3forms_error 403`: Web3Forms rechaza los envíos que llegan desde un servidor. Según una reseña independiente que cita su documentación, enviar desde servidor requiere plan de pago y lista de IP. | Se retiró la función y Turnstile. El navegador vuelve a enviar directo a Web3Forms, ahora con hCaptcha gratuito. | Registro de Vercel; C04-ok 3/3 |
| P-2 | Turnstile verificado por Web3Forms es de pago. | Descartado; ver P-1. | Documentación de Web3Forms |
| P-3 | hCaptcha solo es obligatorio si se **activa en el panel de Web3Forms**. Sin eso, el widget es solo visual. | No puedo hacerlo yo (es tu cuenta). Queda como requisito bloqueante R-02. | — |
| P-4 | Tras corregir un campo, seguía marcado en rojo. | La marca se quita al escribir. | Revisión visual y 35/35 |
| P-5 | Falso positivo de contraste en `manos.html` (axe midió durante una animación). | Se mide tras la animación: 0 violaciones en 44 escenarios. | `evidencias/axe-after.json` |
| P-6 | Lo bueno de P-1: cuando el envío falló, el sitio mostró un mensaje claro y ofreció WhatsApp y correo. No se perdió el contacto. | Ninguna (comportamiento correcto). | Tu captura |

## 2 bis. Evidencia del envío real (iPhone, 3-nov 23:05 hora de Nueva York)

| Comprobación | Resultado |
|---|---|
| Pantalla del iPhone | "Solicitud enviada" con el mensaje de confirmación (captura del propietario) |
| Llegada al buzón | 1 correo de `notify@web3forms.com` ("JF Solutions – Sitio web"), asunto **"New Service Request – JF Solutions"**, recibido a las 04:05:49 UTC, entregado a la cuenta de Gmail configurada en Web3Forms y visible en el buzón de Workspace. Un minuto de diferencia con la captura. |
| Campos recibidos | name, email, phone, company, division (Industrial Solutions), service (Por definir), reply_language (Español), message. **Ni el token de hCaptcha ni el honeypot aparecen en el correo.** |
| Datos usados | El propietario usó datos propios (nombre, teléfono y una dirección de iCloud enmascarada) en lugar de los ficticios propuestos. **No se copian a este repositorio.** |
| hCaptcha obligatorio | El envío del iPhone (23:05) se hizo **antes** de activar hCaptcha (23:14). Eso prueba la entrega con el token incluido, pero **no** que Web3Forms lo exija. El propietario lo activó a las 23:14 y lo desactivó a las 23:17 para no romper el formulario de producción (R-16). **Pendiente:** con hCaptcha activado, hacer un envío desde la vista previa (debe llegar). Después de fusionar, confirmar que un envío sin la casilla es rechazado. |

## 3. Qué hay que comprobar en la nueva prueba real (iPhone y Android)

Antes de empezar, activa hCaptcha en **app.web3forms.com → tu formulario → Settings → protección de spam → hCaptcha** y guarda.

1. Abre la vista previa (enlace en el chat). Si cargó antes, recárgala para tomar la versión nueva.
2. **Aviso de cookies:** pulsa Rechazar, recarga la página y comprueba que no vuelve a salir.
3. **Contacto:** pulsa "Enviar solicitud" con los campos vacíos; deben aparecer los errores.
4. Rellena con **datos ficticios**:
   - Nombre: `Prueba Auditoria iPhone` (o `Android`)
   - Correo: `prueba@example.com`
   - Mensaje: `Prueba de auditoría PR #6. No responder.`
5. Marca la casilla **"Soy humano"** de hCaptcha (puede pedirte elegir imágenes) y pulsa **Enviar solicitud**. Debe aparecer "Solicitud enviada".
6. **Enviar por WhatsApp:** debe abrir WhatsApp con el texto. No lo envíes.
7. **Video:** debe reproducirse sin sonido, y "Activar sonido" debe funcionar.

Cuando me avises, verifico en tu Gmail la llegada de los correos "New Service Request – JF Solutions" de `notify@web3forms.com` (por remitente y asunto, sin abrir otros correos) y cierro las condiciones 1 y 4.

## 4. Pendientes antes de la aprobación final

1. **Activar hCaptcha** en el panel de Web3Forms (R-02; bloquea la fusión).
2. **Repetir la prueba real** en iPhone y Android (§3).
3. Revisión final del texto de privacidad (sigue en BORRADOR).
