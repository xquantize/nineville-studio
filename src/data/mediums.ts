export interface Medium {
  slug: string;
  name: string;
  description: string;
  image: string;
}

export const mediums: Medium[] = [
  {
    slug: 'plaster',
    name: 'Plaster',
    description: '[PLACEHOLDER: 1-sentence description of her plaster work]',
    image: '/images/mediums/plaster.svg',
  },
  {
    slug: 'acrylic',
    name: 'Acrylic',
    description: '[PLACEHOLDER: 1-sentence description]',
    image: '/images/mediums/acrylic.svg',
  },
  {
    slug: 'resin',
    name: 'Resin',
    description: '[PLACEHOLDER: 1-sentence description]',
    image: '/images/mediums/resin.svg',
  },
  {
    slug: 'mixed',
    name: 'Mixed',
    description: '[PLACEHOLDER: 1-sentence description]',
    image: '/images/mediums/mixed.svg',
  },
];
