# Vice Cover Studio II

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/veneraxyz/gta6-cover-art-01-entry-v2/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/veneraxyz/gta6-cover-art-01-entry-v2/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An entry for [make.fun's GTA 6 cover art bounty](https://make.fun/c/gta6-cover-art-01) — a
web app that turns a photo and a caption into GTA 6-style cover art, in the
browser, fully offline.

## What it makes

One excellent portrait cover is the flagship: an **asymmetric collage** with
a dominant character panel (~40% of the art), distinct supporting scenes (car,
coastline, boulevard, neon/palm detail), thick black dividers, and a caption
lettered large enough to read at thumbnail size. The same design carries into
square (a four-panel mosaic) and landscape (one wide hero + two stacked
inserts), each ratio placing subject and title independently.

- **Your photo gets the largest role.** Drop in any photo — or start from one
  of the three built-in illustrated samples — and drag to reframe, scroll or
  slide to zoom. The crop is a focal point, so it survives format switches.
- **Two grades, applied as a set.** Sunset (peach highlights, coral skies,
  violet shadows, a little teal) and Neon (deep navy, cyan + hot pink as local
  accents, faces kept legible). No uniform colour wash.
- **Real lettering.** The caption sets in Anton (bundled locally, SIL OFL) —
  warm-white fill, near-black outline, hard shadow — with a large gradient
  Roman numeral **VI** behind the wordmark, GTA VI style. Up to two lines,
  auto-fit, parked over a quiet area, never over eyes.
- **Exact exports.** PNG at 1080×1350, 1080×1080, and 1920×1080 — the export
  runs the same renderer as the live preview, so what you see is what the
  file holds. No watermark, no UI chrome, no clipped lettering.
- **Fully offline.** No CDN, no external fonts or images at runtime. Every
  scene — the sample photos and the Vice City backdrops — is drawn in code
  (canvas illustration: sunsets, skylines, palms, cars, neon streets), and
  your photo never leaves the machine.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` directly in desktop Chrome. Pick a sample, edit the
caption, switch format and grade, drag the big photo to reframe it, and hit
**Download PNG**.

## Layout

- `app/index.html`, `app/style.css` — the editor shell and studio UI.
- `app/src/main.js` — editor wiring: upload, drag-to-reframe + zoom, caption,
  grade, format, export. `?shot=` sets up a fixed scene for screenshots.
- `app/src/cover.js` — the cover engine: the three asymmetric layouts, the
  sunset/neon grades, title fitting, the VI numeral, grain and vignette.
- `app/src/scenes.js` — every picture in the app, drawn procedurally: the
  three sample photos and the five Vice City backdrops per grade.
- `app/fonts/Anton-Regular.ttf` — Anton, bundled locally (SIL Open Font
  License 1.1).
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — four screenshots: three covers exported by the app itself
  plus the editor with the portrait cover loaded.
- `tools/` — the Playwright harnesses used to verify and capture (`smoke.mjs`,
  `capture.mjs`); not part of the handed-in app.

## Notes

A fan-made cover tool, not affiliated with Rockstar Games. No Rockstar logo,
artwork, or fonts are used: the lettering is Anton, the scenes are original
code-drawn illustrations, and no stock or copyrighted photos are shipped.

Built for the [gta6-cover-art-01 competition on make.fun](https://make.fun/c/gta6-cover-art-01).
MIT licensed — see `LICENSE`.
