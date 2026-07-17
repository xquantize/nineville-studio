import VanillaTilt from 'vanilla-tilt';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!reducedMotion && finePointer) {
  // Mediums deck manages its own transforms — don't tilt those chips
  const cards = [...document.querySelectorAll<HTMLElement>('.work-card__image-wrap')];
  if (cards.length) {
    VanillaTilt.init(cards, {
      max: 5,
      speed: 500,
      scale: 1.015,
      glare: false,
      gyroscope: false,
    });
  }
}
