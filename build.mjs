// build.mjs - no dependencies. `node build.mjs` regenerates everything that is
// not hand-written: css/tokens.css, heyrav.css, every page folder, the search
// index, sitemap and 404. Sources: tokens/tokens.json, src/*.html, icons/*.svg.
import { readFileSync as rd, writeFileSync as wr, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://system.heyrav.in';
const T = JSON.parse(rd('tokens/tokens.json', 'utf8'));

/* ---------------- tokens -> css ---------------- */
const flat = []; // {path, name, $value, dark, desc, status, type}
(function walk(o, path) {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object' && '$value' in v) flat.push({ path: [...path, k].join('.'), group: path.join('.'), name: k, value: v.$value, dark: v.$extensions?.heyrav?.dark, desc: v.$description || '', status: v.$extensions?.heyrav?.status || 'spec', type: v.$type });
    else if (v && typeof v === 'object') walk(v, [...path, k]);
  }
})(T, []);
const css = v => typeof v === 'number' ? String(v) : v;
let tok = `/* GENERATED from tokens/tokens.json by build.mjs - do not edit by hand. */\n:root{\n`;
for (const t of flat) tok += `  --${t.name}:${css(t.value)};\n`;
for (const s of ['ok', 'warn', 'danger']) tok += `  --${s}-inv:${flat.find(t => t.name === s).dark};\n`;
tok += `  --wash:var(--surface-2);\n  color-scheme:light;\n}\n`;
tok += `/* Dark is opt-in: heyrav.in is light-only today, so linking this file can\n   never flip a page by itself. Set data-theme="dark" on <html> to use it. */\n[data-theme="dark"]{\n`;
for (const t of flat) if (t.dark && t.dark !== t.value) tok += `  --${t.name}:${t.dark};\n`;
for (const s of ['ok', 'warn', 'danger']) tok += `  --${s}-inv:${flat.find(t => t.name === s).value};\n`;
tok += `  color-scheme:dark;\n}\n@media (max-width:900px){:root{--case-pad:64px;}}\n@media (max-width:640px){:root{--gutter:22px;}}\n`;
wr('css/tokens.css', tok);
wr('heyrav.css', `/* heyrav design system v1 - ${SITE}\n   tokens + components in one file. Link it, then use the classes. */\n` + tok + '\n' + rd('css/components.css', 'utf8'));

