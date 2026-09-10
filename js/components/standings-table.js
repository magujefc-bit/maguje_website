import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('standings-table', `
  .standings-table-wrap {
    position: relative;
  }

  .standings-table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .standings-table-fade {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 28px;
    pointer-events: none;
    background: linear-gradient(to right, rgba(247,247,244,0), var(--color-summit-white));
    opacity: 1;
    transition: opacity var(--dur-base) var(--ease-standard);
  }

  .standings-table-fade--hidden {
    opacity: 0;
  }

  .standings-table {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
  }

  .standings-table th {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(16,36,26,0.5);
    padding: var(--sp-2xs) var(--sp-sm);
    text-align: center;
    border-bottom: 1px solid var(--color-line);
    white-space: nowrap;
  }

  .standings-table td {
    padding: var(--sp-2xs) var(--sp-sm);
    text-align: center;
    font-size: var(--fs-sm);
    border-bottom: 1px solid var(--color-line);
    white-space: nowrap;
  }

  .standings-table th:nth-child(1), .standings-table td:nth-child(1) {
    width: 36px;
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--color-summit-white);
  }

  .standings-table th:nth-child(2), .standings-table td:nth-child(2) {
    text-align: left;
    position: sticky;
    left: 36px;
    z-index: 1;
    background: var(--color-summit-white);
    box-shadow: 2px 0 4px rgba(11,31,20,0.06);
  }

  .standings-row--highlight td:nth-child(1), .standings-row--highlight td:nth-child(2) {
    background: #f0f5f1;
  }

  .standings-row__team {
    display: flex;
    align-items: center;
    gap: var(--sp-2xs);
  }

  .standings-row__crest {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .standings-row__name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    font-weight: 600;
  }

  .standings-row--highlight {
    background: rgba(31,107,58,0.06);
  }

  .standings-row__points {
    font-weight: 700;
    color: var(--color-ridge-green);
  }

  .standings-row__pos {
    font-family: var(--font-mono);
    color: rgba(16,36,26,0.5);
  }
`);

export function standingsTable(rows, { highlightTeamId = null } = {}) {
  return `
    <div class="standings-table-wrap" data-standings-wrap>
      <div class="standings-table-scroll" data-standings-scroll>
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>${rows.map(r => standingsRow(r, r.teamId === highlightTeamId)).join('')}</tbody>
        </table>
      </div>
      <div class="standings-table-fade" data-standings-fade></div>
    </div>
  `;
}

function standingsRow(r, highlight) {
  return `
    <tr class="${highlight ? 'standings-row--highlight' : ''}">
      <td class="standings-row__pos">${r.position}</td>
      <td><div class="standings-row__team"><div class="standings-row__crest">${lazyImage({ src: r.crestUrl, alt: r.teamName, aspect: 'square' })}</div><span class="standings-row__name">${r.teamName}</span></div></td>
      <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
      <td>${r.goalsFor ?? '—'}</td><td>${r.goalsAgainst ?? '—'}</td><td>${r.goalDifference ?? '—'}</td>
      <td class="standings-row__points">${r.points}</td>
    </tr>`;
}

// Call this once, after standingsTable()'s HTML has been inserted into the DOM,
// for every place standingsTable() is used. Handles the right-edge fade
// (hides once the user has scrolled all the way to the end) and a one-time
// "peek" nudge so the table visibly moves on first render, hinting that it scrolls.
export function bindStandingsScroll(container) {
  container.querySelectorAll('[data-standings-wrap]').forEach(wrap => {
    const scroller = wrap.querySelector('[data-standings-scroll]');
    const fade = wrap.querySelector('[data-standings-fade]');
    if (!scroller || !fade) return;

    const updateFade = () => {
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
      const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
      fade.classList.toggle('standings-table-fade--hidden', atEnd || !canScroll);
    };

    updateFade();
    scroller.addEventListener('scroll', updateFade, { passive: true });

    if (scroller.scrollWidth > scroller.clientWidth + 1) {
      requestAnimationFrame(() => {
        scroller.scrollTo({ left: 24, behavior: 'smooth' });
        setTimeout(() => scroller.scrollTo({ left: 0, behavior: 'smooth' }), 450);
      });
    }
  });
}