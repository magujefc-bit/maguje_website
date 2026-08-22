import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';
import { playerCard } from './player-card.js';

injectStyle('team-card', `
  .team-card { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2xs); text-align: center; background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); }
  .team-card__crest { width: 56px; height: 56px; }
  .team-card__name { font-size: var(--fs-sm); font-weight: 600; }
  .team-header { display: flex; align-items: center; gap: var(--sp-md); padding-block: var(--sp-lg); }
  .team-header__crest { width: 72px; height: 72px; flex-shrink: 0; }
  .team-header__name { font-size: var(--fs-2xl); color: var(--color-ridge-green); }
  .position-group { margin-bottom: var(--sp-lg); }
  .position-group__title { font-family: var(--font-mono); font-size: var(--fs-sm); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-trophy-gold); margin-bottom: var(--sp-sm); padding-bottom: var(--sp-2xs); border-bottom: 1px solid var(--color-line); }
  .team-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-sm); }
  .team-stats__item { background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); text-align: center; }
  .team-stats__value { font-family: var(--font-display); font-size: var(--fs-xl); color: var(--color-ridge-green); }
  .team-stats__label { font-size: var(--fs-xs); color: rgba(16,36,26,0.6); text-transform: uppercase; }
  @media (min-width: 768px) { .team-stats { grid-template-columns: repeat(4, 1fr); } }
`);

export function teamCard(team) {
  return `<a href="/team" class="team-card"><div class="team-card__crest">${lazyImage({ src: team.crestUrl, alt: team.name, aspect: 'square' })}</div><span class="team-card__name">${team.name}</span></a>`;
}

export function teamHeader(team) {
  return `<div class="team-header"><div class="team-header__crest">${lazyImage({ src: team.crestUrl, alt: team.name, aspect: 'square' })}</div><h1 class="team-header__name">${team.name}</h1></div>`;
}

export function positionGroup(group) {
  return `<div class="position-group"><h2 class="position-group__title">${group.position}</h2><div class="grid grid--4">${group.players.map(p => playerCard(p)).join('')}</div></div>`;
}

export function teamStatistics(stats) {
  const items = [{ label: 'Played', value: stats.played }, { label: 'Wins', value: stats.wins }, { label: 'Draws', value: stats.draws }, { label: 'Losses', value: stats.losses }];
  return `<div class="team-stats">${items.map(i => `<div class="team-stats__item"><div class="team-stats__value">${i.value ?? 0}</div><div class="team-stats__label">${i.label}</div></div>`).join('')}</div>`;
}
