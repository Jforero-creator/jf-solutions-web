// Pruebas en navegador (Chromium/Playwright + axe-core) de la experiencia de 90 s.
//   node dev/experiencia/tests/e2e.mjs [base]            (por defecto levanta el servidor local)
//   JF_CSP=ruta/vercel.json  -> sirve con las cabeceras de seguridad de esa configuración (p. ej. la del PR #6)
// Cubre: accesibilidad WCAG 2.2 AA, sin JS, movimiento reducido, scroll sin bloqueo, reproductor
// (controles, 90 s cronometrados con reloj simulado, subtítulos, idioma, sonido opt-in, Esc y foco),
// cambio de idioma conservando la escena, zoom/320 px sin scroll horizontal, consola y CSP.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = createRequire(process.cwd() + '/')('playwright'); }
const { chromium, devices } = pw;
const here = dirname(fileURLToPath(import.meta.url));
const axeSrc = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const C = JSON.parse(readFileSync(join(here, '..', 'content.json'), 'utf8'));

let base = process.argv[2], server;
if (!base) {
  const port = 8830 + Math.floor(Math.random() * 100);
  const a = [join(here, 'serve.mjs'), String(port)]; if (process.env.JF_CSP) a.push('--csp', process.env.JF_CSP);
  server = spawn(process.execPath, a, { stdio: 'ignore' });
  base = `http://127.0.0.1:${port}`;
  await new Promise((r) => setTimeout(r, 700));
}
let pass = 0, fail = 0; const results = [];
const ok = (c, name, info = '') => { (c ? pass++ : fail++); results.push({ ok: !!c, name, info: String(info) }); console.log(c ? '✓' : '✗', name, c ? '' : info); };
const browser = await chromium.launch();
const offline = (page) => page.route(/images\.unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
async function open(path, ctxOpts = {}) {
  const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage();
  const errors = [], csp = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await offline(page);
  await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => { (window.__csp = window.__csp || []).push(e.violatedDirective + ' ' + e.blockedURI); }); });
  await page.goto(base + path, { waitUntil: 'load' });
  return { ctx, page, errors, csp };
}
async function axe(page, label) {
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'], preload: false })).violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(' ')}`));
  ok(r.length === 0, `axe WCAG 2.2 AA sin violaciones — ${label}`, r.join(' | '));
}

