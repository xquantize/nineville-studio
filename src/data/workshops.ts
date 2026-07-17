import { site } from './site';

export interface WorkshopEvent {
  /** Display date, e.g. "Aug 12" */
  date: string;
  /** Machine-readable date for <time>, e.g. "2026-08-12" */
  datetime: string;
  title: string;
  detail: string;
  /** External booking / info URL — falls back to site.workshopUrl */
  href?: string;
}

export const workshops = {
  kicker: 'Workshops',
  titleWord: 'Sip &',
  titleAccent: 'Paint',
  intro: [
    'Discover a unique painting experience where colour, texture and creativity come together.',
    'Create your own textured artwork while learning techniques that turn a blank canvas into something truly personal.',
  ],
  public: {
    kicker: 'Public events',
    heading: 'Upcoming dates',
    allHref: site.workshopUrl,
    events: [
      {
        date: 'Aug 12',
        datetime: '2026-08-12',
        title: 'Sip & Paint @ Historic Village, Tauranga',
        detail: 'Craft a floral-inspired masterpiece — no experience needed.',
      },
      {
        date: 'Aug 31',
        datetime: '2026-08-31',
        title: 'Sip & Paint @ Historic Village, Tauranga',
        detail: 'Craft a floral-inspired masterpiece — no experience needed.',
      },
    ] satisfies WorkshopEvent[],
  },
  private: {
    kicker: 'Private events',
    heading: 'Book a private session',
    body: 'Perfect for birthdays, hen parties, and team days — sessions for up to 20 guests.',
    inquireHref: `mailto:${site.email}?subject=${encodeURIComponent('Private Sip & Paint enquiry')}`,
  },
} as const;
