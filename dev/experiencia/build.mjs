// Genera la experiencia de 90 s de JF Solutions a partir de una sola fuente de textos.
//   node dev/experiencia/build.mjs          -> escribe las páginas y los subtítulos
//   node dev/experiencia/build.mjs --check  -> falla si los archivos publicados no coinciden con la fuente (CI)
// Salidas: /experiencia/index.html (ES), /en/experience/index.html (EN),
//          /media/experiencia/captions-es.vtt, /media/experiencia/captions-en.vtt
// Sin dependencias: Node 18+.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const C = JSON.parse(readFileSync(join(here, 'content.json'), 'utf8'));
const CHECK = process.argv.includes('--check');
const LANGS = ['es', 'en'];

// ---------- utilidades ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = (p) => C.site + p;
const other = (l) => (l === 'es' ? 'en' : 'es');
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.round(t % 60)).padStart(2, '0')}`;
const photo = (id, w, h) => `https://images.unsplash.com/${id}?auto=format&amp;fit=crop&amp;w=${w}&amp;h=${h}&amp;q=60`;
const srcset = (id, ws, ratio) => ws.map((w) => `${photo(id, w, Math.round(w / ratio))} ${w}w`).join(', ');

// ---------- tiempos de subtítulos (cronometrados por idioma) ----------
// Cada escena tiene su ventana fija del guion gráfico. Dentro de ella, cada frase recibe
// tiempo proporcional a su longitud en ese idioma, con entrada, pausas y salida.
export function cues(lang) {
  const out = [];
  for (const s of C.scenes) {
    const chunks = s[lang].chunks;
    const lead = s.start === 0 ? 0.8 : 0.6, tail = 0.9, gap = 0.3;
    const avail = s.end - s.start - lead - tail - gap * (chunks.length - 1);
    const total = chunks.reduce((a, c) => a + c.length, 0);
    let t = s.start + lead;
    chunks.forEach((text, i) => {
      const d = (avail * text.length) / total;
      out.push({ scene: s.id, start: +t.toFixed(2), end: +(t + d).toFixed(2), text });
      t += d + (i < chunks.length - 1 ? gap : 0);
    });
  }
  return out;
}
const vttTime = (t) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
};
function vtt(lang) {
  const head = lang === 'en' ? 'NOTE JF Solutions — 90-second story (EN). Generated from dev/experiencia/content.json' : 'NOTE JF Solutions — historia de 90 segundos (ES). Generado desde dev/experiencia/content.json';
  return `WEBVTT\n\n${head}\n\n` + cues(lang).map((c, i) => `${c.scene}-${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`).join('\n');
}

// ---------- componentes ----------
function Head(l) {
  const T = C[l], self = abs(C.routes[l]);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      // Mismos datos verificables que ya publica el sitio (servicios/index.html). Sin dirección, reseñas ni precios.
      { '@type': 'Organization', '@id': `${C.site}/#org`, name: 'JF Solutions', url: `${C.site}/`, logo: `${C.site}/assets/logo.jpg`, email: 'jforero@jfsolutions80.com', telephone: '+1-201-250-6729', founder: { '@type': 'Person', name: 'José Luis Forero Rodríguez' }, areaServed: { '@type': 'State', name: 'New Jersey' }, knowsLanguage: ['es', 'en'], sameAs: ['https://www.instagram.com/jfsolutionsq', 'https://www.youtube.com/channel/UC5ZBfUsEcBRaYcsDodkk-fg'] },
      { '@type': 'WebSite', '@id': `${C.site}/#website`, url: `${C.site}/`, name: 'JF Solutions', inLanguage: ['es', 'en'], publisher: { '@id': `${C.site}/#org` } },
      { '@type': 'WebPage', '@id': `${self}#page`, url: self, name: T.title, description: T.description, inLanguage: l, isPartOf: { '@id': `${C.site}/#website` }, about: { '@id': `${C.site}/#org` }, breadcrumb: { '@id': `${self}#crumbs` } },
      { '@type': 'BreadcrumbList', '@id': `${self}#crumbs`, itemListElement: [{ '@type': 'ListItem', position: 1, name: T.breadcrumbHome, item: `${C.site}/` }, { '@type': 'ListItem', position: 2, name: T.breadcrumbSelf, item: self }] },
      ...T.services.map((s, i) => ({ '@type': 'Service', '@id': `${self}#service-${i + 1}`, name: s.name, serviceType: s.name, description: s.text, url: abs(s.href), provider: { '@id': `${C.site}/#org` }, areaServed: [{ '@type': 'State', name: 'New Jersey' }, { '@type': 'State', name: 'New York' }], availableLanguage: ['es', 'en'] }))
    ]
  };
  return `<!doctype html>
<html lang="${T.htmlLang}" data-lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(T.title)}</title>
<meta name="description" content="${esc(T.description)}">
<link rel="canonical" href="${self}">
<link rel="alternate" hreflang="es" href="${abs(C.routes.es)}">
<link rel="alternate" hreflang="en" href="${abs(C.routes.en)}">
<link rel="alternate" hreflang="x-default" href="${abs(C.routes.es)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${self}">
<meta property="og:title" content="${esc(T.title)}">
<meta property="og:description" content="${esc(T.description)}">
<meta property="og:image" content="${C.site}/og.png">
<meta property="og:image:alt" content="JF Solutions">
<meta property="og:site_name" content="JF Solutions">
<meta property="og:locale" content="${T.ogLocale}">
<meta property="og:locale:alternate" content="${T.ogLocaleAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#060E1D">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="preload" as="image" media="(max-width: 899px)" imagesrcset="${srcset(C.photos.hero.id, [480, 720, 960, 1200], 0.75)}" imagesizes="100vw" fetchpriority="high">
<link rel="preload" as="image" media="(min-width: 900px)" imagesrcset="${srcset(C.photos.hero.id, [1280, 1600, 1920, 2400], 16 / 9)}" imagesizes="100vw" fetchpriority="high">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&amp;family=Instrument+Serif:ital@1&amp;family=Figtree:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@600&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/servicios.css">
<link rel="stylesheet" href="/assets/experiencia.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>`;
}

