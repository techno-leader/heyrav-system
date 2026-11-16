/* Pixel world - the landscape and what is hidden in it.
   A sky of pixel clouds (stars at night) over stepped hills. Bonus blocks
   sit by page titles; coins hide under section headings for anyone who
   lingers; Bit walks the bottom of the screen and knows a few things. The
   score shows only once the first coin is found. Nothing here is needed to
   use the system, and all of it stands still for reduced motion. */
window.heyravWorlds && heyravWorlds.define('pixel', ctx => {
  const doc = document, NAVY = '#14183d';
  const pix = (rows, map) => rows.flatMap((r, y) => [...r].map((c, x) => map[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${map[c]}"/>` : '')).join('');
  const shadow = (rows, s, map) => rows.flatMap((r, y) => [...r].map((c, x) => map[c] ? `${x * s}px ${y * s}px 0 ${map[c]}` : null)).filter(Boolean).join(',');

  /* ---------- the sky ---------- */
  const sky = ctx.layer('px-sky');
  const CLOUD = ['....XXXX....', '..XXXXXXXXX.', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', '.SSSSSSSSSS.'];
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const c = doc.createElement('i'); c.className = 'px-cloud';
    c.style.top = (3 + (i * 13) % 40) + 'vh'; c.style.animationDuration = (70 + i * 19) + 's'; c.style.animationDelay = -(i * 29) + 's';
    sky.append(c); return c;
  });
  const stars = doc.createElement('i'); stars.className = 'px-stars';
  stars.style.background = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='200' shape-rendering='crispEdges' fill='#fff'><rect x='22' y='31' width='3' height='3'/><rect x='131' y='12' width='3' height='3'/><rect x='201' y='77' width='3' height='3'/><rect x='64' y='120' width='3' height='3'/><rect x='170' y='160' width='3' height='3'/><rect x='101' y='71' width='2' height='2'/><rect x='12' y='176' width='2' height='2'/><rect x='226' y='140' width='2' height='2'/></svg>")}") 0 0/240px 200px`;
  const hills = doc.createElement('i'); hills.className = 'px-hills';
  sky.append(stars, hills);
  const hillSVG = (a, b) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='480' height='96' shape-rendering='crispEdges'><path fill='${a}' d='M0 96V56h24v-8h24v-8h48v8h24v8h24v8h24V48h24v-8h24v-8h48v8h24v8h24v16h24V40h24v-8h48v8h24v8h24v48z'/><path fill='${b}' d='M0 96V80h48v-8h48v8h96v-8h72v-8h48v8h72v8h96v16z'/></svg>`)}") 0 100%/480px 96px repeat-x`;
  const paint = () => {
    const d = ctx.dark();
    const m = d ? { X: '#2a3270', S: '#20285c' } : { X: '#ffffff', S: '#d7ecff' };
    clouds.forEach((c, i) => { c.style.boxShadow = shadow(CLOUD, i % 3 ? 8 : 6, m); });
    hills.style.background = d ? hillSVG('#1a2a5c', '#14214a') : hillSVG('#7ed37f', '#5bbf63');
  };
  paint(); ctx.onTheme(paint);

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

  /* ---------- Bit ---------- */
  const W = '#fff7e1', R = '#c73519', K = NAVY, G = '#ffd23f';
  const F1 = ['....KKKK....', '...KRRRRK...', '..KRRRRRRK..', '..KRWKRWKR..', '..KRRRRRRK..', '.KRRRRRRRRK.', '.KRRGGGGRRK.', '.KRRRRRRRRK.', '..KRRRRRRK..', '..KK....KK..', '.KK......KK.', '............'];
  const F2 = ['....KKKK....', '...KRRRRK...', '..KRRRRRRK..', '..KRWKRWKR..', '..KRRRRRRK..', '.KRRRRRRRRK.', '.KRRGGGGRRK.', '.KRRRRRRRRK.', '..KRRRRRRK..', '...KK..KK...', '...KK..KK...', '............'];
  const map = { K, R, W, G };
  const bit = doc.createElement('button'); bit.type = 'button'; bit.className = 'px-bit'; bit.setAttribute('aria-label', 'Bit, a small friend with hints');
  bit.innerHTML = `<svg class="f1" viewBox="0 0 12 12" aria-hidden="true">${pix(F1, map)}</svg><svg class="f2" viewBox="0 0 12 12" aria-hidden="true">${pix(F2, map)}</svg>`;
  doc.body.append(bit); ctx.cleanup(() => bit.remove());
  const LINES = [
    'Blocks by the titles hide coins.', 'Linger on a heading. Sometimes there is a coin under it.',
    'Every text colour here clears 4.5:1. Even at night.', 'Night falls with the theme switch.',
    'The pixels stop at the headings, so reading stays easy.', 'Tabs are folders in this world.',
    'Up, up, down, down, left, right, left, right, B, A.', 'Same components in every world. Only the rules of play change.',
  ];
  let line = 0, bubble = null, bubbleT = 0;
  const speak = text => {
    if (!bubble) { bubble = doc.createElement('div'); bubble.className = 'px-say'; bubble.setAttribute('aria-hidden', 'true'); doc.body.append(bubble); ctx.cleanup(() => bubble && bubble.remove()); }
    bubble.textContent = text; bubble.style.left = Math.max(8, Math.min(innerWidth - 250, x - 4)) + 'px'; bubble.hidden = false;
    ctx.announce(text); clearTimeout(bubbleT); bubbleT = setTimeout(() => { if (bubble) bubble.hidden = true; }, 3600);
  };
  const hop = () => { bit.classList.remove('hop'); void bit.offsetWidth; bit.classList.add('hop'); };
  let x = 0, dir = 1, walking = false, pause = 0;
  const minX = () => (innerWidth > 900 ? 270 : 12), maxX = () => innerWidth - 52;
  x = minX() + 40;
  const place = () => { bit.style.transform = `translateX(${x}px) scaleX(${dir})`; };
  place();
  ctx.on(bit, 'pointerenter', () => { hop(); speak(LINES[line++ % LINES.length]); });
  ctx.on(bit, 'click', () => { hop(); const r = bit.getBoundingClientRect(); coinAt(r.left + 18, r.top); speak(LINES[line++ % LINES.length]); });
  ctx.on(bit, 'focus', () => speak(LINES[line % LINES.length]));
  /* Bit strolls in frames: a few steps, a look around, back again */
  let last = 0;
  ctx.loop((s, now) => {
    if (now - last < 120) return; last = now;
    if (pause > 0) { pause--; if (!pause) { walking = true; bit.classList.add('walk'); } return; }
    if (!walking) { walking = true; bit.classList.add('walk'); }
    x += dir * 6;
    if (x > maxX() || x < minX() || Math.random() < .012) { if (x > maxX() || x < minX()) dir *= -1; walking = false; bit.classList.remove('walk'); pause = 18 + Math.floor(Math.random() * 40); }
    x = Math.max(minX(), Math.min(maxX(), x)); place();
  });

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
    coinAt(innerWidth / 2, innerHeight / 2, 10);
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
    celebrate(el) { const r = el.getBoundingClientRect(); coinAt(r.left + r.width / 2, r.top, 1); },
  };
});
