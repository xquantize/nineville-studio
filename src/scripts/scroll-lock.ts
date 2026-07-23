/** Nested-safe page scroll lock (iOS-friendly: position fixed + restore). */

let lockCount = 0;

function currentScrollY() {
  return window.__lenis?.scroll ?? window.scrollY ?? document.documentElement.scrollTop ?? 0;
}

export function lockPageScroll() {
  if (lockCount === 0) {
    const y = currentScrollY();
    document.body.dataset.lockScrollY = String(y);
    document.documentElement.classList.add('is-scroll-locked');
    document.body.style.top = `-${y}px`;
    window.__lenis?.stop();
  }
  lockCount += 1;
}

export function unlockPageScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  const y = Number(document.body.dataset.lockScrollY || 0);
  document.documentElement.classList.remove('is-scroll-locked');
  document.body.style.top = '';
  delete document.body.dataset.lockScrollY;

  const lenis = window.__lenis;
  if (lenis) {
    lenis.start();
    lenis.scrollTo(y, { immediate: true });
    return;
  }

  window.scrollTo(0, y);
}
