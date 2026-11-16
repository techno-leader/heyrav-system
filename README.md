# heyrav design system

The tokens, components and patterns behind [heyrav.in](https://heyrav.in), documented with live examples at **[system.heyrav.in](https://system.heyrav.in)**.

## Use it

```html
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://system.heyrav.in/heyrav.css">
<script src="https://system.heyrav.in/js/heyrav.js" defer></script>
```

## Worlds

One system, many worlds: the same markup can become an 8-bit platformer (Pixel), a fairy tale (Fable), a polar night (Aurora) or something alive (Symbiote), each with a light and a dark side. No attribute is Studio, the system as it ships.

```html
<html data-world="aurora">
<link rel="stylesheet" href="https://system.heyrav.in/worlds.css">
<script src="https://system.heyrav.in/js/worlds-data.js" defer></script>
<script src="https://system.heyrav.in/js/worlds.js" defer></script>
<button data-world-set="pixel">Pixel</button>
```

A world is `tokens/worlds/<id>.json` (token overrides: `base`, `light`, `dark`) plus an optional `css/worlds/<id>.css` for flourishes. Components read the **world contract** (the `world` group in `tokens/tokens.json`); its defaults are Studio, so pages that never set a world are unchanged. See [system.heyrav.in/worlds](https://system.heyrav.in/worlds/).

## Layout

| Path | What |
|---|---|
| `tokens/tokens.json` | Source of truth, W3C DTCG format. Dark values in `$extensions.heyrav.dark`. |
| `tokens/worlds/*.json`, `css/worlds/*.css` | Worlds: token overrides and flourishes. Built into `worlds.css` and `js/worlds-data.js`. |
| `js/worlds.js` | The world switch: fonts on demand, the reveal, ambient layers. |
| `css/components.css` | Hand-written components (shipped ones ported verbatim from heyrav.in). |
| `css/docs.css`, `js/docs.js` | Documentation chrome only (`d-` prefix). |
| `js/heyrav.js` | Behaviour for interactive components. No dependencies. |
| `src/*.html` | Page sources: `<page>` blocks with `<example>`, `<swatches>`, `<tokentable>` and `<ph icon/>` tags. |
| `src/icons/` | Phosphor Regular SVGs, fetched from phosphor-icons/core. |

## Build

```sh
node build.mjs
```

No dependencies. Regenerates `css/tokens.css`, `heyrav.css`, `worlds.css`, `js/worlds-data.js`, every page folder, the search index, `sitemap.xml` and `404.html`. Generated page folders carry a `.generated` marker and are rebuilt from scratch, so never use a page slug that matches a source folder.
