/* JF Solutions — envío del formulario de contacto (Vercel Function, Node, sin dependencias).
   Flujo: navegador -> /api/contact/ -> verificación Cloudflare Turnstile -> Web3Forms -> correo de JF Solutions.
   Por qué existe: en el plan gratuito de Web3Forms la verificación de Turnstile es de pago; aquí se verifica
   gratis con la API pública de Cloudflare antes de reenviar.

   Variables de entorno (Vercel → Settings → Environment Variables):
   - TURNSTILE_SECRET_KEY   Clave secreta del widget Turnstile (obligatoria en Production).
                            Fuera de Production, si falta, se usa la clave de PRUEBA oficial de Cloudflare
                            (siempre acepta) para que las vistas previas funcionen sin configurar nada.
   - WEB3FORMS_ACCESS_KEY   Clave de Web3Forms. Si falta, se usa la clave actual del sitio (pública por diseño).
*/
'use strict';

const TEST_SECRET = '1x0000000000000000000000000000000AA'; // clave de prueba documentada por Cloudflare
const CURRENT_W3F_KEY = '8d3fd0e5-b687-434f-816b-74fb0331bb81';
const LIMITS = { name: 120, email: 160, phone: 40, company: 120, division: 80, service: 160, reply_language: 20, page: 300, message: 5000 };
const ALLOWED_HOSTS = /^(www\.)?jfsolutionsq\.com$|^jf-solutions[a-z0-9-]*\.vercel\.app$|^(localhost|127\.0\.0\.1)(:\d+)?$/;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function clean(v, max) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '';
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 64 * 1024) return null; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return null; }
}

async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { success: false, code: 'method' }); }

  // Solo se aceptan envíos desde el propio sitio (o sus vistas previas).
  const origin = req.headers.origin || '';
  let host = '';
  try { host = new URL(origin).host; } catch (e) { host = ''; }
  if (!ALLOWED_HOSTS.test(host)) return send(res, 403, { success: false, code: 'origin' });

  const b = await readBody(req);
  if (!b) return send(res, 400, { success: false, code: 'body' });

  // Honeypot existente: si un bot lo marca, se responde "éxito" sin enviar nada.
  if (b.botcheck === true || b.botcheck === 'on' || b.botcheck === 'true') return send(res, 200, { success: true });

  const f = {};
  for (const k of Object.keys(LIMITS)) f[k] = clean(b[k], LIMITS[k]);
  if (!f.name || !f.message || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(f.email)) return send(res, 422, { success: false, code: 'fields' });

  // 1) Verificación de Turnstile
  const token = clean(b.turnstile_token, 2048);
  if (!token) return send(res, 400, { success: false, code: 'captcha' });
  const production = process.env.VERCEL_ENV === 'production';
  const secret = process.env.TURNSTILE_SECRET_KEY || (production ? '' : TEST_SECRET);
  if (!secret) return send(res, 503, { success: false, code: 'config' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  let verify;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(Object.assign({ secret, response: token }, ip ? { remoteip: ip } : {})).toString(),
      signal: AbortSignal.timeout(8000)
    });
    verify = await r.json();
  } catch (e) { return send(res, 502, { success: false, code: 'captcha-unreachable' }); }
  if (!verify || verify.success !== true) return send(res, 400, { success: false, code: 'captcha' });

  // 2) Reenvío a Web3Forms (mismo asunto, remitente y campos que antes)
  const payload = Object.assign({
    access_key: process.env.WEB3FORMS_ACCESS_KEY || CURRENT_W3F_KEY,
    subject: 'New Service Request – JF Solutions',
    from_name: 'JF Solutions – Sitio web'
  }, f);
  if (!payload.page) delete payload.page;
  try {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    const out = await r.json().catch(() => ({}));
    if (r.ok && out && out.success) return send(res, 200, { success: true });
    console.error('web3forms_error', r.status, out && out.message);
    return send(res, 502, { success: false, code: 'delivery' });
  } catch (e) {
    console.error('web3forms_unreachable', e && e.name);
    return send(res, 502, { success: false, code: 'delivery' });
  }
}

module.exports = handler;
