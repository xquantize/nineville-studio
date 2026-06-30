// To add a new piece: copy any entry, change the id, drop a new image in /public/images/works/, update title + description.
// Export spec: 1200×1500 px (4:5), WebP ~80 quality, straight-on crop with even margins. See README.

export interface Work {
  id: string;
  title: string;
  description: string;
  medium: 'plaster' | 'acrylic' | 'resin' | 'mixed';
  year: number;
  image: string;
  alt: string;
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

export const works: Work[] = [
  {
    id: 'w01',
    title: 'Untitled (I)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'plaster',
    year: 2025,
    image: '/images/works/work-01.svg',
    alt: 'Placeholder for Laura Neundörfer painting one',
  },
  {
    id: 'w02',
    title: 'Untitled (II)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'acrylic',
    year: 2025,
    image: '/images/works/work-02.svg',
    alt: 'Placeholder for Laura Neundörfer painting two',
  },
  {
    id: 'w03',
    title: 'Untitled (III)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'resin',
    year: 2024,
    image: '/images/works/work-03.svg',
    alt: 'Placeholder for Laura Neundörfer painting three',
  },
  {
    id: 'w04',
    title: 'Untitled (IV)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'mixed',
    year: 2024,
    image: '/images/works/work-04.svg',
    alt: 'Placeholder for Laura Neundörfer painting four',
  },
  {
    id: 'w05',
    title: 'Untitled (V)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'plaster',
    year: 2023,
    image: '/images/works/work-05.svg',
    alt: 'Placeholder for Laura Neundörfer painting five',
  },
  {
    id: 'w06',
    title: 'Untitled (VI)',
    description: '[PLACEHOLDER: 1-line description — replace later]',
    medium: 'acrylic',
    year: 2023,
    image: '/images/works/work-06.svg',
    alt: 'Placeholder for Laura Neundörfer painting six',
  },
];
