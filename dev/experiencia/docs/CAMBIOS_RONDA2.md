# Cambios — Ronda 2 (respuesta a "Aprobado con correcciones")

1. **Narración verificada con audio real**
   - Transcripción local de cada toma y del archivo publicado. **Defecto encontrado y corregido:** en inglés, la escena 1 sonaba "delayed *season*". Se generaron 2 tomas nuevas (182 créditos) y se eligió una verificada.
   - Elección de tomas por transcripción. Se descartaron 4 tomas más con defectos audibles.
   - Prueba real de 90 s por idioma con la voz sonando: deriva máxima de 0,02 s; pausa, reanudación, salto y cambio de idioma sincronizados; subtítulo en pantalla el 99–100 % del tiempo con voz audible.
   - **Corrección de robustez:** si el navegador no podía saltar dentro del audio, la presentación volvía al inicio. Ahora corrige la voz y mantiene la escena.
   - En iPhone: MP3 primero, cambio automático de formato y botón "Voz" visible (ya en el Preview anterior).
2. **Cinematografía**
   - Cada escena avanza por "beats" en el instante real de cada frase, igual en scroll y en presentación.
   - Apertura de 0–10 s: línea en marcha → "registro faltante" → "decisión pendiente" (reloj) → "línea detenida" con la unidad desviada.
   - Cortes entre escenas con barrido dorado y escala, y tarjeta de escena "01 / 05" en escritorio.
   - Se quitaron los pulsos infinitos. El texto aparece primero; solo `transform`/`opacity`.
3. **Móvil**
   - Textos de ilustración de 11,5–14 px (antes 8,5–9,5) y guion y subtítulos de 20 px.
   - Controles y CTA de 48 px.
   - Menos elementos: sin línea de tiempo en el héroe, menos unidades y registros, sin tarjeta superpuesta ni flechas, y prototipo compacto.
4. **Conversión:** se verificaron con clics reales los 9 CTA por página y el formulario de destino. Las páginas de servicios ahora enlazan a la experiencia (1 línea en cada una, sin conflicto con el PR #6).
5. **SEO/GEO:** título en español acortado a 60 caracteres y 12 verificaciones nuevas (Open Graph, `@id` del JSON-LD, Service, WebPage, contenido indexable, FAQ en H3, hreflang del sitemap y enlaces internos).
6. **Accesibilidad y rendimiento**
   - El foco circula dentro del reproductor; antes podía salir con Tab.
   - Las escenas del reproductor se preparan en tiempo libre, para que abrirlo responda al instante.
   - Nueva prueba de teclado completa.
   - Medición de carga móvil con CPU 4× y red lenta.
