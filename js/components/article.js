import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('article', `
  .article-header { padding-block: var(--sp-lg) var(--sp-md); }
  .article-header__eyebrow { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-ridge-green); margin-bottom: var(--sp-2xs); }
  .article-header__title { font-size: var(--fs-2xl); margin-bottom: var(--sp-sm); }
  .article-metadata { display: flex; flex-wrap: wrap; gap: var(--sp-sm); font-size: var(--fs-sm); color: rgba(16,36,26,0.6); padding-bottom: var(--sp-md); border-bottom: 1px solid var(--color-line); margin-bottom: var(--sp-lg); }
  .article-metadata__item { display: flex; align-items: center; gap: 4px; }
  .article-hero-image { position: relative; aspect-ratio: 16/9; border-radius: var(--radius-md); overflow: hidden; margin-bottom: var(--sp-lg); }
  .article-hero-image__overlay { position: absolute; inset: 0; pointer-events: none; }
  .article-content { font-size: var(--fs-md); line-height: var(--lh-normal); max-width: 68ch; }
  .article-content p { margin-bottom: var(--sp-md); }
  .article-content h2 { font-size: var(--fs-lg); margin: var(--sp-lg) 0 var(--sp-sm); }
  .article-content img { border-radius: var(--radius-md); margin-block: var(--sp-md); }
  .article-content blockquote { border-left: 3px solid var(--color-trophy-gold); padding-left: var(--sp-sm); font-style: italic; color: rgba(16,36,26,0.75); margin-block: var(--sp-md); }
  .related-news { margin-top: var(--sp-2xl); padding-top: var(--sp-lg); border-top: 1px solid var(--color-line); }
  .related-news__title { font-size: var(--fs-lg); margin-bottom: var(--sp-md); }
`);

export function articleHeader({ eyebrow, title }) {
  return `<div class="article-header">${eyebrow ? `<div class="article-header__eyebrow">${eyebrow}</div>` : ''}<h1 class="article-header__title">${title}</h1></div>`;
}

export function articleMetadata(meta) {
  const parts = [];
  if (meta.publishedAt) parts.push(formatDate(meta.publishedAt));
  if (meta.author) parts.push(meta.author);
  if (meta.readTime) parts.push(`${meta.readTime} min read`);
  return `<div class="article-metadata">${parts.map(p => `<span class="article-metadata__item">${p}</span>`).join('')}</div>`;
}

export function articleHeroImage(src, alt, overlayGradient) {
  return `<div class="article-hero-image">${lazyImage({ src, alt, aspect: 'video' })}${overlayGradient ? `<div class="article-hero-image__overlay" style="background:${overlayGradient};"></div>` : ''}</div>`;
}
export function articleContent(bodyHtml) { return `<div class="article-content">${bodyHtml}</div>`; }
export function relatedNewsSection(titleLabel, cardsHtml) { return `<div class="related-news"><h2 class="related-news__title">${titleLabel}</h2><div class="grid grid--3">${cardsHtml}</div></div>`; }

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}
