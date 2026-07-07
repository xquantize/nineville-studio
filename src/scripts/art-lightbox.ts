import { works, formatWorkMeta, formatLightboxMeta } from '../data/works';
import { site } from '../data/site';
import mediumZoom from 'medium-zoom';
import 'medium-zoom/dist/style.css';
import Panzoom from '@panzoom/panzoom';

const worksForLightbox = works.map((work) => ({
  id: work.id,
  slug: work.slug,
  title: work.title,
  description: work.detailDescription ?? work.description,
  meta: formatWorkMeta(work),
  details: formatLightboxMeta(work),
  status: work.status ?? null,
  images: work.images,
}));

const contactEmail = site.email;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const lightbox = document.getElementById('art-lightbox') as HTMLElement | null;
const imageWrap = lightbox?.querySelector<HTMLElement>('.art-lightbox__image-wrap') ?? null;
const zoomStage = lightbox?.querySelector<HTMLElement>('[data-lightbox-zoom-stage]') ?? null;
const imageEl = lightbox?.querySelector<HTMLImageElement>('.art-lightbox__image') ?? null;
const zoomHint = lightbox?.querySelector<HTMLElement>('[data-zoom-hint]') ?? null;
const captionEl = lightbox?.querySelector<HTMLElement>('.art-lightbox__caption') ?? null;
const titleEl = lightbox?.querySelector<HTMLElement>('.art-lightbox__title') ?? null;
const descEl = lightbox?.querySelector<HTMLElement>('.art-lightbox__desc') ?? null;
const metaEl = lightbox?.querySelector<HTMLElement>('.art-lightbox__meta') ?? null;
const statusEl = lightbox?.querySelector<HTMLElement>('.art-lightbox__status') ?? null;
const enquireEl = lightbox?.querySelector<HTMLAnchorElement>('[data-lightbox-enquire]') ?? null;
const counterEl = lightbox?.querySelector<HTMLElement>('.art-lightbox__counter') ?? null;
const prevBtn = lightbox?.querySelector<HTMLButtonElement>('[data-lightbox-prev]') ?? null;
const nextBtn = lightbox?.querySelector<HTMLButtonElement>('[data-lightbox-next]') ?? null;
const closeTargets = lightbox?.querySelectorAll('[data-lightbox-close]');
const focusableSelector =
  'button:not([hidden]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const statusLabels: Record<string, string> = {
  available: 'Available',
  sold: 'Sold',
  'private collection': 'Private collection',
};

let workIndex = 0;
let imageIndex = 0;
let lastTrigger: HTMLElement | null = null;
let renderToken = 0;
let touchStartX = 0;
let touchStartY = 0;
let lastTap = 0;

let mediumZoomApi: ReturnType<typeof mediumZoom> | null = null;
let panzoomApi: ReturnType<typeof Panzoom> | null = null;
let wheelHandler: ((event: WheelEvent) => void) | null = null;
let doubleTapHandler: ((event: TouchEvent) => void) | null = null;
let panzoomChangeHandler: (() => void) | null = null;

function currentWork() {
  return worksForLightbox[workIndex];
}

function isImageZoomed() {
  return panzoomApi ? panzoomApi.getScale() > 1.02 : false;
}

function setWorkUrl(slug: string | null) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set('work', slug);
  else url.searchParams.delete('work');
  history.replaceState({ work: slug || null }, '', url);
}

function preloadAdjacentPhotos(work: (typeof worksForLightbox)[number], activeIndex: number) {
  if (!work || work.images.length <= 1) return;

  [-1, 1].forEach((offset) => {
    const photo = work.images[(activeIndex + offset + work.images.length) % work.images.length];
    if (!photo?.src) return;
    const img = new Image();
    img.src = photo.src;
  });
}

function updateEnquireLink(work: (typeof worksForLightbox)[number]) {
  if (!enquireEl) return;

  if (work?.status === 'available' || !work?.status) {
    const subject = encodeURIComponent(`Enquiry: ${work.title}`);
    enquireEl.href = `mailto:${contactEmail}?subject=${subject}`;
    enquireEl.hidden = false;
  } else {
    enquireEl.hidden = true;
  }
}

function setLenisPaused(paused: boolean) {
  const lenis = window.__lenis;
  if (!lenis) return;
  if (paused) lenis.stop();
  else lenis.start();
}

