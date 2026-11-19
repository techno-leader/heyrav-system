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

  /* motion: draw each easing token as a curve, and each duration to scale,
     from the values the page is using (a world may change them) */
  const NS = 'http://www.w3.org/2000/svg';
  const tok = n => getComputedStyle(root).getPropertyValue('--' + n).trim();
  const bez = v => (v.match(/cubic-bezier\(([^)]+)\)/) || [, '.25,.1,.25,1'])[1].split(',').map(Number);
  const curves = () => {
    document.querySelectorAll('.d-curve').forEach(f => {
      const v = tok(f.dataset.ease), [a, b, c, d] = bez(v);
      const W = 220, P = 26, S = W - 2 * P, lo = Math.min(0, b, d), hi = Math.max(1, b, d);
      const H = Math.round(S * (hi - lo)) + 2 * P, X = t => P + t * S, Y = t => H - P - (t - lo) * S;
      let g = '';
      for (let i = 0; i <= 4; i++) g += `<line class="g" x1="${X(i / 4)}" y1="${Y(lo)}" x2="${X(i / 4)}" y2="${Y(hi)}"/><line class="g" x1="${X(0)}" y1="${Y(i / 4)}" x2="${X(1)}" y2="${Y(i / 4)}"/>`;
      const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${f.dataset.ease}: ${v}">${g}
        <line class="ax" x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(0)}"/><line class="ax" x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(1)}"/>
        <path class="lin" d="M${X(0)} ${Y(0)}L${X(1)} ${Y(1)}"/>
        <line class="hdl" x1="${X(0)}" y1="${Y(0)}" x2="${X(a)}" y2="${Y(b)}"/><line class="hdl" x1="${X(1)}" y1="${Y(1)}" x2="${X(c)}" y2="${Y(d)}"/>
        <path class="crv" d="M${X(0)} ${Y(0)}C${X(a)} ${Y(b)} ${X(c)} ${Y(d)} ${X(1)} ${Y(1)}"/>
        <circle class="cp" cx="${X(a)}" cy="${Y(b)}" r="4"/><circle class="cp" cx="${X(c)}" cy="${Y(d)}" r="4"/>
        <text x="${X(1)}" y="${H - 6}" text-anchor="end">time</text><text x="${X(0) - 8}" y="${Y(1) + 3}" text-anchor="end">1</text><text x="${X(0) - 8}" y="${Y(0) + 3}" text-anchor="end">0</text>
        <g class="mx"><g class="my"><circle class="dot" cx="${X(0)}" cy="${Y(0)}" r="5.5"/></g></g>
        <g class="my"><rect class="tick" x="${X(0) - 3}" y="${Y(0) - 1.5}" width="6" height="3" rx="1.5"/></g></svg>`;
      f.querySelector('svg')?.remove(); f.insertAdjacentHTML('afterbegin', svg);
      let code = f.querySelector('figcaption code'); if (!code) { code = document.createElement('code'); f.querySelector('figcaption').append(code); }
      code.textContent = v; f._run = { S, ease: v };
    });
    document.querySelectorAll('.d-durs').forEach(box => {
      const names = box.dataset.durs.split(' '), ms = names.map(n => parseFloat(tok(n)) * (/\ds$/.test(tok(n)) && !/ms$/.test(tok(n)) ? 1000 : 1));
      const max = Math.max(...ms);
      box.innerHTML = names.map((n, i) => `<div class="d-dur"><b>--${n}</b><div class="d-dur-t"><i style="--w:${(ms[i] / max * 100).toFixed(1)}%"></i><em></em></div><span>${Math.round(ms[i])}ms</span></div>`).join('');
      box._ms = ms; box._max = max;
    });
  };
  const playCurves = scope => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    scope.querySelectorAll('.d-curve').forEach(f => {
      const r = f._run; if (!r) return; const T = 900, o = { duration: T, fill: 'both' };
      f.querySelectorAll('.mx').forEach(m => m.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${r.S}px)` }], { ...o, easing: 'linear' }));
      f.querySelectorAll('.my').forEach(m => m.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-r.S}px)` }], { ...o, easing: r.ease }));
    });
    scope.querySelectorAll('.d-durs').forEach(box => box.querySelectorAll('.d-dur').forEach((row, i) => {
      const bar = row.querySelector('.d-dur-t'), em = row.querySelector('em'), w = bar.clientWidth * box._ms[i] / box._max - 12;
      em.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${Math.max(0, w)}px)` }], { duration: box._ms[i], easing: tok('ease-out'), fill: 'both' });
    }));
  };
  if (document.querySelector('.d-curve,.d-durs')) {
    curves(); addEventListener('worldchange', () => setTimeout(curves, 60));
    document.addEventListener('click', e => { const b = e.target.closest('[data-replay]'); if (b) playCurves(b.closest('.d-ex') || document); });
  }
})();
