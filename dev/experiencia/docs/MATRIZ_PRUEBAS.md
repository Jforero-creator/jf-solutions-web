# Matriz de pruebas — Ronda 2 (9-nov-2026)

**Rama:** `feature/jf-cinematic-experience-v1` · **Decisión previa de JF Solutions:** aprobado con correcciones, **no autorizado para producción**.

Todos los resultados se pueden reproducir con los scripts de `dev/experiencia/tests/`. La evidencia en bruto está en `dev/experiencia/docs/evidencias/`.

| Leyenda | |
|---|---|
| ✅ | Verificado automáticamente, con evidencia en archivo |
| 🟡 | Verificado en laboratorio, con limitación declarada |
| ⏳ | Pendiente de prueba manual en dispositivo real (José) |

## 1. Narración (audio real)

| # | Prueba | Método | Resultado | Evidencia |
|---|---|---|---|---|
| N1 | La voz dice exactamente el guion, escena por escena | Transcripción local (Whisper small) del archivo publicado | ✅ EN: WER 0,00 en 4 escenas y 0,04 en E4 (*towards* por *toward*). ES: WER 0,00 en las 5 | `verificacion-audio.json` |
| N2 | Error detectado y corregido | La transcripción oyó **"delayed season"** en EN E1 | ✅ Se generaron 2 tomas nuevas de EN E1 (182 créditos). La elegida dice "delayed decision". Además se descartaron 3 tomas con defectos (EN E4 "operation", EN E5 pausa rara, ES E4 "o combinamos", ES E5 "JTF") | `transcripcion-tomas.txt` |
| N3 | Duración de la pista | ffprobe y decodificación | ✅ MP3 90,04 s · Opus 90,01 s (EN y ES) | `verificacion-audio.json` |
| N4 | Sin cortes | Voz dentro de la ventana de su escena y silencio al final | ✅ Margen mínimo 0,4 s (EN E4); silencio final 5,2 s (EN) y 5,9 s (ES) | `verificacion-audio.json` |
| N5 | Velocidad natural (sin acelerar) | `playbackRate` durante toda la reproducción | ✅ 1,0 en todas las muestras | `e2e-avanzado.json` |
| N6 | Voz ↔ escenas sincronizadas | Reproducción real de 90 s en Chromium, muestreo cada 200 ms | ✅ Deriva máxima 0,02 s (EN y ES) | `e2e-avanzado.json` |
| N7 | Voz ↔ subtítulos | Energía real del audio (AnalyserNode) vs. subtítulo en pantalla | ✅ Con voz audible hay subtítulo el 99 % (ES 238/240) y el 100 % (EN 227/227) del tiempo | `e2e-avanzado.json` |
| N8 | Subtítulos cubren la voz | Análisis de señal del archivo | ✅ 100 % de la voz cubierta (EN y ES) | `verificacion-audio.json` |
| N9 | Pausa y reanudación | Pausa a los 20 s durante 1,5 s | ✅ La voz se detiene y reanuda en el mismo punto (deriva < 0,02 s) | `e2e-avanzado.json` |
| N10 | Salto en la línea de tiempo | Salto a 00:33 con la voz sonando | ✅ Voz y escena 3 se recolocan juntas (deriva 0,01 s) | `e2e-avanzado.json` |
| N11 | Cambio de idioma con la voz sonando | ES→EN y EN→ES a los 60 s | ✅ Cambia la pista y conserva el minuto (deriva 0,01 s) | `e2e-avanzado.json` |
| N12 | Opt-in y funcionamiento sin sonido | Al abrir no suena; "Voz" la activa; si el audio falla, la presentación sigue | ✅ | `e2e.json` |
| N13 | Corrección de robustez | Si el navegador no logra saltar dentro del audio, la voz ya no arrastra la presentación al inicio (fallo encontrado en esta ronda) | ✅ | `e2e-avanzado.json` |
| N14 | Escuchar EN y ES en iPhone/Android, con y sin auriculares | Manual | ⏳ | — |

## 2. Experiencia cinematográfica

| # | Prueba | Resultado |
|---|---|---|
| C1 | Movimiento sincronizado con cada frase ("beats" en el instante real de la voz), igual en scroll y en presentación | ✅ Hojas de contacto `capturas/presentacion-beats-*.jpg` |
| C2 | Apertura (0–10 s): línea en marcha → registro faltante → decisión pendiente → línea detenida, cada paso con su frase | ✅ |
| C3 | Transición entre escenas: corte con barrido dorado y cambio de escala; tarjeta de escena en escritorio | ✅ |
| C4 | Sin animaciones excesivas: sin pulsos infinitos; el texto aparece primero; solo `transform`/`opacity` | ✅ |
| C5 | Movimiento reducido: sin animaciones y escenas completas y estáticas | ✅ `e2e.json` |
| C6 | Juicio estético en pantalla real | ⏳ José |

## 3. Diseño móvil

| # | Prueba | Resultado |
|---|---|---|
| M1 | Textos de ilustración ≥ 11,5 px (antes 8,5–9,5 px); guion 20 px; subtítulos 20 px | ✅ |
| M2 | Controles del reproductor de 48 px; CTA de 48 px; capítulos de 28 px | ✅ Todos ≥ 24 px (WCAG 2.5.8) en `e2e.json` |
| M3 | Menos elementos: sin línea de tiempo del héroe; 6 unidades y 3 registros en E1; sin tarjeta de escena ni flechas; prototipo compacto | ✅ |
| M4 | Sin desplazamiento horizontal a 390 px y a 320 px (zoom 400 %) | ✅ |
| M5 | Prueba en iPhone (Safari) y Android (Chrome) reales | ⏳ |

