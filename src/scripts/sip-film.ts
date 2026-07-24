import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';

const root = document.querySelector<HTMLElement>('[data-sip-film]');
if (root) {
  const frames = Array.from(
    root.querySelectorAll<HTMLElement>('.sip-film__set:not(.sip-film__dup) [data-sip-pswp]')
  );

  const dataSource = frames.map((frame) => {
    const img = frame.querySelector('img');
    return {
      src: frame.dataset.sipPswp || img?.currentSrc || img?.src || '',
      width: Number(frame.dataset.pswpWidth) || 720,
      height: Number(frame.dataset.pswpHeight) || 900,
      alt: img?.alt || 'Sip & Paint moment',
    };
  });

  const lightbox = new PhotoSwipeLightbox({
    dataSource,
    pswpModule: PhotoSwipe,
    mainClass: 'pswp--sip',
    showHideAnimationType: 'fade',
    showAnimationDuration: 400,
    hideAnimationDuration: 280,
    bgOpacity: 0.92,
    spacing: 0.08,
    loop: dataSource.length > 2,
    paddingFn: (viewportSize) => {
      const narrow = viewportSize.x < 768;
      return {
        top: narrow ? 56 : 64,
        bottom: narrow ? 64 : 72,
        left: narrow ? 16 : 40,
        right: narrow ? 16 : 40,
      };
    },
    wheelToZoom: true,
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
  });

  lightbox.on('uiRegister', () => {
    // pswp exists during uiRegister
    lightbox.pswp?.ui?.registerElement({
      name: 'sip-caption',
      order: 9,
      isButton: false,
      appendTo: 'root',
      html: '',
      onInit: (el) => {
        el.className = 'sip-pswp-caption';
        const update = () => {
          const i = lightbox.pswp?.currIndex ?? 0;
          el.textContent = `${i + 1} / ${dataSource.length} · Sip & Paint`;
        };
        lightbox.pswp?.on('change', update);
        update();
      },
    });
  });

  lightbox.init();

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const frame = target?.closest<HTMLElement>('[data-sip-pswp]');
    if (!frame || !root.contains(frame)) return;
    event.preventDefault();
    const index = Number(frame.dataset.sipIndex);
    if (Number.isNaN(index)) return;
    lightbox.loadAndOpen(index);
  });
}
