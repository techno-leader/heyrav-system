/* Aurora world - a night in Lapland.
   The sky is AuroraSky (1-sky.js, the same file as the Aurora Lab tool): one
   shader for the sky, the aurora, the fells, the spruce and the lake.
   - Scroll is the night: from the blue hour through a quiet arc, growth, the
     breakup, a corona overhead and pulsating patches to dawn. A clock in the
     corner reads the time and the phase. Short pages see part of the night.
   - Activity comes from tonight's real sky when it can be had (NOAA's
     planetary Kp, fetched once an hour), never below a moderate night.
   - The pointer leans the curtain and brightens it; a click on open sky starts
     a substorm that runs along the arc. Now and then a shooting star crosses.
   - The glass takes the light: panel edges carry the aurora's colour.
   - The sound of the night: wind over snow, on until turned off.
   - The night moves at its own pace: jumping sections lets the sky drift
     there over a few seconds rather than racing.
   Light theme is the polar blue hour. Reduced motion: one still frame.     */
window.heyravWorlds && heyravWorlds.define('aurora', ctx => {
  const doc = document, root = doc.documentElement;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
  const layer = ctx.layer('au-sky'), cv = doc.createElement('canvas'); layer.append(cv);
  const narrow = () => innerWidth < 760 || (navigator.hardwareConcurrency || 8) < 5;
  const meA = doc.querySelector('script[src*="js/worlds/aurora.js"]'), treesURL = new URL('../../assets/aurora-treeline.webp', meA ? meA.src : location.href).href;
  const sky = window.AuroraSky && AuroraSky.create(cv, { scale: narrow() ? .36 : .5, trees: treesURL });
  ctx.cleanup(() => sky && sky.dispose());

  /* ---------- tonight's sky: NOAA's planetary Kp, cached for an hour ---------- */
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} } };
  let kp = 4.6, liveKp = null;
  try { const c = JSON.parse(ss.get('au-kp') || 'null'); if (c && Date.now() - c.at < 3600e3) liveKp = c.kp; } catch {}
  if (liveKp == null) fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json').then(r => r.json()).then(a => { const v = a && a.length ? +a[a.length - 1].estimated_kp : null; if (v != null && isFinite(v)) { liveKp = v; ss.set('au-kp', JSON.stringify({ kp: v, at: Date.now() })); } }).catch(() => {});
  const activity = () => liveKp == null ? kp : Math.max(3.6, 2.6 + liveKp * .9);

  /* ---------- the night, read from the scroll ---------- */
  const pageMax = () => Math.max(1, root.scrollHeight - innerHeight);
  function phaseNow() {
    const screens = root.scrollHeight / innerHeight, reach = clamp((screens - 1) / 8, .3, 1);
    return .17 + (scrollY / pageMax()) * .81 * reach;
  }
  let ph = phaseNow();

  /* ---------- the gauge: clock, phase, sound ---------- */
  const gauge = doc.createElement('div'); gauge.className = 'au-gauge'; gauge.setAttribute('role', 'group'); gauge.setAttribute('aria-label', 'The night');
  gauge.innerHTML = '<span class="au-ph"></span><b aria-live="off"></b>' +
    '<button type="button" data-k="sound" aria-pressed="false" aria-label="Sound of the night"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10.5v3"/></svg></button>' ;
  doc.body.append(gauge); ctx.cleanup(() => gauge.remove());
  const gPh = gauge.querySelector('.au-ph'), gT = gauge.querySelector('b'), gS = gauge.querySelector('[data-k="sound"]');

  /* ---------- the sound of the night ---------- */
  const st = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const sound = (() => {
    const me = doc.querySelector('script[src*="js/worlds/aurora.js"]'), url = new URL('../../assets/audio/au-bed.m4a', me ? me.src : location.href).href, AC = window.AudioContext || window.webkitAudioContext, LOOP = 40;
    let want = st.get('au-sound') !== 'off', ac = null, master = null, buf = null, src = null, t0 = null, armed = false;
    const clock = () => { if (t0 === null) { let p = null; try { p = JSON.parse(ss.get('au-pos') || 'null'); } catch {} t0 = ac.currentTime - (p ? p.t + (Date.now() - p.at) / 1000 : 0); } return ac.currentTime - t0; };
    function setup() { if (ac || !AC) return; ac = new AC(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      fetch(url).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej))).then(b => { buf = b; play(); }).catch(() => {}); }
    function play() { if (src || !buf || !ac || ac.state !== 'running') return; src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.loopEnd = Math.min(LOOP, buf.duration); src.connect(master); src.start(0, clock() % src.loopEnd); }
    const ramp = (v, tc) => { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(v, ac.currentTime, tc); };
    function running() { if (!ac || ac.state !== 'running') return false; clock(); play(); ramp(.85, .8); return true; }
    const gesture = () => { disarm(); if (want) start(); };
    function arm() { if (armed) return; armed = true; ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, gesture, { once: true, capture: true })); }
    function disarm() { armed = false; ['pointerdown', 'keydown', 'touchstart'].forEach(e => removeEventListener(e, gesture, { capture: true })); }
    function start() { setup(); if (!ac) return; const p = ac.resume(); p && p.then(running).catch(() => {}); setTimeout(() => { if (want && !running()) arm(); }, 400); }
    function stop() { if (!ac) return; ramp(0, .2); setTimeout(() => { if (!want && ac) ac.suspend(); }, 900); }
    const save = () => { if (ac && ac.state === 'running' && t0 !== null) ss.set('au-pos', JSON.stringify({ t: clock(), at: Date.now() })); };
    return { want: () => want, start, save, tick() {}, disarm,
      toggle() { want = !want; st.set('au-sound', want ? 'on' : 'off'); want ? (disarm(), start()) : stop(); return want; },
      close() { save(); disarm(); if (ac) { try { src && src.stop(); } catch {} ac.close(); ac = null; } } };
  })();
  const paint = () => gS.setAttribute('aria-pressed', String(sound.want()));
  paint();
  ctx.on(gS, 'click', e => { e.stopPropagation(); const on = sound.toggle(); paint(); ctx.announce(on ? 'Sound of the night on' : 'Sound of the night off'); });
  ctx.on(window, 'pagehide', sound.save);
  const saveI = setInterval(sound.save, 2000); ctx.cleanup(() => { clearInterval(saveI); sound.close(); });
  if (sound.want()) sound.start();

  /* ---------- the pointer leans the curtain; a click on open sky is a substorm ---------- */
  let ptr = [-1, -1, 0], pk = 0, burst = [0, 0, -99];
  ctx.on(window, 'pointermove', e => {
    ptr = [e.clientX / innerWidth, e.clientY / innerHeight, 1]; pk = 1;
    const g = e.target.closest && e.target.closest('.card,.case-nav a,.d-wcard,.d-tile,.ia-leaf');
    if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--gx', (e.clientX - r.left) + 'px'); g.style.setProperty('--gy', (e.clientY - r.top) + 'px'); }
  }, { passive: true });
  ctx.on(doc, 'pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,input,select,textarea,label,summary,[role],.d-panel,.d-side,.d-k,dialog,.ed')) return;
    burst = [e.clientX / innerWidth, e.clientY / innerHeight, now()];
  });

  /* ---------- the loop ---------- */
  let last = 0, lastPh = '', glowSet = '', lastD = 0;
  function draw(t) {
    if (!sky) return;
    const dtp = lastD ? Math.min(.1, t - lastD) : 0; lastD = t;
    const d = phaseNow() - ph; ph += clamp(d * (1 - Math.exp(-dtp * .9)), -.035 * dtp, .035 * dtp);   // a jump of sections lets the sky drift there, never race
    pk *= .985; const P = { phase: ctx.reduce() ? .3 : ph, kp: activity(), day: ctx.dark() ? 0 : 1, seed: 3, ptr: [ptr[0], ptr[1], pk], burst };
    const s = sky.frame(P, ctx.reduce() ? 4 : t, innerWidth, innerHeight);
    // the glass takes the light
    const g = AuroraSky.glow(P), gs = `rgba(${g.slice(0, 3).map(v => Math.round(v * 255))},${(.12 + .32 * g[3]).toFixed(2)})`;
    if (gs !== glowSet) { root.style.setProperty('--au-glow', gs); glowSet = gs; }
    const name = AuroraSky.name(P.phase);
    gT.textContent = AuroraSky.clock(P.phase); if (name !== lastPh) { gPh.textContent = name; lastPh = name; }
    gauge.title = 'Kp ' + (liveKp == null ? 'about ' + kp.toFixed(1) : liveKp.toFixed(1) + ' now, from NOAA');
  }
  ctx.loop((t, ms) => { if (ms - last < 33 && !ctx.reduce()) return; last = ms; draw(now()); });
  ctx.on(window, 'resize', () => draw(now()));
  ctx.onTheme(() => draw(now()));
  ctx.cleanup(() => root.style.removeProperty('--au-glow'));

  /* ---------- specimens on the Assets page: each phase of a night, on its own engine ---------- */
  const specs = [...doc.querySelectorAll('[data-au-spec]')].filter(f => AuroraSky.PRESETS[f.dataset.auSpec]);
  if (specs.length && window.AuroraSky) {
    const off = doc.createElement('canvas'), eng = AuroraSky.create(off, { scale: .6, trees: treesURL });
    if (eng) {
      ctx.cleanup(() => eng.dispose());
      const tiles = specs.map(f => { const c = doc.createElement('canvas'); c.className = 'au-spec'; f.prepend(c); ctx.cleanup(() => c.remove()); return { f, c, i: specs.indexOf(f), P: Object.assign({ seed: 3 }, AuroraSky.PRESETS[f.dataset.auSpec]) }; });
      let k = 0;
      ctx.loop(() => {
        if (++k % 3) return;
        const t = now(), dpr = Math.min(2, devicePixelRatio || 1);
        tiles.forEach(o => { const r = o.f.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
          const w = Math.round(r.width), h = Math.round(r.height); if (o.c.width !== Math.round(w * dpr)) { o.c.width = Math.round(w * dpr); o.c.height = Math.round(h * dpr); }
          eng.frame(Object.assign({ day: 0 }, o.P), ctx.reduce() ? 4 : t + o.i * .002, w, h); o.c.getContext('2d').drawImage(off, 0, 0, o.c.width, o.c.height); });
      });
    }
  }

  /* ---------- shooting stars: rare, and catchable ---------- */
  function shoot() {
    if (ctx.reduce() || doc.hidden) return schedule();
    const s = doc.createElement('button'); s.type = 'button'; s.className = 'au-shoot'; s.setAttribute('aria-label', 'A shooting star'); s.tabIndex = -1;
    const y0 = 40 + Math.random() * innerHeight * .25, x0 = innerWidth * (.15 + Math.random() * .5), ang = 18 + Math.random() * 14;
    s.style.transform = `translate(${x0}px,${y0}px) rotate(${ang}deg)`; doc.body.append(s);
    const dist = 420 + Math.random() * 260, rad = ang * Math.PI / 180;
    const a = s.animate([{ transform: `translate(${x0}px,${y0}px) rotate(${ang}deg)`, opacity: 0 }, { opacity: 1, offset: .15 },
      { transform: `translate(${x0 + Math.cos(rad) * dist}px,${y0 + Math.sin(rad) * dist}px) rotate(${ang}deg)`, opacity: 0 }], { duration: 2200, easing: 'cubic-bezier(.3,.1,.4,1)' });
    a.onfinish = () => { s.remove(); schedule(); };
    s.addEventListener('click', () => { const r = s.getBoundingClientRect(); a.cancel(); s.remove(); flare(r.left + r.width / 2, r.top + r.height / 2, 34); window.heyrav && heyrav.toast('A wish, kept.', { tone: 'ok' }); schedule(); }, { once: true });
    ctx.cleanup(() => s.remove());
  }
  let shootT = 0; const schedule = () => { clearTimeout(shootT); shootT = ctx.later(shoot, 25000 + Math.random() * 45000); };
  ctx.later(shoot, 12000);
  function flare(x, y, n = 24) {
    burst = [x / innerWidth, y / innerHeight, now()];
    if (ctx.reduce()) return;
    const C = ['#3dff8f', '#7ff5c4', '#ff86d6', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const f = doc.createElement('i'); f.className = 'au-flare'; const c = C[i % C.length];
      f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.background = c; f.style.boxShadow = `0 0 12px 3px ${c}`; doc.body.append(f);
      const a = i / n * Math.PI * 2 + Math.random() * .3, v = 50 + Math.random() * 110;
      f.animate([{ transform: 'scale(1.4)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 30}px) scale(.2)`, opacity: 0 }], { duration: 1000 + Math.random() * 500, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => f.remove();
    }
  }
  return {
    nudge(el) { const r = el.getBoundingClientRect(); flare(r.left + Math.min(r.width, 44) / 2, r.top + r.height / 2, 8); },
    celebrate(el) { const r = el.getBoundingClientRect(); flare(r.left + r.width / 2, r.top + r.height / 2); },
  };
});
