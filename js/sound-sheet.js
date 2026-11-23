/* sound-sheet.js - the Sound page: every interaction that carries a sound, each
   playable in the current world's voice. The voices live in sound-ui.js; this
   page plays them even while the site's speaker is off, because hearing them
   is its job. */
document.addEventListener('DOMContentLoaded', () => {
  const S = window.HRSound, U = window.HRSoundUI;
  const map = document.querySelector('[data-snd-own]');
  if (!S || !U || !map) return;
  const $$ = s => [...map.querySelectorAll(s)];
  const voice = () => U.voiceOf(document.documentElement.dataset.world || 'studio');
  const cue = id => { S.unlock(); return U.play(id, { voice: voice(), force: true }); };

  map.addEventListener('click', e => {
    const b = e.target.closest('[data-snd]'); if (b) {
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
      cue(ids[Math.min(i, ids.length - 1)]);
    }
  });
  $$('input[type=checkbox][data-snd-on]').forEach(i => i.addEventListener('change', () => cue(i.checked ? i.dataset.sndOn : i.dataset.sndOff)));
  $$('details[data-snd-on]').forEach(d => d.addEventListener('toggle', () => cue(d.open ? d.dataset.sndOn : d.dataset.sndOff)));
  $$('[data-snd-range]').forEach(r => { let v = r.value; r.addEventListener('input', () => { if (r.value !== v) { v = r.value; cue(r.dataset.sndRange); } }); });
});
