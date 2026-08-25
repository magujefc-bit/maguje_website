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
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .carousel__track::-webkit-scrollbar {
    display: none;
  }

  .carousel__slide {
    flex: 0 0 100%;
    width: 100%;
    min-width: 0;
    scroll-snap-align: start;
  }
`);

export function initCarousel(rootEl, options = {}) {
  const {
    intervalMs = 8000,
    autoplay = true,
    pauseOffscreen = true,
    skipIndicesOnLoop = [],
    onIndexChange = null,
  } = options;

  const track = rootEl.querySelector('[data-track]');
  if (!track) return { destroy() {}, goTo() {}, pause() {}, resume() {} };

  let timer = null;
  let resumeTimeout = null;
  let isInteracting = false;
  let isOffscreen = false;
  let destroyed = false;
  let intersectionObserver = null;

  function slideCount() {
    return track.children.length;
  }

  function currentIndex() {
    if (!slideCount()) return 0;
    const slideWidth = track.clientWidth || 1;
    return Math.round(track.scrollLeft / slideWidth);
  }

  function nextIndex(from) {
    const count = slideCount();
    if (!count) return 0;
    let next = (from + 1) % count;
    if (skipIndicesOnLoop.includes(next) && count > 1) {
      next = (next + 1) % count;
    }
    return next;
  }

  function goTo(index, smooth = true) {
    const slide = track.children[index];
    if (!slide) return;
    track.scrollTo({
      left: slide.offsetLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });
    if (onIndexChange) onIndexChange(index);
  }

  function tick() {
    if (isInteracting || isOffscreen || destroyed) return;
    if (slideCount() <= 1) return;
    goTo(nextIndex(currentIndex()));
  }

  function startTimer() {
    stopTimer();
    if (!autoplay) return;
    if (slideCount() <= 1) return;
    timer = setInterval(tick, intervalMs);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function pause() {
    stopTimer();
  }

  function resume() {
    if (!isInteracting && !isOffscreen) startTimer();
  }

  function onInteractionStart() {
    isInteracting = true;
    stopTimer();
    if (resumeTimeout) clearTimeout(resumeTimeout);
  }

  function onInteractionEnd() {
    isInteracting = false;
    if (resumeTimeout) clearTimeout(resumeTimeout);
    resumeTimeout = setTimeout(() => {
      if (onIndexChange) onIndexChange(currentIndex());
      resume();
    }, 600);
  }

  track.addEventListener('pointerdown', onInteractionStart, { passive: true });
  track.addEventListener('touchstart', onInteractionStart, { passive: true });
  track.addEventListener('pointerup', onInteractionEnd, { passive: true });
  track.addEventListener('touchend', onInteractionEnd, { passive: true });
  track.addEventListener('pointercancel', onInteractionEnd, { passive: true });

  if (pauseOffscreen) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isOffscreen = !entry.isIntersecting;
          if (isOffscreen) {
            stopTimer();
          } else {
            resume();
          }
        });
      },
      { threshold: 0.25 },
    );
    intersectionObserver.observe(rootEl);
  } else {
    startTimer();
  }

  return {
    goTo,
    pause,
    resume,
    currentIndex,
    destroy() {
      destroyed = true;
      stopTimer();
      if (resumeTimeout) clearTimeout(resumeTimeout);
      if (intersectionObserver) intersectionObserver.disconnect();
      track.removeEventListener('pointerdown', onInteractionStart);
      track.removeEventListener('touchstart', onInteractionStart);
      track.removeEventListener('pointerup', onInteractionEnd);
      track.removeEventListener('touchend', onInteractionEnd);
      track.removeEventListener('pointercancel', onInteractionEnd);
    },
  };
}
