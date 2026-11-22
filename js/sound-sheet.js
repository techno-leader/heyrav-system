/* sound-sheet.js - the Sound page: every interaction with its cue, two
   libraries side by side, and every sound in both, each playable alone.
   Picks (which library and pack sounds right for a cue) are kept on this
   device and copied out as JSON. */
(function () {
  const LIB = window.HR_SOUND_LIB, S = window.HRSound;
  if (!LIB || !S) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  /* each cue: its weight, the Web Kits sound in Core and in the 26-sound packs, and the UI SFX cue */
  const CUES = {
    press: ['touch', 'click', 'click', 'press'],
    'toggle-on': ['touch', 'toggle-on', 'toggle-on', 'toggle-on'],
    'toggle-off': ['touch', 'toggle-off', 'toggle-off', 'toggle-off'],
    check: ['touch', 'checkbox', 'checkbox', 'check'],
    uncheck: ['touch', 'deselect', 'deselect', 'uncheck'],
    select: ['touch', 'tab-switch', 'tab-switch', 'select'],
    tick: ['touch', 'tick', 'tap', 'progress-step'],
    expand: ['move', 'expand', 'expand', 'expand'],
    collapse: ['move', 'collapse', 'collapse', 'collapse'],
    open: ['move', 'dropdown-open', 'pop', 'open'],
    close: ['move', 'dropdown-close', 'collapse', 'close'],
    search: ['move', 'command', 'pop', 'open'],
    dark: ['move', 'slide-down', 'slide', 'sleep'],
    light: ['move', 'slide-up', 'swoosh', 'wake'],
    world: ['move', 'whoosh', 'swoosh', 'swipe'],
    play: ['move', 'select', 'select', 'play'],
    pause: ['move', 'deselect', 'deselect', 'pause'],
    copy: ['result', 'copy', 'copy', 'copy'],
    success: ['result', 'success', 'success', 'success'],
    error: ['result', 'error', 'error', 'error'],
    send: ['result', 'send', 'send', 'send'],
    delete: ['result', 'delete', 'delete', 'delete'],
    undo: ['result', 'undo', 'undo', 'undo'],
  };
  const WEIGHT = { touch: .55, move: .75, result: 1 };
  const UI_VOL = Object.fromEntries(LIB.uisfx.cues.map(c => [c[0], c[2]]));
  const WK_UI = ['core', 'minimal', 'soft', 'crisp', 'mechanical', 'organic', 'playful', 'retro']; // packs that cover interface cues

  const st = { lib: store('hr-snd-lib') || 'webkits', webkits: store('hr-snd-wk') || 'core', uisfx: store('hr-snd-ui') || 'minimal' };
  if (!LIB.webkits[st.webkits]) st.webkits = 'core';
  if (!LIB.uisfx.packs.some(p => p[0] === st.uisfx)) st.uisfx = 'minimal';
  let picks = {}; try { picks = JSON.parse(store('hr-snd-picks') || '{}') || {}; } catch (e) {}

  const wkName = (cue, pack) => { const c = CUES[cue]; return pack === 'core' ? c[1] : c[2]; };
  const uiURL = (pack, cue) => LIB.uisfx.base + pack + '/' + cue + '.mp3';
  // UI SFX ships per-cue gains around 0.2; scale so both libraries meet at a similar loudness
  const uiGain = cue => (UI_VOL[cue] || .2) / .2 * .55;

  function play(lib, pack, name, weight = 1) {
    S.unlock();
    if (lib === 'webkits') { const d = LIB.webkits[pack] && LIB.webkits[pack].s[name]; return d ? S.play(d, { volume: weight, key: 'wk:' + pack + name }) : Promise.resolve(); }
    return S.play(uiURL(pack, name), { volume: uiGain(name) * weight, key: 'ui:' + pack + name }).catch(() => {});
  }
  function cue(id, lib = st.lib) {
    const c = CUES[id]; if (!c) return;
    const pk = picks[id];
    if (pk && lib === st.lib && pk.keep) return play(pk.lib, pk.pack, pk.lib === 'webkits' ? wkName(id, pk.pack) : c[3], WEIGHT[c[0]]);
    return play(lib, st[lib], lib === 'webkits' ? wkName(id, st.webkits) : c[3], WEIGHT[c[0]]);
  }

  /* ---- the bar ---- */
  const optWK = WK_UI.map(k => `<option value="${k}">${LIB.webkits[k].name}</option>`).join('');
  const optUI = LIB.uisfx.packs.map(p => `<option value="${p[0]}">${p[1]}</option>`).join('');
  const selWK = $('[data-snd-pack="webkits"]'), selUI = $('[data-snd-pack="uisfx"]');
  if (selWK) { selWK.innerHTML = optWK; selWK.value = WK_UI.includes(st.webkits) ? st.webkits : 'core'; st.webkits = selWK.value; }
  if (selUI) { selUI.innerHTML = optUI; selUI.value = st.uisfx; }
  [selWK, selUI].forEach(sel => sel && sel.addEventListener('change', () => {
    const lib = sel.dataset.sndPack; st[lib] = sel.value; store(lib === 'webkits' ? 'hr-snd-wk' : 'hr-snd-ui', sel.value);
    st.lib = lib; store('hr-snd-lib', lib); syncLib(); labels(); cue('press', lib);
  }));
  function syncLib() { $$('[data-snd-lib]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sndLib === st.lib))); }
  $$('[data-snd-lib]').forEach(b => b.addEventListener('click', () => { st.lib = b.dataset.sndLib; store('hr-snd-lib', st.lib); syncLib(); cue('press'); }));
  syncLib();
  const vol = $('[data-snd-vol]'), volv = $('[data-snd-volval]');
  if (vol) {
    vol.value = Math.round(S.volume() * 100); if (volv) volv.textContent = vol.value;
    vol.addEventListener('input', () => { S.volume(vol.value / 100); if (volv) volv.textContent = vol.value; });
    vol.addEventListener('change', () => cue('tick'));
  }

  /* ---- the map: A/B buttons and the keep toggle on each row ---- */
  const tpl = $('[data-snd-icons]'), ics = tpl ? [...tpl.content.querySelectorAll('svg')].map(x => x.outerHTML) : ['', ''];
  const ICON = { play: ics[0], keep: ics[1] };
  let tipN = 0;
  $$('.d-snd-row').forEach(row => {
    const ids = row.dataset.cues.split(/\s+/), box = document.createElement('div');
    box.className = 'd-snd-ab';
    box.innerHTML = ids.map(id => `<div class="d-snd-pair" data-cue="${id}">${ids.length > 1 ? `<span class="d-snd-sub">${id.replace('toggle-', '')}</span>` : ''}` +
      `<button class="d-snd-key" type="button" data-ab="webkits">${ICON.play}<span></span></button>` +
      `<button class="d-snd-key" type="button" data-ab="uisfx">${ICON.play}<span></span></button></div>`).join('') +
      `<span class="tip d-snd-keep"><button class="btn btn-quiet btn-icon btn-sm" type="button" aria-pressed="false" aria-describedby="snd-tt-${++tipN}">${ICON.keep}</button><span role="tooltip" id="snd-tt-${tipN}">Keep this pack</span></span>`;
    row.appendChild(box);
    box.addEventListener('click', e => {
      const k = e.target.closest('[data-ab]'); if (k) { const id = k.closest('[data-cue]').dataset.cue; ring(k); play(k.dataset.ab, st[k.dataset.ab], k.dataset.ab === 'webkits' ? wkName(id, st.webkits) : CUES[id][3], WEIGHT[CUES[id][0]]); return; }
      const kp = e.target.closest('.d-snd-keep button'); if (!kp) return;
      const on = kp.getAttribute('aria-pressed') !== 'true';
      ids.forEach(id => { if (on) picks[id] = { keep: true, lib: st.lib, pack: st[st.lib] }; else delete picks[id]; });
      store('hr-snd-picks', JSON.stringify(picks)); labels(); if (on) cue(ids[0]);
    });
  });
  function ring(el) { el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on'); }
  function labels() {
    $$('.d-snd-pair').forEach(p => {
      const id = p.dataset.cue;
      p.querySelector('[data-ab="webkits"] span').textContent = st.webkits + '/' + wkName(id, st.webkits);
      p.querySelector('[data-ab="uisfx"] span').textContent = st.uisfx + '/' + CUES[id][3];
    });
    $$('.d-snd-row').forEach(row => {
      const ids = row.dataset.cues.split(/\s+/), pk = picks[ids[0]], b = row.querySelector('.d-snd-keep button'), tt = row.querySelector('.d-snd-keep [role=tooltip]');
      b.setAttribute('aria-pressed', String(!!pk)); row.classList.toggle('is-kept', !!pk);
      tt.textContent = pk ? 'Kept: ' + (pk.lib === 'webkits' ? 'Web Kits ' : 'UI SFX ') + pk.pack : 'Keep this pack';
    });
    const box = $('[data-snd-picks]'), n = Object.keys(picks).length;
    if (box) { box.hidden = !n; $('[data-snd-picks-out]', box).textContent = n + ' cue' + (n === 1 ? '' : 's') + ' kept'; }
  }
  labels();
  const pc = $('[data-snd-picks-copy]'), pcl = $('[data-snd-picks-clear]');
  if (pc) pc.addEventListener('click', () => {
    const out = Object.fromEntries(Object.entries(picks).map(([id, p]) => [id, (p.lib === 'webkits' ? 'webkits/' + p.pack + '/' + wkName(id, p.pack) : 'uisfx/' + p.pack + '/' + CUES[id][3])]));
    navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(out, null, 2)).then(() => { cue('copy'); window.heyrav && heyrav.toast && heyrav.toast('Picks copied', { tone: 'ok' }); });
  });
  if (pcl) pcl.addEventListener('click', () => { picks = {}; store('hr-snd-picks', '{}'); labels(); cue('delete'); });

  /* ---- the live controls ---- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-snd]'); if (b && b.closest('[data-snd-map]')) {
      cue(b.dataset.snd);
      if (b.hasAttribute('data-snd-tick')) { b.classList.add('is-on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('is-on'), 1400); }
    }
    const f = e.target.closest('[data-snd-flip]'); if (f) {
      const [a, z] = f.dataset.sndFlip.split(' '), attr = f.hasAttribute('aria-expanded') ? 'aria-expanded' : 'aria-pressed', on = f.getAttribute(attr) !== 'true';
      f.setAttribute(attr, String(on)); f.classList.toggle('is-on', on); cue(on ? a : z);
      if (a === 'play') f.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }
    const s = e.target.closest('[data-snd-seg] button'); if (s) {
      const seg = s.parentElement, ids = seg.dataset.sndSeg.split(' '), btns = [...seg.children], i = btns.indexOf(s);
      if (s.getAttribute('aria-pressed') === 'true') return;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === s)));
      cue(ids.length > 1 ? ids[Math.min(i, ids.length - 1)] : ids[0]);
    }
  });
  $$('[data-snd-map] input[type=checkbox][data-snd-on]').forEach(i => i.addEventListener('change', () => cue(i.checked ? i.dataset.sndOn : i.dataset.sndOff)));
  $$('[data-snd-map] details[data-snd-on]').forEach(d => d.addEventListener('toggle', () => cue(d.open ? d.dataset.sndOn : d.dataset.sndOff)));
  $$('[data-snd-range]').forEach(r => { let v = r.value; r.addEventListener('input', () => { if (r.value !== v) { v = r.value; cue(r.dataset.sndRange); } }); });

  /* ---- every sound, both libraries ---- */
  const grids = {
    webkits: { packs: Object.keys(LIB.webkits).map(k => [k, LIB.webkits[k].name, LIB.webkits[k].d]), pick: store('hr-snd-gwk') || 'core',
      render(pack) { return Object.keys(LIB.webkits[pack].s).map(n => key('webkits', pack, n)).join(''); } },
    uisfx: { packs: LIB.uisfx.packs, pick: store('hr-snd-gui') || 'minimal',
      render(pack) {
        return LIB.uisfx.cats.filter(c => c[0] !== 'loops').map(([cid, cl]) => {
          const cs = LIB.uisfx.cues.filter(c => c[1] === cid && !c[3]); if (!cs.length) return '';
          return `<p class="label d-snd-cat">${cl}</p>` + cs.map(c => key('uisfx', pack, c[0])).join('');
        }).join('');
      } },
  };
  const key = (lib, pack, n) => `<button class="d-snd-key" type="button" data-g="${lib}" data-p="${pack}" data-n="${n}">${ICON.play}<span>${n}</span></button>`;
  Object.entries(grids).forEach(([lib, g]) => {
    const tabs = $(`[data-snd-grid-packs="${lib}"]`), grid = $(`[data-snd-grid="${lib}"]`), desc = $(`[data-snd-grid-desc="${lib}"]`);
    if (!tabs || !grid) return;
    if (!g.packs.some(p => p[0] === g.pick)) g.pick = g.packs[0][0];
    tabs.innerHTML = g.packs.map(p => `<button class="chip" type="button" aria-pressed="${p[0] === g.pick}" data-pk="${p[0]}">${p[1]}</button>`).join('');
    const show = () => {
      grid.innerHTML = g.render(g.pick);
      const p = g.packs.find(p => p[0] === g.pick); if (desc) desc.textContent = p ? p[2] : '';
      grid.classList.toggle('is-ui', lib === 'uisfx');
    };
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (!b) return;
      g.pick = b.dataset.pk; store(lib === 'webkits' ? 'hr-snd-gwk' : 'hr-snd-gui', g.pick);
      $$('[data-pk]', tabs).forEach(x => x.setAttribute('aria-pressed', String(x === b))); show(); });
    grid.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; ring(b); play(b.dataset.g, b.dataset.p, b.dataset.n); });
    show();
  });
})();
