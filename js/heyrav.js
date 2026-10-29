/* heyrav.js - behaviour for the interactive components. Vanilla, no deps.
   Everything is wired by data attributes or ARIA roles, so markup stays the
   API: drop the element in, the script finds it. Safe to load once per page. */
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    ok: '<svg class="icon" viewBox="0 0 256 256"><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0zM232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104zm-16 0a88 88 0 1 0-88 88 88.1 88.1 0 0 0 88-88z"/></svg>',
    danger: '<svg class="icon" viewBox="0 0 256 256"><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88zm-8-80V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0zm20 36a12 12 0 1 1-12-12 12 12 0 0 1 12 12z"/></svg>'
  };
  function toast(msg, { tone, ms = 2400 } = {}) {
    let host = document.querySelector('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.append(host); }
    const t = document.createElement('div'); t.className = 'toast' + (tone ? ' toast-' + tone : '');
    t.innerHTML = (icons[tone] || '') + '<span></span>'; t.querySelector('span').textContent = msg;
    host.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), reduce ? 0 : 320); }, ms);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-toast]'); if (b) toast(b.dataset.toast, { tone: b.dataset.tone }); });

  /* pending buttons: [data-pending] spins for 1.6s (demo) */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pending]'); if (!b) return;
    b.classList.add('is-pending'); b.setAttribute('aria-busy', 'true');
    setTimeout(() => { b.classList.remove('is-pending'); b.removeAttribute('aria-busy'); }, 1600);
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
    const t0 = performance.now(), dur = 1200;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = pre + (to * e).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(step); };
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

  window.heyrav = { toast, countUp };
})();
