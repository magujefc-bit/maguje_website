import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('match-card', `
  .match-card { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--sp-sm); padding: var(--sp-sm); background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); transition: border-color var(--dur-fast) var(--ease-standard); }
  .match-card:hover { border-color: var(--color-ridge-green); }
  .match-card__team { display: flex; flex-direction: column; align-items: center; gap: var(--sp-3xs); text-align: center; min-width: 0; }
  .match-card__crest-wrap { width: 40px; height: 40px; }
  .match-card__team-name { font-size: var(--fs-xs); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .match-card__center { display: flex; flex-direction: column; align-items: center; gap: var(--sp-3xs); }
  .match-card__score { font-family: var(--font-mono); font-size: var(--fs-md); font-weight: 600; }
  .match-card__vs { font-family: var(--font-mono); font-size: var(--fs-sm); color: rgba(16,36,26,0.5); }
  .match-card__meta { font-size: var(--fs-xs); color: rgba(16,36,26,0.6); white-space: nowrap; }
  .match-card__live-badge { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: var(--fs-xs); font-weight: 600; color: var(--color-live); text-transform: uppercase; }
  .match-card__live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-live); animation: match-card-pulse 1.2s ease-in-out infinite; }
  @keyframes match-card-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  @media (prefers-reduced-motion: reduce) { .match-card__live-dot { animation: none; } }
`);

export function matchCard(match) {
  const status = match.status || 'scheduled';
  const isLive = status === 'live';
  const isFinished = status === 'completed' || status === 'finished';
  const centerContent = isLive || isFinished ? `<div class="match-card__score">${match.homeScore ?? 0} – ${match.awayScore ?? 0}</div>` : `<div class="match-card__vs">VS</div>`;
  const metaLine = isLive ? `<span class="match-card__live-badge"><span class="match-card__live-dot"></span>Live</span>` : `<span class="match-card__meta">${formatKickoff(match.kickoffAt)}</span>`;
  const homeSlug = match.slug ? `/matches/${match.slug}` : '#';

  return `
    <a href="${homeSlug}" class="match-card">
      <div class="match-card__team">
        <div class="match-card__crest-wrap">${lazyImage({ src: match.homeTeam.crestUrl, alt: match.homeTeam.name, aspect: 'square' })}</div>
        <span class="match-card__team-name">${match.homeTeam.shortName || match.homeTeam.name}</span>
      </div>
      <div class="match-card__center">${centerContent}${metaLine}</div>
      <div class="match-card__team">
        <div class="match-card__crest-wrap">${lazyImage({ src: match.awayTeam.crestUrl, alt: match.awayTeam.name, aspect: 'square' })}</div>
        <span class="match-card__team-name">${match.awayTeam.shortName || match.awayTeam.name}</span>
      </div>
    </a>`;
}

function formatKickoff(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
}
