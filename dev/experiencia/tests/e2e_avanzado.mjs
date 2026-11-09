// Pruebas avanzadas en navegador (Chromium real, sin reloj simulado):
//  A. Narración con audio real: 90 s completos por idioma, deriva voz/escena, subtítulos vs. energía real de la voz,
//     pausa/reanudar, salto, cambio de idioma con la voz sonando, fin sin cortes.
//  B. Teclado: orden de foco, «Saltar al contenido», abrir/usar/cerrar el reproductor sin ratón, foco visible.
//  C. Conversión: destinos de «Explorar soluciones» y «Solicitar consulta» (héroe, escena 5, cierre y reproductor).
//  D. Carga móvil (laboratorio): CPU 4× y red 4G lenta, fotos sustitutas pesadas; LCP, CLS, respuesta a interacciones.
//   node dev/experiencia/tests/e2e_avanzado.mjs [base]      JF_SKIP_AUDIO=1 omite A (tarda ~3,5 min)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = createRequire(process.cwd() + '/')('playwright'); }
const { chromium, devices } = pw;
const here = dirname(fileURLToPath(import.meta.url));
const C = JSON.parse(readFileSync(join(here, '..', 'content.json'), 'utf8'));
const fix = (f) => readFileSync(join(here, 'fixtures', f));

