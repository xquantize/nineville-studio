# Nineville Studio

Portfolio site for **Laura Neundörfer** — warm, coastal abstract paintings under the Nineville Studio brand.

Built with [Astro](https://astro.build). Deploys to Vercel with zero config.

## Development

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:4321`).

### Test on your phone (same Wi‑Fi)

```bash
npm run dev -- --host
```

The terminal prints a **Network** URL (e.g. `http://192.168.x.x:4321`). Open that on your phone.

### Test responsive layouts in the browser

1. Run `npm run dev` (or `npm run build && npm run preview` for a production-like check).
2. Open the site in **Chrome** or **Firefox**.
3. Toggle device mode: `Ctrl+Shift+M` (Windows/Linux) or `Cmd+Shift+M` (Mac).
4. Pick presets (**iPhone 14**, **Pixel 7**) or drag the width handle — the mobile layout kicks in below **768px**.
5. Check: landing hero, hamburger menu, scroll through Bio → Art, tap a work (lightbox), rotate to landscape.

Clear the loading intro between tests: DevTools → Application → Session Storage → delete `seen-intro`, then refresh.

## Build

```bash
npm run build
npm run preview   # preview the production build locally
```

## Image guidelines

### Hero (landing background)

- Source: best photo of the hero painting, portrait orientation is fine (the site rotates it).
- Export: **WebP**, longest edge **1920px**, target **under 450 KB**.
- File: `public/images/hero_background.webp` (JPEG kept as fallback).
- Re-optimize after replacing the source:

```bash
chmod +x scripts/optimize-images.sh
./scripts/optimize-images.sh hero path/to/your-photo.jpg
```

### Gallery works (consistent grid)

Shoot or export every piece the same way so the grid feels intentional:

| Setting | Value |
|--------|--------|
| Aspect ratio | **4:5** (portrait) |
| Export size | **1200 × 1500 px** |
| Format | **WebP**, quality ~80 |
| Framing | Straight-on, painting centred, even margins |
| Lighting | Same conditions across a batch if possible |
| Target file size | **80–150 KB** per image |

```bash
./scripts/optimize-images.sh work path/to/painting.jpg my-piece-name
```

Then add the entry in `src/data/works.ts` with `width: 1200`, `height: 1500`.

## How to add a new painting

1. Optimize the image (see above) into `public/images/works/`.
2. Open `src/data/works.ts` and copy an existing entry in the `works` array.
3. Update:
   - `id` — unique slug (e.g. `w07`)
   - `title` — painting title
   - `description` — one-line summary (grid card)
   - `detailDescription` — optional longer text (lightbox view)
   - `medium` — one of `plaster`, `acrylic`, `resin`, `mixed`
   - `year` — completion year
   - `images` — array of photos for the same piece (first = grid thumbnail). Each: `src`, `alt`, optional `caption`
   - `dimensions` — optional, e.g. `"80 × 100 cm"` (lightbox)
   - `status` — optional: `available`, `sold`, or `private collection` (lightbox)
4. Save and refresh — the gallery updates automatically.

## What to do next

1. Run `npm install`, then `npm run dev` and open the local URL.
2. Replace the hero source and run `./scripts/optimize-images.sh hero …` if needed.
3. Replace placeholder bio paragraphs in `Bio.astro`.
4. Edit `src/data/mediums.ts` to add real descriptions per medium.
5. Edit `src/data/works.ts` to add real paintings.
6. Update email and Instagram in `src/data/site.ts` (used by footer, nav, and commission). Search for `[PLACEHOLDER:` to find all other placeholder content quickly.
7. Deploy: push to GitHub, connect to Vercel, done.

## Project structure

```
src/
  components/   # Astro UI sections
  data/         # Mediums and works (edit these for content)
  layouts/      # Page shell, fonts, global scripts
  pages/        # Routes (single-page site)
  styles/       # global.css design tokens
public/
  images/       # Hero, portrait, medium swatches, artwork
scripts/
  optimize-images.sh   # Hero + gallery WebP export helper
```

## Placeholders

All temporary copy is marked with `[PLACEHOLDER: ...]` so you can grep the repo:

```bash
grep -r "PLACEHOLDER" src/
```
