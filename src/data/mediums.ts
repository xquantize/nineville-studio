export interface Medium {
  slug: string;
  name: string;
  description: string;
  image: string;
}

export const mediums: Medium[] = [
  {
    slug: 'modeling-paste',
    name: 'Modeling Paste',
    description:
      'Modeling paste is the foundation of my textured artworks. It allows me to sculpt depth and movement directly onto the canvas, creating organic forms inspired by the ocean and nature.',
    image: '/images/mediums/plaster.svg',
  },
  {
    slug: 'acrylic',
    name: 'Acrylic Paint',
    description:
      'Acrylic paint brings each artwork to life with rich pigments and colour. Its versatility allows me to create soft gradients and layered effects that complement the textured surface beneath.',
    image: '/images/mediums/acrylic.svg',
  },
  {
    slug: 'resin',
    name: 'Resin',
    description:
      'Resin is the finishing element that gives my artworks their signature luminous appearance. Applied as a clear layer, resin creates a smooth, glass-like finish that enhances saturation and adds remarkable depth.',
    image: '/images/mediums/resin.svg',
  },
];
