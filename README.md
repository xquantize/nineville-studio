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

## How to add a new painting

1. Add the image to `public/images/works/` (webp or jpg recommended; keep file size reasonable).
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
2. Drop the hero painting into `/public/images/hero-placeholder.svg` (or rename a `.jpg` / `.webp` and update the path in `FixedBackground.astro`).
3. Replace placeholder bio paragraphs in `Bio.astro`.
4. Edit `src/data/mediums.ts` to add real descriptions per medium.
5. Edit `src/data/works.ts` to add real paintings (id, title, description, medium, year, image).
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
```

## Placeholders

All temporary copy is marked with `[PLACEHOLDER: ...]` so you can grep the repo:

```bash
grep -r "PLACEHOLDER" src/
```
