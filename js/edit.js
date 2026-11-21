/* edit.js - the owner's copy editor for the design system site.
   Loaded only on a device that has unlocked it (or with #edit in the address),
   so visitors never download it. Unlocking checks a GitHub token against the
   repository: only someone who can push to it gets in. The token is kept in
   memory for this tab and never stored.

   What it does, on any page:
   - Text: click any heading, paragraph, list item, caption or table cell and
     type. Enter or Esc finishes.
   - Remove: click a block to strike it out; click again to bring it back.
   - Add: click a block to add a new paragraph after it.
   - Note: drag a box anywhere and write in it - a note for Claude, saved with
     the heading it sits under.
   Everything autosaves on this device (localStorage "hr-edits"), across pages.
   Review lists every change; Copy for Claude copies them as one message;
   Raise a PR writes the changes into src/*.html on a new branch and opens a
   pull request, with anything it could not place listed for Claude. */
(function () {
  if (window.__hrEdit) return; window.__hrEdit = 1;
  const OWNER = 'techno-leader', REPO = 'heyrav-system', BASE = 'main', KEY = 'hr-edits', UNLOCK = 'hr-edit';
  const doc = document, root = (doc.querySelector('meta[name="d-root"]') || {}).content || '/';
  const SRC = (doc.querySelector('meta[name="d-src"]') || {}).content || '';
  const SLUG = (doc.querySelector('meta[name="d-slug"]') || {}).content || 'index';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
  let token = null, store = load(), mode = 'text', on = ls.get('hr-edit-on') === '1', pristine = null, editing = null;
  function load() { try { const s = JSON.parse(ls.get(KEY) || 'null'); if (s && s.v === 1) return s; } catch {} return { v: 1, changes: [], notes: [] }; }
  function save() { ls.set(KEY, JSON.stringify(store)); status(); }
  const uid = () => Math.random().toString(36).slice(2, 9);
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const article = () => doc.querySelector('.d-doc');
  const SKIP = '.d-stage,.d-code,pre,.d-pn,.d-toc,.ed-ui,.ed-note,.d-used,.d-speed,.d-eyebrow';
  const TEXT = 'h1,h2,h3,h4,p,li,figcaption,dt,dd,blockquote,td,th';
  const BLOCK = 'h1,h2,h3,h4,p,li,ul,ol,figure,table,blockquote,details,dl,.d-ex,.d-sw,.d-worldgrid,.asg,section,.d-tbl';

  /* ---------- styles ---------- */
  const css = doc.createElement('style'); css.textContent = `
  .ed-ui{position:fixed;left:0;right:0;margin-inline:auto;width:fit-content;bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;max-width:calc(100vw - 24px);padding:6px;border-radius:16px;background:var(--paper,#fff);color:var(--ink,#111);border:1px solid var(--line-2,rgba(0,0,0,.2));box-shadow:0 12px 40px -12px rgba(0,0,0,.35);font:500 13px/1 var(--sans,system-ui,sans-serif)}
  .ed-ui button{font:inherit;color:inherit;background:none;border:0;border-radius:10px;padding:9px 11px;cursor:pointer;white-space:nowrap}
  .ed-ui button:hover{background:var(--surface-2,rgba(0,0,0,.06))}
  .ed-ui button[aria-pressed="true"]{background:var(--ink,#111);color:var(--paper,#fff)}
  .ed-ui .ed-sep{width:1px;align-self:stretch;background:var(--line,rgba(0,0,0,.12));margin:2px 2px}
  .ed-ui .ed-st{color:var(--mut,#666);padding:0 8px;font-variant-numeric:tabular-nums}
  .ed-ui .ed-go{background:var(--accent,#111);color:var(--accent-ink,var(--paper,#fff))}
  .ed-pill{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:2147483000;font:500 13px var(--sans,system-ui,sans-serif);padding:10px 14px;border-radius:999px;border:1px solid var(--line-2,rgba(0,0,0,.2));background:var(--paper,#fff);color:var(--ink,#111);cursor:pointer;box-shadow:0 8px 24px -10px rgba(0,0,0,.4)}
  html.ed-on .d-doc{position:relative}
  html.ed-on .ed-can{outline:1px dashed color-mix(in srgb,var(--accent,#06f) 55%,transparent);outline-offset:3px;cursor:text}
  html.ed-on.ed-m-remove .ed-can,html.ed-on.ed-m-add .ed-can{cursor:pointer}
  html.ed-on [contenteditable="true"]{outline:2px solid var(--accent,#06f)!important;outline-offset:3px;border-radius:2px;cursor:text}
  .ed-changed{box-shadow:inset 3px 0 0 var(--accent,#06f);padding-left:.4em}
  .ed-gone{opacity:.28;text-decoration:line-through;outline:2px dashed var(--danger,#d22)!important;outline-offset:3px}
  .ed-new:empty::before{content:"New text";color:var(--mut,#888)}
  .ed-note{position:absolute;z-index:50;min-width:120px;min-height:60px;border:2px dashed var(--accent,#06f);border-radius:10px;background:color-mix(in srgb,var(--paper,#fff) 88%,var(--accent,#06f));box-shadow:0 10px 30px -14px rgba(0,0,0,.4);display:flex;flex-direction:column;resize:both;overflow:hidden}
  .ed-note header{display:flex;justify-content:space-between;align-items:center;font:500 11px/1 var(--mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--mut,#666);padding:6px 8px;cursor:move;user-select:none}
  .ed-note header button{border:0;background:none;color:inherit;cursor:pointer;font-size:15px;line-height:1;padding:0 2px}
  .ed-note textarea{flex:1;border:0;background:none;resize:none;font:15px/1.45 var(--sans,system-ui,sans-serif);color:var(--ink,#111);padding:2px 10px 10px;outline:none}
  .ed-draw{position:absolute;inset:0;z-index:49;cursor:crosshair}
  .ed-box{position:absolute;border:2px dashed var(--accent,#06f);border-radius:10px;pointer-events:none}
  .ed-dlg{position:fixed;inset:0;margin:auto;height:fit-content;max-height:calc(100vh - 32px);overflow:auto;border:1px solid var(--line-2,rgba(0,0,0,.2));border-radius:16px;padding:22px;width:min(560px,calc(100vw - 32px));box-sizing:border-box;background:var(--paper,#fff);color:var(--ink,#111);font:15px/1.5 var(--sans,system-ui,sans-serif)}
  .ed-dlg::backdrop{background:rgba(0,0,0,.45)}
  .ed-dlg h2{font:600 20px/1.2 var(--sans,system-ui,sans-serif);margin:0 0 8px}
  .ed-dlg p{margin:0 0 12px;color:var(--ink-2,#333)}
  .ed-dlg input{width:100%;font:14px var(--mono,ui-monospace,monospace);padding:10px 12px;border-radius:10px;border:1px solid var(--line-2,rgba(0,0,0,.25));background:var(--surface,#f6f6f6);color:inherit}
  .ed-dlg .ed-row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
  .ed-dlg .ed-row button{font:500 14px var(--sans,system-ui,sans-serif);padding:10px 14px;border-radius:10px;border:1px solid var(--line-2,rgba(0,0,0,.2));background:none;color:inherit;cursor:pointer}
  .ed-dlg .ed-row .ed-go{background:var(--ink,#111);color:var(--paper,#fff);border-color:transparent}
  .ed-dlg ol,.ed-dlg ul{padding-left:20px;margin:6px 0 12px;max-height:46vh;overflow:auto}
  .ed-dlg li{margin-bottom:8px;font-size:14px}
  .ed-dlg li small{color:var(--mut,#666);display:block}
  .ed-dlg .ed-err{color:var(--danger,#c00)}
  .ed-dlg a{color:inherit}`;
  doc.head.append(css);

  /* ---------- the page as built, before any script touched it ---------- */
  function getPristine() {
    if (pristine) return Promise.resolve(pristine);
    return fetch(location.pathname, { cache: 'no-cache' }).then(r => r.text()).then(t => (pristine = new DOMParser().parseFromString(t, 'text/html').querySelector('.d-doc')));
  }
  const inSkip = el => !!el.closest(SKIP);
  const list = (scope, tag) => [...scope.querySelectorAll(tag)].filter(e => !inSkip(e));
  function pairFor(live) {      // live element -> { p: pristine element, ord }
    const tag = live.tagName.toLowerCase() + (live.classList.contains('d-lede') ? '.d-lede' : ''), L = list(article(), tag), P = list(pristine, tag), t = norm(live.textContent);
    const same = P.filter(p => norm(p.textContent) === t), liveSame = L.filter(l => norm(l.textContent) === t);
    let p = same.length ? same[Math.max(0, liveSame.indexOf(live))] || same[0] : P[L.indexOf(live)];
    return p ? { p, ord: P.indexOf(p), tag } : null;
  }
  function liveFor(tag, ord) {
    const P = list(pristine, tag), p = P[ord]; if (!p) return null;
    const L = list(article(), tag), t = norm(p.textContent), same = P.filter(q => norm(q.textContent) === t), liveSame = L.filter(l => norm(l.textContent) === t);
    return liveSame[same.indexOf(p)] || L[ord] || null;
  }
  const kindOf = el => el.matches('.d-head h1') ? 'h1' : el.matches('.d-lede') ? 'lede' : '';
  const mine = () => store.changes.filter(c => c.slug === SLUG);
  const find = (type, tag, ord) => store.changes.find(c => c.slug === SLUG && c.type === type && c.tag === tag && c.ord === ord);

  /* ---------- text ---------- */
  function startEdit(el) {
    if (editing === el) return; finishEdit();
    const pr = pairFor(el); if (!pr) return;
    const ch = find('text', pr.tag, pr.ord);
    el.innerHTML = ch ? ch.after : pr.p.innerHTML;    // edit clean markup, not what a world's script wrapped it in
    el.contentEditable = 'true'; el.spellcheck = true; editing = el; el.__pair = pr; el.focus();
  }
  function finishEdit() {
    const el = editing; if (!el) return; editing = null; el.removeAttribute('contenteditable');
    if (el.classList.contains('ed-new')) { const c = store.changes.find(x => x.id === el.dataset.edId); if (c) { c.after = '<p>' + clean(el.innerHTML) + '</p>'; if (!norm(el.textContent)) { store.changes.splice(store.changes.indexOf(c), 1); el.remove(); } save(); } return; }
    const pr = el.__pair, after = clean(el.innerHTML), ch = find('text', pr.tag, pr.ord);
    if (after === clean(pr.p.innerHTML)) { if (ch) store.changes.splice(store.changes.indexOf(ch), 1); el.classList.remove('ed-changed'); }
    else if (ch) ch.after = after;
    else store.changes.push({ id: uid(), slug: SLUG, src: SRC, type: 'text', kind: kindOf(el), tag: pr.tag, ord: pr.ord, before: pr.p.innerHTML, after, was: norm(pr.p.textContent), at: Date.now() });
    if (after !== clean(pr.p.innerHTML)) el.classList.add('ed-changed');
    save();
  }
  const clean = h => h.replace(/\s*contenteditable="[^"]*"/g, '').replace(/<br>\s*$/, '').replace(/&nbsp;/g, ' ').replace(/<(\/?)(div)>/g, '').trim();

  /* ---------- remove and add ---------- */
  function toggleRemove(el) {
    const pr = pairFor(el); if (!pr) return; const ch = find('remove', pr.tag, pr.ord);
    if (ch) { store.changes.splice(store.changes.indexOf(ch), 1); el.classList.remove('ed-gone'); }
    else { store.changes.push({ id: uid(), slug: SLUG, src: SRC, type: 'remove', kind: kindOf(el), tag: pr.tag, ord: pr.ord, before: pr.p.outerHTML, was: norm(pr.p.textContent).slice(0, 140), at: Date.now() }); el.classList.add('ed-gone'); }
    save();
  }
  function addAfter(el) {
    const pr = pairFor(el); if (!pr) return;
    const c = { id: uid(), slug: SLUG, src: SRC, type: 'add', kind: '', tag: pr.tag, ord: pr.ord, before: pr.p.outerHTML, after: '<p></p>', was: norm(pr.p.textContent).slice(0, 140), at: Date.now() };
    store.changes.push(c); save(); const n = placeNew(el, c); startNew(n);
  }
  function placeNew(anchor, c) { const n = doc.createElement('p'); n.className = 'ed-new ed-changed'; n.dataset.edId = c.id; n.innerHTML = c.after.replace(/^<p>|<\/p>$/g, ''); anchor.after(n); return n; }
  function startNew(n) { finishEdit(); n.contentEditable = 'true'; editing = n; n.focus(); }

  /* ---------- notes ---------- */
  function headingAbove(y) { const top = article().getBoundingClientRect().top; let h = null;
    article().querySelectorAll('h1,h2,h3').forEach(e => { if (e.offsetParent && !inSkip(e) && e.getBoundingClientRect().top - top <= y + 4) h = e; }); return h ? norm(h.textContent) : '(top of page)'; }
  function drawNote(n) {
    const a = article(), el = doc.createElement('div'); el.className = 'ed-note'; el.dataset.id = n.id;
    Object.assign(el.style, { left: n.x + 'px', top: n.y + 'px', width: n.w + 'px', height: n.h + 'px' });
    el.innerHTML = '<header><span>Note</span><button type="button" aria-label="Delete note">×</button></header><textarea aria-label="Note text" placeholder="Write a note for Claude"></textarea>';
    const ta = el.querySelector('textarea'); ta.value = n.text || '';
    ta.addEventListener('input', () => { n.text = ta.value; n.near = headingAbove(n.y); save(); });
    el.querySelector('button').addEventListener('click', () => { store.notes.splice(store.notes.indexOf(n), 1); el.remove(); save(); });
    new ResizeObserver(() => { if (el.isConnected && (Math.abs(el.offsetWidth - n.w) > 1 || Math.abs(el.offsetHeight - n.h) > 1)) { n.w = el.offsetWidth; n.h = el.offsetHeight; save(); } }).observe(el);
    const hd = el.querySelector('header'); hd.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; e.preventDefault(); const sx = e.clientX - n.x, sy = e.clientY - n.y;
      const mv = ev => { n.x = ev.clientX - sx; n.y = ev.clientY - sy; el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); n.near = headingAbove(n.y); save(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); });
    a.append(el); return el;
  }
  let drawLayer = null;
  function noteMode(onIt) {
    if (drawLayer) { drawLayer.remove(); drawLayer = null; } if (!onIt) return;
    const a = article(); drawLayer = doc.createElement('div'); drawLayer.className = 'ed-draw'; a.append(drawLayer);
    drawLayer.addEventListener('pointerdown', e => { e.preventDefault(); const r = a.getBoundingClientRect(), x0 = e.clientX - r.left, y0 = e.clientY - r.top, box = doc.createElement('div'); box.className = 'ed-box'; a.append(box);
      const mv = ev => { const x1 = ev.clientX - r.left, y1 = ev.clientY - r.top; Object.assign(box.style, { left: Math.min(x0, x1) + 'px', top: Math.min(y0, y1) + 'px', width: Math.abs(x1 - x0) + 'px', height: Math.abs(y1 - y0) + 'px' }); };
      const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); box.remove();
        const x1 = ev.clientX - r.left, y1 = ev.clientY - r.top, w = Math.max(180, Math.abs(x1 - x0)), h = Math.max(90, Math.abs(y1 - y0));
        const n = { id: uid(), slug: SLUG, src: SRC, x: Math.round(Math.min(x0, x1)), y: Math.round(Math.min(y0, y1)), w: Math.round(w), h: Math.round(h), text: '', near: headingAbove(Math.min(y0, y1)), at: Date.now() };
        store.notes.push(n); save(); setMode('text'); drawNote(n).querySelector('textarea').focus(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  }

  /* ---------- the toolbar ---------- */
  let bar = null, pill = null, stEl = null;
  function status() { if (!stEl) return; const c = store.changes.length, n = store.notes.filter(x => norm(x.text)).length, here = mine().length;
    stEl.textContent = (c + n) ? `${c} change${c === 1 ? '' : 's'}${n ? ` · ${n} note${n === 1 ? '' : 's'}` : ''}${here !== c ? ` · ${here} here` : ''} · saved` : 'No changes yet'; }
  function setMode(m) { finishEdit(); mode = m; doc.documentElement.className = doc.documentElement.className.replace(/\bed-m-\w+/g, '').trim() + ' ed-m-' + m;
    bar && bar.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m))); noteMode(m === 'note'); }
  function mount() {
    pill && pill.remove(); pill = null;
    bar = doc.createElement('div'); bar.className = 'ed-ui'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Edit this page');
    bar.innerHTML = '<button type="button" data-mode="text" title="Click any text to edit it">Text</button><button type="button" data-mode="remove" title="Click a block to strike it out">Remove</button><button type="button" data-mode="add" title="Click a block to add a paragraph after it">Add</button><button type="button" data-mode="note" title="Drag to draw a note">Note</button><span class="ed-sep"></span><span class="ed-st" aria-live="polite"></span><span class="ed-sep"></span><button type="button" data-act="review">Review</button><button type="button" data-act="claude">Copy for Claude</button><button type="button" data-act="pr" class="ed-go">Raise a PR</button><button type="button" data-act="exit" title="Leave edit mode">Done</button>';
    doc.body.append(bar); stEl = bar.querySelector('.ed-st'); status();
    bar.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.mode) setMode(b.dataset.mode);
      ({ review, claude: copyForClaude, pr: raisePR, exit: () => setOn(false) }[b.dataset.act] || (() => {}))(); });
    doc.documentElement.classList.add('ed-on'); setMode('text'); markCandidates(); restore();
    window.clarity && window.clarity('stop');            // no session recording while editing
  }
  function unmount() { finishEdit(); noteMode(false); bar && bar.remove(); bar = null; stEl = null; doc.documentElement.classList.remove('ed-on'); doc.documentElement.className = doc.documentElement.className.replace(/\bed-m-\w+/g, '').trim();
    doc.querySelectorAll('.ed-can').forEach(e => e.classList.remove('ed-can')); doc.querySelectorAll('.ed-note').forEach(e => e.remove());
    pill = doc.createElement('button'); pill.type = 'button'; pill.className = 'ed-pill'; pill.textContent = 'Edit page'; pill.addEventListener('click', () => setOn(true)); doc.body.append(pill); }
  function setOn(v) { on = v; ls.set('hr-edit-on', v ? '1' : '0'); v ? getPristine().then(mount) : unmount(); }
  function markCandidates() { const a = article(); if (!a) return; a.querySelectorAll(BLOCK + ',' + TEXT).forEach(e => { if (!inSkip(e)) e.classList.add('ed-can'); }); }

  // put back what was saved for this page
  let restored = false;
  function restore() {
    if (restored) { doc.querySelectorAll('.ed-note').forEach(e => e.remove()); store.notes.filter(n => n.slug === SLUG).forEach(drawNote); return; } restored = true;
    for (const c of mine()) { const el = liveFor(c.tag, c.ord); if (!el) { c.stale = true; continue; }
      const p = list(pristine, c.tag)[c.ord]; if (!p || (c.type === 'text' ? p.innerHTML : p.outerHTML) !== c.before) { c.stale = true; continue; } delete c.stale;
      if (c.type === 'text') { el.innerHTML = c.after; el.classList.add('ed-changed'); } else if (c.type === 'remove') el.classList.add('ed-gone'); else placeNew(el, c); }
    store.notes.filter(n => n.slug === SLUG).forEach(drawNote); save();
  }

  // clicks inside the page while editing
  doc.addEventListener('click', e => {
    if (!on || !bar) return; const a = article(); if (!a || !a.contains(e.target) || e.target.closest('.ed-note,.ed-draw')) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    if (e.target.closest('a,button,summary,label,input,select,textarea')) e.preventDefault();
    if (mode === 'text') { const el = e.target.closest(TEXT); if (el && !inSkip(el) && a.contains(el)) { e.preventDefault(); startEdit(el); } else finishEdit(); }
    else if (mode === 'remove') { const el = e.target.closest(BLOCK + ',' + TEXT); if (el && !inSkip(el) && a.contains(el) && el !== a) { e.preventDefault(); toggleRemove(el); } }
    else if (mode === 'add') { const el = e.target.closest(TEXT + ',figure,table,.d-ex'); if (el && !inSkip(el) && a.contains(el)) { e.preventDefault(); addAfter(el.closest('li') ? el.closest('ul,ol') : el); } }
  }, true);
  doc.addEventListener('pointerdown', e => { if (editing && !editing.contains(e.target)) finishEdit(); }, true);
  doc.addEventListener('keydown', e => { if (!editing) return; if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); const el = editing; finishEdit(); el.blur(); } });
  doc.addEventListener('focusout', e => { if (editing && e.target === editing) setTimeout(() => { if (editing && doc.activeElement !== editing) finishEdit(); }, 0); });
  doc.addEventListener('paste', e => { if (!editing || !editing.contains(e.target)) return; e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); doc.execCommand('insertText', false, t); });

  /* ---------- dialogs ---------- */
  function dialog(html, wire) { const d = doc.createElement('dialog'); d.className = 'ed-dlg'; d.innerHTML = html; doc.body.append(d); d.addEventListener('close', () => d.remove()); wire && wire(d); d.showModal(); return d; }
  const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = h => norm(String(h).replace(/<[^>]+>/g, ' ')).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  function describe(c) { const where = c.slug === 'index' ? 'Introduction' : c.slug;
    if (c.type === 'text') return `<b>${escH(where)}</b> · edited${c.kind ? ' ' + c.kind : ''}<small>"${escH(c.was.slice(0, 90))}" → "${escH(strip(c.after).slice(0, 120))}"</small>`;
    if (c.type === 'remove') return `<b>${escH(where)}</b> · removed<small>"${escH(c.was.slice(0, 120))}"</small>`;
    return `<b>${escH(where)}</b> · added after "${escH(c.was.slice(0, 50))}"<small>"${escH(strip(c.after).slice(0, 120))}"</small>`; }
  function review() {
    finishEdit(); const items = store.changes.map(c => `<li data-id="${c.id}">${describe(c)}${c.stale ? '<small class="ed-err">The page changed since; this one may need a hand.</small>' : ''} <a href="${root}${c.slug === 'index' ? '' : c.slug + '/'}">open</a> · <a href="#" data-undo="${c.id}">undo</a></li>`).join('');
    const notes = store.notes.filter(n => norm(n.text)).map(n => `<li><b>${escH(n.slug)}</b> · note under "${escH(n.near)}"<small>${escH(n.text)}</small></li>`).join('');
    dialog(`<h2>Your changes</h2><p>Saved on this device. They stay here until you raise a PR or clear them.</p>${items ? '<ol>' + items + '</ol>' : '<p>No edits yet.</p>'}${notes ? '<h2 style="font-size:16px">Notes</h2><ul>' + notes + '</ul>' : ''}<div class="ed-row"><button type="button" data-x="clear">Clear everything</button><button type="button" class="ed-go" data-x="close">Close</button></div>`, d => {
      d.addEventListener('click', e => { const u = e.target.closest('[data-undo]'), x = e.target.closest('[data-x]');
        if (u) { e.preventDefault(); const c = store.changes.find(q => q.id === u.dataset.undo); if (c) { store.changes.splice(store.changes.indexOf(c), 1); save(); if (c.slug === SLUG) location.reload(); else u.closest('li').remove(); } }
        if (x && x.dataset.x === 'close') d.close();
        if (x && x.dataset.x === 'clear') { if (x.dataset.sure) { store = { v: 1, changes: [], notes: [] }; save(); location.reload(); } else { x.dataset.sure = '1'; x.textContent = 'Click again to clear all'; } } }); });
  }
  function bundle() { return { site: 'system.heyrav.in', repo: OWNER + '/' + REPO, made: new Date().toISOString(), changes: store.changes, notes: store.notes.filter(n => norm(n.text)) }; }
  function copyForClaude() {
    finishEdit(); const b = bundle();
    const txt = `Copy edits for system.heyrav.in (${b.changes.length} changes, ${b.notes.length} notes). Apply them to src/*.html with scripts/apply-edits.mjs, do the notes by hand, build, check and open a PR.\n\n` +
      b.changes.map((c, i) => `${i + 1}. ${c.slug}: ${c.type === 'text' ? `"${c.was}" -> "${strip(c.after)}"` : c.type === 'remove' ? `remove "${c.was}"` : `add after "${c.was}": "${strip(c.after)}"`}`).join('\n') +
      (b.notes.length ? '\n\nNotes:\n' + b.notes.map(n => `- ${n.slug}, under "${n.near}": ${n.text}`).join('\n') : '') + '\n\n```json\n' + JSON.stringify(b) + '\n```\n';
    const done = ok => dialog(`<h2>${ok ? 'Copied' : 'Copy this'}</h2><p>${ok ? 'Paste it into a message to Claude. It has every change and note, readable and as data.' : 'The browser did not allow copying. Select the text below and copy it.'}</p>${ok ? '' : '<textarea style="width:100%;height:40vh;font:12px var(--mono,monospace)">' + escH(txt) + '</textarea>'}<div class="ed-row"><button type="button" class="ed-go" data-x>Close</button></div>`, d => d.querySelector('[data-x]').onclick = () => d.close());
    navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt).then(() => done(true), () => done(false)) : done(false);
  }

  /* ---------- GitHub: unlock and pull request ---------- */
  const gh = (path, opt = {}) => fetch('https://api.github.com' + path, { ...opt, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } })
    .then(r => r.status === 204 ? null : r.json().then(j => { if (!r.ok) throw new Error((j && j.message) || ('GitHub said ' + r.status)); return j; }));
  function askToken(why, next) {
    dialog(`<h2>${why}</h2><p>Paste a GitHub token that can write to <b>${OWNER}/${REPO}</b>. It is checked with GitHub and kept only in this tab; it is never saved.</p><p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Make a fine-grained token</a>: repository access <b>${REPO}</b> only, permissions <b>Contents</b> and <b>Pull requests</b> set to read and write.</p><label for="ed-tok" style="display:block;margin-bottom:6px;font-size:13px">Token</label><input id="ed-tok" type="password" autocomplete="off" spellcheck="false"><p class="ed-err" hidden></p><div class="ed-row"><button type="button" data-x="cancel">Cancel</button><button type="button" class="ed-go" data-x="ok">Continue</button></div>`, d => {
      const inp = d.querySelector('input'), err = d.querySelector('.ed-err'), ok = d.querySelector('[data-x="ok"]');
      d.querySelector('[data-x="cancel"]').onclick = () => d.close();
      const go = () => { token = inp.value.trim(); if (!token) return; ok.disabled = true; ok.textContent = 'Checking…';
        Promise.all([gh('/user'), gh(`/repos/${OWNER}/${REPO}`)]).then(([u, r]) => { if (!r.permissions || !r.permissions.push) throw new Error('This token cannot write to ' + REPO + '.'); ls.set(UNLOCK, u.login); d.close(); next(); })
          .catch(e => { token = null; err.hidden = false; err.textContent = e.message; ok.disabled = false; ok.textContent = 'Continue'; }); };
      ok.onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
  }
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
  const b64enc = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); };
  const ORDER = { add: 0, text: 1, remove: 2 };
  function raisePR() {
    finishEdit(); const b = bundle(); if (!b.changes.length && !b.notes.length) { dialog('<h2>Nothing to send yet</h2><p>Edit some text, remove or add something, or leave a note first.</p><div class="ed-row"><button type="button" class="ed-go" data-x>Close</button></div>', d => d.querySelector('[data-x]').onclick = () => d.close()); return; }
    if (!token) return askToken('Raise a pull request', raisePR);
    const d = dialog('<h2>Raising a pull request…</h2><p class="ed-prog">Making a branch.</p>'), prog = d.querySelector('.ed-prog'), say = t => { prog.textContent = t; };
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''), branch = 'copy-edits/' + stamp;
    let done = [], missed = [];
    (window.EditCore ? Promise.resolve() : new Promise((res, rej) => { const s = doc.createElement('script'); s.src = root + 'js/edit-core.js?v=' + Date.now(); s.onload = res; s.onerror = () => rej(new Error('Could not load the editor core.')); doc.head.append(s); }))
      .then(() => gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`))
      .then(ref => gh(`/repos/${OWNER}/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: ref.object.sha }) }))
      .then(async () => {
        const files = [...new Set(b.changes.map(c => c.src).filter(Boolean))];
        for (const f of files) { say('Writing ' + f + '…');
          const cur = await gh(`/repos/${OWNER}/${REPO}/contents/${f}?ref=${encodeURIComponent(branch)}`), cs = b.changes.filter(c => c.src === f).sort((x, y) => ORDER[x.type] - ORDER[y.type]);
          const r = EditCore.apply(b64dec(cur.content), cs); done = done.concat(r.done); missed = missed.concat(r.missed);
          if (r.done.length) await gh(`/repos/${OWNER}/${REPO}/contents/${f}`, { method: 'PUT', body: JSON.stringify({ message: `Copy edits: ${f}`, content: b64enc(r.text), sha: cur.sha, branch }) }); }
        missed = missed.concat(b.changes.filter(c => !c.src));
        say('Saving the full list for Claude…');
        await gh(`/repos/${OWNER}/${REPO}/contents/edits/${stamp}.json`, { method: 'PUT', body: JSON.stringify({ message: 'Copy edits: the full list', content: b64enc(JSON.stringify(b, null, 1) + '\n'), branch }) });
        say('Opening the pull request…');
        const line = c => `- **${c.slug}** · ${c.type === 'text' ? `"${c.was}" → "${strip(c.after)}"` : c.type === 'remove' ? `remove "${c.was}"` : `add after "${c.was}": "${strip(c.after)}"`}`;
        const body = `Copy edits made on the live site in edit mode.\n\n**Applied to the sources (${done.length})**\n${done.map(line).join('\n') || '- none'}\n\n**For Claude to do by hand (${missed.length})**\n${missed.map(line).join('\n') || '- none'}\n\n**Notes (${b.notes.length})**\n${b.notes.map(n => `- **${n.slug}**, under "${n.near}": ${n.text}`).join('\n') || '- none'}\n\nThe full list is in \`edits/${stamp}.json\`. Before merging: apply anything above by hand, run \`node build.mjs\`, check the pages.`;
        return gh(`/repos/${OWNER}/${REPO}/pulls`, { method: 'POST', body: JSON.stringify({ title: `Copy edits (${b.changes.length} changes, ${b.notes.length} notes)`, head: branch, base: BASE, body }) });
      })
      .then(pr => { d.innerHTML = `<h2>Pull request opened</h2><p><a href="${pr.html_url}" target="_blank" rel="noopener">#${pr.number} · ${escH(pr.title)}</a></p><p>${done.length} applied to the sources${missed.length ? `, ${missed.length} left for Claude` : ''}${b.notes.length ? `, ${b.notes.length} notes` : ''}. Tell Claude about it to finish and merge.</p><p>Clear these edits from this device now? They are all in the pull request.</p><div class="ed-row"><button type="button" data-x="keep">Keep them</button><button type="button" class="ed-go" data-x="clear">Clear</button></div>`;
        d.querySelector('[data-x="keep"]').onclick = () => d.close(); d.querySelector('[data-x="clear"]').onclick = () => { store = { v: 1, changes: [], notes: [] }; save(); location.reload(); }; })
      .catch(e => { d.innerHTML = `<h2>That did not work</h2><p class="ed-err">${escH(e.message)}</p><p>Your edits are still saved on this device. You can try again, or use Copy for Claude.</p><div class="ed-row"><button type="button" class="ed-go" data-x>Close</button></div>`; d.querySelector('[data-x]').onclick = () => d.close(); });
  }

  /* ---------- start ---------- */
  function boot() {
    if (!article()) return;
    const wants = /(^|[#&?])edit\b/.test(location.hash + location.search);
    if (!ls.get(UNLOCK)) { if (wants) askToken('Edit this site', () => setOn(true)); return; }
    if (wants && location.hash === '#edit') history.replaceState(null, '', location.pathname + location.search);
    wants || on ? setOn(true) : unmount();
  }
  doc.readyState === 'loading' ? doc.addEventListener('DOMContentLoaded', boot) : boot();
})();
