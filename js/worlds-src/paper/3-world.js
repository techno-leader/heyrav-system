/* Paper Pixel world - the page as paper.
   Pixel plants cut from card stand on the page's own lines and unfold when
   they come into view; they sway, lean toward the pointer and rustle when it
   brushes past. A line-drawn cat lives on the page and chases the pointer,
   which is a feather on a string: it sits, grooms, naps, bats at the feather
   and pounces when it is flicked. A cardboard box sits on a line too - the
   cat will climb in and ignore everything until the box is shaken. Double-click
   empty space to throw a treat (three and it is too full, and naps), stroke it
   with the pointer and it purrs, click it and it answers; click it three times
   quickly and it huffs off. Plants
   and the box come from the asset library the Paper Pixel bench edits.
   Reduced motion: everything stands still, and the cat only turns to look. */
window.heyravWorlds && heyravWorlds.define('paper', ctx => {
  const doc = document, root = doc.documentElement;
  const PP = window.PaperPixel, LIB = window.PaperPixelAssets || {};
  const DPR = Math.min(2, devicePixelRatio || 1);
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  let alive = true; ctx.cleanup(() => { alive = false; });

  /* ------------------------------------------------------------------ *
   * the pointer
   * ------------------------------------------------------------------ */
  const ptr = { x: -999, y: -999, vx: 0, vy: 0, ax: 0, in: false, t: 0, moved: 0, mouse: false };
  const trail = [];
  ctx.on(window, 'pointermove', e => {
    const t = now(), dt = Math.max(0.008, t - ptr.t);
    const vx = (e.clientX - ptr.x) / dt, vy = (e.clientY - ptr.y) / dt;
    if (ptr.in) { ptr.ax = (vx - ptr.vx) / dt; ptr.vx = lerp(ptr.vx, vx, 0.5); ptr.vy = lerp(ptr.vy, vy, 0.5); }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = t; ptr.in = true; ptr.mouse = e.pointerType === 'mouse';
    if (Math.hypot(vx, vy) > 40) ptr.moved = t;
    trail.push([t, ptr.x, ptr.y]); while (trail.length && trail[0][0] < t - 1) trail.shift();
  }, { passive: true });
  ctx.on(doc, 'pointerleave', () => { ptr.in = false; });
  ctx.on(window, 'blur', () => { ptr.in = false; });
  const delayed = s => { const t = now() - s; for (let i = trail.length - 1; i >= 0; i--) if (trail[i][0] <= t) return trail[i]; return trail[0] || [0, ptr.x, ptr.y]; };

  /* the feather replaces the pointer on a mouse; fields keep their caret */
  const toyOn = () => ctx.fine() && !ctx.reduce();
  const syncToy = () => root.classList.toggle('pp-toy', toyOn());
  syncToy(); ctx.cleanup(() => root.classList.remove('pp-toy'));

  /* ------------------------------------------------------------------ *
   * 1. plants and the box, on the page's lines
   * ------------------------------------------------------------------ */
  const garden = doc.createElement('div'); garden.className = 'pp-garden'; garden.setAttribute('aria-hidden', 'true');
  doc.body.append(garden); ctx.cleanup(() => garden.remove());
  const items = [];
  let eng = null;
  const three = () => window.THREE ? Promise.resolve() : (window.__ppThree = window.__ppThree || new Promise((res, rej) => {
    const s = doc.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.crossOrigin = 'anonymous';
    s.onload = res; s.onerror = rej; doc.head.append(s);
  }));

  /* where things stand. A line must have clear paper beside the text above it. */
  const textRight = el => { const r = doc.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return b.width ? b.right : el.getBoundingClientRect().left; };
  const PLANTS = ['tulip', 'daisy', 'bells', 'chard', 'seedling', 'puff', 'fern', 'cactus', 'rose', 'poppy'];
  const slug = (location.pathname.replace(/\/+$/, '').split('/').pop() || 'index');
  let hsh = 0; for (const c of slug) hsh = (hsh * 31 + c.charCodeAt(0)) >>> 0;
  const plantFor = i => PLANTS[(hsh + i * 3) % PLANTS.length];
  function spots() {
    const out = [], head = doc.querySelector('.d-head'), hero = doc.querySelector('.d-hero'), pn = doc.querySelector('.d-pn');
    if (head) {
      // the hairline under the page title, where the text above leaves room
      const at = () => { const r = head.getBoundingClientRect(), free = Math.max(...[...head.children].map(textRight)); return { r, free }; };
      out.push({ kind: plantFor(0), U: 3.6, at: () => { const { r, free } = at(); return { x: r.right - 46, y: r.bottom, room: r.right - free }; }, need: 96 });
      out.push({ kind: 'grass', U: 3, at: () => { const { r, free } = at(); return { x: r.right - 120, y: r.bottom, room: r.right - 70 - free }; }, need: 110 });
      // a sprout on the first example frame, at its top-right corner
      const ex = doc.querySelector('.d-doc .d-ex');
      if (ex) out.push({ kind: 'sprout', U: 3, at: () => { const r = ex.getBoundingClientRect(); return { x: r.right - 34, y: r.top + 1, room: 999 }; } });
      // the box rests on the bottom of the screen in the margin column, so the cat can always find it
      const side = doc.querySelector('.d-toc');
      out.push({ kind: 'box', U: 3.2, box: true, fixed: true, at: () => {
        const r = side && side.getBoundingClientRect();
        return r && r.width ? { x: r.left + r.width / 2, y: innerHeight - 4, room: 999 } : { x: innerWidth - 70, y: innerHeight - 4, room: innerWidth >= 1100 ? 999 : 0 };
      } });
    }
    if (hero) {
      out.push({ kind: 'tulip', U: 4.6, at: () => { const r = hero.getBoundingClientRect(); return { x: r.left + 70, y: r.bottom - 1, room: 999 }; } });
      out.push({ kind: 'box', U: 3.6, box: true, at: () => { const r = hero.getBoundingClientRect(); return { x: r.left + 170, y: r.bottom - 1, room: 999 }; } });
      out.push({ kind: 'puff', U: 4.2, at: () => { const r = hero.getBoundingClientRect(); return { x: r.right - 80, y: r.bottom - 1, room: 999 }; } });
      out.push({ kind: 'grass', U: 3.4, at: () => { const r = hero.getBoundingClientRect(); return { x: r.right - 170, y: r.bottom - 1, room: 999 }; } });
    }
    if (pn) out.push({ kind: plantFor(1), U: 3.6, at: () => { const r = pn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top, room: 999 }; } });
    return out;
  }

  const io = new IntersectionObserver(es => es.forEach(e => { const it = e.target.__pp; if (it) it.vis = e.isIntersecting; }), { rootMargin: '160px' });
  ctx.cleanup(() => io.disconnect());
  function mount(spot) {
    const asset = LIB[spot.kind]; if (!asset) return null;
    const m = eng.model(asset), b = eng.bounds(m, spot.box ? 3 : 4);
    const it = { spot, m, b, U: spot.U, vis: false, born: 0, prog: ctx.reduce() ? 1 : 0, a: 0, v: 0, yaw0: (PP.hash2(items.length, hsh) - 0.5) * 30, bloom: 0, blow: 0, shake: 0, flap: 1, seed: items.length * 1.7 };
    const el = doc.createElement(spot.box ? 'button' : 'div');
    el.className = 'pp-item' + (spot.box ? ' pp-box' : '') + (spot.fixed ? ' pp-fixed' : '');
    if (spot.box) { el.type = 'button'; el.setAttribute('aria-label', 'A cardboard box'); el.removeAttribute('aria-hidden'); }
    const cv = doc.createElement('canvas'); el.append(cv);
    it.el = el; it.cv = cv; it.cx = cv.getContext('2d'); el.__pp = it; cv.__pp = it;
    (spot.box ? doc.body : garden).append(el);
    if (spot.box) ctx.cleanup(() => el.remove());
    io.observe(el);
    size(it); items.push(it);
    return it;
  }
  function size(it) {
    const U = it.U * (innerWidth < 900 ? 0.85 : 1); it.u = U;
    it.w = Math.ceil(it.b.w * U); it.h = Math.ceil(it.b.h * U);
    it.cv.width = Math.round(it.w * DPR); it.cv.height = Math.round(it.h * DPR);
    it.el.style.width = it.w + 'px'; it.el.style.height = it.h + 'px';
    it.dirty = true;
  }
  /* reads first, writes after: the docs reveal sections with motion, so
     visible items follow their lines every frame */
  function track(all) {
    const list = all ? items : items.filter(i => i.vis || i.box);
    const at = list.map(it => { const a = it.spot.at(), f = it.spot.fixed; return { x: a.x + (f ? 0 : scrollX), y: a.y + (f ? 0 : scrollY), ok: a.room >= (it.spot.need || 0) && innerWidth >= 520 }; });
    list.forEach((it, i) => {
      const a = at[i];
      if (a.ok !== it.shown) { it.shown = a.ok; it.el.style.display = a.ok ? '' : 'none'; }
      if (!a.ok) return;
      const L = Math.round(a.x - it.w / 2), T = Math.round(a.y - it.h + it.b.base * it.u);
      if (L !== it.L) { it.el.style.left = L + 'px'; it.L = L; }
      if (T !== it.T) { it.el.style.top = T + 'px'; it.T = T; }
    });
  }
  function draw(it, t) {
    const st = { u: it.u * DPR, w: it.cv.width, h: it.cv.height, base: it.b.base, prog: it.prog, t, still: ctx.reduce(),
      yaw: it.yaw0 + (ctx.reduce() ? 0 : Math.sin(t * 0.32 + it.seed) * 16), lean: -it.a * 0.25, rustle: it.a, bloom: it.bloom, blow: it.blow, flap: it.flap, shake: it.shake };
    if (!ctx.reduce() && ptr.in) { const r = it.cv.getBoundingClientRect(); st.yaw += clamp((ptr.x - (r.left + r.width / 2)) / 700, -1, 1) * 24; }
    eng.draw(it.m, it.cx, st); it.dirty = false;
  }
  function stepItems(t, dt) {
    if (!eng) return;
    track(false);
    for (const it of items) {
      if (!it.vis || !it.shown) continue;
      if (!it.born) it.born = t;
      const moving = !ctx.reduce();
      if (moving) {
        it.prog = clamp((t - it.born) / 1.5, 0, 1);
        const r = it.cv.getBoundingClientRect(), near = (x, y) => x > r.left && x < r.right && y > r.top && y < r.bottom;
        if (ptr.in && near(ptr.x, ptr.y)) it.v += clamp(ptr.vx, -2500, 2500) * 0.00035 * dt * 60;
        if (cat.speed > 120 && near(cat.x, cat.y - 20)) it.v += cat.vx * 0.0004 * dt * 60;
        it.v += (-38 * it.a - 4.2 * it.v) * dt; it.a = clamp(it.a + it.v * dt, -0.6, 0.6);
        it.bloom = Math.max(0, it.bloom - dt * 0.5);
        if (it.blow > 0) { it.blow += dt * 0.45; if (it.blow > 2.6) it.blow = 0; }
        it.shake = Math.max(0, it.shake - dt * 1.6);
        if (it.box) it.flap = lerp(it.flap, box.cat ? 0.32 : 1, Math.min(1, dt * 5));
      } else it.prog = 1;
      if (moving || it.dirty) draw(it, t);
    }
  }

  /* press a plant to make it bloom, or blow a seed head */
  const isControl = el => !!(el && el.closest && el.closest('a,button,input,textarea,select,label,summary,[role="button"],[tabindex],.d-code,pre'));
  ctx.on(window, 'pointerdown', e => {
    if (!eng || isControl(e.target)) return;
    for (const it of items) {
      if (it.box || !it.shown || !it.vis) continue;
      const r = it.cv.getBoundingClientRect();
      if (e.clientX > r.left + r.width * 0.2 && e.clientX < r.right - r.width * 0.2 && e.clientY > r.top + r.height * 0.15 && e.clientY < r.bottom) {
        if (it.spot.kind === 'puff' && !it.blow) it.blow = 0.001; else it.bloom = 1;
        it.v += (Math.random() < 0.5 ? -1 : 1) * 2.5; return;
      }
    }
  });

  /* ------------------------------------------------------------------ *
   * 2. the box: the cat climbs in and only a shake brings it out
   * ------------------------------------------------------------------ */
  const box = { it: null, cat: false, since: 0, cool: 0, peek: 0, nextPeek: 0, rev: [], clicks: [] };
  const boxRect = () => box.it && box.it.shown && box.it.vis ? box.it.cv.getBoundingClientRect() : null;
  function label() { if (box.it) box.it.el.setAttribute('aria-label', box.cat ? 'A cardboard box with the cat in it - shake it' : 'A cardboard box'); }
  function shakeBox() {
    if (!box.it) return;
    box.it.shake = 1; box.it.v += 3;
    if (box.cat) { box.cat = false; box.cool = now() + 18; label(); popOut(); ctx.announce('Out it jumps.'); }
  }
  function bindBox(it) {
    box.it = it; label();
    const el = it.el;
    // a shake: three changes of direction while held, or three quick presses
    let held = false, lastX = 0, dir = 0;
    ctx.on(el, 'pointerdown', e => { held = true; lastX = e.clientX; dir = 0; box.rev = []; el.setPointerCapture && el.setPointerCapture(e.pointerId); it.shake = Math.max(it.shake, 0.35); });
    ctx.on(el, 'pointermove', e => {
      if (!held) return; const d = e.clientX - lastX; if (Math.abs(d) < 6) return;
      const s = Math.sign(d); if (dir && s !== dir) { box.rev.push(now()); box.rev = box.rev.filter(t => t > now() - 0.8); it.shake = Math.max(it.shake, 0.6); if (box.rev.length >= 3) { box.rev = []; shakeBox(); } }
      dir = s; lastX = e.clientX;
    });
    ctx.on(el, 'pointerup', () => { held = false; });
    ctx.on(el, 'click', () => {
      box.clicks.push(now()); box.clicks = box.clicks.filter(t => t > now() - 1.2);
      it.shake = Math.max(it.shake, 0.5);
      if (box.clicks.length >= 3 || (box.cat && !ptr.mouse)) { box.clicks = []; shakeBox(); }
    });
    ctx.on(el, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shakeBox(); } });
  }

  /* ------------------------------------------------------------------ *
   * 3. the cat and the toy, drawn as lines on one fixed canvas
   * ------------------------------------------------------------------ */
  const stage = ctx.layer('pp-stage', true);
  const cv = doc.createElement('canvas'); stage.append(cv);
  const sx = cv.getContext('2d');
  function fit() { cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); sx.setTransform(DPR, 0, 0, DPR, 0, 0); sx.imageSmoothingEnabled = false; }
  fit();
  const S = innerWidth < 700 ? 2 : 3;
  let INK = [29, 27, 23], PAPER = [255, 254, 251];
  const hex3 = h => { h = h.trim(); if (/^#[0-9a-f]{6}$/i.test(h)) return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return null; };
  const colours = () => { const cs = getComputedStyle(root); INK = hex3(cs.getPropertyValue('--ink')) || INK; PAPER = hex3(cs.getPropertyValue('--panel')) || PAPER; };
  colours(); ctx.onTheme(() => { colours(); });
  const TINT = { c: [255, 120, 92], t: [43, 179, 163], y: [245, 197, 66], q: [250, 240, 214], G: [242, 196, 64], H: [255, 244, 190], b: [222, 150, 78], d: [176, 104, 48], p: [255, 122, 150] };

  /* a sprite drawn in layers: each layer becomes an outline in ink with paper
     inside, so where a leg crosses the body a line shows */
  function Sprite(w, h, sticker) {
    const c = doc.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d'), img = cx.createImageData(w, h);
    const sil = doc.createElement('canvas'); sil.width = w; sil.height = h; const scx = sil.getContext('2d'), simg = scx.createImageData(w, h);
    const buf = new Array(w * h).fill(0), comp = new Array(w * h).fill(0);
    const sp = {
      w, h, cv: c, sil,
      L: [],
      clr() { buf.fill(0); comp.fill(0); sp.L = []; },
      px(x, y, k) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; buf[(h - 1 - y) * w + x] = k; },
      disc(x0, y0, rx, ry, k) { for (let y = Math.floor(y0 - ry); y <= Math.ceil(y0 + ry); y++) for (let x = Math.floor(x0 - rx); x <= Math.ceil(x0 + rx); x++) { const a = (x - x0) / rx, b = (y - y0) / ry; if (a * a + b * b <= 1.05) sp.px(x, y, k); } },
      rect(x0, y0, x1, y1, k) { for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) sp.px(x, y, k); },
      line(x0, y0, x1, y1, k, wd = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 1.5; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; sp.px(x, y, k); if (wd > 1) sp.px(x + 1, y, k); } },
      poly(pts, k, wd = 1) { for (let i = 1; i < pts.length; i++) sp.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], k, wd); },
      layer() {
        const cl = [];
        for (let i = 0; i < buf.length; i++) {
          const k = buf[i]; if (!k) continue;
          const x = i % w, edge = x === 0 || x === w - 1 || !buf[i - 1] || !buf[i + 1] || !buf[i - w] || !buf[i + w];
          comp[i] = (k === 'K' || k === 'E') ? k : edge ? (sticker ? 'Z' : 'K') : k;
          cl.push([x, h - 1 - ((i / w) | 0), k]);
        }
        if (cl.length) sp.L.push(cl);
        buf.fill(0);
      },
      flush() {
        sp.layer();
        for (let i = 0; i < comp.length; i++) {
          const k = comp[i], o = i * 4;
          if (!k) { img.data[o + 3] = 0; simg.data[o + 3] = 0; continue; }
          const col = sticker ? (k === 'O' ? CAT : k === 'Z' ? RIM : k === 'E' ? EYE : k === 'K' ? CAT : TINT[k] || CAT) : (k === 'K' ? INK : k === 'O' ? PAPER : TINT[k] || PAPER);
          img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
          simg.data[o] = 0; simg.data[o + 1] = 0; simg.data[o + 2] = 0; simg.data[o + 3] = 255;
        }
        if (sticker) for (let i = 0; i < comp.length; i++) { // a white paper edge all round, like a cut-out sticker
          if (comp[i]) continue; const x = i % w, y = (i / w) | 0; let near = false;
          for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if ((dx || dy) && xx >= 0 && yy >= 0 && xx < w && yy < h && comp[yy * w + xx]) { near = true; break; } }
          if (near) { const o = i * 4; img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = 255; simg.data[o] = 0; simg.data[o + 1] = 0; simg.data[o + 2] = 0; simg.data[o + 3] = 255; }
        }
        cx.putImageData(img, 0, 0); scx.putImageData(simg, 0, 0);
      },
    };
    return sp;
  }

  /* the same sprites cut from card by the Paper Pixel engine, like the plants
     and the box: each layer of a sprite is a sheet a little in front of the
     last, lit from the same side, with the same grain and shadow. Every pose
     is cut once and kept. */
  const PCOL = { O: '#34333c', E: '#ffb02e', K: '#1f1e24' };
  const hexOf = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const pCache = new Map(), CHS = '123456789abcdefghijklmnopqrstuvwxyz';
  function paperize(sp, o = {}) {
    if (!eng) return null;
    const ax = o.ax ?? 14, yaw = o.yaw || 0;
    const key = (o.id || '') + yaw + ':' + sp.L.map(L => L.map(c => c[0] + ',' + c[1] + c[2]).join(' ')).join('|');
    let r = pCache.get(key); if (r) { pCache.delete(key); pCache.set(key, r); return r; }
    // the cat's black card is shaded a step lighter for each sheet nearer the eye, so legs read against the body
    const n = sp.L.length, pal = [], idx = {}, shade = (hx, f) => '#' + [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(hx.slice(i, i + 2), 16) * f)).toString(16).padStart(2, '0')).join('');
    const chr = (k, li) => { const id = k === 'O' ? 'O' + li : k; if (!(id in idx)) { idx[id] = pal.length; pal.push(k === 'O' ? shade(PCOL.O, 0.82 + 0.5 * (n > 1 ? li / (n - 1) : 0.5)) : (PCOL[k] || hexOf(TINT[k] || CAT))); } return CHS[idx[id]]; };
    const pieces = sp.L.map((L, li) => {
      const rows = Array.from({ length: sp.h }, () => Array(sp.w).fill('.')); L.forEach(([x, y, k]) => { rows[sp.h - 1 - y][x] = chr(k, li); });
      return { rows: rows.map(q => q.join('')), ax, ay: 0, z: (li - (n - 1) / 2) * (o.gap ?? 1.1), depth: o.depth ?? 0.9, extrude: o.extrude ?? 1, grow: 'none' };
    });
    const P = 5, half = Math.max(ax, sp.w - ax) + P, Hc = sp.h + P * 2, u = (o.cell || S) * DPR;
    const g = doc.createElement('canvas'); g.width = Math.round(half * 2 * u); g.height = Math.round(Hc * u);
    try { const m = eng.model({ v: 1, palette: pal, tilt: o.tilt ?? 14, pieces }); eng.draw(m, g.getContext('2d'), { u, base: P, t: 0, still: true, yaw, prog: 1, tilt: o.tilt ?? 14 }); eng.dispose(m); } catch (e) { return null; }
    const f = doc.createElement('canvas'); f.width = g.width; f.height = g.height; const fx2 = f.getContext('2d');
    fx2.filter = `drop-shadow(${3 * DPR}px ${6 * DPR}px ${3 * DPR}px rgba(0,0,0,.18)) drop-shadow(${DPR}px ${2 * DPR}px ${DPR}px rgba(0,0,0,.14))`; fx2.drawImage(g, 0, 0);
    r = { cv: f, half, Hc, P }; pCache.set(key, r);
    if (pCache.size > 80) pCache.delete(pCache.keys().next().value);
    return r;
  }
  // place a cut sprite with its pivot (feet, or bottom centre) at x, y; c is CSS pixels per sprite cell
  const drawPaper = (g2, r, x, y, c) => g2.drawImage(r.cv, x - r.half * c, y - (r.Hc - r.P) * c, r.half * 2 * c, r.Hc * c);

  /* the cat faces right; feet centre at sprite x 14, y 0 */
  const CAT = [29, 28, 37], RIM = [58, 57, 74], EYE = [255, 176, 46];
  const CS = Sprite(32, 26, true);
  /* a chibi black cat: a big round head, tall pointed ears, amber ring eyes */
  const ears = (hx, hy, up = 0) => { for (const [ex, o] of [[hx - 4, 0], [hx + 1.6, 1]]) { CS.rect(ex, hy + 2.8, ex + 2.4, hy + 2.8, 'O'); CS.rect(ex + o * .8, hy + 3.8, ex + 1.6 + o * .8, hy + 3.8, 'O'); CS.px(ex + o * 1.8, hy + 4.8 + up, 'O'); if (up) CS.px(ex + o * 1.8, hy + 4.8, 'O'); } };
  const ring = (x, y) => { x = Math.round(x); y = Math.round(y); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (i || j) CS.px(x + i, y + j, 'E'); };
  const eye = (hx, hy, e) => { if (e === 'shut') { CS.rect(hx - 2.2, hy, hx - 0.4, hy, 'E'); CS.rect(hx + 1.6, hy, hx + 3.4, hy, 'E'); } else { ring(hx - 1.2, hy + (e === 'wide' ? 0.6 : 0.2)); ring(hx + 2.6, hy + (e === 'wide' ? 0.6 : 0.2)); } };
  /* fur: single-pixel tufts just outside an ellipse, so the outline comes out ragged and soft */
  const fur = (x0, y0, rx, ry, a0, a1, step = 0.42, k = 'O') => { for (let a = a0; a <= a1; a += step) { const j = (Math.sin(a * 7.3) > 0 ? 0.75 : 0.35); CS.px(x0 + Math.cos(a) * (rx + j), y0 + Math.sin(a) * (ry + j), k); } };
  const head = (hx, hy, e, up, puff) => { CS.disc(hx, hy, 5.3, 4.3, 'O');
    for (const sd of [-1, 1]) { CS.px(hx + sd * 5.9, hy - 1.2, 'O'); CS.px(hx + sd * 5.6, hy - 2.4, 'O'); CS.px(hx + sd * 5.2, hy - 3.4, 'O'); }   // cheek fluff
    if (puff) fur(hx, hy, 5.3, 4.3, -3.1, 0.1, 0.35);
    ears(hx, hy, up); CS.layer(); eye(hx, hy, e); };
  const POSE = {
    run(f) {
      const s = Math.sin(f * Math.PI * 2), c = Math.cos(f * Math.PI * 2), b = Math.round(Math.abs(c) * 1.2);
      CS.poly([[6, 9 + b], [4, 11 + b], [3, 13 + b + s * 1.5], [3.5, 15 + b + s * 2]], 'O', 2); CS.disc(3.5, 15 + b + s * 2, 1.6, 1.6, 'O');
      CS.line(8, 5 + b, 8 - 3.5 * s, Math.max(0, -c) * 1.5, 'O', 2); CS.line(18, 5 + b, 18 + 3.5 * s, Math.max(0, c) * 1.5, 'O', 2); CS.layer();
      CS.disc(13, 7.2 + b, 7.8, 3.7, 'O'); fur(13, 7.2 + b, 7.8, 3.7, -2.9, -0.3); CS.layer();
      CS.line(9, 5 + b, 9 + 3.5 * s, Math.max(0, c) * 1.5, 'O', 2); CS.line(17, 5 + b, 17 - 3.5 * s, Math.max(0, -c) * 1.5, 'O', 2); CS.layer();
      head(21.5, 10 + b, 'open', 0);
    },
    sit(o) {
      const lk = o.look || 0;
      CS.poly([[6, 3], [3, 1], [7, 0], [12, 0], [18, 0 + (o.flick || 0)]], 'O', 3); CS.disc(18.5, 0.8 + (o.flick || 0), 1.5, 1.5, 'O'); CS.layer();
      CS.disc(10, 5.2, 5.9, 5.3, 'O'); CS.disc(13.6, 8.4, 4.4, 5.1, 'O'); fur(10, 5.2, 5.9, 5.3, 1.6, 3.3); fur(13.6, 8.4, 4.4, 5.1, -0.9, 0.7, 0.34);
      if (o.puff) { fur(10, 5.2, 5.9, 5.3, 0.3, 3.2, 0.3); fur(13.6, 8.4, 4.4, 5.1, -1.2, 1.4, 0.3); } CS.layer();
      CS.rect(14, 0, 15, 6, 'O'); if (!o.paw) CS.rect(16, 0, 17, 5, 'O'); CS.layer();
      head(15.5 + (o.tilt || 0), 13.4 + lk, o.blink ? 'shut' : (o.wide ? 'wide' : 'open'), o.wide ? 1 : 0, o.puff);
      if (o.paw) { const e = o.paw; CS.line(15, 6, 17 + e * 1.5, 8 + e * 7, 'O', 2); CS.layer(); }
    },
    crouch(o) {
      const w = o.wiggle || 0;
      CS.line(6 + w, 5, 1, 6 + (o.flick || 0), 'O', 2); CS.rect(7 + w, 0, 8 + w, 3, 'O'); CS.rect(17, 0, 18, 2, 'O'); CS.layer();
      CS.disc(7.5 + w, 5, 3.6, 3, 'O'); CS.disc(13, 4.2, 7.8, 3.1, 'O'); fur(13, 4.2, 7.8, 3.1, 0.4, 2.8); CS.layer();
      CS.rect(16, 0, 17, 2, 'O'); CS.rect(9 + w, 0, 10 + w, 2, 'O'); CS.layer();
      head(20.5, 5.6, 'wide', 0);
    },
    pounce(o) {
      CS.poly([[6, 10], [3, 11], [1, 12 + (o.u || 0) * 2]], 'O', 2); CS.line(8, 6, 3, 3, 'O', 2); CS.line(18, 7, 24, 9, 'O', 2); CS.layer();
      CS.disc(13, 8, 7.9, 3.2, 'O'); fur(13, 8, 7.9, 3.2, -2.8, -0.4); CS.layer();
      CS.line(9, 6, 4, 2, 'O', 2); CS.line(17, 7, 23, 8, 'O', 2); CS.layer();
      head(22, 11, 'wide', 1);
    },
    sleep(o) {
      const fat = o.fat ? 1.2 : 0;
      CS.disc(12.5, 4 + fat * 0.6, 9.2 + fat, 4.2 + fat + (o.breath || 0) * 0.4, 'O'); fur(12.5, 4 + fat * 0.6, 9.2 + fat, 4.2 + fat, 0.3, 2.9); CS.layer();
      CS.disc(21.5, 4.3, 4.9, 3.9, 'O'); CS.px(26.6, 3.4, 'O'); CS.px(26.2, 2.4, 'O'); ears(21.5, 4.3, 0); CS.layer(); eye(21.5, 4.3, 'shut');
      CS.poly([[4, 1], [8, 0], [16, 0], [21, 0.4]], 'O', 2); CS.layer();
    },
    stretch(o) {
      const k = o.k || 0;
      CS.poly([[5, 9], [3, 12], [3, 15]], 'O', 2); CS.rect(9, 0, 10, 6, 'O'); CS.layer();
      CS.disc(9, 6.5, 3.6, 3, 'O'); CS.disc(13.5, 4.6 - k * 0.3, 6, 2.6, 'O'); CS.layer();
      CS.rect(7, 0, 8, 6, 'O'); CS.line(16, 2, 22 + k, 0, 'O', 2); CS.layer();
      head(20, 4, 'shut', 0);
    },
    eat(o) { // head down over the treat, chewing
      CS.poly([[6, 3], [3, 2], [2, 4 + (o.flick || 0)]], 'O', 3); CS.layer();
      CS.disc(10, 4.6, 5.8, 4.4, 'O'); CS.disc(14.5, 5.4, 4.2, 3.6, 'O'); fur(10, 4.6, 5.8, 4.4, 1.7, 3.2); CS.layer();
      CS.rect(14, 0, 15, 3, 'O'); CS.rect(17, 0, 18, 3, 'O'); CS.layer();
      head(20.5, 5.2 - (o.chew || 0), 'shut', 0);
    },
    peek(o) { // ears and eyes over the rim of the box
      CS.disc(15, 1.5 + o.h, 4.6, 3.8, 'O'); ears(15, 1.5 + o.h, 0); CS.layer(); eye(15, 1.8 + o.h, 'open');
    },
  };

  const cat = { x: 80, y: innerHeight - 10, vx: 0, vy: 0, speed: 0, face: 1, st: 'sleep', t: 0, f: 0, nextBat: 0, look: 0 };
  let toyAt = { x: 0, y: 0 }, target = null, targetUntil = 0, focusAt = 0;
  const set = s => { if (cat.st !== s) { cat.st = s; cat.t = 0; } };

  /* treats (double-click empty space), petting (stroke the cat) and boops (click it) */
  const TROWS = ['..bbb.bb', '.bdbbbb.', 'bbbbbbb.', '.bbbbbb.', '..bbb.bb'];
  const TS = Sprite(8, 5), paintTreat = () => { TS.clr(); TROWS.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') TS.px(c, 4 - r, ch); })); TS.flush(); };
  paintTreat(); ctx.onTheme(() => setTimeout(paintTreat, 30));
  const treats = [], fx = [];
  let fed = 0, fedAt = 0, pet = 0, boops = [], boopCool = 0;
  const catHit = (x, y) => !box.cat && Math.abs(x - cat.x) < 13 * S && y < cat.y + 4 && y > cat.y - CS.h * S;
  function throwTreat(x, y) {
    audio();
    treats.push({ x, y, vx: (Math.random() - 0.5) * 80, vy: -280, land: Math.min(innerHeight - 8, y + 36), on: false, born: now() });
    if (treats.length > 4) treats.shift();
    ctx.announce(fed >= 3 ? 'A treat. The cat is too full for it just now.' : 'A treat for the cat.');
  }
  const say = (txt, dur = 1.1) => fx.push({ k: 'say', txt, t: now(), dur });
  /* sounds: meows and purrs are CC0 recordings (OpenGameArt "Cat Purr & Meow" and "Meow");
     the hiss, the crunch and the paper tap are made for this. One small file,
     fetched on the first interaction; only ever in answer to something done to the cat. */
  const SND = { meow: [0, 0.436], mew: [0.686, 1.794], mewpurr: [2.73, 1.296], mewfood: [4.276, 0.918], hiss: [5.444, 0.75], crunch: [6.444, 1.5], tap: [8.194, 0.12], purr: [8.564, 8.313], purrsleep: [17.126, 5.654] };
  const meSrc = doc.querySelector('script[src*="js/worlds/paper.js"]'), sndURL = new URL('../../assets/audio/pp-cat.m4a', meSrc ? meSrc.src : location.href).href;
  let ac = null, sbuf = null, sload = null, purrNode = null;
  const soundOn = () => { try { return localStorage.getItem('pp-sound') !== 'off'; } catch { return true; } };
  function audio() {
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); }
    if (ac.state === 'suspended') ac.resume();
    if (!sload) sload = fetch(sndURL).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej))).then(b => (sbuf = b)).catch(() => null);
    return ac;
  }
  function snd(name, vol = 0.6, rate = 0.94 + Math.random() * 0.12) {
    if (!soundOn() || !audio()) return;
    const go = () => { if (!sbuf) return; const [o, d] = SND[name], s = ac.createBufferSource(), g = ac.createGain(); s.buffer = sbuf; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g); g.connect(ac.destination); s.start(0, o, d); };
    sbuf ? go() : sload.then(go);
  }
  function purr(on, name = 'purr', vol = 0.45) {
    if (on && (purrNode || !soundOn() || !audio())) return;
    if (!on) { if (purrNode) { const p = purrNode; purrNode = null; p.g.gain.setTargetAtTime(0, ac.currentTime, 0.2); setTimeout(() => { try { p.s.stop(); } catch {} }, 900); } return; }
    const go = () => { if (!sbuf || purrNode) return; const [o, d] = SND[name], s = ac.createBufferSource(), g = ac.createGain(); s.buffer = sbuf; s.loop = true; s.loopStart = o; s.loopEnd = o + d;
      g.gain.value = 0; g.gain.setTargetAtTime(vol, ac.currentTime, 0.25); s.connect(g); g.connect(ac.destination); s.start(0, o); purrNode = { s, g }; };
    sbuf ? go() : sload.then(go);
  }
  // browsers start sound only from a click or key, and stroking is not one: wake the audio (without fetching) on the first
  const unlock = () => { if (!soundOn()) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; if (!ac) ac = new AC(); if (ac.state === 'suspended') ac.resume(); };
  ctx.on(window, 'pointerdown', unlock, { passive: true }); ctx.on(window, 'keydown', unlock);
  ctx.cleanup(() => { purr(false); if (ac) setTimeout(() => ac && ac.close(), 1000); });
  const hearts = n => { for (let i = 0; i < n; i++) fx.push({ k: 'heart', dx: (Math.random() - 0.5) * 8 * S, t: now() + i * 0.22, dur: 1.3 }); };
  function boop() {
    const t = now(); boops = boops.filter(b => t - b < 2.2); boops.push(t);
    if (t < boopCool) return;
    if (boops.length >= 3) { boops = []; boopCool = t + 8; set('huff'); say('hmph', 1.2); snd('hiss', 0.5); ctx.announce('The cat has had enough and walks off.'); }
    else { if (['sleep', 'full'].includes(cat.st)) { set('stretch'); return; } const w = Math.floor(Math.random() * 3); set('mrrp'); say(['mrrp', 'mew', 'prrt'][w], 0.9); snd(['mewpurr', 'mew', 'meow'][w], 0.55); }
  }
  function stepTreats(t, dt) {
    for (let i = treats.length - 1; i >= 0; i--) { const q = treats[i];
      if (!q.on) { q.vy += 1100 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.y >= q.land) { q.y = q.land; if (q.vy > 140) { if (q.vy > 300) snd('tap', 0.5, 0.9 + Math.random() * 0.3); q.vy *= -0.32; q.vx *= 0.5; } else { q.on = true; q.vy = 0; } } }
      if (t - q.born > 45 || (ctx.reduce() && t - q.born > 1.4)) treats.splice(i, 1);
    }
    for (let i = fx.length - 1; i >= 0; i--) if (t - fx[i].t > fx[i].dur) fx.splice(i, 1);
  }
  const HS = Sprite(5, 5), paintHeart = () => { HS.clr(); ['.p.p.', 'ppppp', 'ppppp', '.ppp.', '..p..'].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') HS.px(c, 4 - r, ch); })); HS.flush(); }; paintHeart();
  function renderTreats() { const pt = paperize(TS, { id: 'treat', ax: 4, extrude: 2, depth: 1, tilt: 22, gap: 0 }); if (pt) { treats.forEach(q => drawPaper(sx, pt, Math.round(q.x), Math.round(q.y), S)); return; } treats.forEach(q => { sx.globalAlpha = 0.12; sx.drawImage(TS.sil, Math.round(q.x - 4 * S) + S, Math.round(q.y - 5 * S) + S, 8 * S, 5 * S); sx.globalAlpha = 1; sx.drawImage(TS.cv, Math.round(q.x - 4 * S), Math.round(q.y - 5 * S), 8 * S, 5 * S); }); }
  const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
  function renderFx(t) {
    const hx = cat.x + 6 * S * cat.face, hy = cat.y - CS.h * S;
    for (const f of fx) { const u = (t - f.t) / f.dur; if (u < 0) continue;
      if (f.k === 'heart') { const px = 2, x = Math.round(hx + f.dx), y = Math.round(hy - u * 30); sx.globalAlpha = Math.sin(Math.min(1, u) * Math.PI);
        const ph = paperize(HS, { id: 'heart', ax: 2, cell: px, tilt: 10 }); if (ph) { drawPaper(sx, ph, x + 5, y + 10, px); sx.globalAlpha = 1; continue; }
        HEART.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'x') { sx.fillStyle = `rgb(${TINT.p})`; sx.fillRect(x + c * px, y + r * px, px, px); } })); sx.globalAlpha = 1; }
      if (f.k === 'crumb') { sx.fillStyle = `rgb(${TINT.d})`; sx.fillRect(Math.round(f.x + f.vx * u), Math.round(f.y + 30 * u * u), 2, 2); }
      if (f.k === 'say') { sx.globalAlpha = Math.min(1, (1 - u) * 4, u * 8);
        sx.font = '700 11px "Silkscreen", monospace'; const w = Math.ceil(sx.measureText(f.txt).width) + 12, bx = Math.round(hx - w / 2 + 8 * cat.face), by = Math.round(hy - 26);
        sx.fillStyle = `rgb(${PAPER})`; sx.strokeStyle = `rgb(${INK})`; sx.lineWidth = 2; sx.beginPath(); sx.roundRect ? sx.roundRect(bx, by, w, 20, 6) : sx.rect(bx, by, w, 20); sx.fill(); sx.stroke();
        sx.beginPath(); sx.moveTo(bx + w / 2 - 4, by + 20); sx.lineTo(bx + w / 2, by + 26); sx.lineTo(bx + w / 2 + 4, by + 20); sx.fill(); sx.stroke(); sx.fillRect(bx + w / 2 - 3, by + 18, 6, 3);
        sx.fillStyle = `rgb(${INK})`; sx.textBaseline = 'middle'; sx.fillText(f.txt, bx + 6, by + 10.5); sx.globalAlpha = 1; }
    }
  }
  function popOut() {
    const r = boxRect(); if (!r) { set('sit'); return; }
    cat.jx0 = r.left + r.width / 2; cat.jy0 = r.top + r.height * 0.45;
    cat.jx1 = cat.jx0 + (r.left > innerWidth / 2 ? -1 : 1) * 70; cat.jy1 = Math.min(innerHeight - 8, r.bottom + 6);
    cat.x = cat.jx0; cat.y = cat.jy0; cat.face = cat.jx1 > cat.jx0 ? 1 : -1; set('pounce');
  }
  function stepCat(t, dt) {
    cat.t += dt;
    const idle = t - Math.max(ptr.moved, focusAt);
    let goal = null;
    if (target) goal = { ...target };
    else if (ptr.in && ptr.mouse) { const d = delayed(0.22); goal = { x: d[1] + feather.ox, y: d[2] + feather.oy + 40 }; }
    if (goal) { goal.x = clamp(goal.x, 40, innerWidth - 40); goal.y = clamp(goal.y, 60, innerHeight - 8); }
    const dx = goal ? goal.x - cat.x : 0, dy = goal ? goal.y - cat.y : 0, d = Math.hypot(dx, dy);
    const toySpeed = Math.hypot(ptr.vx, ptr.vy) * (t - ptr.t < 0.08 ? 1 : 0);

    if (ctx.reduce()) { set('sit'); if (goal) { cat.face = dx >= 0 ? 1 : -1; cat.look = clamp(-dy / 200, -1, 2); } return; }

    /* in the box: nothing reaches it but a shake. Long out of sight, it leaves on its own */
    if (box.cat) {
      const r = boxRect();
      if (!r) { if (t - box.since > 6) { box.cat = false; label(); cat.x = -30; cat.y = innerHeight - 10; set('run'); } return; }
      if (t > box.nextPeek) { box.peek = 1.4; box.nextPeek = t + 3 + Math.random() * 4; }
      box.peek = Math.max(0, box.peek - dt);
      return;
    }
    /* a treat on the floor beats everything but the box; fullness wears off in two minutes */
    if (fed && t - fedAt > 120) fed = 0;
    if (treats.some(q => q.on) && fed < 3 && !['totreat', 'eat', 'happy', 'full', 'hop', 'pounce', 'tobox', 'huff', 'stretch'].includes(cat.st)) set(cat.st === 'sleep' ? 'stretch' : 'totreat');
    /* stroking: the pointer moving gently over the cat */
    const pspd = Math.hypot(ptr.vx, ptr.vy) * (t - ptr.t < 0.1 ? 1 : 0);
    if (catHit(ptr.x, ptr.y) && ptr.in && ptr.mouse && pspd > 20 && pspd < 900 && ['sit', 'groom', 'purr', 'happy', 'sleep'].includes(cat.st)) pet = Math.min(2, pet + dt); else pet = Math.max(0, pet - dt * 0.8);
    if (pet > 0.9 && cat.st !== 'purr') { set('purr'); purr(true); ctx.announce('Purr.'); }
    if (cat.st !== 'purr' && purrNode) purr(false);
    if (cat.st === 'purr' && Math.random() < dt * 1.5) hearts(1);
    /* the box, if it can be seen and nothing is going on, is irresistible */
    const br = boxRect();
    if (br && t > box.cool && !target && br.top > 40 && br.top < innerHeight - 30 && ((['sit', 'groom'].includes(cat.st) && cat.t > 2.5 && idle > 4) || (cat.st === 'sleep' && cat.t > 25))) set('tobox');
    if (br && t > box.cool && ptr.in && ptr.x > br.left && ptr.x < br.right && ptr.y > br.top - 20 && ptr.y < br.bottom && ['sit', 'groom', 'bat', 'run', 'alert'].includes(cat.st)) set('tobox');

    switch (cat.st) {
      case 'tobox': {
        if (!br) { set('sit'); break; }
        const gx = br.left + br.width / 2, gy = br.top + br.height * 0.35, ex = gx - cat.x, ey = gy - cat.y, ed = Math.hypot(ex, ey);
        const sp = Math.min(520, 160 + ed * 3);
        cat.vx = lerp(cat.vx, ex / (ed || 1) * sp, Math.min(1, dt * 5)); cat.vy = lerp(cat.vy, ey / (ed || 1) * sp, Math.min(1, dt * 5));
        if (Math.abs(cat.vx) > 20) cat.face = cat.vx > 0 ? 1 : -1;
        if (ed < 70) { cat.jx0 = cat.x; cat.jy0 = cat.y; cat.jx1 = gx; cat.jy1 = gy; set('hop'); }
        break;
      }
      case 'hop': {
        const u = clamp(cat.t / 0.4, 0, 1);
        cat.x = lerp(cat.jx0, cat.jx1, u); cat.y = lerp(cat.jy0, cat.jy1, u) - Math.sin(u * Math.PI) * 40;
        if (u >= 1) { box.cat = true; box.since = t; box.nextPeek = t + 2.5; box.it.shake = 0.5; label(); cat.vx = cat.vy = 0; ctx.announce('The cat is in the box. Shake it to bring it out.'); }
        return;
      }
      case 'sleep': if (goal && t - ptr.moved < 0.2 && d > 30) set('stretch'); break;
      case 'stretch': if (cat.t > 0.75) set(d > 26 ? 'run' : 'sit'); break;
      case 'alert': if (cat.t > 0.28) set('run'); break;
      case 'sit': case 'groom': case 'bat':
        if (goal && d > 46) { set('alert'); break; }
        if (goal && toySpeed > 900 && d < 170 && d > 14) { set('crouch'); break; }
        if (cat.st === 'bat' && cat.t > 0.42) set('sit');
        if (cat.st === 'groom' && (idle < 0.3 || cat.t > 3.2)) set('sit');
        if (cat.st === 'sit') {
          if (idle > 16) set('sleep');
          else if (idle > 5.5 && cat.t > 2) set('groom');
          else if (goal && idle > 0.6 && t > cat.nextBat && Math.abs(toyAt.x - cat.x) < 70 && toyAt.y < cat.y - 40 && toyAt.y > cat.y - 120) { set('bat'); cat.nextBat = t + 1.6 + Math.random() * 1.8; }
        }
        if (goal) { cat.face = toyAt.x >= cat.x ? 1 : -1; cat.look = clamp((cat.y - 50 - toyAt.y) / 60, -1, 2); }
        break;
      case 'crouch':
        if (cat.t > 0.55) { set('pounce'); cat.jx0 = cat.x; cat.jy0 = cat.y; cat.jx1 = goal ? goal.x : cat.x; cat.jy1 = goal ? goal.y : cat.y; cat.face = cat.jx1 >= cat.x ? 1 : -1; }
        else if (goal && d > 260) set('run');
        break;
      case 'pounce': {
        const u = clamp(cat.t / 0.42, 0, 1);
        cat.x = lerp(cat.jx0, cat.jx1, u); cat.y = lerp(cat.jy0, cat.jy1, u) - Math.sin(u * Math.PI) * 46;
        if (u >= 1) { set('sit'); cat.vx = cat.vy = 0; }
        return;
      }
      case 'run': {
        if (!goal) { set('sit'); break; }
        const sp = Math.min(560, 140 + d * 3.2);
        cat.vx = lerp(cat.vx, (dx / (d || 1)) * sp, Math.min(1, dt * 5)); cat.vy = lerp(cat.vy, (dy / (d || 1)) * sp, Math.min(1, dt * 5));
        if (Math.abs(cat.vx) > 20) cat.face = cat.vx > 0 ? 1 : -1;
        if (d < 12) set(cat.speed > 320 ? 'skid' : 'sit');
        break;
      }
      case 'totreat': {
        const q = treats.find(z => z.on); if (!q) { set('sit'); break; }
        const fc = q.x >= cat.x ? 1 : -1, tx = q.x - fc * 7 * S, ty = q.y, ex = tx - cat.x, ey = ty - cat.y, ed = Math.hypot(ex, ey), sp = Math.min(520, 150 + ed * 3);
        cat.vx = lerp(cat.vx, ex / (ed || 1) * sp, Math.min(1, dt * 5)); cat.vy = lerp(cat.vy, ey / (ed || 1) * sp, Math.min(1, dt * 5));
        if (Math.abs(cat.vx) > 20) cat.face = cat.vx > 0 ? 1 : -1;
        if (ed < 10) { cat.x = tx; cat.y = ty; cat.face = fc; cat.food = q; set('eat'); snd('crunch', 0.55); ctx.announce('Nom.'); }
        break;
      }
      case 'eat':
        if (Math.random() < dt * 7) fx.push({ k: 'crumb', x: cat.x + 7 * S * cat.face, y: cat.y - 4 * S, vx: (Math.random() - 0.5) * 24, t, dur: 0.5 });
        if (cat.t > 1.8) { const i = treats.indexOf(cat.food); if (i >= 0) treats.splice(i, 1); fed++; fedAt = t;
          if (fed >= 3) { set('full'); say('so full', 1.6); snd('purrsleep', 0.35, 1); ctx.announce('The cat is full and lies down for a nap.'); } else { set('happy'); hearts(2); snd('mewfood', 0.5); } }
        break;
      case 'happy': if (cat.t > 1.6) set('sit'); break;
      case 'full': if (cat.t > 14) set('sleep'); break;
      case 'purr': if (pet <= 0.05 && cat.t > 1) set('sit'); break;
      case 'mrrp': if (cat.t > 0.9) set('sit'); break;
      case 'huff': if (cat.t > 0.75) { target = { x: cat.x < innerWidth / 2 ? innerWidth - 90 : 90, y: cat.y, force: true }; targetUntil = t + 3; set('run'); } break;
      case 'skid':
        cat.vx *= Math.pow(0.02, dt); cat.vy *= Math.pow(0.02, dt);
        if (cat.t > 0.2) { set('sit'); cat.vx = cat.vy = 0; }
        break;
    }
    if (cat.st === 'run' || cat.st === 'skid' || cat.st === 'tobox' || cat.st === 'totreat') { cat.x += cat.vx * dt; cat.y += cat.vy * dt; } else { cat.vx = cat.vy = 0; }
    cat.speed = Math.hypot(cat.vx, cat.vy);
    cat.f = (cat.f + cat.speed * dt / 64) % 1;
    cat.x = clamp(cat.x, 30, innerWidth - 30); cat.y = clamp(cat.y, 50, innerHeight - 6);
  }
  function renderCat(t) {
    if (box.cat) { // only the ears, now and then
      const r = boxRect(); if (!r || box.peek <= 0) return;
      const h = Math.round(Math.sin(Math.min(1, (1.4 - box.peek) / 0.3, box.peek / 0.3) * Math.PI / 2) * 4) - 3;
      CS.clr(); POSE.peek({ h }); CS.flush();
      const X = Math.round(r.left + r.width / 2 - 15 * S), Y = Math.round(r.top + r.height * 0.36 - (CS.h) * S + 7 * S);
      sx.save(); sx.beginPath(); sx.rect(X - 10, Y - 40, CS.w * S + 20, CS.h * S + 40 - 1 * S); sx.clip();
      const pr = paperize(CS, { id: 'peek' }); if (pr) drawPaper(sx, pr, X + 14 * S, Y + CS.h * S, S); else sx.drawImage(CS.cv, X, Y, CS.w * S, CS.h * S); sx.restore();
      return;
    }
    CS.clr();
    const st = cat.st;
    let lift = 0;
    if (st === 'run' || st === 'tobox' || st === 'totreat') POSE.run(cat.f);
    else if (st === 'eat') POSE.eat({ chew: Math.round((Math.sin(cat.t * 14) + 1) / 2), flick: Math.round(Math.sin(t * 3)) });
    else if (st === 'full') POSE.sleep({ breath: Math.sin(t * 1.6), fat: true });
    else if (st === 'happy' || st === 'purr') POSE.sit({ blink: true, look: 0, tilt: st === 'purr' ? 0.6 : 0, flick: Math.round(Math.sin(t * 2.4)) });
    else if (st === 'mrrp') { POSE.sit({ wide: true, look: 1 }); lift = Math.sin(clamp(cat.t / 0.35, 0, 1) * Math.PI) * 8; }
    else if (st === 'huff') POSE.sit({ wide: true, puff: true, look: 0 });
    else if (st === 'skid' || st === 'hop') POSE.pounce({ u: 1 });
    else if (st === 'crouch') POSE.crouch({ wiggle: Math.round(Math.sin(cat.t * 38)), flick: Math.round(Math.sin(cat.t * 20)) });
    else if (st === 'pounce') POSE.pounce({ u: cat.t / 0.42 });
    else if (st === 'sleep') POSE.sleep({ breath: Math.sin(t * 2.2) });
    else if (st === 'stretch') POSE.stretch({ k: Math.round(Math.sin(Math.min(1, cat.t / 0.6) * Math.PI) * 2) });
    else {
      const blink = (t % 3.7) < 0.12 && st !== 'bat';
      POSE.sit({ look: st === 'groom' ? -1 : Math.round(clamp(cat.look, -1, 2)), blink: blink || st === 'groom', wide: st === 'alert' || st === 'bat',
        paw: st === 'bat' ? Math.sin(clamp(cat.t / 0.42, 0, 1) * Math.PI) : st === 'groom' ? 0.55 + Math.sin(t * 9) * 0.15 : 0,
        flick: Math.round(Math.sin(t * 1.7) * 0.8 + 0.4), tilt: st === 'groom' ? 0.6 : 0 });
    }
    CS.flush();
    const X = Math.round(cat.x), Y = Math.round(cat.y - lift), pr = paperize(CS, { yaw: cat.face < 0 ? 180 : 0 });
    sx.globalAlpha = 0.1; sx.fillStyle = '#000';
    sx.beginPath(); sx.ellipse(X, Math.round(cat.y) + 1, 11 * S * (st === 'pounce' ? 0.6 : 1), 2 * S, 0, 0, Math.PI * 2); sx.fill(); sx.globalAlpha = 1;
    if (pr) drawPaper(sx, pr, X, Y, S);
    else {
      sx.save(); sx.translate(X, Y); if (cat.face < 0) sx.scale(-1, 1);
      const ox = -14 * S, oy = -CS.h * S;
      sx.globalAlpha = 0.1; sx.drawImage(CS.sil, ox + S, oy + 2 * S, CS.w * S, CS.h * S);
      sx.globalAlpha = 1; sx.drawImage(CS.cv, ox, oy, CS.w * S, CS.h * S);
      sx.restore();
    }
    if (st === 'sleep' || st === 'full') {
      const k = (t * 0.45) % 1; sx.globalAlpha = Math.sin(k * Math.PI) * 0.8; sx.fillStyle = `rgb(${INK})`;
      const zx = X + 22 * cat.face + k * 14 * cat.face, zy = Y - 34 - k * 26;
      [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]].forEach(([a, b]) => sx.fillRect(Math.round(zx + a * 2), Math.round(zy + b * 2), 2, 2));
      sx.globalAlpha = 1;
    }
  }

  /* the toy: a bead at the pointer, a feather below, a string up to a wand */
  const FS = Sprite(7, 10);
  ['...q...', '..cqt..', '.ccqyt.', '.ccyytt', 'cccyytt', 'cc.yy.t', 'cc.yy.t', 'c..y..t', 'c..y...', '...y...'].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') FS.px(c, 9 - r, ch); }));
  const BS = Sprite(5, 5); ['.GGG.', 'GHGGG', 'GGGGG', 'GGGGG', '.GGG.'].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') BS.px(c, 4 - r, ch); }));
  const paintToy = () => { FS.clr(); ['...q...', '..cqt..', '.ccqyt.', '.ccyytt', 'cccyytt', 'cc.yy.t', 'cc.yy.t', 'c..y..t', 'c..y...', '...y...'].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') FS.px(c, 9 - r, ch); })); FS.flush(); BS.clr(); ['.GGG.', 'GHGGG', 'GGGGG', 'GGGGG', '.GGG.'].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') BS.px(c, 4 - r, ch); })); BS.flush(); };
  paintToy(); ctx.onTheme(() => { colours(); paintToy(); });
  const feather = { th: 0, w: 0, ox: 0, oy: 26, jingle: 0, wand: null, rope: [] };
  const RN = 10, RL = 19;
  function stepToy(t, dt) {
    const P = { x: ptr.x, y: ptr.y };
    if (!feather.wand) { feather.wand = { x: P.x + 70, y: P.y - 180 }; feather.rope = Array.from({ length: RN + 1 }, (_, i) => { const x = lerp(feather.wand.x, P.x, i / RN), y = lerp(feather.wand.y, P.y, i / RN); return { x, y, px: x, py: y }; }); }
    const W = feather.wand, k = Math.min(1, dt * 4);
    W.x = lerp(W.x, P.x + 70, k); W.y = lerp(W.y, P.y - 180, k);
    const L = 30, g = 1500, ax = clamp(ptr.ax, -40000, 40000) * (t - ptr.t < 0.05 ? 1 : 0);
    feather.w += (-(g / L) * Math.sin(feather.th) - (ax / L) * 0.02 * Math.cos(feather.th) - 4 * feather.w) * dt;
    feather.th = clamp(feather.th + feather.w * dt, -1.3, 1.3);
    const rp = feather.rope;
    for (let i = 1; i < RN; i++) { const p = rp[i], vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 900 * dt * dt; }
    rp[0].x = W.x; rp[0].y = W.y; rp[RN].x = P.x; rp[RN].y = P.y;
    for (let it = 0; it < 8; it++) for (let i = 0; i < RN; i++) {
      const a = rp[i], b = rp[i + 1], ddx = b.x - a.x, ddy = b.y - a.y, dd = Math.hypot(ddx, ddy) || 1, diff = (dd - RL) / dd * 0.5;
      if (i > 0) { a.x += ddx * diff; a.y += ddy * diff; }
      if (i + 1 < RN) { b.x -= ddx * diff; b.y -= ddy * diff; }
    }
    feather.jingle = Math.max(0, feather.jingle - dt * 3);
    feather.ox = Math.sin(feather.th) * 26; feather.oy = Math.cos(feather.th) * 26;
    toyAt = { x: P.x + feather.ox, y: P.y + feather.oy };
  }
  let overField = false, overCtl = null;
  ctx.on(window, 'pointerover', e => {
    const t = e.target; if (!t.closest) return;
    overField = !!t.closest('input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable]');
    const c = t.closest('a,button,[role="button"],summary,label');
    if (c && c !== overCtl) { feather.jingle = 1; feather.w += (Math.random() < 0.5 ? -1 : 1) * 5; }
    overCtl = c;
  }, { passive: true });
  function renderToy(t) {
    if (!ptr.in || !ptr.mouse || overField || !toyOn()) return;
    const P = { x: Math.round(ptr.x), y: Math.round(ptr.y) }, rp = feather.rope;
    sx.fillStyle = `rgb(${INK})`;
    for (let i = RN - 1; i >= 0; i--) {
      const a = rp[i], b = rp[i + 1], n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 2));
      sx.globalAlpha = Math.pow(i / RN, 1.6) * 0.75;
      for (let j = 0; j < n; j++) sx.fillRect(Math.round(lerp(a.x, b.x, j / n)) - 1, Math.round(lerp(a.y, b.y, j / n)) - 1, 2, 2);
    }
    sx.globalAlpha = 1;
    sx.save(); sx.translate(P.x, P.y + 4); sx.rotate(-feather.th + Math.sin(t * 40) * 0.12 * feather.jingle);
    const pf = paperize(FS, { id: 'feather', ax: 3, cell: 3, tilt: 10, depth: 0.7 });
    if (pf) drawPaper(sx, pf, 0, 30, 3);
    else { sx.globalAlpha = 0.12; sx.drawImage(FS.sil, -3.5 * 3 + 3, 6, 21, 30); sx.globalAlpha = 1; sx.drawImage(FS.cv, -3.5 * 3, 0, 21, 30); }
    sx.restore();
    const bs = 2 + feather.jingle * 0.8, pb = paperize(BS, { id: 'bead', ax: 2, cell: 3, extrude: 2, depth: 1, tilt: 18 });
    if (pb) drawPaper(sx, pb, P.x, P.y + 2.5 * bs, bs); else sx.drawImage(BS.cv, P.x - 2.5 * bs, P.y - 2.5 * bs, 5 * bs, 5 * bs);
  }

  /* touch: the cat runs to a tap. Keyboard: it walks over to the focus */
  ctx.on(window, 'pointerdown', e => {
    if (catHit(e.clientX, e.clientY) && !(e.target.closest && e.target.closest('a,button,input,textarea,select,label,summary,[contenteditable]'))) { boop(); return; }
    if (e.pointerType !== 'mouse') { if (box.cat) return; target = { x: e.clientX, y: e.clientY + 40 }; targetUntil = now() + 4; if (cat.st === 'sleep') set('stretch'); else if (cat.st !== 'run') set('alert'); return; }
    feather.w += (ptr.vx >= 0 ? 1 : -1) * 6; feather.jingle = 1;
    if (!box.cat && (cat.st === 'sit' || cat.st === 'bat') && Math.hypot(toyAt.x - cat.x, toyAt.y - cat.y) < 170) set('crouch');
  }, { passive: true });
  ctx.on(window, 'dblclick', e => {
    const el = e.target; if (!el.closest || el.closest('a,button,input,textarea,select,label,summary,[contenteditable],[role="button"],dialog,.ed')) return;
    // on a word, a double-click selects it: leave reading alone. Anywhere else it throws a treat
    const x = e.clientX, y = e.clientY, cp = doc.caretRangeFromPoint ? doc.caretRangeFromPoint(x, y) : doc.caretPositionFromPoint ? doc.caretPositionFromPoint(x, y) : null;
    const node = cp && (cp.startContainer || cp.offsetNode);
    if (node && node.nodeType === 3 && node.textContent.trim()) { const rg = doc.createRange(); rg.selectNodeContents(node); if ([...rg.getClientRects()].some(b => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)) return; }
    const sel = getSelection(); sel && sel.removeAllRanges();
    throwTreat(x, y);
  });
  ctx.on(window, 'focusin', e => {
    if (box.cat || now() - ptr.moved < 1.5) return;
    const r = e.target.getBoundingClientRect && e.target.getBoundingClientRect(); if (!r || !r.width) return;
    focusAt = now(); target = { x: r.left - 24, y: Math.min(innerHeight - 8, r.bottom + 6) }; targetUntil = now() + 6;
    if (cat.st === 'sleep') set('stretch'); else if (!['run', 'tobox', 'hop'].includes(cat.st)) set('alert');
  });

  /* ------------------------------------------------------------------ *
   * specimens on the Assets page: every plant, the box, the cat's poses
   * ------------------------------------------------------------------ */
  const specimens = [];
  function specimensMount() {
    doc.querySelectorAll('[data-pp-asset]').forEach(host => {
      const asset = LIB[host.dataset.ppAsset]; if (!asset) return;
      const c = doc.createElement('canvas'); c.className = 'pp-spec'; host.prepend(c); ctx.cleanup(() => c.remove());
      specimens.push({ host, c, m: eng.model(asset), seed: specimens.length, born: 0 });
    });
    doc.querySelectorAll('[data-pp-cat]').forEach(host => {
      const c = doc.createElement('canvas'); c.className = 'pp-spec pp-poses'; host.prepend(c); ctx.cleanup(() => c.remove());
      const poses = [['run', 0.25], ['sit', { look: 1 }], ['sit', { look: 2, wide: true, paw: 1 }], ['crouch', { wiggle: 1 }], ['pounce', { u: 0.5 }], ['sit', { blink: true, paw: 0.6, tilt: 0.6, look: -1 }], ['sleep', {}], ['stretch', { k: 2 }]];
      const draw = () => {
        const k = 3, W = 33 * k * 4, H = 27 * k * 2; c.width = W * DPR; c.height = H * DPR; c.style.width = '100%'; c.style.maxWidth = W + 'px';
        const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); x.imageSmoothingEnabled = false; x.clearRect(0, 0, W, H);
        poses.forEach(([n, a], i) => { CS.clr(); POSE[n](a); CS.flush(); const pr = paperize(CS, { id: 'spec', cell: k }), cx0 = (i % 4) * 33 * k, cy0 = Math.floor(i / 4) * 27 * k;
          if (pr) drawPaper(x, pr, cx0 + 14 * k, cy0 + 25 * k, k); else x.drawImage(CS.cv, cx0, cy0, 32 * k, 26 * k); });
      };
      draw(); ctx.onTheme(() => setTimeout(draw, 30));
    });
  }
  function stepSpecimens(t) {
    for (const s of specimens) {
      const r = s.host.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !r.width) continue;
      if (!s.born) s.born = t;
      const b = eng.bounds(s.m, 3), u = Math.min((r.width - 16) / b.w, (r.height - 40) / b.h);
      const w = Math.round(r.width * DPR), h = Math.round((r.height - 28) * DPR);
      if (s.c.width !== w || s.c.height !== h) { s.c.width = w; s.c.height = h; s.c.style.width = r.width + 'px'; s.c.style.height = (r.height - 28) + 'px'; }
      eng.draw(s.m, s.c.getContext('2d'), { u: u * DPR, w, h, base: ((r.height - 28 - b.h * u) / 2 + b.base * u) / u, prog: ctx.reduce() ? 1 : clamp((t - s.born) / 1.5, 0, 1), t, still: ctx.reduce(), yaw: -20 + (ctx.reduce() ? 0 : Math.sin(t * 0.4 + s.seed) * 25) });
    }
  }

  /* ------------------------------------------------------------------ *
   * wiring
   * ------------------------------------------------------------------ */
  ctx.on(window, 'resize', () => { fit(); items.forEach(size); track(true); });
  three().then(() => {
    if (!alive || !PP) return;
    try { eng = PP.create(window.THREE); } catch (e) { return; }
    ctx.cleanup(() => { try { eng.renderer.dispose(); eng.renderer.forceContextLoss(); } catch {} });
    spots().forEach(s => { const it = mount(s); if (it && s.box && !box.it) { it.box = true; bindBox(it); } else if (it && s.box) { it.el.remove(); items.splice(items.indexOf(it), 1); } });
    track(true);
    // the cat starts asleep beside the box
    const br0 = box.it && box.it.el.getBoundingClientRect();
    if (br0 && br0.width && box.it.shown) { cat.x = clamp(br0.left - 50, 40, innerWidth - 40); cat.y = innerHeight - 6; cat.face = 1; }
    specimensMount();
    if (ctx.reduce()) { items.forEach(it => draw(it, 0)); stepSpecimens(0); }
  }).catch(() => {});

  let last = 0;
  ctx.loop(t => {
    const dt = Math.min(0.05, last ? t - last : 0.016); last = t;
    if (target && (t > targetUntil || (ptr.mouse && t - ptr.moved < 0.3 && !target.force))) target = null;
    stepItems(t, dt);
    if (eng) stepSpecimens(t);
    sx.clearRect(0, 0, innerWidth, innerHeight);
    if (ptr.in && ptr.mouse) stepToy(t, dt);
    stepTreats(t, dt);
    stepCat(t, dt);
    renderTreats();
    renderCat(t);
    renderFx(t);
    renderToy(t);
  });

  /* a success grows a flower beside it; a small choice rustles the plants */
  return {
    celebrate(el) {
      if (!eng || ctx.reduce() || !el || !el.getBoundingClientRect) return;
      const r = el.getBoundingClientRect(), kind = ['daisy', 'tulip', 'poppy', 'rose'][Math.floor(Math.random() * 4)];
      const it = mount({ kind, U: 2.6, at: () => ({ x: r.right + 18, y: r.bottom, room: 999 }) }); if (!it) return;
      const x = r.right + 18 + scrollX, y = r.bottom + scrollY;
      it.spot.at = () => ({ x: x - scrollX, y: y - scrollY, room: 999 });
      it.vis = true; track(true);
      ctx.later(() => { it.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }); }, 2600);
      ctx.later(() => { it.el.remove(); items.splice(items.indexOf(it), 1); }, 3200);
    },
    nudge() { items.forEach(it => { if (it.vis && !it.box) it.v += (Math.random() - 0.5) * 3; }); feather.jingle = 1; },
  };
});
