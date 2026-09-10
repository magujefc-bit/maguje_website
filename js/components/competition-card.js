import { injectStyle } from '../utils/inject-style.js';
import { shareBar } from './controls.js';

injectStyle('competition-card', `
  .competition-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-sm) var(--sp-md);
    transition: border-color var(--dur-fast) var(--ease-standard);
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
    padding-block: var(--sp-md);
    border-bottom: 1px solid var(--color-line);
  }

  .competition-header__name {
    font-size: var(--fs-lg);
  }

  .competition-header__meta {
    font-size: var(--fs-sm);
    color: rgba(16,36,26,0.6);
  }

  .competition-header .share-bar {
    margin-top: var(--sp-xs);
  }
`);

export function competitionCard(comp) {
  return `
    <a href="/competitions/${comp.slug}" class="competition-card">
      <div class="competition-card__name">
        ${comp.name}
      </div>

      <div class="competition-card__season">
        ${comp.season || ''}
      </div>
    </a>
  `;
}

export function competitionHeader(comp) {
  return `
    <div class="competition-header">
      <h1 class="competition-header__name">
        ${comp.name}
      </h1>

      <p class="competition-header__meta">
        ${comp.season || ''}
        ${comp.teamCount ? ` · ${comp.teamCount} teams` : ''}
      </p>

      ${comp.shareUrl ? shareBar(comp.shareUrl, comp.name) : ''}
    </div>
  `;
}