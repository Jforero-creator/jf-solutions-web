// Ensambla la narración pregrabada de la experiencia de 90 s (una pista por idioma).
//   node dev/experiencia/audio/build-audio.mjs --src <carpeta-con-tomas> [--pick en.s4=0 --pick es.s2=1]
// Entradas: <src>/<lang>-<escena>-<toma>.mp3 (p. ej. en-s1-0.mp3), descargadas de ElevenLabs (ver takes.json).
// Salidas:  media/experiencia/narracion-<lang>.mp3 y .webm (Opus), y dev/experiencia/audio/timing.json
// Cada escena se coloca dentro de su ventana fija del guion gráfico; el resto es silencio. Total: 90,0 s.
// Requiere ffmpeg/ffprobe. No llama a ninguna API: trabaja solo con archivos ya generados.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const C = JSON.parse(readFileSync(join(here, '..', 'content.json'), 'utf8'));
const args = process.argv.slice(2);
const src = args[args.indexOf('--src') + 1];
if (!src || !existsSync(src)) { console.error('Uso: --src <carpeta con tomas en-s1-0.mp3 …>'); process.exit(2); }
const picks = {};
args.forEach((a, i) => { if (a === '--pick') { const [k, v] = args[i + 1].split('='); picks[k] = +v; } });

