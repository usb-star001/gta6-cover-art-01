# Neon Vice — GTA-style Cover Maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/usb-star001/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/usb-star001/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photo and a caption into GTA 6-style cover art: a multi-panel poster
with bold caption lettering and a Vice City sunset / neon colour grade, exported
as a PNG to share. Made for the make.fun bounty **gta6-cover-art-01**.

## What it does

- **Any photo:** upload your own photos from your machine (they never leave it),
  or start from the two bundled sample photos. Click a thumbnail to place a photo
  in the selected panel.
- **Multi-panel poster:** three layouts (Hero + two, Split grid, Top strip) with
  3–4 panels per cover. Fill several panels with one photo or several.
- **Crop and position:** click a panel in the live preview to select it, then
  zoom and slide it into place with the sliders, or fill every panel with one photo.
- **Bold lettering:** edit the caption, tagline and eyebrow tag; the caption is
  set in Anton (SIL Open Font License, shipped under `app/fonts/`) with a black
  outline and a pink neon glow, tilted a touch like a poster title.
- **Sunset / neon grade:** a magenta-to-orange-to-teal wash, warm glow, vignette
  and optional halftone print dots, with a strength slider.
- **Fast and easy:** photo to PNG in a few clicks, in the three common post sizes.

## Export sizes

- Square **1080 × 1080**
- Portrait **1080 × 1350**
- Wide **1920 × 1080**

## Run it

Serve `app/` with any static file server — no build step, no network requests:

```sh
python3 -m http.server 8080 --directory app
# open http://localhost:8080
```

or, from the repository root:

```sh
node serve.ts   # serves app/ on http://localhost:8080
```

Everything the app loads is a file under `app/` (scripts, styles, the Anton font,
the sample photos) or a `data:` URI; photos you upload are read on your machine.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the dark neon editor UI.
- `app/src/main.js` — controls, photo loading, export.
- `app/src/render.js` — the cover renderer: panel layouts, cover-fit photos,
  sunset grade, halftone, caption lettering.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` / `?shot=editor`).
- `app/fonts/Anton-Regular.ttf` — Anton, SIL Open Font License (see `app/fonts/OFL.txt`).
- `app/samples/` — two sample photos made with an image model for make.fun.
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json` (see `vendor/makefun-app.ts`).
- `screenshots/` — the cover and the editor at work.

Nothing here uses Rockstar Games' logo, wordmark, artwork, characters or fonts:
all art is drawn in code from your photos, and the only font is the OFL-licensed Anton.

## License

MIT — see [LICENSE](LICENSE).
