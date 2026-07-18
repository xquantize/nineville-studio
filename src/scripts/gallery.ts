const gallery = document.querySelector<HTMLElement>('.gallery');

if (gallery) {
  const pieces = Array.from(gallery.querySelectorAll<HTMLElement>('.gallery__piece'));
  const intros = Array.from(gallery.querySelectorAll<HTMLElement>('[data-series-intro]'));
  const clearBtns = Array.from(
    gallery.querySelectorAll<HTMLButtonElement>('[data-series-clear]')
  );
  const seriesFoot = gallery.querySelector<HTMLElement>('[data-series-foot]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileGallery = window.matchMedia('(max-width: 767px)');

  const portal = gallery.querySelector<HTMLElement>('[data-gallery-portal]');
  const portalItems = Array.from(
    gallery.querySelectorAll<HTMLButtonElement>('[data-series-focus]')
  );
  const portalPlates = Array.from(
    gallery.querySelectorAll<HTMLElement>('[data-series-plate]')
  );
  const portalTag = gallery.querySelector<HTMLElement>('[data-portal-tag]');
  const portalCount = gallery.querySelector<HTMLElement>('[data-portal-count]');

  let activeSeries: string | null = null;
  let portalFocus = portalItems[0]?.dataset.seriesFocus ?? null;
  let portalTimer: number | null = null;
  let portalPaused = false;
  let portalInView = true;

  // ——— Seamless ring-scroll strips ———
  // When a work has more photos than fit across the page, clone the set on both
  // sides (3 sets total) and start in the middle. Scrolling either direction wraps
  // seamlessly — a full ring — and the first image loads clear of the edge fade.
  const loopHandlers = new WeakMap<HTMLElement, EventListener>();
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

  // Mirror of the CSS --fade on .gallery__strip (keep 7rem / 1040 in sync).
  function fadeWidth(strip: HTMLElement) {
    if (mobileGallery.matches) {
      const fade = parseFloat(getComputedStyle(strip).getPropertyValue('--fade'));
      return Number.isFinite(fade) ? fade : 0;
    }
    return Math.max(7 * rootFontSize, (strip.clientWidth - 1040) / 2);
  }

  function cloneOf(node: HTMLElement): HTMLElement {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.setAttribute('data-clone', '');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    // Cloned images are added after the initial load pass, so reveal them here.
    clone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (img.complete && img.naturalWidth > 0) img.classList.add('is-loaded');
      else img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    });
    return clone;
  }

  function setupLoop(strip: HTMLElement) {
    const track = strip.querySelector<HTMLElement>('.gallery__track');
    if (!track) return;

    // Tear down any previous loop on this strip before re-measuring.
    const previous = loopHandlers.get(strip);
    if (previous) {
      strip.removeEventListener('scroll', previous);
      loopHandlers.delete(strip);
    }
    track.querySelectorAll('[data-clone]').forEach((clone) => clone.remove());
    strip.removeAttribute('data-loop');
    strip.scrollLeft = 0;

    const originals = Array.from(track.children) as HTMLElement[];
    if (!originals.length) return;

    // On touch, native snap scroll feels smoother than clone-and-jump looping.
    if (mobileGallery.matches) {
      strip.scrollLeft = 0;
      return;
    }

    // Only loop when the row actually overflows the viewport.
    if (track.scrollWidth <= strip.clientWidth + 2) return;

    const count = originals.length;
    const firstOriginal = originals[0];
    // Prepend a set (in order, before the originals) and append a set after them.
    originals.forEach((node) => track.insertBefore(cloneOf(node), firstOriginal));
    originals.forEach((node) => track.appendChild(cloneOf(node)));

    strip.setAttribute('data-loop', 'on');

    let period = 0; // width of one full set — the seamless wrap distance
    let start = 0; // initial offset: first original sitting just past the fade
    let userInteracted = false;

    const measure = () => {
      const firstOrig = track.children[count] as HTMLElement | undefined;
      if (!firstOrig || firstOrig.offsetLeft <= 0) return;
      period = firstOrig.offsetLeft;
      start = Math.max(firstOrig.offsetLeft - fadeWidth(strip) - 8, 0);
      if (!userInteracted) strip.scrollLeft = start;
    };
    measure();

    // Re-measure as natural image widths settle (keeps the first image clear).
    track.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', measure, { once: true });
    });

    (['wheel', 'touchstart', 'pointerdown'] as const).forEach((ev) =>
      strip.addEventListener(ev, () => (userInteracted = true), { passive: true })
    );

    const onScroll: EventListener = () => {
      if (period <= 0) return;
      // Keep the viewport within the middle set; jump by exactly one set (seamless).
      if (strip.scrollLeft < period * 0.5) strip.scrollLeft += period;
      else if (strip.scrollLeft > period * 1.5) strip.scrollLeft -= period;
    };
    strip.addEventListener('scroll', onScroll, { passive: true });
    loopHandlers.set(strip, onScroll);
  }

  function refreshLoops() {
    pieces.forEach((piece) => {
      if (piece.hidden) return;
      const strip = piece.querySelector<HTMLElement>('.gallery__strip');
      if (strip) setupLoop(strip);
    });
  }

  // ——— Landing portal: one mood stage, names drive the plate ———
  function shufflePick(pool: string[], count: number): string[] {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j]!;
      copy[j] = tmp!;
    }
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      out.push(copy[i % copy.length]!);
    }
    return out;
  }

  function applyAtmosphere(stack: HTMLElement, reshuffle: boolean) {
    let pool: string[] = [];
    try {
      pool = JSON.parse(stack.dataset.peekPool || '[]') as string[];
    } catch {
      pool = [];
    }
    if (!pool.length) return;

    const imgs = Array.from(stack.querySelectorAll<HTMLImageElement>('img'));
    if (!imgs.length) return;

    const mode = stack.dataset.peekMode === 'shuffle' ? 'shuffle' : 'fixed';
    const picks =
      mode === 'shuffle' && (reshuffle || pool.length > imgs.length)
        ? shufflePick(pool, imgs.length)
        : pool;

    imgs.forEach((img, i) => {
      const next = picks[i % picks.length] ?? img.dataset.src;
      if (!next) return;
      const absolute = new URL(next, window.location.origin).href;
      if (img.src !== absolute) img.src = next;
    });
  }

  // Warm every plate so crossfades show real images, not empty shards.
  function preloadPortalPlates() {
    portalPlates.forEach((plate) => applyAtmosphere(plate, false));
  }
  preloadPortalPlates();

  function syncPortalAria() {
    if (!mobileGallery.matches) return;
    portalItems.forEach((item) => {
      const on = item.dataset.seriesFocus === portalFocus;
      const name = item.querySelector('.gallery__portal-name')?.textContent?.trim() ?? 'series';
      item.setAttribute('aria-label', on ? `Open ${name} series` : `Preview ${name}`);
    });
  }

  function focusPortal(slug: string) {
    portalFocus = slug;
    portalItems.forEach((item) => {
      item.classList.toggle('is-focus', item.dataset.seriesFocus === slug);
    });
    syncPortalAria();
    portalPlates.forEach((plate) => {
      const on = plate.dataset.seriesPlate === slug;
      plate.classList.toggle('is-active', on);
      if (on) applyAtmosphere(plate, true);
    });
    const item = portalItems.find((el) => el.dataset.seriesFocus === slug);
    if (portalTag) portalTag.textContent = item?.dataset.tagline ?? '';
    if (portalCount) portalCount.textContent = item?.dataset.count ?? '';
  }

  function stopPortalCycle() {
    if (portalTimer !== null) {
      window.clearInterval(portalTimer);
      portalTimer = null;
    }
  }

  function startPortalCycle() {
    stopPortalCycle();
    if (reduceMotion || portalPaused || !portalInView || activeSeries || portalItems.length < 2) {
      return;
    }
    // Longer beat so the mobile crossfade is readable
    const beat = mobileGallery.matches ? 3800 : 3200;
    portalTimer = window.setInterval(() => {
      const idx = portalItems.findIndex((el) => el.dataset.seriesFocus === portalFocus);
      const next = portalItems[(idx + 1) % portalItems.length];
      const slug = next?.dataset.seriesFocus;
      if (slug) focusPortal(slug);
    }, beat);
  }

  function galleryOffset() {
    const nav = document.querySelector<HTMLElement>('.nav');
    return -((nav?.getBoundingClientRect().height ?? 56) + 16);
  }

  function scrollToGalleryTop(immediate = false, onComplete?: () => void) {
    const offset = galleryOffset();
    const lenis = window.__lenis;
    const currentScroll = lenis?.scroll ?? window.scrollY;
    const top = Math.max(0, gallery!.getBoundingClientRect().top + currentScroll + offset);
    const jump = immediate || reduceMotion || mobileGallery.matches;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      onComplete?.();
    };

    if (lenis) {
      lenis.scrollTo(top, {
        immediate: jump,
        duration: jump ? 0 : 0.95,
        onComplete: done,
      });
      // Lenis may skip onComplete for immediate jumps — always finish.
      if (jump) window.setTimeout(done, 0);
      return;
    }

    window.scrollTo({ top, behavior: jump ? 'auto' : 'smooth' });
    window.setTimeout(done, jump ? 0 : 520);
  }

  function resetSeriesView() {
    activeSeries = null;
    gallery!.classList.remove('has-series');
    clearBtns.forEach((btn) => {
      btn.hidden = true;
    });
    if (seriesFoot) seriesFoot.hidden = true;

    intros.forEach((intro) => {
      intro.hidden = true;
    });

    pieces.forEach((piece) => {
      piece.hidden = true;
      piece.classList.remove('is-in');
      piece.style.transitionDelay = '';
    });

    // Preview taps pause the cycle — clear that when returning to the portal.
    portalPaused = false;
    startPortalCycle();
  }

  function clearSeries() {
    // Instant jump + soft portal fade. Animating scroll through a tall
    // photo strip always feels laggy on phones — skip that entirely.
    gallery!.classList.add('is-clearing');
    resetSeriesView();
    scrollToGalleryTop(true, () => {
      requestAnimationFrame(() => {
        gallery!.classList.remove('is-clearing');
        gallery!.classList.add('is-portal-in');
        window.setTimeout(() => gallery!.classList.remove('is-portal-in'), 480);
      });
    });
  }

  function selectSeries(slug: string) {
    if (slug === activeSeries) return;
    activeSeries = slug;
    gallery!.classList.add('has-series');
    clearBtns.forEach((btn) => {
      btn.hidden = false;
    });
    if (seriesFoot) seriesFoot.hidden = false;
    stopPortalCycle();

    intros.forEach((intro) => {
      intro.hidden = intro.dataset.seriesIntro !== slug;
    });

    let shown = 0;
    pieces.forEach((piece) => {
      const match = piece.dataset.series === slug;
      piece.hidden = !match;
      piece.classList.remove('is-in');
      if (match) {
        piece.style.transitionDelay =
          reduceMotion || mobileGallery.matches ? '0ms' : `${Math.min(shown, 6) * 90}ms`;
        shown += 1;
      }
    });

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        pieces.forEach((piece) => {
          if (!piece.hidden) piece.classList.add('is-in');
        });
        refreshLoops();
        if (!mobileGallery.matches) scrollToGalleryTop(false);
      })
    );
  }

  clearBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      clearSeries();
    });
  });

  gallery.querySelectorAll<HTMLElement>('[data-series-open]').forEach((card) => {
    card.addEventListener('click', () => {
      const slug = card.dataset.seriesOpen;
      if (!slug) return;

      // Mobile: first tap previews the collage; second tap on the same
      // series opens it. Desktop: click always opens (hover already focuses).
      if (mobileGallery.matches) {
        if (slug === portalFocus) {
          selectSeries(slug);
        } else {
          portalPaused = true;
          stopPortalCycle();
          focusPortal(slug);
        }
        return;
      }

      selectSeries(slug);
    });
  });

  portalItems.forEach((item) => {
    const slug = item.dataset.seriesFocus;
    if (!slug) return;
    item.addEventListener('pointerenter', (event) => {
      // Touch taps fire pointerenter then leave inconsistently — don't park
      // the cycle forever after a single tap-hover on phones.
      if (event.pointerType === 'touch') return;
      portalPaused = true;
      stopPortalCycle();
      focusPortal(slug);
    });
    item.addEventListener('focus', () => {
      portalPaused = true;
      stopPortalCycle();
      focusPortal(slug);
    });
  });

  portal?.addEventListener('pointerleave', () => {
    // Desktop hover exit — resume auto-cycle. Mobile preview stays paused
    // until the series opens or the user returns via Collections.
    if (mobileGallery.matches) return;
    portalPaused = false;
    startPortalCycle();
  });

  // Seed mobile aria-labels for the initial focused series.
  syncPortalAria();

  if (portal && !reduceMotion) {
    const io = new IntersectionObserver(
      ([entry]) => {
        portalInView = entry?.isIntersecting ?? false;
        if (portalInView && !activeSeries) startPortalCycle();
        else stopPortalCycle();
      },
      { threshold: 0.25 }
    );
    io.observe(portal);
    startPortalCycle();
  }

  let resizeTimer: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(refreshLoops, 200);
  });
}