let base = process.argv[2], server;
if (!base) {
  const port = 8930 + Math.floor(Math.random() * 60);
  server = spawn(process.execPath, [join(here, 'serve.mjs'), String(port)], { stdio: 'ignore' });
  base = `http://127.0.0.1:${port}`; await new Promise((r) => setTimeout(r, 700));
}
let pass = 0, fail = 0; const results = [], metrics = {};
const ok = (c, name, info = '') => { (c ? pass++ : fail++); results.push({ ok: !!c, name, info: String(info) }); console.log(c ? '✓' : '✗', name, info ? `— ${info}` : ''); };
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const offline = (page) => page.route(/images\.unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const paths = { es: '/experiencia/', en: '/en/experience/' };

// ---------- A. Narración con audio real ----------
if (!process.env.JF_SKIP_AUDIO) for (const lang of ['es', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); await offline(page);
  await page.goto(base + paths[lang]);
  await page.click('[data-open-player]');
  await page.waitForTimeout(300);
  // Medidor de energía: AnalyserNode sobre el <audio> (solo en la prueba)
  await page.evaluate(() => {
    const a = document.querySelector('[data-pl-audio]'); const ac = new AudioContext(); const src = ac.createMediaElementSource(a);
    const an = ac.createAnalyser(); an.fftSize = 2048; src.connect(an); an.connect(ac.destination);
    const buf = new Float32Array(an.fftSize);
    window.__rms = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return Math.sqrt(s / buf.length); };
    window.__ac = ac;
  });
  await page.evaluate(() => { window.JFXP.pause(); window.JFXP.seek(0); });
  await page.click('[data-pl-sound]'); // la voz arranca con la presentación
  await page.evaluate(() => window.__ac.resume());
  const t0 = Date.now(); const samples = [];
  let paused = false, seeked = false, switched = false, pauseInfo = null, seekInfo = null, switchInfo = null;
  while (true) {
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => ({ ...window.JFXP.state(), rms: window.__rms(), rate: document.querySelector('[data-pl-audio]').playbackRate, ended: document.querySelector('[data-pl-audio]').ended }));
    samples.push({ wall: (Date.now() - t0) / 1000, ...s });
    // Pausa y reanudación a los ~20 s
    if (!paused && s.t > 20) {
      paused = true; await page.click('[data-pl-play]'); await page.waitForTimeout(1500);
      const a = await page.evaluate(() => window.JFXP.state());
      await page.click('[data-pl-play]'); await page.waitForTimeout(700);
      const b = await page.evaluate(() => window.JFXP.state());
      pauseInfo = { pausedAudio: a.audioPaused, tPaused: a.t, tResumed: b.t, audioResumed: !b.audioPaused, drift: Math.abs(b.audioTime - b.t) };
    }
    // Salto atrás a los ~40 s (y la voz sigue sincronizada)
    if (!seeked && s.t > 40) {
      seeked = true; await page.evaluate(() => window.JFXP.seek(33)); await page.waitForTimeout(900);
      const b = await page.evaluate(() => window.JFXP.state()); seekInfo = { t: b.t, audio: b.audioTime, drift: Math.abs(b.audioTime - b.t), scene: b.scene };
    }
    // Cambio de idioma con la voz sonando a los ~60 s
    if (!switched && s.t > 60) {
      switched = true; const other = lang === 'es' ? 'en' : 'es';
      await page.selectOption('[data-pl-lang]', other); await page.waitForTimeout(1500);
      const b = await page.evaluate(() => window.JFXP.state());
      switchInfo = { lang: b.lang, src: b.audioSrc, drift: Math.abs(b.audioTime - b.t), playing: !b.audioPaused };
      await page.selectOption('[data-pl-lang]', lang); await page.waitForTimeout(1200);
    }
    if (!s.playing && s.t >= 89.9) break;
    if ((Date.now() - t0) / 1000 > 130) break;
  }
  const last = samples[samples.length - 1];
  const steady = samples.filter((x) => x.playing && !x.audioPaused && x.audioTime > 0.5);
  const maxDrift = Math.max(...steady.map((x) => Math.abs(x.audioTime - x.t)));
  const voiced = samples.filter((x) => x.rms > 0.02 && x.playing);
  const withCap = voiced.filter((x) => x.caption && x.caption.length > 0).length;
  const silentCap = samples.filter((x) => x.playing && x.rms < 0.002 && x.caption).length;
  metrics[`audio_${lang}`] = { wallSeconds: +(last.wall).toFixed(1), maxDrift: +maxDrift.toFixed(3), voicedSamples: voiced.length, voicedWithCaption: withCap, pauseInfo, seekInfo, switchInfo };
  ok(Math.abs(last.t - 90) < 0.05 && !last.playing, `${lang}: la presentación con voz termina sola en 01:30`, `t=${last.t.toFixed(2)}`);
  ok(steady.every((x) => x.rate === 1), `${lang}: la voz suena a velocidad normal (sin acelerar)`);
  ok(maxDrift < 0.35, `${lang}: voz y escenas sincronizadas (deriva máx. ${maxDrift.toFixed(2)} s)`);
  ok(voiced.length > 100 && withCap / voiced.length >= 0.95, `${lang}: cuando suena la voz hay subtítulo en pantalla`, `${withCap}/${voiced.length}`);
  ok(pauseInfo && pauseInfo.pausedAudio && Math.abs(pauseInfo.tResumed - pauseInfo.tPaused) < 1 && pauseInfo.audioResumed && pauseInfo.drift < 0.35, `${lang}: pausa detiene la voz y reanudar continúa en el mismo punto`, JSON.stringify(pauseInfo));
  ok(seekInfo && Math.abs(seekInfo.t - 33.9) < 1 && seekInfo.drift < 0.35 && seekInfo.scene === 2, `${lang}: al saltar, voz y escena se recolocan juntas`, JSON.stringify(seekInfo));
  ok(switchInfo && switchInfo.playing && switchInfo.drift < 0.4 && switchInfo.src.includes(`narracion-${lang === 'es' ? 'en' : 'es'}`), `${lang}: cambiar de idioma con la voz sonando conserva el minuto`, JSON.stringify(switchInfo));
  ok(last.wall > 88 && last.wall < 100, `${lang}: duración real de reproducción ≈ 90 s (más las pausas de la prueba)`, `${last.wall.toFixed(1)} s de reloj, con ~1,5 s de pausa y un salto atrás de ~7 s`);
  ok(silentCap / samples.length < 0.35, `${lang}: los subtítulos no se quedan largo tiempo sin voz`, `${silentCap}/${samples.length}`);
  await ctx.close();
}

