/* Sunken world - ruins under the sea.
   Behind every page the sea: light falling in shafts, caustics rippling,
   marine snow drifting, a glow that follows the pointer. In front of it,
   drawn like an illustration: a sea floor of rocks, coral and kelp that
   sways, schools of fish that cross now and then, a jellyfish rising, and
   bubbles from the pointer. A few places are for diving - the home page
   hero, the tour, the tank on the Assets page - where the water fills the
   section, ruins stand in the haze, and a press sends ripples through it.
   Reduced motion: one still frame of each. */
window.heyravWorlds && heyravWorlds.define('sunken', ctx => {
  const doc = document, DPR = Math.min(1.5, devicePixelRatio || 1);
  const COMMON = `precision highp float;
    float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    vec2 h2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
    float cell(vec2 p,float t){vec2 i=floor(p),f=fract(p);float a=8.,b=8.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=.5+.45*sin(t+6.2831*h2(i+g));vec2 r=g+o-f;float d=dot(r,r);if(d<a){b=a;a=d;}else if(d<b)b=d;}return sqrt(b)-sqrt(a);}
    float caustic(vec2 p,float t){return pow(1.-smoothstep(0.,.11,cell(p,t)),2.)*.7+pow(1.-smoothstep(0.,.09,cell(p*1.7+3.1,t*1.3)),2.)*.45;}
  `;
  function program(cv, fs) {
    const g = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false }); if (!g) return null;
    const sh = (t, s) => { const o = g.createShader(t); g.shaderSource(o, s); g.compileShader(o); return o; };
    const p = g.createProgram();
    g.attachShader(p, sh(g.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    g.attachShader(p, sh(g.FRAGMENT_SHADER, COMMON + fs)); g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) { console.warn(g.getProgramInfoLog(p)); return null; }
    g.useProgram(p); g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    const loc = g.getAttribLocation(p, 'p'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
    const U = {}; ctx.cleanup(() => { const e = g.getExtension('WEBGL_lose_context'); e && e.loseContext(); });
    return { g, u: n => (n in U ? U[n] : (U[n] = g.getUniformLocation(p, n))), draw() { g.viewport(0, 0, cv.width, cv.height); g.drawArrays(g.TRIANGLES, 0, 3); } };
  }
  const dark = () => (ctx.dark() ? 1 : 0);

  /* ---------- the sea behind everything ---------- */
  const seaL = ctx.layer('sk-sea'), seaC = doc.createElement('canvas'); seaL.append(seaC);
  const sea = program(seaC, `uniform vec2 R,M;uniform float T,D;
    void main(){vec2 uv=gl_FragCoord.xy/R;float y=uv.y;
      vec3 top=D>.5?vec3(.04,.2,.29):vec3(.68,.92,.89),bot=D>.5?vec3(.008,.04,.08):vec3(.27,.62,.66);
      vec3 c=mix(bot,top,pow(y,1.3));
      float a=uv.x-.5+(1.-y)*.3;float r=(.5+.5*sin(a*15.+T*.25+sin(a*6.+T*.15)*2.))*(.5+.5*sin(a*41.-T*.21));
      c+=r*smoothstep(.15,1.,y)*(D>.5?.06:.13);
      c+=vec3(.75,.97,1.)*caustic(gl_FragCoord.xy/R.y*5.+vec2(T*.03,0.),T*.6)*(D>.5?.07:.15)*(.35+.65*y);
      vec2 m=(gl_FragCoord.xy-M)/R.y;c+=(D>.5?vec3(.05,.22,.26):vec3(.12,.16,.13))*exp(-dot(m,m)*10.)*.7;
      vec2 g=gl_FragCoord.xy/R.y*90.+vec2(0.,T*1.2);vec2 id=floor(g);if(h1(id)>.997){vec2 f=fract(g)-.5;c+=(D>.5?.4:.25)*smoothstep(.3,0.,length(f));}
      gl_FragColor=vec4(c,1.);}`);
  let mx = innerWidth / 2, my = innerHeight / 2;
  ctx.on(window, 'pointermove', e => { mx = e.clientX; my = e.clientY; if (Math.random() < .08) bubble(e.clientX, e.clientY, false); }, { passive: true });

  /* ---------- the illustrated sea floor and who swims by ---------- */
  const lifeL = ctx.layer('sk-life'), lifeC = doc.createElement('canvas'); lifeL.append(lifeC);
  const lx = lifeC.getContext('2d'), floor = doc.createElement('canvas'), fx = floor.getContext('2d');
  const R = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  let W = 0, H = 0, kelp = [], fish = [], jelly = null, bubbles = [], nextSchool = 2, nextJelly = 14;
  const PALS = () => dark() ? { rock: '#14303b', rock2: '#0d222b', sand: '#0f2a33', coral: ['#7a3a4a', '#5f3a6e', '#2f6d6a'], kelp: '#1b4d3a', kelp2: '#143a2c', fish: ['#ff9a78', '#ffd27a', '#7fd7ff'], jelly: 'rgba(200,170,255,.55)' }
    : { rock: '#5f8a8a', rock2: '#4a7375', sand: '#d9cfa8', coral: ['#f08a6c', '#e4607a', '#f2b34a'], kelp: '#3f8a52', kelp2: '#2f6e40', fish: ['#ff8a5c', '#ffd23f', '#2f8fd6'], jelly: 'rgba(255,190,215,.6)' };
  function buildFloor() {
    W = innerWidth; H = innerHeight; for (const c of [lifeC, floor]) { c.width = W * DPR; c.height = H * DPR; }
    seaC.width = Math.round(W * .5); seaC.height = Math.round(H * .5);
    const P = PALS(), r = R(91), base = H - 34;
    fx.setTransform(DPR, 0, 0, DPR, 0, 0); fx.clearRect(0, 0, W, H);
    // sand
    fx.fillStyle = P.sand; fx.beginPath(); fx.moveTo(0, H); for (let x = 0; x <= W; x += 20) fx.lineTo(x, base + 8 * Math.sin(x * .011) + 5 * Math.sin(x * .029)); fx.lineTo(W, H); fx.fill();
    // rocks and coral in clumps
    for (let x = 30; x < W; x += 140 + r() * 220) {
      const rw = 40 + r() * 60, rh = 20 + r() * 30, y = base + 6;
      fx.fillStyle = P.rock2; fx.beginPath(); fx.ellipse(x + 6, y, rw * .62, rh, 0, Math.PI, 0); fx.fill();
      fx.fillStyle = P.rock; fx.beginPath(); fx.ellipse(x, y, rw * .5, rh * .9, 0, Math.PI, 0); fx.fill();
      const coral = (cx, cy, len, ang, w, col, d) => { if (d > 4 || len < 4) return; const ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len; fx.strokeStyle = col; fx.lineWidth = w; fx.lineCap = 'round'; fx.beginPath(); fx.moveTo(cx, cy); fx.lineTo(ex, ey); fx.stroke(); coral(ex, ey, len * .72, ang - .45 - r() * .2, w * .72, col, d + 1); coral(ex, ey, len * .7, ang + .4 + r() * .2, w * .72, col, d + 1); };
      coral(x + rw * .55, y - 2, 18 + r() * 14, -Math.PI / 2 + (r() - .5) * .4, 5, P.coral[Math.floor(r() * 3)], 0);
      if (r() < .6) { fx.fillStyle = P.coral[Math.floor(r() * 3)]; for (let k = 0; k < 7; k++) { fx.beginPath(); fx.arc(x - rw * .4 + k * 5, y - rh * .7 - Math.sin(k) * 6, 3.4, 0, Math.PI * 2); fx.fill(); } }
    }
    kelp = []; for (let x = 12; x < W; x += 60 + r() * 160) kelp.push({ x, h: 90 + r() * 170, ph: r() * 6, w: 6 + r() * 4 });
  }
  function school() {
    const P = PALS(), dir = Math.random() < .5 ? 1 : -1, y = 80 + Math.random() * (H * .6), n = 5 + Math.floor(Math.random() * 6), col = P.fish[Math.floor(Math.random() * 3)], v = (40 + Math.random() * 40) * dir;
    for (let i = 0; i < n; i++) fish.push({ x: dir > 0 ? -40 - i * 26 - Math.random() * 20 : W + 40 + i * 26 + Math.random() * 20, y: y + (Math.random() - .5) * 60, v, ph: Math.random() * 6, s: 6 + Math.random() * 4, col });
  }
  function bubble(x, y, front) { if (bubbles.length < 60) bubbles.push({ x, y, r: 2 + Math.random() * 4, v: 30 + Math.random() * 40, ph: Math.random() * 6 }); }
  function drawLife(t, dt) {
    const P = PALS();
    lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lifeC.width, lifeC.height); lx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // kelp, behind the floor's front edge
    for (const k of kelp) {
      lx.strokeStyle = P.kelp; lx.lineWidth = k.w; lx.lineCap = 'round'; lx.beginPath();
      const bx = k.x, by = H - 30; lx.moveTo(bx, by);
      const pts = []; for (let s = 1; s <= 10; s++) { const yy = by - k.h * s / 10, xx = bx + Math.sin(t * .9 + k.ph + s * .45) * s * 1.8; pts.push([xx, yy]); lx.lineTo(xx, yy); }
      lx.stroke(); lx.fillStyle = P.kelp2;
      pts.forEach(([xx, yy], s) => { if (s % 2) return; const side = s % 4 ? 1 : -1; lx.beginPath(); lx.ellipse(xx + side * 7, yy, 9, 3.4, side * .6 + Math.sin(t + s) * .1, 0, Math.PI * 2); lx.fill(); });
    }
    lx.drawImage(floor, 0, 0, W, H);
    // fish
    fish = fish.filter(f => f.x > -80 && f.x < W + 80 || Math.abs(f.v) < 1);
    for (const f of fish) {
      f.x += f.v * dt; const yy = f.y + Math.sin(t * 2 + f.ph) * 4, d = Math.sign(f.v), s = f.s;
      lx.fillStyle = f.col; lx.beginPath(); lx.ellipse(f.x, yy, s * 1.5, s * .7, 0, 0, Math.PI * 2); lx.fill();
      lx.beginPath(); lx.moveTo(f.x - d * s * 1.3, yy); lx.lineTo(f.x - d * s * 2.4, yy - s * .7 + Math.sin(t * 9 + f.ph) * 1.5); lx.lineTo(f.x - d * s * 2.4, yy + s * .7 + Math.sin(t * 9 + f.ph) * 1.5); lx.closePath(); lx.fill();
      lx.fillStyle = dark() ? '#04121b' : '#0b2a31'; lx.beginPath(); lx.arc(f.x + d * s * .8, yy - s * .15, 1.4, 0, Math.PI * 2); lx.fill();
    }
    // a jellyfish, now and then
    if (jelly) {
      jelly.y -= 18 * dt; jelly.x += Math.sin(t * .6) * 6 * dt; const p = .5 + .5 * Math.sin(t * 2.4), bw = 22 + p * 4, x = jelly.x, y = jelly.y;
      lx.fillStyle = P.jelly; lx.beginPath(); lx.ellipse(x, y, bw, 16 - p * 3, 0, Math.PI, 0); lx.fill();
      lx.strokeStyle = P.jelly; lx.lineWidth = 2; for (let k = -2; k <= 2; k++) { lx.beginPath(); lx.moveTo(x + k * 8, y); for (let s = 1; s < 6; s++) lx.lineTo(x + k * 8 + Math.sin(t * 2 + s + k) * 3, y + s * 9); lx.stroke(); }
      if (y < -80) jelly = null;
    }
    // bubbles
    bubbles = bubbles.filter(b => b.y > -10);
    lx.strokeStyle = dark() ? 'rgba(200,240,240,.55)' : 'rgba(255,255,255,.85)'; lx.lineWidth = 1.2;
    for (const b of bubbles) { b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.ph) * .4; lx.beginPath(); lx.arc(b.x, b.y, b.r, 0, Math.PI * 2); lx.stroke(); }
  }

  /* ---------- places to dive ---------- */
  const DIVE = `uniform vec2 R,M;uniform float T,D,H;uniform vec4 RP[4];
    float box(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}
    float ruins(vec2 p){float d=1e3;for(int i=0;i<5;i++){float f=float(i),x=-1.6+f*.8+.15*sin(f*3.7),h=.55+.5*h1(vec2(f,2.));if(i==2)h=.22;
      d=min(d,box(p-vec2(x,h*.5),vec2(.07,h*.5)));d=min(d,box(p-vec2(x,h+.02),vec2(.11,.03)));}
      return min(d,box(p-vec2(.4,1.12),vec2(.5,.04)));}
    void main(){vec2 px=gl_FragCoord.xy,w=vec2(0.);
      for(int i=0;i<4;i++){vec4 r=RP[i];float age=T-r.z;if(age<0.||age>3.)continue;vec2 d=px-r.xy;float L=length(d)+.001,fr=age*260.-L;w+=d/L*sin(fr*.08)*exp(-abs(fr)*.02)*exp(-age*1.4)*7.;}
      vec2 dm=px-M;float lm=length(dm);w+=dm/(lm+.001)*sin(lm*.05-T*4.)*exp(-lm*.012)*3.*H;
      vec2 uv=(px+w)/R;float y=uv.y,asp=R.x/R.y;
      vec3 top=D>.5?vec3(.05,.25,.33):vec3(.3,.72,.76),bot=D>.5?vec3(.01,.05,.09):vec3(.04,.27,.35);
      vec3 c=mix(bot,top,pow(y,1.1));
      float a=uv.x-.55+(1.-y)*.35;c+=(.5+.5*sin(a*13.+T*.3))*(.5+.5*sin(a*29.-T*.2+1.))*smoothstep(0.,1.,y)*(D>.5?.1:.22);
      vec2 s=vec2((uv.x-.5)*asp*2.2,uv.y*2.2-.35);
      c=mix(c,D>.5?vec3(.03,.12,.17):vec3(.16,.46,.53),smoothstep(.012,0.,ruins(s+vec2(.6,0.)))*.85);
      c=mix(c,D>.5?vec3(.02,.09,.13):vec3(.1,.37,.44),smoothstep(.012,0.,ruins(s*1.6+vec2(-1.9,.2)))*.6);
      float bed=.17+.05*sin(uv.x*7.+1.)+.03*sin(uv.x*17.);
      if(uv.y<bed){vec3 sand=D>.5?vec3(.1,.13,.14):vec3(.8,.74,.56);c=mix(sand*.72,sand,smoothstep(bed-.13,bed,uv.y));c+=vec3(.9,1.,1.)*caustic(vec2(uv.x*asp*6.,uv.y*14.),T*.7)*(D>.5?.08:.28);}
      for(int k=0;k<7;k++){float f=float(k),kx=.06+f*.15+.05*sin(f*5.1),tp=.42+.32*h1(vec2(f,9.));if(uv.y<tp){float sw=sin(uv.y*6.+T*1.1+f)*.025*uv.y,d=abs(uv.x-kx-sw)*asp;if(d<.006+.004*sin(uv.y*40.+f))c=mix(c,D>.5?vec3(.05,.2,.12):vec3(.17,.5,.25),.9);}}
      for(int f=0;f<10;f++){float g=float(f),sp=.04+.02*h1(vec2(g,1.));vec2 fp=vec2(fract(T*sp+h1(vec2(g,3.)))*1.4-.2,.5+.25*h1(vec2(g,4.))+.03*sin(T+g));vec2 q=(uv-fp)*vec2(asp,1.);
        vec3 fc=D>.5?vec3(.6,.78,.82):vec3(1.,.6,.36);if(length(q*vec2(1.,2.6))<.018||(length((q+vec2(.022,0.))*vec2(1.6,1.))<.009&&q.x<-.012))c=mix(c,fc,.92);}
      for(int b=0;b<16;b++){float g=float(b);vec2 bp=vec2(h1(vec2(g,7.))+.01*sin(T*2.+g),fract(T*(.05+.05*h1(vec2(g,8.)))+h1(vec2(g,6.))));float bd=length((uv-bp)*vec2(asp,1.)),br=.004+.006*h1(vec2(g,5.));c+=vec3(.8,1.,1.)*(smoothstep(br,br*.7,bd)-smoothstep(br*.7,br*.4,bd))*.7;}
      c+=vec3(.7,.95,1.)*caustic(gl_FragCoord.xy/R.y*4.,T*.5)*.06*y;
      c*=1.-.35*pow(length(uv-.5),2.);
      gl_FragColor=vec4(c,1.);}`;
  const dives = [];
  function dive(el) {
    if (!el || el.querySelector(':scope > .sk-dive')) return;
    el.setAttribute('data-dive', ''); const c = doc.createElement('canvas'); c.className = 'sk-dive'; c.setAttribute('aria-hidden', 'true'); el.prepend(c);
    const p = program(c, DIVE); if (!p) { c.remove(); el.removeAttribute('data-dive'); return; }
    const d = { el, c, p, rp: [[0, 0, -9, 0], [0, 0, -9, 0], [0, 0, -9, 0], [0, 0, -9, 0]], ri: 0, m: [-999, -999], hov: 0, vis: false };
    ctx.on(el, 'pointermove', e => { const r = c.getBoundingClientRect(); d.m = [(e.clientX - r.left) / r.width * c.width, (1 - (e.clientY - r.top) / r.height) * c.height]; d.hov = 1; });
    ctx.on(el, 'pointerleave', () => { d.hov = 0; });
    ctx.on(el, 'pointerdown', e => { const r = c.getBoundingClientRect(); d.rp[d.ri++ % 4] = [(e.clientX - r.left) / r.width * c.width, (1 - (e.clientY - r.top) / r.height) * c.height, now(), 0]; });
    ctx.cleanup(() => { c.remove(); el.removeAttribute('data-dive'); });
    io.observe(el); dives.push(d);
  }
  const io = new IntersectionObserver(es => es.forEach(e => { const d = dives.find(x => x.el === e.target); if (d) d.vis = e.isIntersecting; }));
  ctx.cleanup(() => io.disconnect());
  const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
  function drawDive(d, t) {
    const r = d.el.getBoundingClientRect(), w = Math.max(2, Math.round(r.width * .6)), h = Math.max(2, Math.round(r.height * .6));
    if (d.c.width !== w || d.c.height !== h) { d.c.width = w; d.c.height = h; }
    const g = d.p.g, u = d.p.u; g.uniform2f(u('R'), w, h); g.uniform2f(u('M'), d.m[0], d.m[1]); g.uniform1f(u('T'), t); g.uniform1f(u('D'), dark()); g.uniform1f(u('H'), d.hov);
    g.uniform4fv(u('RP'), new Float32Array(d.rp.flat())); d.p.draw();
  }
  [doc.querySelector('.d-hero'), doc.querySelector('.d-tour-hero'), ...doc.querySelectorAll('.sk-tank')].forEach(dive);

  /* ---------- the loop ---------- */
  ctx.on(window, 'resize', () => { clearTimeout(buildFloor.t); buildFloor.t = setTimeout(buildFloor, 120); });
  ctx.onTheme(() => buildFloor());
  buildFloor();
  let last = 0;
  ctx.loop(t => {
    const dt = last ? Math.min(.05, t - last) : 0; last = t;
    if (sea) { const g = sea.g, u = sea.u; g.uniform2f(u('R'), seaC.width, seaC.height); g.uniform2f(u('M'), mx * .5, (innerHeight - my) * .5); g.uniform1f(u('T'), t); g.uniform1f(u('D'), dark()); sea.draw(); }
    if (!ctx.reduce()) { if (t > nextSchool) { school(); nextSchool = t + 7 + Math.random() * 9; } if (!jelly && t > nextJelly) { jelly = { x: 80 + Math.random() * (W - 160), y: H + 40 }; nextJelly = t + 22 + Math.random() * 20; } }
    drawLife(t, dt);
    for (const d of dives) if (d.vis || ctx.reduce()) drawDive(d, now());
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
