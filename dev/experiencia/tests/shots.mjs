// Capturas de revisión (móvil y escritorio, ES/EN, reproductor y sin movimiento).
//   node dev/experiencia/tests/shots.mjs [base] [carpeta-salida]
// Las fotos de Unsplash se bloquean si la red no las alcanza: se ve el fondo navy de respaldo.
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8810';
const out = process.argv[3] || 'dev/experiencia/docs/capturas';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const runs = [
  { name: 'escritorio', ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  { name: 'movil', ctx: { ...devices['iPhone 13'] } }
];
for (const r of runs) {
  for (const [lang, path] of [['es', '/experiencia/'], ['en', '/en/experience/']]) {
    const ctx = await browser.newContext({ ...r.ctx, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.route(/images\.unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (rt) => rt.abort());
    await page.goto(base + path, { waitUntil: 'load' });
    await page.screenshot({ path: `${out}/${r.name}-${lang}-hero.png` });
    // Recorre la historia para activar escenas (sin forzar el desplazamiento del usuario)
    for (const id of ['s1', 's3', 's4']) {
      await page.locator('#' + id).scrollIntoViewIfNeeded();
      await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), id);
      await page.waitForTimeout(6500);
      await page.screenshot({ path: `${out}/${r.name}-${lang}-${id}.png` });
    }
    if (lang === 'es') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click('[data-open-player]');
      await page.evaluate(() => { window.JFXP.seek(38); window.JFXP.play(); });
      await page.waitForTimeout(5500);
      await page.screenshot({ path: `${out}/${r.name}-${lang}-presentacion.png` });
      await page.keyboard.press('Escape');
    }
    await ctx.close();
  }
}
// Sin movimiento: estado final estático
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.route(/images\.unsplash\.com|fonts\.(googleapis|gstatic)\.com/, (rt) => rt.abort());
await p.goto(base + '/experiencia/');
await p.evaluate(() => document.getElementById('s2').scrollIntoView({ block: 'center' }));
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/escritorio-es-s2-sin-movimiento.png` });
await browser.close();
console.log('capturas en', out);
