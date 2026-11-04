# Pruebas y evidencias: auditoría 2026-11

**Datos de prueba:** todos ficticios ("Prueba Auditoria", `prueba@example.com`). No se usaron datos reales ni se envió ningún mensaje real a Web3Forms, WhatsApp o correo.

**Entorno:** contenedor Linux aislado, Google Chrome for Testing 153, Playwright 1.63, Lighthouse 12.8.2, axe-core 4.x, linkinator y html-validate 9.

**Servidor local:** `evidencias/vserve.py` reproduce lo esencial de Vercel: las cabeceras de `vercel.json`, `trailingSlash` (redirección 308), `index.html` por carpeta y `404.html` con estado 404.

- `main` (antes) se sirvió en `:8801`.
- La rama (después) se sirvió en `:8802`.

**Servicios externos simulados:** el entorno no tiene salida a Google, Unsplash ni Web3Forms, así que se respondieron con datos controlados mediante `page.route` de Playwright:

| Servicio | Respuesta simulada |
|---|---|
| `gtag.js` | Crea la cookie `_ga` |
| Web3Forms | `{"success":true}`, error 400 o desconexión, según la prueba |
| Fuentes e imágenes | Respuestas vacías o PNG de 1 px |

La CSP se evalúa en el navegador **antes** de la petición, así que la simulación no oculta violaciones.

Archivos de evidencia en `evidencias/`:

| Archivo | Contenido |
|---|---|
| `func-before.json`, `func-after.json` | Resultados funcionales |
| `axe-before.json`, `axe-after.json` | Resultados de accesibilidad |
| `lighthouse-resumen.json` | 12 corridas de Lighthouse |
| Scripts (`func_tests.py`, `before_tests.py`, `axe_run.py`, `seo_audit.py`, `vserve.py`) | Pruebas reproducibles. Contienen rutas del entorno de auditoría; ajústalas para reutilizarlas. |

---

## 1. Evidencia en producción (solo lectura, 03-nov-2026 ~12:24 UTC)

La consulta autenticada se hizo con la herramienta de Vercel `web_fetch_vercel_url`. No se modificó nada.

