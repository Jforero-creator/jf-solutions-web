# Experiencia cinematográfica de 90 s — Informe de construcción

> **Ronda 2 (9-nov-2026, 13:20):** José aprobó con correcciones. Los cambios están en `CAMBIOS_RONDA2.md` y los resultados en `MATRIZ_PRUEBAS.md`.

**Rama:** `feature/jf-cinematic-experience-v1` · **Especificación:** Documento Maestro v1.0 (9-nov-2026) · **Estado:** construida y probada en rama aislada. **Sin merge ni publicación.**

> Construcción y pruebas terminadas en rama de desarrollo. Solicito aprobación explícita para cualquier merge o publicación.

---

## 1. Auditoría inicial

| Punto | Hallazgo |
|---|---|
| Tecnología | Sitio **HTML estático** sin framework, sin `package.json` ni build. No se usó Next.js/React. |
| Hosting | Vercel, proyecto `jf-solutions` (equipo *Jose Forero*), conectado a GitHub; cada rama genera un Preview. |
| Protección de previews | Vercel Authentication activa (`all_except_custom_domains`): los previews piden inicio de sesión. |
| Variables de entorno | Ninguna. No hay credenciales que puedan filtrarse a un preview. |
| `vercel.json` | Solo `trailingSlash: true` en `main`. |
| Trabajo pendiente | **PR #6** abierto (`audit-remediation-2026-11`, "NO FUSIONAR sin aprobación"): modifica portada, `vercel.json` (CSP y cabeceras), `sitemap.xml`, formulario y páginas de servicios. |
| Otras ramas | Ya fusionadas en `main` (0 commits por delante). |
| Idioma | Páginas de servicio con URL propia por idioma y preferencia en `localStorage` (`jf-lang`). Portada bilingüe en una sola URL. |
| Marca | Tokens en `assets/site.css`: navy `#0B1730`, dorado `#E0B45A`, verde `#3FBF8A`, rojo `#E0574A`. Se usan estos en lugar de los colores orientativos del documento (§3). |

## 2. Decisiones de arquitectura

1. **Solo archivos nuevos.** Para no pisar el PR #6, la experiencia vive en rutas nuevas: **`/experiencia/`** (ES) y **`/en/experience/`** (EN), con el mismo patrón de URL por idioma que las páginas de servicios. No se tocan la portada, el formulario, `vercel.json` ni ninguna página existente. El único archivo existente modificado es `sitemap.xml` (dos entradas nuevas, en una zona que no choca con el PR #6).
2. **Compatibilidad con el PR #6 verificada:** la rama se fusiona sin conflictos con `main` y con `audit-remediation-2026-11`. Todo cumple de antemano su CSP (`script-src 'self'`, `media-src 'self'`, imágenes de Unsplash, fuentes de Google). Las pruebas en navegador se corrieron también con esas cabeceras: 0 violaciones.
3. **Fuente única de textos.** `dev/experiencia/content.json` contiene el guion exacto EN/ES, las escenas, las FAQ, los servicios y los textos del reproductor. `dev/experiencia/build.mjs` genera las dos páginas y los subtítulos VTT (sin dependencias). CI puede verificar con `--check` que lo publicado coincide con la fuente.
4. **Componentes** (funciones del generador y bloques CSS/JS): `CinematicHero`, `ScrollStory`, `Scene`, `PresentationPlayer`, `Captions`, `LanguageSwitcher`, `ServiceHighlights`, `ConsultationCTA`. El modo sin movimiento (`ReducedMotionFallback`) se implementa en CSS: el estado por defecto de cada escena es el final y estático.
5. **Contenido rastreable sin JS:** H1, guion completo, servicios, método, prototipos, FAQ, cobertura NJ/NY, transcripción y CTA están en el HTML.
6. **Sin librerías de animación:** IntersectionObserver + `transform`/`opacity`. Sin scroll-jacking ni WebGL. JS propio de unos 11 KB.
7. **CTA:** "Explorar soluciones" lleva a `/servicios/` (EN `/en/services/`) y "Solicitar consulta" al **formulario existente** (`/servicios/#contacto`). No se añade ninguna integración de formulario nueva.
8. **JSON-LD:** `Organization` (mismos datos que ya publica el sitio), `WebSite`, `WebPage`, `BreadcrumbList` y 4 `Service` con `areaServed` NJ + NY. **No se usa** `ProfessionalService`/`LocalBusiness` porque exigen una dirección verificable que no tenemos. **No se usa** `FAQPage` porque Google limita esos resultados enriquecidos a sitios gubernamentales y de salud; la FAQ es visible en la página.
9. **hreflang** `es`/`en`/`x-default`, con alternates recíprocos y canonical autorreferente, coherente con el resto del sitio.

## 3. Narración con IA (aprobada el 9-nov-2026)

