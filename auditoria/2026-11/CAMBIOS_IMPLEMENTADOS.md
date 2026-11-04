# Cambios implementados: rama `audit-remediation-2026-11`

Base: `main` @ `9285e42`. **Sin dependencias nuevas en el sitio:** sigue siendo HTML/CSS/JS estático, sin `package.json`. Las herramientas de prueba (Lighthouse, axe-core, linkinator, html-validate, Playwright) se usaron solo en el entorno de auditoría y no se añadieron al repositorio.

Se comprobó automáticamente que **no se eliminó ningún texto visible ni ningún enlace** de las 10 páginas existentes: se compararon todos los nodos de texto y todos los `href` entre `main` y la rama, con 0 pérdidas.

## Archivos modificados

| Archivo | Cambio | Justificación | CAPA |
|---|---|---|---|
| `vercel.json` | Bloque `headers`: CSP, nosniff, X-Frame-Options, Referrer-Policy y Permissions-Policy para todas las rutas, más caché para `/media` (30 días) y `/assets` (1 h + revalidación 24 h). `trailingSlash` se conserva. | Cabeceras de seguridad ausentes; recursos estáticos sin caché. | 04, 10 |
| `index.html` | (1) El fragmento de GA4 se sustituye por `<script src="/assets/consent.js" data-ga="G-VCKX3PTT1D">`. (2) Las 3 imágenes Base64 (logo, foto, emblema) pasan a archivos con `<picture>` WebP/JPG y `loading="lazy"`. (3) Los videos *holds* y *utilidades* tienen fuente de 720p para ≤ 768 px. (4) Los 4 `<h1>` de división pasan a `<h2 class="layer-title">` con el mismo estilo. (5) La etiqueta CRÍTICO usa fondo #B83A2E. (6) Enlace "Saltar al contenido". (7) Formulario: `required`, `aria-required`, `maxlength`, `role="alert"`, `aria-invalid`, foco en el error, tiempo límite de 15 s, guarda contra doble envío y correo con `textContent`. (8) Corrección de `window.open` (WhatsApp). (9) Pie con enlaces de Privacidad y "Preferencias de cookies". | Consentimiento, rendimiento, SEO, accesibilidad y defectos funcionales. Tamaño 277 → 161 KB. | 03, 05, 06, 07, 08, 10, 11 |
| `assets/servicios.js` | Las mismas mejoras del formulario (ARIA, foco, tiempo límite, doble envío), la corrección de `window.open` y el escape del enlace mailto. | Las páginas de servicio comparten este script. | 05, 06 |
| `assets/servicios.css` | Borde rojo en campos con `aria-invalid`. | Indicación visual del error (WCAG 3.3.1). | 05 |
| `servicios/*/index.html` (4) y `en/services/*/index.html` (4) | `required`, `aria-required` y `maxlength` en los campos, aviso de privacidad bajo el formulario y enlace Privacidad/Privacy en el pie. | Privacidad y accesibilidad. | 02, 05 |
| `manos.html` | `og:image`, `og:site_name`, `og:locale`, `twitter:card`, favicon. | Vista previa social incompleta. | 08 |
| `sitemap.xml` | Se añaden `/privacidad/` y `/en/privacy/` con hreflang, más `lastmod` en inicio y manos. | Coherencia con las páginas reales. | — |

## Archivos nuevos

| Archivo | Propósito |
|---|---|
| `assets/consent.js` (84 líneas, sin dependencias) | Aviso de consentimiento ES/EN. Carga GA4 solo tras aceptar, recuerda la decisión, permite cambiarla con `[data-consent-open]` y borra `_ga*` al retirar el consentimiento. Estilo navy/dorado y botones de 44 px. En móvil se coloca encima de la barra inferior. |
| `privacidad/index.html`, `en/privacy/index.html` | Política de privacidad **en borrador**, marcada con un comentario HTML `BORRADOR PARA APROBACIÓN`. |
| `404.html` | Página de error con la identidad del sitio, `noindex` y navegación de regreso. |
| `assets/logo.jpg` (ya existía), `assets/jose-forero.webp/.jpg`, `assets/emblema.webp/.jpg` | Imágenes extraídas del HTML. Mismas fuentes y misma resolución (la foto se ajusta a 264 px = 2× su tamaño de pantalla). |
| `media/holds-720.mp4` (2,7 MB), `media/utilidades-720.mp4` (2,6 MB) | Variantes móviles, H.264 720p, CRF 28, `+faststart`, audio AAC 64 kbps. Duración idéntica a los originales. Los originales de 1080p se conservan para escritorio. |
| `.vercelignore` | Excluye `auditoria/` del despliegue para que estos documentos internos no queden públicos en el sitio. |
| `auditoria/2026-11/*.md` | Los 6 entregables de esta auditoría. |

## Lo que no se cambió, a propósito

- La clave de Web3Forms, el correo de destino, el número de WhatsApp y las URL de redes y ORA.
- La identidad visual: colores, tipografías, animaciones, textos y orden de las secciones.
- HSTS, que Vercel ya envía.
- DNS, dominios, configuración del proyecto en Vercel y cuentas externas.
- La CSS y el JS incrustados del inicio. No se extrajeron a archivos porque eso no aporta una mejora medible hoy: la CSS ya es crítica para el primer pintado, y extraerla añadiría una petición bloqueante. Ver RIESGOS R-04.
