import VanillaTilt from 'vanilla-tilt';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!reducedMotion && finePointer) {
  const cards = document.querySelectorAll<HTMLElement>(
    '.work-card__image-wrap, .medium-card__image'
  );

  VanillaTilt.init([...cards], {
    max: 5,
    speed: 500,
    scale: 1.015,
    glare: false,
    gyroscope: false,
  });
}
