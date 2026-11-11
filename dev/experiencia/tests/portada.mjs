// Pruebas del acceso a la experiencia desde la portada (ES/EN), llegada con ?ver=1, accesibilidad y CLS.
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
const port = 9030 + Math.floor(Math.random() * 50);
const server = spawn(process.execPath, [join(here, 'serve.mjs'), String(port)], { stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`; await new Promise((r) => setTimeout(r, 700));
let pass = 0, fail = 0; const results = [];
const ok = (c, n, i = '') => { (c ? pass++ : fail++); results.push({ ok: !!c, name: n, info: String(i) }); console.log(c ? '✓' : '✗', n, i ? `— ${i}` : ''); };
const browser = await chromium.launch();
const block = (p) => p.route(/unsplash|fonts\.g|googletagmanager|google-analytics/, (r) => r.abort());
for (const [dev, opts] of [['escritorio', { viewport: { width: 1440, height: 900 } }], ['móvil', { ...devices['iPhone 13'] }]]) {
  for (const lang of ['es', 'en']) {
    const ctx = await browser.newContext(opts); const page = await ctx.newPage(); await block(page);
    await page.addInitScript((l) => { try { localStorage.setItem('jf-lang', l); } catch (e) {} new PerformanceObserver((li) => { for (const e of li.getEntries()) if (!e.hadRecentInput) window.__cls = (window.__cls || 0) + e.value; }).observe({ type: 'layout-shift', buffered: true }); }, lang);
    await page.goto(base + '/');
    if (lang === 'en') { await page.click('.lang button[data-set="en"]'); }
    await page.waitForTimeout(800);
    const card = page.locator(`a.xpt[lang="${lang}"]`);
    const vis = await card.isVisible();
    ok(vis, `${dev}/${lang}: el botón de 90 s es visible`);
    const box = await card.boundingBox();
    const vh = await page.evaluate(() => innerHeight);
    ok(box && box.y + box.height <= vh, `${dev}/${lang}: está en la primera pantalla, sin desplazarse`, box && `y=${Math.round(box.y)}–${Math.round(box.y + box.height)} de ${vh}`);
    ok(box && box.height >= 44, `${dev}/${lang}: área táctil ≥ 44 px`, box && Math.round(box.height));
    const txt = (await card.innerText()).replace(/\s+/g, ' ');
    ok(lang === 'es' ? txt.includes('Mira en 90 segundos en qué podemos ayudarte') : txt.includes('See in 90 seconds how we can help you'), `${dev}/${lang}: texto aprobado`, txt);
    const other = page.locator(`a.xpt[lang="${lang === 'es' ? 'en' : 'es'}"]`);
    ok(!(await other.isVisible()), `${dev}/${lang}: solo se muestra el botón del idioma activo`);
    const anim = await page.evaluate(() => [...document.querySelectorAll('.xpt *, .xpt')].some((e) => getComputedStyle(e).animationName !== 'none' || getComputedStyle(e, '::after').animationName !== 'none'));
    ok(anim, `${dev}/${lang}: vista previa animada (sin sonido: no hay audio ni video)`, await page.evaluate(() => document.querySelectorAll('.xpt audio, .xpt video').length));
    ok((await page.evaluate(() => window.__cls || 0)) <= 0.1, `${dev}/${lang}: sin saltos de diseño (CLS ≤ 0,1)`, (await page.evaluate(() => window.__cls || 0)).toFixed(3));
    if (dev === 'móvil') {
      await page.addScriptTag({ content: axeSrc });
      const v = await page.evaluate(async () => (await axe.run('.hero', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, preload: false })).violations.map((x) => x.id + ':' + x.nodes.length));
      ok(v.length === 0, `${lang}: axe WCAG 2.2 AA sin violaciones en el héroe con el botón`, v.join(','));
    }
    // Clic → la experiencia abre la presentación sin sonido y limpia la URL
    await Promise.all([page.waitForNavigation(), card.click()]);
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => ({ path: location.pathname + location.search, open: document.getElementById('xp-player').open, st: window.JFXP.state(), hint: document.querySelector('[data-pl-sound]').classList.contains('pl-hint') }));
    ok(st.path === (lang === 'es' ? '/experiencia/' : '/en/experience/'), `${dev}/${lang}: lleva a la experiencia en su idioma y limpia ?ver=1`, st.path);
    ok(st.open && st.st.playing && !st.st.sound, `${dev}/${lang}: la presentación se abre sola, sin sonido`, JSON.stringify({ open: st.open, playing: st.st.playing, sound: st.st.sound }));
    ok(st.hint, `${dev}/${lang}: el botón «Voz» se destaca para invitar a escuchar`);
    await page.keyboard.press('Escape');
    ok(!(await page.locator('#xp-player').evaluate((d) => d.open)), `${dev}/${lang}: se puede cerrar y queda la página completa`);
    await ctx.close();
  }
}
// Movimiento reducido: estático
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const page = await ctx.newPage(); await block(page); await page.goto(base + '/');
  const n = await page.evaluate(() => [...document.querySelectorAll('.xpt, .xpt *')].filter((e) => { const s = getComputedStyle(e); return s.animationName !== 'none' && parseFloat(s.animationDuration) > 0; }).length);
  ok(n === 0, 'Con movimiento reducido la vista previa queda estática', n); await ctx.close(); }
// Sin JS: el enlace funciona igual
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false }); const page = await ctx.newPage(); await block(page); await page.goto(base + '/');
  ok(await page.locator('a.xpt[href="/experiencia/?ver=1"]').count() === 1 && await page.locator('a.xpt[href="/en/experience/?ver=1"]').count() === 1, 'Sin JS los enlaces existen en HTML (ES y EN)'); await ctx.close(); }
await browser.close(); server.kill();
console.log(`\nPruebas de portada: ${pass} correctas, ${fail} fallidas`);
if (process.env.JF_REPORT) writeFileSync(process.env.JF_REPORT, JSON.stringify({ pass, fail, results }, null, 2));
process.exit(fail ? 1 : 0);
