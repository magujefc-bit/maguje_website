const FALLBACK_SRC = '/assets/image-fallback.svg';
let observer = null;

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { loadImage(entry.target); observer.unobserve(entry.target); }
    });
  }, { rootMargin: '200px 0px' });
  return observer;
}

function loadImage(img) {
  const src = img.dataset.src;
  if (!src) { img.src = FALLBACK_SRC; img.classList.add('lazy-img--fallback'); return; }
  const tmp = new Image();
  tmp.onload = () => { img.src = src; img.classList.remove('lazy-img--loading'); img.classList.add('lazy-img--loaded'); };
  tmp.onerror = () => { img.src = FALLBACK_SRC; img.classList.remove('lazy-img--loading'); img.classList.add('lazy-img--fallback'); img.alt = img.dataset.fallbackAlt || 'Image unavailable'; };
  tmp.src = src;
}

export function lazyImage({ src, alt = '', aspect = '', className = '' } = {}) {
  const aspectClass = aspect ? `aspect-${aspect}` : '';
  return `
    <div class="lazy-img-wrap ${aspectClass}">
      <img class="lazy-img lazy-img--loading ${className}" data-src="${src || ''}" alt="${alt}" loading="lazy" decoding="async">
    </div>`;
}

export function observeLazyImages(container) {
  const obs = getObserver();
  container.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
}

export function disconnectLazyImages() {
  if (observer) { observer.disconnect(); observer = null; }
}
