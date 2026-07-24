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

  const raw = document.body.dataset.lockScrollY;
  const parsed = raw != null && raw !== '' ? Number(raw) : NaN;
  const target = Number.isFinite(parsed) ? parsed : 0;

  document.documentElement.classList.remove('is-scroll-locked');
  document.body.style.top = '';
  delete document.body.dataset.lockScrollY;

  // Restore native scroll first. If Lenis starts while the unlocked page
  // still reads as 0 (body was position:fixed), it jumps to the hero.
  window.scrollTo(0, target);

  const lenis = window.__lenis;
  if (lenis) {
    lenis.scrollTo(target, { immediate: true });
    lenis.resize();
    lenis.start();
  }
}
