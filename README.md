# rajjeshwar.github.io

My personal site: who I am, where I've worked, what I've published, and a few side
projects. It is a static page with no framework and no build step. The drawings on it
are not images or videos; each one is a small program that draws on a `<canvas>`.

## Run it locally

The JavaScript is split into modules, which browsers only load from a web server, so
opening `index.html` by double-clicking will show the page without its drawings. Serve
the folder instead:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Layout

```text
index.html            the page: all text and structure
css/styles.css        layout, type, light and dark colours
js/
  boot.js             runs first, restores a remembered theme or motion choice
  main.js             registers the drawings and wires up the page
  core/
    engine.js         one animation loop; only on-screen canvases are redrawn
    palette.js        colours for the drawings, light and dark
    canvas.js         small canvas helpers
    util.js           maths helpers and a seeded random number generator
  figures/            one file per drawing
photo.jpg             the portrait shown in the hero
tools/bundle.py       optional: pack everything into a single HTML file
```

## The drawings

Every file in `js/figures/` exports one function. It receives a canvas and returns a
`draw(t)` function that the engine calls each frame with the time in seconds.

| File | Where it appears | What it shows |
|---|---|---|
| `attention.js` | Hero background | A patch grid that lights up where the pointer is |
| `portrait.js` | Hero | `photo.jpg` breaking into patches, or a pixel stand-in |
| `career.js` | About | The short version as a route, from Mumbai to Toronto |
| `distillation.js` | Vivid Machines | A teacher grid distilling into a smaller student grid |
| `gp-calibration.js` | Vivid Machines | Gaussian Process calibration with an uncertainty band |
| `ddim-inversion.js` | CRIM | An image stepped to noise and back, with the error map |
| `ocr.js` | Wipro | A document scanned into structured fields |
| `bottle-line.js` | L&T Infotech | Bottles segmented as they pass a line camera |
| `rna.js` | Side project | Base-pair arcs sharpening over reactivity bars |
| `nerf.js` | Side project | Rays marched through a scene with two semantic classes |
| `pathtracer.js` | Side project | A Cornell box rendered by Monte Carlo path tracing |

Most of these are illustrations: formulas of time that sketch an idea, not experimental
results. Two do the real computation in the browser:

- **`gp-calibration.js`** fits an actual Gaussian Process (RBF kernel, Cholesky solve)
  and refits it as each data point arrives.
- **`pathtracer.js`** is a working path tracer with next-event estimation. It adds one
  sample per pixel per frame and plots its measured noise against the 1/√n it should follow.

## Adding a drawing

1. Add a `<canvas id="fig-something">` inside a `.stage` element in `index.html`.
2. Create `js/figures/something.js` that exports a function taking `fig` and returning
   `{ draw(t), stillAt }`. `stillAt` is the time to draw when animations are paused.
3. Import it in `js/main.js` and register it with `addFig('fig-something', something)`.

Take colours from `core/palette.js` rather than hard-coding them, so the drawing follows
the light and dark themes.

A job card can hold more than one drawing: put each in its own `<figure>` inside the card's
`.job-figs`, and they stack, as in the Vivid Machines card.

## The portrait

The hero shows `photo.jpg`, a 512×512 JPEG next to `index.html`. Until it loads, or if
it is missing, a pixel stand-in is drawn in its place. Visitors cannot change it; to
replace it, commit a new `photo.jpg`. Strip location and other metadata from the file
before committing it, because everything in this repository is public.

## Behaviour worth knowing

- **Theme:** the page always opens light. The header toggle switches to dark and the
  choice is remembered on that device.
- **Motion:** visitors who ask their system for reduced motion get still frames. Anyone
  can pause or resume the animations from the link at the bottom of the page.
- **Fonts:** the typeface, Instrument Sans, is loaded from Google Fonts.

## Deploying

This repository is served by GitHub Pages from the `main` branch root. Pushing to `main`
updates the site. The empty `.nojekyll` file tells Pages to serve the files exactly as
they are.

## Single-file version

```bash
python3 tools/bundle.py
```

writes `dist/site.html`, the whole site in one file that opens without a server, with the
portrait and icon built in. Use it to preview changes before committing: `open dist/site.html`.
It still loads the typeface from Google Fonts, so offline it falls back to a system font.
`dist/` is ignored by git.
