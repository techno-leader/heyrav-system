/* Sunken world - a dive. Scroll is the camera: the page starts at the surface
   of a sunlit lagoon and goes down. By day it runs from the lagoon to the
   edge of the midnight zone; by night from the twilight to the abyssal floor.
   - The sea (WaterSea, WebGL, half resolution) takes its colour from depth:
     a surface window and rays above, caustics, marine snow, plankton glow in
     the dark, and the water bends under the panels (water glass).
   - In front of it, Sea Life (2D): reef walls down both edges in three fogged
     planes, kelp at the top, and creatures at the depth they really live -
     a bait ball, a turtle and a manta, lanternfish, jellyfish, squid, a
     siphonophore, anglerfish, and on the floor tripod fish and a sea pig.
   - Every section heading is marked with the depth it sits at; titles and
     ledes surface a word at a time; a depth gauge sits in the corner with an
     optional sound of the sea (off until asked for).
   - Focus, selection and success use mother-of-pearl colour from the Nacre
     engine; the page title's divider is a strip of contours (Contour).
   The engines are shared with the tools (Water Lab, Sea Life, Nacre Lab,
   Contour Kit). Reduced motion: still frames that follow the scroll. */
window.heyravWorlds && heyravWorlds.define('sunken', ctx => {
  const doc = document, root = doc.documentElement, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const narrow = () => innerWidth < 760;
  const ZONES = [[0, 'Sunlight'], [200, 'Twilight'], [1000, 'Midnight'], [4000, 'Abyss']];
  const zoneOf = m => ZONES.reduce((z, q) => m >= q[0] ? q[1] : z, 'Sunlight');

  /* presets, tuned in the tools */
  const WATER = { rays: .55, rayCount: 12, caustic: .2, snow: .55, glow: .75, window: .85, refract: 18, bevel: 22, rim: .32, radius: 20, lantern: .45 };
  const QUALITY = () => narrow() ? .5 : 1;
  // day starts at the surface, night in the twilight; how deep a page goes depends on how long it is:
  // a two-screen page stays in the sunlight, a case study of a dozen screens reaches the floor
  const range = () => { const a = ctx.dark() ? .4 : 0, screens = root.scrollHeight / Math.max(1, innerHeight), reach = clamp((screens - 1) / 10, .22, 1); return [a, a + (1 - a) * reach]; };

  /* ---------- the sea and its life ---------- */
  const seaL = ctx.layer('sk-sea'), seaC = doc.createElement('canvas'); seaL.append(seaC);
  const lifeL = ctx.layer('sk-life'), lifeC = doc.createElement('canvas'); lifeL.append(lifeC);
  const sea = window.WaterSea && WaterSea.create(seaC); let life = null, gone = false;
  // the 3D scene loads three.js on demand; until then (or without WebGL) the water alone is drawn
  window.Sea3D && Sea3D.load().then(() => { if (gone) return; try { life = Sea3D.create(lifeC, { quality: QUALITY() }); } catch (e) { console.warn(e); } }).catch(() => {});
  ctx.cleanup(() => { gone = true; life && life.dispose(); });
  if (sea) { root.classList.add('sk-live'); ctx.cleanup(() => { root.classList.remove('sk-live'); sea.lose(); }); }
  let lifeKey = '';
  const lifeSet = () => {};

  let ptr = null, scrollP = 0;
  ctx.on(window, 'pointermove', e => { ptr = [e.clientX, e.clientY]; queueSheen(); }, { passive: true });
  ctx.on(doc, 'pointerleave', () => { ptr = null; });
  const pageMax = () => Math.max(1, root.scrollHeight - innerHeight);
  const depthNow = () => { const [a, b] = range(); return a + (b - a) * clamp(scrollY / pageMax()); };

  // the pearl sheen and nacre turn with the light (the pointer)
  let sheenQ = 0;
  function queueSheen() { if (sheenQ) return; sheenQ = requestAnimationFrame(() => { sheenQ = 0; if (!ptr) return;
    root.style.setProperty('--sk-px', (ptr[0] / innerWidth * 100).toFixed(1) + '%');
    root.style.setProperty('--nacre-a', Math.round(Math.atan2(ptr[1] - innerHeight / 2, ptr[0] - innerWidth / 2) * 57.3) + 'deg'); }); }
  ctx.cleanup(() => { ['--sk-px', '--nacre-a', '--sk-a', '--sk-contour', '--sk-nacre'].forEach(p => root.style.removeProperty(p)); });

  // nacre from the thin-film engine: a soft pearl for day, a darker abalone for night
  function nacre() { if (!window.Nacre) return; const o = (ctx.dark() || deep) ? { d: 430, drel: 230, n: 1.45, sub: 1, base: '#9fe9dc', mix: .45 } : { d: 430, drel: 230, n: 1.45, sub: 1, base: '#f4fbfa', mix: .55 };
    root.style.setProperty('--sk-nacre', Nacre.gradient(o, 8, 'conic')); }

  // the contour strip under page titles
  function contour() { if (!window.Contour) return; const svg = Contour.svg(2400, 72, { form: 'plain', max: 900, interval: 55, index: 4, rough: 1.3, scale: .75, seed: 11, res: 3, soundings: 0, ink: '#000' });
    root.style.setProperty('--sk-contour', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`); }

  // panels the water bends under: the main glass, then whatever tiles are on screen
  let glassEls = [];
  const collectGlass = () => { glassEls = [doc.querySelector('.d-panel'), ...doc.querySelectorAll('.d-hero,.d-tile,.d-wcard,.card,.d-ex')].filter(Boolean); };
  function rects(res) {
    const out = [], H = innerHeight;
    for (const el of glassEls) { if (out.length >= 8) break; const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > H || r.width < 40) continue;
      out.push([r.left * res, r.top * res, r.width * res, r.height * res]); }
    return out;
  }

  /* ---------- when the light runs out: past 200 m by day the page takes the midnight palette ----------
     The dark theme's own rules are cloned under [data-sk-deep], so nothing is written twice. */
  const deepCss = doc.createElement('style'); deepCss.id = 'sk-deep';
  try { const out = []; for (const sh of doc.styleSheets) { let rs; try { rs = sh.cssRules; } catch { continue; }
      for (const r of rs) { const sel = r.selectorText; if (!sel || !sel.includes('[data-theme="dark"]') || sel.includes(':not([data-theme="dark"])')) continue;
        if (sel.includes('[data-world="') && !sel.includes('[data-world="sunken"]')) continue;          // another world's night
        out.push(r.cssText.split('[data-theme="dark"]').join('[data-sk-deep]')); } }
    deepCss.textContent = out.join('\n') + '\n.sk-flip,.sk-flip *{transition:color 2.6s cubic-bezier(.45,0,.25,1),background-color 2.6s cubic-bezier(.45,0,.25,1),fill 2.6s cubic-bezier(.45,0,.25,1),stroke 2.6s cubic-bezier(.45,0,.25,1),border-color 2.6s cubic-bezier(.45,0,.25,1)!important;}'; } catch {}
  doc.head.append(deepCss);
  /* The ground (glass, paper, surfaces, lines) is mixed continuously between the day and night values as you
     descend, easing toward its target so nothing changes in a jump; the ink turns over halfway through. */
  const G = { paper: ['#dcf5f0', '#031726'], surface: ['#e9f8f5', '#04192b'], 'surface-2': ['#d6f0eb', '#072538'], 'surface-3': ['#c2e7e1', '#0b3048'], panel: ['#e3f6f2', '#062033'],
    'sk-glass': ['rgba(226,247,243,.6)', 'rgba(3,22,36,.74)'], 'sk-glass-2': ['rgba(236,251,248,.62)', 'rgba(6,32,51,.62)'], 'sk-rim': ['rgba(255,255,255,.75)', 'rgba(140,240,230,.22)'],
    line: ['rgba(3,37,45,.14)', 'rgba(200,240,240,.13)'], 'line-2': ['rgba(3,37,45,.26)', 'rgba(200,240,240,.24)'] };
  const parseC = c => c[0] === '#' ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).concat(1) : c.match(/[\d.]+/g).map(Number);
  const GP = Object.fromEntries(Object.entries(G).map(([k, [l, d]]) => [k, [parseC(l), parseC(d)]]));
  let deep = false, flipT = 0, kNow = 0, kSet = -1, lastT = 0;
  const flip = () => { root.classList.add('sk-flip'); clearTimeout(flipT); flipT = setTimeout(() => root.classList.remove('sk-flip'), 2800); };
  function setDeep(on) { if (on === deep) return; deep = on; flip();
    on ? root.setAttribute('data-sk-deep', '') : root.removeAttribute('data-sk-deep'); nacre(); ctx.announce(on ? 'The light runs out: twilight zone' : 'Back in the sunlight'); }
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  let aim = false;
  function ground(m, t) {
    if (ctx.dark()) { if (kSet !== -1) { Object.keys(G).forEach(k => root.style.removeProperty('--' + k)); kSet = -1; } setDeep(false); return; }
    aim = aim ? m > 170 : m > 240;
    const target = aim ? .72 + .28 * sstep(240, 900, m) : .3 * sstep(60, 240, m), dt = lastT ? Math.min(.1, t - lastT) : 1; lastT = t;
    kNow += (target - kNow) * (1 - Math.exp(-dt * 0.55));          // a slow, even fade: about five seconds from day to night
    if (Math.abs(kNow - kSet) < .004) return; kSet = kNow;
    const lightA = .52 + .2 * clamp(m / 200);
    for (const [k, [l, d]] of Object.entries(GP)) {
      const v = l.map((x, i) => x + (d[i] - x) * kNow); if (k === 'sk-glass') v[3] = lightA + (.74 - lightA) * kNow;
      root.style.setProperty('--' + k, v[3] >= .999 ? `rgb(${v.slice(0, 3).map(Math.round)})` : `rgba(${v.slice(0, 3).map(Math.round)},${v[3].toFixed(3)})`);
    }
    setDeep(kNow > .5);
  }
  ctx.onTheme(flip);
  ctx.cleanup(() => { deepCss.remove(); root.removeAttribute('data-sk-deep'); root.classList.remove('sk-flip'); Object.keys(G).forEach(k => root.style.removeProperty('--' + k)); });

  /* ---------- depth marks on section headings, and the gauge ---------- */
  const marked = [];
  function markDepths() {
    marked.forEach(h => h.removeAttribute('data-sk-m')); marked.length = 0;
    const [a, b] = range(), total = root.scrollHeight;
    doc.querySelectorAll('.d-doc > h2, .d-doc section > h2').forEach(h => { if (!h.offsetParent) return;
      const y = h.getBoundingClientRect().top + scrollY, p = clamp((y - innerHeight * .35) / pageMax()), m = Math.round(Sea3D.metres(a + (b - a) * p) / 5) * 5;
      h.setAttribute('data-sk-m', m.toLocaleString() + ' m · ' + zoneOf(m)); marked.push(h); });
  }
  ctx.cleanup(() => marked.forEach(h => h.removeAttribute('data-sk-m')));

  const gauge = doc.createElement('div'); gauge.className = 'sk-gauge'; gauge.setAttribute('role', 'group'); gauge.setAttribute('aria-label', 'Depth');
  gauge.innerHTML = '<span class="sk-z"></span><b aria-live="off">0 m</b><button type="button" aria-pressed="false" aria-label="Sound of the sea"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10.5v3"/></svg></button>';
  doc.body.append(gauge); ctx.cleanup(() => gauge.remove());
  const gZ = gauge.querySelector('.sk-z'), gM = gauge.querySelector('b'), gB = gauge.querySelector('button');

  /* ---------- the sound of the sea: on unless turned off, and it carries on from page to page ----------
     A quiet bed of deep water loops under everything. Over it, one voice per depth, never two at once,
     with long silences between: humpback phrases in the sunlit water (0-250 m; now and then two run
     together, as song does), nothing but the water in the twilight (250-450 m), sperm whales clicking
     where they hunt squid (450-2,000 m), and below 2,000 m a low hum with a far-off earthquake or ice.
     No call comes twice in a row; each is played a little higher or lower and moves across as it passes.
     Browsers allow sound only after a click or key, so if it cannot start straight away it starts on the first one. */
  const st = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} } };
  const sound = (() => {
    const me = doc.querySelector('script[src*="js/worlds/sunken.js"]'), base = new URL('../../assets/audio/', me ? me.src : location.href).href, AC = window.AudioContext || window.webkitAudioContext;
    const LOOPS = { bed: 48, deep: 32 }, SPRITE = {"hb1": [0.0, 8.5], "hb2": [9.0, 8.35], "hb3": [17.85, 7.9], "hb4": [26.25, 8.3], "hb5": [35.05, 8.25], "dolphins": [43.8, 8.0], "fish": [52.3, 8.0], "coda1": [60.8, 8.93], "coda2": [70.23, 8.5], "creak": [79.23, 8.606], "quake": [88.336, 11.0], "ice": [99.836, 9.0]};
    let want = st.get('sk-sound') !== 'off', armed = false, ac = null, master = null, t0 = null, nextAt = 0, last = '', whale = null, mNow = 0, fetching = false;
    const bufs = {}, gains = {}, srcs = {};
    try { const n = +ss.get('sk-next'); nextAt = n > Date.now() ? n : Date.now() + 6000 + Math.random() * 8000; } catch { nextAt = Date.now() + 8000; }
    const clock = () => { if (t0 === null) { let p = null; try { p = JSON.parse(ss.get('sk-pos') || 'null'); } catch {} t0 = ac.currentTime - (p ? p.t + (Date.now() - p.at) / 1000 : 0); } return ac.currentTime - t0; };
    function setup() {
      if (ac || !AC) return; ac = new AC(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      Object.keys(LOOPS).forEach(k => { gains[k] = ac.createGain(); gains[k].gain.value = k === 'bed' ? .85 : 0; gains[k].connect(master); });
      fetching = true; ['bed', 'deep', 'calls'].forEach(k => fetch(base + 'sk-' + k + '.m4a').then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)))
        .then(buf => { bufs[k] = buf; loop(k); }).catch(() => {}));
    }
    function loop(k) { if (!(k in LOOPS) || srcs[k] || !bufs[k] || !ac || ac.state !== 'running') return; const s = ac.createBufferSource(); s.buffer = bufs[k]; s.loop = true; s.loopStart = 0; s.loopEnd = Math.min(LOOPS[k], bufs[k].duration);
      s.connect(gains[k]); s.start(0, clock() % s.loopEnd); srcs[k] = s; }
    const ramp = (g, v, tc) => { g.gain.cancelScheduledValues(ac.currentTime); g.gain.setTargetAtTime(v, ac.currentTime, tc); };
    function running() { if (!ac || ac.state !== 'running') return false; clock(); Object.keys(LOOPS).forEach(loop); ramp(master, .9, .6); return true; }
    const gesture = () => { disarm(); if (want) start(); };
    function arm() { if (armed) return; armed = true; ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, gesture, { once: true, capture: true })); }
    function disarm() { armed = false; ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, gesture, { capture: true })); }
    function start() { setup(); if (!ac) return; const p = ac.resume(); p && p.then(running).catch(() => {}); setTimeout(() => { if (want && !running()) arm(); }, 400); }
    function stop() { if (!ac) return; ramp(master, 0, .15); setTimeout(() => { if (!want && ac) ac.suspend(); }, 700); }
    const save = () => { if (ac && ac.state === 'running' && t0 !== null) ss.set('sk-pos', JSON.stringify({ t: clock(), at: Date.now() })); ss.set('sk-next', String(nextAt)); };
    // which calls belong at this depth, and how near they sound
    function pool(m) { const p = [];                       // one voice per depth band
      if (m < 250) ['hb1', 'hb2', 'hb3', 'hb4', 'hb5'].forEach(k => p.push([k, 1, 1]));
      else if (m >= 450 && m < 2000) p.push(['coda1', 2, 1], ['coda2', 2, 1], ['creak', 1, .9]);
      else if (m >= 2000) p.push(['quake', 1, 1], ['ice', 1, .8]);
      return p.filter(x => x[0] !== last); }
    function call(k, near) { const [off, dur] = SPRITE[k], s = ac.createBufferSource(), g = ac.createGain(), now = ac.currentTime; s.buffer = bufs.calls; s.playbackRate.value = .93 + Math.random() * .14;
      let node = s; if (near < .5) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; s.connect(f); node = f; }
      g.gain.value = .75 * near; if (ac.createStereoPanner) { const pn = ac.createStereoPanner(), a = Math.random() < .5 ? -1 : 1; pn.pan.setValueAtTime(-.6 * a, now); pn.pan.linearRampToValueAtTime(.6 * a, now + dur); node.connect(pn); pn.connect(g); } else node.connect(g);
      g.connect(master); s.start(now, off, dur); last = k; return dur / s.playbackRate.value; }
    function tick(m) {
      mNow = m; if (!ac || ac.state !== 'running' || !want) return null;
      gains.deep && ramp(gains.deep, .9 * sstep(1900, 2600, m), .8); gains.bed && ramp(gains.bed, .85 - .25 * sstep(1500, 3500, m), .8);
      if (!bufs.calls || Date.now() < nextAt) { const w = whale; whale = null; return w; }
      const p = pool(m), tot = p.reduce((a, x) => a + x[1], 0); if (!tot) { nextAt = Date.now() + 15000; return null; }
      let r = Math.random() * tot, pick = p[0]; for (const x of p) { if ((r -= x[1]) <= 0) { pick = x; break; } }
      const dur = call(pick[0], pick[2]), hump = /^hb/.test(pick[0]);
      if (hump && pick[2] > .5 && m < 260) whale = 'humpback'; if (/coda|creak/.test(pick[0]) && m > 420 && m < 2300) whale = 'sperm';
      // a humpback phrase is now and then followed by another, as in a song; then the sea goes quiet for a while
      const gap = hump && Math.random() < .4 ? 1.5 + Math.random() * 3 : Math.random() < .3 ? 60 + Math.random() * 50 : 18 + Math.random() * 40;
      nextAt = Date.now() + (dur + gap) * 1000; ss.set('sk-next', String(nextAt)); const w = whale; whale = null; return w;
    }
    // the close pass sings as it goes by, and the next call waits a while after it
    const sing = () => { if (!ac || ac.state !== 'running' || !want || !bufs.calls) return; call('hb3', 1); nextAt = Date.now() + 45000; ss.set('sk-next', String(nextAt)); };
    return { want: () => want, on: () => !!(ac && ac.state === 'running' && want), start, stop, save, tick, disarm, sing,
      toggle() { want = !want; st.set('sk-sound', want ? 'on' : 'off'); want ? (disarm(), start()) : stop(); return want; },
      close() { save(); disarm(); if (ac) { Object.values(srcs).forEach(s => { try { s.stop(); } catch {} }); ac.close(); ac = null; } } };
  })();
  gB.setAttribute('aria-pressed', String(sound.want()));
  ctx.on(window, 'pagehide', sound.save); ctx.on(doc, 'visibilitychange', sound.save);
  const saveI = setInterval(sound.save, 2000);
  ctx.on(gB, 'click', e => { e.stopPropagation(); const on = sound.toggle(); gB.setAttribute('aria-pressed', String(on)); ctx.announce(on ? 'Sound of the sea on' : 'Sound of the sea off'); });
  if (sound.want()) sound.start();
  ctx.cleanup(() => { clearInterval(saveI); sound.close(); });

  /* ---------- words surfacing ---------- */
  const split = [];
  function surface() {
    if (ctx.reduce()) return;
    const els = [...doc.querySelectorAll('.d-head h1, .d-hero h1, .d-head .d-lede, .d-doc > h2, .d-doc section > h2')].filter(e => !e.dataset.skSplit && e.offsetParent);
    els.forEach(el => {
      split.push([el, el.innerHTML]); el.dataset.skSplit = '1'; let i = 0;
      const walk = n => { [...n.childNodes].forEach(c => {
        if (c.nodeType === 3) { const frag = doc.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { frag.append(w); return; }
          const o = doc.createElement('span'); o.className = 'sk-w'; const s = doc.createElement('span'); s.textContent = w; s.style.setProperty('--i', i++); o.append(s); frag.append(o); }); c.replaceWith(frag); }
        else if (c.nodeType === 1 && !/^(BR|SVG|IMG|BUTTON|A)$/.test(c.tagName)) walk(c); }); };
      walk(el); const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) setTimeout(() => el.classList.add('sk-in'), 40); else io.observe(el);
    });
    // never leave words hidden: whatever has not surfaced after a few seconds simply appears
    ctx.later(() => els.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 1.5) el.classList.add('sk-in'); }), 2500);
  }
  let pendT = 0;
  ctx.on(window, 'scroll', () => { if (pendT) return; pendT = setTimeout(() => { pendT = 0; for (const [el] of split) if (!el.classList.contains('sk-in')) { const r = el.getBoundingClientRect(); if (r.top < innerHeight * .95 && r.bottom > 0) el.classList.add('sk-in'); } }, 120); }, { passive: true });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('sk-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  ctx.cleanup(() => { io.disconnect(); split.forEach(([el, html]) => { el.innerHTML = html; el.classList.remove('sk-in'); delete el.dataset.skSplit; }); });

  /* ---------- the Assets page: every piece on its own tile ---------- */
  const specs = [];
  function buildSpecs() {
    doc.querySelectorAll('[data-sk-spec]').forEach(fig => {
      if (fig.querySelector('canvas.sk-spec')) return;
      const kind = fig.dataset.skSpec, c = doc.createElement('canvas'); c.className = 'sk-spec'; fig.prepend(c); ctx.cleanup(() => c.remove());
      const r = fig.getBoundingClientRect(), w = Math.max(120, Math.round(r.width)), h = Math.max(120, Math.round(r.height - 34));
      c.style.height = h + 'px';
      const [type, arg] = kind.split(':');
      if (type === 'nacre' && window.Nacre) { const p = Object.assign({}, Nacre.PRESETS[arg === 'shell' ? 'abalone' : arg === 'bubble' ? 'soap bubble' : arg === 'gem' ? 'oil on water' : 'pearl'], { light: [.3, .25] });
        const s = Math.min(w, h) * .78, img = Nacre.paint(c.getContext('2d'), Math.round(s), arg || 'pearl', p), dpr = Math.min(2, devicePixelRatio || 1);
        c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr); g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s); }
      else if (type === 'contour' && window.Contour) { const dpr = Math.min(2, devicePixelRatio || 1); c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
        const dk = ctx.dark(); Contour.draw(g, w, h, { form: arg || 'seamount', max: 4000, interval: 250, index: 4, rough: .4, seed: 5, res: 4, shallow: dk ? '#0b2a40' : '#cfeff0', deep: dk ? '#020b14' : '#2b7f95', ink: dk ? '#9ff0e2' : '#0b2c36', halo: dk ? '#06182a' : 'rgba(207,239,240,.9)', soundings: 10, labelSize: 9 }); }
      else if (type === 'sea') {
        // each creature is shown in the water of the depth it lives at
        const d = Sea3D.frac(LIVES[arg] ?? 50), z = WaterSea.zone(Object.assign({}, WaterSea.DEFAULTS, WATER), d), hx = v => 'rgb(' + v.map(q => Math.round(q * 255)).join(',') + ')';
        fig.style.background = `linear-gradient(180deg,${hx(z.top)},${hx(z.bot)})`; fig.classList.add('sk-wet');
        Sea3D.load().then(() => { if (gone) return; specR = specR || Sea3D.specimens(); specR.add(arg, c, { top: z.top, deep: Math.min(1, d * 1.2) }); const s = specR.list[specR.list.length - 1]; s.fig = fig; s.vis = false; sio.observe(fig); }).catch(() => {});
      }
    });
  }
  let specR = null;
  const sio = new IntersectionObserver(es => es.forEach(e => { const s = specR && specR.list.find(q => q.fig === e.target); if (s) s.vis = e.isIntersecting; }));
  ctx.cleanup(() => specR && specR.dispose());
  ctx.cleanup(() => sio.disconnect());
  const LIVES = { school: 20, turtle: 18, manta: 55, whale: 120, sperm: 1000, kelp: 15, rock: 150, lantern: 500, glowfish: 300, jelly: 700, squid: 800, siphon: 1500, angler: 2300, basalt: 3600, tripod: 4000, seapig: 4000, sponge: 4000 };

  /* ---------- build, then run ---------- */
  function build() { lifeSet(); collectGlass(); markDepths(); nacre(); contour(); surface(); buildSpecs(); }
  ctx.later(build, 60);
  let rb = 0; ctx.on(window, 'resize', () => { clearTimeout(rb); rb = setTimeout(build, 160); });
  ctx.onTheme(() => { ctx.later(build, 30); });
  ctx.cleanup(() => doc.querySelectorAll('.sk-wet').forEach(f => { f.style.background = ''; f.classList.remove('sk-wet'); }));
  // pages that change their own content (tabs, world sections) get their glass list refreshed now and then
  let tick = 0, lastWhale = -60, heard = null, passed = false, humps = 0, passM = 0, passT = 0;
  function frame(t) {
    const d = depthNow(), vw = innerWidth, vh = innerHeight;
    if (sea) {
      const res = narrow() ? .4 : .5, w = Math.round(vw * res), h = Math.round(vh * res);
      const P = Object.assign({}, WATER, { depth: d, radius: WATER.radius * res, bevel: WATER.bevel * res, refract: WATER.refract * res });
      sea.draw(P, t, w, h, ptr && d > .45 ? [ptr[0] * res, ptr[1] * res] : null, rects(res));
    }
    heard = sound.tick(Sea3D.metres(d)) || heard;
    if (life) {
      const z = WaterSea.zone(Object.assign({}, WaterSea.DEFAULTS, WATER), d), fog = z.top.map((c, i) => (c + z.bot[i]) / 2), mm = Sea3D.metres(d);
      // whales pass when they call: humpbacks near the top, a sperm whale in the deep; with the sound off, now and then
      let whales = heard; heard = null; if (!whales && !sound.on() && t - lastWhale > 90 && ((mm > 15 && mm < 250) || (mm > 450 && mm < 2200))) whales = true;
      // after ABZÛ: once a page, the first time you are among the humpbacks, a pod of huge ones slides past close by; and every fourth song
      if (whales === 'humpback' && ++humps % 4 === 0) whales = 'pass';
      if (Math.abs(mm - passM) > 3) { passM = mm; passT = t; }          // waits for a pause in the scrolling, so the pass is seen
      if (!passed && mm > 50 && mm < 220 && t - passT > 1.2 && t > 3) { passed = true; whales = 'pass'; sound.sing(); }
      if (whales) lastWhale = t;
      life.frame(t, { depth: d, range: range(), w: vw, h: vh, pointer: ptr, fog, top: z.top, whales });
    }
    // the glass gets clearer near the surface, where the water is bright
    const m0 = Sea3D.metres(d); ground(m0, t);
    const m = Sea3D.metres(d); gM.textContent = Math.round(m).toLocaleString() + ' m'; gZ.textContent = zoneOf(m);
    if (specR && tick % 2 === 0) specR.frame(t);
    if (++tick % 90 === 0) collectGlass();
    if (tick % 12 === 0) for (const [el] of split) if (!el.classList.contains('sk-in')) { const r = el.getBoundingClientRect(); if (r.top < innerHeight * .95 && r.bottom > 0) el.classList.add('sk-in'); }
  }
  ctx.loop(t => frame(t));
  if (ctx.reduce()) ctx.on(window, 'scroll', () => frame(0), { passive: true });

  /* a success sends up a stream of bubbles; a choice, a few */
  const burst = (el, n) => {
    if (!el || !el.getBoundingClientRect || ctx.reduce()) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const bb = doc.createElement('i'); bb.className = 'sk-bubble'; const s = 5 + Math.random() * 10; bb.style.width = bb.style.height = s + 'px';
      bb.style.left = r.left + Math.random() * r.width + 'px'; bb.style.top = r.top + r.height / 2 + 'px'; doc.body.append(bb);
      bb.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 40}px,${-90 - Math.random() * 140}px)`, opacity: 0 }], { duration: 1000 + Math.random() * 800, easing: 'cubic-bezier(.2,.6,.3,1)' }).onfinish = () => bb.remove();
    }
  };
  return { celebrate(el) { burst(el, 18); }, nudge(el) { burst(el, 4); } };
});
