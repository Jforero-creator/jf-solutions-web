// Pruebas estáticas (sin navegador, sin dependencias): guion exacto, tiempos, SEO, enlaces,
// afirmaciones prohibidas, compatibilidad con la CSP del PR #6 y alcance del cambio.
//   node dev/experiencia/tests/static.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { cues, C } from '../build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
let pass = 0, fail = 0;
const results = [];
function ok(cond, name, info = '') { (cond ? pass++ : fail++); results.push({ ok: !!cond, name, info }); if (!cond) console.error('✗', name, info); }

// Copia independiente del guion del Documento Maestro v1.0 (sección 4) para detectar ediciones accidentales.
const SPEC = {
  en: [
    'One missing record. One delayed decision. One preventable disruption.',
    'When quality, production, maintenance and warehouse operate with disconnected information, risks become harder to detect and decisions take longer.',
    'JF Solutions helps organizations connect evidence, investigate root causes, strengthen traceability and build practical improvement plans. From receiving to final disposition, every decision should have a clear foundation.',
    'Quality control. Food safety. Process improvement. Traceability readiness. We combine operational experience, structured methods and digital innovation to help teams move from reactive work toward better control.',
    'Better operations begin with better visibility. Explore JF Solutions and discover where your next improvement can start.'
  ],
  es: [
    'Un registro faltante. Una decisión tardía. Una interrupción que pudo prevenirse.',
    'Cuando calidad, producción, mantenimiento y almacén trabajan con información desconectada, los riesgos son más difíciles de detectar y las decisiones tardan más.',
    'JF Solutions ayuda a conectar evidencia, investigar causas raíz, fortalecer la trazabilidad y construir planes prácticos de mejora. Desde la recepción hasta la disposición final, cada decisión debe tener un fundamento claro.',
    'Control de calidad. Inocuidad alimentaria. Mejora de procesos. Preparación para trazabilidad. Combinamos experiencia operacional, métodos estructurados e innovación digital para ayudar a los equipos a pasar de la reacción a un mejor control.',
    'Mejores operaciones comienzan con mayor visibilidad. Explora JF Solutions y descubre dónde puede comenzar tu próxima mejora.'
  ],
  windows: [[0, 10], [10, 30], [30, 55], [55, 75], [75, 90]],
  h1: { en: 'Quality & Food Safety Consulting in NJ & NY', es: 'Consultoría en calidad e inocuidad alimentaria en NJ y NY' },
  desc: {
    en: 'JF Solutions supports food manufacturers and industrial operations in New Jersey and New York with quality control, food safety, traceability readiness, CAPA and process improvement.',
    es: 'JF Solutions apoya a fabricantes de alimentos y operaciones industriales en New Jersey y New York con control de calidad, inocuidad, preparación para trazabilidad, CAPA y mejora de procesos.'
  },
  faqEn: [
    ['Where can I find quality and food safety consulting in New Jersey and New York?', 'JF Solutions provides practical consulting support for quality control, food safety, industrial traceability and process improvement for manufacturers and industrial operations serving New Jersey and New York.'],
    ['How can a manufacturer prepare for FSMA 204?', 'JF Solutions can support a readiness assessment, process mapping, traceability gap identification and corrective action planning. Applicability and compliance requirements must be assessed for each operation.'],
    ['Can JF Solutions help investigate recurring nonconformities?', 'JF Solutions applies structured root cause analysis, corrective action planning and effectiveness verification to help organizations address recurring process and quality issues.']
  ]
};
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const text = (h) => unesc(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

// 1. Guion y escenas
ok(C.duration === 90, 'Duración total 90 s');
C.scenes.forEach((s, i) => {
  ok(s.start === SPEC.windows[i][0] && s.end === SPEC.windows[i][1], `Escena ${i + 1}: ventana ${SPEC.windows[i]}`);
  for (const l of ['en', 'es']) {
    ok(s[l].script === SPEC[l][i], `Escena ${i + 1} ${l.toUpperCase()}: texto exacto del guion`);
    ok(s[l].chunks.join(' ') === s[l].script, `Escena ${i + 1} ${l.toUpperCase()}: los subtítulos reconstruyen el guion completo`);
  }
});
ok(C.scenes.length === 5, 'Cinco escenas');

// 2. Subtítulos cronometrados por idioma
for (const l of ['en', 'es']) {
  const cs = cues(l);
  let prev = 0, maxCps = 0;
  cs.forEach((c) => {
    const sc = C.scenes.find((s) => s.id === c.scene);
    ok(c.start >= sc.start && c.end <= sc.end, `${l}: "${c.text}" dentro de su escena`, `${c.start}-${c.end}`);
    ok(c.start >= prev, `${l}: sin solapes antes de "${c.text}"`);
    prev = c.end;
    maxCps = Math.max(maxCps, c.text.length / (c.end - c.start));
    ok(c.text.length <= 84, `${l}: "${c.text}" cabe en dos líneas`);
  });
  ok(maxCps <= 17, `${l}: velocidad de lectura ≤ 17 caracteres/s`, `máx ${maxCps.toFixed(1)}`);
  ok(cs[cs.length - 1].end <= 90, `${l}: el último subtítulo termina antes de 01:30`);
  const vtt = read(`media/experiencia/captions-${l}.vtt`);
  ok(vtt.startsWith('WEBVTT'), `${l}: archivo VTT válido (cabecera)`);
  ok((vtt.match(/-->/g) || []).length === cs.length, `${l}: VTT con ${cs.length} cues`);
}

const sm = read('sitemap.xml');
// 3. Páginas: SEO, encabezados, contenido rastreable, afirmaciones
const pages = { es: read('experiencia/index.html'), en: read('en/experience/index.html') };
const url = { es: 'https://www.jfsolutionsq.com/experiencia/', en: 'https://www.jfsolutionsq.com/en/experience/' };
for (const l of ['es', 'en']) {
  const h = pages[l], body = text(h);
  const h1s = [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1]).trim());
  ok(h1s.length === 1 && h1s[0] === SPEC.h1[l], `${l}: un solo H1 con el texto del Documento Maestro`, h1s.join(' | '));
  ok(h.includes(`<meta name="description" content="${SPEC.desc[l]}">`), `${l}: meta description exacta`);
  ok(h.includes(`<html lang="${l}"`), `${l}: atributo lang`);
  ok(h.includes(`<link rel="canonical" href="${url[l]}">`), `${l}: canonical autorreferente`);
  ok(h.includes(`hreflang="es" href="${url.es}"`) && h.includes(`hreflang="en" href="${url.en}"`) && h.includes(`hreflang="x-default" href="${url.es}"`), `${l}: alternates hreflang recíprocos`);
  SPEC[l].forEach((t, i) => ok(body.includes(t), `${l}: guion de la escena ${i + 1} visible en el HTML`));
  // Orden de encabezados sin saltos
  const levels = [...h.matchAll(/<h([1-6])\b/g)].map((m) => +m[1]);
  let jump = false; for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) jump = true;
  ok(levels[0] === 1 && !jump, `${l}: jerarquía de encabezados sin saltos`, levels.join(''));
  // JSON-LD
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let g = null; try { g = JSON.parse(ld[0][1]); } catch (e) { /* */ }
  ok(g && g['@graph'], `${l}: JSON-LD válido`);
  const types = g ? g['@graph'].map((n) => n['@type']) : [];
  ok(['Organization', 'WebSite', 'WebPage', 'Service'].every((t) => types.includes(t)), `${l}: Organization, WebSite, WebPage y Service presentes`, types.join(','));
  const ldStr = ld[0][1];
  ok(!/"address"|"aggregateRating"|"review"|"offers"|"price"|"FAQPage"|"LocalBusiness"|"ProfessionalService"/.test(ldStr), `${l}: JSON-LD sin dirección, reseñas, precios ni tipos no verificables`);
  // Afirmaciones no verificadas
  const banned = /\b(certified|certificad[oa]s?|guarantee[ds]?|garantiza\w*|testimonial|testimonio|our clients|nuestros clientes|FSMA 204 compliant|cumplimiento (?:total|garantizado)|\d+\s?% )/i;
  ok(!banned.test(body), `${l}: sin certificaciones, clientes, testimonios, garantías ni porcentajes inventados`, (body.match(banned) || [''])[0]);
  ok(/FSMA 204/.test(body) && /(assessed for each operation|evaluarse para cada operación)/.test(body), `${l}: FSMA 204 solo como preparación, con aviso de aplicabilidad`);
  const protoBadge = C[l].protoBadge;
  ok((h.match(new RegExp(protoBadge.replace(/[/]/g, '\\/'), 'g')) || []).length >= 4, `${l}: prototipos ORA, ORA Lab, JF SOP y trazabilidad etiquetados`);
  ok((h.match(/class="v-chip mono"/g) || []).length === 5, `${l}: las 5 ilustraciones marcadas como ilustrativas`);
  // CTA visibles al inicio y al final
  const cE = (h.match(new RegExp(`>${C[l].ctaExplore}<`, 'g')) || []).length, cC = (h.match(new RegExp(`>${C[l].ctaConsult}<`, 'g')) || []).length;
  ok(cE >= 3 && cC >= 3, `${l}: CTA en héroe, escena final, cierre y reproductor`, `${cE}/${cC}`);
  // Sin autoplay, sin video bloqueante
  ok(!/autoplay/i.test(h), `${l}: sin autoplay`);
  // Imágenes con alt y dimensiones
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  ok(imgs.every((i) => /\balt="/.test(i) && /\bwidth="\d+"/.test(i) && /\bheight="\d+"/.test(i)), `${l}: imágenes con alt, width y height (CLS)`);
  // Recursos externos compatibles con la CSP del PR #6
  const ext = [...h.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1].replace(/&amp;/g, '&')).host);
  const scripts = [...h.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  ok(scripts.every((s) => s.startsWith('/')), `${l}: solo scripts propios (CSP script-src 'self')`, scripts.join(','));
  const allowedHosts = ['www.jfsolutionsq.com', 'images.unsplash.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unsplash.com', 'www.instagram.com', 'www.youtube.com', 'ora.jfsolutionsq.com'];
  ok(ext.every((x) => allowedHosts.includes(x)), `${l}: dominios externos permitidos`, [...new Set(ext)].join(','));
  // Enlaces internos existen
  const internal = [...h.matchAll(/href="(\/[^"#]*)(#[^"]*)?"/g)].map((m) => m[1]);
  const missing = [...new Set(internal)].filter((p) => { const f = join(root, p); return !(existsSync(f) && (p.endsWith('/') ? existsSync(join(f, 'index.html')) : true)) && !p.startsWith('/_vercel'); });
  ok(missing.length === 0, `${l}: enlaces internos existen`, missing.join(','));
  const anchors = [...h.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  ok(anchors.every((a) => h.includes(`id="${a}"`)), `${l}: anclas internas existen`);
  ok(h.includes('/servicios/#contacto') || h.includes('/en/services/#contacto'), `${l}: "Solicitar consulta" lleva al formulario existente`);
}
// SEO/GEO adicional
for (const l of ['es', 'en']) {
  const h = pages[l];
  const title = unesc((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  ok(title.length >= 30 && title.length <= 60, `${l}: <title> de 30–60 caracteres`, `${title.length}: ${title}`);
  ok((h.match(/<link rel="canonical"/g) || []).length === 1 && (h.match(/<h1\b/g) || []).length === 1, `${l}: un canonical y un H1`);
  ok(h.includes('<meta property="og:title"') && h.includes('<meta property="og:description"') && h.includes('<meta property="og:image"') && h.includes(`og:locale" content="${l === 'es' ? 'es_ES' : 'en_US'}`), `${l}: metadatos Open Graph completos`);
  const g = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const ids = new Set(g.map((n) => n['@id']).filter(Boolean));
  const refs = JSON.stringify(g).match(/"@id":"[^"]+"/g).map((x) => x.slice(7, -1));
  ok(refs.every((r) => ids.has(r)), `${l}: todas las referencias @id del JSON-LD existen`);
  const svcs = g.filter((n) => n['@type'] === 'Service');
  ok(svcs.length === 4 && svcs.every((n) => n.name && n.provider && n.areaServed && n.url && n.description), `${l}: 4 Service con nombre, proveedor, área, URL y descripción`);
  const wp = g.find((n) => n['@type'] === 'WebPage');
  ok(wp.inLanguage === l && wp.url === url[l], `${l}: WebPage con idioma y URL correctos`);
  // Texto indexable sustancial y preguntas como encabezados (útil para buscadores y asistentes)
  const words = text(h.replace(/<dialog[\s\S]*<\/dialog>/, '')).split(' ').length;
  ok(words > 700, `${l}: contenido indexable sustancial en HTML`, `${words} palabras`);
  ok((h.match(/<h3>[^<]*\?<\/h3>/g) || []).length === 3, `${l}: las 3 preguntas frecuentes son encabezados H3 con respuesta debajo`);
  // hreflang del sitemap coincide con los de la página
  const blk = sm.split('<url>').find((b) => b.includes(`<loc>${url[l]}</loc>`)) || '';
  ok(blk.includes(`hreflang="es" href="${url.es}"`) && blk.includes(`hreflang="en" href="${url.en}"`), `${l}: hreflang del sitemap coincide con la página`);
}
ok(read('servicios/index.html').includes('href="/experiencia/"') && read('en/services/index.html').includes('href="/en/experience/"'), 'Enlaces internos desde las páginas de servicios hacia la experiencia');
// FAQ EN exacta y ES presente
SPEC.faqEn.forEach(([q, a]) => ok(text(pages.en).includes(q) && text(pages.en).includes(a), `en: FAQ visible "${q.slice(0, 40)}…"`));
ok(C.es.faq.length === 3, 'es: tres preguntas frecuentes equivalentes');
// Destinos de CTA existen y conservan el formulario
ok(read('servicios/index.html').includes('id="contacto"') && read('en/services/index.html').includes('id="contacto"'), 'El formulario existente (#contacto) sigue en las páginas de servicios');

// 4. Sitemap y robots
ok(sm.includes('<loc>https://www.jfsolutionsq.com/experiencia/</loc>') && sm.includes('<loc>https://www.jfsolutionsq.com/en/experience/</loc>'), 'Sitemap incluye ambas URLs');
ok((sm.match(/<url>/g) || []).length === (sm.match(/<\/url>/g) || []).length, 'Sitemap bien formado');
ok(read('robots.txt').includes('Sitemap:'), 'robots.txt intacto con referencia al sitemap');

// 5. Alcance: no se modificó ninguna página ni configuración existente (solo sitemap.xml)
try {
  execSync('git fetch -q origin main', { cwd: root, stdio: 'ignore' });
  const BASE = '9285e429adfc605bcea542543a5d0cc4d803b7ba'; // main antes de la experiencia (1-nov-2026)
  const changed = execSync(`git diff --name-status ${BASE}...HEAD`, { cwd: root }).toString().trim().split('\n').filter(Boolean);
  const modified = changed.filter((l) => !l.startsWith('A')).map((l) => l.split('\t')[1]);
  const allowed = ['sitemap.xml', 'servicios/index.html', 'en/services/index.html', 'index.html'];
  ok(modified.every((f) => allowed.includes(f)), 'Solo se añadieron archivos (excepto sitemap y un enlace en las 2 páginas de servicios)', modified.join(','));
  const hubDiff = execSync(`git diff ${BASE}...HEAD -- servicios/index.html en/services/index.html`, { cwd: root }).toString().split('\n').filter((l) => /^[-+](?![-+])/.test(l));
  ok(hubDiff.length === 2 && hubDiff.every((l) => l.startsWith('+') && /experiencia|experience/.test(l)), 'Páginas de servicios: solo se añade una línea con el enlace a la experiencia', hubDiff.join(' | '));
  const homeDiff = execSync(`git diff ${BASE}...HEAD -- index.html`, { cwd: root }).toString().split('\n').filter((l) => /^[-+](?![-+])/.test(l));
  ok(homeDiff.length === 0 || homeDiff.every((l) => l.startsWith('+')), 'Portada: solo se añaden líneas (acceso a la experiencia), nada se borra ni se cambia', homeDiff.filter((l) => l.startsWith('-')).join(' | '));
  ok(!changed.some((l) => /vercel\.json|manos\.html|servicios\.js|servicios\.css|site\.css/.test(l)), 'Sin cambios en vercel.json, portada, formulario, estilos ni Reto GMP');
} catch (e) { ok(false, 'git disponible para verificar el alcance', e.message); }

// 6. Secretos
const all = Object.values(pages).join('\n') + read('assets/experiencia.js') + read('assets/experiencia.css');
ok(!/(sk-ant-|api[_-]?key\s*[:=]|secret|token\s*[:=]|BEGIN [A-Z ]*PRIVATE KEY)/i.test(all), 'Sin secretos en los archivos de la experiencia');

console.log(`\nPruebas estáticas: ${pass} correctas, ${fail} fallidas`);
if (process.env.JF_REPORT) { (await import('node:fs')).writeFileSync(process.env.JF_REPORT, JSON.stringify({ pass, fail, results }, null, 2)); }
process.exit(fail ? 1 : 0);
