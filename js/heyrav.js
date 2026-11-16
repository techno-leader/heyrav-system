/* heyrav.js - behaviour for the interactive components. Vanilla, no deps.
   Everything is wired by data attributes or ARIA roles, so markup stays the
   API: drop the element in, the script finds it. Safe to load once per page. */
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rate = 1, slow = 0.25; // animation speed - see "speed" below

  /* glossary + popover: [aria-controls] toggles its box; outside click / Esc closes */
  document.addEventListener('click', e => {
    const t = e.target.closest('.define-t,[data-pop],[data-menu]');
    $$('.define-t[aria-expanded="true"],[data-pop][aria-expanded="true"],[data-menu][aria-expanded="true"]').forEach(b => {
      if (b !== t && !document.getElementById(b.getAttribute('aria-controls'))?.contains(e.target)) close(b);
    });
    if (!t) return;
    const box = document.getElementById(t.getAttribute('aria-controls'));
    if (!box) return;
    const open = t.getAttribute('aria-expanded') === 'true';
    open ? close(t) : (t.setAttribute('aria-expanded', 'true'), box.hidden = false, t.hasAttribute('data-menu') && box.querySelector('[role="menuitem"]')?.focus());
  });
  function close(b) { b.setAttribute('aria-expanded', 'false'); const x = document.getElementById(b.getAttribute('aria-controls')); if (x) x.hidden = true; }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('[aria-expanded="true"][aria-controls]').forEach(b => { close(b); b.focus(); });
    const item = e.target.closest?.('[role="menuitem"]');
    if (item && /Arrow(Up|Down)/.test(e.key)) {
      e.preventDefault();
      const items = $$('[role="menuitem"]', item.closest('[role="menu"]'));
      const i = items.indexOf(item) + (e.key === 'ArrowDown' ? 1 : -1);
      items[(i + items.length) % items.length].focus();
    }
  });

  /* tabs: roving tabindex, arrows move, selection follows focus */
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const pick = t => tabs.forEach(x => {
      const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
    });
    tabs.forEach(t => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
        const n = tabs[(tabs.indexOf(t) + d + tabs.length) % tabs.length]; pick(n); n.focus();
      });
    });
  });

  /* segmented + chip groups: one pressed at a time within [data-single] */
  document.addEventListener('click', e => {
    const b = e.target.closest('.seg button,[data-single] > [aria-pressed]');
    if (!b) return;
    const g = b.parentElement;
    if (g.matches('.seg,[data-single]')) $$(':scope > [aria-pressed]', g).forEach(x => x.setAttribute('aria-pressed', x === b));
    else b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.chip[aria-pressed]');
    if (b && !b.parentElement.matches('[data-single]')) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });

  /* slider fill + live value */
  const fill = r => { r.style.setProperty('--f', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); const v = r.closest('.field,.row')?.querySelector('.val'); if (v) v.textContent = r.value + (r.dataset.unit || ''); };
  $$('.rng').forEach(r => { fill(r); r.addEventListener('input', () => fill(r)); });

  /* dialogs: [data-open="id"] opens, [data-close] closes, backdrop click closes */
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o) { const d = document.getElementById(o.dataset.open); d?.showModal(); return; }
    const c = e.target.closest('[data-close]');
    if (c) { c.closest('dialog')?.close(); return; }
    if (e.target instanceof HTMLDialogElement && e.target.open) {
      const r = e.target.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside || e.target.classList.contains('lb')) e.target.close();
    }
  });

  /* lightbox: any img.zoomable opens a shared <dialog class="lb"> */
  document.addEventListener('click', e => {
    const img = e.target.closest('img.zoomable'); if (!img) return;
    let lb = document.getElementById('hr-lb');
    if (!lb) {
      lb = document.createElement('dialog'); lb.id = 'hr-lb'; lb.className = 'lb';
      lb.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure><button class="btn btn-ghost btn-icon lb-close" data-close aria-label="Close"><svg class="icon" viewBox="0 0 256 256"><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128z"/></svg></button>';
      document.body.append(lb);
    }
    lb.querySelector('img').src = img.currentSrc || img.src; lb.querySelector('img').alt = img.alt;
    lb.querySelector('figcaption').textContent = img.dataset.caption || img.alt;
    lb.showModal();
  });

  /* toast: window.heyrav.toast('Copied', {tone:'ok'}) */
  const icons = {
    ok: '<svg class="icon" viewBox="0 0 256 256" data-i="check-circle"><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0zM232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104zm-16 0a88 88 0 1 0-88 88 88.1 88.1 0 0 0 88-88z"/></svg>',
    danger: '<svg class="icon" viewBox="0 0 256 256" data-i="warning-circle"><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88zm-8-80V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0zm20 36a12 12 0 1 1-12-12 12 12 0 0 1 12 12z"/></svg>'
  };
  function toast(msg, { tone, ms = 2400 } = {}) {
    let host = document.querySelector('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.append(host); }
    const t = document.createElement('div'); t.className = 'toast' + (tone ? ' toast-' + tone : '');
    t.innerHTML = (icons[tone] || '') + '<span></span>'; t.querySelector('span').textContent = msg;
    host.append(t);
    if (tone === 'ok') window.heyravWorlds?.celebrate(t, 'toast');
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), reduce ? 0 : 320); }, ms);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-toast]'); if (b) toast(b.dataset.toast, { tone: b.dataset.tone }); });

  /* pending buttons: [data-pending] spins for 1.6s (demo) */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pending]'); if (!b) return;
    b.classList.add('is-pending'); b.setAttribute('aria-busy', 'true');
    setTimeout(() => { b.classList.remove('is-pending'); b.removeAttribute('aria-busy'); window.heyravWorlds?.celebrate(b, 'done'); }, 1600);
  });

  /* scroll reveal: .rv gets .in once, on entry */
  if (reduce || !('IntersectionObserver' in window)) $$('.rv').forEach(x => x.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .15 });
    $$('.rv').forEach(x => io.observe(x));
  }

  /* count-up: [data-count="399"] data-pre="₹" data-suf="X" */
  function countUp(el) {
    const to = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    const pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    if (reduce) { el.textContent = pre + to.toFixed(dec) + suf; return; }
    // elapsed time advances at the current speed, so slow-motion slows this too
    let last = performance.now(), ms = 0; const dur = 1200;
    const step = now => { ms += (now - last) * rate; last = now; const k = Math.min(1, ms / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = pre + (to * e).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const cio = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } }), { threshold: .5 });
  $$('[data-count]').forEach(x => cio ? cio.observe(x) : countUp(x));

  /* comet: .progress tracks document scroll */
  const bar = document.querySelector('.progress');
  if (bar) {
    const set = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%'; };
    addEventListener('scroll', set, { passive: true }); set();
  }

  /* speed: play every animation on the page at a fraction of its speed, to
     judge easing, origin and overlap frame by frame. Covers CSS transitions,
     CSS animations and the Web Animations API through document.getAnimations();
     rAF-driven motion opts in by reading heyrav.speed() or the heyrav:speed
     event. Buttons: [data-speed="0.25"]. S toggles between 1x and the last
     slow speed, but only on pages that carry a speed control. */
  const retime = () => { if (document.getAnimations) for (const a of document.getAnimations()) if (a.playbackRate !== rate) a.playbackRate = rate; };
  ['transitionrun', 'animationstart'].forEach(t => document.addEventListener(t, () => rate !== 1 && retime(), true));
  function speed(r) {
    if (r === undefined) return rate;
    rate = Math.max(.05, Math.min(4, +r) || 1);
    if (rate < 1) slow = rate;
    document.documentElement.toggleAttribute('data-slowmo', rate !== 1);
    retime();
    $$('[data-speed]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.speed === rate));
    dispatchEvent(new CustomEvent('heyrav:speed', { detail: rate }));
    return rate;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-speed]'); if (b) speed(b.dataset.speed); });
  document.addEventListener('keydown', e => {
    if (e.key !== 's' && e.key !== 'S' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (e.target.closest?.('input,textarea,select,[contenteditable]') || !document.querySelector('[data-speed]')) return;
    speed(rate === 1 ? slow : 1);
  });

  /* morph button: one control that becomes its own status. idle -> busy (the
     button turns into a progress readout) -> done -> it grows into the panel
     it opened, and folds back into the button on close. One live region
     speaks each state; focus moves with the surface. */
  const say = (k, d) => (window.heyravWorlds && window.heyravWorlds.say('morph.' + k, null)) || d;
  const morphs = new WeakMap();
  function morph(m) {
    if (morphs.has(m)) return morphs.get(m);
    const btn = m.querySelector('.morph-btn'), panel = m.querySelector('.morph-panel'), live = m.querySelector('[role="status"]');
    const faces = { idle: m.querySelector('.morph-idle'), busy: m.querySelector('.morph-busy'), done: m.querySelector('.morph-done') };
    const label = k => m.querySelector(`[data-morph-say="${k}"]`);
    const words = {}; ['idle', 'busy', 'done', 'open', 'close'].forEach(k => { const el = label(k); if (el) words[k] = el.textContent; });
    const reword = () => ['idle', 'busy', 'done', 'open', 'close'].forEach(k => { const el = label(k); if (el) el.textContent = say(k, words[k]); });
    /* the button's width follows the face it shows */
    const fit = st => { const f = faces[st]; if (!f) return; const cs = getComputedStyle(btn); btn.style.width = Math.ceil(f.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) * 2) + 'px'; };
    const state = st => { m.dataset.state = st; fit(st); };
    const api = {
      run() {
        if (m.dataset.state && m.dataset.state !== 'idle') return;
        state('busy'); btn.setAttribute('aria-busy', 'true'); live.textContent = say('busy', words.busy) + '…';
        const num = m.querySelector('.morph-busy .num'), t0 = performance.now(), D = reduce ? 0 : 1900;
        const step = t => {
          const k = D ? Math.min(1, (t - t0) / D) : 1;
          /* a real job: quick start, a breath near three-quarters, a clean finish */
          const p = k < .55 ? k / .55 * .72 : k < .7 ? .72 + (k - .55) / .15 * .04 : .76 + (k - .7) / .3 * .24;
          m.style.setProperty('--mp', (p * 100).toFixed(1) + '%'); m.style.setProperty('--mpv', (p * 100).toFixed(1)); if (num) num.textContent = Math.round(p * 100) + '%';
          if (k < 1) requestAnimationFrame(step); else api.done();
        };
        requestAnimationFrame(step);
      },
      done() {
        state('done'); btn.removeAttribute('aria-busy'); live.textContent = say('done', words.done);
        window.heyravWorlds?.celebrate(btn, 'done');
        if (panel) setTimeout(api.open, reduce ? 300 : 900);
        else setTimeout(() => state('idle'), 1800);
      },
      open() {
        const go = () => { btn.hidden = true; panel.hidden = false; m.dataset.state = 'open'; };
        if (document.startViewTransition && !reduce) document.startViewTransition(go).finished.then(() => panel.focus()); else { go(); panel.focus(); }
      },
      close() {
        const go = () => { panel.hidden = true; btn.hidden = false; state('idle'); m.style.removeProperty('--mp'); };
        if (document.startViewTransition && !reduce) document.startViewTransition(go).finished.then(() => btn.focus()); else { go(); btn.focus(); }
        live.textContent = '';
      },
    };
    reword(); state('idle');
    addEventListener('worldchange', () => { reword(); fit(m.dataset.state === 'open' ? 'idle' : m.dataset.state); });
    if (document.fonts) document.fonts.ready.then(() => fit(m.dataset.state === 'open' ? 'idle' : m.dataset.state));
    morphs.set(m, api); return api;
  }
  document.querySelectorAll('[data-morph]').forEach(morph);
  document.addEventListener('click', e => {
    const b = e.target.closest('.morph-btn'); if (b) { morph(b.closest('[data-morph]')).run(); return; }
    const c = e.target.closest('[data-morph-close]'); if (c) morph(c.closest('[data-morph]')).close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.closest) { const p = e.target.closest('.morph-panel'); if (p) morph(p.closest('[data-morph]')).close(); } });

  window.heyrav = { toast, countUp, speed, morph };
})();