// ---------- B. Teclado ----------
for (const lang of ['es', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); await offline(page);
  await page.goto(base + paths[lang]);
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement.matches('a.skip')), `${lang}: el primer Tab enfoca «${C[lang].skip}»`);
  const skipVisible = await page.evaluate(() => document.activeElement.getBoundingClientRect().top >= 0);
  ok(skipVisible, `${lang}: el enlace de salto es visible al enfocarlo`);
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => location.hash === '#main'), `${lang}: «Saltar al contenido» lleva al contenido principal`);
  // Recorre con Tab hasta el botón de la presentación
  let reached = false, outlines = 0;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { open: e.matches('[data-open-player]'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; });
    if (info.outline) outlines++;
    if (info.open) { reached = true; break; }
  }
  ok(reached, `${lang}: el botón de la presentación se alcanza con el teclado`);
  ok(outlines > 0, `${lang}: el foco es visible (contorno ≥ 2 px)`);
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  ok(await page.locator('#xp-player').evaluate((d) => d.open), `${lang}: Enter abre el reproductor`);
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  ok(!(await page.evaluate(() => window.JFXP.state().playing)), `${lang}: Espacio sobre el botón pausa`);
  let inside = true;
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); inside = inside && await page.evaluate(() => !!document.activeElement.closest('#xp-player')); }
  ok(inside, `${lang}: el foco se mantiene dentro del reproductor mientras está abierto`);
  await page.focus('[data-pl-range]'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  ok((await page.evaluate(() => window.JFXP.state().t)) >= 1.9, `${lang}: las flechas mueven la barra de progreso`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(!(await page.locator('#xp-player').evaluate((d) => d.open)) && await page.evaluate(() => document.activeElement.matches('[data-open-player]')), `${lang}: Esc cierra y devuelve el foco (sin trampas de teclado)`);
  await ctx.close();
}

// ---------- C. Conversión: destinos de los CTA ----------
for (const lang of ['es', 'en']) {
  const T = C[lang];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); await offline(page);
  await page.route('https://api.web3forms.com/**', (r) => r.abort()); // nunca se envía nada
  await page.goto(base + paths[lang]);
  const explore = await page.locator(`a:has-text("${T.ctaExplore}")`).evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  const consult = await page.locator(`a:has-text("${T.ctaConsult}")`).evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  ok(explore.length >= 4 && explore.every((h) => h === T.ctaExploreHref), `${lang}: los ${explore.length} «${T.ctaExplore}» apuntan a ${T.ctaExploreHref}`);
  ok(consult.length >= 5 && consult.every((h) => h === T.ctaConsultHref), `${lang}: los ${consult.length} «${T.ctaConsult}» apuntan a ${T.ctaConsultHref}`);
  await Promise.all([page.waitForNavigation(), page.locator(`.xp-hero a:has-text("${T.ctaExplore}")`).click()]);
  const svc = await page.evaluate(() => ({ path: location.pathname, h1: document.querySelector('h1').innerText, links: [...document.querySelectorAll('a[href*="/services/"],a[href*="/servicios/"]')].map((a) => a.getAttribute('href')).filter((h) => h.split('/').filter(Boolean).length >= 2 + (h.startsWith('/en/') ? 1 : 0)).length }));
  ok(svc.path === T.ctaExploreHref && svc.links >= 3, `${lang}: «${T.ctaExplore}» abre el catálogo de servicios con sus páginas`, JSON.stringify(svc));
  await page.goto(base + paths[lang]);
  await Promise.all([page.waitForNavigation(), page.locator(`.xp-hero a:has-text("${T.ctaConsult}")`).click()]);
  await page.waitForTimeout(600);
  const form = await page.evaluate(() => { const c = document.getElementById('contacto'); const f = document.getElementById('req-form'); const r = c && c.getBoundingClientRect(); return { hash: location.hash, inView: !!r && r.top < innerHeight && r.bottom > 0, form: !!f, fields: f ? f.querySelectorAll('input,textarea').length : 0, submit: !!document.getElementById('send-web') }; });
  ok(form.hash === '#contacto' && form.inView && form.form && form.fields >= 5 && form.submit, `${lang}: «${T.ctaConsult}» lleva al formulario de contacto existente, visible y completo`, JSON.stringify(form));
  // Desde el reproductor
  await page.goto(base + paths[lang]); await page.click('[data-open-player]');
  const plHref = await page.locator('[data-pl-cta="1"]').getAttribute('href');
  ok(plHref === T.ctaConsultHref, `${lang}: el CTA de consulta del reproductor también lleva al formulario`);
  // Enlace interno de vuelta desde la página de servicios
  await page.goto(base + T.ctaExploreHref);
  ok(await page.locator(`a[href="${C.routes[lang]}"]`).count() >= 1, `${lang}: la página de servicios enlaza a la experiencia (enlace interno)`);
  await ctx.close();
}

