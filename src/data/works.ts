// To add a new piece: copy any entry, change the id, add images in /public/images/works/<slug>/, update title + descriptions.
// `description` = short line on the grid card. `detailDescription` = longer copy in the lightbox (optional).
// `images` = one or more photos of the same piece (first image is the grid thumbnail). Numbered 1.webp, 2.webp, …
// `dimensions` = optional, e.g. "80 × 100 cm". `status` = optional: available | sold | private collection

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
  piece('w02', 'surfboard', 'Surfboard', 5),
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
