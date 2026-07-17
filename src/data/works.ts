// To add a new piece: copy any entry, change the id, add images in /public/images/works/<slug>/, update title + descriptions.
// `description` = short line on the grid card. `detailDescription` = longer copy in the lightbox (optional).
// `images` = one or more photos of the same piece (first image is the grid thumbnail). Numbered 1.webp, 2.webp, …
// `dimensions` = optional, e.g. "80 × 100 cm". `status` = optional: available | sold | private collection
// Portal atmosphere: pin via series.portalPeeks, OR drop images in /public/images/series/<slug>/

import fs from 'node:fs';
import path from 'node:path';

export interface WorkImage {
  src: string;
  alt: string;
  /** Optional label shown in the lightbox, e.g. "Detail", "In studio" */
  caption?: string;
}

export type WorkStatus = 'available' | 'sold' | 'private collection';

export interface Work {
  id: string;
  /** URL slug for sharing — used in ?work=slug links */
  slug: string;
  title: string;
  /** Short line shown on the grid card */
  description: string;
  /** Longer copy for the lightbox — optional; falls back to description */
  detailDescription?: string;
  medium: 'plaster' | 'acrylic' | 'resin' | 'mixed';
  year: number;
  /** Optional physical size, e.g. "80 × 100 cm" */
  dimensions?: string;
  /** Optional availability — shown in the lightbox */
  status?: WorkStatus;
  images: WorkImage[];
}

const mediumLabels: Record<Work['medium'], string> = {
  plaster: 'Plaster',
  acrylic: 'Acrylic',
  resin: 'Resin',
  mixed: 'Mixed media',
};

export function formatWorkMeta(work: Work): string {
  return `${mediumLabels[work.medium]} · ${work.year}`;
}

export function formatLightboxMeta(work: Work): string {
  const parts = [formatWorkMeta(work)];
  if (work.dimensions) parts.push(work.dimensions);
  return parts.join(' · ');
}

export function getWorkCover(work: Work): WorkImage {
  return work.images[0];
}

export const workStatusLabels: Record<WorkStatus, string> = {
  available: 'Available',
  sold: 'Sold',
  'private collection': 'Private collection',
};

export function getWorkIndexBySlug(slug: string): number {
  return works.findIndex((work) => work.slug === slug);
}

function pieceImages(slug: string, title: string, count: number): WorkImage[] {
  return Array.from({ length: count }, (_, index) => {
    const photo = index + 1;
    return {
      src: `/images/works/${slug}/${photo}.webp`,
      alt: `${title} — photo ${photo}`,
    };
  });
}

function piece(
  id: string,
  slug: string,
  title: string,
  photoCount: number,
  overrides: Partial<Omit<Work, 'id' | 'slug' | 'title' | 'images'>> = {}
): Work {
  return {
    id,
    slug,
    title,
    description: '[PLACEHOLDER: 1-line description]',
    medium: 'mixed',
    year: 2025,
    status: 'available',
    images: pieceImages(slug, title, photoCount),
    ...overrides,
  };
}

export const works: Work[] = [
  piece('w01', 'beautiful-coral', 'Beautiful Coral', 8),
  piece('w02', 'surfboard', 'Surfboard', 6),
  piece('w03', 'beige-coral', 'Beige Coral', 2),
  piece('w04', 'blue-coral', 'Blue Coral', 2),
  piece('w05', 'blue-flower', 'Blue Flower', 2),
  piece('w06', 'brown-coral', 'Brown Coral', 2),
  piece('w07', 'neon-1-coral', 'Neon I Coral', 2),
  piece('w08', 'neon-2-coral', 'Neon II Coral', 2),
  piece('w09', 'white-coral', 'White Coral', 2),
  piece('w10', 'white-flower', 'White Flower', 2),
  piece('w11', 'white-purp-flower', 'White & Purple Flower', 2),
];

// ——— Series ———
// Group works into named collections. A work is referenced by its slug.
// Portal peeks (landing collage), in priority order:
//   1. series.portalPeeks — pin exact work photos
//   2. /public/images/series/<slug>/ — drop images here; client shuffles through them
//   3. Auto-pick from works in the series
export interface Series {
  slug: string;
  name: string;
  /** Short tagline shown under the series name (optional) */
  tagline?: string;
  /** Longer intro shown above the works once a series is selected */
  description: string;
  workSlugs: string[];
  /**
   * Pin exact portal shard images (1-based photo index on a work).
   * When set, these win over the series atmosphere folder.
   * Example: [{ work: 'surfboard', photo: 5 }, ...]
   */
  portalPeeks?: { work: string; photo: number }[];
}

