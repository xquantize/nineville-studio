// To add a new piece: copy any entry, change the id, add images in /public/images/works/, update title + descriptions.
// `description` = short line on the grid card. `detailDescription` = longer copy in the lightbox (optional).
// `images` = one or more photos of the same piece (first image is the grid thumbnail). Add detail shots, angles, in-situ, etc.
// Export spec: 1200×1500 px (4:5), WebP ~80 quality, straight-on crop with even margins. See README.

export interface WorkImage {
  src: string;
  alt: string;
  /** Optional label shown in the lightbox, e.g. "Detail", "In studio" */
  caption?: string;
}

export interface Work {
  id: string;
  title: string;
  /** Short line shown on the grid card */
  description: string;
  /** Longer copy for the lightbox — optional; falls back to description */
  detailDescription?: string;
  medium: 'plaster' | 'acrylic' | 'resin' | 'mixed';
  year: number;
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

export function getWorkCover(work: Work): WorkImage {
  return work.images[0];
}

export const works: Work[] = [
  {
    id: 'w01',
    title: 'Untitled (I)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    detailDescription:
      '[PLACEHOLDER: Longer description for the lightbox — process, materials, scale, what inspired the piece, etc.]',
    medium: 'plaster',
    year: 2025,
    images: [
      {
        src: '/images/works/work-01.svg',
        alt: 'Placeholder for Laura Neundörfer painting one — full view',
        caption: 'Full view',
      },
      {
        src: '/images/works/work-01.svg',
        alt: 'Placeholder for Laura Neundörfer painting one — detail',
        caption: 'Detail',
      },
      {
        src: '/images/works/work-01.svg',
        alt: 'Placeholder for Laura Neundörfer painting one — texture',
        caption: 'Texture',
      },
    ],
  },
  {
    id: 'w02',
    title: 'Untitled (II)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'acrylic',
    year: 2025,
    images: [
      {
        src: '/images/works/work-02.svg',
        alt: 'Placeholder for Laura Neundörfer painting two',
      },
    ],
  },
  {
    id: 'w03',
    title: 'Untitled (III)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'resin',
    year: 2024,
    images: [
      {
        src: '/images/works/work-03.svg',
        alt: 'Placeholder for Laura Neundörfer painting three — full view',
        caption: 'Full view',
      },
      {
        src: '/images/works/work-03.svg',
        alt: 'Placeholder for Laura Neundörfer painting three — detail',
        caption: 'Detail',
      },
    ],
  },
  {
    id: 'w04',
    title: 'Untitled (IV)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'mixed',
    year: 2024,
    images: [
      {
        src: '/images/works/work-04.svg',
        alt: 'Placeholder for Laura Neundörfer painting four',
      },
    ],
  },
  {
    id: 'w05',
    title: 'Untitled (V)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'plaster',
    year: 2023,
    images: [
      {
        src: '/images/works/work-05.svg',
        alt: 'Placeholder for Laura Neundörfer painting five',
      },
    ],
  },
  {
    id: 'w06',
    title: 'Untitled (VI)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'acrylic',
    year: 2023,
    images: [
      {
        src: '/images/works/work-06.svg',
        alt: 'Placeholder for Laura Neundörfer painting six',
      },
    ],
  },
];
