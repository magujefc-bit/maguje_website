import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('competition-card', `
  .competition-badge {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  .competition-badge--lg {
    width: 48px;
    height: 48px;
  }

  .competition-badge-placeholder {
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--color-line);
    color: rgba(16,36,26,0.5);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .competition-badge-placeholder--sm {
    width: 28px;
    height: 28px;
    flex-basis: 28px;
    font-size: 9px;
  }

  .competition-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-xs);
    text-align: center;
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-md);
    transition:
      border-color var(--dur-fast) var(--ease-standard);
  }

  .competition-card:hover {
    border-color: var(--color-ridge-green);
  }

  .competition-card__name {
    font-size: var(--fs-md);
  }

  .competition-card__season {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: rgba(16,36,26,0.6);
    text-transform: uppercase;
  }

  .competition-header {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
    padding-block: var(--sp-md);
    border-bottom: 1px solid var(--color-line);
  }

  .competition-header__name {
    font-size: var(--fs-xl);
  }

  .competition-header__meta {
    font-size: var(--fs-sm);
    color: rgba(16,36,26,0.6);
  }
`);

export function competitionBadge(comp, { size = 'default' } = {}) {
  const isLarge = size === 'lg';

  const sizeClass = isLarge
    ? 'competition-badge--lg'
    : '';

  /*
   * Competitions currently have no badge/logo column.
   *
   * Do NOT call lazyImage() when there is no image.
   * lazyImage() creates an aspect-ratio container, which was
   * causing the large empty block on mobile.
   */
  if (!comp?.badgeUrl) {
    return `
      <div
        class="competition-badge-placeholder ${
          isLarge ? '' : 'competition-badge-placeholder--sm'
        }"
        aria-hidden="true"
      >
        FC
      </div>
    `;
  }

  return lazyImage({
    src: comp.badgeUrl,
    alt: comp.name,
    aspect: 'square',
    className: `competition-badge ${sizeClass}`,
  });
}

export function competitionCard(comp) {
  return `
    <a href="/competitions/${comp.slug}" class="competition-card">
      ${competitionBadge(comp, { size: 'lg' })}

      <div>
        <div class="competition-card__name">
          ${comp.name}
        </div>

        <div class="competition-card__season">
          ${comp.season || ''}
        </div>
      </div>
    </a>
  `;
}

export function competitionHeader(comp) {
  return `
    <div class="competition-header">
      ${competitionBadge(comp, { size: 'lg' })}

      <div>
        <h1 class="competition-header__name">
          ${comp.name}
        </h1>

        <p class="competition-header__meta">
          ${comp.season || ''}
          ${comp.teamCount ? ` · ${comp.teamCount} teams` : ''}
        </p>
      </div>
    </div>
  `;
}