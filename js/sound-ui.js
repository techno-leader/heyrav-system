/* sound-ui.js - interface sound for the whole system, in each world's voice.

   One speaker switch ([data-snd-toggle]) turns it on for the site, per device
   ('hr-sound', off by default). While it is off this file loads nothing more.
   While it is on, the player (sound.js) and the patches (sound-packs.js) load
   once, and every component is heard through the events it already makes:
   clicks, changes, dialogs opening, toasts arriving. Components carry no
   sound code of their own.

   Voices: Studio, Paper Pixel and Sunken speak Core. Pixel speaks Retro, with
   Arcade where Retro has no sound for the cue. Aurora keeps Core for the small
   touches and speaks Zen for everything that moves or finishes.

   HRSoundUI.cue(id)                      play a cue in the current world's voice
   HRSoundUI.play(id, { world, voice })   the same, even while the switch is off
   HRSoundUI.ref(id, voice)               'wk:core/click' or 'ui:zen/open'      */
(() => {
  const me = document.currentScript, root = document.documentElement;
  const HERE = me ? new URL('.', me.src).href : '/js/', BASE = new URL('../', HERE).href;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };

  /* ---- cues: weight, then the sound in each voice ---- */
  const WEIGHT = { touch: .55, move: .75, result: 1 };
  //            weight     core                retro / arcade          core / zen
  const T = {
    press:        ['touch',  'click',          'wk:retro/click',       'wk:core/click'],
    'toggle-on':  ['touch',  'toggle-on',      'wk:retro/toggle-on',   'wk:core/toggle-on'],
    'toggle-off': ['touch',  'toggle-off',     'wk:retro/toggle-off',  'wk:core/toggle-off'],
    check:        ['touch',  'checkbox',       'wk:retro/checkbox',    'wk:core/checkbox'],
    uncheck:      ['touch',  'deselect',       'wk:retro/deselect',    'wk:core/deselect'],
    select:       ['touch',  'tab-switch',     'wk:retro/tab-switch',  'wk:core/tab-switch'],
    tick:         ['touch',  'tick',           'wk:retro/tap',         'wk:core/tick'],
    expand:       ['move',   'expand',         'wk:retro/expand',      'ui:zen/expand'],
    collapse:     ['move',   'collapse',       'wk:retro/collapse',    'ui:zen/collapse'],
    open:         ['move',   'dropdown-open',  'ui:arcade/open',       'ui:zen/open'],
    close:        ['move',   'dropdown-close', 'ui:arcade/close',      'ui:zen/close'],
    search:       ['move',   'command',        'wk:retro/pop',         'ui:zen/open'],
    dark:         ['move',   'slide-down',     'ui:arcade/sleep',      'ui:zen/sleep'],
    light:        ['move',   'slide-up',       'ui:arcade/wake',       'ui:zen/wake'],
    world:        ['move',   'whoosh',         'wk:retro/page-enter',  'ui:zen/swipe'],
    play:         ['move',   'select',         'ui:arcade/play',       'ui:zen/play'],
    pause:        ['move',   'deselect',       'ui:arcade/pause',      'ui:zen/pause'],
    copy:         ['result', 'copy',           'wk:retro/copy',        'ui:zen/copy'],
    success:      ['result', 'success',        'wk:retro/success',     'ui:zen/success'],
    error:        ['result', 'error',          'wk:retro/error',       'ui:zen/error'],
    send:         ['result', 'send',           'wk:retro/send',        'ui:zen/send'],
    delete:       ['result', 'delete',         'wk:retro/delete',      'ui:zen/delete'],
    undo:         ['result', 'undo',           'wk:retro/undo',        'ui:zen/undo'],
  };
  const VOICES = {
    core:   { name: 'Core',   worlds: ['studio', 'paper', 'sunken'], col: 1 },
    pixel:  { name: 'Pixel',  worlds: ['pixel'],  col: 2 },
    aurora: { name: 'Aurora', worlds: ['aurora'], col: 3 },
  };
  const voiceOf = w => Object.keys(VOICES).find(v => VOICES[v].worlds.includes(w)) || 'core';
  const world = () => root.dataset.world || 'studio';
  const ref = (id, v = 'core') => { const c = T[id]; if (!c) return ''; const r = c[VOICES[v].col]; return v === 'core' ? 'wk:core/' + r : r; };

  /* ---- loading: only once the switch is on (or the Sound page asks) ---- */
  let ready = null;
  const js = (n, v) => new Promise((res, rej) => { const s = Object.assign(document.createElement('script'), { src: HERE + n + '.js' + (v ? '?v=' + v : ''), onload: res, onerror: rej }); document.head.append(s); });
  const load = () => ready || (ready = Promise.all([
    window.HRSound || js('sound', me && me.dataset.vSound),
    window.HR_SOUND_LIB || js('sound-packs', me && me.dataset.vPacks),
  ]).then(() => { warm(voiceOf(world())); return true; }, () => { ready = null; return false; }));
  const sfx = (pack, n) => BASE + 'assets/sfx/' + pack + '/' + n + '.mp3';
  const warm = v => { if (!window.HRSound) return; for (const id in T) { const r = ref(id, v); if (r.startsWith('ui:')) { const [p, n] = r.slice(3).split('/'); HRSound.preload(sfx(p, n)); } } };
  // UI SFX files carry their own level (about 0.2); bring them to the synthesised voices' loudness
  const uiGain = n => { const c = window.HR_SOUND_LIB && HR_SOUND_LIB.uisfx.cues.find(c => c[0] === n); return (c ? c[2] : .2) / .2 * .55; };

  let lastResult = 0;
  function play(id, o = {}) {
    const c = T[id]; if (!c) return Promise.resolve();
    const w = WEIGHT[c[0]];
    if (c[0] === 'result' && !o.force) { const now = performance.now(); if (now - lastResult < 500) return Promise.resolve(); lastResult = now; } // one result per action
    const r = ref(id, o.voice || voiceOf(o.world || world()));
    return load().then(ok => {
      if (!ok || !r) return;
      const [lib, rest] = [r.slice(0, 2), r.slice(3)], [pack, n] = rest.split('/');
      if (lib === 'wk') { const d = HR_SOUND_LIB.webkits[pack] && HR_SOUND_LIB.webkits[pack].s[n]; if (d) return HRSound.play(d, { volume: w * (o.volume || 1), key: o.key || 'cue:' + id, gap: o.gap }); }
      else return HRSound.play(sfx(pack, n), { volume: uiGain(n) * w * (o.volume || 1), key: o.key || 'cue:' + id, gap: o.gap }).catch(() => {});
    });
  }
  const on = () => LS('hr-sound') === '1';
  const cue = (id, o) => on() ? play(id, o) : Promise.resolve();

  /* ---- the speaker switch ---- */
  const paint = () => document.querySelectorAll('[data-snd-toggle]').forEach(b => {
    const s = on(); b.setAttribute('aria-pressed', String(s));
    const tt = b.getAttribute('aria-describedby') && document.getElementById(b.getAttribute('aria-describedby'));
    if (tt) tt.textContent = s ? 'Sound on' : 'Sound off';
  });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-snd-toggle]'); if (!b) return;
    if (on()) { play('toggle-off', { force: true }); LS('hr-sound', null); }
    else { LS('hr-sound', '1'); load().then(() => { HRSound.unlock(); play('toggle-on'); }); }
    paint();
  });
  addEventListener('storage', e => { if (e.key === 'hr-sound') paint(); });

  /* ---- listening: only to what a hand just did ---- */
  let acted = -1e9;
  const act = () => { acted = performance.now(); if (window.HRSound && on()) HRSound.unlock(); };
  addEventListener('pointerdown', act, true); addEventListener('keydown', act, true);
  const recent = (ms = 1500) => performance.now() - acted < ms;
  const own = el => !el || !el.closest || !!el.closest('[data-snd-own]'); // the Sound page plays its own demos

  /* clicks: read the state before the components change it, decide after */
  document.addEventListener('click', e => {
    if (!on() || own(e.target)) return;
    const el = e.target.closest('button,[role="tab"],[role="menuitem"],.chip,a[aria-expanded],[data-copy-var]');
    if (!el || el.disabled || el.matches('[data-snd-toggle]')) return;
    const pre = { pressed: el.getAttribute('aria-pressed'), sel: el.getAttribute('aria-selected'), exp: el.getAttribute('aria-expanded'),
      theme: root.dataset.theme, world: world(), morph: el.closest('[data-morph]') && el.closest('[data-morph]').dataset.state };
    setTimeout(() => decide(el, pre), 0);
  }, true);
  function decide(el, pre) {
    const m = s => el.matches(s);
    if (m('[data-world-set]')) { if (el.dataset.worldSet !== pre.world) cue('world', { world: el.dataset.worldSet }); return; }
    if (m('[data-theme-set]')) { if (pre.pressed === 'true') return; const t = root.dataset.theme; cue(t === pre.theme ? 'select' : t === 'dark' ? 'dark' : 'light'); return; }
    if (m('.d-copy,[data-copy-var],[data-copy]')) return cue('copy');
    // dialogs, toasts and details are heard when they change, below
    if (m('[data-open],[data-search],[data-close],[data-toast],[data-morph-close],.lb-close')) return;
    if (m('[data-side-toggle]')) return cue(document.body.classList.contains('d-open') ? 'open' : 'close');
    if (m('[aria-expanded]')) { const x = el.getAttribute('aria-expanded'); if (x !== pre.exp) cue(x === 'true' ? 'open' : 'close'); return; }
    if (m('[role="tab"]')) { if (pre.sel !== 'true') cue('select'); return; }
    if (m('[aria-pressed]')) {
      const x = el.getAttribute('aria-pressed'); if (x === pre.pressed) return;
      if (el.closest('.seg,[data-single],[role="radiogroup"]')) { if (x === 'true') cue('select'); return; }
      return cue(x === 'true' ? 'check' : 'uncheck');
    }
    if (m('.morph-btn')) { if (!pre.morph || pre.morph === 'idle') cue('press'); return; }
    if (m('.vid-start')) return cue('play');
    if (m('.vid-btn')) return cue(/pause/i.test(el.getAttribute('aria-label') || '') ? 'play' : 'pause');
    if (m('[role="menuitem"]')) return cue('select');
    if (m('a')) return; // a link's new page is its own answer
    if (m('.btn,[data-pending]')) return cue('press');
  }
  document.addEventListener('keydown', e => {
    if (!on() || own(e.target)) return;
    if (e.key === 'Escape') { const n = document.querySelectorAll('[aria-expanded="true"][aria-controls]').length; if (n) setTimeout(() => { if (document.querySelectorAll('[aria-expanded="true"][aria-controls]').length < n) cue('close'); }, 0); }
    else if (/^Arrow(Left|Right)$/.test(e.key) && e.target.matches && e.target.matches('[role="tab"]')) setTimeout(() => cue('select'), 0);
  }, true);

  /* inputs */
  document.addEventListener('change', e => {
    const i = e.target; if (!on() || own(i) || !recent()) return;
    if (i.type === 'checkbox') cue(i.closest('.tgl') || i.getAttribute('role') === 'switch' ? (i.checked ? 'toggle-on' : 'toggle-off') : (i.checked ? 'check' : 'uncheck'));
    else if (i.type === 'radio' || i.tagName === 'SELECT') cue('select');
  });
  /* sliders tick on whole steps; a fine slider ticks twelve times across its length, not on every value */
  document.addEventListener('input', e => {
    const r = e.target; if (r.type !== 'range' || !on() || own(r)) return;
    const lo = +r.min || 0, hi = r.max === '' ? 100 : +r.max, st = r.step === 'any' ? 0 : (+r.step || 1), span = hi - lo || 1;
    const b = st && span / st <= 24 ? Math.round((r.value - lo) / st) : Math.round((r.value - lo) / span * 12);
    if (r._snd !== b) { const first = r._snd === undefined; r._snd = b; if (!first || recent()) cue('tick', { gap: 50 }); }
  });
  /* details: the accordion */
  document.addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && on() && !own(d) && recent()) cue(d.open ? 'expand' : 'collapse'); }, true);

  /* things that arrive or change: dialogs, pending buttons, the morph button, toasts */
  new MutationObserver(list => {
    if (!on()) return;
    for (const r of list) {
      const t = r.target; if (own(t)) continue;
      if (r.attributeName === 'open' && t.tagName === 'DIALOG') { if (recent()) cue(t.hasAttribute('open') ? (t.id === 'd-k' ? 'search' : 'open') : 'close'); }
      else if (r.attributeName === 'aria-busy' && t.matches('[data-pending]') && !t.hasAttribute('aria-busy') && recent(5000)) cue('success');
      else if (r.attributeName === 'data-state' && t.matches('[data-morph]') && recent(6000)) {
        const s = t.dataset.state; if (s === r.oldValue) continue;
        if (s === 'done') cue('success'); else if (s === 'open') cue('expand'); else if (s === 'idle' && r.oldValue === 'open') cue('collapse');
      }
    }
  }).observe(root, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['open', 'aria-busy', 'data-state'] });
  const heard = n => {
    if (n.nodeType !== 1 || !n.classList.contains('toast') || n._snd || !on() || !recent(5000)) return; n._snd = 1;
    if (n.classList.contains('toast-ok')) cue('success'); else if (n.classList.contains('toast-danger')) cue('error');
  };
  const toasts = new MutationObserver(list => { for (const r of list) r.addedNodes.forEach(heard); });
  // the first toast arrives with its own container, before anything is watching it
  const watchToasts = () => { const h = document.querySelector('.toasts'); if (h && !h._snd) { h._snd = 1; toasts.observe(h, { childList: true }); [...h.children].forEach(heard); } };
  new MutationObserver(watchToasts).observe(document.body || root, { childList: true }); watchToasts();

  /* a visitor who left sound on gets it ready while the page is idle */
  const boot = () => { paint(); if (on()) (window.requestIdleCallback || setTimeout)(load); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
  addEventListener('worldchange', () => { if (window.HRSound) warm(voiceOf(world())); });

  window.HRSoundUI = { cue, play, ref, load, on, voices: VOICES, voiceOf, cues: T, weight: id => T[id] && T[id][0] };
})();
