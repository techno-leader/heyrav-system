/* Symbiote world - the goo.
   The creature lives in the black slabs (primary buttons, chosen chips, the
   current page, a morph button). As the pointer approaches one, a fizz of
   fine strings rises along the facing edge; closer, thin tendrils lunge out,
   web together and coil round the pointer. Pulled away, they neck, snap and
   recoil into the slab. Left alone, a slab curls a few strands out now and
   then and draws them back; a slab that takes keyboard focus does the same.
   Drawn in WebGL as matte rubber: tapered capsules smooth-blended into each
   other and into the slab's rounded edge, lit with a broad soft highlight
   and a silver rim, casting a contact shadow on the floor. Nothing is drawn
   when nothing moves; reduced motion leaves the slabs still and silent. */
window.heyravWorlds && heyravWorlds.define('symbiote', ctx => {
  const doc = document;
  if (ctx.reduce()) return {};
  const layer = ctx.layer('sy-goo', true);
  const cv = doc.createElement('canvas'); layer.append(cv);
  const gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) { layer.remove(); return {}; }
  const MAX = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) >= 220 ? 120 : 48;

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `#extension GL_OES_standard_derivatives : enable
    precision highp float;
    uniform vec2 uView; uniform float uDpr, uDark; uniform int uN, uR;
    uniform vec4 uSeg[${MAX}]; uniform vec4 uRad[${MAX / 2}]; uniform vec4 uRect[2]; uniform float uRr[2];
    float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
    float box(vec2 p,vec4 r,float rad){vec2 c=r.xy+r.zw*.5;vec2 q=abs(p-c)-r.zw*.5+rad;return length(max(q,0.))+min(max(q.x,q.y),0.)-rad;}
    float cap(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 pa=p-a,ba=b-a;float t=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);return length(pa-ba*t)-mix(ra,rb,t);}
    float rects(vec2 p){float d=1e5;for(int i=0;i<2;i++){if(i>=uR)break;d=min(d,box(p,uRect[i],uRr[i]));}return d;}
    float field(vec2 p){
      float d=rects(p);
      for(int i=0;i<${MAX};i++){
        if(i>=uN)break;
        vec4 s=uSeg[i]; vec4 rr=uRad[i/2]; vec2 r=(i-2*(i/2))==0?rr.xy:rr.zw;
        d=smin(d,cap(p,s.xy,s.zw,r.x,r.y),2.6);
      }
      return d;
    }
    void main(){
      vec2 p=vec2(gl_FragCoord.x,uView.y*uDpr-gl_FragCoord.y)/uDpr;
      float dr=rects(p);
      if(dr<-1.2) discard;
      float d=field(p);
      float sh=field(p-vec2(3.,6.));
      float shadow=smoothstep(7.,-3.,sh)*(uDark>.5?.55:.26)*step(0.,dr);
      float a=clamp(.5-d,0.,1.);
      if(a<=0.&&shadow<=.002) discard;
      float depth=clamp(-d,0.,4.);
      float h=sqrt(max(0.,depth*(8.-depth)));
      vec3 n=normalize(vec3(-dFdx(h),-dFdy(h),1.6));
      vec3 L=normalize(vec3(-.5,.7,.65)), H=normalize(L+vec3(0.,0.,1.));
      float dif=max(dot(n,L),0.), spec=pow(max(dot(n,H),0.),20.), rim=pow(1.-n.z,2.4)*(.55+.45*dot(normalize(n.xy+1e-4),vec2(-.6,.8)));
      vec3 col=vec3(.03)+vec3(.05)*dif+vec3(.93,.94,.98)*(spec*.16+rim*(uDark>.5?.55:.32));
      gl_FragColor=mix(vec4(0.,0.,0.,shadow),vec4(col,1.),a);
    }`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.SCISSOR_TEST);
  const U = n => gl.getUniformLocation(pr, n);
  const u = { view: U('uView'), dpr: U('uDpr'), dark: U('uDark'), n: U('uN'), r: U('uR'), seg: U('uSeg'), rad: U('uRad'), rect: U('uRect'), rr: U('uRr') };
  let dpr = 1;
  const size = () => { dpr = Math.min(1.5, devicePixelRatio || 1); cv.width = innerWidth * dpr | 0; cv.height = innerHeight * dpr | 0; gl.viewport(0, 0, cv.width, cv.height); };
  size(); ctx.on(window, 'resize', size);

  /* ---------- hosts: where the creature lives ---------- */
  const SLAB = '.btn-primary,.case-link,.contact-actions .primary,.chip[aria-pressed="true"],.morph-btn,.d-nav a[aria-current="page"]';
  const geo = el => { const r = el.getBoundingClientRect(); const rad = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, r.width / 2, r.height / 2); return { x: r.left, y: r.top, w: r.width, h: r.height, r: rad }; };
  const visible = g => g.w > 4 && g.h > 4 && g.y + g.h > 0 && g.y < innerHeight && g.x + g.w > 0 && g.x < innerWidth;
  /* the nearest point on a rounded rectangle's edge, and the outward normal there */
  const edge = (g, x, y) => {
    const cx = g.x + g.w / 2, cy = g.y + g.h / 2, hx = g.w / 2 - g.r, hy = g.h / 2 - g.r;
    const qx = Math.max(-hx, Math.min(hx, x - cx)), qy = Math.max(-hy, Math.min(hy, y - cy));
    let dx = x - cx - qx, dy = y - cy - qy, l = Math.hypot(dx, dy);
    if (l < 1e-3) { if (Math.abs(x - cx) / g.w > Math.abs(y - cy) / g.h) { dx = Math.sign(x - cx) || 1; dy = 0; } else { dx = 0; dy = Math.sign(y - cy) || 1; } l = 1; }
    dx /= l; dy /= l;
    return { x: cx + qx + dx * g.r, y: cy + qy + dy * g.r, nx: dx, ny: dy };
  };
  const along = (g, e, s) => edge(g, e.x - e.ny * s + e.nx * 2, e.y + e.nx * s + e.ny * 2);

  /* ---------- strands ---------- */
  const N = 11, strands = [];
  const spawn = (host, g, e, opts) => {
    const pts = Array.from({ length: N }, () => ({ x: e.x, y: e.y, ox: e.x, oy: e.y }));
    const s = { host, ox: e.x - g.x, oy: e.y - g.y, nx: e.nx, ny: e.ny, pts, len: 0, mode: 'reach', t0: performance.now(), phase: Math.random() * 6.28, spin: (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 2), coil: 9 + Math.random() * 14, thick: 1.15 + Math.random() * .9, ...opts };
    strands.push(s); return s;
  };
  let px = -999, py = -999, idleAt = performance.now(), nextBurst = performance.now() + 2500;
  const fine = ctx.fine();
  if (fine) ctx.on(window, 'pointermove', e => { px = e.clientX; py = e.clientY; idleAt = performance.now(); }, { passive: true });
  ctx.on(doc.documentElement, 'pointerleave', () => { px = py = -999; });
  const REACH = 130;
  let active = null;

  const hosts = () => [...doc.querySelectorAll(SLAB)].filter(el => !el.closest('[hidden],dialog:not([open])'));
  const nearest = () => {
    let best = null, bd = REACH * 1.6;
    for (const el of hosts()) {
      const g = geo(el); if (!visible(g)) continue;
      if (px > g.x && px < g.x + g.w && py > g.y && py < g.y + g.h) return { el, g, e: edge(g, px, py), d: 0, inside: true };
      const e = edge(g, px, py), d = Math.hypot(px - e.x, py - e.y);
      if (d < bd) { bd = d; best = { el, g, e, d }; }
    }
    return best;
  };
  /* a burst: a few strands curl out of an edge and sink back */
  const burst = (el, n = 3, around = false) => {
    if (!el || !el.isConnected) return; const g = geo(el); if (!visible(g)) return;
    const per = 2 * (g.w + g.h);
    for (let i = 0; i < n; i++) {
      let x, y;
      if (around) { const t = (i + Math.random() * .5) / n * per; x = t < g.w ? g.x + t : t < g.w + g.h ? g.x + g.w : t < 2 * g.w + g.h ? g.x + g.w - (t - g.w - g.h) : g.x; y = t < g.w ? g.y : t < g.w + g.h ? g.y + (t - g.w) : t < 2 * g.w + g.h ? g.y + g.h : g.y + g.h - (t - 2 * g.w - g.h); x += (x - g.x - g.w / 2) * .1; y += (y - g.y - g.h / 2) * .1; }
      else if (Math.random() < .7) { x = g.x + g.w * (.15 + Math.random() * .7); y = Math.random() < .6 ? g.y - 5 : g.y + g.h + 5; }
      else { x = Math.random() < .5 ? g.x - 5 : g.x + g.w + 5; y = g.y + g.h * Math.random(); }
      spawn(el, g, edge(g, x, y), { mode: 'burst', life: 1300 + Math.random() * 700, reach: 16 + Math.random() * 26, curl: (Math.random() < .5 ? -1 : 1) * (1.6 + Math.random()) });
    }
  };
  ctx.on(doc, 'focusin', e => { const el = e.target.closest && e.target.closest(SLAB); if (el && el.matches(':focus-visible')) burst(el, 3); });
  if (!fine) ctx.on(doc, 'pointerdown', e => { const el = e.target.closest && e.target.closest(SLAB); if (el) burst(el, 4); });

  /* ---------- simulate and draw ---------- */
  const segs = new Float32Array(MAX * 4), rads = new Float32Array(MAX * 2), rectU = new Float32Array(8), rrU = new Float32Array(2);
  let fizz = 0, wasDrawing = false;
  const clear = () => { gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.SCISSOR_TEST); };
  ctx.loop((t, now) => {
    const near = fine && px > -900 ? nearest() : null;
    const reaching = near && !near.inside && near.d < REACH ? near : null;
    fizz += ((near && !near.inside && near.d < REACH * 1.6 ? 1 : 0) - fizz) * .12;
    if (reaching) {
      if (!active || active.el !== reaching.el) {
        strands.forEach(s => { if (s.mode === 'reach') s.mode = 'recoil'; });
        active = { el: reaching.el };
        const count = 4 + Math.round(Math.random() * 2);
        for (let i = 0; i < count; i++) spawn(reaching.el, reaching.g, along(reaching.g, reaching.e, (i - (count - 1) / 2) * (11 + Math.random() * 9)), { delay: i * 55 });
      }
    } else if (active && (!near || near.inside || near.d > REACH * 1.35 || near.el !== active.el)) {
      /* pulled too far: the strands neck and snap back */
      strands.forEach(s => { if (s.mode === 'reach') s.mode = 'recoil'; }); active = null;
    }
    /* an idle slab stirs now and then */
    if (now > nextBurst) {
      nextBurst = now + 2600 + Math.random() * 2200;
      if (!active && now - idleAt > 1200) { const hs = hosts().filter(el => visible(geo(el))); if (hs.length) burst(hs[(Math.random() * hs.length) | 0], 3); }
    }

    /* step every strand */
    const gs = new Map();
    for (let k = strands.length - 1; k >= 0; k--) {
      const s = strands[k];
      if (!s.host.isConnected) { strands.splice(k, 1); continue; }
      let g = gs.get(s.host); if (!g) { g = geo(s.host); gs.set(s.host, g); }
      const ax = g.x + s.ox, ay = g.y + s.oy, age = now - s.t0 - (s.delay || 0);
      if (age < 0) continue;
      let tx, ty;
      if (s.mode === 'reach') {
        const a = s.phase + t * s.spin; tx = px + Math.cos(a) * s.coil; ty = py + Math.sin(a) * s.coil;
        const want = Math.hypot(tx - ax, ty - ay) * 1.12 + 8;
        s.len += (want - s.len) * (s.len < want ? .22 : .12);
      } else if (s.mode === 'burst') {
        const k2 = Math.min(1, age / s.life);
        if (k2 >= 1) { strands.splice(k, 1); continue; }
        const out = Math.sin(k2 * Math.PI), ang = s.curl * k2, c = Math.cos(ang), sn = Math.sin(ang);
        const dx = s.nx * c - s.ny * sn, dy = s.nx * sn + s.ny * c, want = s.reach * out;
        tx = ax + dx * want * .9; ty = ay + dy * want * .9;
        s.len += (want * 1.1 - s.len) * .25;
      } else {
        s.len *= .8; tx = ax; ty = ay;
        if (s.len < 1.5) { strands.splice(k, 1); continue; }
      }
      const seg = Math.max(.3, s.len / (N - 1)), P = s.pts;
      for (let sub = 0; sub < 2; sub++) {
        for (let i = 1; i < N; i++) { const q = P[i], vx = (q.x - q.ox) * .86, vy = (q.y - q.oy) * .86; q.ox = q.x; q.oy = q.y; q.x += vx + s.nx * .25; q.y += vy + s.ny * .25 + .18; }
        const tip = P[N - 1], pull = s.mode === 'recoil' ? 0 : .35;
        tip.x += (tx - tip.x) * pull; tip.y += (ty - tip.y) * pull;
        for (let it = 0; it < 4; it++) {
          P[0].x = ax; P[0].y = ay;
          for (let i = 0; i < N - 1; i++) {
            const a2 = P[i], b = P[i + 1], dx = b.x - a2.x, dy = b.y - a2.y, d = Math.hypot(dx, dy) || 1, diff = (d - seg) / d;
            if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; } else { a2.x += dx * diff * .5; a2.y += dy * diff * .5; b.x -= dx * diff * .5; b.y -= dy * diff * .5; }
          }
          for (let i = 1; i < N - 1; i++) { const a2 = P[i - 1], b = P[i], c2 = P[i + 1]; b.x += ((a2.x + c2.x) / 2 - b.x) * .12; b.y += ((a2.y + c2.y) / 2 - b.y) * .12; }
        }
      }
    }

    /* collect what to draw */
    let n = 0, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    const grow = (x, y, m) => { minX = Math.min(minX, x - m); minY = Math.min(minY, y - m); maxX = Math.max(maxX, x + m); maxY = Math.max(maxY, y + m); };
    const used = new Set();
    for (const s of strands) {
      if (now - s.t0 - (s.delay || 0) < 0 || s.len < 1) continue;
      used.add(s.host);
      const P = s.pts, neck = s.mode === 'recoil' ? .55 : 1;
      const r = k => Math.max(.55, s.thick * neck * (1 - k * .6) * (1 + .22 * Math.sin(k * 11 + t * 3 + s.phase)) * Math.min(1, s.len / 18 + .35));
      for (let i = 0; i < N - 1 && n < MAX; i++) {
        segs[n * 4] = P[i].x; segs[n * 4 + 1] = P[i].y; segs[n * 4 + 2] = P[i + 1].x; segs[n * 4 + 3] = P[i + 1].y;
        rads[n * 2] = r(i / (N - 1)) + (i === 0 ? 1.6 : 0); rads[n * 2 + 1] = r((i + 1) / (N - 1));
        grow(P[i].x, P[i].y, 14); n++;
      }
      grow(P[N - 1].x, P[N - 1].y, 14);
    }
    /* the fizz: fine strings along the facing edge, before anything lunges */
    if (fizz > .02 && near && !near.inside) {
      for (let i = 0; i < 9 && n < MAX; i++) {
        const e = along(near.g, near.e, (i - 4) * 7), hgt = fizz * (3 + 6 * (.5 + .5 * Math.sin(t * 22 + i * 1.7))) * (1 - Math.abs(i - 4) / 6);
        segs[n * 4] = e.x; segs[n * 4 + 1] = e.y; segs[n * 4 + 2] = e.x + e.nx * hgt; segs[n * 4 + 3] = e.y + e.ny * hgt;
        rads[n * 2] = 1.3; rads[n * 2 + 1] = .6; grow(e.x, e.y, 16); n++;
      }
      used.add(near.el);
    }
    if (!n) { if (wasDrawing) { clear(); wasDrawing = false; } return; }
    wasDrawing = true;
    const hs = [...used].slice(0, 2); rectU.fill(-1e4); rrU.fill(0);
    hs.forEach((el, i) => { const g = gs.get(el) || geo(el); rectU[i * 4] = g.x; rectU[i * 4 + 1] = g.y; rectU[i * 4 + 2] = g.w; rectU[i * 4 + 3] = g.h; rrU[i] = g.r; grow(g.x, g.y, 14); grow(g.x + g.w, g.y + g.h, 14); });
    clear();
    const sx = Math.max(0, Math.floor(minX * dpr)), sy = Math.max(0, Math.floor((innerHeight - maxY) * dpr));
    gl.scissor(sx, sy, Math.max(1, Math.ceil((maxX - minX) * dpr)), Math.max(1, Math.ceil((maxY - minY) * dpr)));
    gl.uniform2f(u.view, innerWidth, innerHeight); gl.uniform1f(u.dpr, dpr); gl.uniform1f(u.dark, ctx.dark() ? 1 : 0);
    gl.uniform1i(u.n, n); gl.uniform1i(u.r, hs.length);
    gl.uniform4fv(u.seg, segs); gl.uniform4fv(u.rad, rads); gl.uniform4fv(u.rect, rectU); gl.uniform1fv(u.rr, rrU);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  ctx.cleanup(() => { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); });

  return {
    nudge(el) { burst(el.closest(SLAB) || el, 3); },
    celebrate(el) { burst(el, 7, true); },
  };
});