function LanguageSwitcher(l) {
  return `<div class="lang" role="group" aria-label="Idioma / Language">
        <a href="${C.routes.es}" hreflang="es" data-lang-switch aria-current="${l === 'es'}" title="Español">ES</a>
        <a href="${C.routes.en}" hreflang="en" data-lang-switch aria-current="${l === 'en'}" title="English">EN</a>
      </div>`;
}

function Header(l) {
  const T = C[l];
  return `<a class="skip" href="#main">${esc(T.skip)}</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="/"><img class="logo" src="/assets/logo.jpg" width="40" height="40" alt="">JF Solutions<small>${esc(T.brandSmall)}</small></a>
    <nav class="nav" aria-label="${esc(T.navLabel)}">
      ${T.nav.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join('\n      ')}
      <a class="nav-cta" href="${T.ctaConsultHref}">${esc(T.ctaConsult)}</a>
      ${LanguageSwitcher(l)}
    </nav>
  </div>
</header>`;
}

function CTAs(T, extra = '') {
  return `<div class="actions${extra}">
        <a class="btn btn-main" href="${T.ctaExploreHref}">${esc(T.ctaExplore)}</a>
        <a class="btn btn-ghost" href="${T.ctaConsultHref}">${esc(T.ctaConsult)}</a>
      </div>`;
}

function CinematicHero(l) {
  const T = C[l], p = C.photos.hero;
  return `<section class="xp-hero" aria-labelledby="xp-h1">
  <picture>
    <source media="(min-width: 900px)" srcset="${srcset(p.id, [1280, 1600, 1920, 2400], 16 / 9)}" sizes="100vw">
    <img class="xp-hero-bg" src="${photo(p.id, 720, 960)}" srcset="${srcset(p.id, [480, 720, 960, 1200], 0.75)}" sizes="100vw" width="720" height="960" alt="" fetchpriority="high" decoding="async">
  </picture>
  <div class="xp-hero-veil" aria-hidden="true"></div>
  <div class="xp-scan" aria-hidden="true"></div>
  <div class="wrap">
    <p class="eyebrow mono">${esc(T.concept)}</p>
    <h1 id="xp-h1">${esc(T.h1)}</h1>
    <p class="lead">${esc(T.description)}</p>
    ${CTAs(T)}
    <div class="xp-watch-row">
      <button type="button" class="xp-watch" data-open-player hidden><span class="xp-watch-ico" aria-hidden="true"></span><span>${esc(T.watch)}</span></button>
      <p class="xp-watch-note" data-open-player-note hidden>${esc(T.watchNote)}</p>
    </div>
    <ol class="xp-timeline" aria-label="${esc(T.storyKicker)}">
      ${C.scenes.map((s, i) => `<li><a href="#${s.id}"><span class="mono">${mmss(s.start)}</span>${esc(s[l].title)}</a></li>`).join('\n      ')}
    </ol>
  </div>
</section>`;
}