// [PLACEHOLDER copy] — edit the `description` lines to match Laura's voice.
export const series: Series[] = [
  {
    slug: 'coral',
    name: 'Coral',
    tagline: 'Textured reefs in resin',
    description:
      'A study of reef forms — sculptural texture built up in paste, then flooded with resin so each piece shifts and catches the light like water moving over coral.',
    workSlugs: ['beautiful-coral', 'beige-coral', 'blue-coral', 'brown-coral', 'white-coral'],
  },
  {
    slug: 'neon',
    name: 'Neon',
    tagline: 'Charged, luminous colour',
    description:
      'Colour pushed to its brightest edge. Charged, luminous pigment glows against raw texture for pieces that feel electric from across the room.',
    workSlugs: ['neon-1-coral', 'neon-2-coral'],
    // Front-on frames — angled /2 shots are mostly wall + frame
    portalPeeks: [
      { work: 'neon-1-coral', photo: 1 },
      { work: 'neon-2-coral', photo: 1 },
      { work: 'neon-1-coral', photo: 1 },
    ],
  },
  {
    slug: 'blooms',
    name: 'Blooms',
    tagline: 'Floral studies',
    description:
      'Floral studies in bloom — soft, organic forms layered in paste and colour, capturing the quiet energy of things opening up to the light.',
    workSlugs: ['blue-flower', 'white-flower', 'white-purp-flower'],
    // Front-on only — /2 shots are side-angle with lots of wall
    portalPeeks: [
      { work: 'blue-flower', photo: 1 },
      { work: 'white-purp-flower', photo: 1 },
      { work: 'white-flower', photo: 1 },
    ],
  },
  {
    slug: 'coastal',
    name: 'Coastal',
    tagline: 'Life by the water',
    description:
      'Life by the water, shaped by surf and salt. The freedom of the coast rendered in mixed media — movement, flow, and a pull back to the sea.',
    workSlugs: ['surfboard'],
    // Texture close-ups — skip full-room / plant lifestyle frames
    portalPeeks: [
      { work: 'surfboard', photo: 2 },
      { work: 'surfboard', photo: 5 },
      { work: 'surfboard', photo: 6 },
    ],
  },
];

/** Works belonging to a series, in listed order. */
export function getWorksInSeries(target: Series): Work[] {
  return target.workSlugs
    .map((slug) => works.find((work) => work.slug === slug))
    .filter((work): work is Work => Boolean(work));
}

/**
 * Soft collage previews for a series — up to `count` images.
 * Prefer one cover per work; fill remaining slots from later photos
 * so thin series (e.g. a single piece) still get an atmosphere.
 */
export function getSeriesPreviewImages(target: Series, count = 5): WorkImage[] {
  const inSeries = getWorksInSeries(target);
  const images: WorkImage[] = [];

  for (const work of inSeries) {
    if (images.length >= count) break;
    images.push(getWorkCover(work));
  }

  if (images.length < count) {
    for (const work of inSeries) {
      for (const photo of work.images.slice(1)) {
        if (images.length >= count) break;
        images.push(photo);
      }
      if (images.length >= count) break;
    }
  }

  return images;
}

const SERIES_ATMOS_DIR = path.join(process.cwd(), 'public/images/series');
const ATMOS_EXT = /\.(webp|jpe?g|png|avif)$/i;

/** Images dropped in `/public/images/series/<slug>/` for the landing portal. */
export function getSeriesFolderAtmosphere(slug: string): string[] {
  const dir = path.join(SERIES_ATMOS_DIR, slug);
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => ATMOS_EXT.test(name) && !name.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((name) => `/images/series/${slug}/${name}`);
  } catch {
    return [];
  }
}

function curatedPeekSrcs(target: Series): string[] {
  if (!target.portalPeeks?.length) return [];
  const srcs: string[] = [];
  for (const peek of target.portalPeeks) {
    const work = works.find((w) => w.slug === peek.work);
    const img = work?.images[peek.photo - 1];
    if (img) srcs.push(img.src);
  }
  return srcs;
}

function autoPeekSrcs(target: Series): string[] {
  const inSeries = getWorksInSeries(target);
  const details: string[] = [];
  const covers: string[] = [];

  for (const work of inSeries) {
    covers.push(getWorkCover(work).src);
    if (work.images.length < 3) continue;
    const extras = work.images.slice(1);
    const mid = Math.floor(extras.length / 2);
    details.push(...extras.slice(mid).map((p) => p.src), ...extras.slice(0, mid).map((p) => p.src));
  }

  const picked: string[] = [];
  const seen = new Set<string>();
  for (const src of [...details, ...covers]) {
    if (seen.has(src)) continue;
    seen.add(src);
    picked.push(src);
  }
  return picked;
}

export type AtmosphereMode = 'fixed' | 'shuffle';

export interface SeriesAtmosphere {
  /** Full pool of image URLs for the portal shards */
  pool: string[];
  /** `fixed` = use in order (curated). `shuffle` = random pick from pool (folder). */
  mode: AtmosphereMode;
}

/**
 * Portal atmosphere source, in priority order:
 * 1. `portalPeeks` in works.ts — pin exact work photos (fixed)
 * 2. Files in `/public/images/series/<slug>/` — drop-in folder (shuffled)
 * 3. Auto pick from works in the series (fixed)
 */
export function getSeriesAtmosphere(target: Series): SeriesAtmosphere {
  const curated = curatedPeekSrcs(target);
  if (curated.length) return { pool: curated, mode: 'fixed' };

  const folder = getSeriesFolderAtmosphere(target.slug);
  if (folder.length) return { pool: folder, mode: 'shuffle' };

  return { pool: autoPeekSrcs(target), mode: 'fixed' };
}

/** First N urls from a pool (pads by repeating if the pool is thin). */
export function takeAtmosphere(pool: string[], count = 3): string[] {
  if (!pool.length) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[i % pool.length]);
  return out;
}

/** @deprecated Prefer getSeriesAtmosphere */
export function getSeriesPortalPeeks(target: Series, count = 3): WorkImage[] {
  const { pool } = getSeriesAtmosphere(target);
  return takeAtmosphere(pool, count).map((src) => ({ src, alt: '' }));
}
