import type PhotoSwipe from 'photoswipe';
import { lockPageScroll, unlockPageScroll } from './scroll-lock';

type LightboxImage = { src: string; alt: string; caption?: string };
type LightboxWork = {
  id: string;
  slug: string;
  title: string;
  description: string;
  meta: string;
  status: string | null;
  images: LightboxImage[];
};

function readLightboxPayload(): { works: LightboxWork[]; email: string } {
  const el = document.getElementById('gallery-works-data');
  if (!el?.textContent) return { works: [], email: '' };
  try {
    return JSON.parse(el.textContent) as { works: LightboxWork[]; email: string };
  } catch {
    return { works: [], email: '' };
  }
}

const { works: worksForLightbox } = readLightboxPayload();
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
let isLightboxOpen = false;
let scrollLocked = false;
let skipFocusRestore = false;
let PhotoSwipeCtor: typeof PhotoSwipe | null = null;
let photoSwipeLoading: Promise<typeof PhotoSwipe> | null = null;

async function loadPhotoSwipe() {
  if (PhotoSwipeCtor) return PhotoSwipeCtor;
  if (!photoSwipeLoading) {
    photoSwipeLoading = Promise.all([import('photoswipe'), import('photoswipe/style.css')]).then(
      ([mod]) => {
        PhotoSwipeCtor = mod.default;
        return PhotoSwipeCtor;
      }
    );
  }
  return photoSwipeLoading;
}

function pausePageScroll() {
  if (scrollLocked) return;
  scrollLocked = true;
  lockPageScroll();
}

function resumePageScroll() {
  if (!scrollLocked) return;
  scrollLocked = false;
  unlockPageScroll();
}

function currentWork() {
  return worksForLightbox[workIndex];
}

function isImageZoomed() {
  const slide = pswpInstance?.currSlide;
  if (!slide) return false;
  return slide.currZoomLevel > slide.zoomLevels.initial + 0.02;
}

function syncOpenHistory(slug: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('work', slug);
  const currentSlug = new URLSearchParams(window.location.search).get('work');

  if (history.state?.lightbox && currentSlug === slug) {
    history.replaceState({ lightbox: true, work: slug }, '', url);
    return;
  }

  // Shared links land directly on ?work= — seed a base entry so back closes the lightbox
  if (currentSlug === slug && !history.state?.lightbox) {
    const base = new URL(window.location.href);
    base.searchParams.delete('work');
    history.replaceState({ lightbox: false }, '', base);
    history.pushState({ lightbox: true, work: slug }, '', url);
    return;
  }

  history.pushState({ lightbox: true, work: slug }, '', url);
}

function clearWorkParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('work')) return;
  url.searchParams.delete('work');
  history.replaceState({ lightbox: false }, '', url);
}

