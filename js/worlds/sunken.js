/* Sunken world - under the water.
   Behind every page: the sea, drawn by a shader (light from the surface,
   shafts, caustics, drifting specks), and in front of it an illustrated sea
   floor - mossy rocks, staghorn and fan coral, brain coral, sponges,
   anemones and kelp - with fish, a school, a jellyfish and, in the deep, a
   whale. Lily pads float on the surface by day.
   Every creature and plant is painted once into a sprite - layered
   gradients, veins, scales, polyps, grain, light from above - and reused.
   Three places to dive have their own water: a whale overhead on the home
   page, a reef wall on the Worlds tour, a lily pond on the Assets page; each
   is a small wave simulation that refracts its scene. Move to stir it, press
   to drop a stone. The Assets page shows every sprite on its own tile.
   Reduced motion: still frames. */
window.heyravWorlds && heyravWorlds.define('sunken', ctx => {
  const doc = document, DPR = Math.min(1.5, devicePixelRatio || 1), TAU = Math.PI * 2;
  const dark = () => (ctx.dark() ? 1 : 0), rnd = s => () => (s = (s * 16807 + 11) % 2147483647) / 2147483647;
  const INK = '#173a2e';

  /* ---------- sprites: painted once, textured, tinted for the deep at night ---------- */
  const grainC = (() => { const c = doc.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), d = x.createImageData(96, 96), r = rnd(3);
    for (let i = 0; i < d.data.length; i += 4) { const v = r(), w = r() < .5; d.data[i] = d.data[i + 1] = d.data[i + 2] = w ? 255 : 0; d.data[i + 3] = v < .55 ? 0 : Math.round((v - .55) * 120); }
    x.putImageData(d, 0, 0); return c; })();
  const SPR = new Map();
  function spr(key, w, h, paint, o = {}) {
    const k = key + '|' + dark(); if (SPR.has(k)) return SPR.get(k);
    const S = 2, c = doc.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
    const g = c.getContext('2d'); g.scale(S, S); g.lineJoin = g.lineCap = 'round'; paint(g, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    const lit = g.createLinearGradient(0, 0, 0, c.height); lit.addColorStop(0, `rgba(255,255,235,${o.lit ?? .16})`); lit.addColorStop(.5, 'rgba(0,0,0,0)'); lit.addColorStop(1, `rgba(0,20,30,${o.shade ?? .22})`);
    g.fillStyle = lit; g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = o.grain ?? .9; g.fillStyle = g.createPattern(grainC, 'repeat'); g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1;
    if (dark()) { g.fillStyle = 'rgba(4,28,58,.42)'; g.fillRect(0, 0, c.width, c.height); }
    const out = { c, w, h }; SPR.set(k, out); return out;
  }
  function put(g, s, x, y, o = {}) {
    const { ax = .5, ay = .5, rot = 0, sc = 1, flip = 1, alpha = 1 } = o;
    g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot); g.scale(sc * flip, sc); g.drawImage(s.c, -s.w * ax, -s.h * ay, s.w, s.h); g.restore();
  }
  const lg = (g, x0, y0, x1, y1, ...stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
  const rg = (g, x, y, r0, r1, ...stops) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };

  /* lily pad: veins, a turned-up rim, blemishes */
  function padSpr(r, seed, under) {
    return spr(`pad${r}.${seed}.${under}`, r * 2 + 10, r * 2 + 10, (g, w) => {
      const q = rnd(seed), gap = .34; g.translate(w / 2, w / 2); g.rotate(q() * TAU);
      const P = new Path2D(); P.moveTo(0, 0); for (let k = 0; k <= 72; k++) { const a = gap / 2 + k / 72 * (TAU - gap), rad = r * (1 + Math.sin(a * 6 + seed) * .015); P.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } P.closePath();
      if (under) { g.fillStyle = 'rgba(18,52,30,.82)'; g.fill(P); g.strokeStyle = 'rgba(255,250,200,.55)'; g.lineWidth = 2.5; g.stroke(P); return; }
      g.fillStyle = rg(g, -r * .3, -r * .3, r * .08, r * 1.05, '#b9ea86', '#6dbb46', '#3f8a2b'); g.fill(P);
      g.save(); g.clip(P);
      g.strokeStyle = 'rgba(28,76,22,.5)'; g.lineWidth = r * .14; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      for (let k = 0; k < 15; k++) {
        const a = gap / 2 + (k + .5) / 15 * (TAU - gap), ex = Math.cos(a) * r, ey = Math.sin(a) * r;
        g.strokeStyle = 'rgba(222,255,178,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ex * .5 + Math.cos(a + 1.6) * 2.5, ey * .5 + Math.sin(a + 1.6) * 2.5, ex * .97, ey * .97); g.stroke();
        g.lineWidth = .7; g.strokeStyle = 'rgba(222,255,178,.32)';
        for (const f of [.4, .62, .82]) { const bx = ex * f, by = ey * f; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a + s * .6) * r * .16, by + Math.sin(a + s * .6) * r * .16); g.stroke(); } }
      }
      for (let k = 0; k < 9; k++) { const a = q() * TAU, d = r * (.5 + q() * .45); g.fillStyle = `rgba(${q() < .5 ? '176,150,58' : '120,86,38'},${.15 + q() * .22})`; g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 2 + q() * 6, 1.4 + q() * 3, q() * 3, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(240,255,210,.65)'; g.lineWidth = r * .07; g.beginPath(); g.arc(0, 0, r * .9, Math.PI * 1.02, Math.PI * 1.5); g.stroke();
      g.restore(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke(P);
      g.fillStyle = '#d9f4a8'; g.beginPath(); g.arc(0, 0, r * .05, 0, TAU); g.fill();
    }, { grain: .7 });
  }
  /* lotus: three rings of petals around a seed head */
  function lotusSpr(r) {
    return spr('lotus' + r, r * 2.2, r * 2.2, (g, w) => {
      g.translate(w / 2, w / 2);
      g.fillStyle = 'rgba(20,60,30,.3)'; g.beginPath(); g.ellipse(3, 5, r * .95, r * .85, 0, 0, TAU); g.fill();
      const petal = (L, W) => { const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(W, -L * .3, W * .7, -L * .85, 0, -L); p.bezierCurveTo(-W * .7, -L * .85, -W, -L * .3, 0, 0); return p; };
      [[10, r * .95, r * .3, 0, '#f2a3c2'], [8, r * .78, r * .28, .2, '#f7b6cf'], [6, r * .55, r * .24, .5, '#fbd2e2']].forEach(([n, L, W, off, tip]) => {
        for (let k = 0; k < n; k++) {
          g.save(); g.rotate(k / n * TAU + off); const P = petal(L, W);
          g.fillStyle = lg(g, 0, 0, 0, -L, '#fffaf5', '#fde6ef', tip); g.fill(P);
          g.strokeStyle = 'rgba(200,90,130,.35)'; g.lineWidth = .8; g.beginPath(); g.moveTo(0, -L * .1); g.lineTo(0, -L * .85); g.stroke();
          g.strokeStyle = 'rgba(140,50,90,.55)'; g.lineWidth = 1; g.stroke(P); g.restore();
        }
      });
      g.fillStyle = rg(g, -r * .05, -r * .05, 1, r * .2, '#fff3a0', '#f2c230', '#c98a10'); g.beginPath(); g.arc(0, 0, r * .19, 0, TAU); g.fill();
      g.fillStyle = '#a86a08'; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; g.beginPath(); g.arc(Math.cos(a) * r * .1, Math.sin(a) * r * .1, 1.1, 0, TAU); g.fill(); }
      g.strokeStyle = '#f0a020'; g.lineWidth = .9; for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2); g.lineTo(Math.cos(a) * r * .3, Math.sin(a) * r * .3); g.stroke(); g.fillStyle = '#ffe070'; g.beginPath(); g.arc(Math.cos(a) * r * .31, Math.sin(a) * r * .31, 1, 0, TAU); g.fill(); }
    }, { grain: .5, lit: .1, shade: .1 });
  }
  /* fish: four kinds, body and tail apart so the tail can beat */
  const FISH = {
    koi: { body: ['#fff8ee', '#f4e6d4'], patch: '#f0602a', fin: 'rgba(255,240,225,.75)', ray: 'rgba(240,96,42,.35)' },
    clown: { body: ['#ff9a3c', '#f06a1a'], band: '#ffffff', fin: 'rgba(255,140,60,.85)', ray: 'rgba(120,40,0,.35)' },
    tang: { body: ['#3f8ff0', '#1e5fc4'], stripe: '#14243a', fin: 'rgba(40,110,220,.8)', ray: 'rgba(10,30,70,.4)', tail: '#ffd23f' },
    gold: { body: ['#ffe066', '#f2b81a'], fin: 'rgba(255,215,80,.8)', ray: 'rgba(140,90,0,.35)' },
  };
  const KINDS = Object.keys(FISH);
  function fishSpr(kind) {
    const F = FISH[kind];
    const body = spr('fish' + kind, 64, 40, (g) => {
      g.translate(34, 20);
      const B = new Path2D(); B.moveTo(28, 0); B.bezierCurveTo(25, -11, 6, -15, -12, -9); B.quadraticCurveTo(-21, -4, -23, 0); B.quadraticCurveTo(-21, 4, -12, 9); B.bezierCurveTo(6, 15, 25, 11, 28, 0);
      const fin = (p) => { g.fillStyle = F.fin; g.fill(p); g.strokeStyle = F.ray; g.lineWidth = .7; g.stroke(p); g.strokeStyle = INK; g.lineWidth = 1.1; g.stroke(p); };
      const D = new Path2D(); D.moveTo(-10, -9); D.quadraticCurveTo(-2, -20, 12, -12); D.lineTo(8, -10); D.closePath(); fin(D);
      const A = new Path2D(); A.moveTo(-8, 8); A.quadraticCurveTo(-2, 16, 6, 11); A.closePath(); fin(A);
      g.fillStyle = lg(g, 0, -15, 0, 15, F.body[1], F.body[0], F.body[0], '#ffffff'); g.fill(B);
      g.save(); g.clip(B);
      if (kind === 'koi') { g.fillStyle = F.patch; for (const [x, y, rx, ry] of [[12, -6, 9, 6], [-6, -7, 7, 5], [-14, 3, 5, 4]]) { g.beginPath(); g.ellipse(x, y, rx, ry, .3, 0, TAU); g.fill(); } }
      if (kind === 'clown') for (const x of [12, -4, -17]) { g.fillStyle = INK; g.fillRect(x - 3.4, -16, 6.8, 32); g.fillStyle = F.band; g.fillRect(x - 2.4, -16, 4.8, 32); }
      if (kind === 'tang') { g.fillStyle = F.stripe; g.beginPath(); g.moveTo(14, -6); g.quadraticCurveTo(-2, -12, -16, -2); g.quadraticCurveTo(-4, -4, 12, -1); g.fill(); }
      g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = .7;
      for (let y = -12; y <= 12; y += 3.2) for (let x = -18 + ((y / 3.2) & 1) * 1.6; x < 20; x += 3.2) { g.beginPath(); g.arc(x, y, 1.8, -.9, .9); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(6, -7, 12, 2.4, -.08, 0, TAU); g.fill();
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(17, 0, 7, -1.1, 1.1); g.stroke();
      const PE = new Path2D(); PE.moveTo(10, 3); PE.quadraticCurveTo(4, 9, 0, 7); PE.quadraticCurveTo(5, 4, 10, 3); fin(PE);
      g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke(B);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(21, -2.5, 3.2, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = .8; g.stroke();
      g.fillStyle = '#10161c'; g.beginPath(); g.arc(21.8, -2.5, 1.9, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(22.4, -3.3, .7, 0, TAU); g.fill();
    }, { grain: .45, lit: .12, shade: .12 });
    const tail = spr('tail' + kind, 22, 30, (g) => {
      g.translate(20, 15); const T = new Path2D(); T.moveTo(0, -2); T.quadraticCurveTo(-10, -14, -19, -13); T.quadraticCurveTo(-13, 0, -19, 13); T.quadraticCurveTo(-10, 14, 0, 2); T.closePath();
      g.fillStyle = F.tail || F.fin; g.fill(T); g.strokeStyle = F.ray; g.lineWidth = .7; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(-17, k * 3.2); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(T);
    }, { grain: .4 });
    return { body, tail };
  }
  function fish(g, x, y, s, dir, t, kind) {
    const f = fishSpr(KINDS[kind % 4]); g.save(); g.translate(x, y); g.scale(dir * s, s);
    put(g, f.tail, -21, 0, { ax: .9, ay: .5, rot: Math.sin(t * 10) * .28 }); put(g, f.body, 0, 0, { ax: 34 / 64, ay: .5 }); g.restore();
  }
  /* humpback: mottled skin, barnacles, throat grooves, a long knobbed fin */
  function whaleSpr() {
    return spr('whale', 330, 140, (g) => {
      g.translate(170, 60);
      const B = new Path2D(); B.moveTo(140, 2); B.bezierCurveTo(138, -26, 90, -36, 20, -28); B.bezierCurveTo(-50, -20, -100, -8, -130, -2); B.lineTo(-158, -24); B.quadraticCurveTo(-150, 0, -164, 22); B.lineTo(-130, 6); B.bezierCurveTo(-92, 18, -40, 30, 30, 30); B.bezierCurveTo(92, 30, 136, 22, 140, 2); B.closePath();
      const F = new Path2D(); F.moveTo(52, 20); F.bezierCurveTo(40, 46, 14, 70, -14, 76); F.quadraticCurveTo(-6, 66, 0, 58); F.quadraticCurveTo(-4, 54, 6, 48); F.quadraticCurveTo(2, 44, 12, 40); F.quadraticCurveTo(10, 34, 22, 26); F.closePath();
      g.fillStyle = lg(g, 0, 20, 0, 80, '#36607e', '#cfe2ea'); g.fill(F); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(F);
      g.fillStyle = lg(g, 0, -36, 0, 30, '#0b2c48', '#1d4d70', '#5d8aa6'); g.fill(B);
      g.save(); g.clip(B); const q = rnd(9);
      for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(${q() < .5 ? '210,230,240' : '0,10,25'},${.06 + q() * .1})`; g.beginPath(); g.ellipse(-140 + q() * 280, -30 + q() * 60, 2 + q() * 9, 1.5 + q() * 5, q() * 3, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(220,235,245,.35)'; g.lineWidth = 1.1; for (let k = 0; k < 11; k++) { g.beginPath(); g.moveTo(130 - k * 4, 8 + k * 1.6); g.quadraticCurveTo(80, 22 + k * .8, 20 - k * 6, 26); g.stroke(); }
      for (let c = 0; c < 4; c++) { const bx = 96 + q() * 36, by = -20 + q() * 18; for (let k = 0; k < 7; k++) { g.fillStyle = q() < .5 ? '#d8d2c4' : '#a9a497'; g.beginPath(); g.arc(bx + (q() - .5) * 10, by + (q() - .5) * 8, 1.4 + q() * 1.8, 0, TAU); g.fill(); } }
      g.restore(); g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke(B);
      g.fillStyle = '#0a1622'; g.beginPath(); g.ellipse(104, -2, 2.6, 2, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(104.8, -2.8, .8, 0, TAU); g.fill();
    }, { grain: .5, lit: .14, shade: .2 });
  }
  /* corals, sponges, rocks */
  function branches(x, y, len, ang, w, r, d, out, spread) {
    if (d > 4 || len < 4) return; const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len; out.push([x, y, ex, ey, w, d]);
    branches(ex, ey, len * (.68 + r() * .12), ang - spread * (.7 + r() * .6), w * .72, r, d + 1, out, spread);
    branches(ex, ey, len * (.66 + r() * .12), ang + spread * (.7 + r() * .6), w * .72, r, d + 1, out, spread);
    if (r() < .3) branches(ex, ey, len * .6, ang + (r() - .5) * .3, w * .7, r, d + 1, out, spread);
  }
  const shadeOf = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  function stagSpr(col, seed) {
    return spr('stag' + col + seed, 96, 92, (g) => {
      const q = rnd(seed), o = []; for (let k = 0; k < 3; k++) branches(48 + (k - 1) * 9, 90, 20 + q() * 10, -Math.PI / 2 + (k - 1) * .35, 8, q, 0, o, .42);
      g.strokeStyle = INK; for (const [a, b, c, d, w] of o) { g.lineWidth = w + 3; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      for (const [a, b, c, d, w, dp] of o) { g.strokeStyle = lg(g, a, b, c, d, shadeOf(col, .78 + dp * .05), col, shadeOf(col, 1.12)); g.lineWidth = w; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.32)'; for (const [a, b, c, d, w] of o) if (w > 2.5) { g.lineWidth = w * .28; g.beginPath(); g.moveTo(a - w * .22, b); g.lineTo(c - w * .22, d); g.stroke(); }
      for (const [a, b, c, d, w] of o) { const n = Math.floor(Math.hypot(c - a, d - b) / 4); for (let k = 1; k < n; k++) { const t = k / n; g.fillStyle = 'rgba(255,240,220,.55)'; g.beginPath(); g.arc(a + (c - a) * t + (q() - .5) * w * .4, b + (d - b) * t, Math.max(.6, w * .14), 0, TAU); g.fill(); } }
      for (const [, , c, d, w, dp] of o) if (dp === 4 || w < 2) { g.fillStyle = shadeOf(col, 1.3); g.beginPath(); g.arc(c, d, Math.max(1.4, w * .6), 0, TAU); g.fill(); }
    }, { grain: .7 });
  }
  function fanSpr(col, seed) {
    return spr('fan' + col + seed, 100, 96, (g) => {
      const q = rnd(seed), o = []; branches(50, 94, 26, -Math.PI / 2, 4, q, 0, o, .62);
      const hull = new Path2D(); hull.moveTo(50, 94); for (let k = 0; k <= 20; k++) { const a = Math.PI + .25 + k / 20 * (Math.PI - .5); hull.lineTo(50 + Math.cos(a) * 46, 70 + Math.sin(a) * 66); } hull.closePath();
      g.save(); g.clip(hull); g.strokeStyle = shadeOf(col, 1.15); g.globalAlpha = .45; g.lineWidth = .7;
      for (let k = -100; k < 200; k += 4.5) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 96, 96); g.stroke(); g.beginPath(); g.moveTo(k + 96, 0); g.lineTo(k, 96); g.stroke(); }
      g.restore(); g.globalAlpha = 1;
      g.strokeStyle = INK; for (const [a, b, c, d, w] of o) { g.lineWidth = w + 2.4; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      g.strokeStyle = col; for (const [a, b, c, d, w] of o) { g.lineWidth = w; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      g.fillStyle = 'rgba(255,230,250,.6)'; for (const [, , c, d] of o) { g.beginPath(); g.arc(c, d, 1.1, 0, TAU); g.fill(); }
    }, { grain: .6 });
  }
  function brainSpr(col) {
    return spr('brain' + col, 70, 42, (g) => {
      const D = new Path2D(); D.ellipse(35, 40, 32, 34, 0, Math.PI, 0); D.closePath();
      g.fillStyle = rg(g, 24, 16, 2, 40, shadeOf(col, 1.35), col, shadeOf(col, .7)); g.fill(D);
      g.save(); g.clip(D); const q = rnd(5);
      for (let k = 0; k < 16; k++) { let x = q() * 70, y = 8 + q() * 32, a = q() * TAU; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 26; s++) { a += (q() - .5) * 1.4; x += Math.cos(a) * 2.2; y += Math.sin(a) * 2.2; g.lineTo(x, y); }
        g.strokeStyle = shadeOf(col, .55); g.lineWidth = 1.6; g.stroke(); g.strokeStyle = 'rgba(255,245,215,.45)'; g.lineWidth = .7; g.translate(-.8, -.8); g.stroke(); g.translate(.8, .8); }
      g.restore(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(D);
    }, { grain: .7 });
  }
  function spongeSpr(col, seed) {
    return spr('sponge' + col + seed, 56, 60, (g) => {
      const q = rnd(seed);
      for (let k = 0; k < 4; k++) {
        const h = 24 + q() * 28, w = 10, x = 10 + k * 11 + (q() - .5) * 3, y = 60 - h;
        const T = new Path2D(); T.roundRect(x - w / 2, y, w, h, [w / 2, w / 2, 2, 2]);
        g.fillStyle = lg(g, x - w / 2, 0, x + w / 2, 0, shadeOf(col, 1.2), col, shadeOf(col, .72)); g.fill(T);
        g.fillStyle = 'rgba(80,40,0,.35)'; for (let p = 0; p < 7; p++) { g.beginPath(); g.ellipse(x + (q() - .5) * w * .6, y + 8 + q() * (h - 10), .9, .7, 0, 0, TAU); g.fill(); }
        g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(T);
        g.fillStyle = shadeOf(col, 1.25); g.beginPath(); g.ellipse(x, y + 3, w * .5, 2.6, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = 'rgba(40,18,0,.75)'; g.beginPath(); g.ellipse(x, y + 3, w * .32, 1.6, 0, 0, TAU); g.fill();
      }
    }, { grain: .7 });
  }
  function rockSpr(w, h, seed) {
    return spr(`rock${w}.${h}.${seed}`, w + 8, h + 12, (g) => {
      const q = rnd(seed), pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + k / 12 * Math.PI; pts.push([w / 2 + 4 + Math.cos(a) * w / 2 * (.86 + q() * .16), h + 8 + Math.sin(a) * h * (.82 + q() * .2)]); }
      const R = new Path2D(); pts.forEach(([a, b], i) => i ? R.lineTo(a, b) : R.moveTo(a, b)); R.closePath();
      g.fillStyle = lg(g, 0, 8, 0, h + 8, '#b6ae9a', '#8e8672', '#5f5947'); g.fill(R);
      g.save(); g.clip(R);
      g.strokeStyle = 'rgba(40,34,24,.45)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { let x = 8 + q() * (w - 8), y = h * .4 + q() * h * .4; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 5; s++) { x += (q() - .5) * 8; y += 2 + q() * 3; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = 'rgba(255,255,240,.22)'; g.beginPath(); g.ellipse(w * .32, h * .55, w * .22, h * .14, -.3, 0, TAU); g.fill();
      const moss = ['#3f7d26', '#5c9e34', '#86c54d', '#a6d96a'];
      for (let k = 0; k < 90; k++) { const t = q(), [ax, ay] = pts[1 + Math.floor(t * 10)]; g.fillStyle = moss[Math.floor(q() * 4)]; g.beginPath(); g.arc(ax + (q() - .5) * 12, ay + q() * h * .28, 1.4 + q() * 2.6, 0, TAU); g.fill(); }
      g.restore(); g.strokeStyle = INK; g.lineWidth = 1.7; g.stroke(R);
    }, { grain: 1 });
  }
  function pebbleSpr(seed) {
    return spr('peb' + seed, 22, 16, (g) => {
      const q = rnd(seed), c = ['#c9bfa6', '#a39a86', '#d8cdb3', '#8f8a7c'][seed % 4];
      g.fillStyle = 'rgba(0,30,40,.25)'; g.beginPath(); g.ellipse(12, 10, 9, 5, 0, 0, TAU); g.fill();
      g.fillStyle = rg(g, 8, 5, 1, 11, shadeOf(c, 1.25), c, shadeOf(c, .7)); g.beginPath(); g.ellipse(11, 8, 8 + q() * 2, 5.5 + q(), q() - .5, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(40,40,30,.5)'; g.lineWidth = .8; g.stroke();
    }, { grain: 1 });
  }
  /* kelp: a textured blade with a float at its base, reused along a stipe */
  function bladeSpr(v) {
    return spr('blade' + v, 46, 16, (g) => {
      const L = new Path2D(); L.moveTo(6, 8); for (let x = 6; x <= 44; x += 2) L.lineTo(x, 8 - Math.sin((x - 6) / 38 * Math.PI) * 6.5 - Math.sin(x * 1.3 + v) * .9); for (let x = 44; x >= 6; x -= 2) L.lineTo(x, 8 + Math.sin((x - 6) / 38 * Math.PI) * 6.5 + Math.sin(x * 1.1 + v) * .9); L.closePath();
      g.fillStyle = lg(g, 6, 0, 44, 0, '#3f7a2a', '#6cae3c', '#b9dc6a'); g.fill(L);
      g.save(); g.clip(L); g.strokeStyle = 'rgba(30,70,20,.45)'; g.lineWidth = .9; g.beginPath(); g.moveTo(7, 8); g.lineTo(43, 8); g.stroke();
      g.lineWidth = .5; for (let x = 10; x < 42; x += 3) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 4, 2); g.moveTo(x, 8); g.lineTo(x + 4, 14); g.stroke(); }
      g.fillStyle = 'rgba(255,255,220,.25)'; g.beginPath(); g.ellipse(26, 5, 13, 1.6, 0, 0, TAU); g.fill(); g.restore();
      g.strokeStyle = INK; g.lineWidth = 1; g.stroke(L);
      g.fillStyle = rg(g, 4, 7, .5, 5, '#e2e88a', '#9cb43a', '#5f7a20'); g.beginPath(); g.arc(5, 8, 4, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = .9; g.stroke();
    }, { grain: .6, lit: .08 });
  }
  function kelp(g, x, y, h, t, ph, s = 1) {
    const pts = []; for (let k = 0; k <= 14; k++) pts.push([x + Math.sin(t * .8 + ph + k * .4) * k * 1.4 * s, y - h * k / 14]);
    g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 5.6 * s; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke();
    g.strokeStyle = lg(g, 0, y, 0, y - h, '#5a4a22', '#4f7a2a', '#7ab040'); g.lineWidth = 3.2 * s; g.stroke();
    pts.forEach(([a, b], k) => { if (!k) return; const side = k % 2 ? 1 : -1; put(g, bladeSpr(k % 3), a, b, { ax: .08, ay: .5, rot: -Math.PI / 2 + side * (.95 + Math.sin(t + k + ph) * .16), sc: s * (.75 + (k % 3) * .12), flip: 1 }); });
  }
  function anemone(g, x, y, s, t, col) {
    for (let k = 0; k < 13; k++) {
      const a = -Math.PI + (k + .5) / 13 * Math.PI, sw = Math.sin(t * 1.6 + k) * .25, L = (16 + (k % 3) * 4) * s, ex = x + Math.cos(a + sw) * L, ey = y - 6 * s + Math.sin(a + sw) * L, cx = x + Math.cos(a) * L * .5, cy = y - 6 * s + Math.sin(a) * L * .5 - 3;
      g.strokeStyle = INK; g.lineWidth = 5.4 * s; g.beginPath(); g.moveTo(x, y - 6 * s); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
      g.strokeStyle = lg(g, x, y, ex, ey, shadeOf(col, .7), col, shadeOf(col, 1.3)); g.lineWidth = 3.4 * s; g.stroke();
      g.fillStyle = '#fff0f6'; g.beginPath(); g.arc(ex, ey, 2 * s, 0, TAU); g.fill();
    }
    g.fillStyle = lg(g, x - 10 * s, 0, x + 10 * s, 0, shadeOf(col, .9), shadeOf(col, .6)); g.strokeStyle = INK; g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(x, y - 3 * s, 10 * s, 6 * s, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * 3 * s, y - 7 * s); g.lineTo(x + k * 3.6 * s, y); g.stroke(); }
  }
  function jellySpr() {
    return spr('jelly', 64, 40, (g) => {
      const B = new Path2D(); B.moveTo(4, 36); B.bezierCurveTo(4, 2, 60, 2, 60, 36); for (let x = 60; x >= 4; x -= 4) B.quadraticCurveTo(x - 2, 40, x - 4, 36); B.closePath();
      g.fillStyle = rg(g, 26, 14, 2, 34, 'rgba(255,240,250,.85)', 'rgba(248,170,215,.6)', 'rgba(170,110,220,.45)'); g.fill(B);
      g.strokeStyle = 'rgba(160,80,150,.6)'; g.lineWidth = 1.3; for (const cx of [20, 28, 36, 44]) { g.beginPath(); g.ellipse(cx, 22, 3.4, 5, 0, 0, TAU); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(22, 12, 10, 3, -.4, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(120,60,130,.7)'; g.lineWidth = 1.2; g.stroke(B);
    }, { grain: .3, lit: .05, shade: .05 });
  }
  function jelly(g, x, y, s, t) {
    const p = .5 + .5 * Math.sin(t * 2.4);
    g.strokeStyle = 'rgba(240,170,220,.55)'; g.lineWidth = 1.2; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(x + k * 6 * s, y + 4 * s); for (let q = 1; q < 9; q++) g.lineTo(x + k * 6 * s + Math.sin(t * 2 + q * .8 + k) * 3, y + 4 * s + q * 9 * s); g.stroke(); }
    g.fillStyle = 'rgba(250,190,230,.45)'; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(x + k * 5 * s, y + 4 * s); for (let q = 0; q <= 8; q++) g.lineTo(x + k * 5 * s + Math.sin(t * 1.6 + q * .7 + k) * 6 * s, y + 4 * s + q * 7 * s); for (let q = 8; q >= 0; q--) g.lineTo(x + k * 5 * s + 4 * s + Math.sin(t * 1.6 + q * .7 + k) * 6 * s, y + 4 * s + q * 7 * s); g.fill(); }
    put(g, jellySpr(), x, y, { ax: .5, ay: .85, sc: s * (1 + p * .08) });
  }
  const C = () => dark() ? { coral: ['#c4506a', '#d0723f', '#c49a3c', '#a557a8'], fan: '#6a52b8', brain: '#b9873c', tube: '#c8a840', anem: '#e07aa8', sand: '#1d3a4e', sand2: '#152d3e' }
    : { coral: ['#e8483a', '#f78a3d', '#f2b84a', '#e05a8a'], fan: '#7a5bc4', brain: '#e9a24a', tube: '#f2c94c', anem: '#ff8fb1', sand: '#ecdcaa', sand2: '#cdb982' };

  /* a stretch of reef, drawn once */
  function reef(g, x0, x1, base, s, seed) {
    const P = C(), q = rnd(seed);
    g.fillStyle = lg(g, 0, base - 10, 0, base + 60, P.sand, P.sand2); g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, base + 80); for (let x = x0; x <= x1; x += 18) g.lineTo(x, base + 6 * Math.sin(x * .013) + 4 * Math.sin(x * .031)); g.lineTo(x1, base + 80); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(120,100,60,.35)'; g.lineWidth = 1.2; for (let x = x0 + 10; x < x1; x += 22) { g.beginPath(); g.moveTo(x, base + 14 + (x % 3)); g.quadraticCurveTo(x + 6, base + 10, x + 12, base + 14); g.stroke(); }
    for (let x = x0 + 14; x < x1; x += 30 + q() * 60) put(g, pebbleSpr(Math.floor(q() * 8)), x, base + 10 + q() * 12, { sc: s * (.7 + q() * .5) });
    for (let x = x0 + 20; x < x1 - 10; x += (80 + q() * 90) * s) {
      const k = q(), rw = Math.round((50 + q() * 50) * s), rh = Math.round((24 + q() * 24) * s);
      put(g, rockSpr(rw, rh, Math.floor(q() * 999)), x, base + 6, { ax: .5, ay: 1 });
      const cx = x + (q() - .5) * 34 * s;
      if (k < .3) put(g, stagSpr(P.coral[Math.floor(q() * 4)], Math.floor(q() * 9)), cx, base + 2, { ax: .5, ay: 1, sc: s });
      else if (k < .5) put(g, fanSpr(P.fan, Math.floor(q() * 9)), cx, base + 2, { ax: .5, ay: 1, sc: s * .9 });
      else if (k < .68) put(g, brainSpr(P.brain), cx, base + 4, { ax: .5, ay: 1, sc: s });
      else if (k < .84) put(g, spongeSpr(P.tube, Math.floor(q() * 9)), cx, base + 4, { ax: .5, ay: 1, sc: s });
    }
  }

  /* ---------- the sea: a shader behind everything ---------- */
  const COMMON = `precision highp float;
    float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    vec2 h2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
    float cell(vec2 p,float t){vec2 i=floor(p),f=fract(p);float a=8.,b=8.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=.5+.45*sin(t+6.2831*h2(i+g));vec2 r=g+o-f;float d=dot(r,r);if(d<a){b=a;a=d;}else if(d<b)b=d;}return sqrt(b)-sqrt(a);}
    float caustic(vec2 p,float t){return pow(1.-smoothstep(0.,.11,cell(p,t)),2.)*.7+pow(1.-smoothstep(0.,.09,cell(p*1.7+3.1,t*1.3)),2.)*.45;}`;
  function program(cv, fs) {
    const g = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false }); if (!g) return null;
    const sh = (t, s) => { const o = g.createShader(t); g.shaderSource(o, s); g.compileShader(o); return o; };
    const p = g.createProgram(); g.attachShader(p, sh(g.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}')); g.attachShader(p, sh(g.FRAGMENT_SHADER, COMMON + fs)); g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) { console.warn(g.getProgramInfoLog(p)); return null; }
    g.useProgram(p); g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    const loc = g.getAttribLocation(p, 'p'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
    const U = {}; ctx.cleanup(() => { const e = g.getExtension('WEBGL_lose_context'); e && e.loseContext(); });
    return { g, u: n => (n in U ? U[n] : (U[n] = g.getUniformLocation(p, n))), draw() { g.viewport(0, 0, cv.width, cv.height); g.drawArrays(g.TRIANGLES, 0, 3); } };
  }
  const seaL = ctx.layer('sk-sea'), seaC = doc.createElement('canvas'); seaL.append(seaC);
  const sea = program(seaC, `uniform vec2 R,M;uniform float T,D;
    void main(){vec2 uv=gl_FragCoord.xy/R;float y=uv.y;
      vec3 top=D>.5?vec3(.05,.3,.48):vec3(.62,.93,.92),bot=D>.5?vec3(.01,.06,.14):vec3(.16,.62,.7);
      vec3 c=mix(bot,top,pow(y,1.15));
      c+=(D>.5?vec3(.1,.3,.4):vec3(.4,.4,.25))*exp(-pow((uv.x-.62)*2.2,2.)-pow((1.-y)*3.,2.))*.6;
      float a=uv.x-.62+(1.-y)*.4;c+=(.5+.5*sin(a*14.+T*.25+sin(a*6.+T*.15)*2.))*(.5+.5*sin(a*39.-T*.21))*smoothstep(.1,1.,y)*(D>.5?.07:.13);
      c+=vec3(.8,1.,1.)*caustic(gl_FragCoord.xy/R.y*5.+vec2(T*.03,0.),T*.6)*(D>.5?.06:.13)*(.3+.7*y);
      vec2 m=(gl_FragCoord.xy-M)/R.y;c+=(D>.5?vec3(.05,.22,.3):vec3(.1,.16,.12))*exp(-dot(m,m)*10.)*.7;
      vec2 g=gl_FragCoord.xy/R.y*90.+vec2(0.,T*1.2);if(h1(floor(g))>.997){c+=(D>.5?.4:.22)*smoothstep(.3,0.,length(fract(g)-.5));}
      gl_FragColor=vec4(c,1.);}`);

  /* ---------- the illustrated sea floor and who swims by ---------- */
  const lifeL = ctx.layer('sk-life'), lifeC = doc.createElement('canvas'); lifeL.append(lifeC);
  const lx = lifeC.getContext('2d'), floorC = doc.createElement('canvas'), fx = floorC.getContext('2d');
  let W = 0, H = 0, kelps = [], anems = [], pads = [], fishes = [], school = [], jellyO = null, whaleO = null, bubbles = [], nextFish = 2, nextJelly = 16, nextWhale = 6;
  function build() {
    W = innerWidth; H = innerHeight;
    for (const c of [lifeC, floorC]) { c.width = W * DPR; c.height = H * DPR; } seaC.width = Math.round(W * .5); seaC.height = Math.round(H * .5);
    const r = rnd(41), P = C();
    fx.setTransform(DPR, 0, 0, DPR, 0, 0); fx.clearRect(0, 0, W, H); reef(fx, -20, W + 20, H - 46, W < 700 ? .8 : 1, 7);
    kelps = []; for (const [a, b] of [[0, W * .18], [W * .82, W]]) for (let x = a + 10; x < b; x += 26 + r() * 30) kelps.push({ x, h: H * (.3 + r() * .3), ph: r() * 6, s: .9 + r() * .3 });
    anems = []; for (let x = 60; x < W; x += 180 + r() * 240) anems.push({ x, s: .9 + r() * .4, col: r() < .5 ? P.anem : P.coral[3] });
    pads = []; for (let x = 20; x < W; x += 120 + r() * 200) pads.push({ x, y: 10 + r() * 30, r: 26 + Math.round(r() * 4) * 5, seed: Math.floor(r() * 5), v: (r() - .5) * 4 });
  }
  function paintLife(t, dt) {
    lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lifeC.width, lifeC.height); lx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!dark()) for (const p of pads) { p.x += p.v * dt; if (p.x > W + 60) p.x = -60; if (p.x < -60) p.x = W + 60; put(lx, padSpr(p.r, p.seed, true), p.x, p.y, { rot: Math.sin(t * .2 + p.x) * .05 }); }
    if (whaleO) { whaleO.x += whaleO.d * 22 * dt; put(lx, whaleSpr(), whaleO.x, whaleO.y, { sc: whaleO.s, flip: whaleO.d, rot: Math.sin(t * .5) * .03, alpha: dark() ? .6 : .32 }); if (whaleO.x < -400 || whaleO.x > W + 400) whaleO = null; }
    lx.fillStyle = dark() ? 'rgba(140,200,230,.6)' : 'rgba(20,70,100,.5)';
    for (const s of school) { s.x += s.v * dt; s.a += dt; const yy = s.y + Math.sin(s.a * 2 + s.o) * 10, d = Math.sign(s.v); lx.beginPath(); lx.ellipse(s.x, yy, 4, 1.8, 0, 0, TAU); lx.fill(); lx.beginPath(); lx.moveTo(s.x - d * 3, yy); lx.lineTo(s.x - d * 7, yy - 2.5); lx.lineTo(s.x - d * 7, yy + 2.5); lx.fill(); }
    school = school.filter(s => s.x > -60 && s.x < W + 60);
    for (const k of kelps) kelp(lx, k.x, H - 40, k.h, t, k.ph, k.s);
    lx.drawImage(floorC, 0, 0, W, H);
    for (const a of anems) anemone(lx, a.x, H - 42, a.s, t + a.x, a.col);
    fishes = fishes.filter(f => f.x > -60 && f.x < W + 60);
    for (const f of fishes) { f.x += f.v * dt; fish(lx, f.x, f.y + Math.sin(t * 1.5 + f.ph) * 6, f.s, Math.sign(f.v), t + f.ph, f.k); }
    if (jellyO) { jellyO.y -= 16 * dt; jellyO.x += Math.sin(t * .6) * 6 * dt; jelly(lx, jellyO.x, jellyO.y, 1, t); if (jellyO.y < -120) jellyO = null; }
    bubbles = bubbles.filter(b => b.y > -10);
    for (const b of bubbles) { b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.ph) * .4; bubble(lx, b.x, b.y, b.r); }
  }
  function bubble(g, x, y, r) {
    g.fillStyle = rg(g, x - r * .3, y - r * .3, r * .1, r, 'rgba(255,255,255,.7)', 'rgba(200,245,250,.15)', 'rgba(160,230,240,.35)'); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = dark() ? 'rgba(200,240,250,.6)' : 'rgba(255,255,255,.9)'; g.lineWidth = 1.1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x - r * .35, y - r * .35, r * .22, 0, TAU); g.fill();
  }
  let mx = innerWidth / 2, my = innerHeight / 2;
  ctx.on(window, 'pointermove', e => { mx = e.clientX; my = e.clientY; if (Math.random() < .07 && bubbles.length < 60) bubbles.push({ x: mx, y: my, r: 2 + Math.random() * 4, v: 30 + Math.random() * 40, ph: Math.random() * 6 }); }, { passive: true });

  /* ---------- places to dive: a scene, refracted by a little sea ---------- */
  const DIVE = `uniform sampler2D S,F;uniform vec2 R,G;uniform float T,D;
    float hf(vec2 p){return texture2D(F,p).r-.5;}
    void main(){vec2 uv=gl_FragCoord.xy/R,e=1./G;
      vec2 n=vec2(hf(uv+vec2(e.x,0.))-hf(uv-vec2(e.x,0.)),hf(uv+vec2(0.,e.y))-hf(uv-vec2(0.,e.y)));
      vec3 c=texture2D(S,uv+n*.09).rgb;
      c+=pow(max(0.,dot(normalize(vec3(-n*7.,1.)),normalize(vec3(-.4,.6,1.)))),60.)*.5;
      c+=vec3(.8,1.,1.)*caustic(gl_FragCoord.xy/R.y*4.+n*4.,T*.5)*(D>.5?.04:.08)*(.4+.6*uv.y);
      gl_FragColor=vec4(c,1.);}`;
  const dives = [];
  function dive(el, kind) {
    if (!el || el.querySelector(':scope > .sk-dive')) return;
    el.setAttribute('data-dive', kind); const c = doc.createElement('canvas'); c.className = 'sk-dive'; c.setAttribute('aria-hidden', 'true'); el.prepend(c);
    const p = program(c, DIVE); if (!p) { c.remove(); el.removeAttribute('data-dive'); return; }
    const g = p.g, mk = () => { const t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); for (const [k, v] of [[g.TEXTURE_MIN_FILTER, g.LINEAR], [g.TEXTURE_MAG_FILTER, g.LINEAR], [g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE]]) g.texParameteri(g.TEXTURE_2D, k, v); return t; };
    const d = { el, kind, c, p, tS: mk(), tF: mk(), scene: doc.createElement('canvas'), stat: doc.createElement('canvas'), gw: 120, gh: 60, a: null, b: null, bytes: null, vis: false, seed: dives.length * 13 + 5, fish: [] };
    if (kind === 'pond') { const o = doc.createElement('canvas'); o.className = 'sk-over'; o.setAttribute('aria-hidden', 'true'); c.after(o); d.over = o; }
    const cell = e => { const r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * d.gw), Math.floor((e.clientY - r.top) / r.height * d.gh)]; };
    d.poke = (x, y, rad, v) => { if (!d.a) return; for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) { const X = x + i, Y = y + j; if (X > 0 && Y > 0 && X < d.gw - 1 && Y < d.gh - 1 && i * i + j * j <= rad * rad) d.a[Y * d.gw + X] += v; } };
    ctx.on(el, 'pointermove', e => { const [x, y] = cell(e); d.poke(x, y, 1, .5); });
    ctx.on(el, 'pointerdown', e => { const [x, y] = cell(e); d.poke(x, y, 3, 3); });
    ctx.cleanup(() => { c.remove(); d.over && d.over.remove(); el.removeAttribute('data-dive'); });
    io.observe(el); dives.push(d);
  }
  const io = new IntersectionObserver(es => es.forEach(e => { const d = dives.find(x => x.el === e.target); if (d) d.vis = e.isIntersecting; }));
  ctx.cleanup(() => io.disconnect());
  function sizeDive(d) {
    const r = d.el.getBoundingClientRect(), w = Math.max(40, Math.round(r.width * .8)), h = Math.max(30, Math.round(r.height * .8));
    if (d.c.width === w && d.c.height === h && d.theme === dark()) return;
    d.theme = dark(); d.c.width = d.scene.width = d.stat.width = w; d.c.height = d.scene.height = d.stat.height = h;
    if (d.over) { d.over.width = Math.round(r.width * DPR); d.over.height = Math.round(r.height * DPR); }
    d.gw = 120; d.gh = Math.max(20, Math.round(120 * h / w)); d.a = new Float32Array(d.gw * d.gh); d.b = new Float32Array(d.gw * d.gh); d.bytes = new Uint8Array(d.gw * d.gh);
    const g = d.stat.getContext('2d'), P = C(), q = rnd(d.seed), sc = w / r.width; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.lineJoin = g.lineCap = 'round';
    if (d.kind === 'pond') {
      g.fillStyle = rg(g, w * .5, h * .5, 10, Math.max(w, h) * .75, dark() ? '#0f557a' : '#48d0d8', dark() ? '#073550' : '#1c9fb4', dark() ? '#031a30' : '#0b6f8c'); g.fillRect(0, 0, w, h);
      g.save(); g.globalAlpha = .5; g.fillStyle = g.createPattern(grainC, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
      for (let k = 0; k < 14; k++) { const x = q() * w, y = q() * h; g.fillStyle = `rgba(${dark() ? '20,60,80' : '210,200,150'},.3)`; g.beginPath(); g.ellipse(x, y, 30 + q() * 50, 16 + q() * 26, q() * 3, 0, TAU); g.fill(); }
      for (let k = 0; k < 70; k++) put(g, pebbleSpr(Math.floor(q() * 8)), q() * w, q() * h, { sc: sc * (.6 + q() * .9), rot: q() * TAU, alpha: .85 });
      for (let k = 0; k < 10; k++) { const x = q() * w, y = q() * h, a = q() * TAU; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = q() < .5 ? 'rgba(150,100,40,.55)' : 'rgba(110,80,30,.5)'; g.beginPath(); g.ellipse(0, 0, 10 * sc, 4 * sc, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(70,40,10,.5)'; g.lineWidth = .8; g.beginPath(); g.moveTo(-9 * sc, 0); g.lineTo(9 * sc, 0); g.stroke(); g.restore(); }
      for (const side of [0, 1]) for (let k = 0; k < 18; k++) { const x = side ? w - q() * w * .12 : q() * w * .12, y0 = h + 4, L = 40 + q() * 90; g.strokeStyle = q() < .5 ? 'rgba(70,140,60,.7)' : 'rgba(110,170,70,.6)'; g.lineWidth = 2.5 * sc; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + (q() - .5) * 30, y0 - L * .5, x + (q() - .5) * 40, y0 - L); g.stroke(); }
      d.pads = []; for (let k = 0; k < 10; k++) d.pads.push({ x: .05 + q() * .9, y: .08 + q() * .84, r: 24 + Math.round(q() * 5) * 5, seed: k, fl: q() < .3 });
      d.fish = []; for (let k = 0; k < 5; k++) d.fish.push({ x: q() * w, y: h * (.15 + q() * .7), v: (q() < .5 ? -1 : 1) * (12 + q() * 14), k: k % 2 ? 0 : 3 });
    } else {
      g.fillStyle = lg(g, 0, 0, 0, h, dark() ? '#1b5f86' : '#8fe6ea', dark() ? '#0a3152' : '#2aa3b6', dark() ? '#031628' : '#0c5d7c'); g.fillRect(0, 0, w, h);
      g.fillStyle = rg(g, w * .62, -h * .1, 4, h * .9, 'rgba(255,255,230,.75)', 'rgba(255,255,230,0)'); g.fillRect(0, 0, w, h);
      g.globalAlpha = .16; g.fillStyle = '#fff'; for (let k = 0; k < 7; k++) { const x = w * (.3 + k * .09); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 14, 0); g.lineTo(x - 40 + k * 18, h); g.lineTo(x - 70 + k * 18, h); g.fill(); } g.globalAlpha = 1;
      const s = Math.min(1.3, h / 260);
      if (d.kind === 'reef') { reef(g, -10, w * .34, h - 26, s * 1.2, d.seed); reef(g, w * .66, w + 10, h - 26, s * 1.2, d.seed + 3);
        for (let k = 0; k < 5; k++) put(g, stagSpr(P.coral[k % 4], k), w * (.05 + k * .06), h - 50 - k * 16 * s, { ax: .5, ay: 1, sc: s });
        for (let k = 0; k < 5; k++) put(g, fanSpr(k % 2 ? P.fan : P.coral[3], k), w * (.72 + k * .06), h - 44 - k * 14 * s, { ax: .5, ay: 1, sc: s }); }
      else reef(g, -10, w + 10, h - 20, s, d.seed);
      d.fish = []; for (let k = 0; k < 6; k++) d.fish.push({ x: q() * w, y: h * (.3 + q() * .4), v: (q() < .5 ? -1 : 1) * (14 + q() * 16), k });
    }
  }
  function stepWater(d) {
    const { gw, gh } = d, a = d.a, b = d.b;
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) { const i = y * gw + x; b[i] = ((a[i - 1] + a[i + 1] + a[i - gw] + a[i + gw]) * .5 - b[i]) * .975; }
    d.a = b; d.b = a; for (let i = 0; i < d.bytes.length; i++) d.bytes[i] = Math.max(0, Math.min(255, 128 + d.a[i] * 40));
  }
  function drawDive(d, t, dt) {
    sizeDive(d); const w = d.c.width, h = d.c.height, g = d.scene.getContext('2d'), sc = Math.min(1.2, h / 280);
    g.drawImage(d.stat, 0, 0);
    if (d.kind === 'pond') {
      for (const f of d.fish) { f.x += f.v * dt; if (f.x < -40) f.x = w + 40; if (f.x > w + 40) f.x = -40; g.globalAlpha = .75; fish(g, f.x, f.y + Math.sin(t + f.k) * 8, sc * 1.1, Math.sign(f.v), t, f.k); g.globalAlpha = 1; }
      g.fillStyle = 'rgba(0,30,40,.28)'; for (const p of d.pads) { g.beginPath(); g.ellipse(p.x * w + 10, p.y * h + 14, p.r * w / d.over.width * DPR, p.r * .9 * w / d.over.width * DPR, 0, 0, TAU); g.fill(); }
    } else {
      if (d.kind === 'whale') put(g, whaleSpr(), ((t * 18) % (w + 600)) - 300, h * .3, { sc: Math.min(1.5, h / 280), rot: Math.sin(t * .4) * .04 });
      for (let k = 0; k < 4; k++) kelp(g, (k < 2 ? .04 + k * .08 : .82 + (k - 2) * .1) * w, h - 16, h * (.45 + k * .07), t, k, Math.min(1, h / 320));
      for (const f of d.fish) { f.x += f.v * dt; if (f.x < -30) f.x = w + 30; if (f.x > w + 30) f.x = -30; fish(g, f.x, f.y + Math.sin(t + f.k) * 6, sc, Math.sign(f.v), t, f.k); }
      g.fillStyle = 'rgba(20,60,90,.55)'; for (let k = 0; k < 26; k++) { const a = t * .5 + k * .24, x = w * .5 + Math.cos(a) * w * .18 + Math.sin(t + k) * 6, y = h * .55 + Math.sin(a * 1.3) * h * .12; g.beginPath(); g.ellipse(x, y, 3.5, 1.6, a + 1.6, 0, TAU); g.fill(); }
    }
    if (!ctx.reduce()) { if (Math.random() < (d.kind === 'pond' ? .12 : .05)) d.poke(1 + Math.floor(Math.random() * (d.gw - 2)), 1 + Math.floor(Math.random() * (d.gh - 2)), 1, d.kind === 'pond' ? 1.2 : .6); stepWater(d); stepWater(d); }
    const G = d.p.g, u = d.p.u;
    G.pixelStorei(G.UNPACK_FLIP_Y_WEBGL, true);
    G.activeTexture(G.TEXTURE0); G.bindTexture(G.TEXTURE_2D, d.tS); G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, G.RGBA, G.UNSIGNED_BYTE, d.scene);
    G.activeTexture(G.TEXTURE1); G.bindTexture(G.TEXTURE_2D, d.tF); G.pixelStorei(G.UNPACK_ALIGNMENT, 1); G.texImage2D(G.TEXTURE_2D, 0, G.LUMINANCE, d.gw, d.gh, 0, G.LUMINANCE, G.UNSIGNED_BYTE, d.bytes);
    G.uniform1i(u('S'), 0); G.uniform1i(u('F'), 1); G.uniform2f(u('R'), w, h); G.uniform2f(u('G'), d.gw, d.gh); G.uniform1f(u('T'), t); G.uniform1f(u('D'), dark()); d.p.draw();
    if (d.over) {
      const o = d.over.getContext('2d'), W2 = d.over.width / DPR, H2 = d.over.height / DPR; o.setTransform(DPR, 0, 0, DPR, 0, 0); o.clearRect(0, 0, W2, H2);
      for (const p of d.pads) {
        const hx = Math.floor(p.x * (d.gw - 1)), hy = Math.floor(p.y * (d.gh - 1)), bob = d.a[hy * d.gw + hx] || 0, x = p.x * W2, y = p.y * H2 + bob * 2;
        o.strokeStyle = 'rgba(255,255,255,.35)'; o.lineWidth = 2; o.beginPath(); o.arc(x, y, p.r + 3, 0, TAU); o.stroke();
        put(o, padSpr(p.r, p.seed, false), x, y, { rot: bob * .04 });
        if (p.fl) put(o, lotusSpr(Math.round(p.r * .6)), x, y - 2, { rot: Math.sin(t * .5 + p.seed) * .05 });
      }
    }
  }
  const home = doc.querySelector('.d-hero'); if (home) dive(home, 'whale');
  const tour = doc.querySelector('.d-tour-hero'); if (tour) dive(tour, 'reef');
  doc.querySelectorAll('.sk-tank').forEach(t => dive(t, 'pond'));

  /* ---------- the Assets page: every sprite on its own tile ---------- */
  const SPECS = {
    pad: (g, t) => put(g, padSpr(44, 2, false), 0, 0), lotus: (g, t) => { put(g, padSpr(44, 4, false), 0, 0); put(g, lotusSpr(28), 0, -2); },
    koi: (g, t) => fish(g, 0, 0, 1.6, 1, t, 0), clown: (g, t) => fish(g, 0, 0, 1.6, 1, t, 1), tang: (g, t) => fish(g, 0, 0, 1.6, 1, t, 2), gold: (g, t) => fish(g, 0, 0, 1.6, 1, t, 3),
    whale: (g, t) => put(g, whaleSpr(), 0, 0, { sc: .9, rot: Math.sin(t * .6) * .03 }), jelly: (g, t) => jelly(g, 0, -30, 1.3, t),
    staghorn: g => put(g, stagSpr(C().coral[0], 3), 0, 46, { ay: 1, sc: 1.2 }), fan: g => put(g, fanSpr(C().fan, 2), 0, 50, { ay: 1, sc: 1.1 }),
    brain: g => put(g, brainSpr(C().brain), 0, 26, { ay: 1, sc: 1.4 }), sponge: g => put(g, spongeSpr(C().tube, 4), 0, 34, { ay: 1, sc: 1.3 }),
    anemone: (g, t) => anemone(g, 0, 30, 1.6, t, C().anem), kelp: (g, t) => kelp(g, 0, 60, 120, t, 1, .9),
    rock: g => put(g, rockSpr(96, 44, 7), 0, 28, { ay: 1 }), pebbles: g => { for (let k = 0; k < 6; k++) put(g, pebbleSpr(k), (k % 3 - 1) * 26, (k > 2 ? 14 : -10), { sc: 1.5, rot: k }); },
    bubbles: (g, t) => { for (let k = 0; k < 6; k++) bubble(g, Math.sin(k * 2.1) * 24, 40 - ((t * 24 + k * 18) % 90), 4 + (k % 3) * 3); },
  };
  const specs = [...doc.querySelectorAll('[data-sk-asset]')].map(host => {
    const f = SPECS[host.dataset.skAsset]; if (!f) return null; const c = doc.createElement('canvas'); host.prepend(c); ctx.cleanup(() => c.remove()); return { host, c, f };
  }).filter(Boolean);
  function drawSpecs(t) {
    for (const s of specs) {
      const r = s.host.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
      const w = Math.round(r.width), h = Math.round(r.height); if (s.c.width !== w * DPR) { s.c.width = w * DPR; s.c.height = h * DPR; s.c.style.width = w + 'px'; s.c.style.height = h + 'px'; }
      const g = s.c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, w, h); g.lineJoin = g.lineCap = 'round'; g.translate(w / 2, h / 2 - 8); s.f(g, t);
    }
  }

  /* ---------- the loop ---------- */
  ctx.on(window, 'resize', () => { clearTimeout(build.t); build.t = setTimeout(build, 120); });
  ctx.onTheme(() => { build(); dives.forEach(d => { d.theme = -1; }); });
  build();
  let last = 0;
  ctx.loop(t => {
    const dt = last ? Math.min(.05, t - last) : 0; last = t;
    if (sea) { const g = sea.g, u = sea.u; g.uniform2f(u('R'), seaC.width, seaC.height); g.uniform2f(u('M'), mx * .5, (innerHeight - my) * .5); g.uniform1f(u('T'), t); g.uniform1f(u('D'), dark()); sea.draw(); }
    if (!ctx.reduce()) {
      if (t > nextFish) { const d = Math.random() < .5 ? 1 : -1, y = 120 + Math.random() * (H - 300), k = Math.floor(Math.random() * 4), n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) fishes.push({ x: d > 0 ? -30 - i * 44 : W + 30 + i * 44, y: y + i * 16, v: d * (40 + Math.random() * 20), s: .8 + Math.random() * .4, ph: Math.random() * 6, k }); nextFish = t + 8 + Math.random() * 10;
        if (Math.random() < .6) { const sy = 100 + Math.random() * (H * .5), sd = -d; for (let i = 0; i < 26; i++) school.push({ x: sd > 0 ? -20 - Math.random() * 160 : W + 20 + Math.random() * 160, y: sy + (Math.random() - .5) * 60, v: sd * 70, a: 0, o: Math.random() * 6 }); } }
      if (!jellyO && t > nextJelly) { jellyO = { x: 80 + Math.random() * (W - 160), y: H + 60 }; nextJelly = t + 25 + Math.random() * 20; }
      if (!whaleO && t > nextWhale && W > 700) { const d = Math.random() < .5 ? 1 : -1; whaleO = { x: d > 0 ? -380 : W + 380, y: H * (.16 + Math.random() * .12), s: .9 + Math.random() * .4, d }; nextWhale = t + 50 + Math.random() * 40; }
    }
    paintLife(t, dt);
    for (const d of dives) if (d.vis || ctx.reduce()) drawDive(d, t, dt);
    drawSpecs(t);
  });

  /* a success sends up a stream of bubbles; a choice, a few */
  const burst = (el, n) => {
    if (!el || !el.getBoundingClientRect || ctx.reduce()) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const b = doc.createElement('i'); b.className = 'sk-bubble'; const s = 6 + Math.random() * 10; b.style.width = b.style.height = s + 'px';
      b.style.left = r.left + Math.random() * r.width + 'px'; b.style.top = r.top + r.height / 2 + 'px'; doc.body.append(b);
      b.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 40}px,${-80 - Math.random() * 120}px)`, opacity: 0 }], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.3,.6,.4,1)' }).onfinish = () => b.remove();
    }
  };
  return { celebrate(el) { burst(el, 18); }, nudge(el) { burst(el, 4); } };
});
