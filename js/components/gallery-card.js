import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('gallery-card', `
  .gallery-card { position: relative; aspect-ratio: 1/1; overflow: hidden; border-radius: var(--radius-sm); display: block; }
  .gallery-card img { transition: transform var(--dur-base) var(--ease-standard); }
  .gallery-card:hover img { transform: scale(1.05); }
  .gallery-card__overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(11,31,20,0.7), transparent 50%); display: flex; align-items: flex-end; padding: var(--sp-2xs); opacity: 0; transition: opacity var(--dur-fast) var(--ease-standard); }
  .gallery-card:hover .gallery-card__overlay { opacity: 1; }
  .gallery-card__caption { color: var(--color-summit-white); font-size: var(--fs-xs); }
`);

export function galleryCard(item) {
  return `
    <a href="/gallery/${item.slug}" class="gallery-card">
      ${lazyImage({ src: item.thumbnailUrl, alt: item.caption || '', aspect: 'square' })}
      ${item.caption ? `<div class="gallery-card__overlay"><span class="gallery-card__caption">${item.caption}</span></div>` : ''}
    </a>`;
}
