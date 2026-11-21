/* edit-core.js - turns copy edits made on the live site back into the page
   sources (src/*.html). Shared by the in-page editor (js/edit.js, for "Raise
   a PR") and by scripts/apply-edits.mjs (for edits handed to Claude).

   A change is { slug, src, type: 'text'|'remove'|'add', kind: 'h1'|'lede'|'',
   before, after }. `before` is the built HTML of the element (inner HTML for
   text, outer HTML for remove and add), `after` the new inner HTML (text) or
   the new element's HTML (add). Built HTML matches the source for prose;
   anything that was generated (demos, icons, token tables) cannot be found
   and comes back in `missed`, to be done by hand.

   EditCore.apply(fileText, changes) -> { text, done: [change], missed: [change] } */
(function (root) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // whitespace-tolerant pattern for a piece of HTML; h2 ids are added by the build, so they may be absent in the source
  const loose = html => new RegExp(esc(html.trim().replace(/<h2 id="[^"]*">/g, '<h2>')).replace(/\s+/g, '\\s+').replace(/<h2>/g, '<h2(?:\\s+id="[^"]*")?>').replace(/&amp;/g, '(?:&amp;|&)').replace(/&nbsp;/g, '(?:&nbsp;|\u00a0)'));
  const attrText = html => html.replace(/<em>([\s\S]*?)<\/em>/g, '*$1*').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();
  function pageRange(text, slug) {
    const re = new RegExp('<page\\s[^>]*slug="' + esc(slug) + '"[^>]*>([\\s\\S]*?)</page>'), m = re.exec(text);
    return m ? { start: m.index, open: m[0].indexOf('>') + 1, end: m.index + m[0].length - '</page>'.length } : null;
  }
  function apply(text, changes) {
    const done = [], missed = [];
    for (const c of changes) {
      const r = pageRange(text, c.slug); if (!r) { missed.push(c); continue; }
      const tag = text.slice(r.start, r.start + r.open), bodyStart = r.start + r.open, body = text.slice(bodyStart, r.end);
      if (c.kind === 'h1' || c.kind === 'lede') {
        const name = c.kind, re = new RegExp('(\\s' + name + '=")([^"]*)(")');
        let nt;
        if (c.type === 'remove') nt = name === 'lede' ? tag.replace(new RegExp('\\s' + name + '="[^"]*"'), '') : null;
        else if (re.test(tag)) nt = tag.replace(re, (_, a, __, z) => a + attrText(c.after) + z);
        else if (name === 'h1') nt = tag.replace(/>$/, ' h1="' + attrText(c.after) + '">');
        if (nt == null) { missed.push(c); continue; }
        text = text.slice(0, r.start) + nt + text.slice(r.start + r.open); done.push(c); continue;
      }
      let m = null;
      // short text (a button label, a word in a demo) can appear many times: find the element by its
      // whole tag first, and take the same occurrence the editor saw on the page
      if (c.type === 'text' && c.outer && c.outer !== c.before) {
        const re = new RegExp(loose(c.outer).source, 'g'), hits = [...body.matchAll(re)], h = hits[Math.min(c.nth || 0, hits.length - 1)];
        if (h) { const open = h[0].indexOf('>') + 1, inner = h[0].slice(open), close = inner.lastIndexOf('</'), j = close >= 0 ? close : inner.length;
          m = { index: h.index + open, len: j }; }
      }
      const target = c.before;
      if (!m) { const i = body.indexOf(target.trim()); if (i >= 0) m = { index: i, len: target.trim().length }; }
      if (!m) { const mm = loose(target).exec(body); if (mm) m = { index: mm.index, len: mm[0].length }; }
      if (!m) { missed.push(c); continue; }
      const a = bodyStart + m.index, b = a + m.len; let rep;
      if (c.type === 'text') rep = c.after;
      else if (c.type === 'remove') rep = '';
      else rep = text.slice(a, b) + '\n' + c.after;
      if (c.type === 'remove') { // take the now-empty line with it
        const ls = text.lastIndexOf('\n', a - 1) + 1, le = text.indexOf('\n', b);
        const onlyLine = !text.slice(ls, a).trim() && !text.slice(b, le < 0 ? text.length : le).trim();
        text = onlyLine ? text.slice(0, ls) + text.slice(le < 0 ? text.length : le + 1) : text.slice(0, a) + text.slice(b);
      } else text = text.slice(0, a) + rep + text.slice(b);
      done.push(c);
    }
    return { text, done, missed };
  }
  const api = { apply };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EditCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
