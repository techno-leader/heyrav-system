/* Fable world - a Renaissance collage.
   Each page opens on a framed painting: a WebGL oil sky (brushwork clouds
   lit warm on top and cool beneath, cypresses along the bottom, stars at
   night) that drifts with time and leans a little toward the pointer. The
   title, in modern type, sits on it. A click on the painted sky lets a dove
   fly. A success throws gold leaf and a little hot pink; in December, or
   when a title is clicked three times, it snows; a press held on empty
   ground leaves a rose. Everything rests for reduced motion. */
window.heyravWorlds && heyravWorlds.define('fable', ctx => {
  const doc = document;

  /* ---------- the painting ---------- */
  const host = doc.querySelector('.d-head') || doc.querySelector('.d-hero');
  let gl = null;
  if (host) {
    host.classList.add('fb-painted'); ctx.cleanup(() => host.classList.remove('fb-painted'));
    const cv = doc.createElement('canvas'); cv.className = 'fb-canvas'; cv.setAttribute('aria-hidden', 'true');
    host.prepend(cv); ctx.cleanup(() => cv.remove());
    gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (gl) {
      const hero = host.classList.contains('d-hero');
      const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
      const FS = `precision highp float;
        uniform vec2 uRes; uniform float uT, uDark, uHero; uniform vec2 uM;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
        void main(){
          vec2 uv=gl_FragCoord.xy/uRes; float ar=uRes.x/uRes.y; vec2 p=vec2(uv.x*ar,uv.y);
          vec3 top=uDark>.5?vec3(.04,.09,.12):vec3(.16,.34,.44);
          vec3 hor=uDark>.5?vec3(.15,.25,.28):vec3(.66,.76,.75);
          vec3 col=mix(hor,top,smoothstep(.02,1.,uv.y));
          /* brushwork: long horizontal strokes with a little slant */
          float stroke=n(vec2(p.x*2.6+p.y*.8,p.y*46.))*.6+n(vec2(p.x*7.+p.y*2.,p.y*90.))*.4;
          vec2 q=p*vec2(1.5,2.7)+vec2(uT*.01+(uM.x-.5)*.06,(uM.y-.5)*.03);
          float w=fbm(q*1.6+3.1);
          float c=fbm(q+w*.65);
          float mask=smoothstep(.47,.7,c)*smoothstep(.04,.4,uv.y);
          float lit=clamp((fbm(q+w*.65+vec2(.0,.05))-c)*7.+.55,0.,1.);
          vec3 cl=uDark>.5?mix(vec3(.18,.26,.29),vec3(.56,.6,.57),lit):mix(vec3(.5,.56,.6),vec3(.98,.92,.82),lit);
          col=mix(col,cl,mask);
          col+=(stroke-.5)*.06;
          /* cypresses along the bottom: dark flames */
          float tr=0.;
          for(int i=0;i<8;i++){
            float fi=float(i), x0=(fract(fi*.371+.13)*1.1-.05)*ar, wd=.02+.018*fract(fi*.73), ht=.28+.32*fract(fi*.519);
            float dx=(p.x-x0)/wd, prof=ht*(1.-dx*dx*.5)*(1.+.05*sin(p.y*80.+fi*3.));
            tr=max(tr,step(uv.y,prof)*step(abs(dx),1.35));
          }
          col=mix(col,(uDark>.5?vec3(.02,.05,.04):vec3(.09,.15,.1))+(stroke-.5)*.03,tr);
          if(uDark>.5){vec2 g=floor(gl_FragCoord.xy/2.);float s=h(g);col+=step(.997,s)*(.5+.5*sin(uT*2.+s*50.))*smoothstep(.4,.95,uv.y)*(1.-mask)*(1.-tr);}
          /* the title sits on the painting: keep that part deep enough to read */
          float keep=uDark>.5?(uHero>.5?1.15:1.05):(uHero>.5?.52:.5+.38*smoothstep(.72,1.,uv.x));
          col*=keep*(1.-.18*length(uv-.5));
          gl_FragColor=vec4(col,1.);
        }`;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = n => gl.getUniformLocation(pr, n);
      const uRes = U('uRes'), uT = U('uT'), uDark = U('uDark'), uHero = U('uHero'), uM = U('uM');
      let mx = .5, my = .5, tmx = .5, tmy = .5;
      const size = () => { const r = host.getBoundingClientRect(), k = Math.min(1.5, devicePixelRatio || 1); cv.width = Math.max(2, r.width * k | 0); cv.height = Math.max(2, r.height * k | 0); gl.viewport(0, 0, cv.width, cv.height); };
      size(); ctx.on(window, 'resize', size);
      if (window.ResizeObserver) { const ro = new ResizeObserver(size); ro.observe(host); ctx.cleanup(() => ro.disconnect()); }
      ctx.on(host, 'pointermove', e => { const r = host.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width; tmy = 1 - (e.clientY - r.top) / r.height; }, { passive: true });
      let last = 0;
      ctx.loop((t, now) => {
        if (now - last < 33 && !ctx.reduce()) return; last = now;
        mx += (tmx - mx) * .05; my += (tmy - my) * .05;
        gl.uniform2f(uRes, cv.width, cv.height); gl.uniform1f(uT, t); gl.uniform1f(uDark, ctx.dark() ? 1 : 0); gl.uniform1f(uHero, hero ? 1 : 0); gl.uniform2f(uM, mx, my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });
      ctx.cleanup(() => { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); });
      /* a click on the painted sky lets a dove fly */
      ctx.on(host, 'click', e => {
        if (ctx.reduce() || (e.target.closest && e.target.closest('a,button,input,select,label,summary,[role],.kbd,code'))) return;
        const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        const d = doc.createElement('i'); d.className = 'fb-dove'; d.style.left = x - 17 + 'px'; d.style.top = y - 10 + 'px';
        d.innerHTML = '<svg viewBox="0 0 34 20" aria-hidden="true"><path fill="currentColor" d="M17 12c-3-6-8-9-15-8 5 1 8 4 10 8-3 0-5 1-7 3 4-1 8 0 11 1 1 1 3 1 4 0 3-1 7-2 11-1-2-2-4-3-7-3 2-4 5-7 10-8-7-1-12 2-15 8z"/></svg>';
        host.append(d);
        const dir = Math.random() < .5 ? -1 : 1, flap = d.querySelector('svg');
        flap.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-.6)' }, { transform: 'scaleY(1)' }], { duration: 260, iterations: 8 });
        d.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { opacity: 1, offset: .1 }, { transform: `translate(${dir * (180 + Math.random() * 160)}px,${-(90 + Math.random() * 60)}px) scale(1)`, opacity: 0 }],
          { duration: 2100, easing: 'cubic-bezier(.3,.1,.3,1)' }).onfinish = () => d.remove();
      });
    }
  }

  /* ---------- gold leaf and a little pink ---------- */
  function leaf(x, y, n = 30, spread = 1) {
    if (ctx.reduce()) return;
    const C = ['#c9a24d', '#e6c877', '#b08d3c', '#f2dc9b', '#ff3d8b', '#ff7ab0'];
    for (let i = 0; i < n; i++) {
      const s = doc.createElement('i'); s.className = 'fb-leaf'; s.style.background = C[i % C.length];
      s.style.left = x + 'px'; s.style.top = y + 'px'; doc.body.append(s);
      const a = Math.random() * Math.PI * 2, v = (50 + Math.random() * 120) * spread, dx = Math.cos(a) * v, dy = Math.sin(a) * v * .6 - 40;
      s.animate([
        { transform: 'translate(0,0) rotate(0) rotateX(0)', opacity: 1 },
        { transform: `translate(${dx * .6}px,${dy * .6}px) rotate(${Math.random() * 180}deg) rotateX(180deg)`, opacity: 1, offset: .35 },
        { transform: `translate(${dx + (Math.random() - .5) * 60}px,${dy + 140}px) rotate(${Math.random() * 540}deg) rotateX(720deg)`, opacity: 0 },
      ], { duration: 1500 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }

  /* ---------- snow: it is the winter edition, after all ---------- */
  let snowing = 0, snowT = 0;
  function snow(ms) {
    if (ctx.reduce()) return;
    snowing = performance.now() + ms; if (snowT) return;
    const tick = () => {
      if (performance.now() > snowing) { snowT = 0; return; }
      const f = doc.createElement('i'); f.className = 'fb-snow'; const s = 3 + Math.random() * 5; f.style.width = f.style.height = s + 'px'; f.style.left = Math.random() * innerWidth + 'px';
      doc.body.append(f); const sway = (Math.random() - .5) * 120;
      f.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${sway}px,${innerHeight * .55}px)` }, { transform: `translate(${-sway * .5}px,${innerHeight + 20}px)` }], { duration: 7000 + Math.random() * 5000, easing: 'linear' }).onfinish = () => f.remove();
      snowT = ctx.later(tick, 140 + Math.random() * 160);
    };
    tick();
  }
  const d0 = new Date(); if (d0.getMonth() === 11 || (d0.getMonth() === 0 && d0.getDate() <= 6)) snow(60000);
  ctx.on(doc, 'click', e => { if (e.detail === 3 && e.target.closest && e.target.closest('.d-head h1,.d-hero h1,.h1')) { snow(15000); ctx.announce('It is snowing.'); } });

  /* ---------- a rose, where a press is held on empty ground ---------- */
  let hold = 0, hx = 0, hy = 0;
  ctx.on(doc, 'pointerdown', e => { if (e.button || (e.target.closest && e.target.closest('a,button,input,select,textarea,label,summary,[role],[contenteditable],.code,pre,.fb-painted'))) return; hx = e.clientX; hy = e.clientY; hold = setTimeout(() => rose(hx, hy), 650); });
  ctx.on(doc, 'pointermove', e => { if (hold && Math.hypot(e.clientX - hx, e.clientY - hy) > 8) { clearTimeout(hold); hold = 0; } }, { passive: true });
  ctx.on(doc, 'pointerup', () => { clearTimeout(hold); hold = 0; });
  ctx.cleanup(() => clearTimeout(hold));
  function rose(x, y) {
    if (ctx.reduce()) return;
    const el = doc.createElement('i'); el.className = 'fb-flower'; el.style.left = x + 'px'; el.style.top = y + 'px';
    el.innerHTML = `<svg viewBox="-32 -32 64 64" aria-hidden="true">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="8" ry="14" cy="-12" fill="#ff3d8b" opacity=".85" transform="rotate(${r})"/>`).join('')}${[36, 108, 180, 252, 324].map(r => `<ellipse rx="6" ry="9" cy="-7" fill="#ff7ab0" transform="rotate(${r})"/>`).join('')}<circle r="5" fill="#e6c877"/></svg>`;
    doc.body.append(el);
    el.animate([{ transform: 'scale(0) rotate(-60deg)', opacity: 0 }, { transform: 'scale(1.06) rotate(6deg)', opacity: 1, offset: .35 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .7 }, { transform: 'scale(.9) translateY(-10px)', opacity: 0 }],
      { duration: 2600, easing: 'cubic-bezier(.34,1.45,.64,1)' }).onfinish = () => el.remove();
    leaf(x, y, 8, .35);
  }

  return {
    nudge(el) { const r = el.getBoundingClientRect(); leaf(r.left + Math.min(r.width, 44) / 2, r.top + r.height / 2, 7, .3); },
    celebrate(el) { const r = el.getBoundingClientRect(); leaf(r.left + r.width / 2, r.top + r.height / 2, 34); },
  };
});
