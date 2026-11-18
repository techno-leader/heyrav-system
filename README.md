# heyrav design system

The tokens, components and patterns behind [heyrav.in](https://heyrav.in), documented with live examples at **[system.heyrav.in](https://system.heyrav.in)**.

## Use it

```html
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://system.heyrav.in/heyrav.css">
<script src="https://system.heyrav.in/js/heyrav.js" defer></script>
```

## Worlds

One system, many worlds: the same markup can become an 8-bit platformer (Pixel), a paper garden (Paper Pixel), a polar night (Aurora) or a sunken ruin (Sunken), each with a light and a dark side. No attribute is Studio, the system as it ships.

```html
<html data-world="aurora">
<link rel="stylesheet" href="https://system.heyrav.in/worlds.css">
<script src="https://system.heyrav.in/js/worlds-data.js" defer></script>
<script src="https://system.heyrav.in/js/worlds.js" defer></script>
<button data-world-set="pixel">Pixel</button>
```

A world is `tokens/worlds/<id>.json` (token overrides: `base`, `light`, `dark`; its `icons` set and `voice`) plus an optional `css/worlds/<id>.css` for flourishes and an optional `js/worlds/<id>.js` module for its scene, hidden interactions and component behaviour (loaded only when the world is visited). Components read the **world contract** (the `world` group in `tokens/tokens.json`); its defaults are Studio, so pages that never set a world are unchanged. See [system.heyrav.in/worlds](https://system.heyrav.in/worlds/).

## Layout

| Path | What |
|---|---|
| `tokens/tokens.json` | Source of truth, W3C DTCG format. Dark values in `$extensions.heyrav.dark`. |
| `tokens/worlds/*.json`, `css/worlds/*.css` | Worlds: token overrides and flourishes. Built into `worlds.css` and `js/worlds-data.js`. |
| `js/worlds.js` | The world switch: fonts, icon sets and modules on demand, voice, the reveal, the module life cycle. |
| `js/worlds/*.js` | World modules: scenes (the Pixel landscape, the Paper Pixel plants, cat and box, the Aurora sky shader, the Sunken sea, sea life and dive sections), hidden interactions, `celebrate()` and `nudge()` answers. |
| `js/worlds-src/<id>/` | A world module in parts, joined by the build into `js/worlds/<id>.js`. Pixel's sprite library (`pixel/1-sprites.js`) is the same file as `tools/pixel-sprites.js`, which the Sprite Bench edits. Paper Pixel keeps its engine (`1-engine.js`) and asset library (`2-assets.js`) identical to `tools/paper-pixel.js` and `tools/paper-assets.js` in the tools repo, where the bench edits them. |
| `js/icons/*.js` | Icon sets a world can swap in by name: pixelarticons and Phosphor Light (both MIT). |
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
