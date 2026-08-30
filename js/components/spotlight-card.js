import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('spotlight-card', `
  .spotlight-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-xs);
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-sm);
    min-width: 0;
    flex: 1 1 0;
    transition: transform var(--dur-fast) var(--ease-standard);
  }

  .spotlight-card:hover {
    transform: translateY(-2px);
  }

  .spotlight-card__badge {
    align-self: flex-start;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: var(--color-ridge-green);
    background: rgba(16,155,69,0.08);
    padding: 2px var(--sp-2xs);
    border-radius: 999px;
  }

  .spotlight-card__top {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
  }

  .spotlight-card__photo {
    width: 56px;
    height: 56px;
    flex: 0 0 56px;
    border-radius: 50%;
    overflow: hidden;
  }

  .spotlight-card__name {
    font-weight: 700;
    font-size: var(--fs-md);
    line-height: var(--lh-tight);
    min-width: 0;
  }

  .spotlight-card__stat {
    font-size: var(--fs-sm);
    color: rgba(16,36,26,0.72);
  }

  .spotlight-card__meta {
    font-size: var(--fs-xs);
    color: rgba(16,36,26,0.5);
  }

  .spotlight-row {
    display: flex;
    gap: var(--sp-sm);
    width: 100%;
    min-width: 0;
  }

  .spotlight-card--placeholder {
    align-items: center;
    justify-content: center;
    text-align: center;
    color: rgba(16,36,26,0.5);
    border-style: dashed;
  }

  .spotlight-card__placeholder-icon {
    font-size: var(--fs-xl);
    margin-bottom: var(--sp-2xs);
  }
`);

export function spotlightCard({
  label,
  playerName,
  photoUrl,
  playerSlug,
  statLine,
  meta,
}) {
  return `
    <a href="/players/${playerSlug}" class="spotlight-card">
      <span class="spotlight-card__badge">${label}</span>
      <div class="spotlight-card__top">
        <div class="spotlight-card__photo">
          ${lazyImage({ src: photoUrl, alt: playerName, aspect: 'square' })}
        </div>
        <div class="spotlight-card__name">${playerName}</div>
      </div>
      <div class="spotlight-card__stat">${statLine}</div>
      ${meta ? `<div class="spotlight-card__meta">${meta}</div>` : ''}
    </a>
  `;
}

export function spotlightPlaceholderCard(
  message = 'More player insights unlock after 3 matches — check back soon.',
) {
  return `
    <div class="spotlight-card spotlight-card--placeholder">
      <div class="spotlight-card__placeholder-icon">✨</div>
      <p>${message}</p>
    </div>
  `;
}