// ---------- D. Carga móvil en laboratorio ----------
for (const lang of ['es', 'en']) {
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const ctx = await browser.newContext({ ...devices['Moto G4'] || devices['Pixel 5'] }); const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    // Las respuestas simuladas no pasan por el limitador de red: se aplica a mano latencia + tiempo de descarga a 1,6 Mbps
    await page.route(/images\.unsplash\.com/, async (rt) => { const big = /h=(1280|1600|960)/.test(rt.request().url()); const body = fix(big ? 'foto-sustituta-960x1280.jpg' : 'foto-sustituta-800x450.jpg'); await new Promise((z) => setTimeout(z, 150 + (body.length * 8) / 1.6e6 * 1000)); rt.fulfill({ status: 200, contentType: 'image/jpeg', body }); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (rt) => rt.abort());
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0; window.__inp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__lcp = e.startTime; window.__lcpEl = e.element ? (e.element.tagName + '.' + (e.element.className || '')).slice(0, 40) : (e.url || ''); } }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__inp = Math.max(window.__inp, e.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    });
    let bytes = 0; page.on('response', async (res) => { try { const b = await res.body(); bytes += b.length; } catch { /* */ } });
    await page.goto(base + paths[lang], { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 1400)); await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.tap('[data-open-player]'); await page.waitForTimeout(700);
    await page.tap('[data-pl-play]'); await page.waitForTimeout(300);
    await page.tap('[data-pl-chapter="2"]'); await page.waitForTimeout(500);
    await page.tap('[data-pl-cc]'); await page.waitForTimeout(300);
    const m = await page.evaluate(() => ({ lcp: window.__lcp, lcpEl: window.__lcpEl, cls: window.__cls, inp: window.__inp, heroLoaded: (() => { const i = document.querySelector('.xp-hero-bg'); return !!i && i.complete && i.naturalWidth > 0; })() }));
    runs.push({ ...m, kb: Math.round(bytes / 1024) });
    await ctx.close();
  }
  const med = (k) => runs.map((x) => x[k]).sort((a, b) => a - b)[1];
  metrics[`carga_${lang}`] = { condiciones: 'Chromium, CPU 4×, 1,6 Mbps / 150 ms, fotos sustitutas de 330 KB (héroe) y 125 KB (escenas), sin fuentes web', corridas: runs, mediana: { LCP_ms: Math.round(med('lcp')), CLS: +med('cls').toFixed(3), interaccion_max_ms: Math.round(med('inp')), KB_transferidos: med('kb') } };
  ok(med('lcp') <= 2500, `${lang}: LCP móvil de laboratorio ≤ 2,5 s`, `mediana ${Math.round(med('lcp'))} ms`);
  ok(med('cls') <= 0.1, `${lang}: CLS ≤ 0,1`, `mediana ${med('cls').toFixed(3)}`);
  ok(med('inp') <= 200, `${lang}: respuesta a toques ≤ 200 ms (aprox. de INP)`, `mediana ${Math.round(med('inp'))} ms`);
}

await browser.close(); if (server) server.kill();
console.log(`\nPruebas avanzadas: ${pass} correctas, ${fail} fallidas`);
if (process.env.JF_REPORT) writeFileSync(process.env.JF_REPORT, JSON.stringify({ pass, fail, results, metrics }, null, 2));
process.exit(fail ? 1 : 0);
