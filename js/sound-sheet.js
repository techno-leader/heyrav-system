/* sound-sheet.js - the Sound page: every interaction with its cue in each
   world's voice, and every sound in the packs the voices are made from, each
   playable alone. The voices themselves live in sound-ui.js; this page plays
   them even while the site's speaker is off, because hearing them is its job. */
document.addEventListener('DOMContentLoaded', () => {
  const LIB = window.HR_SOUND_LIB, S = window.HRSound, U = window.HRSoundUI;
  if (!LIB || !S || !U) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const VOICES = Object.keys(U.voices);
  let voice = U.voiceOf(document.documentElement.dataset.world || 'studio');

  const cue = (id, v = voice) => { S.unlock(); return U.play(id, { voice: v, force: true }); };
  const short = r => r.slice(3); // 'wk:core/click' -> 'core/click'

  /* ---- the bar ---- */
  const paintVoice = () => {
    $$('[data-snd-voice]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sndVoice === voice)));
    $$('.d-snd-key[data-v]').forEach(k => k.classList.toggle('is-voice', k.dataset.v === voice));
    $$('.d-snd-heads span').forEach((h, i) => h.classList.toggle('is-voice', VOICES[i - 1] === voice));
  };
  $$('[data-snd-voice]').forEach(b => b.addEventListener('click', () => { voice = b.dataset.sndVoice; paintVoice(); cue('select'); }));
  addEventListener('worldchange', () => { voice = U.voiceOf(document.documentElement.dataset.world || 'studio'); paintVoice(); });
  const vol = $('[data-snd-vol]'), volv = $('[data-snd-volval]');
  if (vol) {
    vol.value = Math.round(S.volume() * 100); if (volv) volv.textContent = vol.value;
    vol.addEventListener('input', () => { S.volume(vol.value / 100); if (volv) volv.textContent = vol.value; });
    vol.addEventListener('change', () => cue('tick'));
  }

  /* ---- the map: the same cue in every voice, under each row ---- */
  const tpl = $('[data-snd-icons]'), PLAY = tpl ? tpl.content.querySelector('svg').outerHTML : '';
  $$('.d-snd-row').forEach(row => {
    const box = document.createElement('div'); box.className = 'd-snd-ab';
    box.innerHTML = row.dataset.cues.split(/\s+/).map(id => `<span class="d-snd-sub">${id.replace('toggle-', '')}</span>` +
      VOICES.map(v => `<button class="d-snd-key" type="button" data-cue="${id}" data-v="${v}" aria-label="${id} in ${U.voices[v].name}: ${short(U.ref(id, v))}">${PLAY}<span>${short(U.ref(id, v))}</span></button>`).join('')).join('');
    row.appendChild(box);
    box.addEventListener('click', e => { const k = e.target.closest('[data-cue]'); if (k) { ring(k); cue(k.dataset.cue, k.dataset.v); } });
  });
  function ring(el) { el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on'); }
  paintVoice();

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

  /* ---- every sound in the packs the voices are made from ---- */
  const UI_VOL = Object.fromEntries(LIB.uisfx.cues.map(c => [c[0], c[2]]));
  function play(lib, pack, n) {
    S.unlock();
    if (lib === 'webkits') { const d = LIB.webkits[pack] && LIB.webkits[pack].s[n]; return d ? S.play(d, { key: 'wk:' + pack + n }) : Promise.resolve(); }
    return S.play(LIB.uisfx.base + pack + '/' + n + '.mp3', { volume: (UI_VOL[n] || .2) / .2 * .55, key: 'ui:' + pack + n }).catch(() => {});
  }
  const key = (lib, pack, n) => `<button class="d-snd-key" type="button" data-g="${lib}" data-p="${pack}" data-n="${n}">${PLAY}<span>${n}</span></button>`;
  const grids = {
    webkits: { packs: Object.keys(LIB.webkits).map(k => [k, LIB.webkits[k].name, LIB.webkits[k].d]),
      render: pack => Object.keys(LIB.webkits[pack].s).map(n => key('webkits', pack, n)).join('') },
    uisfx: { packs: LIB.uisfx.packs,
      render: pack => LIB.uisfx.cats.filter(c => c[0] !== 'loops').map(([cid, cl]) => {
        const cs = LIB.uisfx.cues.filter(c => c[1] === cid && !c[3]); if (!cs.length) return '';
        return `<p class="label d-snd-cat">${cl}</p>` + cs.map(c => key('uisfx', pack, c[0])).join('');
      }).join('') },
  };
  Object.entries(grids).forEach(([lib, g]) => {
    const tabs = $(`[data-snd-grid-packs="${lib}"]`), grid = $(`[data-snd-grid="${lib}"]`), desc = $(`[data-snd-grid-desc="${lib}"]`);
    if (!tabs || !grid) return;
    let pick = g.packs[0][0];
    tabs.innerHTML = g.packs.map(p => `<button class="chip" type="button" aria-pressed="${p[0] === pick}" data-pk="${p[0]}">${p[1]}</button>`).join('');
    const show = () => {
      grid.innerHTML = g.render(pick);
      const p = g.packs.find(p => p[0] === pick); if (desc) desc.textContent = p ? p[2] : '';
      grid.classList.toggle('is-ui', lib === 'uisfx');
    };
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (!b) return;
      pick = b.dataset.pk; $$('[data-pk]', tabs).forEach(x => x.setAttribute('aria-pressed', String(x === b))); show(); });
    grid.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; ring(b); play(b.dataset.g, b.dataset.p, b.dataset.n); });
    show();
  });
});