/* contrast helpers for swatches */
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const Y = h => { if (!/^#[0-9a-f]{6}$/i.test(h)) return null; const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return .2126 * r + .7152 * g + .0722 * b; };
const cr = (a, b) => { const x = Y(a), y = Y(b); if (x == null || y == null) return null; const [p, q] = [x, y].sort((m, n) => n - m); return ((p + .05) / (q + .05)).toFixed(2); };
const PAPER = flat.find(t => t.name === 'paper');

/* ---------------- icons ---------------- */
const ICON = {};
for (const f of readdirSync('src/icons')) ICON[f.replace('.svg', '')] = rd(join('src/icons', f), 'utf8').replace(/^[\s\S]*?<svg[^>]*>|<\/svg>[\s\S]*$/g, '');
const icon = (n, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 256 256" aria-hidden="true">${ICON[n] || ''}</svg>`;

/* ---------------- navigation ---------------- */
const NAV = [
  ['Overview', ['index', 'principles', 'usage', 'audit']],
  ['Foundations', ['brand', 'colour', 'typography', 'spacing', 'layout', 'radius', 'elevation', 'motion', 'icons', 'imagery', 'accessibility', 'voice']],
  ['Components', ['accordion', 'avatar', 'badge', 'breadcrumb', 'button', 'card', 'checkbox', 'chip', 'code', 'dialog', 'divider', 'drawer', 'drop-zone', 'glossary', 'input', 'kbd', 'link', 'menu', 'pagination', 'popover', 'progress', 'radio', 'segmented', 'select', 'skeleton', 'slider', 'spinner', 'switch', 'table', 'tabs', 'textarea', 'toast', 'tooltip']],
  ['Media', ['figure', 'device', 'video', 'lightbox']],
  ['Patterns', ['nav-bar', 'footer', 'hero', 'section-heading', 'case-row', 'facts', 'metrics', 'quotes', 'steps', 'annotations', 'pins', 'process-loop', 'ia-tree', 'closing-grid', 'loader', 'reveal', 'tool-shell']],
  ['Tools', ['tools']],
];

/* ---------------- pages ---------------- */
const pages = {};
for (const f of readdirSync('src').filter(f => f.endsWith('.html')).sort()) {
  const src = rd(join('src', f), 'utf8');
  for (const m of src.matchAll(/<page\s([^>]*)>([\s\S]*?)<\/page>/g)) {
    const a = attrs(m[1]);
    pages[a.slug] = { ...a, body: m[2] };
  }
}
function attrs(s) { const o = {}; for (const m of s.matchAll(/([\w-]+)="([^"]*)"/g)) o[m[1]] = m[2]; for (const m of s.replace(/"[^"]*"/g, '""').matchAll(/(?:^|\s)([\w-]+)(?=\s|$)/g)) if (!(m[1] in o)) o[m[1]] = true; return o; }
const all = NAV.flatMap(([g, s]) => s.map(slug => ({ g, slug })));
const missing = all.filter(o => !pages[o.slug]).map(o => o.slug);
if (missing.length) console.warn('missing pages:', missing.join(', '));
const order = all.filter(o => pages[o.slug]);

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function dedent(s) {
  const lines = s.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
  const ind = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
  return lines.map(l => l.slice(ind)).join('\n');
}
function hl(code) { // tiny HTML highlighter: tags, attributes, strings, comments
  let out = '', i = 0;
  for (const m of code.matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g)) {
    out += esc(code.slice(i, m.index)); i = m.index + m[0].length;
    if (m[0].startsWith('<!--')) { out += `<span class="c">${esc(m[0])}</span>`; continue; }
    out += m[0].replace(/^(<\/?)([a-zA-Z0-9-]+)([\s\S]*?)(\/?>)$/, (_, o, n, rest, c) =>
      `<span class="t">${esc(o)}${n}</span>` + rest.replace(/([\w:@-]+)(=)("[^"]*")?|([^\s]+)/g, (x, an, eq, av) => an ? `<span class="a">${an}</span>=${av ? `<span class="s">${esc(av)}</span>` : ''}` : esc(x)) + `<span class="t">${esc(c)}</span>`);
  }
  return out + esc(code.slice(i));
}
function transform(body, slug) {
  const heads = [];
  body = body.replace(/<ph\s+([\w-]+)(?:\s+class="([^"]*)")?\s*\/>/g, (_, n, c) => icon(n, c || 'icon'));
  body = body.replace(/<example([^>]*)>([\s\S]*?)<\/example>/g, (_, a, inner) => {
    const at = attrs(a), code = dedent(inner).replace(/ d="[^"]{40,}"/g, ' d="…"');
    const stage = `<div class="d-stage ${at.class || ''}">${inner}</div>`;
    const panel = at.nocode ? '' : `<details class="d-code"><summary>${icon('caret-right')}Show code<button class="d-copy" type="button" aria-label="Copy code">${icon('copy')}</button></summary><pre><code>${hl(code)}</code></pre></details>`;
    return `<div class="d-ex">${stage}${panel}</div>`;
  });
  body = body.replace(/<swatches\s+group="([^"]+)"\s*\/>/g, (_, g) => `<div class="d-sw">` + flat.filter(t => t.group === g).map(t => {
    const c = cr(t.value, PAPER.value), cd = t.dark ? cr(t.dark, PAPER.dark) : null;
    return `<figure><button class="d-chip" style="--c:${t.value};--dk:${t.dark || t.value}" data-copy-var="--${t.name}" aria-label="Copy var(--${t.name})"><i></i></button><figcaption><b>${t.name}</b><code>--${t.name}</code><span>${t.value}${t.dark && t.dark !== t.value ? ' / ' + t.dark : ''}</span>${c && (t.group === 'color.text' || (t.group === 'color.status' && !t.name.endsWith('bg'))) ? `<span>${c}:1 · dark ${cd}:1</span>` : ''}</figcaption></figure>`;
  }).join('') + `</div>`);
  body = body.replace(/<tokentable\s+group="([^"]+)"\s*\/>/g, (_, g) => `<div class="d-scroll"><table class="d-tbl"><thead><tr><th>Token</th><th>Value</th><th>Role</th><th>Status</th></tr></thead><tbody>` +
    flat.filter(t => t.group === g || t.path.startsWith(g + '.')).map(t => `<tr><td><code>--${t.name}</code></td><td><code>${esc(String(t.value))}</code>${t.dark && t.dark !== t.value ? `<br><code>${esc(t.dark)}</code> dark` : ''}</td><td>${esc(t.desc)}</td><td>${badge(t.status)}</td></tr>`).join('') + `</tbody></table></div>`);
  body = body.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, h) => { const id = slugify(h); heads.push([h.replace(/<[^>]+>/g, ''), id]); return `<h2 id="${id}">${h}</h2>`; });
  return { body, heads };
}
const badge = s => ({ shipped: '<span class="badge badge-solid">Shipped</span>', tools: '<span class="badge">In tools</span>', spec: '<span class="badge badge-line">Spec</span>' }[s] || '');