| | |
|---|---|
| Servicio | ElevenLabs (cuenta conectada de JF Solutions), modelo `eleven_multilingual_v2` |
| Voces | **EN-US: Abbas** (`JNJLgw1sryJz75xYzsFL`) · **ES latino: Arturo** (`jUzQhbFtXaz1IwDyMfJr`), elegidas por José |
| Tomas | 2 por escena e idioma (20 en total). Procedencia completa en `dev/experiencia/audio/takes.json` |
| Créditos usados | **3.602** (3.420 iniciales + 182 para rehacer EN escena 1 tras la verificación; ≈ US$0,65) |
| Elección de toma | **Por transcripción** (Whisper local): fiel al guion y, entre las fieles, la más pausada que cabe. Detalle en `docs/evidencias/transcripcion-tomas.txt` |
| Archivos | `media/experiencia/narracion-{en,es}.webm` (Opus 40 kbps, ~390 KB) y `.mp3` (64 kbps, ~720 KB). 90,0 s cada uno |
| Sonoridad | ~−16,6 LUFS, pico real −1,5 dBTP (EBU R128) |
| Carga | `preload="none"`: el audio se descarga **solo** cuando el visitante activa el sonido. Sin llamadas a API por visita |
| Sincronía | Cada escena colocada en su ventana del guion gráfico. Los subtítulos se alinean a las pausas reales de la voz (≤ 16,5 caracteres/s, sin solapes). Con sonido, el reloj del reproductor sigue al audio |
| Aviso | "Narración generada con IA / AI-generated narration" visible en el reproductor y junto al botón |
| Sin sonido | La experiencia funciona completa en silencio. Si el audio no carga, el botón se desactiva y la presentación sigue |

**Importación:** el entorno de trabajo no puede descargar desde ElevenLabs. Con aprobación de José se usó un flujo **temporal** de GitHub Actions en esta rama para descargar las tomas y armar las pistas. El flujo y la lista de enlaces firmados (que vencían el mismo día) ya fueron eliminados de la rama, pero siguen en el historial de commits de este repositorio público hasta que venzan. El registro del proceso está en `docs/importacion-narracion.log`.

**Licencia:** ElevenLabs concede derechos comerciales sobre el audio generado en planes de pago (Starter o superior). **Confirmar que la cuenta de ElevenLabs está en un plan de pago antes de publicar.**

## 4. Archivos

**Publicados por el sitio:**
- `experiencia/index.html`, `en/experience/index.html` (generados)
- `assets/experiencia.css`, `assets/experiencia.js`
- `media/experiencia/captions-{es,en}.vtt`, `media/experiencia/narracion-{es,en}.{webm,mp3}`
- `sitemap.xml` (+2 URL)

