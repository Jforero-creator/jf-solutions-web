# CAPA: sitio web JF Solutions (auditoría 2026-11)

Severidad: **Alta** (riesgo legal, de seguridad o de pérdida de clientes potenciales) · **Media** · **Baja**.
Estado: *Implementado en rama*, que significa corregido y probado localmente pero no desplegado · *Pendiente del propietario* · *Abierto*.
Responsable propuesto: **JF** = José Luis Forero (propietario), **Dev** = quien mantenga el código (hoy, JF con Claude).

---

### CAPA-01: Web3Forms sin restricción de dominio ni CAPTCHA
- **Evidencia:** `W3F_KEY` en `index.html` y `assets/servicios.js`. El honeypot `botcheck` es la única protección del lado del sitio. La documentación de Web3Forms indica que la clave no es secreta, que la restricción de dominio es una función Pro y que admite hCaptcha, reCAPTCHA y Turnstile.
- **Impacto:** un tercero puede copiar la clave y enviar spam al buzón. No hay fuga de datos.
- **Severidad:** Baja.
- **Causa raíz:** el plan gratuito de Web3Forms no incluye restricción de dominio y no se configuró un CAPTCHA.
- **Acción correctiva (4-nov, opción elegida por el propietario):** Cloudflare Turnstile, gratuito y verificado en el servidor.
  - `assets/turnstile.js` muestra el widget.
  - `api/contact.js`, una Vercel Function sin dependencias, comprueba el origen, el honeypot, los campos y el token contra `challenges.cloudflare.com/turnstile/v0/siteverify`, y solo entonces reenvía a Web3Forms con la clave intacta.
  - Se descartó Turnstile verificado por Web3Forms porque es función Pro.
  - En Production la función falla de forma cerrada si falta `TURNSTILE_SECRET_KEY`.
  - Las vistas previas usan las claves de prueba oficiales de Cloudflare.
- **Acción preventiva:** el propietario decide entre (a) mantener solo el honeypot y vigilar el volumen de spam, (b) activar hCaptcha (requiere añadir su dominio a la CSP y un widget en los 9 formularios) o (c) contratar Pro y restringir a `www.jfsolutionsq.com`.
- **Responsable:** JF (decisión y cuenta), Dev (implementación).
- **Criterio de aceptación:** API-1…11 y C01-ts/ts2 en verde (cumplido); un envío real desde la vista previa llega al buzón; la clave de sitio y la clave secreta de producción están configuradas.
- **Estado:** Implementado en rama. **Pendiente del propietario:** cuenta gratuita de Cloudflare, `SITE_KEY_PROD` en `assets/turnstile.js` y `TURNSTILE_SECRET_KEY` en Vercel (solo Production). Recomendado después: rotar la clave de Web3Forms y guardarla en `WEB3FORMS_ACCESS_KEY`, porque la clave actual ya fue pública.

### CAPA-02: No existía política de privacidad
- **Evidencia:** no había ninguna página ni enlace de privacidad en `main`, aunque el formulario recoge nombre, correo, teléfono y mensaje y GA4 está activo.
- **Impacto:** incumplimiento probable de expectativas legales (por ejemplo, la ley de privacidad de datos de Nueva Jersey y las condiciones de uso de Google Analytics) y pérdida de confianza.
- **Severidad:** Alta.
- **Causa raíz:** el sitio creció (formulario, GA4) sin una revisión de privacidad.
- **Acción correctiva:** borradores `/privacidad/` y `/en/privacy/` con datos, finalidades, proveedores, cookies, conservación (24 meses propuestos), derechos y contacto. Se enlazan desde el pie de todas las páginas que tienen pie y desde los 9 formularios.
- **Acción preventiva:** revisar la política cada vez que se añada un proveedor o formulario (ver lista de comprobación en RIESGOS).
- **Responsable:** JF (aprobación legal).
- **Criterio de aceptación:** texto aprobado por el propietario o su asesor; plazo de conservación confirmado; la nota `BORRADOR` del HTML se retira.
- **Estado:** Implementado en rama como borrador. **Pendiente de aprobación del propietario.**

