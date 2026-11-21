// Apply copy edits made in the site's edit mode to src/*.html.
//   node scripts/apply-edits.mjs edits.json      (the JSON from "Raise a PR" or "Copy for Claude";
//   node scripts/apply-edits.mjs message.txt      a pasted message with a ```json block also works)
// Prints what was applied and what has to be done by hand, then rebuild with `node build.mjs`.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const EditCore = createRequire(import.meta.url)('../js/edit-core.js');
const raw = readFileSync(process.argv[2] || 0, 'utf8'), m = raw.match(/```json\s*([\s\S]*?)```/), b = JSON.parse(m ? m[1] : raw);
const ORDER = { add: 0, text: 1, remove: 2 }, missed = [];
for (const f of [...new Set(b.changes.map(c => c.src).filter(Boolean))]) {
  const r = EditCore.apply(readFileSync(f, 'utf8'), b.changes.filter(c => c.src === f).sort((x, y) => ORDER[x.type] - ORDER[y.type]));
  if (r.done.length) writeFileSync(f, r.text);
  console.log(`${f}: ${r.done.length} applied, ${r.missed.length} by hand`); missed.push(...r.missed);
}
missed.push(...b.changes.filter(c => !c.src));
for (const c of missed) console.log(`  by hand · ${c.slug} · ${c.type} · "${c.was}"${c.after ? ' -> ' + c.after : ''}`);
for (const n of b.notes || []) console.log(`  note · ${n.slug} · under "${n.near}": ${n.text}`);
