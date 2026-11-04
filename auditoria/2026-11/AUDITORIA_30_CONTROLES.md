# Auditoría de 30 controles: jfsolutionsq.com

| Campo | Valor |
|---|---|
| Proyecto | jfsolutionsq.com (repositorio `Jforero-creator/jf-solutions-web`, proyecto Vercel `jf-solutions`) |
| Rama | `audit-remediation-2026-11` (desde `main` @ `9285e42`) |
| Fecha | 3 de noviembre de 2026 |
| Método | PDCA. Revisión del código real, cabeceras servidas en producción (consulta autenticada de solo lectura vía Vercel), pruebas locales automatizadas |
| Estado | Preparado para revisión. **No fusionado. No desplegado en producción.** |

**Estados:** Conforme · No conforme · Parcial · No verificado · No aplica justificado.
La columna *Antes* refleja `main` (producción). La columna *Después* refleja la rama. Si un cambio está preparado pero depende de una decisión del propietario o del despliegue, el estado *Después* lo indica. Ningún control se declara validado en producción: la rama no se ha desplegado.

## Matriz

| # | Control | Antes | Después (rama) | Evidencia | CAPA |
|---|---|---|---|---|---|
| 1 | C-01 Integración Web3Forms (clave, antispam, documentación) | Parcial | Parcial (pendiente clave de producción y envío real) | La clave pública está en `index.html` y `assets/servicios.js`. Según la documentación de Web3Forms, la clave no es secreta. El honeypot `botcheck` se envía (`false` en las pruebas). La restricción de dominio es función **Pro** y no está activa. La clave no se modificó. **Actualización del 4-nov:** se añadió Cloudflare Turnstile (gratis), verificado en el servidor por `api/contact.js` antes de reenviar a Web3Forms. Además, la clave de Web3Forms ya no viaja en el navegador. Pruebas API 11/11 y navegador 35/35. Falta la clave de sitio de producción y el envío real. | CAPA-01 |
| 2 | C-02 Privacidad: política publicada ES/EN | No conforme | Parcial | Se crearon `/privacidad/` y `/en/privacy/`, enlazadas desde el pie y desde el formulario. Son un **borrador pendiente de aprobación legal del propietario**. | CAPA-02 |
| 3 | C-02 Consentimiento de analítica funcional (no solo visual) | No conforme | Conforme (local) | Antes: `gtag.js` se descargaba y creaba `_ga` sin decisión del usuario (prueba B-GA). Después: 6/6 pruebas C02 pasan. GA no carga sin aceptar, rechazar no deja cookies, aceptar carga GA una sola vez y retirar el consentimiento borra `_ga`. | CAPA-03 |
| 4 | C-03 Content-Security-Policy | No conforme | Conforme (local) | Producción no envía CSP (cabeceras capturadas el 03-nov). La rama declara una CSP en `vercel.json`. Con GA aceptado no hubo violaciones en 13 páginas (C03-1) ni errores JS (C03-2). | CAPA-04 |
| 5 | C-03 Strict-Transport-Security | Conforme | Conforme | Producción ya envía `strict-transport-security: max-age=63072000` (Vercel). No se modificó. | — |
| 6 | C-03 X-Content-Type-Options | No conforme | Conforme (local) | No aparecía en las respuestas HTML de producción. Ahora se declara `nosniff` para todas las rutas. | CAPA-04 |
| 7 | C-03 Referrer-Policy | No conforme | Conforme (local) | Ahora `strict-origin-when-cross-origin`. | CAPA-04 |
| 8 | C-03 Permissions-Policy y protección contra iframes | No conforme | Conforme (local) | Ahora cámara, micrófono, geolocalización, pago y USB están desactivados, más `X-Frame-Options: DENY` y `frame-ancestors 'none'`. | CAPA-04 |
| 9 | C-04 Validación y campos obligatorios | Parcial | Conforme (local) | Antes: el mensaje de error no tenía `role="alert"` (inicio), no se usaba `aria-invalid` y el foco no se movía. Después: C04-val pasa en 3 formularios (inicio, servicio ES, servicios EN). | CAPA-05 |
| 10 | C-04 Envío correcto y respuesta ante fallos | Parcial | Conforme (local, simulado) | Éxito, error 400 y sin conexión se probaron con Web3Forms simulado. Se añadió un tiempo límite de 15 s. **No se hizo un envío real a Web3Forms**: requiere autorización (ver RIESGOS). | CAPA-05 |
| 11 | C-04 Prevención de envíos duplicados | Parcial | Conforme (local) | El botón ya se desactivaba. Se añadió una guarda explícita y 3 clics rápidos producen 1 solo envío (C04-dup). | CAPA-05 |
| 12 | C-04 Enlaces alternativos WhatsApp / Gmail / Outlook | No conforme | Conforme (local) | **Defecto encontrado:** `window.open(...,'noopener')` siempre devuelve `null`, así que la pestaña del sitio también navegaba a WhatsApp (B-WA). Corregido en ambos scripts (C04-wa). Mailto, Gmail y Outlook se generan correctamente (C04-mailto). | CAPA-06 |
| 13 | C-04 Inyección de HTML en el mensaje de éxito | No conforme | Conforme (local) | El correo escrito se insertaba sin escapar en `innerHTML` (B-XSS, auto-XSS de baja severidad). Ahora se inserta con `textContent` (C04-xss, A-XSS). | CAPA-07 |
| 14 | C-04 Funcionamiento en iPhone / Android / escritorio | No verificado | Parcial (pendiente prueba en dispositivos físicos) | Se probó con emulación Chromium de iPhone 13 y Pixel 7 (C04-iPhone 13, C04-Pixel 7) y en escritorio. **No se probaron dispositivos físicos ni Safari/WebKit reales.** | RIESGOS R-05 |
| 15 | C-05 Integridad de enlaces internos | Conforme | Conforme | Linkinator: 0 enlaces internos rotos. El único 404 local es `/_vercel/insights/script.js`, que solo existe en Vercel y responde 200 en producción. No hay anclas rotas. | — |
| 16 | C-05 Enlaces externos (redes, ORA, Fiverr, WhatsApp) | No verificado | No verificado | El entorno de pruebas no tiene salida a esos dominios (proxy). Las URL están documentadas en PRUEBAS. El propietario debe comprobarlas manualmente. | RIESGOS R-06 |
| 17 | C-06 Títulos, descripciones, canónicas, OG/Twitter | Parcial | Conforme | Las 10 URL del sitemap tienen título único, descripción, canónica y OG. `manos.html` no tenía `og:image`, `twitter:card` ni favicon: añadidos. | CAPA-08 |
| 18 | C-06 Un H1 principal por página y jerarquía | No conforme | Conforme | El inicio tenía 6 H1 (4 de subpáginas de división + ES/EN). Ahora tiene uno visible por idioma y los títulos de división son H2 con el mismo estilo (C06-h1, C06-layer). | CAPA-08 |
| 19 | C-06 hreflang ES/EN | Conforme | Conforme | Las páginas de servicios y el sitemap ya declaraban es/en/x-default. Las nuevas páginas de privacidad siguen el mismo patrón. El inicio es bilingüe en una sola URL, así que no aplica un par hreflang. | — |
| 20 | C-07 Sitemap y robots.txt | Conforme | Conforme | Los 10 `loc` responden 200 localmente. robots permite todo y apunta al sitemap. Se añadieron las 2 páginas de privacidad y la fecha `lastmod`. XML validado. | — |
| 21 | C-08 Página 404 | No conforme | Conforme (local) | Producción devolvía el texto plano `NOT_FOUND` de Vercel. Ahora `404.html` tiene la identidad navy/dorado, `noindex` y navegación de regreso (C08-404). | CAPA-09 |
| 22 | C-09 Rendimiento móvil (Lighthouse) | Parcial | Conforme (laboratorio) | Mediana de 3 corridas, móvil: rendimiento 89 → 95, LCP 3,08 → 2,57 s, FCP 2,73 → 2,14 s, CLS 0 → 0. HTML del inicio 277 → 162 KB. Los datos de campo (CrUX/INP) no están disponibles. | CAPA-10 |
| 23 | C-09 Videos y peso multimedia | Parcial | Conforme (local) | 2 de 3 videos servían 1080p (8–10 MB) en celular. Se crearon versiones de 720p (2,6–2,7 MB) solo para pantallas de 768 px o menos. El escritorio no cambia (C09-vid-desk). | CAPA-10 |
| 24 | C-09 prefers-reduced-motion | Conforme | Conforme | Ya existían reglas CSS y JS que detienen animaciones y la reproducción automática. No se modificó. | — |
| 25 | C-10 WCAG 2.2 AA (automatizado) | Parcial | Conforme (automatizado) | axe-core: antes había 1 violación de contraste (etiqueta CRÍTICO, 3,72:1). Después, 0 violaciones en 44 escenarios (11 páginas × ES/EN × móvil/escritorio). Lighthouse Accesibilidad 97 → 100. | CAPA-11 |
| 26 | C-10 Teclado, foco, saltar contenido, menú y selector de idioma | Parcial | Parcial | Se añadió "Saltar al contenido" en el inicio (C10-skip). El foco visible ya existía (`:focus-visible` dorado). **Queda pendiente** una prueba manual con lector de pantalla (VoiceOver/NVDA) y del menú desplegable de Servicios con teclado. | RIESGOS R-07 |
| 27 | Analítica: GA4 vs GTM, Meta Pixel, mapas de calor | Parcial | Conforme | Se carga **gtag.js de GA4** (`G-VCKX3PTT1D`) desde el dominio googletagmanager.com. **No hay contenedor de Google Tag Manager (GTM-…)**. No hay Meta Pixel, Hotjar ni Clarity (búsqueda en el código: 0 coincidencias). Vercel Web Analytics está activo y no usa cookies. No se añadieron rastreadores. | — |
| 28 | Secretos privados en el repositorio | Conforme | Conforme | Búsqueda de patrones (claves AWS/Stripe/GitHub/Google, llaves privadas, contraseñas y tokens): 0 hallazgos. Solo aparece la clave pública de Web3Forms, que es pública por diseño. | — |
| 29 | HTTPS, DNS y redirecciones | Conforme | Conforme | `jfsolutionsq.com` redirige con 308 a `www.jfsolutionsq.com` (configuración de dominio en Vercel, verificado). HSTS está activo. No se tocaron el DNS ni los dominios. **Google Search Console: No verificado** (no hay acceso). | RIESGOS R-08 |
| 30 | Operación: backups, rollback, monitoreo, dependencias, términos y caché | Parcial | Parcial | Vercel tiene historial de despliegues con *rollback candidates* y GitHub tiene el historial de git. No hubo errores de ejecución en 7 días. No hay alertas de caída. No hay dependencias npm (sitio estático, sin `package.json`), así que no hay vulnerabilidades de dependencias. Términos y condiciones: No aplica justificado (sin venta en línea; la contratación es por propuesta y Fiverr). Se añadió caché para `/media` y `/assets`. El monitoreo externo queda como propuesta. | PLAN_ROLLBACK, RIESGOS R-09 |

## Resumen

| Estado | Antes | Después (rama) |
|---|---|---|
| Conforme | 7 | 24 |
| Parcial | 11 | 5 |
| No conforme | 10 | 0 |
| No verificado | 2 | 1 |
| **Total** | **30** | **30** |

"Conforme (local)" significa que se demostró en un servidor local que reproduce las cabeceras de `vercel.json`. La confirmación en el despliegue de vista previa de Vercel y después en producción está en PRUEBAS_Y_EVIDENCIAS §6 y RIESGOS.