function teardownImageZoom() {
  if (mediumZoomApi) {
    mediumZoomApi.close();
    mediumZoomApi.detach();
    mediumZoomApi = null;
  }

  if (panzoomApi) {
    panzoomApi.destroy();
    panzoomApi = null;
  }

  if (wheelHandler && zoomStage) {
    zoomStage.removeEventListener('wheel', wheelHandler);
    wheelHandler = null;
  }

  if (doubleTapHandler && imageEl) {
    imageEl.removeEventListener('touchend', doubleTapHandler);
    doubleTapHandler = null;
  }

  if (panzoomChangeHandler && imageEl) {
    imageEl.removeEventListener('panzoomchange', panzoomChangeHandler);
    panzoomChangeHandler = null;
  }

  lightbox?.classList.remove('art-lightbox--zoomed');
}

function setupImageZoom() {
  teardownImageZoom();
  if (!imageEl || !lightbox || lightbox.hidden) return;

  if (finePointer) {
    mediumZoomApi = mediumZoom(imageEl, {
      background: 'rgba(14, 16, 22, 0.94)',
      margin: 40,
      scrollOffset: 0,
    });
    return;
  }

  if (!zoomStage) return;

  panzoomApi = Panzoom(imageEl, {
    maxScale: 4,
    minScale: 1,
    contain: 'outside',
    cursor: 'grab',
    panOnlyWhenZoomed: true,
    animate: true,
  });

  wheelHandler = panzoomApi.zoomWithWheel;
  zoomStage.addEventListener('wheel', wheelHandler, { passive: false });

  doubleTapHandler = (event: TouchEvent) => {
    if (!panzoomApi || event.changedTouches.length !== 1) return;

    const now = Date.now();
    const touch = event.changedTouches[0];

    if (now - lastTap < 300) {
      if (isImageZoomed()) {
        panzoomApi.reset({ animate: true });
        lightbox?.classList.remove('art-lightbox--zoomed');
      } else {
        panzoomApi.zoomToPoint(2.25, { clientX: touch.clientX, clientY: touch.clientY });
        lightbox?.classList.add('art-lightbox--zoomed');
      }
    }

    lastTap = now;
  };

  imageEl.addEventListener('touchend', doubleTapHandler, { passive: true });

  panzoomChangeHandler = () => {
    if (!panzoomApi) return;
    if (panzoomApi.getScale() > 1.02) lightbox?.classList.add('art-lightbox--zoomed');
    else lightbox?.classList.remove('art-lightbox--zoomed');
  };
  imageEl.addEventListener('panzoomchange', panzoomChangeHandler);
}

function renderImage() {
  const work = currentWork();
  const photo = work?.images[imageIndex];
  if (!work || !photo || !imageEl || !titleEl || !descEl || !metaEl || !counterEl) return;

  teardownImageZoom();

  const token = ++renderToken;
  const nextSrc = photo.src;

  const applyMeta = () => {
    titleEl.textContent = work.title;
    descEl.textContent = work.description;
    metaEl.textContent = work.details;

    if (statusEl) {
      if (work.status && statusLabels[work.status]) {
        statusEl.textContent = statusLabels[work.status];
        statusEl.dataset.status = work.status;
        statusEl.hidden = false;
      } else {
        statusEl.textContent = '';
        statusEl.removeAttribute('data-status');
        statusEl.hidden = true;
      }
    }

    const hasMultiple = work.images.length > 1;
    if (prevBtn) prevBtn.hidden = !hasMultiple;
    if (nextBtn) nextBtn.hidden = !hasMultiple;

    if (hasMultiple) {
      counterEl.textContent = `Photo ${imageIndex + 1} of ${work.images.length}`;
      counterEl.hidden = false;
    } else {
      counterEl.textContent = '';
      counterEl.hidden = true;
    }

    if (captionEl) {
      if (photo.caption) {
        captionEl.textContent = photo.caption;
        captionEl.hidden = false;
      } else {
        captionEl.textContent = '';
        captionEl.hidden = true;
      }
    }

    updateEnquireLink(work);
    preloadAdjacentPhotos(work, imageIndex);
  };

  const showPhoto = () => {
    imageEl.src = nextSrc;
    imageEl.alt = photo.alt;
    imageEl.classList.remove('is-changing');
    applyMeta();
    setupImageZoom();
  };

  const currentSrc = imageEl.getAttribute('src') || '';
  if (currentSrc === nextSrc) {
    showPhoto();
    return;
  }

  imageEl.classList.add('is-changing');
  applyMeta();

  const preload = new Image();
  preload.onload = () => {
    if (token !== renderToken) return;
    showPhoto();
  };
  preload.onerror = () => {
    if (token !== renderToken) return;
    imageEl.classList.remove('is-changing');
    setupImageZoom();
  };
  preload.src = nextSrc;
}

