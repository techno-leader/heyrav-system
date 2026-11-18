/* Sunken world - under the water.
   Behind every page: the sea, drawn by a shader (light from the surface,
   shafts, caustics, drifting specks) and, in front of it, an illustrated
   sea floor - mossy rocks, branching and fan coral, brain coral, sponges,
   anemones and kelp forests - with fish, a school, a jellyfish and, in the
   deep, a whale passing. Lily pads float on the surface by day.
   Three places to dive have their own water: a whale overhead on the home
   page, a reef wall on the Worlds tour, a lily pond on the Assets page. Each
   is a small wave simulation that refracts its scene: move to stir it,
   press to drop a stone. Reduced motion: still frames. */
window.heyravWorlds && heyravWorlds.define('sunken', ctx => {
  const doc = document, DPR = Math.min(1.5, devicePixelRatio || 1), TAU = Math.PI * 2;
  const dark = () => (ctx.dark() ? 1 : 0), rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const C = () => dark() ? {
    ink: '#04111d', stone: '#4c5a62', stone2: '#34424a', moss: '#3f7d2e', moss2: '#2a5a1e', coral: ['#b2475a', '#c4643e', '#b8873c', '#9c4f9a'], fan: '#5a4aa6', brain: '#a87a3a', tube: '#b89a3a', anem: '#d46c9a',
    kelp: '#2d6a3a', kelp2: '#3f8a46', sand: '#1d3a4e', sand2: '#152d3e', fish: [['#ff9a5c', '#ffe9d6'], ['#4fa8ff', '#ffd86b'], ['#ffd86b', '#33302b']], whale: '#071f36', whale2: '#123a5a', pad: '#1f4a2c', pad2: '#2d6a3a', lotus: '#c79ab4', jelly: 'rgba(160,220,255,.5)', glow: '#6fe3f0'
  } : {
    ink: '#123540', stone: '#9c9584', stone2: '#756e5c', moss: '#6fb244', moss2: '#4f8f2f', coral: ['#e8483a', '#f78a3d', '#f2b84a', '#e05a8a'], fan: '#7a5bc4', brain: '#e9a24a', tube: '#f2c94c', anem: '#ff8fb1',
    kelp: '#4f9a3c', kelp2: '#86c94f', sand: '#ecdcaa', sand2: '#cdb982', fish: [['#ff7f2a', '#ffffff'], ['#2f7fe0', '#ffd23f'], ['#ffd23f', '#2b2b2b']], whale: '#0d3a5e', whale2: '#2f6688', pad: '#4e9a37', pad2: '#86cc55', lotus: '#f7c6d6', jelly: 'rgba(255,190,220,.55)', glow: '#fff3b0'
  };

  /* ---------- painters: an inked illustration style ---------- */
  const line = (g, w = 1.6) => { g.strokeStyle = C().ink; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; };
  function branches(x, y, len, ang, w, r, depth, out, spread = .5) {
    if (depth > 4 || len < 4) return; const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len; out.push([x, y, ex, ey, w]);
    branches(ex, ey, len * (.68 + r() * .12), ang - spread * (.7 + r() * .6), w * .72, r, depth + 1, out, spread);
    branches(ex, ey, len * (.66 + r() * .12), ang + spread * (.7 + r() * .6), w * .72, r, depth + 1, out, spread);
    if (r() < .35) branches(ex, ey, len * .6, ang + (r() - .5) * .3, w * .7, r, depth + 1, out, spread);
  }
  function tree(g, segs, col, edge = 3) {
    line(g); for (const [a, b, c, d, w] of segs) { g.lineWidth = w + edge; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    g.strokeStyle = col; for (const [a, b, c, d, w] of segs) { g.lineWidth = w; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.3)'; for (const [a, b, c, d, w] of segs) if (w > 3) { g.lineWidth = w * .3; g.beginPath(); g.moveTo(a - w * .2, b); g.lineTo(c - w * .2, d); g.stroke(); }
  }
  const staghorn = (g, x, y, s, col, r) => { const o = []; for (let k = 0; k < 3; k++) branches(x + (k - 1) * 6 * s, y, (16 + r() * 10) * s, -Math.PI / 2 + (k - 1) * .35, 6 * s, r, 0, o, .42); tree(g, o, col); };
  const fan = (g, x, y, s, col, r) => { const o = []; branches(x, y, 22 * s, -Math.PI / 2, 3 * s, r, 0, o, .62); tree(g, o, col, 2.2); };
  function brain(g, x, y, s, col) {
    const rx = 20 * s, ry = 14 * s, gr = g.createRadialGradient(x - rx * .3, y - ry * .5, 2, x, y, rx); gr.addColorStop(0, '#fff2c8'); gr.addColorStop(.25, col); gr.addColorStop(1, col);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI, 0); g.closePath(); g.fill(); line(g); g.stroke();
    g.strokeStyle = 'rgba(80,40,10,.45)'; g.lineWidth = 1.2; for (let k = 1; k < 4; k++) { g.beginPath(); for (let a = 0; a <= 1; a += .05) { const t = Math.PI + a * Math.PI; g.lineTo(x + Math.cos(t) * rx * k / 4.2 + Math.sin(a * 22) * 1.5, y + Math.sin(t) * ry * k / 4.2); } g.stroke(); }
  }
  function tubes(g, x, y, s, col, r) {
    for (let k = 0; k < 4; k++) {
      const h = (18 + r() * 22) * s, w = 7 * s, tx = x + (k - 1.5) * 9 * s;
      g.fillStyle = col; line(g); g.beginPath(); g.roundRect(tx - w / 2, y - h, w, h, w / 2); g.fill(); g.stroke();
      g.fillStyle = 'rgba(60,30,0,.65)'; g.beginPath(); g.ellipse(tx, y - h + 2.5 * s, w * .32, 2 * s, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(tx - w * .3, y - h + 6 * s, w * .18, h - 9 * s);
    }
  }
  function rock(g, x, y, w, h, r) {
    const P = C(), pts = []; for (let k = 0; k <= 10; k++) { const a = Math.PI + k / 10 * Math.PI; pts.push([x + Math.cos(a) * w * (.85 + r() * .2), y + Math.sin(a) * h * (.8 + r() * .25)]); }
    const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, P.stone); gr.addColorStop(1, P.stone2);
    g.fillStyle = gr; line(g, 2); g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x - w * .25, y - h * .55, w * .25, h * .18, -.3, 0, TAU); g.fill();
    for (let k = 1; k < 9; k++) { const [a, b] = pts[k]; g.fillStyle = k % 2 ? P.moss : P.moss2; line(g, 1.4); g.beginPath(); g.arc(a, b + 2, 4 + r() * 4, 0, TAU); g.fill(); g.stroke(); }
  }
  function anemone(g, x, y, s, t, col) {
    line(g); for (let k = 0; k < 11; k++) {
      const a = -Math.PI + (k + .5) / 11 * Math.PI, sw = Math.sin(t * 1.6 + k) * .25, L = (14 + (k % 3) * 3) * s;
      const ex = x + Math.cos(a + sw) * L, ey = y - 4 * s + Math.sin(a + sw) * L;
      g.strokeStyle = C().ink; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y - 4 * s); g.quadraticCurveTo(x + Math.cos(a) * L * .5, y - 4 * s + Math.sin(a) * L * .5 - 3, ex, ey); g.stroke();
      g.strokeStyle = col; g.lineWidth = 3 * s; g.stroke(); g.fillStyle = '#fff4f8'; g.beginPath(); g.arc(ex, ey, 1.8 * s, 0, TAU); g.fill();
    }
    g.fillStyle = col; line(g); g.beginPath(); g.ellipse(x, y - 2 * s, 9 * s, 5 * s, 0, 0, TAU); g.fill(); g.stroke();
  }
  function kelp(g, x, y, h, t, ph, s = 1) {
    const P = C(), pts = []; for (let k = 0; k <= 12; k++) pts.push([x + Math.sin(t * .8 + ph + k * .42) * k * 1.4 * s, y - h * k / 12]);
    line(g, 6 * s); g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke();
    g.strokeStyle = P.kelp; g.lineWidth = 3.4 * s; g.stroke();
    pts.forEach(([a, b], k) => {
      if (k < 1) return; const side = k % 2 ? 1 : -1, L = (14 + (k % 3) * 4) * s, ang = side * (.9 + Math.sin(t + k + ph) * .15);
      g.save(); g.translate(a, b); g.rotate(-Math.PI / 2 + ang);
      const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, P.kelp); gr.addColorStop(1, P.kelp2);
      g.fillStyle = gr; line(g, 1.4); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .5, -5 * s, L, 0); g.quadraticCurveTo(L * .5, 5 * s, 0, 0); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(20,60,20,.5)'; g.lineWidth = .8; g.beginPath(); g.moveTo(2, 0); g.lineTo(L - 3, 0); g.stroke(); g.restore();
    });
  }
  function fish(g, x, y, s, dir, t, kind) {
    const [a, b] = C().fish[kind % 3], w = 1 + Math.sin(t * 9) * .12;
    g.save(); g.translate(x, y); g.scale(dir * s, s); line(g, 1.4 / s);
    g.fillStyle = a; g.beginPath(); g.moveTo(-9, 0); g.lineTo(-16, -6 * w); g.lineTo(-15, 6 * w); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-2, -6); g.quadraticCurveTo(2, -11, 6, -6); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, 0, 11, 6.4, 0, 0, TAU); g.fill(); g.stroke();
    if (kind % 3 === 0) { g.fillStyle = b; for (const sx of [-4, 3]) { g.beginPath(); g.ellipse(sx, 0, 1.8, 6, 0, 0, TAU); g.fill(); g.stroke(); } }
    else { g.fillStyle = b; g.beginPath(); g.ellipse(-1, 2.5, 7, 2, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(6, -1.5, 2.2, 0, TAU); g.fill(); g.fillStyle = C().ink; g.beginPath(); g.arc(6.6, -1.5, 1.1, 0, TAU); g.fill();
    g.restore();
  }
  function whale(g, x, y, s, dir, t, alpha = 1) {
    const P = C(), f = Math.sin(t * 1.2) * 6;
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.scale(dir * s, s);
    const gr = g.createLinearGradient(0, -30, 0, 30); gr.addColorStop(0, P.whale); gr.addColorStop(1, P.whale2);
    g.fillStyle = gr; line(g, 2 / s);
    g.beginPath(); g.moveTo(120, 0); g.bezierCurveTo(118, -26, 70, -34, 10, -26); g.bezierCurveTo(-50, -18, -95, -8, -130, -2 + f * .3);
    g.lineTo(-160, -22 + f); g.quadraticCurveTo(-150, 0 + f * .5, -164, 20 + f); g.lineTo(-130, 4 + f * .3);
    g.bezierCurveTo(-90, 16, -40, 26, 20, 26); g.bezierCurveTo(80, 26, 118, 20, 120, 0); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(40, 18); g.quadraticCurveTo(20, 50 + f * .4, -6, 58 + f * .4); g.quadraticCurveTo(10, 36, 20, 22); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.4 / s; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(100 - k * 6, 10 + k * 1.5); g.lineTo(40 - k * 8, 20); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(86, -6, 2.4, 0, TAU); g.fill();
    g.restore();
  }
  function pad(g, x, y, r, rot, under, flower) {
    const P = C(); g.save(); g.translate(x, y); g.rotate(rot);
    const gr = g.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r); gr.addColorStop(0, under ? P.pad : P.pad2); gr.addColorStop(1, P.pad);
    g.fillStyle = under ? (dark() ? 'rgba(10,30,20,.85)' : 'rgba(30,70,40,.78)') : gr; line(g, 1.8);
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, .25, TAU - .25); g.closePath(); g.fill(); if (!under) g.stroke();
    if (under) { g.strokeStyle = dark() ? 'rgba(120,200,255,.25)' : 'rgba(255,255,220,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r + 1.5, .3, TAU - .3); g.stroke(); }
    else { g.strokeStyle = 'rgba(30,70,20,.45)'; g.lineWidth = 1; for (let k = 0; k < 9; k++) { const a = .4 + k / 8 * (TAU - .8); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9); g.stroke(); } }
    if (flower) {
      for (let k = 0; k < 8; k++) { g.save(); g.rotate(k / 8 * TAU); const pg = g.createLinearGradient(0, 0, 0, -r * .7); pg.addColorStop(0, '#fff'); pg.addColorStop(1, P.lotus); g.fillStyle = pg; line(g, 1.2); g.beginPath(); g.ellipse(0, -r * .32, r * .16, r * .36, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, r * .12, 0, TAU); g.fill();
    }
    g.restore();
  }
  function jelly(g, x, y, s, t) {
    const P = C(), p = .5 + .5 * Math.sin(t * 2.4), bw = (22 + p * 4) * s;
    g.strokeStyle = P.jelly; g.lineWidth = 2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * 6 * s, y); for (let q = 1; q < 7; q++) g.lineTo(x + k * 6 * s + Math.sin(t * 2 + q + k) * 3, y + q * 9 * s); g.stroke(); }
    g.fillStyle = P.jelly; line(g, 1.2); g.beginPath(); g.ellipse(x, y, bw, (17 - p * 3) * s, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - bw * .35, y - 9 * s, bw * .25, 4 * s, -.4, 0, TAU); g.fill();
  }
  /* a stretch of reef: rocks, corals, sponges; static, so it is drawn once */
  function reef(g, x0, x1, base, s, seed) {
    const P = C(), r = rnd(seed);
    g.fillStyle = P.sand; line(g, 2); g.beginPath(); g.moveTo(x0, base + 80); for (let x = x0; x <= x1; x += 18) g.lineTo(x, base + 6 * Math.sin(x * .013) + 4 * Math.sin(x * .031)); g.lineTo(x1, base + 80); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = P.sand2; g.lineWidth = 1.2; for (let x = x0 + 10; x < x1; x += 26) { g.beginPath(); g.moveTo(x, base + 14); g.quadraticCurveTo(x + 6, base + 11, x + 12, base + 14); g.stroke(); }
    for (let x = x0 + 20; x < x1 - 10; x += (70 + r() * 90) * s) {
      const k = r(); rock(g, x, base + 4, (26 + r() * 30) * s, (16 + r() * 18) * s, r);
      const cx = x + (r() - .5) * 30 * s;
      if (k < .3) staghorn(g, cx, base, s, P.coral[Math.floor(r() * 4)], r);
      else if (k < .5) fan(g, cx, base, s * 1.1, P.fan, r);
      else if (k < .68) brain(g, cx, base + 2, s, P.brain);
      else if (k < .84) tubes(g, cx, base + 2, s, P.tube, r);
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
    const r = rnd(41), base = H - 46, P = C();
    fx.setTransform(DPR, 0, 0, DPR, 0, 0); fx.clearRect(0, 0, W, H); reef(fx, -20, W + 20, base, W < 700 ? .8 : 1, 7);
    kelps = []; for (const [a, b] of [[0, W * .18], [W * .82, W]]) for (let x = a + 10; x < b; x += 26 + r() * 30) kelps.push({ x, h: H * (.3 + r() * .3), ph: r() * 6, s: .9 + r() * .3 });
    anems = []; for (let x = 60; x < W; x += 180 + r() * 240) anems.push({ x, s: .9 + r() * .4, col: r() < .5 ? P.anem : P.coral[3] });
    pads = []; for (let x = 20; x < W; x += 120 + r() * 200) pads.push({ x, y: 10 + r() * 30, r: 26 + r() * 22, rot: r() * TAU, v: (r() - .5) * 4 });
    paintLife(0, 0);
  }
  function paintLife(t, dt) {
    const P = C(); lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lifeC.width, lifeC.height); lx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!dark()) for (const p of pads) { p.x += p.v * dt; if (p.x > W + 60) p.x = -60; if (p.x < -60) p.x = W + 60; pad(lx, p.x, p.y, p.r, p.rot + Math.sin(t * .2 + p.x) * .05, true); }
    if (whaleO) { whaleO.x += whaleO.d * 22 * dt; whale(lx, whaleO.x, whaleO.y, whaleO.s, whaleO.d, t, dark() ? .55 : .3); if (whaleO.x < -400 || whaleO.x > W + 400) whaleO = null; }
    for (const s of school) { s.x += s.v * dt; s.a += dt; const yy = s.y + Math.sin(s.a * 2 + s.o) * 10; lx.fillStyle = dark() ? 'rgba(140,200,230,.6)' : 'rgba(20,70,100,.55)'; lx.beginPath(); lx.ellipse(s.x, yy, 4, 1.8, 0, 0, TAU); lx.fill(); lx.beginPath(); lx.moveTo(s.x - Math.sign(s.v) * 3, yy); lx.lineTo(s.x - Math.sign(s.v) * 7, yy - 2.5); lx.lineTo(s.x - Math.sign(s.v) * 7, yy + 2.5); lx.fill(); }
    school = school.filter(s => s.x > -60 && s.x < W + 60);
    for (const k of kelps) kelp(lx, k.x, H - 40, k.h, t, k.ph, k.s);
    lx.drawImage(floorC, 0, 0, W, H);
    for (const a of anems) anemone(lx, a.x, H - 42, a.s, t + a.x, a.col);
    fishes = fishes.filter(f => f.x > -60 && f.x < W + 60);
    for (const f of fishes) { f.x += f.v * dt; fish(lx, f.x, f.y + Math.sin(t * 1.5 + f.ph) * 6, f.s, Math.sign(f.v), t + f.ph, f.k); }
    if (jellyO) { jellyO.y -= 16 * dt; jellyO.x += Math.sin(t * .6) * 6 * dt; jelly(lx, jellyO.x, jellyO.y, 1, t); if (jellyO.y < -120) jellyO = null; }
    bubbles = bubbles.filter(b => b.y > -10); lx.strokeStyle = dark() ? 'rgba(200,240,250,.6)' : 'rgba(255,255,255,.9)'; lx.lineWidth = 1.3;
    for (const b of bubbles) { b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.ph) * .4; lx.beginPath(); lx.arc(b.x, b.y, b.r, 0, TAU); lx.stroke(); }
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
      c+=vec3(.8,1.,1.)*caustic(gl_FragCoord.xy/R.y*4.+n*4.,T*.5)*(D>.5?.04:.07)*(.4+.6*uv.y);
      gl_FragColor=vec4(c,1.);}`;
  const dives = [];
  function dive(el, kind) {
    if (!el || el.querySelector(':scope > .sk-dive')) return;
    el.setAttribute('data-dive', kind); const c = doc.createElement('canvas'); c.className = 'sk-dive'; c.setAttribute('aria-hidden', 'true'); el.prepend(c);
    const p = program(c, DIVE); if (!p) { c.remove(); el.removeAttribute('data-dive'); return; }
    const g = p.g, mk = () => { const t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE); return t; };
    const d = { el, kind, c, p, tS: mk(), tF: mk(), scene: doc.createElement('canvas'), stat: doc.createElement('canvas'), gw: 120, gh: 60, a: null, b: null, bytes: null, vis: false, seed: dives.length * 13 + 5, fish: [] };
    if (kind === 'pond') { const o = doc.createElement('canvas'); o.className = 'sk-over'; o.setAttribute('aria-hidden', 'true'); c.after(o); d.over = o; }
    const cell = e => { const r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * d.gw), Math.floor((e.clientY - r.top) / r.height * d.gh)]; };
    const poke = (x, y, rad, v) => { if (!d.a) return; for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) { const X = x + i, Y = y + j; if (X > 0 && Y > 0 && X < d.gw - 1 && Y < d.gh - 1 && i * i + j * j <= rad * rad) d.a[Y * d.gw + X] += v; } };
    d.poke = poke;
    ctx.on(el, 'pointermove', e => { const [x, y] = cell(e); poke(x, y, 1, .5); });
    ctx.on(el, 'pointerdown', e => { const [x, y] = cell(e); poke(x, y, 3, 3); });
    ctx.cleanup(() => { c.remove(); d.over && d.over.remove(); el.removeAttribute('data-dive'); });
    io.observe(el); dives.push(d);
  }
  const io = new IntersectionObserver(es => es.forEach(e => { const d = dives.find(x => x.el === e.target); if (d) d.vis = e.isIntersecting; }));
  ctx.cleanup(() => io.disconnect());
  function sizeDive(d) {
    const r = d.el.getBoundingClientRect(), w = Math.max(40, Math.round(r.width * .7)), h = Math.max(30, Math.round(r.height * .7));
    if (d.c.width === w && d.c.height === h && d.theme === dark()) return;
    d.theme = dark(); d.c.width = d.scene.width = d.stat.width = w; d.c.height = d.scene.height = d.stat.height = h;
    if (d.over) { d.over.width = Math.round(r.width * DPR); d.over.height = Math.round(r.height * DPR); }
    d.gw = 120; d.gh = Math.max(20, Math.round(120 * h / w)); d.a = new Float32Array(d.gw * d.gh); d.b = new Float32Array(d.gw * d.gh); d.bytes = new Uint8Array(d.gw * d.gh);
    const g = d.stat.getContext('2d'), P = C(), r2 = rnd(d.seed); g.clearRect(0, 0, w, h);
    if (d.kind === 'pond') {
      const gr = g.createRadialGradient(w * .5, h * .5, 10, w * .5, h * .5, Math.max(w, h) * .7); gr.addColorStop(0, dark() ? '#0d4a6a' : '#3fc9d2'); gr.addColorStop(1, dark() ? '#04213a' : '#0f7f9a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${dark() ? '40,80,90' : '230,220,170'},${.25 + r2() * .3})`; g.beginPath(); g.ellipse(r2() * w, r2() * h, 3 + r2() * 8, 2 + r2() * 5, r2() * 3, 0, TAU); g.fill(); }
      d.pads = []; for (let k = 0; k < 9; k++) d.pads.push({ x: r2(), y: r2(), r: 22 + r2() * 26, rot: r2() * TAU, fl: r2() < .35 });
      d.fish = []; for (let k = 0; k < 4; k++) d.fish.push({ x: r2() * w, y: r2() * h, v: (r2() < .5 ? -1 : 1) * (10 + r2() * 12), k: k });
    } else {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, dark() ? '#1b5f86' : '#8fe6ea'); gr.addColorStop(.55, dark() ? '#0a3152' : '#2aa3b6'); gr.addColorStop(1, dark() ? '#031628' : '#0c5d7c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const sg = g.createRadialGradient(w * .62, -h * .1, 4, w * .62, -h * .1, h * .9); sg.addColorStop(0, 'rgba(255,255,230,.75)'); sg.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
      g.globalAlpha = .18; g.fillStyle = '#fff'; for (let k = 0; k < 7; k++) { const x = w * (.3 + k * .09); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 14, 0); g.lineTo(x - 40 + k * 18, h); g.lineTo(x - 70 + k * 18, h); g.fill(); } g.globalAlpha = 1;
      const s = Math.min(1.2, h / 260);
      if (d.kind === 'reef') { reef(g, -10, w * .32, h - 26, s * 1.3, d.seed); reef(g, w * .68, w + 10, h - 26, s * 1.3, d.seed + 3); for (let k = 0; k < 5; k++) staghorn(g, w * (.04 + k * .06), h - 60 - k * 18 * s, s * 1.1, P.coral[k % 4], r2); for (let k = 0; k < 5; k++) fan(g, w * (.72 + k * .06), h - 50 - k * 16 * s, s * 1.2, k % 2 ? P.fan : P.coral[3], r2); }
      else reef(g, -10, w + 10, h - 20, s, d.seed);
      d.fish = []; for (let k = 0; k < 6; k++) d.fish.push({ x: r2() * w, y: h * (.3 + r2() * .4), v: (r2() < .5 ? -1 : 1) * (14 + r2() * 16), k });
    }
  }
  function stepWater(d) {
    const { gw, gh } = d; let a = d.a, b = d.b;
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) { const i = y * gw + x; b[i] = ((a[i - 1] + a[i + 1] + a[i - gw] + a[i + gw]) * .5 - b[i]) * .975; }
    d.a = b; d.b = a; for (let i = 0; i < d.bytes.length; i++) d.bytes[i] = Math.max(0, Math.min(255, 128 + d.a[i] * 40));
  }
  function drawDive(d, t, dt) {
    sizeDive(d); const w = d.c.width, h = d.c.height, g = d.scene.getContext('2d');
    g.drawImage(d.stat, 0, 0);
    if (d.kind === 'pond') for (const f of d.fish) { f.x += f.v * dt; if (f.x < -30) f.x = w + 30; if (f.x > w + 30) f.x = -30; g.globalAlpha = .55; fish(g, f.x, f.y + Math.sin(t + f.k) * 8, .9, Math.sign(f.v), t, f.k); g.globalAlpha = 1; }
    else {
      if (d.kind === 'whale') whale(g, ((t * 18) % (w + 500)) - 250, h * .32, Math.min(1.4, h / 300), 1, t, .95);
      for (let k = 0; k < 4; k++) kelp(g, (k < 2 ? .04 + k * .08 : .82 + (k - 2) * .1) * w, h - 16, h * (.45 + k * .07), t, k, Math.min(1, h / 320));
      for (const f of d.fish) { f.x += f.v * dt; if (f.x < -30) f.x = w + 30; if (f.x > w + 30) f.x = -30; fish(g, f.x, f.y + Math.sin(t + f.k) * 6, Math.min(1, h / 300), Math.sign(f.v), t, f.k); }
      g.fillStyle = 'rgba(20,60,90,.6)'; for (let k = 0; k < 26; k++) { const a = t * .5 + k * .24, x = w * .5 + Math.cos(a) * w * .18 + Math.sin(t + k) * 6, y = h * .55 + Math.sin(a * 1.3) * h * .12; g.beginPath(); g.ellipse(x, y, 3.5, 1.6, a + 1.6, 0, TAU); g.fill(); }
    }
    if (!ctx.reduce()) { if (Math.random() < (d.kind === 'pond' ? .12 : .05)) d.poke(1 + Math.floor(Math.random() * (d.gw - 2)), 1 + Math.floor(Math.random() * (d.gh - 2)), 1, d.kind === 'pond' ? 1.2 : .6); stepWater(d); stepWater(d); }
    const G = d.p.g, u = d.p.u;
    G.pixelStorei(G.UNPACK_FLIP_Y_WEBGL, true);
    G.activeTexture(G.TEXTURE0); G.bindTexture(G.TEXTURE_2D, d.tS); G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, G.RGBA, G.UNSIGNED_BYTE, d.scene);
    G.activeTexture(G.TEXTURE1); G.bindTexture(G.TEXTURE_2D, d.tF); G.pixelStorei(G.UNPACK_ALIGNMENT, 1); G.texImage2D(G.TEXTURE_2D, 0, G.LUMINANCE, d.gw, d.gh, 0, G.LUMINANCE, G.UNSIGNED_BYTE, d.bytes);
    G.uniform1i(u('S'), 0); G.uniform1i(u('F'), 1); G.uniform2f(u('R'), w, h); G.uniform2f(u('G'), d.gw, d.gh); G.uniform1f(u('T'), t); G.uniform1f(u('D'), dark()); d.p.draw();
    if (d.over) {
      const o = d.over.getContext('2d'), W2 = d.over.width / DPR, H2 = d.over.height / DPR; o.setTransform(DPR, 0, 0, DPR, 0, 0); o.clearRect(0, 0, W2, H2);
      for (const p of d.pads) { const hx = Math.floor(p.x * (d.gw - 1)), hy = Math.floor(p.y * (d.gh - 1)), bob = d.a[hy * d.gw + hx] || 0; pad(o, p.x * W2, p.y * H2 + bob * 2, p.r, p.rot + bob * .04, false, p.fl); }
    }
  }
  const home = doc.querySelector('.d-hero'); if (home) dive(home, 'whale');
  const tour = doc.querySelector('.d-tour-hero'); if (tour) dive(tour, 'reef');
  doc.querySelectorAll('.sk-tank').forEach(t => dive(t, 'pond'));

  /* ---------- the loop ---------- */
  ctx.on(window, 'resize', () => { clearTimeout(build.t); build.t = setTimeout(build, 120); });
  ctx.onTheme(() => { build(); dives.forEach(d => { d.theme = -1; }); });
  build();
  let last = 0;
  ctx.loop(t => {
    const dt = last ? Math.min(.05, t - last) : 0; last = t;
    if (sea) { const g = sea.g, u = sea.u; g.uniform2f(u('R'), seaC.width, seaC.height); g.uniform2f(u('M'), mx * .5, (innerHeight - my) * .5); g.uniform1f(u('T'), t); g.uniform1f(u('D'), dark()); sea.draw(); }
    if (!ctx.reduce()) {
      if (t > nextFish) { const d = Math.random() < .5 ? 1 : -1, y = 120 + Math.random() * (H - 300), k = Math.floor(Math.random() * 3), n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) fishes.push({ x: d > 0 ? -30 - i * 40 : W + 30 + i * 40, y: y + i * 14, v: d * (40 + Math.random() * 20), s: .9 + Math.random() * .4, ph: Math.random() * 6, k }); nextFish = t + 8 + Math.random() * 10;
        if (Math.random() < .6) { const sy = 100 + Math.random() * (H * .5), sd = -d; for (let i = 0; i < 26; i++) school.push({ x: sd > 0 ? -20 - Math.random() * 160 : W + 20 + Math.random() * 160, y: sy + (Math.random() - .5) * 60, v: sd * 70, a: 0, o: Math.random() * 6 }); } }
      if (!jellyO && t > nextJelly) { jellyO = { x: 80 + Math.random() * (W - 160), y: H + 60 }; nextJelly = t + 25 + Math.random() * 20; }
      if (!whaleO && t > nextWhale && W > 700) { const d = Math.random() < .5 ? 1 : -1; whaleO = { x: d > 0 ? -380 : W + 380, y: H * (.16 + Math.random() * .12), s: .9 + Math.random() * .5, d }; nextWhale = t + 50 + Math.random() * 40; }
    }
    paintLife(t, dt);
    for (const d of dives) if (d.vis || ctx.reduce()) drawDive(d, t, dt);
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
