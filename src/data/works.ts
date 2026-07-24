// Gallery catalog — discovered from the filesystem.
//
// Artworks:
//   public/images/series/<series-slug>/<artwork-slug>/1.webp, 2.webp, …
//
// Series showcase (the 3 overlapping hover images on the gallery landing):
//   public/images/series/<series-slug>/showcase/1.webp, 2.webp, 3.webp
//     1 = left (tall tilted wing)
//     2 = centre (main hero)
//     3 = right / lower
//
// Optional copy / ordering: edit SERIES_META and WORK_META below.

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
  /** Parent series folder slug */
  seriesSlug: string;
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
   * Only used when the series has no `showcase/` (or `_portal/`) images yet.
   */
  portalPeeks?: { work: string; photo: number }[];
}

type SeriesMeta = {
  name?: string;
  tagline?: string;
  description?: string;
  /** Lower = earlier in the gallery list */
  order?: number;
  /** Artwork folder order within the series (others append alphabetically) */
  workOrder?: string[];
  portalPeeks?: Series['portalPeeks'];
};

type WorkMeta = Partial<
  Pick<Work, 'title' | 'description' | 'detailDescription' | 'medium' | 'year' | 'dimensions' | 'status'>
>;

/** Optional series copy + ordering. Unknown folders still appear with auto titles. */
const SERIES_META: Record<string, SeriesMeta> = {
  tides: {
    order: 1,
    name: 'Tides',
    tagline: 'Reef forms & coastal pieces',
    description:
      'A study of reef forms and life by the water — sculptural texture built up in paste, then flooded with resin so each piece shifts and catches the light.',
    workOrder: ['beautiful-coral', 'surfboard', 'coral-coast'],
  },
  fossilia: {
    order: 2,
    name: 'Fossilia',
    tagline: 'Quiet relics in relief',
    description:
      'Soft, fossil-like forms layered in paste and colour — coral and bloom studies that feel found rather than made, catching light across raised edges.',
  },
  lumina: {
    order: 3,
    name: 'Lumina',
    tagline: 'Charged, luminous colour',
    description:
      'Colour pushed to its brightest edge. Charged, luminous pigment glows against raw texture for pieces that feel electric from across the room.',
    workOrder: ['neon-1-coral', 'neon-2-coral'],
    portalPeeks: [
      { work: 'neon-1-coral', photo: 1 },
      { work: 'neon-2-coral', photo: 1 },
      { work: 'neon-1-coral', photo: 1 },
    ],
  },
  obsidian: {
    order: 4,
    name: 'Obsidian',
    tagline: 'Dark glass & deep form',
    description:
      'Darker, denser studies — resin and relief that hold shadow the way water holds depth.',
    workOrder: ['obsidian_flower', 'round_resin', 'chaos', 'poppyseed', 'unknown_obs'],
  },
};

/** Optional per-artwork overrides. Key = artwork folder slug, or `series/artwork`. */
const WORK_META: Record<string, WorkMeta> = {
  // Tides
  'beautiful-coral': {
    title: 'Atoll',
    description: 'Pink blooms on teal',
    medium: 'resin',
  },
  surfboard: {
    title: 'Roses',
    description: 'Plaster roses on a board',
    medium: 'plaster',
  },
  'coral-coast': {
    title: 'Lagoon',
    description: 'Gold lace over blue',
    medium: 'resin',
  },
  // Fossilia
  'beige-coral': {
    title: 'Spiral',
    description: 'Shell form on earth',
    medium: 'plaster',
  },
  'blue-coral': {
    title: 'Fan',
    description: 'Coral relief on teal',
    medium: 'plaster',
  },
  'blue-flower': {
    title: 'Bloom',
    description: 'White swirl on blue',
    medium: 'plaster',
  },
  'brown-coral': {
    title: 'Clay',
    description: 'Warm terracotta coral',
    medium: 'plaster',
  },
  'white-coral': {
    title: 'Ivory',
    description: 'All-white coral bloom',
    medium: 'plaster',
  },
  'white-flower': {
    title: 'Coil',
    description: 'Soft plaster swirls',
    medium: 'plaster',
  },
  'white-purp-flower': {
    title: 'Mist',
    description: 'White petals, soft colour',
    medium: 'plaster',
  },
  // Lumina
  'neon-1-coral': {
    title: 'Heat',
    description: 'Reef on neon yellow',
    medium: 'mixed',
  },
  'neon-2-coral': {
    title: 'Glow',
    description: 'Neon reef on black',
    medium: 'mixed',
  },
  // Obsidian
  obsidian_flower: {
    title: 'Ember',
    description: 'Gold rose in black',
    medium: 'resin',
  },
  round_resin: {
    title: 'Disc',
    description: 'White, gold, navy swirl',
    medium: 'resin',
  },
  chaos: {
    title: 'Map',
    description: 'Gold lines over pour',
    medium: 'mixed',
  },
  poppyseed: {
    title: 'Seed',
    description: 'Speckled black and gold',
    medium: 'mixed',
  },
  unknown_obs: {
    title: 'Leaf',
    description: 'Gold ginkgo on black',
    medium: 'mixed',
  },
};

