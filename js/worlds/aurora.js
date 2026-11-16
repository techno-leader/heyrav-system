/* Aurora world - the sky.
   Curtains of light drawn the way the Aurora hero tool draws them (layered
   fbm bands with a hard lower edge and rays fading upward), over stars by
   night or ice by day. The curtains lean toward the pointer and brighten as
   it moves; a click on open sky sends a ripple through them; now and then a
   shooting star crosses, and catching one is a wish. A success sends a flare.
   Glass edges glow where the pointer is. Reduced motion: one still frame. */
window.heyravWorlds && heyravWorlds.define('aurora', ctx => {
  const doc = document;
  const layer = ctx.layer('au-sky');
  const cv = doc.createElement('canvas'); layer.append(cv);
  const gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });
  let mx = .5, my = .7, energy = 0, rip = [-9, -9, -99], T0 = performance.now();
  const now = () => (performance.now() - T0) / 1000;
  if (gl) {
    const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FS = `precision highp float;
      uniform vec2 uRes; uniform float uT, uDark, uE; uniform vec2 uM; uniform vec3 uRip;
      float hash13(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p*=2.02;a*=.5;}return s;}
      vec3 ramp(float t){
        vec3 a=uDark>.5?vec3(.24,.98,.66):vec3(.05,.62,.44);
        vec3 b=uDark>.5?vec3(.27,.78,1.):vec3(.11,.46,.84);
        vec3 c=uDark>.5?vec3(.66,.46,1.):vec3(.46,.29,.86);
        return t<.5?mix(a,b,t*2.):mix(b,c,(t-.5)*2.);}
      void main(){
        vec2 uv=gl_FragCoord.xy/uRes; float ar=uRes.x/uRes.y;
        vec2 p=(uv-vec2(.5,.66))*vec2(ar,1.)*1.7;
        /* a click sends a ripple through the field */
        vec2 d=(uv-uRip.xy)*vec2(ar,1.); float r=length(d)+1e-4, age=uT-uRip.z, front=age*.55-r;
        vec2 warp=(d/r)*sin(front*26.)*exp(-max(front,0.)*5.)*smoothstep(0.,.05,front)*exp(-age*.9)*.09;
        p+=warp*1.7;
        /* the pointer: curtains lean toward it, brighter as it moves */
        vec2 m=(uM-vec2(.5,.66))*vec2(ar,1.)*1.7;
        float near=exp(-pow(p.x-m.x,2.)*1.6);
        float T=uT*.09;
        float acc=0.,cacc=0.;
        for(int i=0;i<4;i++){
          float fi=float(i), off=fi*.55;
          float w1=fbm(vec3(p.x*.8+off*3.1,T*.25+off,off*3.));
          float w2=fbm(vec3(p.x*1.9-off*2.,T*.15,5.+off));
          float base=(w1-.5)*1.15+(w2-.5)*.5+.12*p.x+(fi-1.5)*.2+near*(m.y-p.y)*.08;
          float h=p.y-base;
          float prof=smoothstep(-.07,.025,h)*exp(-max(h,0.)/.55);
          float ray=.55+.45*fbm(vec3(p.x*7.+off*11.,T*.6,3.));
          float band=pow(prof,1.6)*ray; acc+=band; cacc+=band*clamp(h/.55*.6+fi*.08,0.,1.);
        }
        float cov=clamp(acc,0.,1.); float ct=acc>1e-4?cacc/acc:0.;
        cov*= .85+uE*.7+near*uE*.6;
        vec3 col=ramp(ct);
        if(uDark>.5){
          vec3 sky=mix(vec3(.012,.02,.055),vec3(.03,.05,.11),uv.y);
          vec2 g=floor(gl_FragCoord.xy/1.5); float s=hash13(vec3(g,7.));
          float star=step(.9965,s)*(.55+.45*sin(uT*2.+s*80.))*smoothstep(.15,.8,uv.y);
          gl_FragColor=vec4(sky+col*cov*.95+vec3(star)*(1.-cov),1.);
        } else {
          gl_FragColor=vec4(col,cov*.42);
        }
      }`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const U = n => gl.getUniformLocation(pr, n);
    const uRes = U('uRes'), uT = U('uT'), uDark = U('uDark'), uE = U('uE'), uM = U('uM'), uRip = U('uRip');
    const size = () => { const k = Math.min(1, devicePixelRatio) * .5; cv.width = Math.max(2, innerWidth * k | 0); cv.height = Math.max(2, innerHeight * k | 0); gl.viewport(0, 0, cv.width, cv.height); };
    size(); ctx.on(window, 'resize', size);
    let last = 0;
    ctx.loop((t, ms) => {
      if (ms - last < 33 && !ctx.reduce()) return; last = ms;
      energy *= .965;
      gl.uniform2f(uRes, cv.width, cv.height); gl.uniform1f(uT, now()); gl.uniform1f(uDark, ctx.dark() ? 1 : 0);
      gl.uniform1f(uE, Math.min(1, energy)); gl.uniform2f(uM, mx, my); gl.uniform3f(uRip, rip[0], rip[1], rip[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    ctx.cleanup(() => { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); });
  }

  /* the pointer stirs the sky, and lights the glass it crosses */
  let px = 0, py = 0;
  ctx.on(window, 'pointermove', e => {
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    energy = Math.min(1.2, energy + Math.hypot(dx, dy) / 900);
    mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight;
    const g = e.target.closest && e.target.closest('.card,.case-nav a,.d-wcard,.d-tile,.ia-leaf');
    if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--gx', (e.clientX - r.left) + 'px'); g.style.setProperty('--gy', (e.clientY - r.top) + 'px'); }
  }, { passive: true });
  /* a click on open sky - not on anything that acts or reads - sends a ripple */
  ctx.on(doc, 'pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,input,select,textarea,label,summary,[role],.d-panel,.d-side,.d-k,dialog')) return;
    rip = [e.clientX / innerWidth, 1 - e.clientY / innerHeight, now()]; energy = 1.2;
  });

  /* ---------- shooting stars: rare, and catchable ---------- */
  function shoot() {
    if (ctx.reduce() || doc.hidden) return schedule();
    const s = doc.createElement('button'); s.type = 'button'; s.className = 'au-shoot'; s.setAttribute('aria-label', 'A shooting star'); s.tabIndex = -1;
    const y0 = 40 + Math.random() * innerHeight * .3, x0 = innerWidth * (.15 + Math.random() * .5), ang = 18 + Math.random() * 14;
    s.style.transform = `translate(${x0}px,${y0}px) rotate(${ang}deg)`;
    doc.body.append(s);
    const dist = 420 + Math.random() * 260, rad = ang * Math.PI / 180;
    const a = s.animate([{ transform: `translate(${x0}px,${y0}px) rotate(${ang}deg)`, opacity: 0 }, { opacity: 1, offset: .15 },
      { transform: `translate(${x0 + Math.cos(rad) * dist}px,${y0 + Math.sin(rad) * dist}px) rotate(${ang}deg)`, opacity: 0 }], { duration: 2200, easing: 'cubic-bezier(.3,.1,.4,1)' });
    a.onfinish = () => { s.remove(); schedule(); };
    s.addEventListener('click', () => {
      const r = s.getBoundingClientRect(); a.cancel(); s.remove();
      flare(r.left + r.width / 2, r.top + r.height / 2, 34);
      window.heyrav && heyrav.toast('A wish, kept.', { tone: 'ok' });
      energy = 1.4; schedule();
    }, { once: true });
    ctx.cleanup(() => s.remove());
  }
  let shootT = 0;
  const schedule = () => { clearTimeout(shootT); shootT = ctx.later(shoot, 22000 + Math.random() * 40000); };
  ctx.later(shoot, 9000);

  /* ---------- a flare: light gathers and scatters ---------- */
  function flare(x, y, n = 24) {
    if (ctx.reduce()) return;
    const C = ['#4ff0b0', '#4fc3ff', '#a77bff', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const f = doc.createElement('i'); f.className = 'au-flare'; const c = C[i % C.length];
      f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.background = c; f.style.boxShadow = `0 0 12px 3px ${c}`;
      doc.body.append(f);
      const a = i / n * Math.PI * 2 + Math.random() * .3, v = 50 + Math.random() * 110;
      f.animate([{ transform: 'scale(1.4)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 30}px) scale(.2)`, opacity: 0 }],
        { duration: 1000 + Math.random() * 500, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => f.remove();
    }
    rip = [x / innerWidth, 1 - y / innerHeight, now()];
  }

  return {
    nudge(el) { const r = el.getBoundingClientRect(); flare(r.left + Math.min(r.width, 44) / 2, r.top + r.height / 2, 8); },
    celebrate(el) { const r = el.getBoundingClientRect(); flare(r.left + r.width / 2, r.top + r.height / 2); energy = 1.2; },
  };
});
