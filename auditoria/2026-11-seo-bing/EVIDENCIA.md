# SEO: hallazgos de Bing Webmaster Tools (11-nov-2026)

Rama `seo-bing-2026-11`. No publicado: requiere aprobación de JF Solutions.

## Los 4 hallazgos de Bing en la portada

| Hallazgo de Bing | Antes (producción) | Después (esta rama) |
|---|---|---|
| Title too long | 71 caracteres | 55: `Quality Control y Food Safety en NJ y NY \| JF Solutions` (en inglés, al cambiar de idioma: `Quality Control & Food Safety in NJ & NY \| JF Solutions`) |
| Meta description too long | 204 caracteres | 156: `Quality Control, Food Safety, Traceability y Operational Excellence para plantas de alimentos y bebidas en New Jersey y New York. Evaluación inicial gratis.` |
| Alt attribute missing | 2 imágenes con `alt=""` (logotipo y franja de foto) | 0: `Logotipo de JF Solutions` y `Piso de producción de una planta industrial` |
| More than one H1 | 2 `<h1>` (uno por idioma). Bing contó 6 porque rastreó la versión anterior al PR #6 | 1 `<h1>` con el texto en español e inglés dentro (`<span lang>`) |

## Revisión adicional

- **Datos estructurados:** la portada no tenía. Se añadió JSON-LD con `Organization` (área: New Jersey y New York; temas: Quality Control, Food Safety, Traceability, Operational Excellence, HACCP, GMP, CAPA), `WebSite` y `WebPage`, con los mismos `@id` que usan las páginas de servicios y la experiencia.
- **Canonical:** una sola etiqueta por página en todas las páginas revisadas; correctas.
- **hreflang:** servicios, experiencia y privacidad tienen `es`, `en` y `x-default` recíprocos; correctos. La portada no tiene hreflang porque español e inglés viven en la misma URL (el idioma se cambia con un botón). No se añadió: declarar una URL en inglés que no existe sería un error. Si se quiere posicionar la portada en inglés, hace falta una portada propia en `/en/` (decisión pendiente).
- **Páginas de servicios en español:** 4 títulos medían 73–75 caracteres y una descripción 163. Se acortaron a 58–63 y 152 (también `og:title`). Las páginas en inglés ya estaban dentro del límite.
- **Experiencia de 90 s:** no se tocó. Sus descripciones miden 190 (ES) y 182 (EN) caracteres y sus 10 imágenes decorativas tienen `alt=""`; el texto está fijado por el Documento Maestro y sus pruebas. Bing puede marcarlas cuando las rastree.

## Evidencia

- Comparación en navegador real, antes y después, escritorio (1440×900) e iPhone 13, en español e inglés: **capturas idénticas píxel por píxel** en los 4 casos; misma posición y tamaño del H1 y misma altura de página. Detalle en `comparacion-visual.json`; capturas `hero-*.png`.
- Pruebas de portada: 48/48. Pruebas en navegador de la experiencia: 132/132. Salidas de la experiencia al día con `content.json`.
- Pruebas estáticas: 235 correctas y 4 fallidas, igual que en producción antes de este cambio: son las que exigen que la portada y servicios no difieran de la versión anterior al PR #6.
- Todo el JSON-LD de las páginas revisadas se analiza sin errores.