const SERIES_ROOT = path.join(process.cwd(), 'public/images/series');
const IMAGE_EXT = /\.(webp|jpe?g|png|avif)$/i;
/** Not artworks — mood images for the gallery landing collage */
const SKIP_DIRS = new Set(['showcase', '_portal']);
const SHOWCASE_DIR_NAMES = ['showcase', '_portal'] as const;

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
  return getCatalog().works.findIndex((work) => work.slug === slug);
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function listImageFiles(dir: string): string[] {
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => IMAGE_EXT.test(name) && !name.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

function listChildDirs(dir: string): string[] {
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

function orderNames(names: string[], preferred?: string[]): string[] {
  if (!preferred?.length) return names;
  const set = new Set(names);
  const head = preferred.filter((name) => set.has(name));
  const tail = names.filter((name) => !head.includes(name));
  return [...head, ...tail];
}

function workMetaFor(seriesSlug: string, artSlug: string): WorkMeta {
  return WORK_META[`${seriesSlug}/${artSlug}`] ?? WORK_META[artSlug] ?? {};
}

function discoverCatalog(): { works: Work[]; series: Series[] } {
  const seriesSlugs = orderNames(
    listChildDirs(SERIES_ROOT),
    Object.entries(SERIES_META)
      .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99))
      .map(([slug]) => slug)
  );

  const works: Work[] = [];
  const series: Series[] = [];
  const usedWorkSlugs = new Set<string>();

  for (const seriesSlug of seriesSlugs) {
    const meta = SERIES_META[seriesSlug] ?? {};
    const artSlugs = orderNames(listChildDirs(path.join(SERIES_ROOT, seriesSlug)), meta.workOrder);
    const workSlugs: string[] = [];

    for (const artSlug of artSlugs) {
      const files = listImageFiles(path.join(SERIES_ROOT, seriesSlug, artSlug));
      if (!files.length) continue;

      // Keep URL slugs unique across series
      let slug = artSlug;
      if (usedWorkSlugs.has(slug)) slug = `${seriesSlug}-${artSlug}`;
      usedWorkSlugs.add(slug);

      const override = workMetaFor(seriesSlug, artSlug);
      const title = override.title ?? titleFromSlug(artSlug);
      const id = `w${String(works.length + 1).padStart(2, '0')}`;

      works.push({
        id,
        slug,
        seriesSlug,
        title,
        description: override.description ?? '[PLACEHOLDER: 1-line description]',
        detailDescription: override.detailDescription,
        medium: override.medium ?? 'mixed',
        year: override.year ?? 2025,
        dimensions: override.dimensions,
        status: override.status ?? 'available',
        images: files.map((file, index) => ({
          src: `/images/series/${seriesSlug}/${artSlug}/${file}`,
          alt: `${title} — photo ${index + 1}`,
        })),
      });
      workSlugs.push(slug);
    }

    if (!workSlugs.length) continue;

    series.push({
      slug: seriesSlug,
      name: meta.name ?? titleFromSlug(seriesSlug),
      tagline: meta.tagline,
      description: meta.description ?? '[PLACEHOLDER: series description]',
      workSlugs,
      portalPeeks: meta.portalPeeks,
    });
  }

  return { works, series };
}

/** Production caches one scan; dev re-reads the folder on every access so new drops show up. */
let cachedCatalog: { works: Work[]; series: Series[] } | null = null;

function getCatalog() {
  const isProd = Boolean(import.meta.env && import.meta.env.PROD);
  if (isProd) {
    cachedCatalog ??= discoverCatalog();
    return cachedCatalog;
  }
  return discoverCatalog();
}

function liveList<T extends object>(pick: (catalog: { works: Work[]; series: Series[] }) => T[]): T[] {
  return new Proxy([] as T[], {
    get(_target, prop, _receiver) {
      const list = pick(getCatalog());
      if (prop === Symbol.iterator) return list[Symbol.iterator].bind(list);
      const value = Reflect.get(list, prop, list);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(list) : value;
    },
    has(_target, prop) {
      return Reflect.has(pick(getCatalog()), prop);
    },
    ownKeys() {
      return Reflect.ownKeys(pick(getCatalog()));
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(pick(getCatalog()), prop);
    },
    getPrototypeOf() {
      return Array.prototype;
    },
  });
}

export const works: Work[] = liveList((catalog) => catalog.works);
export const series: Series[] = liveList((catalog) => catalog.series);

/** Works belonging to a series, in listed order. */
export function getWorksInSeries(target: Series): Work[] {
  return target.workSlugs
    .map((slug) => getCatalog().works.find((work) => work.slug === slug))
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

/** Images in `/public/images/series/<slug>/showcase/` (or legacy `_portal/`). */
export function getSeriesFolderAtmosphere(slug: string): string[] {
  for (const folder of SHOWCASE_DIR_NAMES) {
    const dir = path.join(SERIES_ROOT, slug, folder);
    const files = listImageFiles(dir);
    if (files.length) {
      return files.map((name) => `/images/series/${slug}/${folder}/${name}`);
    }
  }
  return [];
}

function curatedPeekSrcs(target: Series): string[] {
  if (!target.portalPeeks?.length) return [];
  const srcs: string[] = [];
  for (const peek of target.portalPeeks) {
    const work = getCatalog().works.find((w) => w.slug === peek.work);
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
 * 1. Files in `/public/images/series/<slug>/showcase/` — drop-in collage shots
 *    (fixed order: 1 = left, 2 = centre, 3 = right)
 * 2. `portalPeeks` in SERIES_META — pin exact work photos (fixed)
 * 3. Auto pick from works in the series (fixed)
 */
export function getSeriesAtmosphere(target: Series): SeriesAtmosphere {
  const folder = getSeriesFolderAtmosphere(target.slug);
  // Keep filename order so 1/2/3 map to left / centre / right shards
  if (folder.length) return { pool: folder, mode: 'fixed' };

  const curated = curatedPeekSrcs(target);
  if (curated.length) return { pool: curated, mode: 'fixed' };

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