const CLARITY = `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","ysfrdr3mko");</script>`;
const THEME_BOOT = `<script>(function(){var m;try{m=localStorage.getItem('hr-theme')}catch(e){}m=m||'system';document.documentElement.dataset.theme=m==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;})();</script>`;

function sidebar(cur, R) {
  return NAV.map(([g, slugs]) => `<h3>${g}</h3>` + slugs.filter(s => pages[s]).map(s => {
    const p = pages[s], href = s === 'index' ? R : `${R}${s}/`;
    const dot = ['Components', 'Media', 'Patterns'].includes(g) ? `<span class="d-st ${p.status || ''}" title="${p.status || ''}"></span>` : '';
    return `<a href="${href}"${s === cur ? ' aria-current="page"' : ''}>${p.nav || p.title}${dot}</a>`;
  }).join('')).join('');
}
function layout(p, idx) {
  const R = p.slug === 'index' ? './' : '../';
  const { body, heads } = transform(p.body, p.slug);
  const prev = order[idx - 1], next = order[idx + 1];
  const pn = `<nav class="d-pn" aria-label="Pager">${prev ? `<a href="${prev.slug === 'index' ? R : R + prev.slug + '/'}"><small>Previous</small><b>${pages[prev.slug].title}</b></a>` : ''}${next ? `<a class="n" href="${R + next.slug}/"><small>Next</small><b>${pages[next.slug].title}</b></a>` : ''}</nav>`;
  const used = p.used ? `<div class="d-used"><span>Used on</span>${p.used.split(',').map(u => { const [l, h] = u.split('|'); return h ? `<a href="${h.startsWith('http') ? h : 'https://heyrav.in/' + h}">${l}</a>` : `<span>${l}</span>`; }).join('')}</div>` : '';
  const head = p.slug === 'index' ? '' : `<header class="d-head"><div class="d-eyebrow"><span class="label">${order[idx].g}</span>${badge(p.status)}</div><h1>${p.h1 || p.title}</h1>${p.lede ? `<p class="d-lede">${p.lede}</p>` : ''}${used}</header>`;
  const toc = heads.length > 1 ? `<nav class="d-toc" aria-label="On this page"><b>On this page</b>${heads.map(([t, id]) => `<a href="#${id}">${t}</a>`).join('')}</nav>` : '<div></div>';
  const title = p.slug === 'index' ? 'heyrav Design System' : `${p.title} - heyrav Design System`;
  const desc = (p.lede || 'The design system behind heyrav.in: tokens, components and patterns, with live examples and code.').replace(/<[^>]+>/g, '');
  return { heads, html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc.replace(/"/g, '&quot;')}">
<meta name="d-root" content="${R}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc.replace(/"/g, '&quot;')}"><meta property="og:image" content="${SITE}/assets/og.png">
<link rel="canonical" href="${SITE}/${p.slug === 'index' ? '' : p.slug + '/'}">
<link rel="icon" href="${R}assets/brand/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400..600&display=swap" rel="stylesheet">
${THEME_BOOT}
<link rel="stylesheet" href="${R}heyrav.css">
<link rel="stylesheet" href="${R}css/docs.css">
${CLARITY}
</head>
<body class="d">
<div class="progress" aria-hidden="true"></div>
<a class="sr-only" href="#main">Skip to content</a>
<div class="d-top"><a href="${R}"><img class="d-invert" src="${R}assets/brand/lockup.svg" alt="heyrav design system" width="80" height="26"></a><button class="btn btn-quiet btn-icon" data-side-toggle aria-label="Menu">${icon('list')}</button></div>
<div class="d-app">
<aside class="d-side">
  <a class="d-brand" href="${R}"><img src="${R}assets/brand/lockup.svg" alt="Ravindra Pratap" width="92" height="30"><span>System</span></a>
  <button class="d-search" data-search type="button">${icon('magnifying-glass')}Search<span class="kbd">⌘K</span></button>
  <nav class="d-nav" aria-label="Sections">${sidebar(p.slug, R)}</nav>
  <div class="d-foot">
    <div class="seg" role="group" aria-label="Theme"><button data-theme-set="system" aria-pressed="false">System</button><button data-theme-set="light" aria-pressed="false">Light</button><button data-theme-set="dark" aria-pressed="false">Dark</button></div>
    <a class="btn btn-ghost btn-sm btn-block" href="https://heyrav.in">Open heyrav.in ${icon('arrow-up-right')}</a>
  </div>
</aside>
<main class="d-main" id="main"><div class="d-panel"><article class="d-doc">${head}${body}${pn}</article>${toc}</div></main>
</div>
<dialog class="d-k" id="d-k" aria-label="Search"><input type="search" placeholder="Search components, tokens, patterns" aria-label="Search"><ul></ul></dialog>
<script src="${R}js/search-index.js" defer></script>
<script src="${R}js/heyrav.js" defer></script>
<script src="${R}js/docs.js" defer></script>
</body>
</html>
` };
}

/* clean previously generated folders */
for (const d of readdirSync('.', { withFileTypes: true })) if (d.isDirectory() && existsSync(join(d.name, '.generated'))) rmSync(d.name, { recursive: true });
const index = [];
order.forEach((o, i) => {
  const p = pages[o.slug]; if (!p) return;
  const { html, heads } = layout(p, i);
  if (o.slug === 'index') wr('index.html', html);
  else { mkdirSync(o.slug, { recursive: true }); wr(join(o.slug, 'index.html'), html); wr(join(o.slug, '.generated'), ''); }
  index.push({ t: p.title, g: o.g, u: o.slug === 'index' ? '' : o.slug + '/', k: (p.keywords || '').toLowerCase() + ' ' + o.slug, h: heads });
});
wr('js/search-index.js', 'window.DS_INDEX=' + JSON.stringify(index) + ';');
wr('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${order.filter(o => pages[o.slug]).map(o => `<url><loc>${SITE}/${o.slug === 'index' ? '' : o.slug + '/'}</loc></url>`).join('\n')}\n</urlset>\n`);
wr('404.html', layout({ slug: '404', title: 'Not found', status: '', lede: 'That page is not part of the system. Try search (⌘K) or start from the introduction.', body: `<p><a class="btn btn-primary" href="/">Back to the introduction ${icon('arrow-right')}</a></p>` }, 0).html.replace(/"\.\.\//g, '"/'));
console.log(`built ${index.length} pages, ${flat.length} tokens`);