| URL | Estado | Observación |
|---|---|---|
| `https://www.jfsolutionsq.com/` | 200 | Cabeceras: `strict-transport-security: max-age=63072000`, `cache-control: public, max-age=0, must-revalidate`, `content-encoding: br`. **No hay** CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy ni X-Frame-Options. El HTML servido es idéntico byte a byte a `index.html` de `main`. |
| `https://jfsolutionsq.com/` | 308 → `https://www.jfsolutionsq.com/` | Redirección del dominio raíz correcta. |
| `/pagina-que-no-existe-auditoria/` | 404 | `text/plain` "The page could not be found NOT_FOUND". No hay página personalizada. |
| `/manos.html` | 200 | Correcto. |
| `/_vercel/insights/script.js` | 200 | Vercel Web Analytics activo. |
| Errores de ejecución de Vercel (últimos 7 días) | — | "No runtime errors found". |
| Despliegues de producción | — | Los 6 más recientes están en READY. El actual es `dpl_FcFGH86…` (commit `9285e42`). El anterior, `dpl_HKuy9q…` (PR #5), está marcado como candidato a rollback. |

## 2. Antes: defectos reproducidos en `main`

| ID | Prueba | Resultado | Evidencia |
|---|---|---|---|
| B-GA | GA se carga sin consentimiento | Reproducido | `gtag.js` descargado 1 vez; cookie `_ga` creada sin interacción |
| B-WA | La pestaña del sitio navega a WhatsApp | Reproducido | La URL de la pestaña original pasa a `https://wa.me/12012506729?text=…` |
| B-XSS | Inyección de HTML con el campo correo | Reproducido | Con el correo `a@b.co<img/src=x/onerror=…>`, `.form-ok` contiene 1 `<img>` |
| B-VAL | Error sin semántica accesible | Reproducido | `#f-err` sin `role`; 0 elementos `aria-invalid` |
| B-H1 | H1 en el inicio | 6 | |
| B-VID | Videos en iPhone 13 (emulado) | `holds.mp4`, `utilidades.mp4` (1080p), `empleo-720.mp4` | |
| axe | Contraste | 1 violación seria (`.l-crit`, 3,72:1) en el inicio, ES/EN, móvil/escritorio | |

## 3. Después: pruebas funcionales en la rama (32/32 PASAN)

| ID | Prueba | Resultado | Evidencia |
|---|---|---|---|
| C02-1 | Sin decisión: GA no se descarga y aparece el aviso | PASA | gtag.js=0, aviso=1, cookies='' |
| C02-2 | Rechazar: sin gtag.js ni `_ga` tras recargar; el aviso no reaparece | PASA | gtag.js=0, `jf-consent=denied` |
| C02-3 | "Preferencias de cookies" reabre el aviso y lo enfoca | PASA | |
| C02-4 | Aceptar: gtag.js se carga una vez y crea `_ga` | PASA | gtag.js=1 |
| C02-5 | El consentimiento persiste al volver | PASA | gtag.js=2 (una carga por visita), sin aviso |
| C02-6 | Retirar consentimiento: se borran las `_ga` y GA no vuelve a cargarse | PASA | cookies='' |
| C03-1 | CSP sin violaciones en 13 páginas (GA aceptado) | PASA | 0 eventos `securitypolicyviolation` |
| C03-2 | Sin errores JavaScript en las 13 páginas | PASA | 0 `pageerror` |
| C04-val ×3 | Campos vacíos: error con `role=alert`, `aria-invalid`, foco en el primero, 0 envíos | PASA | Inicio, servicio ES y servicios EN |
| C04-mail ×3 | Correo inválido rechazado | PASA | |
| C04-ok ×3 | Envío correcto: mensaje de éxito, formulario reiniciado, `botcheck=false`, clave intacta | PASA | |
| C04-xss | Correo mostrado como texto | PASA | 0 `<img>` inyectadas (también en `/servicios/`) |
| C04-err | Web3Forms responde 400 | PASA | "No se pudo enviar…"; datos conservados; botón reactivado |
| C04-down | Sin conexión | PASA | Mismo mensaje; datos conservados |
| C04-dup | 3 clics rápidos | PASA | 1 envío |
| C04-en | Mensajes en inglés | PASA | "Please complete: …", "Could not send" |
| C04-wa | WhatsApp abre una pestaña nueva y la del sitio se conserva | PASA | `pestaña_sitio_conservada=True` |
| C04-mailto | Enlaces mailto, Gmail y Outlook al destinatario correcto | PASA | |
| C09-img | Logo, foto y emblema cargan desde `/assets` | PASA | Anchos 96, 264 y 440 px |
| C06-h1 | Un H1 visible | PASA | 2 en total (ES y EN), 1 visible |
| C06-layer | `#industrial` sigue mostrándose | PASA | |
| C08-404 | Ruta inexistente: 404 con página propia | PASA | |
| C10-skip | El primer Tab enfoca "Saltar al contenido" | PASA | |
| C04-iPhone 13 | Emulado: sin scroll horizontal, el aviso no tapa la barra, el formulario envía, videos de 720p | PASA | |
| C04-Pixel 7 | Ídem | PASA | |
| C09-vid-desk | Escritorio: los videos siguen en 1080p | PASA | |

**Preservación de contenido:** se compararon todos los nodos de texto visibles y todos los `href` de las 10 páginas de `main` con la rama. Hay 0 textos y 0 enlaces perdidos.

## 4. Accesibilidad automatizada (axe-core, WCAG 2.0/2.1/2.2 A y AA + buenas prácticas)

| | Escenarios | Violaciones |
|---|---|---|
| Antes | 24 (6 páginas × ES/EN × móvil/escritorio) | 1 tipo (`color-contrast`, serio) en el inicio |
| Después | 44 (11 páginas, incluidas privacidad ES/EN y 404) | **0** |

Durante las pruebas se detectó y corrigió un problema de contraste en la ruta de navegación de las páginas nuevas de privacidad, antes del resultado final.

## 5. Rendimiento (Lighthouse 12.8.2, servidor local, mediana de 3 corridas)

| Métrica | Móvil antes | Móvil después | Escritorio antes | Escritorio después |
|---|---|---|---|---|
| Rendimiento | 89 | **95** | 100 | 100 |
| Accesibilidad | 97 | **100** | 97 | **100** |
| Buenas prácticas | 96 | 96 | 96 | 96 |
| SEO | 100 | 100 | 100 | 100 |
| FCP | 2,73 s | **2,14 s** | 0,63 s | 0,55 s |
| LCP | 3,08 s | **2,57 s** | 0,67 s | 0,56 s |
| CLS | 0 | 0 | 0 | 0 |
| TBT | 0 ms | 0 ms | 0 ms | 0 ms |
| Speed Index | 3,17 s | 2,89 s | 0,65 s | 0,62 s |
| Transferencia del HTML del inicio | 277,6 KB | **162,3 KB** | | |

Limitaciones de estas mediciones:

- Son de laboratorio: red móvil simulada y servidor local **sin compresión Brotli**. En Vercel el HTML se sirve comprimido, así que los valores absolutos serán distintos.
- Lo que vale es la comparación antes/después en las mismas condiciones.
- "Buenas prácticas 96" en ambos casos se debe a errores de consola por los dominios externos bloqueados en este entorno, no al sitio.
- **No se midió INP con datos reales:** requiere datos de campo (CrUX o Search Console), que no están disponibles.

## 6. Pendiente de verificar en Vercel (después de publicar la rama)

Al publicar la rama, Vercel genera **automáticamente un despliegue de vista previa**, no de producción. En esa vista previa:

1. Comprobar que se sirven las cabeceras CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy y nosniff.
2. Comprobar que `/ruta-inexistente/` muestra la 404 personalizada.
3. Comprobar que `/auditoria/2026-11/AUDITORIA_30_CONTROLES.md` responde **404**, lo que confirma que `.vercelignore` funciona.
4. Repetir C02 (Red: sin `googletagmanager.com` antes de aceptar) y C03 (consola sin errores de CSP) con servicios reales.
5. Hacer **un** envío de prueba real a Web3Forms, solo con autorización del propietario y con datos ficticios.

Los resultados de la vista previa, si se pudieron obtener, se anotan en la descripción del Pull Request.

## 7. Validación HTML (html-validate)

Antes: 38 avisos. Después: 41. Los 3 avisos adicionales son el mismo aviso de estilo (`<!doctype html>` en minúscula) en las 3 páginas nuevas, igual que en el resto del sitio. **No se introdujeron errores estructurales** (IDs duplicados ni etiquetas sin cerrar). Los avisos restantes son preexistentes y de estilo, como `autocomplete` en el honeypot o `type` implícito en `<input>`.

## 8. Enlaces

| Tipo | Resultado |
|---|---|
| Internos (linkinator, recursivo) | Antes: 22 OK. Después: 31 OK. 0 rotos reales. Los únicos 404 son `/_vercel/insights/script.js`, que solo existe en Vercel (200 en producción, §1). |
| Anclas (`#…`, `/#…`) | 0 rotas |
| Externos | **No verificados.** El entorno no tiene salida a estos dominios. |

Enlaces externos que el propietario debe abrir manualmente:

- https://wa.me/12012506729
- https://www.instagram.com/jfsolutionsq
- https://www.youtube.com/channel/UC5ZBfUsEcBRaYcsDodkk-fg
- https://www.fiverr.com/s/oddQWXV
- https://ora.jfsolutionsq.com
- https://unsplash.com