**De desarrollo** (`dev/experiencia/`, sin secretos; se servirían en la URL `/dev/…` y conviene excluirlos con `.vercelignore` cuando se fusione el PR #6):
- `content.json`, `build.mjs`, `audio/build-audio.mjs`, `audio/takes.json`, `audio/timing.json`
- `tests/static.mjs`, `tests/e2e.mjs`, `tests/serve.mjs`, `tests/shots.mjs`, `package.json`
- `docs/INFORME.md`, `docs/capturas/`, `docs/evidencias/`

## 5. Resultados de pruebas

| Prueba | Resultado |
|---|---|
| Estáticas (`tests/static.mjs`): guion exacto vs. documento, 5 ventanas, subtítulos, H1, metadatos, canonical, hreflang, JSON-LD, afirmaciones prohibidas, enlaces, CSP, alcance del cambio, secretos | **218 / 218** |
| Navegador (`tests/e2e.mjs`, Chromium + axe-core): WCAG 2.2 AA en escritorio, móvil, reproductor abierto y sin movimiento; sin JS; scroll libre; 90 s cronometrados; subtítulos; CC; idioma; escenas; Esc y foco; 320 px; narración opt-in y sincronizada; falla de audio | **128 / 128** |
| Mismas pruebas con la CSP del PR #6 | **130 / 130**, 0 violaciones |
| Lighthouse 12.8 móvil (simulado, 3 corridas por página) | Rendimiento **99**, Accesibilidad **100**, Buenas prácticas **100**, SEO **100**. LCP 2,1 s · CLS ≤ 0,034 · TBT ≤ 50 ms |

**Limitaciones de las mediciones (desviaciones documentadas):**
- El entorno de pruebas no alcanza `images.unsplash.com` ni Google Fonts. Las capturas muestran el **fondo navy de respaldo** en lugar de las fotos, y Lighthouse midió sin fotos ni fuentes. **El LCP real puede ser mayor** cuando la foto del héroe es el elemento más grande. Hay que medirlo en el Preview y, tras publicar, con datos de campo (Core Web Vitals p75). No se afirma cumplimiento.
- Solo se automatizó Chromium. **Pendiente en dispositivos reales:** Safari iOS, Chrome Android, Firefox y Edge (escritorio).
- La voz se verificó con audio real (transcripción, energía, sincronía): ver `MATRIZ_PRUEBAS.md`. Falta la escucha humana de tono y calidad.

## 6. Contenido y afirmaciones

- Sin certificaciones, clientes, testimonios, resultados cuantificados ni cumplimiento FSMA 204. FSMA 204 aparece solo como "preparación", con el aviso de que la aplicabilidad debe evaluarse en cada operación.
- ORA, ORA Lab, JF SOP y Trazabilidad aparecen marcados como **"Prototipo / demostración"**.
- Las 5 ilustraciones llevan la etiqueta "Ilustrativo". Las pantallas de prototipo son abstractas, sin cifras.
- **A confirmar por José:** las descripciones de **ORA Lab** y del **prototipo de Trazabilidad** son genéricas porque no había una descripción aprobada.

## 7. Activos y licencias

| Activo | Fuente / licencia |
|---|---|
| Fotos de escena | Unsplash (licencia Unsplash), las mismas que ya usa el sitio, enlazadas desde `images.unsplash.com`, con crédito en el pie |
| Logotipo | `assets/logo.jpg` del sitio (marca propia) |
| Fuentes | Google Fonts ya usadas por el sitio (SIL OFL) |
| Narración | ElevenLabs, generada para JF Solutions (ver §3) |
| Ilustraciones | HTML/CSS/SVG propios, sin texto incrustado en imágenes |

## 8. Riesgos y decisiones pendientes

| # | Riesgo / decisión | Recomendación |
|---|---|---|
| R1 | **No hay enlace desde la portada** para no chocar con el PR #6 | Tras decidir el PR #6, añadir el botón "Ver presentación de 90 segundos" en el héroe de la portada y un enlace en el menú |
| R2 | Posible competencia SEO con `/servicios/consultoria-calidad-inocuidad-alimentaria-new-jersey/` (búsquedas parecidas) | Mantener ambas con enfoques distintos (NJ+NY general vs. servicio NJ) y revisar Search Console a las 4–6 semanas |
| R3 | `Organization.areaServed` del sitio dice solo New Jersey; la experiencia declara NJ y NY en `Service` | Si NY es oficial, actualizar el `Organization` de todo el sitio |
| R4 | Las fotos dependen del CDN de Unsplash | Opcional: autoalojar versiones WebP optimizadas en `/media/experiencia/` |
| R5 | Plan de ElevenLabs sin confirmar para uso comercial | Confirmar el plan de pago antes de publicar |
| R6 | La carpeta `dev/` se despliega (sin datos sensibles) | Añadir `dev/` a `.vercelignore` cuando se fusione el PR #6, que crea ese archivo |
| R7 | Enlaces firmados de ElevenLabs en el historial de commits (vencen el 9-nov) | Sin acción; el audio será público en el sitio |
| R8 | Pronunciación de "JF Solutions" en la voz en español | Escuchar; si no convence, regenerar solo esa escena (~235 créditos por toma) |

## 9. Checklist de lanzamiento (no ejecutado)

1. [ ] José revisa el Preview en iPhone y Android reales: escenas, presentación, sonido EN y ES, subtítulos.
2. [ ] Confirmar textos de ORA Lab y Trazabilidad (§6) y la cobertura NY (R3).
3. [ ] Confirmar el plan de pago de ElevenLabs (R5).
4. [ ] Decidir el orden de fusión respecto del PR #6. Ambas ramas se fusionan sin conflictos.
5. [ ] Aprobación explícita de José para fusionar el PR a `main`.
6. [ ] Tras el despliegue de producción: abrir `/experiencia/` y `/en/experience/`, validar con la prueba de resultados enriquecidos y el validador de schema.org, y enviar el sitemap en Search Console.
7. [ ] Medir PageSpeed Insights en producción (con fotos reales) y anotar LCP/INP/CLS.
8. [ ] Añadir el enlace desde la portada (R1) en un PR aparte.

## 10. Plan de rollback

- **Antes de fusionar:** no hay nada que revertir; producción no cambió.
- **Después de fusionar:** en Vercel → Deployments, usar **Instant Rollback** al despliegue de producción anterior (inmediato). O revertir el merge en GitHub (`git revert -m 1 <merge>`), lo que vuelve a desplegar `main` sin la experiencia.
- **Retirada parcial:** como todo son rutas nuevas, basta con borrar `experiencia/`, `en/experience/`, `assets/experiencia.*`, `media/experiencia/` y las 2 líneas del sitemap. Ninguna página existente depende de ellas.

## 11. Cómo regenerar

```bash
node dev/experiencia/build.mjs                       # páginas + VTT desde content.json (+ timing.json)
node dev/experiencia/build.mjs --check               # verificar que todo está al día
node dev/experiencia/audio/build-audio.mjs --src <carpeta-con-tomas>   # re-armar narración
cd dev/experiencia && npm ci && npm test             # pruebas (requiere Chromium de Playwright)
```
