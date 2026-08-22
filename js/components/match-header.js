import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';
import { liveIndicator } from './controls.js';

injectStyle('match-header', `
  .match-header { background: var(--color-pitch-shadow); border-radius: var(--radius-lg); padding: var(--sp-lg) var(--sp-md); color: var(--color-summit-white); }
  .match-header__competition { text-align: center; font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-trophy-gold); margin-bottom: var(--sp-sm); }
  .match-header__row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--sp-sm); }
  .match-header__team { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2xs); text-align: center; }
  .match-header__crest { width: clamp(48px, 8vw, 72px); height: auto; }
  .match-header__team-name { font-family: var(--font-display); font-size: var(--fs-md); }
  .match-header__center { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2xs); }
  .match-header__score { font-family: var(--font-mono); font-size: var(--fs-2xl); font-weight: 700; }
  .match-header__vs { font-family: var(--font-mono); font-size: var(--fs-lg); color: rgba(247,249,246,0.6); }
  .match-header__status { font-size: var(--fs-sm); color: rgba(247,249,246,0.75); }
  .match-header__meta { display: flex; justify-content: center; gap: var(--sp-md); margin-top: var(--sp-md); padding-top: var(--sp-md); border-top: 1px solid rgba(247,249,246,0.15); font-size: var(--fs-sm); color: rgba(247,249,246,0.7); flex-wrap: wrap; }
`);

export function matchHeader(match) {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'completed' || match.status === 'finished';
  const showScore = isLive || isFinished;
  const centerContent = showScore ? `<div class="match-header__score">${match.homeScore ?? 0} – ${match.awayScore ?? 0}</div>` : `<div class="match-header__vs">VS</div>`;
  const statusLine = isLive ? liveIndicator('Live') : `<span class="match-header__status">${isFinished ? 'Full Time' : formatKickoff(match.kickoffAt)}</span>`;
  return `
    <div class="match-header">
      <div class="match-header__competition">${match.competition?.name || ''}</div>
      <div class="match-header__row">
        <div class="match-header__team"><div class="match-header__crest">${lazyImage({ src: match.homeTeam.crestUrl, alt: match.homeTeam.name, aspect: 'square' })}</div><span class="match-header__team-name">${match.homeTeam.name}</span></div>
        <div class="match-header__center">${centerContent}${statusLine}</div>
        <div class="match-header__team"><div class="match-header__crest">${lazyImage({ src: match.awayTeam.crestUrl, alt: match.awayTeam.name, aspect: 'square' })}</div><span class="match-header__team-name">${match.awayTeam.name}</span></div>
      </div>
      <div class="match-header__meta">${match.venue ? `<span>${match.venue}</span>` : ''}${!isLive ? `<span>${formatKickoff(match.kickoffAt)}</span>` : ''}</div>
    </div>`;
}

function formatKickoff(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
}
