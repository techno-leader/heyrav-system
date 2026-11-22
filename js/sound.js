/* sound.js - the system's interface sound player.

   Plays two kinds of sound through one quiet master bus:
   - a synthesised definition (plain data: layers of oscillator or noise, an
     ADSR envelope, filters, reverb), the patch format of @web-kits/audio
     (MIT, Raphael Salaja), rendered here with the same envelope and sweep maths;
   - a short recorded file by URL, decoded once and cached.

   HRSound.play(defOrUrl, { volume, detune, pan, jitter, key }) -> Promise
   HRSound.volume(v?)   master volume 0..1, kept per device ('hr-sound-vol')
   HRSound.enabled(on?) the visitor's sound setting ('hr-sound'), off by default
   HRSound.unlock()     call from the first click or key press

   Nothing plays while the tab is hidden, and one key cannot fire twice inside
   40ms, so a dragged slider or a held key never turns into a buzz. */
(function () {
  const SILENCE = 0.0001, LS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let ctx = null, bus = null, vol = parseFloat(LS('hr-sound-vol') || '0.7');
  const last = new Map(), buffers = new Map(), verbs = new Map();

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC({ latencyHint: 'interactive' });
      bus = ctx.createGain(); bus.gain.value = vol;
      const lim = ctx.createDynamicsCompressor(); // a soft ceiling, so two cues at once never clip
      lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = .002; lim.release.value = .12;
      bus.connect(lim); lim.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---- sources ---- */
  function noise(c, color, dur) {
    const len = Math.ceil(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    if (color === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1;
        b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
        b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; }
    } else if (color === 'brown') {
      let l = 0; for (let i = 0; i < len; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
    } else for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function source(c, s, t, dur) {
    if (s.type === 'noise') {
      const n = c.createBufferSource(); n.buffer = noise(c, s.color || 'white', dur + .1);
      n.start(t); n.stop(t + dur + .1); return { node: n, end: n };
    }
    const o = c.createOscillator(); o.type = s.type;
    const f = s.frequency, f0 = typeof f === 'number' ? f : f.start;
    o.frequency.setValueAtTime(f0, t);
    if (typeof f !== 'number') o.frequency.exponentialRampToValueAtTime(Math.max(f.end, 1), t + dur);
    if (s.detune) o.detune.value = s.detune;
    o.start(t); o.stop(t + dur + .1);
    if (s.fm) { // the modulator follows the start pitch, as in the reference engine
      const m = c.createOscillator(), g = c.createGain();
      m.frequency.value = f0 * s.fm.ratio; g.gain.value = s.fm.depth;
      m.connect(g); g.connect(o.frequency); m.start(t); m.stop(t + dur + .1);
    }
    return { node: o, end: o, detune: o.detune };
  }

  /* ---- shaping ---- */
  function envelope(c, e, gain, t) {
    const g = c.createGain();
    if (!e) { g.gain.setValueAtTime(gain, t); g.gain.setTargetAtTime(SILENCE, t, .15); return { node: g, dur: .5 }; }
    const a = e.attack || 0, d = e.decay, s = e.sustain || 0, r = e.release || 0;
    g.gain.setValueAtTime(SILENCE, t);
    if (a > 0) g.gain.linearRampToValueAtTime(gain, t + a); else g.gain.setValueAtTime(gain, t);
    if (s > 0) { g.gain.setTargetAtTime(Math.max(s * gain, SILENCE), t + a, d / 3); if (r > 0) g.gain.setTargetAtTime(SILENCE, t + a + d, r / 3); }
    else g.gain.setTargetAtTime(SILENCE, t + a, d / 3);
    return { node: g, dur: a + d + r };
  }
  function filter(c, f, t) {
    const n = c.createBiquadFilter(); n.type = f.type;
    n.frequency.setValueAtTime(f.frequency, t); n.Q.value = f.resonance == null ? 1 : f.resonance;
    if (f.gain != null) n.gain.value = f.gain;
    if (f.envelope) { const e = f.envelope, ae = t + (e.attack || 0);
      n.frequency.linearRampToValueAtTime(e.peak, ae); n.frequency.exponentialRampToValueAtTime(Math.max(f.frequency, 1), ae + e.decay); }
    return n;
  }
  function impulse(c, decay, damping) { // cached: one tail per shape, not one per click
    const k = decay + '|' + damping; if (verbs.has(k)) return verbs.get(k);
    const len = Math.max(1, Math.ceil(c.sampleRate * decay)), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let p = 0; const q = Math.min(damping, .99);
      for (let i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * .28)); if (q > 0) { p = d[i] * (1 - q) + p * q; d[i] = p; } } }
    verbs.set(k, b); return b;
  }
  function effect(c, e) {
    const input = c.createGain(), output = c.createGain();
    if (e.type === 'gain') { input.gain.value = e.value; input.connect(output); return { input, output }; }
    if (e.type === 'pan') { const p = c.createStereoPanner(); p.pan.value = e.value; input.connect(p); p.connect(output); return { input, output }; }
    const mix = e.mix == null ? .3 : e.mix, dry = c.createGain(), wet = c.createGain();
    dry.gain.value = 1 - mix; wet.gain.value = mix; input.connect(dry); dry.connect(output); input.connect(wet);
    if (e.type === 'reverb') {
      const cv = c.createConvolver(); cv.buffer = impulse(c, (e.decay == null ? .5 : e.decay) * (e.roomSize || 1), e.damping || 0);
      if (e.preDelay > 0) { const pd = c.createDelay(Math.max(e.preDelay + .01, 1)); pd.delayTime.value = e.preDelay; wet.connect(pd); pd.connect(cv); } else wet.connect(cv);
      cv.connect(output);
    } else if (e.type === 'delay') {
      const time = e.time == null ? .25 : e.time, dl = c.createDelay(Math.max(time + .01, 1)), fb = c.createGain();
      dl.delayTime.value = time; fb.gain.value = e.feedback == null ? .3 : e.feedback;
      wet.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(output);
    } else wet.connect(output); // effects the shipped packs never use pass through dry
    return { input, output };
  }
  function chain(c, list, dest) {
    if (!list || !list.length) return dest;
    const fx = list.map(e => effect(c, e));
    fx.forEach((f, i) => f.output.connect(i < fx.length - 1 ? fx[i + 1].input : dest));
    return fx[0].input;
  }

  function render(c, def, o) {
    const layers = def.layers || [def], out = c.createGain(); out.connect(bus);
    const head = chain(c, def.layers ? def.effects : null, out), t0 = c.currentTime + .005;
    const j = o.jitter || {}, dj = j.detune ? (Math.random() * 2 - 1) * j.detune : 0, vj = j.volume ? 1 + (Math.random() * 2 - 1) * j.volume : 1;
    let end = 0;
    for (const L of layers) {
      const t = t0 + (L.delay || 0), env = envelope(c, L.envelope, (L.gain == null ? .5 : L.gain) * (o.volume == null ? 1 : o.volume) * vj, t);
      const src = source(c, L.source, t, env.dur);
      if (src.detune && (o.detune || dj)) src.detune.value += (o.detune || 0) + dj;
      let tail = src.node;
      for (const f of [].concat(L.filter || [])) { const n = filter(c, f, t); tail.connect(n); tail = n; }
      tail.connect(env.node);
      let cur = env.node;
      if (L.effects && L.effects.length) { const fx = L.effects.map(e => effect(c, e)); cur.connect(fx[0].input); fx.forEach((f, i) => i < fx.length - 1 && f.output.connect(fx[i + 1].input)); cur = fx[fx.length - 1].output; }
      const pan = o.pan != null ? o.pan : L.pan;
      if (pan) { const p = c.createStereoPanner(); p.pan.value = pan; cur.connect(p); cur = p; }
      cur.connect(head);
      end = Math.max(end, (L.delay || 0) + env.dur);
    }
    setTimeout(() => { try { out.disconnect(); } catch (e) {} }, (end + 2.5) * 1000); // reverb tails ring past the envelope
  }

  async function file(c, url, o) {
    let b = buffers.get(url);
    if (!b) { b = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(a => new Promise((res, rej) => c.decodeAudioData(a, res, rej))); buffers.set(url, b); }
    let buf; try { buf = await b; } catch (e) { buffers.delete(url); throw e; }
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf;
    if (o.detune) s.detune.value = o.detune;
    g.gain.value = o.volume == null ? 1 : o.volume; s.connect(g);
    if (o.pan) { const p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(bus); } else g.connect(bus);
    s.start();
  }

  const HRSound = {
    play(what, o = {}) {
      if (document.hidden || !what) return Promise.resolve();
      const key = o.key || (typeof what === 'string' ? what : ''), now = performance.now();
      if (key) { if (now - (last.get(key) || -1e9) < (o.gap || 40)) return Promise.resolve(); last.set(key, now); }
      const c = context(); if (!c) return Promise.resolve();
      if (typeof what === 'string') return file(c, what, o);
      render(c, what, o); return Promise.resolve();
    },
    preload(url) { const c = context(); if (c && !buffers.has(url)) buffers.set(url, fetch(url).then(r => r.arrayBuffer()).then(a => new Promise((res, rej) => c.decodeAudioData(a, res, rej))).catch(() => buffers.delete(url))); },
    volume(v) {
      if (v == null) return vol;
      vol = Math.max(0, Math.min(1, v)); try { localStorage.setItem('hr-sound-vol', String(vol)); } catch (e) {}
      if (bus) bus.gain.setTargetAtTime(vol, ctx.currentTime, .02);
      return vol;
    },
    enabled(on) {
      if (on == null) return LS('hr-sound') === '1';
      try { on ? localStorage.setItem('hr-sound', '1') : localStorage.removeItem('hr-sound'); } catch (e) {}
      return !!on;
    },
    unlock() { context(); },
  };
  window.HRSound = HRSound;
})();
