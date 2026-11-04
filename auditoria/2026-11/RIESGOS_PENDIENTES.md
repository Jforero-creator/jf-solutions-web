# Riesgos pendientes y acciones que requieren al propietario

## Decisiones y aprobaciones del propietario (antes de fusionar)

| ID | Asunto | Qué se necesita | Por qué no lo hice |
|---|---|---|---|
| R-01 | **Aprobación de la política de privacidad** (`/privacidad/`, `/en/privacy/`) | Revisar el texto, confirmar el plazo de conservación propuesto (24 meses) y el plazo de respuesta (45 días), y retirar el comentario `BORRADOR` del HTML. Lo ideal es que lo revise un asesor legal. | Es un texto legal. La instrucción exige aprobación del propietario. No soy abogado y esto no es asesoría legal. |
| R-02 | **Protección antispam de Web3Forms** (CAPA-01) | Elegir entre (a) mantener solo el honeypot, (b) añadir hCaptcha o Turnstile, o (c) contratar Web3Forms Pro y restringir a `www.jfsolutionsq.com`. | Requiere decidir en la cuenta de Web3Forms y posiblemente un plan de pago. No se cambió la clave. |
| R-10 | **Envío real de prueba a Web3Forms** | Autorizar un envío con datos ficticios desde la vista previa de Vercel y confirmar que llega a Gmail. | Envía un correo real a la cuenta del propietario; requiere autorización. |

## Riesgos técnicos residuales

| ID | Riesgo | Severidad | Mitigación propuesta |
|---|---|---|---|
| R-03 | La CSP incluye `'unsafe-inline'` en `script-src` y `style-src` porque el inicio tiene 7 bloques `<script>` y CSS incrustados. Limita, pero no elimina, el riesgo de inyección. | Baja | Fase 2: mover los scripts a `/assets/home.js` y usar *hashes* o `'strict-dynamic'`. Se dejó fuera para no reestructurar el inicio sin una mejora medible. |
| R-04 | `index.html` sigue teniendo unos 37 KB de CSS y unos 25 KB de JS incrustados y 2.100 nodos DOM (las 4 subpáginas de división viven en el mismo HTML). | Baja | Opcional. Medir antes y después si se separan las subpáginas en URL propias, lo que también mejoraría el SEO de cada división. |
| R-05 | **No se probó en dispositivos físicos** (iPhone/Safari, Android/Chrome). Solo hubo emulación de Chromium. | Media | El propietario abre la vista previa en su iPhone y en un Android: aviso de cookies, formulario, WhatsApp, videos y menú. 10 minutos. |
| R-06 | Enlaces externos sin verificar (redes, Fiverr, ORA). | Baja | Abrirlos manualmente (lista en PRUEBAS §8). |
| R-07 | Falta una prueba manual con lector de pantalla (VoiceOver/NVDA). El menú desplegable "Servicios" del inicio se abre con `:focus-within`, pero no se probó con lector. | Media | Prueba manual con VoiceOver en iPhone sobre el inicio y el formulario. |
| R-08 | **Google Search Console no verificado**: no hay acceso. Se desconoce el estado de indexación y no hay datos de campo (INP). | Media | El propietario confirma que la propiedad está verificada y que el sitemap está enviado, y comparte el informe de páginas indexadas. |
| R-09 | **Sin alertas de caída.** Vercel no avisa si el sitio deja de responder. Los registros de ejecución tienen retención limitada según el plan (consultar el plan actual en el panel de Vercel). | Media | Opción gratuita: monitor HTTP externo (por ejemplo UptimeRobot plan gratuito o Better Stack plan gratuito) sobre `https://www.jfsolutionsq.com/` cada 5 min, con alerta al correo de JF Solutions. **No se contrató nada.** Requiere que el propietario cree la cuenta. Además, las notificaciones de despliegue fallido de Vercel y GitHub ya existen por correo. |
| R-11 | Caché de `/assets` (1 h) y `/media` (30 días). Si se **reemplaza** un video o imagen manteniendo el mismo nombre, algunos visitantes verán la versión anterior hasta 30 días. | Baja | Al cambiar un video, usar un nombre nuevo (por ejemplo `holds-v2.mp4`). CSS y JS se revalidan cada hora. |
| R-12 | Que `.vercelignore` excluya `auditoria/` en despliegues desde Git debe confirmarse en la vista previa. Si no funcionara, estos `.md` quedarían públicos (no contienen secretos). | Baja | Comprobar que `/auditoria/2026-11/AUDITORIA_30_CONTROLES.md` da 404 en la vista previa. Alternativa: mover la carpeta a otro repositorio. |
| R-13 | Si una extensión del navegador o una política corporativa bloquea `localStorage`, el aviso de cookies reaparece en cada visita (GA sigue sin cargarse). | Baja | Comportamiento seguro por defecto; no requiere acción. |

## Dependencias externas (no se tocó ninguna)

| Servicio | Uso |
|---|---|
| GitHub | Repositorio |
| Vercel | Alojamiento, dominios, Web Analytics |
| Squarespace | Registro del dominio |
| Web3Forms | Formulario |
| Google Workspace/Gmail | Buzón |
| Google Analytics 4 | Analítica |
| Google Fonts | Tipografías |
| Unsplash | Fotos del inicio, servidas desde su CDN; si Unsplash retira una foto, se rompe |
| WhatsApp, Instagram, YouTube, Fiverr | Enlaces de contacto y redes |
| `ora.jfsolutionsq.com` | Subdominio ORA |

## Lista de comprobación preventiva para cambios futuros

1. ¿El cambio añade un servicio externo? Entonces amplía la CSP en `vercel.json`, actualiza la política de privacidad y vuelve a ejecutar la prueba C03-1.
2. ¿Es una etiqueta de seguimiento (Pixel, GTM, mapas de calor)? Cárgala solo desde `assets/consent.js`, nunca directamente en `<head>`.
3. ¿Imágenes nuevas? Súbelas como archivos en `/assets` o `/media`, nunca en Base64.
4. ¿Videos nuevos? Crea también la variante de 720p y dale un nombre nuevo si reemplaza a otro.
5. Antes de fusionar: ejecuta axe, Lighthouse móvil y las pruebas de formulario.
