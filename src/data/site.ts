export const site = {
  name: 'Nineville Studio',
  title: 'Nineville Studio',
  description: 'Contemporary abstract paintings by Laura Neundörfer. Nineville Studio.',
  /** Update to your live domain when deployed (no trailing slash). */
  url: 'https://nineville.studio',
  locale: 'en_NZ',
  email: 'hello@nineville.studio',
  /** External Sip & Paint booking or info page */
  workshopUrl: 'https://nineville.studio/workshops',
  /** Mailing list form action (e.g. Mailchimp POST URL) */
  mailingListUrl: '',
  instagram: {
    handle: 'nineville.studio',
    url: 'https://instagram.com/nineville.studio',
  },
  ogImage: '/images/og-image.webp',
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}
