"""Verificación de la narración publicada (lo que escucha el visitante), sin servicios externos.

    python3 dev/experiencia/tests/verify_audio.py --model <carpeta sherpa-onnx-whisper-small> [--report salida.json]

Para cada idioma y escena:
  1. Duración del archivo (MP3 y Opus) = 90 s y velocidad intacta (no se acelera ni se recorta).
  2. Toda la voz cae dentro de la ventana de su escena; el final del archivo es silencio (no se corta).
  3. Transcripción local con Whisper (sherpa-onnx) y tasa de error por palabra (WER) contra el guion exacto.
  4. Cada subtítulo se muestra mientras hay voz: energía del audio dentro de cada cue vs. fuera de ellos.
Requiere ffmpeg, numpy y sherpa-onnx (pip). El modelo se descarga de las versiones públicas de sherpa-onnx en GitHub.
"""
import argparse, json, re, subprocess, sys, unicodedata
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
C = json.loads((ROOT / 'dev/experiencia/content.json').read_text())
T = json.loads((ROOT / 'dev/experiencia/audio/timing.json').read_text())

ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True)
ap.add_argument('--report')
a = ap.parse_args()

def pcm(path, sr=16000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True).stdout)

def norm(s):
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace('jf', 'jf ').replace('jota efe', 'jf')
    return re.findall(r"[a-z0-9]+", s)

def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    d = np.zeros((len(r) + 1, len(h) + 1), dtype=int)
    d[:, 0] = range(len(r) + 1); d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r), len(h)] / max(1, len(r))

import sherpa_onnx
m = Path(a.model)
def recognizer(lang):
    return sherpa_onnx.OfflineRecognizer.from_whisper(encoder=str(m / 'small-encoder.int8.onnx'), decoder=str(m / 'small-decoder.int8.onnx'), tokens=str(m / 'small-tokens.txt'), language=lang, task='transcribe', num_threads=4)

sys.path.insert(0, str(ROOT))
cues = json.loads(subprocess.run(['node', '-e', "import('./dev/experiencia/build.mjs').then(m=>console.log(JSON.stringify({es:m.cues('es'),en:m.cues('en')})))"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)

report = {'model': 'Whisper small (sherpa-onnx int8), local', 'langs': {}}
ok_all = True
for lang in ['en', 'es']:
    mp3 = ROOT / f'media/experiencia/narracion-{lang}.mp3'
    webm = ROOT / f'media/experiencia/narracion-{lang}.webm'
    x = pcm(mp3); sr = 16000
    L = {'duration_mp3': round(dur(mp3), 2), 'duration_webm': round(dur(webm), 2), 'duration_decoded': round(len(x) / sr, 2), 'scenes': {}}
    # energía por ventanas de 50 ms
    hop = int(0.05 * sr); n = len(x) // hop
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    voiced = db > -45
    t_of = lambda i: i * 0.05
    L['tail_silence_s'] = round(float(0.05 * np.argmax(voiced[::-1])), 2)
    rec = recognizer(lang)
    for s in C['scenes']:
        a0, a1 = s['start'], s['end']
        seg = x[int(a0 * sr): int(a1 * sr)]
        st = rec.create_stream(); st.accept_waveform(sr, seg); rec.decode_stream(st)
        hyp = st.result.text.strip()
        w = wer(s[lang]['script'], hyp)
        idx = np.where(voiced[int(a0 / 0.05): int(a1 / 0.05)])[0]
        first, last = (a0 + t_of(idx[0]), a0 + t_of(idx[-1]) + 0.05) if len(idx) else (None, None)
        # voz fuera de la ventana de la escena (no debe haber)
        L['scenes'][s['id']] = {'window': [a0, a1], 'voice_first': round(first, 2), 'voice_last': round(last, 2), 'margin_end_s': round(a1 - last, 2), 'wer': round(w, 3), 'transcript': hyp}
    # subtítulos vs. voz: fracción de la voz cubierta por algún subtítulo y energía media dentro/fuera
    covered = np.zeros(n, bool)
    for c in cues[lang]:
        covered[int(c['start'] / 0.05): int(c['end'] / 0.05) + 1] = True
    covered = covered[:n]
    L['voice_covered_by_captions'] = round(float((voiced & covered).sum() / max(1, voiced.sum())), 3)
    L['captions_with_voice'] = round(float((voiced & covered).sum() / max(1, covered.sum())), 3)
    sc = L['scenes']
    checks = {
        'duración 90 s (MP3/Opus/decodificado)': all(abs(L[k] - 90) <= 0.15 for k in ['duration_mp3', 'duration_webm', 'duration_decoded']),
        'voz dentro de su escena (≥0,3 s de margen)': all(v['voice_first'] >= v['window'][0] and v['margin_end_s'] >= 0.3 for v in sc.values()),
        'sin corte al final (≥0,5 s de silencio)': L['tail_silence_s'] >= 0.5,
        'transcripción fiel al guion (WER ≤ 0,15 por escena)': all(v['wer'] <= 0.15 for v in sc.values()),
        'la voz está cubierta por subtítulos (≥ 95 %)': L['voice_covered_by_captions'] >= 0.95,
        'los subtítulos coinciden con voz (≥ 70 % del tiempo)': L['captions_with_voice'] >= 0.70,
    }
    L['checks'] = checks
    ok_all &= all(checks.values())
    report['langs'][lang] = L
    print(f'\n== {lang.upper()} ==  MP3 {L["duration_mp3"]} s · Opus {L["duration_webm"]} s · silencio final {L["tail_silence_s"]} s')
    for k, v in sc.items():
        print(f'  {k} voz {v["voice_first"]}–{v["voice_last"]} (margen {v["margin_end_s"]} s) WER {v["wer"]:.2f} | {v["transcript"]}')
    print(f'  voz cubierta por subtítulos {L["voice_covered_by_captions"]:.1%} · subtítulos con voz {L["captions_with_voice"]:.1%}')
    for k, v in checks.items():
        print(('  ✓ ' if v else '  ✗ ') + k)
if a.report:
    Path(a.report).write_text(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(0 if ok_all else 1)
