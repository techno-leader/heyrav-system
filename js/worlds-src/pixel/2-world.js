/* Pixel world - a land under the page, and who lives in it.
   A pixel landscape sits behind everything: sun or moon, drifting clouds,
   two ranges of mountains, hills with trees, and a strip of ground with
   flowers, mushrooms, rocks and signs - drawn from the sprite library, at
   night in night colours. Juni, an explorer, walks the ground with a black
   cat a few steps behind; Juni has hints, the cat likes to be petted. Bonus
   blocks sit by page titles; coins hide under section headings for anyone
   who lingers. Nothing here is needed to use the system, and all of it
   stands still for reduced motion. */
window.heyravWorlds && heyravWorlds.define('pixel', ctx => {
  const doc = document, NAVY = '#14183d';

  /* ---------- the land ---------- */
  const SP = window.PixelSprites;
  const sky = ctx.layer('px-sky');
  const cv = doc.createElement('canvas'); sky.append(cv); const g2 = cv.getContext('2d');
  const land = doc.createElement('canvas'), lg = land.getContext('2d');
  let PX = 3, BW = 0, BH = 0; const GROUND = 16, STRIP = 8;
  const root = doc.documentElement, strip = doc.createElement('div'); strip.className = 'px-ground'; strip.setAttribute('aria-hidden', 'true');
  const sc = doc.createElement('canvas'), sg = sc.getContext('2d'); strip.append(sc); doc.body.append(strip);
  ctx.cleanup(() => { strip.remove(); root.style.removeProperty('--px-strip'); });
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clouds = [];
  function build() {
    PX = innerWidth < 700 ? 2 : 3;
    BW = Math.ceil(innerWidth / PX); BH = Math.ceil(innerHeight / PX);
    cv.width = land.width = BW; cv.height = land.height = BH;
    const d = ctx.dark(), r = rnd(1234 + location.pathname.length * 7), opt = { night: d }, gy = BH - GROUND;
    lg.clearRect(0, 0, BW, BH);
    const ridge = (base, amp, f1, f2, col, ph, cap) => {
      for (let x = 0; x < BW; x++) {
        const y = Math.round(base - amp * (.55 * Math.abs(Math.sin(x * f1 + ph)) + .45 * Math.abs(Math.sin(x * f2 + ph * 2))));
        lg.fillStyle = col; lg.fillRect(x, y, 1, BH - y);
        if (cap && y < base - amp * .78) { lg.fillStyle = cap; lg.fillRect(x, y, 1, Math.max(1, Math.round((base - amp * .78 - y) * .9))); }
      }
    };
    ridge(gy - 30, 50, .017, .043, d ? '#262e66' : '#c3e0f7', 1.3, d ? '#3a4380' : '#ffffff');
    ridge(gy - 16, 30, .027, .061, d ? '#1e2654' : '#9fcbee', 2.2);
    const hill = x => Math.round(gy - 9 - 8 * Math.sin(x * .021 + .5) - 4 * Math.sin(x * .053));
    for (let x = 0; x < BW; x++) { const y = hill(x); lg.fillStyle = d ? '#22433a' : '#7ed37f'; lg.fillRect(x, y, 1, BH - y); lg.fillStyle = d ? '#2c5548' : '#a8e69a'; lg.fillRect(x, y, 1, 1); }
    for (let x = 4; x < BW - 22; x += 16 + Math.floor(r() * 30)) { const k = r(), n = k < .35 ? 'tree' : k < .62 ? 'pine' : k < .85 ? 'bush' : 'bushDark', z = SP.size(n); SP.draw(lg, n, 0, x, hill(x + z.w / 2) - z.h + 4, 1, opt); }
    for (let x = -1; x < BW; x += 16) SP.draw(lg, 'ground', 0, x, gy - 1, 1, { ...opt, outline: false });
    for (let x = 10; x < BW - 20; x += 40 + Math.floor(r() * 60)) { const n = ['log', 'fence', 'sign', 'rock'][Math.floor(r() * 4)], z = SP.size(n); SP.draw(lg, n, 0, x, gy - z.h + 2, 1, opt); }
    /* the strip Juni walks on runs along the bottom of the content, in front */
    const side = doc.querySelector('.d-side'), sr = side && side.getBoundingClientRect();
    const left = sr && innerWidth > 900 && sr.right < innerWidth / 2 ? Math.round(sr.right) : 0, SW = Math.ceil((innerWidth - left) / PX), SH = STRIP + 7;
    strip.style.left = left + 'px'; strip.style.height = SH * PX + 'px'; sc.width = SW; sc.height = SH; sg.clearRect(0, 0, SW, SH);
    for (let x = -1; x < SW; x += 16) SP.draw(sg, 'ground', 0, x, 6, 1, { ...opt, outline: false });
    const low = ['daisy', 'blueFlower', 'pinkFlower', 'tuft', 'tuft', 'tuft', 'mushroom', 'redShroom', 'stone', 'daisy'];
    for (let x = 3; x < SW - 12; x += 8 + Math.floor(r() * 26)) { const n = low[Math.floor(r() * low.length)], z = SP.size(n); SP.draw(sg, n, 0, x, 8 - z.h + 1, 1, opt); }
    root.style.setProperty('--px-strip', SH * PX + 'px');
    if (BW > 260) { const ix = BW - 64, iy = Math.round(BH * .2); SP.draw(lg, 'island', 0, ix, iy, 1, opt); SP.draw(lg, 'pine', 0, ix + 20, iy - 24, 1, opt); SP.draw(lg, 'tuft', 0, ix + 6, iy - 3, 1, opt); }
    if (!clouds.length) for (let i = 0; i < 7; i++) clouds.push({ n: i % 3 ? 'cloudSmall' : 'cloud', x: r() * BW, y: 4 + r() * BH * .38, v: .6 + r() * 1.2 });
    paint(0);
  }
  function paint(dt) {
    const d = ctx.dark(); g2.clearRect(0, 0, BW, BH);
    if (d) { g2.fillStyle = '#fff'; const r = rnd(77); for (let i = 0; i < BW * BH / 900; i++) { const a = r(); g2.globalAlpha = .4 + a * .6; g2.fillRect(Math.floor(r() * BW), Math.floor(r() * BH * .6), 1, 1); } g2.globalAlpha = 1; }
    const sx = BW - 46, sy = 14;
    g2.fillStyle = d ? '#e9e6ff' : '#ffe27a'; g2.beginPath(); g2.arc(sx, sy, 7, 0, Math.PI * 2); g2.fill();
    if (d) { g2.fillStyle = '#c9c3f0'; g2.fillRect(sx - 3, sy - 2, 2, 2); g2.fillRect(sx + 2, sy + 2, 3, 2); }
    else { g2.fillStyle = '#ffd23f'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g2.fillRect(Math.round(sx + Math.cos(a) * 11), Math.round(sy + Math.sin(a) * 11), 2, 2); } }
    for (const c of clouds) { c.x += c.v * dt; const z = SP.size(c.n); if (c.x > BW + 4) c.x = -z.w - 4; SP.draw(g2, c.n, 0, Math.round(c.x), Math.round(c.y), 1, { night: d, outline: d ? '#2a3270' : '#9fcbee' }); }
    g2.drawImage(land, 0, 0);
  }
  build();
  ctx.onTheme(() => build());
  ctx.on(window, 'resize', () => { clearTimeout(build.t); build.t = setTimeout(build, 120); });

  /* ---------- coins and the score ---------- */
  const KEY = 'hr-px-coins';
  let coins = 0; try { coins = +localStorage.getItem(KEY) || 0; } catch {}
  let hud = null;
  const showHud = () => {
    if (!hud) { hud = doc.createElement('div'); hud.className = 'px-hud'; hud.setAttribute('aria-hidden', 'true'); hud.innerHTML = '<i></i><span></span>'; doc.body.append(hud); ctx.cleanup(() => hud && hud.remove()); }
    hud.querySelector('span').textContent = '×' + String(coins).padStart(2, '0');
    hud.classList.remove('ding'); void hud.offsetWidth; hud.classList.add('ding');
  };
  if (coins > 0) showHud();
  const coinAt = (x, y, n = 1) => {
    coins += n; try { localStorage.setItem(KEY, coins); } catch {}
    showHud(); ctx.announce(coins === 1 ? 'A coin! The score is in the corner now.' : coins + ' coins');
    if (ctx.reduce()) return;
    for (let i = 0; i < n; i++) {
      const c = doc.createElement('i'); c.className = 'px-coin'; c.style.left = x + (i - (n - 1) / 2) * 18 + 'px'; c.style.top = y + 'px'; doc.body.append(c);
      c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-56px)', offset: .45 }, { transform: 'translateY(-40px)', opacity: 1 }, { transform: 'translateY(-40px)', opacity: 0 }], { duration: 640 + i * 60, easing: 'steps(8,end)' }).onfinish = () => c.remove();
    }
    const p = doc.createElement('b'); p.className = 'px-plus'; p.textContent = '+' + n; p.style.left = x + 12 + 'px'; p.style.top = y - 30 + 'px'; doc.body.append(p);
    p.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-24px)', opacity: 0 }], { duration: 700, easing: 'steps(6,end)' }).onfinish = () => p.remove();
  };

  /* ---------- bonus blocks by the page title ---------- */
  const GEM = '<svg viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges"><path d="M3 1h6v2h2v2H9v2H7v2H5V7H3V5H1V3h2z"/></svg>';
  const host = doc.querySelector('.d-eyebrow') || doc.querySelector('.d-hero .in');
  if (host) {
    const b = doc.createElement('button'); b.type = 'button'; b.className = 'px-block'; b.setAttribute('aria-label', 'Bonus block'); b.innerHTML = GEM;
    let left = 3 + (location.pathname.length % 3);
    if (host.classList.contains('d-eyebrow')) b.style.marginLeft = 'auto';
    b.addEventListener('click', () => {
      if (!left) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); return; }
      const r = b.getBoundingClientRect(); left--;
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      coinAt(r.left + r.width / 2, r.top);
      if (!left) { b.classList.add('spent'); b.setAttribute('aria-label', 'Empty block'); }
    });
    host.append(b); ctx.cleanup(() => b.remove());
    /* bricks either side: a hit breaks one into four shards */
    [0, 1].forEach(i => {
      const k = doc.createElement('button'); k.type = 'button'; k.className = 'px-brick'; k.setAttribute('aria-label', 'Brick');
      k.addEventListener('click', () => {
        const r = k.getBoundingClientRect(); k.disabled = true; k.classList.add('broken');
        ctx.announce('The brick breaks.');
        if (!ctx.reduce()) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          const s = doc.createElement('i'); s.className = 'px-shard'; s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + r.height / 2 + 'px'; doc.body.append(s);
          s.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${sx * 30}px,${sy * 18 - 40}px) rotate(${sx * 90}deg)`, offset: .4 }, { transform: `translate(${sx * 52}px,${140}px) rotate(${sx * 220}deg)`, opacity: 0 }], { duration: 760, easing: 'steps(10,end)' }).onfinish = () => s.remove();
        });
      });
      i ? b.after(k) : b.before(k); ctx.cleanup(() => k.remove());
    });
    if (host.classList.contains('d-eyebrow')) { b.style.marginLeft = '4px'; b.previousElementSibling.style.marginLeft = 'auto'; }
  }

  /* ---------- coins hidden under section headings: linger to find one ---------- */
  const found = new Set();
  doc.querySelectorAll('.d-doc > h2, .d-doc section > h2').forEach(h => {
    let t = 0;
    const enter = () => { if (found.has(h)) return; t = setTimeout(() => { found.add(h); const r = h.getBoundingClientRect(); coinAt(Math.min(r.right + 18, r.left + h.scrollWidth + 18), r.top + r.height / 2); }, 900); };
    const leave = () => clearTimeout(t);
    ctx.on(h, 'pointerenter', enter); ctx.on(h, 'pointerleave', leave);
  });

  /* ---------- Juni and the cat ---------- */
  const SC = 3, foot = () => (STRIP - 2) * PX;
  const mk = (cls, label, w, h) => { const el = doc.createElement('button'); el.type = 'button'; el.className = cls; el.setAttribute('aria-label', label); const c = doc.createElement('canvas'); c.width = w; c.height = h; el.append(c); doc.body.append(el); ctx.cleanup(() => el.remove()); return [el, c.getContext('2d'), c]; };
  const kz = SP.size('kid'), cz = SP.size('cat');
  const [kid, kx] = mk('px-kid', 'Juni, an explorer with hints', kz.w, kz.h);
  const [cat, cx2] = mk('px-cat', 'The cat - pet it', cz.w, cz.h);
  const LINES = [
    'Blocks by the titles hide coins.', 'Linger on a heading. Sometimes there is a coin under it.',
    'Every text colour here clears 4.5:1. Even at night.', 'Night falls with the theme switch - the land changes too.',
    'The cat likes to be petted. Try it.', 'Every tree and flower out there is on the Assets page.',
    'Up, up, down, down, left, right, left, right, B, A.', 'Same components in every world. Only the rules of play change.',
  ];
  let line = 0, bubble = null, bubbleT = 0;
  const J = { x: 0, dir: 1, mode: 'walk', t: 0, f: 0, idle: 0, act: 0 }, C = { x: 0, dir: 1, f: 0, mode: 'walk', still: 0 };
  const speak = text => {
    if (!bubble) { bubble = doc.createElement('div'); bubble.className = 'px-say'; bubble.setAttribute('aria-hidden', 'true'); doc.body.append(bubble); ctx.cleanup(() => bubble && bubble.remove()); }
    bubble.textContent = text; bubble.style.left = Math.max(8, Math.min(innerWidth - 250, J.x - 4)) + 'px'; bubble.style.bottom = foot() + kz.h * SC + 12 + 'px'; bubble.hidden = false;
    ctx.announce(text); clearTimeout(bubbleT); bubbleT = setTimeout(() => { if (bubble) bubble.hidden = true; }, 3600);
  };
  const minX = () => (innerWidth > 900 ? 270 : 12), maxX = () => innerWidth - kz.w * SC - 8;
  J.x = minX() + 80; C.x = J.x - 60;
  const heart = () => { const r = cat.getBoundingClientRect(), h = doc.createElement('i'); h.className = 'px-heart'; h.style.left = r.left + r.width / 2 - 10 + 'px'; h.style.top = r.top - 8 + 'px'; h.style.backgroundImage = `url(${SP.canvas('heart', 0).toDataURL()})`; doc.body.append(h);
    if (ctx.reduce()) { setTimeout(() => h.remove(), 900); return; }
    h.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-36px)', opacity: 0 }], { duration: 900, easing: 'steps(9,end)' }).onfinish = () => h.remove(); };
  const jump = () => { J.mode = 'jump'; J.act = 5; };
  ctx.on(kid, 'pointerenter', () => { J.mode = 'wave'; J.act = 8; speak(LINES[line++ % LINES.length]); });
  ctx.on(kid, 'click', () => { jump(); const r = kid.getBoundingClientRect(); coinAt(r.left + r.width / 2, r.top); speak(LINES[line++ % LINES.length]); });
  ctx.on(kid, 'focus', () => speak(LINES[line % LINES.length]));
  ctx.on(cat, 'click', () => { C.mode = 'sit'; C.still = 30; heart(); ctx.announce('Purr.'); });
  function drawChars() {
    const fr = J.mode === 'walk' ? 2 + (J.f % 4) : J.mode === 'jump' ? 6 : J.mode === 'wave' ? (J.f % 2 ? 7 : 0) : J.mode === 'sleepy' ? 8 : (J.f % 24 === 0 ? 1 : 0);
    kx.clearRect(0, 0, kz.w, kz.h); SP.draw(kx, 'kid', fr, 0, 0, 1, { flip: J.dir < 0 && (J.mode === 'walk') });
    const cf = C.mode === 'walk' ? 1 + (C.f % 2) : C.mode === 'sit' ? 3 : C.mode === 'sleep' ? 4 : 0;
    cx2.clearRect(0, 0, cz.w, cz.h); SP.draw(cx2, 'cat', cf, 0, 0, 1, { flip: C.dir < 0 });
    const lift = J.mode === 'jump' ? [0, 10, 16, 16, 10, 0][5 - J.act] || 0 : 0;
    kid.style.transform = `translate(${Math.round(J.x)}px,${-lift}px)`; kid.style.bottom = foot() + 'px';
    cat.style.transform = `translateX(${Math.round(C.x)}px)`; cat.style.bottom = foot() + 'px';
  }
  /* they stroll in frames: Juni a few steps and a look around, the cat a little behind */
  let last = 0;
  ctx.loop((s, now) => {
    const dt = last ? Math.min(.25, (now - last) / 1000) : 0; if (now - last < 110) return; last = now;
    paint(dt * 8);
    J.f++; C.f++;
    if (J.act > 0) { J.act--; if (!J.act) J.mode = 'idle', J.idle = 10; }
    else if (J.mode === 'walk') {
      J.x += J.dir * 5;
      if (J.x > maxX() || J.x < minX() || Math.random() < .012) { if (J.x > maxX() || J.x < minX()) J.dir *= -1; J.mode = 'idle'; J.idle = 18 + Math.floor(Math.random() * 50); }
    } else if (J.mode === 'idle' || J.mode === 'sleepy') { if (--J.idle <= 0) { J.mode = 'walk'; if (Math.random() < .4) J.dir *= -1; } else if (J.idle > 40 && Math.random() < .02) J.mode = 'sleepy'; }
    J.x = Math.max(minX(), Math.min(maxX(), J.x));
    const want = J.x - J.dir * 58, dx = want - C.x;
    if (C.still > 0) C.still--;
    else if (Math.abs(dx) > 10) { C.mode = 'walk'; C.dir = Math.sign(dx); C.x += C.dir * Math.min(7, Math.abs(dx)); }
    else if (C.mode === 'walk') { C.mode = 'stand'; C.rest = 0; }
    else if (C.mode !== 'walk' && J.mode !== 'walk') { C.rest = (C.rest || 0) + 1; C.mode = C.rest > 60 ? 'sleep' : C.rest > 20 ? 'sit' : 'stand'; }
    drawChars();
  });
  drawChars();

  /* ---------- the Assets page: each sprite on show, animated where it moves ---------- */
  const specs = [...doc.querySelectorAll('[data-px-sprite]')].map(host => {
    const n = host.dataset.pxSprite; if (!SP.S[n]) return null;
    const c = doc.createElement('canvas'), z = SP.size(n), k = Math.max(2, Math.min(6, Math.floor(Math.min(110 / z.h, (host.clientWidth - 20) / z.w))));
    c.width = z.w; c.height = z.h; c.style.width = z.w * k + 'px'; c.style.height = z.h * k + 'px'; host.prepend(c); ctx.cleanup(() => c.remove());
    return { n, x: c.getContext('2d'), z, seq: n === 'kid' ? [0, 0, 1, 0, 2, 3, 4, 5, 2, 3, 4, 5, 7, 0, 7, 6, 0, 8] : n === 'cat' ? [0, 0, 1, 2, 1, 2, 3, 3, 4, 4] : n === 'coin' ? [0, 1, 2, 1] : [0] };
  }).filter(Boolean);
  const drawSpecs = i => specs.forEach(s => { s.x.clearRect(0, 0, s.z.w, s.z.h); SP.draw(s.x, s.n, s.seq[i % s.seq.length], 0, 0, 1, { night: ctx.dark() && !['kid', 'cat', 'coin', 'heart', 'star', 'gem', 'key', 'egg', 'qblock'].includes(s.n) }); });
  drawSpecs(0);
  if (specs.length) { let si = 0, st = 0; ctx.loop((s, now) => { if (now - st < 220) return; st = now; drawSpecs(++si); }); ctx.onTheme(() => drawSpecs(si)); }

  /* ---------- the code everyone knows ---------- */
  const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  ctx.on(doc, 'keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    pos = (e.key === CODE[pos] || e.key.toLowerCase() === CODE[pos]) ? pos + 1 : (e.key === CODE[0] ? 1 : 0);
    if (pos === CODE.length) { pos = 0; bonus(); }
  });
  function bonus() {
    ctx.announce('Bonus stage! Ten coins.');
    window.heyrav && heyrav.toast('BONUS STAGE  +10', { tone: 'ok' });
    coinAt(innerWidth / 2, innerHeight / 2, 10); jump();
    if (ctx.reduce()) return;
    for (let i = 0; i < 24; i++) {
      const s = doc.createElement('i'); s.className = 'px-star'; s.style.left = innerWidth / 2 + 'px'; s.style.top = innerHeight / 2 + 'px'; doc.body.append(s);
      const a = i / 24 * Math.PI * 2, d = 160 + Math.random() * 240;
      s.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(1)`, opacity: 0 }], { duration: 900, easing: 'steps(10,end)' }).onfinish = () => s.remove();
    }
  }

  /* ---------- toasts speak like a dialogue box: the words type out ---------- */
  const typer = new MutationObserver(list => {
    if (ctx.reduce()) return;
    for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('toast')) {
      const span = n.querySelector('span'); if (!span) continue;
      const len = span.textContent.length;
      span.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: Math.min(900, 30 * len), easing: `steps(${Math.max(1, len)},end)` });
    }
  });
  typer.observe(doc.body, { childList: true, subtree: true }); ctx.cleanup(() => typer.disconnect());

  /* a choice blips a pixel star out of the control */
  const blip = el => {
    const r = el.getBoundingClientRect(), s = doc.createElement('i'); s.className = 'px-star';
    s.style.left = r.left + Math.min(r.width, 40) / 2 + 'px'; s.style.top = r.top + 4 + 'px'; s.style.transform = 'scale(.5)'; doc.body.append(s);
    s.animate([{ transform: 'translateY(0) scale(.5)', opacity: 1 }, { transform: 'translateY(-26px) scale(.5)', opacity: 0 }], { duration: 420, easing: 'steps(6,end)' }).onfinish = () => s.remove();
  };
  return {
    nudge(el) { blip(el); },
    /* a success pays out */
    celebrate(el) { const r = el.getBoundingClientRect(); coinAt(r.left + r.width / 2, r.top, 1); jump(); },
  };
});