### CAPA-03: Google Analytics se activaba sin consentimiento
- **Evidencia:** prueba B-GA en `main`: `gtag.js` se descarga y crea `_ga` al cargar la página, sin ninguna interacción.
- **Impacto:** recogida de datos sin base de consentimiento.
- **Severidad:** Alta.
- **Causa raíz:** el fragmento estándar de GA se pegó directamente en `<head>` (commit `9285e42`, "Instalar Google Analytics 4").
- **Acción correctiva:** `assets/consent.js` (sin dependencias). GA solo se inyecta tras "Aceptar". "Rechazar" no carga nada. La decisión se recuerda. El enlace "Preferencias de cookies" permite cambiarla. Retirar el consentimiento borra `_ga*` y recarga la página.
- **Acción preventiva:** cualquier etiqueta futura (Pixel, GTM, etc.) debe cargarse desde `consent.js`, nunca pegarse en `<head>`.
- **Responsable:** Dev.
- **Criterio de aceptación:** las 6 pruebas C02 pasan. En la vista previa de Vercel, la pestaña Red no muestra `googletagmanager.com` antes de aceptar.
- **Estado:** Implementado en rama (local 6/6).

### CAPA-04: Faltaban cabeceras de seguridad
- **Evidencia:** las cabeceras de `https://www.jfsolutionsq.com/` (03-nov, 12:24 UTC) solo incluían HSTS. No había CSP, nosniff, Referrer-Policy, Permissions-Policy ni protección contra iframes.
- **Impacto:** mayor superficie ante inyección de scripts, *clickjacking* y fuga de referencias.
- **Severidad:** Media.
- **Causa raíz:** `vercel.json` solo declaraba `trailingSlash`.
- **Acción correctiva:** bloque `headers` en `vercel.json` con una CSP que solo permite este sitio, GA, Web3Forms, Google Fonts y Unsplash, más nosniff, `X-Frame-Options: DENY`, Referrer-Policy y Permissions-Policy.
- **Acción preventiva:** si se añade un servicio externo, ampliar la CSP y volver a ejecutar la prueba C03-1. Más adelante, sustituir `'unsafe-inline'` por *hashes* (RIESGOS R-03).
- **Responsable:** Dev.
- **Criterio de aceptación:** 0 violaciones de CSP en 13 páginas (local: cumplido). Las cabeceras están presentes en la vista previa de Vercel.
- **Estado:** Implementado en rama.

### CAPA-05: Accesibilidad y robustez del formulario
- **Evidencia:** prueba B-VAL. El error no tenía `role="alert"` en el inicio, no había `aria-invalid` y el foco no se movía. Tampoco había tiempo límite de red ni límites de longitud.
- **Impacto:** los usuarios de lector de pantalla no se enteran del error y una red lenta deja el botón en "Enviando…" de forma indefinida.
- **Severidad:** Media.
- **Causa raíz:** validación personalizada (`novalidate`) sin semántica ARIA.
- **Acción correctiva:** `role="alert"`, `aria-invalid` y `aria-describedby` en los campos con error, foco en el primer error, `required`/`aria-required`, `maxlength`, `AbortController` de 15 s y guarda contra doble envío.
- **Acción preventiva:** usar el mismo patrón en cualquier formulario nuevo.
- **Responsable:** Dev.
- **Criterio de aceptación:** pruebas C04 (val, mail, ok, err, down, dup, en) en verde.
- **Estado:** Implementado en rama.

### CAPA-06: "Enviar por WhatsApp" sacaba al usuario del sitio
- **Evidencia:** prueba B-WA. Tras el clic, la pestaña original queda en `wa.me/...` además de abrirse una pestaña nueva.
- **Impacto:** el visitante pierde la página y el mensaje de confirmación.
- **Severidad:** Media.
- **Causa raíz:** según la especificación HTML, `window.open(url,'_blank','noopener')` devuelve `null`, así que la rama de respaldo `location.href=…` se ejecutaba siempre.
- **Acción correctiva:** abrir con `window.open(url,'_blank')`, anular `opener` y usar el respaldo solo si el navegador bloquea la ventana.
- **Acción preventiva:** no condicionar la lógica al valor que devuelve `window.open` cuando se usa `noopener`.
- **Responsable:** Dev.
- **Criterio de aceptación:** C04-wa pasa (pestaña conservada = True).
- **Estado:** Implementado en rama.