// Visuales de cada escena: HTML + CSS (texto real traducible, sin texto dentro de imágenes).
function Visual(s, l) {
  const V = s[l], lab = V.labels, p = C.photos[s.id], T = C[l];
  let art = '';
  if (s.kind === 'deviation') {
    art = `<div class="v-status"><span class="v-run">${esc(lab.running)}</span><span class="v-stop">${esc(lab.stopped)}</span></div>
      <div class="v-belt"><div class="v-units">${'<i></i>'.repeat(9)}</div><span class="v-flag"><b class="mono">${esc(lab.tag)}</b></span></div>
      <div class="v-records">${[1, 2, 3, 4, 5].map((n) => `<span class="${n === 4 ? 'miss' : ''}">${esc(lab.slot)} ${n === 4 ? '—' : '✓'}</span>`).join('')}</div>`;
  } else if (s.kind === 'disconnect') {
    art = `<svg class="v-links" viewBox="0 0 400 225" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M95 62 L305 62 M95 163 L305 163 M95 62 L95 163 M305 62 L305 163"/></svg>
      ${lab.nodes.map((n, i) => `<div class="v-node n${i + 1}"><span>${esc(n)}</span><i class="doc"></i><i class="doc"></i></div>`).join('')}
      <span class="v-gap mono">${esc(lab.gap)}</span>`;
  } else if (s.kind === 'flow') {
    art = `<ol class="v-flow">${lab.steps.map((st, i) => `<li style="--i:${i}"><span>${esc(st)}</span></li>`).join('')}</ol>`;
  } else if (s.kind === 'solutions') {
    art = `<ul class="v-cards">${lab.cards.map((c, i) => `<li style="--i:${i}">${esc(c)}</li>`).join('')}</ul>
      <div class="v-proto"><span class="v-ribbon mono">${esc(lab.proto)}</span><i></i><i></i><i></i><b></b></div>`;
  } else if (s.kind === 'invitation') {
    art = `<svg class="v-streams" viewBox="0 0 400 225" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M0 20 C140 30 160 100 200 112"/><path pathLength="1" d="M0 205 C140 200 160 125 200 112"/><path pathLength="1" d="M400 20 C260 30 240 100 200 112"/><path pathLength="1" d="M400 205 C260 200 240 125 200 112"/><path pathLength="1" d="M200 0 L200 112"/></svg>
      <img class="v-logo" src="/assets/logo.jpg" width="96" height="96" alt="" loading="lazy" decoding="async">`;
  }
  return `<figure class="visual v-${s.kind}">
      <img class="v-photo" src="${photo(p.id, 800, 450)}" srcset="${srcset(p.id, [480, 800, 1200, 1600], 16 / 9)}" sizes="(min-width: 960px) 58vw, 100vw" width="800" height="450" alt="" loading="lazy" decoding="async">
      <div class="v-veil" aria-hidden="true"></div>
      <div class="v-art" aria-hidden="true">${art}</div>
      <span class="v-chip mono" aria-hidden="true">${esc(T.illustrative)}</span>
      <figcaption class="sr-only">${esc(V.visual)} ${esc(T.photos)}: ${esc(p[l])}.</figcaption>
    </figure>`;
}

function Scene(s, i, l) {
  const T = C[l], V = s[l];
  const cta = s.kind === 'invitation' ? `\n      ${CTAs(T)}` : '';
  return `<section class="scene xp-a" id="${s.id}" data-scene="${i}" aria-labelledby="${s.id}-t">
    <div class="wrap scene-grid">
      <div class="scene-copy">
        <p class="scene-meta mono"><span>${esc(T.sceneWord)} ${i + 1} ${esc(T.ofWord)} ${C.scenes.length}</span><span>${mmss(s.start)}–${mmss(s.end)}</span></p>
        <h3 id="${s.id}-t">${esc(V.title)}</h3>
        <p class="scene-script">${esc(V.script)}</p>${cta}
      </div>
      ${Visual(s, l)}
    </div>
  </section>`;
}

function ScrollStory(l) {
  const T = C[l];
  return `<section class="xp-story" aria-labelledby="story-t">
  <div class="wrap xp-story-head">
    <p class="eyebrow mono">${esc(T.storyKicker)}</p>
    <h2 id="story-t">${esc(T.concept)}</h2>
    <p class="intro">${esc(T.storyIntro)}</p>
  </div>
  <div class="xp-progress" aria-hidden="true"><span></span></div>
  ${C.scenes.map((s, i) => Scene(s, i, l)).join('\n  ')}
</section>`;
}