const run = (cmd, a) => execFileSync(cmd, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
function stderrOf(a) {
  const r = spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
}

const dur = (f) => +run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim();
// Tramos con voz (silencio < -38 dB durante ≥ 0,18 s se considera pausa)
function speech(f) {
  const log = stderrOf(['-hide_banner', '-nostats', '-i', f, '-af', 'silencedetect=noise=-38dB:d=0.18', '-f', 'null', '-']);
  const total = dur(f), sil = [];
  let s = null;
  for (const line of log.split('\n')) {
    const a = line.match(/silence_start: ([\d.]+)/); if (a) s = +a[1];
    const b = line.match(/silence_end: ([\d.]+)/); if (b) { sil.push([s ?? 0, +b[1]]); s = null; }
  }
  if (s !== null) sil.push([s, total]);
  const segs = []; let t = 0;
  for (const [a, b] of sil) { if (a - t > 0.05) segs.push([t, a]); t = b; }
  if (total - t > 0.05) segs.push([t, total]);
  return { total, segs };
}
function loud(f) {
  const log = stderrOf(['-hide_banner', '-nostats', '-i', f, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
  return JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
}

const timing = { generated: new Date().toISOString().slice(0, 10), duration: C.duration, loudness: 'EBU R128 −16 LUFS, pico real −1,5 dBTP', langs: {} };
// --out y --timing solo para pruebas del ensamblaje (por defecto escribe en el sitio)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const outDir = opt('--out', join(root, 'media', 'experiencia'));
const timingFile = opt('--timing', join(here, 'timing.json'));
mkdirSync(outDir, { recursive: true });
const tmp = join(src, '_tmp'); mkdirSync(tmp, { recursive: true });

for (const lang of ['en', 'es']) {
  const placed = [];
  for (const s of C.scenes) {
    const win = s.end - s.start;
    const cands = [0, 1, 2, 3].map((k) => join(src, `${lang}-${s.id}-${k}.mp3`)).filter(existsSync).map((f, k) => {
      const sp = speech(f);
      const a = sp.segs[0][0], b = sp.segs[sp.segs.length - 1][1];
      return { f, k, a, b, len: b - a, segs: sp.segs };
    });
    if (!cands.length) throw new Error(`Falta la toma de ${lang} ${s.id} en ${src}`);
    let lead = s.start === 0 ? 0.8 : 0.6;
    const fits = (c) => c.len <= win - lead - 0.6;
    const key = `${lang}.${s.id}`;
    // Elección: la indicada con --pick; si no, la toma más pausada que cabe en su ventana
    let pick = key in picks ? cands.find((c) => c.k === picks[key]) : cands.filter(fits).sort((x, y) => y.len - x.len)[0];
    if (!pick) pick = cands.sort((x, y) => x.len - y.len)[0];
    if (!fits(pick)) lead = Math.max(0.2, win - pick.len - 0.4);
    if (pick.len > win - 0.4) throw new Error(`${key}: la voz (${pick.len.toFixed(2)} s) no cabe en ${win} s`);
    const offset = s.start + lead;
    // Recorta silencios del principio y final de la toma y la deja en mono 48 kHz
    const clip = join(tmp, `${lang}-${s.id}.wav`);
    run('ffmpeg', ['-y', '-v', 'error', '-i', pick.f, '-af', `atrim=start=${Math.max(0, pick.a - 0.04)}:end=${pick.b + 0.12},asetpts=PTS-STARTPTS`, '-ac', '1', '-ar', '48000', clip]);
    const shift = offset - Math.max(0, pick.a - 0.04);
    placed.push({ scene: s.id, clip, offset, take: pick.k, file: pick.f.split('/').pop(), speechStart: +(offset + 0.04).toFixed(3), speechEnd: +(offset + pick.len + 0.04).toFixed(3),
      segments: pick.segs.map(([a, b]) => [+(a + shift).toFixed(3), +(b + shift).toFixed(3)]) });
  }
  // Mezcla en una línea de tiempo de 90 s exactos
  const inputs = placed.flatMap((p) => ['-i', p.clip]);
  const delays = placed.map((p, i) => `[${i}:a]adelay=${Math.round(p.offset * 1000)}:all=1[d${i}]`).join(';');
  const mix = `${delays};${placed.map((_, i) => `[d${i}]`).join('')}amix=inputs=${placed.length}:normalize=0:duration=longest,apad=whole_dur=${C.duration},atrim=0:${C.duration}`;
  const master = join(tmp, `${lang}-master.wav`);
  run('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', mix, '-ac', '1', '-ar', '48000', master]);
  // Normalización de sonoridad en dos pasadas
  const m = loud(master);
  const ln = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,atrim=0:${C.duration}`;
  const norm = join(tmp, `${lang}-norm.wav`);
  run('ffmpeg', ['-y', '-v', 'error', '-i', master, '-af', ln, '-ar', '48000', '-ac', '1', norm]);
  const mp3 = join(outDir, `narracion-${lang}.mp3`), webm = join(outDir, `narracion-${lang}.webm`);
  const meta = ['-metadata', `title=JF Solutions — ${lang === 'en' ? '90-second story (AI-generated narration)' : 'Historia de 90 segundos (narración generada con IA)'}`, '-metadata', 'artist=JF Solutions', '-metadata', 'comment=AI voice: ElevenLabs eleven_multilingual_v2'];
  run('ffmpeg', ['-y', '-v', 'error', '-i', norm, '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '44100', '-ac', '1', ...meta, mp3]);
  run('ffmpeg', ['-y', '-v', 'error', '-i', norm, '-c:a', 'libopus', '-b:a', '40k', '-ac', '1', '-application', 'voip', ...meta, webm]);
  const after = loud(norm);
  timing.langs[lang] = {
    voice: lang === 'en' ? 'Abbas (ElevenLabs)' : 'Arturo (ElevenLabs)',
    files: { mp3: `/media/experiencia/narracion-${lang}.mp3`, webm: `/media/experiencia/narracion-${lang}.webm` },
    bytes: { mp3: statSync(mp3).size, webm: statSync(webm).size },
    durations: { mp3: +dur(mp3).toFixed(2), webm: +dur(webm).toFixed(2) },
    loudness: { integrated: +after.input_i, truePeak: +after.input_tp },
    scenes: Object.fromEntries(placed.map(({ clip, ...p }) => [p.scene, p]))
  };
  console.log(lang, 'listo:', timing.langs[lang].bytes, timing.langs[lang].loudness);
}
writeFileSync(timingFile, JSON.stringify(timing, null, 2) + '\n');
console.log('timing.json escrito. Ejecuta: node dev/experiencia/build.mjs');
