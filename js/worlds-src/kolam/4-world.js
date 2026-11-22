/* Kolam - a morning at a threshold.

   Every page opens on its own kolam, made from the page's address and today's
   date, so each page has one and it changes every morning. It draws itself the
   first time a page is visited each day - dots first, then one line round them -
   and is still after that. Stay on a page and ants find it: a scout first, then
   a line of others along its trail, eating the flour and carrying crumbs home;
   scroll away and they leave. Dividers are a chain of flour, a success closes a
   small kolam beside what earned it, the home page has a folded paper flower at
   the centre of its kolam, and with sound on a veena plays low with a koel now
   and then. The rest - the floor, the type, the ring round a chosen dot - is in
   tokens and in css/worlds/kolam.css. */
window.heyravWorlds && heyravWorlds.define('kolam', ctx => {
  const doc = document, A = window.KolamArt, K = window.Kolam;
  if (!A || !K) return {};
  const ink = () => ctx.dark() ? '#f2ece1' : '#8c3420';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const page = location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '/') || '/';

  /* ---------- the chain of flour for dividers ---------- */
  function chain() {
    const p = A.pen(), W = 64, H = 16;
    A.band(p, 1, 4, 2, 11, (x, y) => [x / 8 * W, 1.5 + y / 2 * (H - 3)], { density: .5, rings: false, color: ink(), lw: 1.1, dotR: .9, per: 8 });
    ctx.root.style.setProperty('--kl-chain', `url("data:image/svg+xml,${encodeURIComponent(p.svg(W, H))}")`);
  }
  chain(); ctx.cleanup(() => ctx.root.style.removeProperty('--kl-chain'));

  /* ---------- the kolam at the door ---------- */
  const head = doc.querySelector('.d-head') || doc.querySelector('.d-hero');
  let door = null, lines = [], dots = [], food = [], eaten = null, size = 0;
  const today = A.dayNo(new Date());
  function makeDoor(animate) {
    if (!head) return;
    door && door.remove();
    door = doc.createElement('div'); door.className = 'kl-door'; door.setAttribute('aria-hidden', 'true');
    head.prepend(door);
    size = 400;
    const sp = A.specOf(A.daySeed(page, new Date())), G = A.gen(sp), p = A.pen();
    const m = A.piece(p, G, size / 2, size / 2, size * .92, { tips: sp.tips, color: 'currentColor', food: true });
    food = p.food; eaten = new Float32Array(food.length);
    door.innerHTML = `<svg viewBox="0 0 ${size} ${size}" style="color:${ink()}">${p.svg(size, size, { inner: true })}</svg>`;
    const svg = door.querySelector('svg');
    lines = [...svg.querySelectorAll('path')]; dots = [...svg.querySelectorAll('circle')];
    if (!animate || ctx.reduce()) return;
    // dots from the centre out, then the line at the pace of a hand
    dots.forEach(d => { const dd = Math.hypot(+d.getAttribute('cx') - size / 2, +d.getAttribute('cy') - size / 2); d.style.transform = 'scale(0)'; d.style.transformOrigin = `${d.getAttribute('cx')}px ${d.getAttribute('cy')}px`; d.style.transition = `transform 260ms cubic-bezier(.34,1.56,.64,1) ${Math.round(dd * 2.2)}ms`; });
    const L = lines.map(l => l.getTotalLength()), total = L.reduce((a, b) => a + b, 0) || 1, dur = Math.min(9000, 2500 + total * 2.2);
    let start = 900; lines.forEach((l, i) => { l.style.strokeDasharray = L[i]; l.style.strokeDashoffset = L[i]; l.style.transition = `stroke-dashoffset ${Math.round(L[i] / total * dur)}ms linear ${start}ms`; start += L[i] / total * dur; });
    requestAnimationFrame(() => requestAnimationFrame(() => { dots.forEach(d => d.style.transform = 'scale(1)'); lines.forEach(l => l.style.strokeDashoffset = 0); }));
  }
  const drawnKey = 'kl-drawn:' + page;
  makeDoor(store.get(drawnKey) !== String(today));
  store.set(drawnKey, String(today));
  ctx.cleanup(() => door && door.remove());
  ctx.onTheme(() => { if (door) door.querySelector('svg').style.color = ink(); chain(); });

  /* ---------- ants, if you stay ---------- */
  const STAY = 45; // seconds on a page, with its kolam in view, before the scout comes
  let seen = 0, visible = false, colony = null, cv = null, away = false;
  if (door && window.Ants) {
    const io = new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if (!visible && colony) { colony.dismiss(); away = true; } }), { threshold: .3 });
    io.observe(door); ctx.cleanup(() => io.disconnect());
    ctx.loop((t, ms) => {
      const dt = Math.min(.05, (ms - (ctx._last || ms)) / 1000); ctx._last = ms;
      if (visible && !colony && !doc.hidden) seen += dt;
      if (!colony && seen > STAY) {
        cv = doc.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:-45%;width:190%;height:190%;pointer-events:none'; door.append(cv);
        const D = Math.min(2, devicePixelRatio || 1), box = door.getBoundingClientRect(); cv.width = box.width * 1.9 * D; cv.height = box.height * 1.9 * D;
        const k = box.width / size, off = box.width * .45, pts = food.map(q => [q[0] * k + off, q[1] * k + off]);
        colony = Ants.create({ nest: [box.width * 1.85, box.height * 1.8], size: Math.max(7, box.width / 26), count: 12, color: ctx.dark() ? '#9a3d1c' : '#1b120c', crumb: '#fbf6ea',
          food: { pts, take(i, d) { for (let j = -4; j <= 4; j++) { const q = i + j; if (q >= 0 && q < eaten.length) eaten[q] = Math.min(1, eaten[q] + d * .1); } } } });
        colony._k = k; colony._off = off; colony._D = D;
      }
      if (colony) {
        colony.update(dt);
        const x = cv.getContext('2d'), D = colony._D; x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
        // the floor shows through where the flour has been eaten
        x.fillStyle = getComputedStyle(doc.body).backgroundColor; for (let i = 0; i < eaten.length; i += 2) if (eaten[i] > .2) { const q = food[i]; x.globalAlpha = Math.min(1, eaten[i]); x.beginPath(); x.arc(q[0] * colony._k + colony._off, q[1] * colony._k + colony._off, 2.2, 0, 7); x.fill(); }
        x.globalAlpha = 1; colony.draw(x);
        if (away && !colony.stats().ants) { cv.remove(); cv = null; colony = null; away = false; seen = 0; }
      }
    });
  }

  /* ---------- the flower at the centre, on the home page ---------- */
  if (door && doc.querySelector('.d-hero') && window.PaperPixel) {
    const three = () => window.THREE ? Promise.resolve() : (window.__ppThree = window.__ppThree || new Promise((res, rej) => { const s = doc.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej; doc.head.append(s); }));
    three().then(() => {
      if (!door || !door.isConnected) return; let eng; try { eng = PaperPixel.create(window.THREE); } catch (e) { return; }
      const c = doc.createElement('canvas'); c.className = 'kl-flower'; door.append(c); const m = eng.model(A.FLOWERS.pumpkin); const t0 = performance.now();
      ctx.loop(() => { const r = c.getBoundingClientRect(), D = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * D); if (!w) return; if (c.width !== w) { c.width = c.height = w; } const t = (performance.now() - t0) / 1000; eng.draw(m, c.getContext('2d'), { t, prog: Math.min(1, t / 1.6), yaw: ctx.reduce() ? 20 : t * 12, u: w / 30, base: 9, tilt: A.FLOWERS.pumpkin.tilt, sway: .6 }); });
      ctx.cleanup(() => c.remove());
    }).catch(() => {});
  }

  /* ---------- the Assets page: the set, the compositions, lamps and the flower ---------- */
  doc.querySelectorAll('[data-kl-spec]').forEach(fig => {
    const id = fig.dataset.klSpec, W = fig.classList.contains('wide') ? 640 : 400, H = fig.classList.contains('wide') ? 384 : 400, p = A.pen();
    let bg;
    if (A.LAYOUTS[id]) { bg = { courtyard: A.GROUNDS.stone, threshold: A.GROUNDS.cement, knots: A.GROUNDS.oxide, ring: '#9c8466' }[id]; A.LAYOUTS[id](p, W, H, K.rng(7), { flame: '#f0932b' }); }
    else if (A.SET[id]) { bg = A.SET[id].ground; A.SET[id].draw(p, W, H, { flame: '#f0932b', seed: 7 }); }
    else return;
    fig.insertAdjacentHTML('afterbegin', p.svg(W, H, { bg }).replace('<svg ', '<svg aria-hidden="true" preserveAspectRatio="xMidYMid slice" '));
  });

  /* ---------- sound: the veena bed and the koel, only while sound is on ---------- */
  let AC = null, bed = null, koelT = 0;
  const soundOn = () => window.HRSoundUI && HRSoundUI.on();
  async function startBed() {
    if (bed || !soundOn()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') await AC.resume();
      const get = async u => { const r = await fetch(ctx.here + '../assets/audio/' + u); return AC.decodeAudioData(await r.arrayBuffer()); };
      const [b, k] = await Promise.all([get('kl-bed.m4a'), get('kl-koel.m4a')]);
      if (!soundOn() || bed) return;
      const out = AC.createGain(); out.connect(AC.destination); out.gain.setValueAtTime(0, AC.currentTime); out.gain.linearRampToValueAtTime(.22, AC.currentTime + 4);
      const src = AC.createBufferSource(); src.buffer = b; src.loop = true; src.connect(out); src.start();
      bed = { src, out };
      const koel = () => { if (!bed) return; const s = AC.createBufferSource(), g = AC.createGain(); g.gain.value = .5; s.buffer = k; s.connect(g); g.connect(out); s.start(); koelT = setTimeout(koel, 60000 + Math.random() * 60000); };
      koelT = setTimeout(koel, 20000 + Math.random() * 20000);
    } catch (e) {}
  }
  function stopBed() { clearTimeout(koelT); if (!bed) return; const b = bed; bed = null; try { b.out.gain.cancelScheduledValues(AC.currentTime); b.out.gain.setTargetAtTime(0, AC.currentTime, .4); setTimeout(() => { try { b.src.stop(); } catch (e) {} }, 1600); } catch (e) {} }
  const check = () => setTimeout(() => soundOn() ? startBed() : stopBed(), 60);
  ctx.on(doc, 'pointerdown', check, { capture: true }); ctx.on(window, 'storage', check);
  ctx.cleanup(stopBed);

  /* ---------- answers: a small kolam closes beside a success; dots for a small choice ---------- */
  function burst(el, kind) {
    const r = el.getBoundingClientRect(), b = doc.createElement('div'); b.className = 'kl-burst';
    b.style.left = (kind === 'pick' ? r.left + r.width / 2 : r.right + 30) + 'px'; b.style.top = r.top + r.height / 2 + 'px';
    const p = A.pen();
    if (kind === 'pick') [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4; p.dot(42 + Math.cos(a) * 30, 42 + Math.sin(a) * 22, 2.2, 'currentColor'); });
    else A.piece(p, A.gen({ shape: 'diamond', n: 3, sym: 'C4', density: 0, seed: (Math.random() * 1e9) | 0, rings: false }), 42, 42, 80, { color: 'currentColor', lw: 2, dotR: 1.6 });
    b.innerHTML = `<svg viewBox="0 0 84 84" style="color:var(--accent)">${p.svg(84, 84, { inner: true })}</svg>`;
    doc.body.append(b);
    if (!ctx.reduce()) b.querySelectorAll('path').forEach(l => { const L = l.getTotalLength(); l.style.strokeDasharray = L; l.style.strokeDashoffset = L; l.style.transition = 'stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1)'; requestAnimationFrame(() => requestAnimationFrame(() => l.style.strokeDashoffset = 0)); });
    b.animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: kind === 'pick' ? 700 : 1800, easing: 'ease-out' }).onfinish = () => b.remove();
  }

  return {
    celebrate(el) { burst(el, 'success'); },
    nudge(el) { burst(el, 'pick'); },
  };
});
