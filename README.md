# Nineville Studio

Portfolio site for **Laura Neundörfer** — warm, coastal abstract paintings under the Nineville Studio brand.

Built with [Astro](https://astro.build). Deploys to Vercel with zero config.

## Development

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:4321`).

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
   - `description` — one-line description
   - `medium` — one of `plaster`, `acrylic`, `resin`, `mixed`
   - `year` — completion year
   - `image` — path under `public/` (e.g. `/images/works/my-piece.webp`)
   - `alt` — accessible description of the work
4. Save and refresh — the gallery updates automatically.

## What to do next

1. Run `npm install`, then `npm run dev` and open the local URL.
2. Replace the hero source and run `./scripts/optimize-images.sh hero …` if needed.
3. Replace placeholder bio paragraphs in `Bio.astro`.
4. Edit `src/data/mediums.ts` to add real descriptions per medium.
5. Edit `src/data/works.ts` to add real paintings.
6. Update the email and Instagram handle in `Footer.astro` and the `mailto:` in `Commission.astro`. Search for `[PLACEHOLDER:` to find all placeholder content quickly.
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
