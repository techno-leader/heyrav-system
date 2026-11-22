/* edit.js - the owner's copy editor for the design system site.
   Built into js/edit.bundle.js with its icons and js/edit-core.js. Loaded only
   on a device that has unlocked it (or with #edit in the address), so visitors
   never download it. Unlocking checks a GitHub token against the repository;
   the token lives in memory for this tab and is never stored.

   One widget, made from the system's own parts, that changes shape instead of
   opening windows:
     collapsed  a pencil with the number of changes
     toolbar    tools (text, remove, add, note) and actions, as icons with tooltips
     panel      the same widget grown upward: review the changes, sign in,
                raise a pull request and watch it happen, all in place.
   Text: click any text, demos included, and type; Enter or Esc finishes.
   Remove: click a block to strike it out, again to bring it back.
   Add: click a block to add a paragraph after it. Note: drag a box and write.
   Keys while the toolbar is open: T R A N pick a tool, Esc closes the panel.
   Everything autosaves on this device (localStorage "hr-edits"). */
(function () {
  if (window.__hrEdit) return; window.__hrEdit = 1;
  const doc = document, html = doc.documentElement, IC = window.HR_ED_ICONS || {};
  const meta = n => (doc.querySelector(`meta[name="${n}"]`) || {}).content || '';
  /* each site says where its pages come from (window.HR_EDIT); the design system is the default */
  const CFG = Object.assign({ owner: 'techno-leader', repo: 'heyrav-system', base: 'main', site: 'system.heyrav.in', scope: '.d-doc', skip: '', src: meta('d-src'), slug: meta('d-slug') || 'index', root: meta('d-root') || '/', css: '' }, window.HR_EDIT || {});
  const OWNER = CFG.owner, REPO = CFG.repo, BASE = CFG.base, KEY = 'hr-edits', UNLOCK = 'hr-edit';
  const root = CFG.root, SRC = CFG.src, SLUG = CFG.slug;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
  const icon = n => `<svg class="icon" viewBox="0 0 256 256" aria-hidden="true">${IC[n] || ''}</svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const strip = h => norm(String(h).replace(/<[^>]+>/g, ' ')).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  const uid = () => Math.random().toString(36).slice(2, 9);
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // heard in the current world's voice when the site's sound is on (sound-ui.js); silent anywhere else
  const snd = id => { try { window.HRSoundUI && window.HRSoundUI.cue(id); } catch {} };
  let token = ls.get('hr-edit-token'), store = load(), tool = 'text', state = 'off', pristine = null, editing = null, panelData = {};
  function load() { try { const s = JSON.parse(ls.get(KEY) || 'null'); if (s && s.v === 1) return s; } catch {} return { v: 1, changes: [], notes: [] }; }
  function save() { store.changes.forEach(c => { if (c.slug === SLUG && !c.url) c.url = location.pathname; }); ls.set(KEY, JSON.stringify(store)); counts(); }
  const article = () => doc.querySelector(CFG.scope) || doc.body;
  const SKIP = '.d-code,pre,.d-pn,.d-toc,.ed-host,.ed-note,.ed-draw,.ed-inline,.d-used,.d-speed,.d-eyebrow,script,style,noscript,svg,canvas,.snav' + (CFG.skip ? ',' + CFG.skip : '');
  const TEXT = 'h1,h2,h3,h4,p,li,figcaption,dt,dd,blockquote,td,th';
  const BLOCK = 'h1,h2,h3,h4,p,li,ul,ol,figure,table,blockquote,details,dl,.d-ex,.d-sw,.d-worldgrid,.asg,section';
  const inSkip = el => !!el.closest(SKIP);

  /* ---------- styles: system tokens and components; only the widget's own frame is defined here ---------- */
  /* the page itself: outlines, struck-out blocks, notes (fallbacks for sites without the system's tokens) */
  const css = doc.createElement('style'); css.textContent = `
  :root{--ed-acc:var(--accent,#0a6cff);--ed-dng:var(--danger,#d4380d);--ed-mut:var(--mut,#6b6b6b);--ed-ln2:var(--line-2,rgba(0,0,0,.2));--ed-pap:var(--paper,#fff);--ed-ink:var(--ink,#161616);--ed-ink3:var(--ink-3,#555);--ed-rmd:var(--r-md,14px);--ed-rxs:var(--r-xs,4px);--ed-shd:var(--shadow-pop,0 18px 40px -22px rgba(0,0,0,.3));--ed-s1:var(--s-1,4px);--ed-s3:var(--s-3,12px);--ed-tui:var(--t-ui,14px);--ed-sans:var(--sans,system-ui,sans-serif)}
  .ed-inline{position:fixed;z-index:2147482999;box-sizing:border-box;border:0;outline:2px solid var(--ed-acc);outline-offset:2px;border-radius:var(--ed-rxs);background:var(--ed-pap);color:var(--ed-ink);padding:0 var(--ed-s1);text-align:center}
  html.ed-on .ed-can{outline:1px dashed color-mix(in srgb,var(--ed-acc) 50%,transparent);outline-offset:3px}
  html.ed-on.ed-t-text .ed-can{cursor:text}
  html.ed-on.ed-t-remove .ed-can,html.ed-on.ed-t-add .ed-can{cursor:pointer}
  html.ed-on .ed-hov{outline:1px dashed var(--ed-acc);outline-offset:2px;cursor:text}
  html.ed-on [contenteditable="true"]{outline:2px solid var(--ed-acc)!important;outline-offset:3px;cursor:text}
  .ed-changed{box-shadow:inset 3px 0 0 var(--ed-acc)}
  .ed-gone{opacity:.28;text-decoration:line-through;outline:2px dashed var(--ed-dng)!important;outline-offset:3px}
  .ed-new:empty::before{content:"New text";color:var(--ed-mut)}
  .ed-note{position:absolute;z-index:50;min-width:160px;min-height:80px;border:1px solid var(--ed-ln2);border-radius:var(--ed-rmd);background:var(--ed-pap);box-shadow:var(--ed-shd);display:flex;flex-direction:column;resize:both;overflow:hidden}
  .ed-note header{display:flex;justify-content:space-between;align-items:center;padding:var(--ed-s1) var(--ed-s1) 0 var(--ed-s3);cursor:move;user-select:none;color:var(--ed-ink3)}
  .ed-note header .icon{width:16px;height:16px}
  .ed-note textarea{flex:1;border:0;background:none;resize:none;font:var(--ed-tui)/1.45 var(--ed-sans);color:var(--ed-ink);padding:0 var(--ed-s3) var(--ed-s3);outline:none}
  .ed-draw{position:absolute;inset:0;z-index:49;cursor:crosshair}
  .ed-box{position:absolute;border:2px dashed var(--ed-acc);border-radius:var(--ed-rmd);pointer-events:none}`;
  doc.head.append(css);
  /* the widget lives in a shadow root with the design system's own stylesheet, so it looks the same on any site and nothing leaks either way */
  const WCSS = `
  .ed{position:fixed;left:0;right:0;bottom:max(var(--s-4),env(safe-area-inset-bottom,0px));margin-inline:auto;width:fit-content;max-width:calc(100vw - 2 * var(--s-4));z-index:2147483000;
    display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border:1px solid var(--line-2);border-radius:var(--r-lg);box-shadow:var(--shadow-pop);font-family:var(--sans);font-size:var(--t-ui)}
  .ed.ed-morph{overflow:hidden}
  .ed[data-state="off"]{border-radius:var(--r-pill)}
  .ed [hidden]{display:none!important}
  .ed[data-state="signin"] .ed-bar [data-on]:not([data-keep]){display:none!important}
  .ed-bar{display:flex;align-items:center;gap:var(--s-1);padding:var(--s-1);flex-wrap:nowrap}
  .ed-bar .seg{gap:0}
  .ed-bar .seg button{padding:0;width:var(--target);display:grid;place-items:center}
  /* concentric corners: shell r-lg, bar inset s-1, segmented inset --seg-pad */
  .ed:not([data-state="off"]) .ed-bar{--ed-in:calc(var(--r-lg) - var(--s-1))}
  .ed:not([data-state="off"]) .ed-bar .btn,.ed:not([data-state="off"]) .ed-bar .seg{border-radius:var(--ed-in)}
  .ed:not([data-state="off"]) .ed-bar .seg button{border-radius:max(0px,calc(var(--ed-in) - var(--seg-pad,3px)))}
  .ed-bar .icon{width:20px;height:20px}
  .ed-sep{width:1px;align-self:stretch;margin:var(--s-2) var(--s-1);background:var(--line)}
  .ed-n{position:absolute;top:4px;right:2px;min-width:18px;height:18px;padding:0 5px;border-radius:var(--r-pill);background:var(--ink);color:var(--paper);font:600 11px/18px var(--mono);text-align:center;pointer-events:none}
  .ed-n:empty{display:none}
  .ed .tip [role="tooltip"]{white-space:nowrap}
  .ed .tip:focus-within:not(:has(:focus-visible)):not(:hover) [role="tooltip"]{opacity:0}
  .ed[data-state="review"] .tip [role="tooltip"],.ed[data-state="pr"] .tip [role="tooltip"]{display:none}
  .ed .kbd{position:static;margin-left:var(--s-2)}
  .ed-saved{display:grid;place-items:center;width:28px;color:var(--ink-3)}
  .ed-saved.pulse .icon{animation:ed-pulse var(--d-slow) var(--ease-out)}
  @keyframes ed-pulse{40%{transform:scale(1.25);color:var(--accent)}}
  @media (max-width:440px){.ed .ed-savedwrap,.ed .ed-sep{display:none!important}.ed-bar{gap:0}.ed-bar .btn-icon{width:40px;min-height:40px}.ed-bar .seg button{width:40px;min-height:calc(40px - 2 * var(--seg-pad,3px))}}
  .ed-panel{display:flex;flex-direction:column;gap:var(--s-3);padding:var(--s-5) var(--s-5) var(--s-3);border-bottom:1px solid var(--line);max-height:min(60vh,560px);overflow:auto;overscroll-behavior:contain;width:min(560px,calc(100vw - 2 * var(--s-4)));box-sizing:border-box}
  .ed-panel[hidden]{display:none}
  .ed-head{display:flex;align-items:center;justify-content:space-between;gap:var(--s-3)}
  .ed-head h2{font:600 var(--t-sub)/1.2 var(--head-font,var(--sans));margin:0;letter-spacing:0}
  .ed-panel p{margin:0;color:var(--ink-2);line-height:1.5}
  .ed-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
  .ed-list li{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:var(--s-3);align-items:start;padding:var(--s-3) 0;border-top:1px solid var(--line)}
  .ed-list li:first-child{border-top:0}
  .ed-list .icon{width:20px;height:20px;color:var(--ink-3);margin-top:2px}
  .ed-list b{font-weight:600;display:block}
  .ed-list .was{color:var(--mut);text-decoration:line-through}
  .ed-list .now{color:var(--ink)}
  .ed-list small{display:block;color:var(--ink-2);line-height:1.45;overflow-wrap:anywhere}
  .ed-list .acts{display:flex;gap:var(--s-1)}
  .ed-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--s-2)}
  .ed-steps li{display:flex;gap:var(--s-2);align-items:center;color:var(--ink-3)}
  .ed-steps li.done{color:var(--ink)}
  .ed-steps li.now{color:var(--ink);font-weight:600}
  .ed-steps .icon{width:18px;height:18px}
  .ed-err{color:var(--danger)}
  .ed-row{display:flex;gap:var(--s-2);justify-content:flex-end;flex-wrap:wrap}
  .ed-field{display:flex;flex-direction:column;gap:var(--s-2)}
  .ed-field label{font:500 var(--t-label)/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
  .ed-field input,.ed-panel textarea{font:14px var(--mono);padding:var(--s-3);border-radius:var(--r-sm);border:1px solid var(--line-2);background:var(--surface);color:var(--ink);width:100%;box-sizing:border-box}
  .ed-panel textarea{min-height:30vh}
  .ed a{color:inherit}
`;

  /* ---------- the page as built, before any script touched it ---------- */
  function getPristine() {
    if (pristine) return Promise.resolve(pristine);
    return fetch(location.pathname, { cache: 'no-cache' }).then(r => r.text()).then(t => (pristine = (d => d.querySelector(CFG.scope) || d.body)(new DOMParser().parseFromString(t, 'text/html'))));
  }
  const list = (scope, tag) => [...scope.querySelectorAll(tag)].filter(e => !inSkip(e));
  const tagOf = el => el.tagName.toLowerCase() + (el.classList.contains('d-lede') ? '.d-lede' : '');
  function pairFor(live) {
    const tag = tagOf(live), L = list(article(), tag), P = list(pristine, tag), t = norm(live.textContent);
    const same = P.filter(p => norm(p.textContent) === t), liveSame = L.filter(l => norm(l.textContent) === t);
    const p = same.length ? same[Math.max(0, liveSame.indexOf(live))] || same[0] : P[L.indexOf(live)];
    if (!p) return null;
    const outer = p.outerHTML, nth = P.filter(q => q.outerHTML === outer).indexOf(p);
    return { p, ord: P.indexOf(p), tag, outer, nth };
  }
  function liveFor(tag, ord) {
    const P = list(pristine, tag), p = P[ord]; if (!p) return null;
    const L = list(article(), tag), t = norm(p.textContent), same = P.filter(q => norm(q.textContent) === t), liveSame = L.filter(l => norm(l.textContent) === t);
    return liveSame[same.indexOf(p)] || L[ord] || null;
  }
  const kindOf = el => el.matches('.d-head h1') ? 'h1' : el.matches('.d-lede') ? 'lede' : '';
  const mine = () => store.changes.filter(c => c.slug === SLUG);
  const find = (type, tag, ord) => store.changes.find(c => c.slug === SLUG && c.type === type && c.tag === tag && c.ord === ord);
  // what a click in Text mode edits: a text block, or inside demos the nearest element that holds words itself
  function textTarget(t) {
    const a = article(); if (!a || !a.contains(t) || inSkip(t)) return null;
    const b = t.closest(TEXT); if (b && !b.closest('.d-stage')) return b;
    for (let e = t; e && e !== a; e = e.parentElement) {
      if (e.closest('svg')) continue;
      if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return e;
    }
    return b;
  }

  /* ---------- text, remove, add ---------- */
  const clean = h => h.replace(/\s*contenteditable="[^"]*"/g, '').replace(/<br>\s*$/, '').replace(/&nbsp;/g, ' ').replace(/<(\/?)div>/g, '').replace(/ {2,}/g, ' ').trim();
  // buttons, labels and summaries cannot hold a caret, so their words are edited in a field laid over them
  function inlineEdit(el) {
    finishEdit(); const pr = pairFor(el); if (!pr) return;
    const ch = find('text', pr.tag, pr.ord); if (ch) el.innerHTML = ch.after;
    const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!tn) return;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), inp = doc.createElement('input');
    inp.className = 'ed-inline'; inp.value = tn.textContent.trim(); inp.setAttribute('aria-label', 'Edit text');
    Object.assign(inp.style, { left: r.left + 'px', top: r.top + 'px', width: Math.max(r.width, 96) + 'px', height: r.height + 'px', font: cs.font, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform });
    doc.body.append(inp); inp.focus(); inp.select();
    let gone = false; const done = keep => { if (gone) return; gone = true; removeEventListener('scroll', onScroll); inp.remove(); if (!keep) return;
      const lead = tn.textContent.match(/^\s*/)[0], tail = tn.textContent.match(/\s*$/)[0]; tn.textContent = lead + inp.value.trim() + tail;
      const after = clean(el.innerHTML.replace(/\s*class="ed-hov"/g, '')), base = clean(pr.p.innerHTML), c = find('text', pr.tag, pr.ord);
      if (after === base) { if (c) store.changes.splice(store.changes.indexOf(c), 1); el.classList.remove('ed-changed'); }
      else { if (c) c.after = after; else store.changes.push({ id: uid(), slug: SLUG, src: SRC, type: 'text', kind: '', tag: pr.tag, ord: pr.ord, outer: pr.outer, nth: pr.nth, before: pr.p.innerHTML, after, was: norm(pr.p.textContent), at: Date.now() }); el.classList.add('ed-changed'); snd('tick'); }
      save(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } if (e.key === 'Escape') { e.preventDefault(); done(false); } e.stopPropagation(); });
    const y0 = scrollY, onScroll = () => { if (Math.abs(scrollY - y0) > 60) done(true); };
    inp.addEventListener('blur', () => done(true)); addEventListener('scroll', onScroll, { passive: true });
  }
  function startEdit(el) {
    if (editing === el) return;
    const box = el.closest('button,summary,label,select'); if (box && article().contains(box)) return inlineEdit(el.closest('button,summary,label') || el);
    finishEdit();
    const pr = pairFor(el); if (!pr) return;
    const ch = find('text', pr.tag, pr.ord);
    el.innerHTML = ch ? ch.after : pr.p.innerHTML;
    el.contentEditable = 'true'; el.spellcheck = true; editing = el; el.__pair = pr; el.focus();
  }
  function finishEdit() {
    const el = editing; if (!el) return; editing = null; el.removeAttribute('contenteditable');
    if (el.classList.contains('ed-new')) { const c = store.changes.find(x => x.id === el.dataset.edId); if (c) { c.after = '<p>' + clean(el.innerHTML) + '</p>'; if (!norm(el.textContent)) { store.changes.splice(store.changes.indexOf(c), 1); el.remove(); } save(); } return; }
    const pr = el.__pair, after = clean(el.innerHTML), base = clean(pr.p.innerHTML), ch = find('text', pr.tag, pr.ord);
    if (after === base) { if (ch) store.changes.splice(store.changes.indexOf(ch), 1); el.classList.remove('ed-changed'); }
    else { if (!ch || ch.after !== after) snd('tick'); if (ch) ch.after = after; else store.changes.push({ id: uid(), slug: SLUG, src: SRC, type: 'text', kind: kindOf(el), tag: pr.tag, ord: pr.ord, outer: pr.outer, nth: pr.nth, before: pr.p.innerHTML, after, was: norm(pr.p.textContent), at: Date.now() }); el.classList.add('ed-changed'); }
    save();
  }
  function toggleRemove(el) {
    const pr = pairFor(el); if (!pr) return; const ch = find('remove', pr.tag, pr.ord);
    if (ch) { store.changes.splice(store.changes.indexOf(ch), 1); el.classList.remove('ed-gone'); snd('undo'); }
    else { snd('delete'); store.changes.push({ id: uid(), slug: SLUG, src: SRC, type: 'remove', kind: kindOf(el), tag: pr.tag, ord: pr.ord, before: pr.p.outerHTML, was: norm(pr.p.textContent).slice(0, 160), at: Date.now() }); el.classList.add('ed-gone'); }
    save();
  }
  function addAfter(el) {
    const pr = pairFor(el); if (!pr) return;
    const c = { id: uid(), slug: SLUG, src: SRC, type: 'add', kind: '', tag: pr.tag, ord: pr.ord, before: pr.p.outerHTML, after: '<p></p>', was: norm(pr.p.textContent).slice(0, 160), at: Date.now() };
    store.changes.push(c); save(); snd('expand'); const n = placeNew(el, c); finishEdit(); n.contentEditable = 'true'; editing = n; n.focus();
  }
  function placeNew(anchor, c) { const n = doc.createElement('p'); n.className = 'ed-new ed-changed'; n.dataset.edId = c.id; n.innerHTML = c.after.replace(/^<p>|<\/p>$/g, ''); anchor.after(n); return n; }

  /* ---------- notes ---------- */
  function headingAbove(y) { const top = article().getBoundingClientRect().top; let h = null;
    article().querySelectorAll('h1,h2,h3').forEach(e => { if (e.offsetParent && !inSkip(e) && e.getBoundingClientRect().top - top <= y + 4) h = e; }); return h ? norm(h.textContent) : 'the top of the page'; }
  function drawNote(n) {
    const el = doc.createElement('div'); el.className = 'ed-note'; el.dataset.id = n.id;
    Object.assign(el.style, { left: n.x + 'px', top: n.y + 'px', width: n.w + 'px', height: n.h + 'px' });
    el.innerHTML = `<header>${icon('note-pencil')}<button type="button" class="btn btn-quiet btn-icon btn-sm" aria-label="Delete note">${icon('x')}</button></header><textarea aria-label="Note for Claude" placeholder="A note for Claude"></textarea>`;
    const ta = el.querySelector('textarea'); ta.value = n.text || '';
    ta.addEventListener('input', () => { n.text = ta.value; n.near = headingAbove(n.y); save(); });
    el.querySelector('button').addEventListener('click', () => { store.notes.splice(store.notes.indexOf(n), 1); el.remove(); save(); snd('delete'); });
    new ResizeObserver(() => { if (el.isConnected && (Math.abs(el.offsetWidth - n.w) > 1 || Math.abs(el.offsetHeight - n.h) > 1)) { n.w = el.offsetWidth; n.h = el.offsetHeight; save(); } }).observe(el);
    el.querySelector('header').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; e.preventDefault(); const sx = e.clientX - n.x, sy = e.clientY - n.y;
      const mv = ev => { n.x = ev.clientX - sx; n.y = ev.clientY - sy; el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); n.near = headingAbove(n.y); save(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); });
    article().append(el); return el;
  }
  let drawLayer = null;
  function noteLayer(on) {
    if (drawLayer) { drawLayer.remove(); drawLayer = null; } if (!on) return;
    const a = article(); drawLayer = doc.createElement('div'); drawLayer.className = 'ed-draw'; a.append(drawLayer);
    drawLayer.addEventListener('pointerdown', e => { e.preventDefault(); const r = a.getBoundingClientRect(), x0 = e.clientX - r.left, y0 = e.clientY - r.top, box = doc.createElement('div'); box.className = 'ed-box'; a.append(box);
      const mv = ev => { const x1 = ev.clientX - r.left, y1 = ev.clientY - r.top; Object.assign(box.style, { left: Math.min(x0, x1) + 'px', top: Math.min(y0, y1) + 'px', width: Math.abs(x1 - x0) + 'px', height: Math.abs(y1 - y0) + 'px' }); };
      const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); box.remove();
        const x1 = ev.clientX - r.left, y1 = ev.clientY - r.top;
        const n = { id: uid(), slug: SLUG, src: SRC, x: Math.round(Math.min(x0, x1)), y: Math.round(Math.min(y0, y1)), w: Math.round(Math.max(220, Math.abs(x1 - x0))), h: Math.round(Math.max(110, Math.abs(y1 - y0))), text: '', near: headingAbove(Math.min(y0, y1)), at: Date.now() };
        store.notes.push(n); save(); snd('press'); setTool('text'); drawNote(n).querySelector('textarea').focus(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  }

  /* ---------- the widget ---------- */
  const host = doc.createElement('div'); host.className = 'ed-host'; const SR = host.attachShadow({ mode: 'open' });
  const sysCss = doc.createElement('style'), ownCss = doc.createElement('style'); ownCss.textContent = WCSS; SR.append(sysCss, ownCss);
  fetch(CFG.css || root + 'heyrav.css').then(r => r.text()).then(t => { sysCss.textContent = t.replace(/:root\b/g, ':host').replace(/\[data-theme="dark"\]/g, ':host([data-theme="dark"])'); }).catch(() => {});
  const syncTheme = () => host.setAttribute('data-theme', html.dataset.theme === 'dark' ? 'dark' : 'light'); syncTheme();
  new MutationObserver(syncTheme).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  const W = doc.createElement('div'); W.className = 'ed'; W.setAttribute('role', 'region'); W.setAttribute('aria-label', 'Edit this site');
  const tipBtn = (attrs, ic, label, key, extra = '') => `<span class="tip"><button type="button" class="btn btn-quiet btn-icon" ${attrs} aria-label="${label}">${icon(ic)}${extra}</button><span role="tooltip">${label}${key ? `<span class="kbd">${key}</span>` : ''}</span></span>`;
  W.innerHTML = `<div class="ed-panel" hidden></div><div class="ed-bar">
    <span class="tip" data-off><button type="button" class="btn btn-quiet btn-icon" data-act="open" aria-label="Edit this page">${icon('pencil-simple')}<span class="ed-n"></span></button><span role="tooltip">Edit this page</span></span>
    <div class="seg" role="group" aria-label="Tool" data-on>
      ${[['text', 'text-t', 'Edit text', 'T'], ['remove', 'eraser', 'Remove a block', 'R'], ['add', 'plus', 'Add a paragraph after', 'A'], ['note', 'note-pencil', 'Draw a note', 'N']].map(([k, ic, l, kb]) => `<span class="tip"><button type="button" data-tool="${k}" aria-pressed="false" aria-label="${l}">${icon(ic)}</button><span role="tooltip">${l}<span class="kbd">${kb}</span></span></span>`).join('')}
    </div>
    <span class="ed-sep" data-on></span>
    <span class="tip ed-savedwrap" data-on><span class="ed-saved" role="status">${icon('cloud-check')}</span><span role="tooltip" data-saved>Saved on this device</span></span>
    <span data-on>${tipBtn('data-act="review" aria-expanded="false"', 'list-checks', 'Review changes', '', '<span class="ed-n"></span>')}</span>
    <span data-on>${tipBtn('data-act="copy"', 'copy', 'Copy for Claude')}</span>
    <span data-on>${tipBtn('data-act="pr" aria-expanded="false"', 'git-pull-request', 'Raise a pull request')}</span>
    <span class="ed-sep" data-on></span>
    <span data-on data-keep>${tipBtn('data-act="close"', 'caret-down', 'Collapse', 'Esc')}</span>
  </div>`;
  const panel = W.querySelector('.ed-panel'), bar = W.querySelector('.ed-bar');
  // the widget changes size in place: measure, change, animate between the two
  function morph(change) {
    const a = W.getBoundingClientRect(); change(); const b = W.getBoundingClientRect();
    if (reduce() || !W.animate || (a.width === b.width && a.height === b.height)) return;
    const d = parseFloat(getComputedStyle(W).getPropertyValue('--d-modal')) || 320, e = getComputedStyle(W).getPropertyValue('--ease-out').trim() || 'ease-out';
    W.classList.add('ed-morph'); const an = W.animate([{ width: a.width + 'px', height: a.height + 'px' }, { width: b.width + 'px', height: b.height + 'px' }], { duration: d, easing: e });
    an.onfinish = an.oncancel = () => W.classList.remove('ed-morph');
  }
  function setState(s, data) {
    morph(() => {
      state = s; panelData = data || {}; W.dataset.state = s;
      W.querySelectorAll('[data-on]').forEach(e => e.hidden = s === 'off'); W.querySelector('[data-off]').hidden = s !== 'off';
      html.classList.toggle('ed-on', s !== 'off'); ls.set('hr-edit-on', s === 'off' ? '0' : '1');
      W.querySelector('[data-act="review"]').setAttribute('aria-expanded', String(s === 'review'));
      W.querySelector('[data-act="pr"]').setAttribute('aria-expanded', String(s === 'pr'));
      const P = { review: renderReview, pr: renderPR, signin: renderSignin, copy: renderCopy }[s];
      panel.hidden = !P; if (P) { panel.innerHTML = ''; P(panel); panel.scrollTop = 0; }
    });
    if (s === 'off') { finishEdit(); noteLayer(false); doc.querySelectorAll('.ed-can').forEach(e => e.classList.remove('ed-can')); doc.querySelectorAll('.ed-note').forEach(e => e.remove()); }
    else if (!html.classList.contains('ed-ready')) { html.classList.add('ed-ready'); getPristine().then(() => { mark(); restore(); }); window.clarity && window.clarity('stop'); }
    else if (!doc.querySelector('.ed-can')) { mark(); store.notes.filter(n => n.slug === SLUG && !doc.querySelector(`.ed-note[data-id="${n.id}"]`)).forEach(drawNote); }
  }
  function setTool(t, heard) { finishEdit(); if (heard && t !== tool) snd('select'); tool = t; html.className = html.className.replace(/\bed-t-\w+/g, '').trim() + ' ed-t-' + t;
    W.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t))); noteLayer(t === 'note'); }
  function counts() { const n = store.changes.length + store.notes.filter(x => norm(x.text)).length;
    W.querySelectorAll('.ed-n').forEach(e => e.textContent = n ? String(n) : '');
    const s = W.querySelector('.ed-saved'); s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse');
    W.querySelector('[data-saved]').textContent = n ? `${store.changes.length} change${store.changes.length === 1 ? '' : 's'}${store.notes.length ? `, ${store.notes.filter(x => norm(x.text)).length} notes` : ''} saved on this device` : 'Nothing changed yet';
    if (state === 'review') { const t = panel.scrollTop; panel.innerHTML = ''; renderReview(panel); panel.scrollTop = t; } }
  function mark() { const a = article(); if (!a) return; a.querySelectorAll(BLOCK + ',' + TEXT).forEach(e => { if (!inSkip(e) && !e.closest('.d-stage')) e.classList.add('ed-can'); }); }
  let restored = false;
  function restore() {
    if (!restored) { restored = true;
      for (const c of mine()) { const el = liveFor(c.tag, c.ord), p = list(pristine, c.tag)[c.ord];
        if (!el || !p || (c.type === 'text' ? p.innerHTML : p.outerHTML) !== c.before) { c.stale = true; continue; } delete c.stale;
        if (c.type === 'text') { el.innerHTML = c.after; el.classList.add('ed-changed'); } else if (c.type === 'remove') el.classList.add('ed-gone'); else placeNew(el, c); } }
    store.notes.filter(n => n.slug === SLUG).forEach(drawNote); save();
  }

  /* ---------- panel states ---------- */
  const pageName = s => s === 'index' ? 'Introduction' : s.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
  const TYPE_IC = { text: 'text-t', remove: 'eraser', add: 'plus' };
  function renderReview(p) {
    const ch = store.changes, notes = store.notes.filter(n => norm(n.text));
    p.innerHTML = `<div class="ed-head"><h2>Changes</h2><div class="ed-row">${token ? `<button type="button" class="btn btn-quiet btn-sm" data-x="forget">Forget token</button>` : ''}${ch.length || notes.length ? `<button type="button" class="btn btn-quiet btn-sm" data-x="clear">Clear all</button>` : ''}</div></div>` +
      (ch.length || notes.length ? '' : '<p>Nothing yet. Pick a tool below and click something on the page.</p>') +
      (ch.length ? `<ul class="ed-list">${ch.map(c => `<li data-id="${c.id}">${icon(TYPE_IC[c.type])}<div><b>${esc(pageName(c.slug))}</b>${
        c.type === 'text' ? `<small><span class="was">${esc(c.was.slice(0, 140))}</span></small><small class="now">${esc(strip(c.after).slice(0, 200))}</small>` :
        c.type === 'remove' ? `<small class="was">${esc(c.was.slice(0, 160))}</small>` : `<small class="now">${esc(strip(c.after).slice(0, 200))}</small><small>after "${esc(c.was.slice(0, 60))}"</small>`}${c.stale ? '<small class="ed-err">The page changed since. Claude will place this one by hand.</small>' : ''}</div>
        <div class="acts">${c.slug !== SLUG ? `<a class="btn btn-quiet btn-icon btn-sm" href="${c.url || root + (c.slug === 'index' ? '' : c.slug + '/')}" aria-label="Open ${esc(pageName(c.slug))}">${icon('arrow-up-right')}</a>` : ''}<button type="button" class="btn btn-quiet btn-icon btn-sm" data-undo="${c.id}" aria-label="Undo">${icon('arrow-counter-clockwise')}</button></div></li>`).join('')}</ul>` : '') +
      (notes.length ? `<ul class="ed-list">${notes.map(n => `<li>${icon('note-pencil')}<div><b>${esc(pageName(n.slug))} · under "${esc(n.near)}"</b><small class="now">${esc(n.text)}</small></div><div class="acts"></div></li>`).join('')}</ul>` : '');
  }
  function renderCopy(p) { p.innerHTML = `<div class="ed-head"><h2>Copy this</h2></div><p>The browser did not allow copying. Select the text and copy it.</p><textarea readonly>${esc(panelData.text || '')}</textarea>`; }
  function tokenForm(p, title, lead, go) {
    p.innerHTML = `<div class="ed-head"><h2>${title}</h2></div><p>${lead}</p>
      <p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Make a fine-grained token</a> with repository access to <b>${REPO}</b> only, and set <b>Contents</b> and <b>Pull requests</b> to <b>Read and write</b>. It is checked with GitHub once and then remembered in this browser, so you will not be asked again until it expires or you choose Forget token.</p>
      <div class="ed-field"><label for="ed-tok">GitHub token</label><input id="ed-tok" type="password" autocomplete="off" spellcheck="false"></div>
      <p class="ed-err" hidden></p><div class="ed-row"><button type="button" class="btn btn-primary btn-sm" data-x="tok">Continue ${icon('arrow-right')}</button></div>`;
    const inp = p.querySelector('input'), err = p.querySelector('.ed-err'), ok = p.querySelector('[data-x="tok"]');
    const run = () => { const t = inp.value.trim(); if (!t) return; token = t; ok.disabled = true;
      Promise.all([gh('/user'), gh(`/repos/${OWNER}/${REPO}`)]).then(([u, r]) => { if (!r.permissions || !r.permissions.push) throw new Error(`This token's account cannot change ${REPO}.`); ls.set(UNLOCK, u.login); ls.set('hr-edit-token', t); snd('success'); go(); })
        .catch(e => { snd('error'); token = null; err.hidden = false; err.textContent = e.message; ok.disabled = false; }); };
    ok.onclick = run; inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); }); setTimeout(() => inp.focus({ preventScroll: true }), 50);
  }
  function renderSignin(p) { tokenForm(p, 'Edit this site', 'Only the owner can edit. Sign in with a GitHub token that can change the repository.', () => { setState('bar'); setTool('text'); }); }
  function renderPR(p) {
    const b = bundle();
    if (!b.changes.length && !b.notes.length) { p.innerHTML = '<div class="ed-head"><h2>Nothing to send yet</h2></div><p>Edit some text, remove or add something, or leave a note first.</p>'; return; }
    if (panelData.result) { const r = panelData.result;
      p.innerHTML = `<div class="ed-head"><h2>Pull request opened</h2></div><p><a href="${r.url}" target="_blank" rel="noopener">#${r.number} · ${esc(r.title)} ${icon('arrow-up-right')}</a></p><p>${r.done} applied to the pages${r.missed ? `, ${r.missed} for Claude to place by hand` : ''}${r.notes ? `, ${r.notes} notes` : ''}. Tell Claude about it to finish, check and merge.</p><div class="ed-row"><button type="button" class="btn btn-quiet btn-sm" data-x="keep">Keep edits here</button><button type="button" class="btn btn-primary btn-sm" data-x="wipe">Clear them from this device</button></div>`; return; }
    if (panelData.error) { p.innerHTML = `<div class="ed-head"><h2>That did not go through</h2></div><p class="ed-err">${esc(panelData.error.title)}</p><p>${panelData.error.help}</p><p>Your edits are still saved here.</p><div class="ed-row"><button type="button" class="btn btn-primary btn-sm" data-x="retry">Try again</button></div>`; return; }
    if (!token) return tokenForm(p, 'Raise a pull request', `${[b.changes.length ? `${b.changes.length} change${b.changes.length === 1 ? '' : 's'}` : '', b.notes.length ? `${b.notes.length} note${b.notes.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')} go into one pull request on a new branch. Sign in to send ${b.changes.length + b.notes.length === 1 ? 'it' : 'them'}.`, () => setState('pr', { run: true }));
    const steps = ['Make a branch', 'Write the changes into the pages', 'Save the full list for Claude', 'Open the pull request'];
    p.innerHTML = `<div class="ed-head"><h2>Raising a pull request</h2></div><ul class="ed-steps">${steps.map((s, i) => `<li data-step="${i}">${icon('cloud-check')}<span>${s}</span></li>`).join('')}</ul>`;
    if (panelData.run !== false) { panelData.run = false; runPR(b); }
  }
  const step = i => panel.querySelectorAll('.ed-steps li').forEach((li, j) => { li.className = j < i ? 'done' : j === i ? 'now' : ''; li.querySelector('svg').innerHTML = IC[j < i ? 'check' : 'cloud-check'] || ''; });

  /* ---------- actions ---------- */
  function bundle() { return { site: CFG.site, repo: OWNER + '/' + REPO, made: new Date().toISOString(), changes: store.changes, notes: store.notes.filter(n => norm(n.text)) }; }
  const line = c => `${c.slug}: ${c.type === 'text' ? `"${c.was}" -> "${strip(c.after)}"` : c.type === 'remove' ? `remove "${c.was}"` : `add after "${c.was}": "${strip(c.after)}"`}`;
  function copyForClaude(btn) {
    finishEdit(); const b = bundle();
    const txt = `Copy edits for ${CFG.site} (${b.changes.length} changes, ${b.notes.length} notes). Apply them to the page files with scripts/apply-edits.mjs, do the notes by hand, build, check and open a PR.\n\n` +
      b.changes.map((c, i) => `${i + 1}. ${line(c)}`).join('\n') + (b.notes.length ? '\n\nNotes:\n' + b.notes.map(n => `- ${n.slug}, under "${n.near}": ${n.text}`).join('\n') : '') + '\n\n```json\n' + JSON.stringify(b) + '\n```\n';
    const tip = btn.parentElement.querySelector('[role="tooltip"]');
    const ok = () => { snd('copy'); btn.innerHTML = icon('check'); tip.textContent = 'Copied for Claude'; setTimeout(() => { btn.innerHTML = icon('copy'); tip.textContent = 'Copy for Claude'; }, 1800); };
    navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt).then(ok, () => setState('copy', { text: txt })) : setState('copy', { text: txt });
  }
  let lastHeaders = null;
  const gh = (path, opt = {}) => fetch('https://api.github.com' + path, { ...opt, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } })
    .then(r => { lastHeaders = r.headers; return r.status === 204 ? null : r.json().then(j => { if (!r.ok) { const e = new Error((j && j.message) || ('GitHub said ' + r.status)); e.status = r.status; e.need = r.headers.get('x-accepted-github-permissions'); throw e; } return j; }); });
  function explain(e) {
    if (/not accessible by personal access token/i.test(e.message)) return { title: 'This token can read the repository but not change it.', help: `On GitHub, open the token, and under Repository permissions set <b>Contents</b> and <b>Pull requests</b> to <b>Read and write</b>${e.need ? ` (GitHub asked for: ${esc(e.need)})` : ''}. Save it, then try again here with the same token.` };
    if (e.status === 401) return { title: 'GitHub did not accept this token.', help: 'It may have expired. On GitHub, open the token and choose Regenerate, then paste the new one here; it is remembered again.' };
    return { title: e.message, help: 'Try again in a moment. If it keeps failing, use Copy for Claude instead.' };
  }
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
  const b64enc = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); };
  const ORDER = { add: 0, text: 1, remove: 2 };
  async function runPR(b) {
    finishEdit(); const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''), branch = 'copy-edits/' + stamp; let done = [], missed = [];
    snd('send');
    try {
      step(0); const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`);
      await gh(`/repos/${OWNER}/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: ref.object.sha }) });
      step(1);
      for (const f of [...new Set(b.changes.map(c => c.src).filter(Boolean))]) {
        const cur = await gh(`/repos/${OWNER}/${REPO}/contents/${f}?ref=${encodeURIComponent(branch)}`), r = EditCore.apply(b64dec(cur.content), b.changes.filter(c => c.src === f).sort((x, y) => ORDER[x.type] - ORDER[y.type]));
        done = done.concat(r.done); missed = missed.concat(r.missed);
        if (r.done.length) await gh(`/repos/${OWNER}/${REPO}/contents/${f}`, { method: 'PUT', body: JSON.stringify({ message: `Copy edits: ${f}`, content: b64enc(r.text), sha: cur.sha, branch }) });
      }
      missed = missed.concat(b.changes.filter(c => !c.src));
      step(2); await gh(`/repos/${OWNER}/${REPO}/contents/edits/${stamp}.json`, { method: 'PUT', body: JSON.stringify({ message: 'Copy edits: the full list', content: b64enc(JSON.stringify(b, null, 1) + '\n'), branch }) });
      step(3);
      const md = c => '- **' + line(c).replace(/^([^:]+):/, '$1**:');
      const body = `Copy edits made on the live site in edit mode.\n\n**Applied to the pages (${done.length})**\n${done.map(md).join('\n') || '- none'}\n\n**For Claude to place by hand (${missed.length})**\n${missed.map(md).join('\n') || '- none'}\n\n**Notes (${b.notes.length})**\n${b.notes.map(n => `- **${n.slug}**, under "${n.near}": ${n.text}`).join('\n') || '- none'}\n\nThe full list is in \`edits/${stamp}.json\`. Before merging: place anything above by hand, run \`node build.mjs\`, check the pages, and delete \`edits/\`.`;
      const pr = await gh(`/repos/${OWNER}/${REPO}/pulls`, { method: 'POST', body: JSON.stringify({ title: `Copy edits (${b.changes.length} changes, ${b.notes.length} notes)`, head: branch, base: BASE, body }) });
      step(4); snd('success'); setState('pr', { result: { url: pr.html_url, number: pr.number, title: pr.title, done: done.length, missed: missed.length, notes: b.notes.length } });
    } catch (e) { if (e.status === 401) forget(); snd('error'); setState('pr', { error: explain(e) }); }
  }

  /* ---------- wiring ---------- */
  W.addEventListener('click', e => {
    const b = e.target.closest('button,a'); if (!b) return;
    if (b.dataset.tool) { setTool(b.dataset.tool, true); if (state !== 'bar') setState('bar'); return; }
    const act = b.dataset.act, x = b.dataset.x;
    if (act === 'open') { snd('open'); setState(ls.get(UNLOCK) ? 'bar' : 'signin'); setTool(tool); }
    if (act === 'close') snd(state === 'bar' ? 'close' : 'collapse'), state === 'bar' ? setState('off') : setState('bar');
    if (act === 'review') snd(state === 'review' ? 'collapse' : 'expand'), setState(state === 'review' ? 'bar' : 'review');
    if (act === 'pr') snd(state === 'pr' ? 'collapse' : 'expand'), setState(state === 'pr' ? 'bar' : 'pr', { run: true });
    if (act === 'copy') copyForClaude(b);
    if (b.dataset.undo) { const c = store.changes.find(q => q.id === b.dataset.undo); if (c) { store.changes.splice(store.changes.indexOf(c), 1); undoLive(c); save(); snd('undo'); } }
    if (x === 'clear') { if (b.dataset.sure) { snd('delete'); store.changes.slice().forEach(undoLive); store = { v: 1, changes: [], notes: [] }; doc.querySelectorAll('.ed-note').forEach(n => n.remove()); save(); } else { b.dataset.sure = '1'; b.textContent = 'Clear all? Click again'; b.classList.add('btn-primary'); } }
    if (x === 'forget') { forget(); counts(); }
    if (x === 'keep') { snd('collapse'); setState('bar'); }
    if (x === 'wipe') { snd('delete'); store.changes.slice().forEach(undoLive); store = { v: 1, changes: [], notes: [] }; doc.querySelectorAll('.ed-note').forEach(n => n.remove()); save(); setState('bar'); }
    if (x === 'retry') setState('pr', { run: true });
  });
  function forget() { token = null; ls.del('hr-edit-token'); }
  function undoLive(c) { if (c.slug !== SLUG || !pristine) return;
    if (c.type === 'add') { const n = doc.querySelector(`.ed-new[data-ed-id="${c.id}"]`); n && n.remove(); return; }
    const el = liveFor(c.tag, c.ord); if (!el) return;
    if (c.type === 'text') { el.innerHTML = c.before; el.classList.remove('ed-changed'); } else el.classList.remove('ed-gone'); }

  doc.addEventListener('click', e => {
    if (state === 'off' || state === 'signin') return; const a = article(); if (!a || !a.contains(e.target) || e.target.closest('.ed-note,.ed-draw')) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    if (e.target.closest('a,button,summary,label,input,select,textarea,[role="tab"],[role="switch"]')) e.preventDefault();
    if (tool === 'text') { const el = textTarget(e.target); if (el) { e.preventDefault(); e.stopPropagation(); startEdit(el); } else finishEdit(); }
    else if (tool === 'remove') { const el = e.target.closest(BLOCK + ',' + TEXT); if (el && !inSkip(el) && el !== a) { e.preventDefault(); e.stopPropagation(); toggleRemove(el); } }
    else if (tool === 'add') { const el = e.target.closest(TEXT + ',figure,table,.d-ex'); if (el && !inSkip(el)) { e.preventDefault(); e.stopPropagation(); addAfter(el.closest('li') ? el.closest('ul,ol') : el); } }
  }, true);
  let hov = null;
  doc.addEventListener('pointerover', e => { if (state === 'off' || tool !== 'text') return; const el = textTarget(e.target); const t = el && el.closest('.d-stage') ? el : null;
    if (hov && hov !== t) hov.classList.remove('ed-hov'); hov = t; t && t.classList.add('ed-hov'); });
  doc.addEventListener('pointerdown', e => { if (editing && !editing.contains(e.target)) finishEdit(); }, true);
  doc.addEventListener('keydown', e0 => { const e = { key: e0.key, metaKey: e0.metaKey, ctrlKey: e0.ctrlKey, altKey: e0.altKey, shiftKey: e0.shiftKey, target: (e0.composedPath && e0.composedPath()[0]) || e0.target, preventDefault: () => e0.preventDefault() };
    if (editing) { if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); const el = editing; finishEdit(); el.blur(); } return; }
    if (state === 'off' || state === 'signin' || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) || e.target.isContentEditable) return;
    const k = { t: 'text', r: 'remove', a: 'add', n: 'note' }[e.key.toLowerCase()]; if (k) { e.preventDefault(); setTool(k, true); }
    if (e.key === 'Escape') { e.preventDefault(); snd(state === 'bar' ? 'close' : 'collapse'); state === 'bar' ? setState('off') : setState('bar'); }
  });
  doc.addEventListener('focusout', e => { if (editing && e.target === editing) setTimeout(() => { if (editing && doc.activeElement !== editing) finishEdit(); }, 0); });
  doc.addEventListener('paste', e => { if (!editing || !editing.contains(e.target)) return; e.preventDefault(); doc.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });

  /* ---------- start ---------- */
  function boot() {
    if (!article()) return; SR.append(W); doc.body.append(host); const sc = article(); if (getComputedStyle(sc).position === 'static') sc.style.position = 'relative'; counts(); setTool('text');
    const wants = /(^|[#&?])edit($|[&=])/.test(location.hash + location.search);
    if (wants && location.hash === '#edit') history.replaceState(null, '', location.pathname + location.search);
    if (!ls.get(UNLOCK)) setState(wants ? 'signin' : 'off');
    else setState(wants || ls.get('hr-edit-on') === '1' ? 'bar' : 'off');
  }
  doc.readyState === 'loading' ? doc.addEventListener('DOMContentLoaded', boot) : boot();
})();