## 4. Duración

| # | Prueba | Resultado |
|---|---|---|
| D1 | Reloj simulado: la presentación dura 90 s y recorre las 5 escenas en orden (EN y ES) | ✅ `e2e.json` |
| D2 | Reproducción real con voz: termina sola en 01:30 (EN y ES) | ✅ 98,9 s de reloj = 90 s + 1,5 s de pausa + 7 s de salto atrás de la prueba |
| D3 | Archivos de 90,0 s sin acelerar ni recortar | ✅ N3–N5 |
| D4 | Cronometrar a mano en el teléfono | ⏳ |

## 5. Conversión comercial

| # | Prueba | Resultado |
|---|---|---|
| V1 | "Explorar soluciones / Explore Our Solutions" (4 por página) → `/servicios/` y `/en/services/`, con las 3 páginas de servicio | ✅ Clic real |
| V2 | "Solicitar consulta / Request a Consultation" (5 por página, incluido el reproductor) → `#contacto`, visible, con formulario de 8 campos y botón de envío | ✅ Clic real; no se envió nada (bloqueado en la prueba) |
| V3 | El formulario existente no se modificó | ✅ `static.json` |
| V4 | Las páginas de servicios enlazan de vuelta a la experiencia | ✅ (1 línea añadida en cada página; se fusiona sin conflictos con el PR #6) |
| V5 | Envío real de prueba desde el Preview | ⏳ Requiere autorización de José |

## 6. SEO / GEO

| # | Prueba | Resultado |
|---|---|---|
| S1 | H1 exacto, un canonical autorreferente, `lang` correcto | ✅ |
| S2 | `<title>` de 30–60 caracteres (ES acortado a 60) | ✅ |
| S3 | Meta description exacta del Documento Maestro | ✅ (190/182 caracteres: Google puede recortarla) |
| S4 | hreflang es/en/x-default recíprocos, en la página y en el sitemap | ✅ |
| S5 | JSON-LD válido: Organization, WebSite, WebPage, BreadcrumbList y 4 Service; todas las referencias `@id` existen; sin dirección, reseñas ni precios | ✅ |
| S6 | Contenido indexable sin JS: guion completo, servicios, método, FAQ como H3 con respuesta, transcripción (más de 700 palabras) | ✅ |
| S7 | Enlaces internos: hacia los servicios y desde ellos | ✅ |
| S8 | Lighthouse SEO | ✅ 100 (6 corridas) |
| S9 | Validador de resultados enriquecidos de Google sobre la URL pública | ⏳ Solo es posible tras publicar |

## 7. Accesibilidad y rendimiento

| # | Prueba | Resultado |
|---|---|---|
| A1 | axe WCAG 2.2 AA: escritorio, móvil, reproductor abierto y movimiento reducido (EN y ES) | ✅ 0 violaciones |
| A2 | Teclado: el primer Tab enfoca "Saltar al contenido" y funciona; se llega al botón de la presentación; Enter abre; Espacio pausa; las flechas mueven el progreso; el foco circula dentro del reproductor; Esc cierra y devuelve el foco | ✅ `e2e-avanzado.json` (se corrigió que el foco salía del reproductor) |
| A3 | Foco visible (contorno ≥ 2 px) | ✅ |
| A4 | Subtítulos: activar/desactivar, sincronía y transcripción HTML | ✅ |
| A5 | Contraste | ✅ axe + Lighthouse Accesibilidad 100 |
| A6 | Lighthouse móvil (sin fotos ni fuentes) | ✅ Rendimiento 98–99 · LCP 2,1–2,3 s · CLS ≤ 0,033 · TBT ≤ 42 ms |
| A7 | Carga móvil de laboratorio: CPU 4×, 1,6 Mbps / 150 ms, foto del héroe sustituta de 330 KB (más pesada que la real) | 🟡 LCP 2,09 s (ES) / 2,10 s (EN), elemento LCP = foto del héroe · CLS 0 · respuesta a toques 128 ms · ~1,08 MB transferidos (sin narración) |
| A8 | Core Web Vitals de campo (p75) | ⏳ Solo después de publicar (Vercel Speed Insights / Search Console) |
| A9 | Compatibilidad con la CSP del PR #6 | ✅ 134/134, 0 violaciones |

## Resumen numérico

| Suite | Correctas |
|---|---|
| Estáticas (`static.mjs`) | **238 / 238** |
| Navegador (`e2e.mjs`) | **132 / 132** |
| Navegador con CSP del PR #6 | **134 / 134** |
| Avanzadas: audio real, teclado, CTA y carga (`e2e_avanzado.mjs`) | **56 / 56** |
| Verificación de audio (`verify_audio.py`) | **12 / 12** |

## Limitaciones declaradas

- **Navegadores:** solo Chromium automatizado. Safari iOS, Firefox y Edge quedan ⏳ (no se pudo instalar WebKit en el entorno).
- **Fotos:** Unsplash no es accesible desde el entorno de pruebas. La carga se midió con fotos sustitutas *más pesadas* que las reales, con retardo de red aplicado. Lighthouse se corrió sin fotos.
- **Calidad de voz:** la transcripción confirma las palabras, no el tono. La escucha humana es ⏳.
- **Rangos de bytes:** el salto dentro del audio se probó con un servidor local que acepta rangos, como Vercel. En el Preview se confirmó que el MP3 se sirve (200, `audio/mpeg`).
