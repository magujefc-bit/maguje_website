import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('player-card', `
  .player-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-sm);
    transition: transform var(--dur-fast) var(--ease-standard);
  }

  .player-card:hover {
    transform: translateY(-2px);
  }

  .player-card__top {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
  }

  .player-card__image {
    position: relative;
    width: 88px;
    height: 88px;
    flex: 0 0 88px;
    border-radius: 50%;
    overflow: hidden;
  }

  .player-card__image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .player-card__number {
    position: absolute;
    top: var(--sp-3xs);
    left: var(--sp-3xs);
    z-index: 1;

    font-family: var(--font-display);
    font-size: var(--fs-xs);
    color: var(--color-summit-white);
    background: var(--color-pitch-shadow);

    width: 28px;
    height: 28px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: var(--radius-sm);
  }

  .player-card__identity {
    min-width: 0;
  }

  .player-card__name {
    font-size: var(--fs-md);
    font-weight: 700;
    line-height: var(--lh-tight);
  }

  .player-card__position {
    margin-top: var(--sp-3xs);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-ridge-green);
    text-transform: uppercase;
  }

  .player-card__bio {
    font-size: var(--fs-sm);
    line-height: var(--lh-normal);
    color: rgba(16, 36, 26, 0.72);
  }
`);

export function playerCard(player) {
  return `
    <a href="/team/players/${player.slug}" class="player-card">

      <div class="player-card__top">

        <div class="player-card__image">
          <span class="player-card__number">
            ${player.jerseyNumber ?? '–'}
          </span>

          ${lazyImage({
            src: player.photoUrl,
            alt: player.name,
            aspect: 'square'
          })}
        </div>

        <div class="player-card__identity">
          <div class="player-card__name">
            ${player.name}
          </div>

          <div class="player-card__position">
            ${player.position || ''}
          </div>
        </div>

      </div>

      ${
        player.bio
          ? `<p class="player-card__bio">${player.bio}</p>`
          : ''
      }

    </a>
  `;
}