function ServiceHighlights(l) {
  const T = C[l];
  return `<section class="sec navy2 xp-services" id="servicios-xp" aria-labelledby="svc-t">
  <div class="wrap">
    <p class="eyebrow mono">${esc(T.servicesKicker)}</p>
    <h2 id="svc-t">${esc(T.servicesTitle)}</h2>
    <ul class="xp-grid4">
      ${T.services.map((s) => `<li class="card"><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><a class="xp-more" href="${s.href}">${esc(s.link)}<span aria-hidden="true"> →</span></a></li>`).join('\n      ')}
    </ul>
  </div>
</section>
<section class="sec navy" id="metodo" aria-labelledby="met-t">
  <div class="wrap">
    <p class="eyebrow mono">${esc(T.methodKicker)}</p>
    <h2 id="met-t">${esc(T.methodTitle)}</h2>
    <ol class="xp-method">
      ${T.method.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('\n      ')}
    </ol>
  </div>
</section>
<section class="sec navy2" id="prototipos" aria-labelledby="pro-t">
  <div class="wrap">
    <p class="eyebrow mono">${esc(T.protoKicker)}</p>
    <h2 id="pro-t">${esc(T.protoTitle)}</h2>
    <p class="intro">${esc(T.protoNote)}</p>
    <ul class="xp-grid4">
      ${T.protos.map(([h, p]) => `<li class="card xp-proto"><span class="xp-badge mono">${esc(T.protoBadge)}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('\n      ')}
    </ul>
  </div>
</section>`;
}

function Faq(l) {
  const T = C[l];
  return `<section class="sec navy" id="faq" aria-labelledby="faq-t">
  <div class="wrap xp-faq-wrap">
    <div>
      <p class="eyebrow mono">${esc(T.faqKicker)}</p>
      <h2 id="faq-t">${esc(T.faqTitle)}</h2>
    </div>
    <div class="xp-faq">
      ${T.faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n      <p>${esc(a)}</p>`).join('\n      ')}
    </div>
  </div>
</section>
<section class="sec navy2" id="cobertura" aria-labelledby="area-t">
  <div class="wrap xp-area">
    <p class="eyebrow mono">${esc(T.areaKicker)}</p>
    <h2 id="area-t">${esc(T.areaTitle)}</h2>
    <p class="lead">${esc(T.areaText)}</p>
  </div>
</section>`;
}

function Transcript(l) {
  const T = C[l];
  return `<section class="sec navy xp-transcript" id="transcripcion" aria-labelledby="tr-t">
  <div class="wrap">
    <details>
      <summary><h2 id="tr-t">${esc(T.transcriptTitle)}</h2></summary>
      <ol>
        ${C.scenes.map((s) => `<li><h3>${mmss(s.start)}–${mmss(s.end)} · ${esc(s[l].title)}</h3><p>${esc(s[l].script)}</p><p class="xp-tr-visual"><b>${esc(T.transcriptVisual)}:</b> ${esc(s[l].visual)}</p></li>`).join('\n        ')}
      </ol>
    </details>
  </div>
</section>`;
}

function ConsultationCTA(l) {
  const T = C[l];
  return `<section class="xp-final" aria-labelledby="fin-t">
  <div class="wrap">
    <img src="/assets/logo.jpg" width="72" height="72" alt="" loading="lazy" decoding="async">
    <h2 id="fin-t">${esc(T.finalTitle)}</h2>
    <p class="lead">${esc(T.finalText)}</p>
    ${CTAs(T, ' xp-center')}
  </div>
</section>`;
}

