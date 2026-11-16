/* docs.js - the documentation chrome: theme, search, code panels, TOC, mobile nav. */
(() => {
  const root = document.documentElement;
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  /* theme: system / light / dark. "system" resolves through matchMedia so the
     opt-in [data-theme] contract in tokens.css stays the only switch. */
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const apply = m => { root.dataset.theme = m === 'system' ? (mq.matches ? 'dark' : 'light') : m; document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeSet === m)); };
  let mode = store.get('hr-theme') || 'system';
  apply(mode);
  mq.addEventListener('change', () => mode === 'system' && apply(mode));
  document.addEventListener('click', e => { const b = e.target.closest('[data-theme-set]'); if (b) { mode = b.dataset.themeSet; store.set('hr-theme', mode); apply(mode); } });

  /* copy buttons on code panels */
  document.addEventListener('click', async e => {
    const b = e.target.closest('.d-copy'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const code = b.closest('.d-code,.code')?.querySelector('pre')?.innerText || b.dataset.copy || '';
    /* the button itself becomes the result for a moment: icon to tick, and back */
    const done = () => { b.classList.remove('is-done'); void b.offsetWidth; b.classList.add('is-done'); b.setAttribute('aria-label', 'Copied'); clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove('is-done'); b.setAttribute('aria-label', 'Copy code'); }, 1500); };
    try { await navigator.clipboard.writeText(code); done(); window.heyrav?.toast(window.heyravWorlds?.say('copied', 'Copied to clipboard') || 'Copied to clipboard', { tone: 'ok' }); }
    catch { window.heyrav?.toast(window.heyravWorlds?.say('copyfail', 'Copy failed - select the code instead') || 'Copy failed - select the code instead', { tone: 'danger' }); }
  });
  /* click-to-copy on swatches */
  document.addEventListener('click', async e => {
    const s = e.target.closest('[data-copy-var]'); if (!s) return;
    try { await navigator.clipboard.writeText(`var(${s.dataset.copyVar})`); window.heyrav?.toast(`var(${s.dataset.copyVar}) copied`, { tone: 'ok' }); } catch {}
  });

  /* mobile drawer */
  document.addEventListener('click', e => {
    if (e.target.closest('[data-side-toggle]')) document.body.classList.toggle('d-open');
    else if (document.body.classList.contains('d-open') && !e.target.closest('.d-side')) document.body.classList.remove('d-open');
  });

  /* keep the current page visible in the sidebar */
  /* centre the current page in the sidebar - the sidebar only: scrollIntoView
     would also scroll the page, landing pages low in the list below their title */
  { const nav = document.querySelector('.d-nav'), cur = nav?.querySelector('a[aria-current="page"]');
    if (cur) nav.scrollTop = cur.offsetTop - nav.offsetTop - nav.clientHeight / 2 + cur.offsetHeight / 2; }

  /* TOC scrollspy */
  const links = [...document.querySelectorAll('.d-toc a')];
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map(a => [a.hash.slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { links.forEach(a => a.classList.remove('on')); map.get(en.target.id)?.classList.add('on'); } }), { rootMargin: '0px 0px -70% 0px' });
    map.forEach((_, id) => { const h = document.getElementById(id); if (h) io.observe(h); });
  }

  /* search: Cmd/Ctrl+K or "/" */
  const dlg = document.getElementById('d-k');
  if (dlg && window.DS_INDEX) {
    const input = dlg.querySelector('input'), list = dlg.querySelector('ul');
    const base = document.querySelector('meta[name="d-root"]')?.content || '';
    let hits = [], sel = 0;
    const render = () => {
      const q = input.value.trim().toLowerCase();
      hits = [];
      for (const p of DS_INDEX) {
        if (!q || p.t.toLowerCase().includes(q) || p.k.includes(q)) hits.push({ t: p.t, g: p.g, u: p.u });
        if (q) for (const h of p.h) if (h[0].toLowerCase().includes(q)) hits.push({ t: h[0], g: p.t, u: p.u + '#' + h[1] });
      }
      hits = hits.slice(0, 40); sel = 0;
      list.innerHTML = hits.length ? hits.map((h, i) => `<li><a href="${base}${h.u}" aria-selected="${i === sel}">${h.t}<small>${h.g}</small></a></li>`).join('') : '<li class="empty">Nothing matches that.</li>';
    };
    const open = () => { dlg.showModal(); input.value = ''; render(); input.focus(); };
    document.addEventListener('keydown', e => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName))) { e.preventDefault(); open(); }
    });
    document.querySelectorAll('[data-search]').forEach(b => b.addEventListener('click', open));
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      const a = [...list.querySelectorAll('a')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + a.length) % a.length; a.forEach((x, i) => x.setAttribute('aria-selected', i === sel)); a[sel]?.scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter' && a[sel]) location.href = a[sel].href;
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }

  document.querySelectorAll(".d-indet").forEach(i => i.indeterminate = true);

  /* motion demos: [data-replay] re-triggers a demo's class */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-replay]'); if (!b) return;
    const box = b.closest('.d-ex')?.querySelector('.d-stage') || document;
    box.querySelectorAll('.rv').forEach(x => { x.classList.remove('in'); void x.offsetWidth; requestAnimationFrame(() => x.classList.add('in')); });
    box.querySelectorAll('[data-count]').forEach(x => window.heyrav?.countUp(x));
    box.querySelectorAll('.d-motion-track').forEach(x => x.classList.toggle('go'));
  });

  /* live docs: inside a world, token values, font names and swatches show
     that world, read from the page itself; Studio's own text is restored as
     it was written */
  const live = () => {
    const cs = getComputedStyle(root), studio = !root.dataset.world, w = window.heyravWorlds && window.heyravWorlds.get();
    document.querySelectorAll('[data-tok]').forEach(el => {
      if (!('tok0' in el.dataset)) el.dataset.tok0 = el.textContent;
      const v = cs.getPropertyValue('--' + el.dataset.tok).trim();
      el.textContent = studio || !v ? el.dataset.tok0 : v;
    });
    document.querySelectorAll('[data-font]').forEach(el => {
      if (!('font0' in el.dataset)) el.dataset.font0 = el.textContent;
      const v = cs.getPropertyValue('--' + el.dataset.font).split(',')[0].replace(/["']/g, '').trim();
      el.textContent = studio || !v || v.startsWith('var(') ? el.dataset.font0 : v;
    });
    document.querySelectorAll('[data-chip]').forEach(el => {
      if (!('c0' in el.dataset)) el.dataset.c0 = el.getAttribute('style') || '';
      const n = el.dataset.chip, l = w && w.col && w.col.l[n], d = w && w.col && w.col.d[n];
      el.setAttribute('style', el.dataset.c0);
      if (!studio && (l || d)) { el.style.setProperty('--c', l || d); el.style.setProperty('--dk', d || l); }
    });
  };
  addEventListener('worldchange', live);
  new MutationObserver(live).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (root.dataset.world) addEventListener('load', live);
})();
