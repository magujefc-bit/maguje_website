import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('news-card', `
  .news-card { display: flex; flex-direction: column; background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); overflow: hidden; transition: transform var(--dur-fast) var(--ease-standard); }
  .news-card:hover { transform: translateY(-2px); }
  .news-card__image { position: relative; aspect-ratio: 16/9; }
  .news-card__image-overlay { position: absolute; inset: 0; pointer-events: none; }
  .news-card__body { padding: var(--sp-sm); display: flex; flex-direction: column; gap: var(--sp-3xs); }
  .news-card__eyebrow { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-ridge-green); }
  .news-card__title { font-size: var(--fs-md); line-height: var(--lh-snug); }
  .news-card__excerpt { font-size: var(--fs-sm); color: rgba(16,36,26,0.7); }
  .news-card--featured .news-card__image { aspect-ratio: 16/9; }
  .news-card--featured .news-card__title { font-size: var(--fs-lg); }
  .news-card--compact .news-card__body { padding: var(--sp-xs); }
  .news-card--compact .news-card__title { font-size: var(--fs-sm); }
  .news-card--compact .news-card__excerpt { display: none; }
`);

export function newsCard(post, { variant = 'default', basePath = '/news', badge = null } = {}) {
  const variantClass = variant !== 'default' ? `news-card--${variant}` : '';
  const showExcerpt = variant !== 'compact';
  const eyebrow = badge ? `${badge} · ${formatDate(post.publishedAt)}` : formatDate(post.publishedAt);
  return `
    <a href="${basePath}/${post.slug}" class="news-card ${variantClass}">
      <div class="news-card__image">${lazyImage({ src: post.coverImageUrl, alt: post.title, aspect: 'video' })}${post.overlayGradient ? `<div class="news-card__image-overlay" style="background:${post.overlayGradient};"></div>` : ''}</div>
      <div class="news-card__body">
        <span class="news-card__eyebrow">${eyebrow}</span>
        <h3 class="news-card__title">${post.title}</h3>
        ${showExcerpt && post.excerpt ? `<p class="news-card__excerpt">${post.excerpt}</p>` : ''}
      </div>
    </a>`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
