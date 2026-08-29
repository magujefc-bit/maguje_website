import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { injectStyle } from '../utils/inject-style.js';
import { aboutHeader, clubRecordsSubNav } from './club-shared.js';

injectStyle('club-all-time-stats-view', `
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: var(--sp-md);
    padding-bottom: var(--sp-2xl);
  }

  .stats-box {
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-md);
  }

  .stats-box__title {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-ridge-green);
    margin: 0 0 var(--sp-sm);
  }

  .stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-block: var(--sp-2xs);
    border-bottom: 1px solid var(--color-line);
    font-size: var(--fs-sm);
  }

  .stats-row:last-child {
    border-bottom: none;
  }

  .stats-row__name {
    color: var(--color-ink);
    font-weight: 600;
  }

  .stats-row__value {
    font-weight: 700;
    color: var(--color-ridge-green);
    white-space: nowrap;
  }
`);

export async function clubAllTimeStatsView() {
  await viewContainer.render(`
    <div class="container">
      ${aboutHeader('Club All-Time Records')}
      ${clubRecordsSubNav('all-time-stats')}

      <div class="stats-grid" data-slot="content">
        <div class="skel skel-block" style="height:200px;"></div>
      </div>
    </div>
  `);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="content"]');

  try {
    const { data: stats, error } = await supabase.from('v_player_stats').select('*');
    if (error) throw error;

    if (!stats?.length) {
      slot.innerHTML = states.empty({ message: 'Statistics will appear once matches are played.' });
      return { cleanup: null };
    }

    slot.innerHTML = `
      ${statsBox('Top Scorers', leaderboard(stats, 'goals'))}
      ${statsBox('Most Appearances', leaderboard(stats, 'appearances'))}
      ${statsBox('Most Assists', leaderboard(stats, 'assists'))}
      ${statsBox('Discipline', disciplineLeaderboard(stats))}
    `;
  } catch (err) {
    console.error('[club-all-time-stats] load failed:', err);
    slot.innerHTML = states.error();
  }

  return { cleanup: null };
}

function leaderboard(stats, field, limit = 5) {
  const sorted = [...stats]
    .filter((p) => p[field] > 0)
    .sort((a, b) => b[field] - a[field])
    .slice(0, limit);

  if (!sorted.length) {
    return `<div class="stats-row">No data yet.</div>`;
  }

  return sorted
    .map(
      (p) => `
        <div class="stats-row">
          <span class="stats-row__name">${playerLink(p)}</span>
          <span class="stats-row__value">${p[field]}</span>
        </div>
      `,
    )
    .join('');
}

function disciplineLeaderboard(stats, limit = 5) {
  const withCards = stats
    .map((p) => ({ ...p, totalCards: (p.yellow_cards || 0) + (p.red_cards || 0) }))
    .filter((p) => p.totalCards > 0)
    .sort((a, b) => b.totalCards - a.totalCards)
    .slice(0, limit);

  if (!withCards.length) {
    return `<div class="stats-row">No cards recorded yet.</div>`;
  }

  return withCards
    .map(
      (p) => `
        <div class="stats-row">
          <span class="stats-row__name">${playerLink(p)}</span>
          <span class="stats-row__value">🟨${p.yellow_cards} 🟥${p.red_cards}</span>
        </div>
      `,
    )
    .join('');
}

function playerLink(p) {
  const name = escapeHtml(p.player_name || 'Unknown player');
  return p.player_slug ? `<a href="/players/${p.player_slug}">${name}</a>` : name;
}

function statsBox(title, rowsHtml) {
  return `
    <div class="stats-box">
      <h3 class="stats-box__title">${title}</h3>
      ${rowsHtml}
    </div>
  `;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
