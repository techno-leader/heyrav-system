/* worlds.js - one system, many worlds. A world is a set of token values and
   a few flourishes, scoped to [data-world] on <html>; no attribute is Studio.
   This file switches between them in one click: it loads the world's fonts,
   reveals the new world from the point that was clicked, and runs the small
   ambient layer a world may have (clouds, motes, aurora, a wet sheen).
   Registry: js/worlds-data.js (generated). No dependencies.

   Markup:  <button data-world-set="pixel">Pixel</button>
   Script:  heyravWorlds.set('aurora')  ·  heyravWorlds.current()  ·  'worldchange' event */
(() => {
  const root = document.documentElement;
  const LIST = window.HR_WORLDS || [];
  const BY = Object.fromEntries(LIST.map(w => [w.id, w]));
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const current = () => root.dataset.world || 'studio';

  /* ---------- fonts: only a world you visit is ever downloaded ---------- */
  function fonts(w) {
    if (!w || !w.fonts) return Promise.resolve();
    let link = document.querySelector(`link[data-world-fonts="${w.id}"]`);
    const sheet = link ? Promise.resolve() : new Promise(res => {
      link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: w.fonts });
      link.dataset.worldFonts = w.id; link.onload = link.onerror = res;
      document.head.append(link);
    });
    /* the stylesheet only declares the faces; asking for each one starts the download */
    const faces = sheet.then(() => Promise.all((w.families || []).map(f => document.fonts.load(`1em ${f}`).catch(() => {}))));
    return Promise.race([faces, new Promise(r => setTimeout(r, 900))]);
  }

  /* ---------- ambient layers ---------- */
  let sky = null, offFx = null;
  const motes = (n, cls) => Array.from({ length: n }, (_, i) => `<i class="${cls}" style="--i:${i};--x:${(i * 37 + 11) % 100};--y:${(i * 53 + 7) % 100};--s:${.6 + ((i * 29) % 10) / 10};--t:${14 + (i * 7) % 16}s;--d:${-((i * 3.7) % 20)}s"></i>`).join('');
  const SKY = {
    clouds: () => motes(6, 'w-cloud') + '<i class="w-stars"></i><i class="w-stars w-stars-2"></i>',
    motes: () => motes(18, 'w-mote'),
    aurora: () => '<i class="w-stars"></i><i class="w-band w-band-1"></i><i class="w-band w-band-2"></i><i class="w-band w-band-3"></i>',
    sheen: () => '<i class="w-sheen"></i>',
  };
  /* pointer-driven extras: the fairy trail and the wet sheen */
  const POINTER = {
    motes() {
      if (!fine.matches) return null;
      let last = 0, live = 0;
      const on = e => {
        const now = performance.now(); if (now - last < 45 || live > 14 || reduce.matches) return; last = now;
        const s = document.createElement('i'); s.className = 'w-spark'; s.setAttribute('aria-hidden', 'true');
        s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
        document.body.append(s); live++;
        const dx = (Math.random() - .5) * 28, dy = 18 + Math.random() * 22, r = (Math.random() - .5) * 120;
        s.animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(0)' }, { opacity: 0, transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.2) rotate(${r}deg)` }],
          { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => { s.remove(); live--; };
      };
      addEventListener('pointermove', on, { passive: true });
      return () => removeEventListener('pointermove', on);
    },
    sheen() {
      if (!fine.matches) return null;
      let raf = 0, x = 50, y = 30;
      const on = e => { x = e.clientX / innerWidth * 100; y = e.clientY / innerHeight * 100; if (!raf) raf = requestAnimationFrame(() => { raf = 0; root.style.setProperty('--mx', x.toFixed(1) + '%'); root.style.setProperty('--my', y.toFixed(1) + '%'); }); };
      addEventListener('pointermove', on, { passive: true });
      return () => { removeEventListener('pointermove', on); root.style.removeProperty('--mx'); root.style.removeProperty('--my'); };
    },
  };
  function mountFx(w) {
    offFx && offFx(); offFx = null;
    if (sky) { sky.remove(); sky = null; }
    if (!w || !w.fx || !SKY[w.fx]) return;
    sky = Object.assign(document.createElement('div'), { className: 'w-sky', innerHTML: SKY[w.fx]() });
    sky.setAttribute('aria-hidden', 'true');
    document.body.prepend(sky);
    if (POINTER[w.fx]) offFx = POINTER[w.fx]();
  }

  /* ---------- switching ---------- */
  function apply(id) {
    if (id === 'studio') delete root.dataset.world; else root.dataset.world = id;
    store.set('hr-world', id);
    document.querySelectorAll('[data-world-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.worldSet === id)));
    mountFx(BY[id]);
    dispatchEvent(new CustomEvent('worldchange', { detail: { world: id } }));
  }
  async function set(id, from) {
    if (!BY[id] || id === current()) return;
    await fonts(BY[id]);
    if (!document.startViewTransition || reduce.matches) {
      root.classList.add('w-switching'); apply(id);
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('w-switching')));
      return;
    }
    /* the new world spreads from where it was asked for */
    const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    root.style.setProperty('--wx', x + 'px'); root.style.setProperty('--wy', y + 'px');
    root.style.setProperty('--wr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
    root.classList.add('w-switching');
    const t = document.startViewTransition(() => apply(id));
    const done = () => root.classList.remove('w-switching');
    t.finished.finally(done); setTimeout(done, 2500);
  }

  document.addEventListener('click', e => { const b = e.target.closest('[data-world-set]'); if (b) set(b.dataset.worldSet, b); });
  /* warm the fonts on intent, so the switch itself rarely waits */
  document.addEventListener('pointerover', e => { const b = e.target.closest('[data-world-set]'); if (b) fonts(BY[b.dataset.worldSet]); }, { passive: true });
  /* another tab changed world: follow it */
  addEventListener('storage', e => { if (e.key === 'hr-world' && e.newValue && BY[e.newValue] && e.newValue !== current()) fonts(BY[e.newValue]).then(() => apply(e.newValue)); });
  reduce.addEventListener('change', () => mountFx(BY[current()]));

  const start = BY[current()] ? current() : 'studio';
  if (start !== current()) delete root.dataset.world;
  document.querySelectorAll('[data-world-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.worldSet === start)));
  mountFx(BY[start]);
  window.heyravWorlds = { set, current, list: () => LIST.map(w => w.id) };
})();
