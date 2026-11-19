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
  const LIFE = () => narrow() ? { schoolCount: 54, jellies: 2, squid: 1, rocks: .55, kelp: .6, density: .7 } : { schoolCount: 120, jellies: 4, squid: 2 };
  // day starts at the surface, night in the twilight; how deep a page goes depends on how long it is:
  // a two-screen page stays in the sunlight, a case study of a dozen screens reaches the floor
  const range = () => { const a = ctx.dark() ? .4 : 0, screens = root.scrollHeight / Math.max(1, innerHeight), reach = clamp((screens - 1) / 10, .22, 1); return [a, a + (1 - a) * reach]; };

  /* ---------- the sea and its life ---------- */
  const seaL = ctx.layer('sk-sea'), seaC = doc.createElement('canvas'); seaL.append(seaC);
  const lifeL = ctx.layer('sk-life'), lifeC = doc.createElement('canvas'); lifeL.append(lifeC);
  const sea = window.WaterSea && WaterSea.create(seaC), life = window.SeaLife && SeaLife.create(lifeC, LIFE());
  if (sea) { root.classList.add('sk-live'); ctx.cleanup(() => { root.classList.remove('sk-live'); sea.lose(); }); }
  let lifeKey = '';
  const lifeSet = () => { const [a, b] = range(), k = a + '|' + b.toFixed(2) + '|' + narrow(); if (k !== lifeKey && life) { life.set({ ...LIFE(), from: a, to: b }); lifeKey = k; } };

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
    deepCss.textContent = out.join('\n') + '\n.sk-flip,.sk-flip *{transition:color .9s ease,background-color .9s ease,border-color .9s ease,fill .9s ease!important;}'; } catch {}
  doc.head.append(deepCss); ctx.cleanup(() => { deepCss.remove(); root.removeAttribute('data-sk-deep'); root.classList.remove('sk-flip'); });
  let deep = false, flipT = 0;
  function setDeep(on) { if (on === deep) return; deep = on; root.classList.add('sk-flip'); clearTimeout(flipT); flipT = setTimeout(() => root.classList.remove('sk-flip'), 1000);
    on ? root.setAttribute('data-sk-deep', '') : root.removeAttribute('data-sk-deep'); nacre(); ctx.announce(on ? 'The light runs out: twilight zone' : 'Back in the sunlight'); }

  /* ---------- depth marks on section headings, and the gauge ---------- */
  const marked = [];
  function markDepths() {
    marked.forEach(h => h.removeAttribute('data-sk-m')); marked.length = 0;
    const [a, b] = range(), total = root.scrollHeight;
    doc.querySelectorAll('.d-doc > h2, .d-doc section > h2').forEach(h => { if (!h.offsetParent) return;
      const y = h.getBoundingClientRect().top + scrollY, p = clamp((y - innerHeight * .35) / pageMax()), m = Math.round(SeaLife.metres(a + (b - a) * p) / 5) * 5;
      h.setAttribute('data-sk-m', m.toLocaleString() + ' m · ' + zoneOf(m)); marked.push(h); });
  }
  ctx.cleanup(() => marked.forEach(h => h.removeAttribute('data-sk-m')));

  const gauge = doc.createElement('div'); gauge.className = 'sk-gauge'; gauge.setAttribute('role', 'group'); gauge.setAttribute('aria-label', 'Depth');
  gauge.innerHTML = '<span class="sk-z"></span><b aria-live="off">0 m</b><button type="button" aria-pressed="false" aria-label="Sound of the sea"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10.5v3"/></svg></button>';
  doc.body.append(gauge); ctx.cleanup(() => gauge.remove());
  const gZ = gauge.querySelector('.sk-z'), gM = gauge.querySelector('b'), gB = gauge.querySelector('button');

  /* ---------- the sound of the sea: synthesised, quiet, only when asked ---------- */
  let audio = null;
  function soundOn() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = new AC(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }   // brown noise: the weight of water
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = .7;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = .08; lfoG.gain.value = 160; lfo.connect(lfoG); lfoG.connect(lp.frequency);
    src.connect(lp); lp.connect(out); src.start(); lfo.start();
    out.gain.setTargetAtTime(.32, ac.currentTime, 1.2);
    const blip = () => { if (!audio) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime, f = 500 + Math.random() * 700;
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + .09);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + .16); audio.bt = setTimeout(blip, 1800 + Math.random() * 5200); };
    audio = { ac, out, lp, bt: setTimeout(blip, 2000) };
  }
  function soundOff() { if (!audio) return; const a = audio; audio = null; clearTimeout(a.bt); a.out.gain.setTargetAtTime(0, a.ac.currentTime, .4); setTimeout(() => a.ac.close(), 1500); }
  ctx.on(gB, 'click', () => { const on = gB.getAttribute('aria-pressed') !== 'true'; gB.setAttribute('aria-pressed', String(on)); on ? soundOn() : soundOff(); ctx.announce(on ? 'Sound of the sea on' : 'Sound of the sea off'); });
  ctx.cleanup(soundOff);

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
      else if (type === 'life' && window.SeaLife) {
        // each creature is shown in the water of the depth it lives at
        const d = SeaLife.frac(LIVES[arg] ?? 50), z = WaterSea.zone(Object.assign({}, WaterSea.DEFAULTS, WATER), d), hx = v => 'rgb(' + v.map(q => Math.round(q * 255)).join(',') + ')';
        fig.style.background = `linear-gradient(180deg,${hx(z.top)},${hx(z.bot)})`; fig.classList.add('sk-wet');
        const l = SeaLife.create(c, { seed: 7 }); l.solo(arg, w, h); specs.push({ fig, l, w, h, vis: false, d, fog: z.top.map((q, i) => (q + z.bot[i]) / 2) }); sio.observe(fig); }
    });
  }
  const sio = new IntersectionObserver(es => es.forEach(e => { const s = specs.find(q => q.fig === e.target); if (s) s.vis = e.isIntersecting; }));
  ctx.cleanup(() => sio.disconnect());
  const LIVES = { school: 20, turtle: 15, manta: 60, kelp: 15, wall: 120, pillar: 300, lantern: 500, jelly: 700, squid: 800, siphon: 1500, angler: 2500, tripod: 4200, seapig: 4500, sponge: 4400 };

  /* ---------- build, then run ---------- */
  function build() { lifeSet(); collectGlass(); markDepths(); nacre(); contour(); surface(); buildSpecs(); }
  ctx.later(build, 60);
  let rb = 0; ctx.on(window, 'resize', () => { clearTimeout(rb); rb = setTimeout(build, 160); });
  ctx.onTheme(() => { lifeKey = ''; doc.querySelectorAll('canvas.sk-spec').forEach(c => c.remove()); specs.length = 0; ctx.later(build, 30); });
  ctx.cleanup(() => doc.querySelectorAll('.sk-wet').forEach(f => { f.style.background = ''; f.classList.remove('sk-wet'); }));
  // pages that change their own content (tabs, world sections) get their glass list refreshed now and then
  let tick = 0;
  function frame(t) {
    const d = depthNow(), vw = innerWidth, vh = innerHeight;
    if (sea) {
      const res = narrow() ? .4 : .5, w = Math.round(vw * res), h = Math.round(vh * res);
      const P = Object.assign({}, WATER, { depth: d, radius: WATER.radius * res, bevel: WATER.bevel * res, refract: WATER.refract * res });
      sea.draw(P, t, w, h, ptr && d > .45 ? [ptr[0] * res, ptr[1] * res] : null, rects(res));
    }
    if (life) {
      const z = WaterSea.zone(Object.assign({}, WaterSea.DEFAULTS, WATER), d), fog = v => z.top.map((c, i) => z.bot[i] + (c - z.bot[i]) * Math.pow(1 - v, 1.1));
      life.frame(t, { y: scrollY, page: root.scrollHeight, w: vw, h: vh, depth: d, fog, pointer: ptr, scale: Math.min(1.5, devicePixelRatio || 1) });
    }
    // the glass gets clearer near the surface, where the water is bright
    const m0 = SeaLife.metres(d); if (!ctx.dark()) setDeep(deep ? m0 > 170 : m0 > 230);
    root.style.setProperty('--sk-a', ctx.dark() || deep ? '.74' : (.52 + .2 * clamp(m0 / 200)).toFixed(3));
    const m = SeaLife.metres(d); gM.textContent = Math.round(m).toLocaleString() + ' m'; gZ.textContent = zoneOf(m);
    for (const s of specs) if (s.vis) s.l.frame(t, { y: 0, page: s.h, w: s.w, h: s.h, depth: s.d, fog: () => s.fog, pointer: null });
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
