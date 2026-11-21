/* doc-nav.js - the case studies' scroll nav (js/scroll-nav.js, the same file
   heyrav.in uses) on the system's long pages. A docs page has no <section>s:
   its chapters are its h2 headings, each running to the next one. The nav
   takes its colours from the current world's tokens and replaces the
   "On this page" list while it is shown. It rebuilds when the world changes,
   because some worlds show headings of their own. */
(function () {
  if (!window.ScrollNav) return;
  const doc = document, root = doc.documentElement;
  const CONFIG = { ease: 'in-out', numbers: false, spring: false, head: 'off', rowMeta: 'none', headlines: false, rowBars: false, miniTop: 'icon', announceMs: 2000, iMinH: 100, iCardW: 240,
    bg: 'var(--ink)', fg: 'var(--paper)', accent: 'var(--sel)', rest: 'var(--ink)', insetT: 24, insetB: 76, offset: 32 };
  const text = (a, b) => { let t = ''; for (let n = a; n && n !== b; n = n.nextElementSibling) t += ' ' + n.textContent; return t; };
  function chapters() {
    const art = doc.querySelector('.d-doc'); if (!art) return [];
    const hs = [...art.querySelectorAll('h2')].filter(h => h.offsetParent && !h.closest('.d-stage,.d-ex,.ed,.d-pn'));
    return hs.map((h, i) => {
      const next = hs[i + 1], label = (h.dataset.label || h.textContent).replace(/\s+/g, ' ').trim();
      return { dataset: { label }, querySelector: s => (/h2/.test(s) ? h : null), get textContent() { return text(h, next && next.parentElement === h.parentElement ? next : null); },
        getBoundingClientRect() { const a = h.getBoundingClientRect(), end = next ? next.getBoundingClientRect().top : art.getBoundingClientRect().bottom; return { top: a.top, bottom: end, left: a.left, right: a.right, width: a.width, height: Math.max(1, end - a.top) }; } };
    });
  }
  let nav = null, t = 0;
  function mount() {
    if (nav) { nav.destroy(); nav = null; }
    const secs = chapters(), long = root.scrollHeight > innerHeight * 2.2, on = secs.length >= 3 && long;
    root.classList.toggle('has-snav', on);
    if (on) nav = ScrollNav.mount({ sections: secs, config: Object.assign({}, CONFIG) });
  }
  const later = () => { clearTimeout(t); t = setTimeout(mount, 350); };
  new MutationObserver(later).observe(root, { attributes: true, attributeFilter: ['data-world'] });
  doc.readyState === 'loading' ? addEventListener('DOMContentLoaded', later) : later();
})();
