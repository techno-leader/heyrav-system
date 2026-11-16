/* Fable world - the wood around the page.
   Behind everything: an enchanted pond (a WebGL liquid shader) - watercolour
   washes that bleed in from the edges by day, moonlit water with fireflies by
   night; the pointer leaves ripples. A success scatters glitter; a press held
   on empty ground grows a flower; in December, or when a title is clicked
   three times, it snows. Buttons carry a little liquid light that follows the
   pointer. All of it rests for reduced motion. */
window.heyravWorlds && heyravWorlds.define('fable', ctx => {
  const doc = document;

  /* ---------- the pond ---------- */
  const layer = ctx.layer('fb-pond');
  const cv = doc.createElement('canvas'); layer.append(cv);
  const gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });
  const FLIES = 12;
  const flies = Array.from({ length: FLIES }, (_, i) => ({ x: Math.random(), y: Math.random(), s: .3 + Math.random() * .7, p: Math.random() * 6.28 }));
  let mx = .5, my = .5, lastMove = performance.now(), rip = [-9, -9, -9];
  if (gl) {
    const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FS = `precision mediump float;
      uniform vec2 uRes; uniform float uT, uDark, uFlyA; uniform vec2 uM; uniform vec3 uRip; uniform vec2 uFly[${FLIES}];
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+7.1;a*=.5;}return s;}
      void main(){
        vec2 uv=gl_FragCoord.xy/uRes; vec2 q=uv*vec2(uRes.x/uRes.y,1.);
        /* ripples from the pointer, and from a click */
        vec2 m=uM*vec2(uRes.x/uRes.y,1.); float dm=length(q-m);
        float w=sin(dm*38.-uT*5.)*exp(-dm*7.)*.012;
        vec2 rc=uRip.xy*vec2(uRes.x/uRes.y,1.); float age=uT-uRip.z, dr=length(q-rc);
        w+=sin((dr-age*.35)*60.)*exp(-abs(dr-age*.35)*30.)*exp(-age*1.4)*.03;
        /* liquid: warped noise flowing slowly */
        vec2 p=q*2.2+w; float t=uT*.045;
        vec2 o=vec2(fbm(p+vec2(t,-t)),fbm(p+vec2(-t*.8,t*1.1)+3.7));
        float f=fbm(p+o*1.6+t);
        float caustic=pow(1.-abs(sin((f+o.x)*9.)),12.);
        /* stronger toward the edges, so the reading stays clear */
        float edge=smoothstep(.04,.86,length((uv-.5)*vec2(1.3,1.1)));
        vec3 col; float a;
        if(uDark<.5){
          vec3 moss=vec3(.36,.48,.23), gold=vec3(.86,.68,.32), rose=vec3(.79,.47,.56), teal=vec3(.18,.45,.38);
          col=mix(mix(moss,teal,o.x),mix(gold,rose,o.y),smoothstep(.35,.75,f));
          a=.07+edge*(.4+.38*smoothstep(.3,.8,f))+caustic*(.06+edge*.22);
          col=mix(col,vec3(1.,.97,.86),caustic*.6);
        } else {
          vec3 deep=vec3(.03,.08,.06), pond=vec3(.06,.2,.17), moon=vec3(.82,.86,.72);
          col=mix(deep,pond,f);
          col+=moon*caustic*(.25+.5*edge);
          a=.55+.35*edge;
        }
        /* fireflies by night, pollen by day */
        for(int i=0;i<${FLIES};i++){
          vec2 fp=uFly[i]*vec2(uRes.x/uRes.y,1.); float d=length(q-fp);
          float g=exp(-d*d*1800.)*1.1+exp(-d*d*60.)*.12;
          col+=(uDark>.5?vec3(1.,.86,.42):vec3(.93,.74,.3))*g*uFlyA; a=max(a,g*uFlyA);
        }
        gl_FragColor=vec4(col,clamp(a,0.,1.));
      }`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const U = n => gl.getUniformLocation(pr, n);
    const uRes = U('uRes'), uT = U('uT'), uDark = U('uDark'), uM = U('uM'), uRip = U('uRip'), uFly = U('uFly'), uFlyA = U('uFlyA');
    /* half resolution: it is a wash, and the reading is what needs the pixels */
    const size = () => { const k = Math.min(1, devicePixelRatio) * .5; cv.width = Math.max(2, innerWidth * k | 0); cv.height = Math.max(2, innerHeight * k | 0); gl.viewport(0, 0, cv.width, cv.height); };
    size(); ctx.on(window, 'resize', size);
    const flat = new Float32Array(FLIES * 2);
    let last = 0;
    ctx.loop((t, now) => {
      if (now - last < 33 && !ctx.reduce()) return; last = now;
      const idle = now - lastMove > 4000;
      flies.forEach((f, i) => {
        if (idle) { f.x += (mx - f.x) * .012 * f.s + Math.sin(t * .9 + f.p) * .0016; f.y += (my - f.y) * .012 * f.s + Math.cos(t * .7 + f.p) * .0016; }
        else { f.x += Math.sin(t * .23 * f.s + f.p) * .0009; f.y += Math.cos(t * .19 * f.s + f.p * 1.3) * .0008; }
        if (f.x < -.05) f.x = 1.05; if (f.x > 1.05) f.x = -.05; if (f.y < -.05) f.y = 1.05; if (f.y > 1.05) f.y = -.05;
        flat[i * 2] = f.x; flat[i * 2 + 1] = f.y;
      });
      gl.uniform2f(uRes, cv.width, cv.height); gl.uniform1f(uT, t); gl.uniform1f(uDark, ctx.dark() ? 1 : 0);
      gl.uniform2f(uM, mx, my); gl.uniform3f(uRip, rip[0], rip[1], rip[2]); gl.uniform2fv(uFly, flat);
      gl.uniform1f(uFlyA, (ctx.dark() ? 1 : .5) * (.55 + .45 * Math.sin(t * 2.1)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    let start = performance.now();
    ctx.on(window, 'pointerdown', e => { rip = [e.clientX / innerWidth, 1 - e.clientY / innerHeight, (performance.now() - start) / 1000]; }, { passive: true });
    ctx.cleanup(() => { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); });
  }
  ctx.on(window, 'pointermove', e => {
    mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight; lastMove = performance.now();
    /* liquid light inside whatever acts */
    const b = e.target.closest && e.target.closest('.btn-primary,.case-link,.contact-actions .primary');
    if (b) { const r = b.getBoundingClientRect(); b.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); b.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); }
  }, { passive: true });

  /* ---------- glitter ---------- */
  const GLITTER = () => ctx.dark() ? ['#f2d896', '#e2bd62', '#fff6d6', '#e88fb0', '#8fd49d'] : ['#b8862b', '#e8c66e', '#b24a72', '#1e5c48', '#fff'];
  function glitter(x, y, n = 36, spread = 1) {
    if (ctx.reduce()) return;
    const C = GLITTER();
    for (let i = 0; i < n; i++) {
      const s = doc.createElement('i'); s.className = 'fb-spark';
      const size = 5 + Math.random() * 8; s.style.width = s.style.height = size + 'px';
      s.style.background = C[i % C.length]; s.style.left = x + 'px'; s.style.top = y + 'px'; doc.body.append(s);
      const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 140) * spread;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v * .7 - 50;
      s.animate([
        { transform: 'translate(0,0) scale(0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx * .6}px,${dy * .6}px) scale(1) rotate(90deg)`, opacity: 1, offset: .35 },
        { transform: `translate(${dx}px,${dy + 120}px) scale(.4) rotate(220deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }

  /* ---------- snow: in winter, or when a title is asked three times ---------- */
  let snowing = 0, snowT = 0;
  function snow(ms) {
    if (ctx.reduce()) return;
    snowing = performance.now() + ms;
    if (snowT) return;
    const tick = () => {
      if (performance.now() > snowing) { snowT = 0; return; }
      const f = doc.createElement('i'); f.className = 'fb-snow';
      const s = 3 + Math.random() * 5; f.style.width = f.style.height = s + 'px'; f.style.left = Math.random() * innerWidth + 'px';
      if (!ctx.dark()) f.style.background = '#fffaf0', f.style.boxShadow = '0 0 0 1px rgba(160,140,90,.35),0 0 6px rgba(255,255,255,.9)';
      doc.body.append(f);
      const sway = (Math.random() - .5) * 120;
      f.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${sway}px,${innerHeight * .55}px)` }, { transform: `translate(${-sway * .5}px,${innerHeight + 20}px)` }],
        { duration: 7000 + Math.random() * 5000, easing: 'linear' }).onfinish = () => f.remove();
      snowT = ctx.later(tick, 140 + Math.random() * 160);
    };
    tick();
  }
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  if (m === 11 || (m === 0 && day <= 6)) snow(60000);
  ctx.on(doc, 'click', e => {
    if (e.detail === 3 && e.target.closest && e.target.closest('.d-head h1,.d-hero h1,.h1')) { snow(15000); ctx.announce('It is snowing.'); }
  });

  /* ---------- a flower, where a press is held on empty ground ---------- */
  let hold = 0, hx = 0, hy = 0;
  ctx.on(doc, 'pointerdown', e => {
    if (e.button || (e.target.closest && e.target.closest('a,button,input,select,textarea,label,summary,[role],[contenteditable],.code,pre'))) return;
    hx = e.clientX; hy = e.clientY;
    hold = setTimeout(() => bloom(hx, hy), 650);
  });
  ctx.on(doc, 'pointermove', e => { if (hold && Math.hypot(e.clientX - hx, e.clientY - hy) > 8) { clearTimeout(hold); hold = 0; } }, { passive: true });
  ctx.on(doc, 'pointerup', () => { clearTimeout(hold); hold = 0; });
  ctx.cleanup(() => clearTimeout(hold));
  function bloom(x, y) {
    if (ctx.reduce()) return;
    const petal = ctx.dark() ? '#f2d896' : '#e7a3bd', heart = ctx.dark() ? '#fff6d6' : '#e8c66e';
    const el = doc.createElement('i'); el.className = 'fb-flower'; el.style.left = x + 'px'; el.style.top = y + 'px';
    el.innerHTML = `<svg viewBox="-32 -32 64 64" aria-hidden="true">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="7" ry="14" cy="-13" fill="${petal}" opacity=".92" transform="rotate(${r})"/>`).join('')}<circle r="6" fill="${heart}"/></svg>`;
    doc.body.append(el);
    el.animate([{ transform: 'scale(0) rotate(-60deg)', opacity: 0 }, { transform: 'scale(1.08) rotate(6deg)', opacity: 1, offset: .35 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .7 }, { transform: 'scale(.9) translateY(-10px)', opacity: 0 }],
      { duration: 2600, easing: 'cubic-bezier(.34,1.45,.64,1)' }).onfinish = () => el.remove();
    glitter(x, y, 10, .4);
  }

  return {
    /* a choice leaves a pinch of glitter */
    nudge(el) { const r = el.getBoundingClientRect(); glitter(r.left + Math.min(r.width, 44) / 2, r.top + r.height / 2, 9, .35); },
    /* a success scatters a little glitter from where it happened */
    celebrate(el) { const r = el.getBoundingClientRect(); glitter(r.left + r.width / 2, r.top + r.height / 2, 36); },
  };
});
