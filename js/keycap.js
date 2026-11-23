/* keycap.js - draws the .keycap component: an isometric key in a hole cut
   into a dotted plate. Three layers, like a real switch: the plate and its
   hole; the cap, which travels; and the hole's front lip, which the cap sinks
   behind. The drawing comes from a few numbers each world can set in CSS:

     --kc-w, --kc-d   footprint (plane units)      --kc-round  corner radius
     --kc-h           cap height                   --kc-taper  how much the top narrows
     --kc-lw          line width in px             --kc-strata card layers on the sides (0 = none)
     --kc-rivets      1 = four rivets on the top   --kc-pulli  1 = a grid of dots on the top
     --kc-gloss       1 = a highlight on the top

   Colours are plain CSS on the parts (.kc-top, .kc-left, .kc-right, .kc-line,
   .kc-hole, .kc-dots, .kc-glyph). Markup: <button class="keycap"><span
   class="keycap-glyph">R</span></button> (data-glyph="mark" draws the brand's
   R mark instead of the letter); this file adds the drawing and
   redraws when the world changes. */
(() => {
  const C = Math.cos(Math.PI / 6), S = .5, U = 100; // plane units drawn at 100 to the unit, so text stays crisp
  const P = (x, y, z = 0) => [(x - y) * C * U, ((x + y) * S - z) * U];
  const f = n => Math.round(n * 100) / 100;
  /* a rounded rectangle in the plane, centred, as points */
  function rrect(w, d, r, z = 0, n = 10) {
    r = Math.max(0, Math.min(r, w / 2, d / 2));
    const pts = [], cs = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= (r ? n : 0); i++) { const a = (a0 + 90 * i / n) * Math.PI / 180; pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); }
    return pts;
  }
  const path = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
  const line = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L');
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  /* the near half of an outline: from its leftmost point round the front to its rightmost */
  function front(pts) {
    let l = 0, r = 0; pts.forEach((p, i) => { if (p[0] < pts[l][0]) l = i; if (p[0] > pts[r][0]) r = i; });
    const a = [], b = [];
    for (let i = l; ; i = (i + 1) % pts.length) { a.push(pts[i]); if (i === r) break; }
    for (let i = l; ; i = (i - 1 + pts.length) % pts.length) { b.push(pts[i]); if (i === r) break; }
    const avg = s => s.reduce((t, p) => t + p[1], 0) / s.length;
    return avg(a) > avg(b) ? a : b;
  }
  const num = (cs, k, v) => { const x = parseFloat(cs.getPropertyValue(k)); return isNaN(x) ? v : x; };
  const el = (n, a, kids = '') => `<${n} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}>${kids}</${n}>`;
  /* the R mark from the brand (assets/brand/mark.svg), 202 x 280: the bowl, the swash and the dot */
  const MARK = '<path transform="translate(7 0) scale(.7085) translate(-49.8984 -2.3125)" d="M49.8984 2.3125H169.022C225.546 2.3125 271.367 48.1341 271.367 104.658C271.367 161.182 225.546 207.003 169.022 207.003H49.8984V2.3125Z"/>'
    + '<path transform="translate(1 164) scale(1.977)" d="M9.78125 0C8.32812 0 6.88672 0.0546875 5.45703 0.164062C4.07422 0.265625 2.70312 0.421875 1.34375 0.617188L0 0.828125C9.82422 6.11719 17.9297 14.1875 23.2773 23.9766C24 25.2969 24.6758 26.6562 25.293 28.0391C33.7578 43.5391 49.125 54.6719 67.2812 57.3594C68.5977 57.5547 69.9297 57.7031 71.2734 57.8125C72.7617 57.9375 74.2656 58 75.7812 58C80.7422 58 85.5547 57.3672 90.1484 56.1875C77.6797 51.3906 67.3047 42.3828 60.7695 30.8984C60.4531 30.2969 60.1289 29.6953 59.793 29.1016C51.2344 14.0625 36.082 3.25781 18.2695 0.625C16.6289 0.382812 14.9609 0.203125 13.2734 0.101562C12.1172 0.03125 10.9531 0 9.78125 0Z"/>'
    + '<circle cx="191.6" cy="270.5" r="9.3"/>';
  let uid = 0;

  function draw(key) {
    const cs = getComputedStyle(key);
    const W = num(cs, '--kc-w', 1.3), D = num(cs, '--kc-d', 1), R = num(cs, '--kc-round', .17), H = num(cs, '--kc-h', .42), T = num(cs, '--kc-taper', .09);
    const strata = num(cs, '--kc-strata', 0), rivets = num(cs, '--kc-rivets', 0), pulli = num(cs, '--kc-pulli', 0), gloss = num(cs, '--kc-gloss', 0);
    const glyph = (key.querySelector('.keycap-glyph') || {}).textContent || '', mark = key.dataset.glyph === 'mark';
    const sig = [W, D, R, H, T, strata, rivets, pulli, gloss, glyph, mark].join();
    if (key._kc === sig) return; key._kc = sig;
    const id = 'kc' + (++uid), G = .07, M = .34;
    const base = rrect(W, D, R), top = rrect(W - 2 * T, D - 2 * T, Math.max(.02, R - T * .4), H), hole = rrect(W + 2 * G, D + 2 * G, R + G * .6);
    const plate = rrect(W + 2 * M, D + 2 * M, Math.min(R, .06));
    const body = hull(base.concat(top)), fx = P(W / 2, D / 2)[0];
    /* the frame: everything the drawing can reach, with room for the pulse */
    const all = plate.concat(top), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const pad = .16 * U, vx = Math.min(...xs) - pad, vy = Math.min(...ys) - .1 * U, vw = Math.max(...xs) - vx + pad, vh = Math.max(...ys) - vy + pad;
    const lip = front(hole), BIG = 9 * U;
    const clip = [[-BIG, lip[0][1]], ...lip, [BIG, lip[lip.length - 1][1]], [BIG, -BIG], [-BIG, -BIG]];
    const strataLines = []; for (let i = 1; i <= strata; i++) { const k = i / (strata + 1); strataLines.push(line(front(rrect(W - 2 * T * k, D - 2 * T * k, Math.max(.02, R - T * .4 * k), H * k)))); }
    const tx = `matrix(${C} ${S} ${-C} ${S} 0 ${f(-H * U)})`;
    const deco = [];
    if (rivets) for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = P(x * (W / 2 - T - .1), y * (D / 2 - T - .1), H); deco.push(el('ellipse', { class: 'kc-rivet', cx: f(c[0]), cy: f(c[1]), rx: 4.5, ry: 2.6 })); }
    if (pulli) { const n = 5, sx = (W - 2 * T - .16) / (n - 1), sy = (D - 2 * T - .16) / (n - 1); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const c = P(-(W / 2 - T - .08) + i * sx, -(D / 2 - T - .08) + j * sy, H); deco.push(el('ellipse', { class: 'kc-pulli', cx: f(c[0]), cy: f(c[1]), rx: 1.8, ry: 1.1 })); } }
    if (gloss) { const c = P(-(W / 2 - T) * .35, -(D / 2 - T) * .45, H); deco.push(el('ellipse', { class: 'kc-gloss', cx: f(c[0]), cy: f(c[1]), rx: 28, ry: 9, transform: `rotate(-30 ${f(c[0])} ${f(c[1])})` })); }
    const ring = k => path(rrect((W + 2 * G) * k, (D + 2 * G) * k, (R + G) * k));
    const svg = el('svg', { class: 'kc-svg', viewBox: `${f(vx)} ${f(vy)} ${f(vw)} ${f(vh)}`, 'aria-hidden': 'true', focusable: 'false' },
      el('defs', {}, el('clipPath', { id }, el('path', { d: path(clip) })) + el('clipPath', { id: id + 'l' }, el('rect', { x: -BIG, y: -BIG, width: f(fx + BIG), height: 2 * BIG })))
      + el('g', { class: 'kc-pulse' }, ['a', 'b', 'c'].map(k => el('path', { class: 'kc-ring kc-ring-' + k, d: ring(1) })).join(''))
      + el('path', { class: 'kc-dots', d: path(plate) })
      + el('path', { class: 'kc-hole', d: path(hole) })
      + el('g', { 'clip-path': `url(#${id})` }, el('g', { class: 'kc-cap' },
          el('path', { class: 'kc-right', d: path(body) })
          + el('path', { class: 'kc-left', d: path(body), 'clip-path': `url(#${id}l)` })
          + strataLines.map(d => el('path', { class: 'kc-strata', d })).join('')
          + el('path', { class: 'kc-edge', d: line([P(W / 2 - R + R * Math.SQRT1_2, D / 2 - R + R * Math.SQRT1_2), P(W / 2 - T - (R - T * .4) * (1 - Math.SQRT1_2), D / 2 - T - (R - T * .4) * (1 - Math.SQRT1_2), H)]) })
          + el('path', { class: 'kc-outline', d: path(body) })
          + el('path', { class: 'kc-top', d: path(top) })
          + deco.join('')
          + (mark ? el('g', { class: 'kc-glyph kc-mark', transform: `${tx} scale(${f(Math.min(W - 2 * T, D - 2 * T) * .96 * U / 280)}) translate(-101 -140)` }, MARK)
            : glyph ? el('text', { class: 'kc-glyph', transform: tx, x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, glyph.replace(/[<&]/g, '')) : '')))
      + el('path', { class: 'kc-lip', d: line(lip) }));
    let box = key.querySelector('.kc-art'); if (!box) { box = document.createElement('span'); box.className = 'kc-art'; box.setAttribute('aria-hidden', 'true'); key.prepend(box); }
    box.innerHTML = svg;
    key.style.setProperty('--kc-sink', f(H * .78 * U) + 'px');
    key.classList.add('is-drawn');
  }
  const all = () => document.querySelectorAll('.keycap').forEach(draw);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', all) : all();
  addEventListener('worldchange', () => requestAnimationFrame(all));
  /* fonts for a world arrive late: the glyph is SVG text, so nothing to redo; shapes only change with the world */
  window.HRKeycap = { draw, all };
})();
