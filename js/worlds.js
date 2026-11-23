/* worlds.js - one system, many worlds. A world is token values and a few
   flourishes scoped to [data-world] on <html> (no attribute is Studio), plus
   an optional module - js/worlds/<id>.js - that brings the world's scene,
   its hidden interactions and the way its components behave. This file
   switches worlds in one click: fonts, icon set, voice, the reveal, and the
   module's life cycle. Registry: js/worlds-data.js (generated).

   Markup:  <button data-world-set="pixel">Pixel</button>
            <svg class="icon" data-i="check">   - swapped for the world's icon set
            <span data-say="toc">On this page</span> - reworded in the world's voice
   Keys:    R - a random world (not while typing) · Esc - back to the world before the first R
            <button class="keycap" data-world-random> - the same, as a key you press
   Script:  heyravWorlds.set(id) · .random() · .current() · .say(key, fallback) · .celebrate(el)
            heyravWorlds.define(id, ctx => ({ unmount, celebrate }))   (modules)
            'worldchange' event on window */
(() => {
  const root = document.documentElement;
  const LIST = window.HR_WORLDS || [];
  const BY = Object.fromEntries(LIST.map(w => [w.id, w]));
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const current = () => root.dataset.world || 'studio';
  const HERE = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : '/js/';

  /* ---------- loading: a world's fonts, icons and module arrive only when visited ---------- */
  const scripts = {};
  const script = src => scripts[src] || (scripts[src] = new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), { src, async: true, onload: res, onerror: rej });
    document.head.append(s);
  }));
  function fonts(w) {
    if (!w || !w.fonts) return Promise.resolve();
    let link = document.querySelector(`link[data-world-fonts="${w.id}"]`);
    const sheet = link ? Promise.resolve() : new Promise(res => {
      link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: w.fonts });
      link.dataset.worldFonts = w.id; link.onload = link.onerror = res;
      document.head.append(link);
    });
    const faces = sheet.then(() => Promise.all((w.families || []).map(f => document.fonts.load(`1em ${f}`).catch(() => {}))));
    return Promise.race([faces, new Promise(r => setTimeout(r, 900))]);
  }
  /* each module and icon set carries its own content hash, so a change to one is never served stale */
  const iconSet = w => (w && w.icons) ? script(`${HERE}icons/${w.icons}.js?v=${(w.v && w.v.i) || ''}`).catch(() => {}) : Promise.resolve();
  const moduleOf = w => (w && w.module) ? script(`${HERE}worlds/${w.id}.js?v=${(w.v && w.v.m) || ''}`).catch(() => {}) : Promise.resolve();
  const warm = w => Promise.all([fonts(w), iconSet(w)]);

  /* ---------- icons: same name, the world's drawing ---------- */
  const ORIGINAL = new WeakMap();
  function swapIcon(svg, set) {
    const n = svg.dataset.i, S = set && window.HR_ICONS && window.HR_ICONS[set];
    if (!ORIGINAL.has(svg)) ORIGINAL.set(svg, [svg.getAttribute('viewBox'), svg.innerHTML]);
    if (S && S.i[n]) { if (svg.dataset.iset !== set) { svg.setAttribute('viewBox', S.vb); svg.innerHTML = S.i[n]; svg.dataset.iset = set; } }
    else if (svg.dataset.iset) { const [vb, html] = ORIGINAL.get(svg); svg.setAttribute('viewBox', vb); svg.innerHTML = html; delete svg.dataset.iset; }
  }
  const swapIcons = (scope, w) => scope.querySelectorAll('svg[data-i]').forEach(s => swapIcon(s, w && w.icons));
  /* icons added later (toasts, menus) take the world's set too */
  new MutationObserver(list => {
    const w = BY[current()]; if (!w || !w.icons) return;
    for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches('svg[data-i]')) swapIcon(n, w.icons); else swapIcons(n, w); }
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- voice: a few words reworded per world; Studio's are kept to restore ---------- */
  function voice(w) {
    document.querySelectorAll('[data-say]').forEach(el => {
      if (!('say0' in el.dataset)) el.dataset.say0 = el.innerHTML;
      const v = w && w.voice && w.voice[el.dataset.say];
      el.innerHTML = v != null ? v : el.dataset.say0;
    });
    document.querySelectorAll('[data-say-ph]').forEach(el => {
      if (!('sayPh0' in el.dataset)) el.dataset.sayPh0 = el.placeholder;
      const v = w && w.voice && w.voice[el.dataset.sayPh];
      el.placeholder = v != null ? v : el.dataset.sayPh0;
    });
  }
  const say = (key, fallback) => { const w = BY[current()]; return (w && w.voice && w.voice[key] != null) ? w.voice[key] : fallback; };

  /* ---------- modules ---------- */
  const DEFS = {};
  let live = null, liveId = null;
  function context(id) {
    const offs = [];
    const ctx = {
      id, root, here: HERE,
      reduce: () => reduce.matches, fine: () => fine.matches,
      dark: () => root.dataset.theme === 'dark',
      say, icon: (n, cls = 'icon') => { const S = window.HR_ICONS && window.HR_ICONS[BY[id] && BY[id].icons]; return S && S.i[n] ? `<svg class="${cls}" viewBox="${S.vb}" aria-hidden="true">${S.i[n]}</svg>` : ''; },
      /* a fixed layer, removed with the world; behind content unless asked */
      layer(cls, front) {
        const el = document.createElement('div'); el.className = 'w-layer ' + cls; el.setAttribute('aria-hidden', 'true');
        if (front) el.dataset.front = ''; document.body[front ? 'append' : 'prepend'](el);
        offs.push(() => el.remove()); return el;
      },
      on(target, type, fn, opts) { target.addEventListener(type, fn, opts); offs.push(() => target.removeEventListener(type, fn, opts)); },
      /* an animation loop that sleeps while the tab is hidden or motion is reduced */
      loop(fn) {
        let raf = 0, t0 = performance.now(), on = true;
        const tick = t => { raf = 0; if (!on) return; fn((t - t0) / 1000, t); if (!document.hidden && !reduce.matches) raf = requestAnimationFrame(tick); };
        const wake = () => { if (on && !raf && !document.hidden && !reduce.matches) raf = requestAnimationFrame(tick); };
        document.addEventListener('visibilitychange', wake); reduce.addEventListener('change', wake);
        wake(); if (reduce.matches) fn(0, t0);
        offs.push(() => { on = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', wake); reduce.removeEventListener('change', wake); });
      },
      onTheme(fn) { const mo = new MutationObserver(() => fn(ctx.dark())); mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] }); offs.push(() => mo.disconnect()); },
      later(fn, ms) { const t = setTimeout(fn, ms); offs.push(() => clearTimeout(t)); return t; },
      cleanup(fn) { offs.push(fn); },
      /* a polite announcement for screen readers, for anything a scene says */
      announce(text) { let r = document.getElementById('w-live'); if (!r) { r = Object.assign(document.createElement('div'), { id: 'w-live', className: 'sr-only' }); r.setAttribute('aria-live', 'polite'); document.body.append(r); } r.textContent = ''; setTimeout(() => { r.textContent = text; }, 30); },
    };
    ctx._off = () => { while (offs.length) try { offs.pop()(); } catch {} };
    return ctx;
  }
  function unmount() { if (live) { try { live.api && live.api.unmount && live.api.unmount(); } catch {} live.ctx._off(); } live = null; liveId = null; }
  function mount(id) {
    if (liveId === id) return;
    unmount();
    if (!DEFS[id]) return;
    const ctx = context(id);
    liveId = id; live = { ctx, api: null };
    try { live.api = DEFS[id](ctx) || {}; } catch (e) { console.error(e); }
  }
  function define(id, factory) { DEFS[id] = factory; if (current() === id) mount(id); }

  /* ---------- switching ---------- */
  function apply(id) {
    if (id === 'studio') delete root.dataset.world; else root.dataset.world = id;
    store.set('hr-world', id);
    document.querySelectorAll('[data-world-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.worldSet === id)));
    swapIcons(document, BY[id]);
    voice(BY[id]);
    mount(id);
    dispatchEvent(new CustomEvent('worldchange', { detail: { world: id } }));
  }
  async function set(id, from) {
    if (!BY[id] || id === current()) return;
    await Promise.all([warm(BY[id]), moduleOf(BY[id])]);
    const done = () => root.classList.remove('w-switching');
    if (!document.startViewTransition || reduce.matches) {
      root.classList.add('w-switching'); apply(id);
      requestAnimationFrame(() => requestAnimationFrame(done));
      return;
    }
    /* the new world spreads from where it was asked for */
    const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    root.style.setProperty('--wx', x + 'px'); root.style.setProperty('--wy', y + 'px');
    root.style.setProperty('--wr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
    root.classList.add('w-switching');
    const t = document.startViewTransition(() => apply(id));
    t.finished.finally(done); setTimeout(done, 2500);
  }
  /* a success worth celebrating: each world answers in its own way */
  const celebrate = (el, kind) => { try { live && live.api && live.api.celebrate && live.api.celebrate(el, kind); } catch {} };

  document.addEventListener('click', e => { const b = e.target.closest('[data-world-set]'); if (b) set(b.dataset.worldSet, b); });
  /* small choices - a tick, a switch, a tab, a chip - are answered in the world's own way */
  const nudge = (el, kind) => { if (reduce.matches) return; try { live && live.api && live.api.nudge && live.api.nudge(el, kind); } catch {} };
  document.addEventListener('change', e => { const i = e.target; if (i.matches && i.matches('.check input:checked,.tgl input:checked')) nudge(i.closest('.check,.tgl') || i, 'on'); });
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('.chip,[role="tab"],.seg button'); if (t) nudge(t, 'pick'); });
  document.addEventListener('pointerover', e => { const b = e.target.closest('[data-world-set]'); if (b) { const w = BY[b.dataset.worldSet]; warm(w); moduleOf(w); } }, { passive: true });
  addEventListener('storage', e => { if (e.key === 'hr-world' && e.newValue && BY[e.newValue] && e.newValue !== current()) Promise.all([warm(BY[e.newValue]), moduleOf(BY[e.newValue])]).then(() => apply(e.newValue)); });

  /* R: a random world. Every world comes round once before any repeats, and the
     next one's fonts, icons and module load while this one is being looked at,
     so the press after this one switches at once. */
  let bag = [], next = null, rolling = false;
  const idle = fn => (window.requestIdleCallback || (f => setTimeout(f, 200)))(fn);
  function draw() {
    if (!bag.length) {
      bag = LIST.map(w => w.id);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    let id = bag.shift();
    if (id === current()) { bag.push(id); id = bag.shift(); }
    return id;
  }
  /* keys ([data-world-random], the .keycap component) show the next world in their pulse */
  const keys = () => document.querySelectorAll('[data-world-random]');
  function paintKeys() {
    const w = BY[next]; if (!w) return;
    keys().forEach(k => {
      (w.chips || []).forEach((c, i) => k.style.setProperty('--kc-next-' + 'abc'[i], c));
      k.dataset.next = w.name;
      k.setAttribute('aria-label', `A random world. Next: ${w.name}`);
    });
  }
  const prepare = full => { next = draw(); paintKeys(); const w = BY[next]; idle(() => { warm(w); if (full) moduleOf(w); }); };
  let origin = null; // the world before the first R, for Esc
  function random(from) {
    if (rolling || LIST.length < 2) return;
    if (origin == null) origin = current();
    const id = next && next !== current() ? next : draw(); next = null;
    const pick = document.querySelector(`.d-worlds [data-world-set="${id}"]`);
    rolling = true;
    set(id, from || (pick && pick.offsetParent ? pick : null)).finally(() => { rolling = false; prepare(true); });
  }
  function back() { if (origin == null || rolling) return false; const o = origin; origin = null; if (o !== current()) set(o); return true; }
  const typing = t => t.closest?.('input,textarea,select,[contenteditable]');
  const busy = () => document.querySelector('dialog[open],[aria-expanded="true"][aria-controls]') || root.classList.contains('ed-on');
  const press = on => keys().forEach(k => k.classList.toggle('is-down', on));
  /* Esc goes back only when it has nothing else to close: read that before anything else hears the key */
  let escFree = false;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') escFree = !busy() && !typing(e.target); }, true);
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    if (e.key === 'Escape') { if (escFree && !e.defaultPrevented) back(); return; }
    if (e.defaultPrevented) return;
    if ((e.key !== 'r' && e.key !== 'R') || busy()) return;
    e.preventDefault(); press(true);
    if (!e.repeat) random(Array.from(keys()).find(k => k.getBoundingClientRect().bottom > 0 && k.getBoundingClientRect().top < innerHeight));
  });
  document.addEventListener('keyup', e => { if (e.key === 'r' || e.key === 'R') press(false); });
  addEventListener('blur', () => press(false));
  /* the key itself: held under a finger, the world changes when it lets go */
  document.addEventListener('pointerdown', e => { const k = e.target.closest?.('[data-world-random]'); if (k && e.button === 0) k.classList.add('is-down'); });
  const lift = () => keys().forEach(k => k.classList.remove('is-down'));
  document.addEventListener('pointerup', lift); document.addEventListener('pointercancel', lift);
  document.addEventListener('click', e => { const k = e.target.closest?.('[data-world-random]'); if (k) random(k); });
  addEventListener('load', () => idle(() => prepare(false)), { once: true });
  /* a world picked by hand may be the one that was coming next: draw again */
  addEventListener('worldchange', () => { if (next === current()) prepare(false); });

  window.heyravWorlds = { set, random, back, peek: () => next, current, say, celebrate, define, list: () => LIST.map(w => w.id), get: id => BY[id || current()] };

  const start = BY[current()] ? current() : 'studio';
  if (start !== current()) delete root.dataset.world;
  document.querySelectorAll('[data-world-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.worldSet === start)));
  if (start !== 'studio') {
    const w = BY[start];
    iconSet(w).then(() => swapIcons(document, w));
    voice(w);
    moduleOf(w);
    /* components that set up before this file ran hear the world once */
    dispatchEvent(new CustomEvent('worldchange', { detail: { world: start, boot: true } }));
  }
})();
