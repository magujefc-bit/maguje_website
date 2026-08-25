import { injectStyle } from '../utils/inject-style.js';

injectStyle('carousel-base', `
  .carousel {
    position: relative;
    width: 100%;
    min-width: 0;
  }

  .carousel__track {
    display: flex;
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    overscroll-behavior-x: contain;
  }

  .carousel__track::-webkit-scrollbar {
    display: none;
  }

  .carousel__slide {
    flex: 0 0 100%;
    width: 100%;
    min-width: 0;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  @media (prefers-reduced-motion: reduce) {
    .carousel__track {
      scroll-behavior: auto;
    }
  }
`);

/**
 * Native scrolling/snap carousel.
 *
 * Behaviour:
 * - Autoplay defaults to 7 seconds.
 * - Autoplay NEVER pauses because the carousel leaves the viewport.
 * - Any manual scroll resets the autoplay countdown.
 * - Native browser scrolling/physics are preserved.
 * - Programmatic autoplay scrolling does not accidentally reset itself.
 * - Carousel stops completely when destroy() is called.
 */
export function initCarousel(rootEl, options = {}) {
  const {
    intervalMs = 7000,
    autoplay = true,
    onIndexChange = null,
  } = options;

  if (!rootEl) {
    return createEmptyController();
  }

  const track = rootEl.querySelector('[data-track]');

  if (!track) {
    return createEmptyController();
  }

  let timer = null;
  let interactionTimeout = null;
  let scrollEndTimeout = null;

  let destroyed = false;
  let isProgrammaticScroll = false;
  let lastIndex = 0;

  /*
   * ---------------------------------------------------------
   * Helpers
   * ---------------------------------------------------------
   */

  function slideCount() {
    return track.children.length;
  }

  function getSlideWidth() {
    return track.clientWidth || 1;
  }

  function currentIndex() {
    const count = slideCount();

    if (!count) return 0;

    const slideWidth = getSlideWidth();
    const rawIndex = track.scrollLeft / slideWidth;

    return Math.max(
      0,
      Math.min(count - 1, Math.round(rawIndex)),
    );
  }

  function notifyIndexChange(index) {
    if (index === lastIndex) return;

    lastIndex = index;

    if (typeof onIndexChange === 'function') {
      onIndexChange(index);
    }
  }

  function nextIndex() {
    const count = slideCount();

    if (count <= 1) return 0;

    const current = currentIndex();

    return (current + 1) % count;
  }

  /*
   * ---------------------------------------------------------
   * Timer
   * ---------------------------------------------------------
   */

  function stopTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNext() {
    stopTimer();

    if (destroyed) return;
    if (!autoplay) return;
    if (slideCount() <= 1) return;

    timer = setTimeout(() => {
      timer = null;

      if (destroyed) return;
      if (slideCount() <= 1) return;

      goTo(nextIndex(), true, true);
    }, intervalMs);
  }

  /*
   * ---------------------------------------------------------
   * Programmatic navigation
   * ---------------------------------------------------------
   */

  function goTo(index, smooth = true, fromAutoplay = false) {
    const count = slideCount();

    if (!count) return;

    const safeIndex = Math.max(
      0,
      Math.min(count - 1, index),
    );

    const slide = track.children[safeIndex];

    if (!slide) return;

    /*
     * Manual calls should reset autoplay.
     *
     * Autoplay itself gets its next timer after the
     * programmatic scroll finishes.
     */
    if (!fromAutoplay) {
      stopTimer();
    }

    isProgrammaticScroll = true;

    track.scrollTo({
      left: slide.offsetLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });

    notifyIndexChange(safeIndex);

    /*
     * For an instant scroll there is no scroll animation
     * to wait for.
     */
    if (!smooth) {
      isProgrammaticScroll = false;

      if (!destroyed) {
        scheduleNext();
      }

      return;
    }

    /*
     * Wait until the native smooth scroll has settled.
     */
    clearTimeout(scrollEndTimeout);

    scrollEndTimeout = setTimeout(() => {
      isProgrammaticScroll = false;

      if (!destroyed) {
        notifyIndexChange(currentIndex());
        scheduleNext();
      }
    }, 700);
  }

  /*
   * ---------------------------------------------------------
   * Manual interaction
   * ---------------------------------------------------------
   *
   * We intentionally use the native scroll event rather than
   * pointer-dragging. This means:
   *
   * - touch scrolling works naturally
   * - trackpad scrolling works naturally
   * - mouse wheel works naturally
   * - browser momentum remains intact
   */

  function handleScroll() {
    if (destroyed) return;

    const index = currentIndex();

    notifyIndexChange(index);

    /*
     * Autoplay-generated smooth scrolling produces scroll
     * events too. Do not treat those as manual interaction.
     */
    if (isProgrammaticScroll) return;

    /*
     * Any genuine manual scroll resets the 7-second countdown.
     */
    stopTimer();

    clearTimeout(scrollEndTimeout);

    scrollEndTimeout = setTimeout(() => {
      if (destroyed) return;

      notifyIndexChange(currentIndex());

      /*
       * Start a fresh 7-second countdown AFTER the user
       * finishes scrolling.
       */
      scheduleNext();
    }, 250);
  }

  function handlePointerDown() {
    if (destroyed) return;

    /*
     * Stop autoplay immediately when the user begins
     * interacting with the carousel.
     */
    stopTimer();

    clearTimeout(interactionTimeout);
  }

  function handlePointerUp() {
    if (destroyed) return;

    clearTimeout(interactionTimeout);

    /*
     * The scroll event normally handles this. This fallback
     * makes taps/drags that cause little or no movement also
     * restart the countdown.
     */
    interactionTimeout = setTimeout(() => {
      if (destroyed) return;

      if (!isProgrammaticScroll) {
        scheduleNext();
      }
    }, 250);
  }

  /*
   * ---------------------------------------------------------
   * Resize handling
   * ---------------------------------------------------------
   *
   * Card widths can change at breakpoints. Recalculate the
   * active slide after resize so the carousel doesn't land
   * between slides.
   */

  function handleResize() {
    if (destroyed) return;

    const index = currentIndex();

    goTo(index, false, false);
  }

  /*
   * ---------------------------------------------------------
   * Events
   * ---------------------------------------------------------
   */

  track.addEventListener('scroll', handleScroll, {
    passive: true,
  });

  track.addEventListener('pointerdown', handlePointerDown, {
    passive: true,
  });

  track.addEventListener('pointerup', handlePointerUp, {
    passive: true,
  });

  track.addEventListener('pointercancel', handlePointerUp, {
    passive: true,
  });

  window.addEventListener('resize', handleResize, {
    passive: true,
  });

  /*
   * ---------------------------------------------------------
   * Initial state
   * ---------------------------------------------------------
   */

  lastIndex = currentIndex();

  if (typeof onIndexChange === 'function') {
    onIndexChange(lastIndex);
  }

  /*
   * IMPORTANT:
   * No IntersectionObserver.
   *
   * The carousel keeps autoplaying even when it is below
   * the viewport. It only stops when destroy() is called.
   */
  scheduleNext();

  /*
   * ---------------------------------------------------------
   * Public controller
   * ---------------------------------------------------------
   */

  return {
    goTo(index, smooth = true) {
      goTo(index, smooth, false);
    },

    pause() {
      stopTimer();
    },

    resume() {
      if (destroyed) return;

      scheduleNext();
    },

    currentIndex,

    destroy() {
      if (destroyed) return;

      destroyed = true;

      stopTimer();

      if (interactionTimeout !== null) {
        clearTimeout(interactionTimeout);
        interactionTimeout = null;
      }

      if (scrollEndTimeout !== null) {
        clearTimeout(scrollEndTimeout);
        scrollEndTimeout = null;
      }

      track.removeEventListener('scroll', handleScroll);
      track.removeEventListener('pointerdown', handlePointerDown);
      track.removeEventListener('pointerup', handlePointerUp);
      track.removeEventListener('pointercancel', handlePointerUp);

      window.removeEventListener('resize', handleResize);
    },
  };
}

function createEmptyController() {
  return {
    goTo() {},
    pause() {},
    resume() {},
    currentIndex() {
      return 0;
    },
    destroy() {},
  };
}
