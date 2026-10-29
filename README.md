# heyrav design system

The tokens, components and patterns behind [heyrav.in](https://heyrav.in), documented with live examples at **[system.heyrav.in](https://system.heyrav.in)**.

## Use it

```html
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://system.heyrav.in/heyrav.css">
<script src="https://system.heyrav.in/js/heyrav.js" defer></script>
```

## Layout

| Path | What |
|---|---|
| `tokens/tokens.json` | Source of truth, W3C DTCG format. Dark values in `$extensions.heyrav.dark`. |
| `css/components.css` | Hand-written components (shipped ones ported verbatim from heyrav.in). |
| `css/docs.css`, `js/docs.js` | Documentation chrome only (`d-` prefix). |
| `js/heyrav.js` | Behaviour for interactive components. No dependencies. |
| `src/*.html` | Page sources: `<page>` blocks with `<example>`, `<swatches>`, `<tokentable>` and `<ph icon/>` tags. |
| `src/icons/` | Phosphor Regular SVGs, fetched from phosphor-icons/core. |

## Build

```sh
node build.mjs
```

No dependencies. Regenerates `css/tokens.css`, `heyrav.css`, every page folder, the search index, `sitemap.xml` and `404.html`. Generated page folders carry a `.generated` marker and are rebuilt from scratch, so never use a page slug that matches a source folder.