function trapFocus(event: KeyboardEvent) {
  if (!lightbox || lightbox.hidden || event.key !== 'Tab') return;

  const focusable = Array.from(lightbox.querySelectorAll(focusableSelector)).filter(
    (el) => !el.hasAttribute('disabled')
  );
  if (!focusable.length) return;

  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function open(index: number, trigger: HTMLElement | null) {
  if (!lightbox || !worksForLightbox.length) return;

  if (lightbox.parentElement !== document.body) {
    document.body.appendChild(lightbox);
  }

  workIndex = index;
  imageIndex = 0;
  lastTrigger = trigger;
  lightbox.classList.remove('is-closing');
  lightbox.classList.toggle('art-lightbox--touch', !finePointer);
  lightbox.classList.toggle('art-lightbox--desktop', finePointer);

  if (zoomHint) {
    zoomHint.hidden = finePointer;
  }

  renderImage();
  lightbox.hidden = false;
  requestAnimationFrame(() => lightbox.classList.add('is-open'));
  setWorkUrl(worksForLightbox[index]?.slug ?? null);
  setLenisPaused(true);
  document.body.style.overflow = 'hidden';
  lightbox.querySelector<HTMLElement>('.art-lightbox__close')?.focus();
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('keydown', trapFocus);
}

function close() {
  if (!lightbox || lightbox.hidden || lightbox.classList.contains('is-closing')) return;

  teardownImageZoom();
  lightbox.classList.remove('is-open');
  lightbox.classList.add('is-closing');
  setWorkUrl(null);
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('keydown', trapFocus);

  window.setTimeout(() => {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightbox.classList.remove('is-closing');
    setLenisPaused(false);
    document.body.style.overflow = '';

    if (lastTrigger instanceof HTMLElement) {
      lastTrigger.focus();
    }
  }, 380);
}

function showRelative(delta: number) {
  const work = currentWork();
  if (!work || work.images.length <= 1 || isImageZoomed()) return;

  imageIndex = (imageIndex + delta + work.images.length) % work.images.length;
  renderImage();
}

function onKeydown(event: KeyboardEvent) {
  if (!lightbox || lightbox.hidden) return;

  if (event.key === 'Escape') {
    if (isImageZoomed()) {
      panzoomApi?.reset({ animate: true });
      lightbox.classList.remove('art-lightbox--zoomed');
      event.preventDefault();
      return;
    }
    event.preventDefault();
    close();
  } else if (event.key === 'ArrowLeft') {
    const work = currentWork();
    if (work && work.images.length > 1) {
      event.preventDefault();
      showRelative(-1);
    }
  } else if (event.key === 'ArrowRight') {
    const work = currentWork();
    if (work && work.images.length > 1) {
      event.preventDefault();
      showRelative(1);
    }
  }
}

document.querySelectorAll('[data-work-open]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const index = Number(trigger.getAttribute('data-work-open'));
    if (!Number.isNaN(index)) open(index, trigger as HTMLElement);
  });
});

prevBtn?.addEventListener('click', () => showRelative(-1));
nextBtn?.addEventListener('click', () => showRelative(1));
closeTargets?.forEach((el) => el.addEventListener('click', close));

if (imageWrap) {
  imageWrap.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length !== 1 || isImageZoomed()) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  imageWrap.addEventListener(
    'touchend',
    (event) => {
      const work = currentWork();
      if (!work || work.images.length <= 1 || lightbox?.hidden || isImageZoomed()) return;
      if (event.touches.length > 0) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;

      showRelative(deltaX < 0 ? 1 : -1);
    },
    { passive: true }
  );
}

function openFromUrl() {
  const slug = new URLSearchParams(window.location.search).get('work');
  if (!slug) return;

  const index = worksForLightbox.findIndex((work) => work.slug === slug);
  if (index < 0) return;

  const delay = document.documentElement.classList.contains('skip-intro') ? 80 : 1200;
  window.setTimeout(() => open(index, null), delay);
}

if (lightbox && lightbox.parentElement !== document.body) {
  document.body.appendChild(lightbox);
}

openFromUrl();