function updateEnquireLink(work: (typeof worksForLightbox)[number]) {
  if (!enquireEl) return;

  if (work?.status === 'available' || !work?.status) {
    enquireEl.href = '#get-in-touch';
    enquireEl.dataset.contactTopic = 'artwork';
    enquireEl.dataset.contactArtwork = work.title;
    enquireEl.dataset.contactSubject = `Artwork inquiry: ${work.title}`;
    enquireEl.dataset.contactMessage = `Anything you’d like to know about “${work.title}”...`;
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
  if (!work) return;

  if (titleEl) titleEl.textContent = work.title;
  if (descEl) {
    descEl.textContent = work.description;
    descEl.hidden = !work.description || work.description.startsWith('[PLACEHOLDER');
  }
  if (metaEl) metaEl.textContent = work.meta;

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
  if (!work || !photo) return;

  const hasMultiple = work.images.length > 1;
  if (counterEl) {
    if (hasMultiple) {
      counterEl.textContent = `Photo ${imageIndex + 1} of ${work.images.length}`;
      counterEl.hidden = false;
    } else {
      counterEl.textContent = '';
      counterEl.hidden = true;
    }
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

async function syncPhotoSwipe() {
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

  const PSWP = await loadPhotoSwipe();
  // Guard: lightbox may have closed while the module was loading.
  if (!lightbox || lightbox.hidden || currentWork() !== work) return;

  pswpInstance = new PSWP({
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
  void syncPhotoSwipe();
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

function open(index: number, trigger: HTMLElement | null, fromHistory = false, startImage = 0) {
  if (!lightbox || !worksForLightbox.length) return;

  if (lightbox.parentElement !== document.body) {
    document.body.appendChild(lightbox);
  }

  workIndex = index;
  const openingWork = worksForLightbox[index];
  const lastImage = openingWork ? openingWork.images.length - 1 : 0;
  imageIndex = Math.min(Math.max(startImage, 0), Math.max(lastImage, 0));
  lastTrigger = trigger;
  isLightboxOpen = true;
  lightbox.classList.remove('is-closing');
  lightbox.classList.toggle('art-lightbox--touch', !finePointer);
  lightbox.classList.toggle('art-lightbox--desktop', finePointer);

  const slug = worksForLightbox[index]?.slug;
  if (!fromHistory && slug) {
    syncOpenHistory(slug);
  }

  if (zoomHint) {
    zoomHint.hidden = finePointer;
  }

  lightbox.hidden = false;
  requestAnimationFrame(() => {
    lightbox?.classList.add('is-open');
    renderImage();
    requestAnimationFrame(() => pswpInstance?.updateSize(true));
  });

  pausePageScroll();
  lightbox.querySelector<HTMLElement>('.art-lightbox__close')?.focus();
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('keydown', trapFocus);
}

function finishClose() {
  if (!lightbox) return;
  teardownPhotoSwipe();
  lightbox.hidden = true;
  lightbox.classList.remove('is-closing');
  resumePageScroll();

  if (skipFocusRestore) {
    skipFocusRestore = false;
    return;
  }

  requestAnimationFrame(() => {
    if (lastTrigger instanceof HTMLElement) {
      lastTrigger.focus({ preventScroll: true });
    }
  });
}

function close(fromPopstate = false) {
  if (!lightbox || lightbox.classList.contains('is-closing') || !isLightboxOpen) return;

  if (!fromPopstate && new URLSearchParams(window.location.search).has('work')) {
    history.back();
    return;
  }

  isLightboxOpen = false;
  lightbox.classList.remove('is-open');
  lightbox.classList.add('is-closing');
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('keydown', trapFocus);

  window.setTimeout(finishClose, 380);
}

/** Close without history.back — used when jumping to the contact form. */
function closeForNavigate() {
  if (!lightbox || !isLightboxOpen) return;

  isLightboxOpen = false;
  skipFocusRestore = true;
  clearWorkParam();
  lightbox.classList.remove('is-open');
  lightbox.classList.add('is-closing');
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('keydown', trapFocus);
  finishClose();
  lightbox.classList.remove('is-closing');
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

// Delegated so dynamically cloned gallery photos (looping strips) also open.
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const trigger = target?.closest<HTMLElement>('[data-work-open]');
  if (!trigger) return;

  const index = Number(trigger.getAttribute('data-work-open'));
  if (Number.isNaN(index)) return;

  const photoAttr = trigger.getAttribute('data-photo-index');
  const startImage = photoAttr ? Number(photoAttr) : 0;
  open(index, trigger, false, Number.isNaN(startImage) ? 0 : startImage);
});

prevBtn?.addEventListener('click', () => showRelative(-1));
nextBtn?.addEventListener('click', () => showRelative(1));
closeTargets?.forEach((el) => el.addEventListener('click', () => close()));

enquireEl?.addEventListener('click', () => {
  closeForNavigate();
});

window.addEventListener('popstate', () => {
  const slug = new URLSearchParams(window.location.search).get('work');

  if (isLightboxOpen && !slug) {
    close(true);
    return;
  }

  if (!isLightboxOpen && slug) {
    const index = worksForLightbox.findIndex((work) => work.slug === slug);
    if (index >= 0) open(index, null, true);
  }
});

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
