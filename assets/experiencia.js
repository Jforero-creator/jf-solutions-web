/* JF Solutions — Experiencia de 90 s: ScrollStory, LanguageSwitcher y PresentationPlayer.
   Sin dependencias. Si este archivo no carga, la página sigue completa en HTML (texto, servicios, FAQ y CTA).
   Reglas: sin scroll-jacking, sin autoplay con sonido, narración solo con interacción explícita. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var pageLang = root.getAttribute('lang') === 'en' ? 'en' : 'es';
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function store(l) { try { localStorage.setItem('jf-lang', l); } catch (e) { /* almacenamiento no disponible */ } }
  store(pageLang);
  // Si una foto no carga, se oculta y queda el fondo navy de respaldo (sin ícono roto)
  d.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG') t.style.visibility = 'hidden'; }, true);
  d.querySelectorAll('img').forEach(function (im) { if (im.complete && !im.naturalWidth) im.style.visibility = 'hidden'; });
  var y = d.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- ScrollStory ---------- */
  var scenes = [].slice.call(d.querySelectorAll('.scene[data-scene]'));
  var current = null;
  function setIn(el) { el.classList.add('is-in'); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { setIn(e.target); current = e.target.id; }
      });
    }, { rootMargin: '0px 0px -25% 0px', threshold: 0.2 });
    scenes.forEach(function (s) { io.observe(s); });
  } else {
    scenes.forEach(setIn);
  }
  // Barra de progreso de la historia (solo lectura, no controla el desplazamiento)
  var story = d.querySelector('.xp-story'), bar = d.querySelector('.xp-progress span'), ticking = false;
  function progress() {
    ticking = false;
    if (!story || !bar) return;
    var r = story.getBoundingClientRect(), h = r.height - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, -r.top / h)) : 0;
    bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
  progress();

  /* ---------- LanguageSwitcher: conserva la escena en la que estás ---------- */
  d.querySelectorAll('[data-lang-switch]').forEach(function (a) {
    a.addEventListener('click', function () {
      var l = a.getAttribute('hreflang'); store(l);
      var hash = location.hash && /^#s[1-5]$/.test(location.hash) ? location.hash : (current ? '#' + current : '');
      if (hash) a.setAttribute('href', a.getAttribute('href').split('#')[0] + hash);
    });
  });

  /* ---------- PresentationPlayer ---------- */
  var dlg = d.getElementById('xp-player'), dataEl = d.getElementById('xp-data');
  var openers = [].slice.call(d.querySelectorAll('[data-open-player]'));
  if (!dlg || !dataEl || typeof dlg.showModal !== 'function') return; // sin <dialog>: queda la versión por scroll
  var D; try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }
  openers.forEach(function (b) { b.hidden = false; });
  d.querySelectorAll('[data-open-player-note]').forEach(function (n) { n.hidden = false; });

  var $ = function (sel) { return dlg.querySelector(sel); };
  var stage = $('[data-pl-stage]'), cap = $('[data-pl-cap]'), btnPlay = $('[data-pl-play]'), btnRestart = $('[data-pl-restart]');
  var btnSound = $('[data-pl-sound]'), btnCC = $('[data-pl-cc]'), selLang = $('[data-pl-lang]'), range = $('[data-pl-range]');
  var timeEl = $('[data-pl-time]'), sceneEl = $('[data-pl-scene]'), endEl = $('[data-pl-end]'), audio = $('[data-pl-audio]');
  var chapters = [].slice.call(dlg.querySelectorAll('[data-pl-chapter]')), soundNote = $('[data-pl-sound-note]'), aiNote = $('[data-pl-ai-note]');
  var DUR = D.duration;
  var S = { t: 0, playing: false, last: 0, raf: 0, lang: pageLang, cc: true, sound: false, scene: -1, cue: -1, opener: null, built: false };
  var cueSets = { es: D.cues.es, en: D.cues.en }; // respaldo si el VTT no carga

  function fmt(t) { t = Math.max(0, Math.round(t)); return ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2); }
  function ui(k) { return D.ui[S.lang][k]; }

  // WebVTT mínimo (cues con tiempos hh:mm:ss.mmm y texto)
  function parseVTT(txt) {
    var out = [], blocks = txt.replace(/\r/g, '').split(/\n\n+/);
    blocks.forEach(function (b) {
      var m = b.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})[^\n]*\n([\s\S]+)/);
      if (!m) return;
      var a = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000, z = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000;
      out.push({ start: a, end: z, text: m[9].trim() });
    });
    return out;
  }
  function loadCaptions(l) {
    if (!window.fetch) return;
    fetch(D.captions[l], { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (t) { var c = parseVTT(t); if (c.length) { cueSets[l] = c; S.cue = -1; render(true); } })
      .catch(function () { /* se usan los subtítulos incrustados */ });
  }

  function build() {
    if (S.built) return; S.built = true;
    scenes.forEach(function (sc, i) {
      var fig = sc.querySelector('.visual'); if (!fig) return;
      var layer = d.createElement('div');
      layer.className = 'pl-layer xp-a'; layer.setAttribute('data-layer', i); layer.setAttribute('aria-hidden', 'true');
      var c = fig.cloneNode(true);
      c.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      var fc = c.querySelector('figcaption'); if (fc) fc.remove();
      c.querySelectorAll('img').forEach(function (im) { im.loading = 'eager'; });
      layer.appendChild(c); stage.appendChild(layer);
    });
    loadCaptions('es'); loadCaptions('en');
  }

  function sceneAt(t) { for (var i = D.scenes.length - 1; i >= 0; i--) if (t >= D.scenes[i].start) return i; return 0; }
  function cueAt(t) { var c = cueSets[S.lang]; for (var i = 0; i < c.length; i++) if (t >= c[i].start && t < c[i].end) return i; return -1; }

  function activate(i) {
    [].forEach.call(stage.children, function (ly, j) {
      if (j === i) {
        ly.classList.remove('is-in'); void ly.offsetWidth; // reinicia las animaciones de la escena
        ly.classList.add('is-on', 'is-in');
      } else { ly.classList.remove('is-on', 'is-in'); }
    });
  }

  function render(force) {
    var i = sceneAt(S.t);
    if (i !== S.scene || force) {
      if (i !== S.scene) activate(i);
      S.scene = i;
      sceneEl.textContent = D.sceneWord[S.lang] + ' ' + (i + 1) + ' ' + D.ofWord[S.lang] + ' ' + D.scenes.length + ' — ' + D.scenes[i].title[S.lang];
      chapters.forEach(function (b, j) { if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    }
    var k = cueAt(S.t);
    if (k !== S.cue || force) {
      S.cue = k; cap.textContent = '';
      if (k > -1) { var sp = d.createElement('span'); sp.textContent = cueSets[S.lang][k].text; cap.appendChild(sp); }
    }
    cap.hidden = !S.cc;
    range.value = Math.floor(S.t);
    var vt = fmt(S.t) + ' / ' + fmt(DUR);
    range.setAttribute('aria-valuetext', vt + ' — ' + D.scenes[i].title[S.lang]);
    timeEl.textContent = vt;
    chapters.forEach(function (b, j) {
      var sc = D.scenes[j], p = S.t >= sc.end ? 100 : S.t <= sc.start ? 0 : ((S.t - sc.start) / (sc.end - sc.start)) * 100;
      b.style.setProperty('--p', p.toFixed(1) + '%');
    });
  }

  function tick(ts) {
    if (!S.playing) return;
    if (S.sound && audio.getAttribute('src') && !audio.paused && audio.readyState > 2) S.t = audio.currentTime;
    else S.t += Math.min(0.25, (ts - S.last) / 1000);
    S.last = ts;
    if (S.t >= DUR) { S.t = DUR; render(); finish(); return; }
    render();
    S.raf = requestAnimationFrame(tick);
  }
  function setPlayLabel() {
    dlg.classList.toggle('is-playing', S.playing);
    btnPlay.setAttribute('aria-label', S.playing ? ui('pause') : (S.t >= DUR ? ui('again') : ui('play')));
  }
  function play() {
    if (S.t >= DUR) seek(0);
    endEl.hidden = true; S.playing = true; S.last = performance.now();
    if (S.sound && audio.getAttribute('src')) { try { audio.currentTime = S.t; } catch (e) {} var pr = audio.play(); if (pr && pr.catch) pr.catch(function () {}); }
    setPlayLabel(); cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(tick);
  }
  function pause() { S.playing = false; cancelAnimationFrame(S.raf); if (audio.getAttribute('src')) audio.pause(); setPlayLabel(); }
  function finish() { pause(); endEl.hidden = false; setPlayLabel(); }
  function seek(t) {
    S.t = Math.max(0, Math.min(DUR, t)); endEl.hidden = S.t < DUR;
    if (audio.getAttribute('src')) { try { audio.currentTime = S.t; } catch (e) {} }
    var i = sceneAt(S.t); if (i === S.scene) activate(i);
    S.last = performance.now(); render(true); setPlayLabel();
  }

  function setLang(l) {
    S.lang = l; selLang.value = l; store(l);
    dlg.querySelectorAll('[data-pl]').forEach(function (n) { n.textContent = ui(n.getAttribute('data-pl')); });
    btnRestart.setAttribute('aria-label', ui('restart'));
    dlg.querySelector('[data-pl-close]').setAttribute('aria-label', ui('close'));
    range.setAttribute('aria-label', ui('progress'));
    $('[data-pl-chapters]').setAttribute('aria-label', ui('chapters'));
    chapters.forEach(function (b, j) { b.querySelector('.sr-only').textContent = D.scenes[j].title[l]; });
    var c = D.ctas[l];
    $('[data-pl-cta="0"]').textContent = c[0]; $('[data-pl-cta="0"]').href = c[1];
    $('[data-pl-cta="1"]').textContent = c[2]; $('[data-pl-cta="1"]').href = c[3];
    btnCC.setAttribute('aria-label', S.cc ? ui('ccOff') : ui('ccOn'));
    soundNote.textContent = ui('soundNA');
    // Narración: solo si existe audio pregrabado para este idioma (Opus si el navegador lo admite; si no, MP3)
    var files = D.audio[l], src = '';
    if (files) src = (files.webm && audio.canPlayType('audio/webm; codecs="opus"')) ? files.webm : files.mp3;
    aiNote.textContent = D.aiNote[l]; aiNote.hidden = !src;
    if (src) {
      btnSound.disabled = false; soundNote.hidden = true;
      if (audio.getAttribute('src') !== src) {
        audio.setAttribute('src', src); audio.preload = S.sound ? 'auto' : 'none';
        try { audio.currentTime = S.t; } catch (e) {}
        if (S.playing && S.sound) { var p0 = audio.play(); if (p0 && p0.catch) p0.catch(function () {}); }
      }
    } else {
      btnSound.disabled = true; soundNote.hidden = false; S.sound = false; btnSound.setAttribute('aria-pressed', 'false');
      if (audio.getAttribute('src')) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    }
    btnSound.setAttribute('aria-label', S.sound ? ui('soundOff') : (src ? ui('soundOn') : ui('soundNA')));
    S.cue = -1; render(true); setPlayLabel();
  }

  audio.addEventListener('error', function () { if (!audio.getAttribute('src')) return; S.sound = false; btnSound.setAttribute('aria-pressed', 'false'); btnSound.disabled = true; soundNote.hidden = false; }, false);
  btnPlay.addEventListener('click', function () { S.playing ? pause() : play(); });
  btnRestart.addEventListener('click', function () { seek(0); play(); });
  btnCC.addEventListener('click', function () {
    S.cc = !S.cc; btnCC.setAttribute('aria-pressed', String(S.cc)); btnCC.setAttribute('aria-label', S.cc ? ui('ccOff') : ui('ccOn')); render(true);
  });
  btnSound.addEventListener('click', function () {
    if (!audio.getAttribute('src')) return;
    S.sound = !S.sound; btnSound.setAttribute('aria-pressed', String(S.sound));
    btnSound.setAttribute('aria-label', S.sound ? ui('soundOff') : ui('soundOn'));
    if (S.sound) { audio.preload = 'auto'; try { audio.currentTime = S.t; } catch (e) {} if (S.playing) { var p1 = audio.play(); if (p1 && p1.catch) p1.catch(function () {}); } }
    else audio.pause();
  });
  selLang.addEventListener('change', function () { setLang(selLang.value); });
  range.addEventListener('input', function () { seek(+range.value); });
  chapters.forEach(function (b, j) { b.addEventListener('click', function () { seek(D.scenes[j].start); }); });

  function open(e) {
    build(); S.opener = e && e.currentTarget || null;
    dlg.showModal(); root.style.overflow = 'hidden';
    setLang(S.lang); seek(0); play();
    btnPlay.focus();
  }
  function cleanup() {
    pause(); root.style.overflow = '';
    if (S.opener && S.opener.focus) S.opener.focus();
  }
  openers.forEach(function (b) { b.addEventListener('click', open); });
  dlg.querySelector('[data-pl-close]').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', cleanup);
  d.addEventListener('visibilitychange', function () { if (d.hidden && S.playing) pause(); });

  // Gancho de pruebas automatizadas (solo lectura/control del reloj; no expone datos privados)
  window.JFXP = { seek: seek, play: play, pause: pause, state: function () { return { t: S.t, playing: S.playing, scene: S.scene, cue: S.cue, lang: S.lang, cc: S.cc, sound: S.sound, caption: cap.textContent, audioSrc: audio.getAttribute('src') || '', audioTime: audio.currentTime, audioPaused: audio.paused }; } };
})();
