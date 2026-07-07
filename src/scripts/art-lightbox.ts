import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { works, formatLightboxMeta } from '../data/works';
import { site } from '../data/site';

const worksForLightbox = works.map((work) => ({
  id: work.id,
  slug: work.slug,
  title: work.title,
  description: work.detailDescription ?? work.description,
  meta: formatLightboxMeta(work),
  status: work.status ?? null,
  images: work.images,
}));

const contactEmail = site.email;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const defaultImageSize = { width: 1200, height: 1500 };

const lightbox = document.getElementById('art-lightbox') as HTMLElement | null;
const zoomStage = lightbox?.querySelector<HTMLElement>('[data-lightbox-zoom-stage]') ?? null;
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
let pswpWorkIndex = -1;

let pswpInstance: PhotoSwipe | null = null;
let pswpChangeHandler: (() => void) | null = null;
let pswpZoomHandler: (() => void) | null = null;
let resizeHandler: (() => void) | null = null;
let savedScrollY = 0;

function getScrollY() {
  return window.__lenis?.scroll ?? window.scrollY;
}

function pausePageScroll() {
  savedScrollY = getScrollY();
  const lenis = window.__lenis;
  if (lenis) lenis.stop();
  document.body.style.overflow = 'hidden';
}

function resumePageScroll() {
  document.body.style.overflow = '';
  const lenis = window.__lenis;
  if (lenis) {
    lenis.start();
    lenis.scrollTo(savedScrollY, { immediate: true });
    return;
  }
  window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });
}

function currentWork() {
  return worksForLightbox[workIndex];
}

function isImageZoomed() {
  const slide = pswpInstance?.currSlide;
  if (!slide) return false;
  return slide.currZoomLevel > slide.zoomLevels.initial + 0.02;
}

function setWorkUrl(slug: string | null) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set('work', slug);
  else url.searchParams.delete('work');
  history.replaceState({ work: slug || null }, '', url);
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

function updateZoomState() {
  if (!lightbox) return;
  lightbox.classList.toggle('art-lightbox--zoomed', isImageZoomed());
}

function teardownPhotoSwipe() {
  if (pswpInstance && pswpChangeHandler) {
    pswpInstance.off('change', pswpChangeHandler);
  }
  if (pswpInstance && pswpZoomHandler) {
    pswpInstance.off('zoomPanUpdate', pswpZoomHandler);
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  if (pswpInstance) {
    pswpInstance.destroy();
    pswpInstance = null;
  }

  pswpWorkIndex = -1;
  lightbox?.classList.remove('art-lightbox--zoomed');
}

function buildDataSource(work: (typeof worksForLightbox)[number]) {
  return work.images.map((photo) => ({
    src: photo.src,
    width: defaultImageSize.width,
    height: defaultImageSize.height,
    alt: photo.alt,
  }));
}

function applyWorkMeta() {
  const work = currentWork();
  if (!work || !titleEl || !descEl || !metaEl) return;

  titleEl.textContent = work.title;
  descEl.textContent = work.description;
  metaEl.textContent = work.meta;

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

  updateEnquireLink(work);
}

function applyImageMeta() {
  const work = currentWork();
  const photo = work?.images[imageIndex];
  if (!work || !photo || !counterEl) return;

  const hasMultiple = work.images.length > 1;
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
}

function syncPhotoSwipe() {
  const work = currentWork();
  if (!work || !zoomStage || !lightbox || lightbox.hidden) return;

  if (pswpInstance && pswpWorkIndex === workIndex) {
    if (pswpInstance.currIndex !== imageIndex) {
      pswpInstance.goTo(imageIndex);
    }
    updateZoomState();
    return;
  }

  teardownPhotoSwipe();

  pswpInstance = new PhotoSwipe({
    appendToEl: zoomStage,
    dataSource: buildDataSource(work),
    index: imageIndex,
    bgOpacity: 0,
    spacing: 0.05,
    loop: work.images.length > 2,
    allowPanToNext: !finePointer,
    pinchToClose: false,
    closeOnVerticalDrag: false,
    showHideAnimationType: 'none',
    showAnimationDuration: 0,
    hideAnimationDuration: 0,
    zoomAnimationDuration: 320,
    escKey: false,
    arrowKeys: false,
    trapFocus: false,
    returnFocus: false,
    clickToCloseNonZoomable: false,
    imageClickAction: finePointer ? 'zoom' : 'zoom-or-close',
    doubleTapAction: 'zoom',
    bgClickAction: false,
    tapAction: false,
    arrowPrev: false,
    arrowNext: false,
    close: false,
    counter: false,
    zoom: false,
    wheelToZoom: finePointer,
    mouseMovePan: true,
    preload: [1, 1],
    mainClass: 'pswp--embedded',
    getViewportSizeFn: () => ({
      x: zoomStage.clientWidth || 320,
      y: zoomStage.clientHeight || 400,
    }),
  });

  pswpWorkIndex = workIndex;

  pswpChangeHandler = () => {
    if (!pswpInstance) return;
    imageIndex = pswpInstance.currIndex;
    applyImageMeta();
    updateZoomState();
  };

  pswpZoomHandler = () => {
    updateZoomState();
  };

  pswpInstance.on('change', pswpChangeHandler);
  pswpInstance.on('zoomPanUpdate', pswpZoomHandler);

  resizeHandler = () => {
    pswpInstance?.updateSize(true);
  };
  window.addEventListener('resize', resizeHandler);

  pswpInstance.init();
  updateZoomState();
}

function renderImage() {
  applyWorkMeta();
  applyImageMeta();
  syncPhotoSwipe();
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

  lightbox.hidden = false;
  requestAnimationFrame(() => {
    lightbox?.classList.add('is-open');
    renderImage();
    requestAnimationFrame(() => pswpInstance?.updateSize(true));
  });

  setWorkUrl(worksForLightbox[index]?.slug ?? null);
  pausePageScroll();
  lightbox.querySelector<HTMLElement>('.art-lightbox__close')?.focus();
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('keydown', trapFocus);
}

function close() {
  if (!lightbox || lightbox.hidden || lightbox.classList.contains('is-closing')) return;

  lightbox.classList.remove('is-open');
  lightbox.classList.add('is-closing');
  setWorkUrl(null);
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('keydown', trapFocus);

  window.setTimeout(() => {
    if (!lightbox) return;
    teardownPhotoSwipe();
    lightbox.hidden = true;
    lightbox.classList.remove('is-closing');
    resumePageScroll();

    requestAnimationFrame(() => {
      if (lastTrigger instanceof HTMLElement) {
        lastTrigger.focus({ preventScroll: true });
      }
    });
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
      pswpInstance?.toggleZoom();
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