// Reproductor: se crea oculto; solo aparece si JS funciona y el navegador soporta <dialog>.
function PresentationPlayer(l) {
  const P = C[l].player, T = C[l];
  const data = {
    duration: C.duration,
    lang: l,
    captions: { es: '/media/experiencia/captions-es.vtt', en: '/media/experiencia/captions-en.vtt' },
    // Narración opcional (opt-in). Vacío = aún no hay audio aprobado; el botón de sonido queda desactivado.
    audio: { es: '', en: '' },
    scenes: C.scenes.map((s) => ({ id: s.id, start: s.start, end: s.end, title: { es: s.es.title, en: s.en.title } })),
    cues: { es: cues('es'), en: cues('en') },
    ui: { es: C.es.player, en: C.en.player },
    ctas: { es: [C.es.ctaExplore, C.es.ctaExploreHref, C.es.ctaConsult, C.es.ctaConsultHref], en: [C.en.ctaExplore, C.en.ctaExploreHref, C.en.ctaConsult, C.en.ctaConsultHref] },
    sceneWord: { es: C.es.sceneWord, en: C.en.sceneWord }, ofWord: { es: C.es.ofWord, en: C.en.ofWord }
  };
  return `<dialog class="xp-player" id="xp-player" aria-labelledby="xp-player-t">
  <div class="pl-top">
    <p class="pl-title" id="xp-player-t"><span data-pl="dialogLabel">${esc(P.dialogLabel)}</span> · <span class="pl-scene" data-pl-scene></span></p>
    <button type="button" class="pl-btn pl-close" data-pl-close aria-label="${esc(P.close)}"><span aria-hidden="true">✕</span></button>
  </div>
  <div class="pl-stagewrap"><div class="pl-stage" data-pl-stage></div></div>
  <p class="pl-cap" data-pl-cap aria-hidden="true"></p>
  <div class="pl-end" data-pl-end hidden>
    <p class="pl-end-t" data-pl="end">${esc(P.end)}</p>
  </div>
  <div class="pl-bar">
    <div class="pl-controls">
      <button type="button" class="pl-btn" data-pl-play aria-label="${esc(P.play)}"><span class="ico-play" aria-hidden="true"></span></button>
      <button type="button" class="pl-btn" data-pl-restart aria-label="${esc(P.restart)}"><span aria-hidden="true">↺</span></button>
      <button type="button" class="pl-btn" data-pl-sound aria-pressed="false" aria-label="${esc(P.soundOn)}"><span class="ico-sound" aria-hidden="true"></span></button>
      <button type="button" class="pl-btn" data-pl-cc aria-pressed="true" aria-label="${esc(P.ccOff)}"><span aria-hidden="true">CC</span></button>
      <label class="pl-lang"><span class="sr-only" data-pl="language">${esc(P.language)}</span>
        <select data-pl-lang><option value="es">ES</option><option value="en">EN</option></select>
      </label>
      <span class="pl-time mono" data-pl-time aria-hidden="true">00:00 / 01:30</span>
    </div>
    <input class="pl-range" type="range" min="0" max="${C.duration}" step="1" value="0" data-pl-range aria-label="${esc(P.progress)}">
    <ol class="pl-chapters" data-pl-chapters aria-label="${esc(P.chapters)}">
      ${C.scenes.map((s, i) => `<li style="flex:${s.end - s.start} 1 0"><button type="button" data-pl-chapter="${i}"><span class="sr-only">${esc(s[l].title)}</span></button></li>`).join('')}
    </ol>
    <p class="pl-sound-note mono" data-pl-sound-note hidden>${esc(P.soundNA)}</p>
    <div class="pl-ctas">
      <a class="btn btn-main" data-pl-cta="0" href="${T.ctaExploreHref}">${esc(T.ctaExplore)}</a>
      <a class="btn btn-ghost" data-pl-cta="1" href="${T.ctaConsultHref}">${esc(T.ctaConsult)}</a>
    </div>
  </div>
  <audio data-pl-audio preload="none"></audio>
</dialog>
<script type="application/json" id="xp-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function Footer(l) {
  const T = C[l];
  return `<footer>
  <div class="wrap">
    <span>© <span id="year">2026</span> JF Solutions</span>
    <span>${esc(T.footerTag)}</span>
    <span class="foot-links">${T.footerLinks.map(([t, h]) => `<a href="${h}"${h.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(t)}</a>`).join('')}</span>
    <span>${esc(T.photos)}: <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a></span>
  </div>
</footer>`;
}

function page(l) {
  return `${Head(l)}
<body class="xp">
<!-- Generado por dev/experiencia/build.mjs desde dev/experiencia/content.json. No editar a mano. -->
${Header(l)}
<main id="main">
${CinematicHero(l)}
${ScrollStory(l)}
${ServiceHighlights(l)}
${Faq(l)}
${Transcript(l)}
${ConsultationCTA(l)}
</main>
${Footer(l)}
${PresentationPlayer(l)}
<script src="/assets/experiencia.js" defer></script>
<!-- Vercel Web Analytics -->
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

// ---------- escritura / verificación ----------
const outputs = {
  'experiencia/index.html': page('es'),
  'en/experience/index.html': page('en'),
  'media/experiencia/captions-es.vtt': vtt('es'),
  'media/experiencia/captions-en.vtt': vtt('en')
};
if (import.meta.url === `file://${process.argv[1]}`) {
  let stale = 0;
  for (const [rel, body] of Object.entries(outputs)) {
    const f = join(root, rel);
    if (CHECK) {
      if (!existsSync(f) || readFileSync(f, 'utf8') !== body) { console.error(`DESACTUALIZADO: ${rel}`); stale++; }
    } else {
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, body);
      console.log(`escrito ${rel} (${Buffer.byteLength(body)} B)`);
    }
  }
  if (CHECK) { if (stale) { console.error('Ejecuta: node dev/experiencia/build.mjs'); process.exit(1); } console.log('Salidas al día con content.json'); }
}
export { C, outputs };
