/* Symbiote world - the slime.
   One goo layer over the page (circles merged by an SVG blur + alpha
   threshold, lit by a specular pass). The pointer carries a small drop of
   it. Near anything that acts, the drop stretches a strand to it and sticks
   to its edge; pulled too far, the strand snaps and slides back. Over a
   button, drips hang from its underside. Left alone a while, slime creeps in
   from the corners; a press held on empty ground leaves a splat. A success
   is briefly wrapped. Pointer-driven parts are for fine pointers only; all of
   it stays away for reduced motion. */
window.heyravWorlds && heyravWorlds.define('symbiote', ctx => {
  const doc = document, NS = 'http://www.w3.org/2000/svg';
  if (ctx.reduce()) return {};
  const layer = ctx.layer('sy-slime', true);
  const svg = doc.createElementNS(NS, 'svg');
  svg.innerHTML = `<defs><filter id="sy-goo" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
    <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="g"/>
    <feGaussianBlur in="g" stdDeviation="2.4" result="gb"/>
    <feSpecularLighting in="gb" surfaceScale="5" specularConstant="1" specularExponent="26" lighting-color="#ffffff" result="s"><feDistantLight azimuth="235" elevation="52"/></feSpecularLighting>
    <feComposite in="s" in2="g" operator="in" result="si"/>
    <feComposite in="g" in2="si" operator="arithmetic" k1="0" k2="1" k3=".75" k4="0"/></filter></defs><g filter="url(#sy-goo)"></g>`;
  layer.append(svg);
  const g = svg.querySelector('g');
  const POOL = 64, beads = [];
  for (let i = 0; i < POOL; i++) { const c = doc.createElementNS(NS, 'circle'); c.setAttribute('r', 0); g.append(c); beads.push(c); }
  const paint = () => { g.setAttribute('fill', ctx.dark() ? '#e6e6ec' : '#0b0b0f'); };
  paint(); ctx.onTheme(paint);

  /* ---------- state ---------- */
  const fine = ctx.fine();
  let px = -999, py = -999, cx = -999, cy = -999, idleAt = performance.now();
  const REACH = 120, N = 10;
  const rope = Array.from({ length: N }, () => ({ x: 0, y: 0, ox: 0, oy: 0 }));
  let target = null, anchor = { x: 0, y: 0 }, snap = 0, snapFrom = null, ropeOn = false;
  const drips = [];                 /* {x, y, len, v} under a hovered button */
  let hovered = null, splats = [], wraps = [], creep = 0;
  const ACTS = '.btn,.case-link,.contact-actions a,.chip,a.card,.d-wcard,.tgl,.input,.txt,.sel,.seg button,.d-world,[role="tab"],.case-nav a,.morph-btn';
  let rects = [], rectsAt = 0;
  const measure = () => {
    rects = [...doc.querySelectorAll(ACTS)].map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(o => o.r.width && o.r.bottom > -50 && o.r.top < innerHeight + 50 && o.r.right > 0 && o.r.left < innerWidth && !o.el.closest('[hidden],dialog:not([open])'));
    rectsAt = performance.now();
  };
  const nearest = (x, y) => {
    if (performance.now() - rectsAt > 300) measure();
    let best = null, bd = REACH;
    for (const o of rects) {
      const r = o.r, nx = Math.max(r.left, Math.min(x, r.right)), ny = Math.max(r.top, Math.min(y, r.bottom));
      const d = Math.hypot(x - nx, y - ny);
      if (d < bd) { bd = d; best = { el: o.el, r, x: nx, y: ny, d, inside: d === 0 }; }
    }
    return best;
  };
  ctx.on(window, 'scroll', () => { rectsAt = 0; }, { passive: true, capture: true });
  ctx.on(window, 'resize', () => { rectsAt = 0; });
  if (fine) ctx.on(window, 'pointermove', e => { px = e.clientX; py = e.clientY; if (cx < -900) { cx = px; cy = py; } idleAt = performance.now(); creep = Math.min(creep, 0); }, { passive: true });
  ctx.on(window, 'pointerdown', () => { idleAt = performance.now(); }, { passive: true });
  ctx.on(window, 'keydown', () => { idleAt = performance.now(); });
  ctx.on(doc.documentElement, 'pointerleave', () => { px = py = -999; });

  /* ---------- a splat, where a press is held on empty ground ---------- */
  let hold = 0, hx = 0, hy = 0;
  ctx.on(doc, 'pointerdown', e => {
    if (e.button || (e.target.closest && e.target.closest('a,button,input,select,textarea,label,summary,[role],pre,.code'))) return;
    hx = e.clientX; hy = e.clientY;
    hold = setTimeout(() => {
      const t = performance.now();
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, d = Math.random() * 46; splats.push({ x: hx + Math.cos(a) * d, y: hy + Math.sin(a) * d, r: 8 + Math.random() * 16, t, life: 2600 + Math.random() * 1200, dx: Math.cos(a) * (10 + Math.random() * 24), dy: Math.sin(a) * (10 + Math.random() * 24) + 18 }); }
      ctx.announce('Splat.');
    }, 600);
  });
  ctx.on(doc, 'pointermove', e => { if (hold && Math.hypot(e.clientX - hx, e.clientY - hy) > 8) { clearTimeout(hold); hold = 0; } }, { passive: true });
  ctx.on(doc, 'pointerup', () => { clearTimeout(hold); hold = 0; });

  /* ---------- the frame ---------- */
  /* frames are collected first and written only when something moved, so a still page costs nothing */
  let used = 0, frame = [], lastFrame = '';
  const put = (x, y, r) => { if (used >= POOL || r < .5) return; used++; frame.push(x.toFixed(1), y.toFixed(1), r.toFixed(1)); };
  ctx.loop((t, now) => {
    used = 0; frame = [];
    const live = fine && px > -900;
    /* the drop on the pointer, a little behind it */
    if (live) { cx += (px - cx) * .32; cy += (py - cy) * .32; put(cx, cy, 6.5); }

    /* the strand */
    const hit = live ? nearest(px, py) : null;
    if (hit && !hit.inside) {
      if (!ropeOn || target !== hit.el) { rope.forEach((b, i) => { const k = i / (N - 1); b.x = b.ox = cx + (hit.x - cx) * k; b.y = b.oy = cy + (hit.y - cy) * k; }); }
      ropeOn = true; target = hit.el; anchor = { x: hit.x, y: hit.y }; snap = 0;
    } else if (ropeOn && (!hit || hit.inside)) {
      ropeOn = false; snap = now; snapFrom = rope.map(b => ({ x: b.x, y: b.y }));
    }
    if (ropeOn) {
      const dist = Math.hypot(anchor.x - cx, anchor.y - cy), seg = dist / (N - 1) * 1.06;
      for (const b of rope) { const vx = (b.x - b.ox) * .9, vy = (b.y - b.oy) * .9; b.ox = b.x; b.oy = b.y; b.x += vx; b.y += vy + .35; }
      for (let it = 0; it < 5; it++) {
        rope[0].x = cx; rope[0].y = cy; rope[N - 1].x = anchor.x; rope[N - 1].y = anchor.y;
        for (let i = 0; i < N - 1; i++) {
          const a = rope[i], b = rope[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - seg) / d * .5;
          if (i > 0) { a.x += dx * diff; a.y += dy * diff; } if (i + 1 < N - 1) { b.x -= dx * diff; b.y -= dy * diff; }
        }
      }
      const thin = 1 - Math.pow(dist / REACH, 2) * .55;
      rope.forEach((b, i) => { const k = i / (N - 1); put(b.x, b.y, (5.6 - Math.sin(k * Math.PI) * 2.8) * thin); });
      put(anchor.x, anchor.y, 8.5);
    } else if (snap) {
      /* snapped: what was stretched slides back to where it stuck */
      const k = Math.min(1, (now - snap) / 320), e = 1 - Math.pow(1 - k, 3);
      snapFrom.forEach((b, i) => { const j = i / (N - 1); put(b.x + (anchor.x - b.x) * e, b.y + (anchor.y - b.y) * e, (5 - Math.sin(j * Math.PI) * 2) * (1 - e * .9)); });
      put(anchor.x, anchor.y, 8.5 * (1 - e));
      if (k >= 1) snap = 0;
    }

    /* drips under a hovered button */
    const over = hit && hit.inside && /btn|case-link|chip|morph-btn/.test(hit.el.className) ? hit : null;
    if (over && hovered !== over.el) { hovered = over.el; drips.length = 0; [.24, .58, .82].forEach((f, i) => drips.push({ f, len: 0, v: 0, max: 8 + i * 5 + Math.random() * 6 })); }
    if (!over) hovered = null;
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i];
      if (hovered) { d.v += (d.max - d.len) * .06; d.v *= .82; d.len += d.v; } else { d.len *= .78; if (d.len < .5) { drips.splice(i, 1); continue; } }
      const r = hovered ? hovered.getBoundingClientRect() : null;
      if (!r) continue;
      const x = r.left + r.width * d.f, y = r.bottom - 2;
      put(x, y, 5); put(x, y + d.len * .55, 3.6); put(x, y + d.len, 4.4);
    }

    /* creeping in from the corners after a long stillness */
    const still = now - idleAt;
    creep += still > 25000 ? .0025 : -.02; creep = Math.max(0, Math.min(1, creep));
    if (creep > 0) {
      [[0, innerHeight, 1], [innerWidth, innerHeight, -1]].forEach(([x0, y0, s], k) => {
        for (let i = 0; i < 12; i++) {
          const j = i / 11 * creep;
          const x = x0 + s * (j * innerWidth * .22 + Math.sin(t * .7 + i * .6 + k) * 10 * j), y = y0 - j * innerHeight * .26 - Math.sin(j * 3 + t * .5) * 18;
          put(x, y, (16 - i) * (1 - j * .5) * Math.min(1, creep * 3));
        }
      });
    }

    /* splats and wraps */
    splats = splats.filter(s => now - s.t < s.life);
    for (const s of splats) { const k = (now - s.t) / s.life, e = 1 - Math.pow(1 - Math.min(1, k * 3), 3); put(s.x + s.dx * e, s.y + s.dy * e + k * 30, s.r * (1 - k * k)); }
    wraps = wraps.filter(w => now - w.t < 1300);
    for (const w of wraps) {
      const k = (now - w.t) / 1300, r = w.el.getBoundingClientRect(), env = Math.sin(Math.min(1, k) * Math.PI);
      for (let i = 0; i < 18; i++) {
        const u = i / 18, per = 2 * (r.width + r.height), p = (u + k * .2) * per % per;
        const x = p < r.width ? r.left + p : p < r.width + r.height ? r.right : p < 2 * r.width + r.height ? r.right - (p - r.width - r.height) : r.left;
        const y = p < r.width ? r.top : p < r.width + r.height ? r.top + (p - r.width) : p < 2 * r.width + r.height ? r.bottom : r.bottom - (p - 2 * r.width - r.height);
        put(x, y, 7 * env);
      }
    }
    const sig = frame.join(',');
    if (sig === lastFrame) return; lastFrame = sig;
    for (let i = 0; i < POOL; i++) { const c = beads[i]; if (i < used) { c.setAttribute('cx', frame[i * 3]); c.setAttribute('cy', frame[i * 3 + 1]); c.setAttribute('r', frame[i * 3 + 2]); } else if (c.getAttribute('r') !== '0') c.setAttribute('r', 0); }
  });

  return {
    /* a choice splashes */
    nudge(el) { const r = el.getBoundingClientRect(), x = r.left + Math.min(r.width, 44) / 2, y = r.top + r.height / 2, t = performance.now();
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; splats.push({ x, y, r: 4 + Math.random() * 5, t, life: 700, dx: Math.cos(a) * 22, dy: Math.sin(a) * 22 }); } },
    /* a success is wrapped, briefly, and let go */
    celebrate(el) { wraps.push({ el, t: performance.now() }); },
  };
});
