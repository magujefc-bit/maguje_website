import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('standings-table', `
  .standings-table { width: 100%; border-collapse: collapse; }
  .standings-table th { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.04em; color: rgba(16,36,26,0.5); padding: var(--sp-2xs); text-align: center; border-bottom: 1px solid var(--color-line); }
  .standings-table th:first-child, .standings-table th:nth-child(2) { text-align: left; }
  .standings-table td { padding: var(--sp-2xs); text-align: center; font-size: var(--fs-sm); border-bottom: 1px solid var(--color-line); }
  .standings-row__team { display: flex; align-items: center; gap: var(--sp-2xs); text-align: left; }
  .standings-row__crest { width: 20px; height: 20px; flex-shrink: 0; }
  .standings-row__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  .standings-row--highlight { background: rgba(31,107,58,0.06); }
  .standings-row__points { font-weight: 700; color: var(--color-ridge-green); }
  .standings-row__pos { font-family: var(--font-mono); color: rgba(16,36,26,0.5); }
`);

export function standingsTable(rows, { highlightTeamId = null } = {}) {
  return `<table class="standings-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead><tbody>${rows.map(r => standingsRow(r, r.teamId === highlightTeamId)).join('')}</tbody></table>`;
}

function standingsRow(r, highlight) {
  return `
    <tr class="${highlight ? 'standings-row--highlight' : ''}">
      <td class="standings-row__pos">${r.position}</td>
      <td><div class="standings-row__team"><div class="standings-row__crest">${lazyImage({ src: r.crestUrl, alt: r.teamName, aspect: 'square' })}</div><span class="standings-row__name">${r.teamName}</span></div></td>
      <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
      <td class="standings-row__points">${r.points}</td>
    </tr>`;
}