for (const [lang, path] of [['es', '/experiencia/'], ['en', '/en/experience/']]) {
  const T = C[lang];
  // Escritorio y móvil, con movimiento
  for (const [dev, opts] of [['escritorio', { viewport: { width: 1440, height: 900 } }], ['móvil', { ...devices['iPhone 13'] }]]) {
    const { ctx, page, errors } = await open(path, opts);
    ok(await page.locator('h1').count() === 1, `${lang}/${dev}: un H1`);
    ok(await page.locator('[data-open-player]').isVisible(), `${lang}/${dev}: botón "${T.watch}" visible con JS`);
    // scroll libre: las escenas se activan sin bloquear el desplazamiento
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 1600); await page.waitForTimeout(400);
    ok((await page.evaluate(() => scrollY)) > y0 + 800, `${lang}/${dev}: el desplazamiento no está bloqueado (sin scroll-jacking)`);
    for (const id of ['s1', 's2', 's3', 's4', 's5']) { await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), id); await page.waitForTimeout(250); }
    ok(await page.locator('.scene.is-in').count() === 5, `${lang}/${dev}: las 5 escenas se activan al entrar en pantalla`);
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(hscroll <= 1, `${lang}/${dev}: sin desplazamiento horizontal`, hscroll);
    await page.waitForTimeout(6500);
    await axe(page, `${lang}/${dev} página`);
    // Reproductor
    await page.evaluate(() => scrollTo(0, 0));
    await page.click('[data-open-player]');
    ok(await page.locator('#xp-player').evaluate((d) => d.open), `${lang}/${dev}: el reproductor abre`);
    ok(await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-pl-play]')), `${lang}/${dev}: el foco pasa al botón de reproducción`);
    await page.waitForTimeout(1500);
    const st1 = await page.evaluate(() => window.JFXP.state());
    ok(st1.playing && st1.t > 0.8, `${lang}/${dev}: reproduce al abrir (visual + subtítulos)`, JSON.stringify(st1));
    ok(!st1.sound && st1.audioPaused !== false, `${lang}/${dev}: sin sonido hasta que el usuario lo activa`);
    const visibleCtas = await page.locator('.pl-ctas a').evaluateAll((as) => as.filter((a) => a.offsetParent && a.getBoundingClientRect().bottom <= innerHeight).length);
    ok(visibleCtas === 2, `${lang}/${dev}: dos CTA visibles dentro del reproductor`, visibleCtas);
    const small = await page.locator('#xp-player button:visible, #xp-player select:visible').evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).length);
    ok(small === 0, `${lang}/${dev}: controles de al menos 24×24 px (WCAG 2.5.8)`, small);
    await axe(page, `${lang}/${dev} reproductor abierto`);
    // Subtítulos por tiempo
    await page.evaluate(() => { window.JFXP.pause(); window.JFXP.seek(0); });
    const cuesVtt = readFileSync(join(here, '..', '..', '..', 'media', 'experiencia', `captions-${lang}.vtt`), 'utf8');
    const first = cuesVtt.match(/(\d\d):(\d\d):(\d\d)\.(\d{3}) --> (\d\d):(\d\d):(\d\d)\.(\d{3})\n(.+)/);
    const t1 = (+first[3] + +first[4] / 1000 + +first[7] + +first[8] / 1000) / 2;
    await page.evaluate((t) => window.JFXP.seek(t), t1);
    ok((await page.evaluate(() => window.JFXP.state().caption)) === first[9], `${lang}/${dev}: subtítulo sincronizado con el VTT a ${t1.toFixed(1)} s`, await page.evaluate(() => window.JFXP.state().caption));
    // CC desactiva
    await page.click('[data-pl-cc]');
    ok(await page.locator('[data-pl-cap]').evaluate((c) => c.hidden), `${lang}/${dev}: el botón CC oculta los subtítulos`);
    await page.click('[data-pl-cc]');
    // Cambio de idioma dentro del reproductor sin perder el tiempo
    const other = lang === 'es' ? 'en' : 'es';
    await page.evaluate(() => window.JFXP.seek(40));
    await page.selectOption('[data-pl-lang]', other);
    const st2 = await page.evaluate(() => window.JFXP.state());
    ok(st2.lang === other && Math.abs(st2.t - 40) < 0.5 && st2.scene === 2, `${lang}/${dev}: cambiar idioma en el reproductor conserva el minuto y la escena`, JSON.stringify(st2));
    await page.selectOption('[data-pl-lang]', lang);
    // Escenas por capítulo
    await page.click('[data-pl-chapter="3"]');
    ok((await page.evaluate(() => window.JFXP.state().scene)) === 3, `${lang}/${dev}: los botones de escena saltan a su escena`);
    // Esc cierra y devuelve el foco
    await page.keyboard.press('Escape');
    ok(!(await page.locator('#xp-player').evaluate((d) => d.open)), `${lang}/${dev}: Esc cierra el reproductor`);
    ok(await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-open-player]')), `${lang}/${dev}: el foco vuelve al botón que lo abrió`);
    ok(!(await page.evaluate(() => window.JFXP.state().playing)), `${lang}/${dev}: al cerrar se detiene`);
    ok(errors.length === 0, `${lang}/${dev}: sin errores de consola`, errors.join(' | '));
    await ctx.close();
  }

  // Reproducción completa cronometrada (reloj simulado): 90 s exactos, cinco escenas en orden
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
    await offline(page); await page.clock.install(); await page.goto(base + path);
    await page.click('[data-open-player]');
    const seen = [];
    for (let s = 0; s <= 92; s += 1) { await page.clock.runFor(1000); const st = await page.evaluate(() => window.JFXP.state()); if (seen[seen.length - 1] !== st.scene) seen.push(st.scene); }
    const st = await page.evaluate(() => window.JFXP.state());
    ok(Math.abs(st.t - 90) < 0.01 && !st.playing, `${lang}: la presentación dura 90 s y termina sola`, JSON.stringify(st));
    ok(seen.join() === '0,1,2,3,4', `${lang}: las cinco escenas aparecen en orden`, seen.join());
    ok(await page.locator('[data-pl-end]').isVisible(), `${lang}: al final se muestra el cierre con los CTA`);
    await ctx.close();
  }

  // Movimiento reducido
  {
    const { ctx, page } = await open(path, { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    await page.evaluate(() => document.getElementById('s1').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    const anim = await page.evaluate(() => [...document.querySelectorAll('.scene *')].filter((e) => { const s = getComputedStyle(e); return s.animationName !== 'none' && parseFloat(s.animationDuration) > 0; }).length);
    ok(anim === 0, `${lang}: con prefers-reduced-motion no hay animaciones`, anim);
    const op = await page.evaluate(() => getComputedStyle(document.querySelector('#s4 .visual')).opacity);
    ok(op === '1', `${lang}: con movimiento reducido las escenas se ven completas y estáticas`, op);
    await axe(page, `${lang} movimiento reducido`);
    await ctx.close();
  }

  // Sin JavaScript
  {
    const { ctx, page } = await open(path, { viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    const txt = await page.evaluate(() => document.body.innerText);
    ok(txt.includes(T.h1) && C.scenes.every((s) => txt.includes(s[lang].script)), `${lang}: sin JS se leen H1 y las cinco escenas`);
    ok(T.faq.every(([q]) => txt.includes(q)) && T.services.every((s) => txt.includes(s.name)), `${lang}: sin JS se leen servicios y FAQ`);
    ok(await page.locator(`a.btn-main:has-text("${T.ctaExplore}")`).first().isVisible() && await page.locator(`a:has-text("${T.ctaConsult}")`).first().isVisible(), `${lang}: sin JS los CTA son enlaces visibles`);
    ok(!(await page.locator('[data-open-player]').isVisible()), `${lang}: sin JS no se muestra un botón que no funcionaría`);
    ok((await page.evaluate(() => getComputedStyle(document.querySelector('#s3 .visual')).opacity)) === '1', `${lang}: sin JS las ilustraciones se ven en su estado final`);
    await ctx.close();
  }

  // Zoom: 320 px CSS (equivale a 400 % en 1280 px)
  {
    const { ctx, page } = await open(path, { viewport: { width: 320, height: 640 } });
    const h = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(h <= 1, `${lang}: a 320 px (zoom 400 %) no hay desplazamiento horizontal`, h);
    await ctx.close();
  }

  // Cambio de idioma conservando la escena
  {
    const { ctx, page } = await open(path, { viewport: { width: 1280, height: 800 } });
    await page.evaluate(() => document.getElementById('s3').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const target = lang === 'es' ? 'en' : 'es';
    await Promise.all([page.waitForNavigation(), page.click(`.lang a[hreflang="${target}"]`)]);
    ok(page.url().endsWith(C.routes[target] + '#s3'), `${lang}: el cambio de idioma lleva a la misma escena (#s3)`, page.url());
    ok((await page.evaluate(() => localStorage.getItem('jf-lang'))) === target, `${lang}: la preferencia de idioma queda guardada (jf-lang)`);
    await ctx.close();
  }

  // CSP (si se sirve con cabeceras de seguridad)
  if (process.env.JF_CSP) {
    const { ctx, page } = await open(path, { viewport: { width: 1280, height: 800 } });
    await page.click('[data-open-player]'); await page.waitForTimeout(800);
    const v = await page.evaluate(() => window.__csp || []);
    ok(v.length === 0, `${lang}: sin violaciones de la CSP (${process.env.JF_CSP.split('/').slice(-2).join('/')})`, v.join(' | '));
    await ctx.close();
  }
}

// Narración (solo si ya hay pistas pregrabadas)
let timing = null; try { timing = JSON.parse(readFileSync(join(here, '..', 'audio', 'timing.json'), 'utf8')); } catch { /* sin narración */ }
if (timing) {
  for (const [lang, path] of [['es', '/experiencia/'], ['en', '/en/experience/']]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
    await offline(page); await page.goto(base + path);
    await page.click('[data-open-player]');
    ok(!(await page.locator('[data-pl-sound]').isDisabled()), `${lang}: con narración el botón de sonido está disponible`);
    ok(await page.locator('[data-pl-ai-note]').isVisible(), `${lang}: se muestra el aviso de narración generada con IA`);
    ok((await page.evaluate(() => window.JFXP.state().audioTime)) === 0 && (await page.evaluate(() => document.querySelector('[data-pl-audio]').paused)), `${lang}: el audio no suena hasta activarlo`);
    await page.evaluate(() => window.JFXP.seek(31));
    await page.click('[data-pl-sound]');
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => window.JFXP.state());
    ok(st.sound && !st.audioPaused && Math.abs(st.audioTime - st.t) < 0.35, `${lang}: al activar el sonido la voz arranca en el mismo punto que la escena`, JSON.stringify({ t: st.t, a: st.audioTime }));
    const dur = await page.evaluate(() => document.querySelector('[data-pl-audio]').duration);
    ok(Math.abs(dur - 90) < 0.25, `${lang}: la pista de narración dura 90 s`, dur);
    await page.click('[data-pl-sound]');
    ok(await page.evaluate(() => document.querySelector('[data-pl-audio]').paused), `${lang}: silenciar detiene la voz; la presentación sigue`);
    ok((await page.evaluate(() => window.JFXP.state().playing)), `${lang}: la presentación continúa sin sonido`);
    // Si el audio falla, la experiencia sigue funcionando
    await page.route('**/narracion-*', (r) => r.abort());
    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const p2 = await ctx2.newPage();
    await offline(p2); await p2.route('**/media/experiencia/narracion-*', (r) => r.abort()); await p2.goto(base + path);
    await p2.click('[data-open-player]'); await p2.click('[data-pl-sound]'); await p2.waitForTimeout(1500);
    const s2 = await p2.evaluate(() => window.JFXP.state());
    ok(s2.playing && !s2.sound, `${lang}: si la narración no carga, la presentación sigue en silencio`, JSON.stringify(s2));
    await ctx2.close();
  }
}

await browser.close();
if (server) server.kill();
console.log(`\nPruebas en navegador: ${pass} correctas, ${fail} fallidas`);
if (process.env.JF_REPORT) writeFileSync(process.env.JF_REPORT, JSON.stringify({ pass, fail, results }, null, 2));
process.exit(fail ? 1 : 0);