### CAPA-07: HTML del campo correo insertado sin escapar
- **Evidencia:** prueba B-XSS. Con el correo `a@b.co<img/src=x/onerror=…>`, el mensaje de éxito contenía un `<img>` real.
- **Impacto:** auto-XSS. Solo afecta a quien lo escribe en su propio navegador, así que el riesgo práctico es bajo, pero es una mala práctica.
- **Severidad:** Baja.
- **Causa raíz:** concatenación en `innerHTML` (inicio). Las páginas de servicio ya usaban `esc()`.
- **Acción correctiva:** el correo se inserta con `textContent`.
- **Acción preventiva:** nunca concatenar en `innerHTML` datos escritos por el usuario.
- **Responsable:** Dev.
- **Criterio de aceptación:** C04-xss y A-XSS pasan.
- **Estado:** Implementado en rama.

### CAPA-08: Estructura SEO del inicio y de manos.html
- **Evidencia:** 6 elementos `<h1>` en el inicio. `manos.html` sin `og:image`, `twitter:card` ni favicon.
- **Impacto:** señales de jerarquía confusas y vista previa social sin imagen.
- **Severidad:** Baja.
- **Causa raíz:** las subpáginas de división (`:target`) se diseñaron como páginas independientes dentro del mismo HTML.
- **Acción correctiva:** los títulos de división pasan a `<h2 class="layer-title">` con el mismo aspecto visual. Se completaron los metadatos de `manos.html`.
- **Acción preventiva:** ejecutar `seo_audit.py` (ver PRUEBAS) antes de cada cambio de contenido.
- **Responsable:** Dev.
- **Criterio de aceptación:** C06-h1 y C06-layer pasan; el aspecto es idéntico.
- **Estado:** Implementado en rama.

### CAPA-09: Página 404 genérica
- **Evidencia:** respuesta de producción `404 text/plain "The page could not be found NOT_FOUND"`.
- **Impacto:** el visitante que llega por un enlace viejo abandona el sitio.
- **Severidad:** Baja.
- **Causa raíz:** no existía `404.html`.
- **Acción correctiva:** `404.html` bilingüe con la identidad navy/dorado, `noindex` y enlaces a inicio, servicios ES/EN y contacto.
- **Acción preventiva:** ninguna adicional.
- **Responsable:** Dev.
- **Criterio de aceptación:** C08-404 pasa; en la vista previa de Vercel, una ruta inexistente muestra la página.
- **Estado:** Implementado en rama.

### CAPA-10: Peso del inicio y de los videos en móvil
- **Evidencia:** `index.html` pesaba 277 KB, de los cuales unos 118 KB eran 3 imágenes Base64. `holds.mp4` (9,9 MB) y `utilidades.mp4` (8,8 MB) a 1080p se servían también en celular.
- **Impacto:** LCP de 3,1 s en móvil simulado y consumo de datos.
- **Severidad:** Media.
- **Causa raíz:** imágenes incrustadas que no se pueden cachear por separado ni cargar en diferido, y falta de variante móvil para 2 de 3 videos.
- **Acción correctiva:** imágenes a `/assets` (WebP + JPG de respaldo, carga diferida) y variantes de 720p (`-720.mp4`, CRF 28, faststart) con `<source media>`, igual que ya hacía `empleo`. Caché de 30 días para `/media` y de 1 h (+ revalidación) para `/assets`.
- **Acción preventiva:** no incrustar imágenes en Base64; cada video nuevo lleva su variante de 720p.
- **Responsable:** Dev.
- **Criterio de aceptación:** Lighthouse móvil sin pérdida y con LCP menor (cumplido: 89 → 95, LCP 3,08 → 2,57 s); los videos móviles usan 720p (C04-iPhone 13 / Pixel 7).
- **Estado:** Implementado en rama.

### CAPA-11: Contraste insuficiente en la etiqueta "CRÍTICO"
- **Evidencia:** axe-core `color-contrast` serious, 3,72:1 (blanco sobre #E0574A, 11 px).
- **Impacto:** incumple WCAG 1.4.3.
- **Severidad:** Baja.
- **Causa raíz:** se usó el rojo de "hold" como fondo de texto pequeño.
- **Acción correctiva:** el fondo de la etiqueta pasa a #B83A2E (5,7:1, supera el mínimo de 4,5:1). La variable `--hold` no cambia en el resto del sitio.
- **Acción preventiva:** ejecutar axe en cada cambio visual.
- **Responsable:** Dev.
- **Criterio de aceptación:** 0 violaciones axe (cumplido, 44 escenarios).
- **Estado:** Implementado en rama.
