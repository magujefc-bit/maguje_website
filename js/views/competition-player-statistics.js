import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { fetchCompetition, competitionHeaderBlock, competitionSubNav, notFoundBlock } from './competition-shared.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('competition-player-stats', `
  .player-stats-table { width: 100%; border-collapse: collapse; }
  .player-stats-table th { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.5); text-align: left; padding: var(--sp-2xs); border-bottom: 1px solid var(--color-line); }
  .player-stats-table td { padding: var(--sp-2xs); font-size: var(--fs-sm); border-bottom: 1px solid var(--color-line); }
  .player-stats-table td:first-child a { font-weight: 600; }
`);

export async function competitionPlayerStatisticsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(`<div class="container"><div class="skel skel-block" style="height:300px;"></div></div>`);
  const root = document.querySelector('#app');

  try {
    const comp = await fetchCompetition(slug);
    if (!comp) { await viewContainer.render(notFoundBlock('/competitions', 'Back to Competitions')); return { cleanup: null }; }

    // v_player_stats is a view — PostgREST embedding on views is unreliable,
    // so fetch stats and player names separately and merge in JS.
    const { data: statRows, error } = await supabase.from('v_player_stats').select('player_id, appearances, goals, assists').eq('competition_id', comp.id).order('goals', { ascending: false });
    if (error) throw error;

    if (!statRows.length) {
      await viewContainer.render(`<div class="container">${competitionHeaderBlock(comp)}${competitionSubNav(slug, 'player-statistics')}<div style="padding-bottom: var(--sp-2xl);">${states.empty({ message: 'No player statistics available yet.' })}</div></div>`);
      return { cleanup: null };
    }

    const playerIds = statRows.map(r => r.player_id);
    const { data: players } = await supabase.from('players').select('id, full_name, slug').in('id', playerIds);
    const playerMap = new Map((players || []).map(p => [p.id, p]));

    const rows = statRows.map(r => ({ ...r, player: playerMap.get(r.player_id) })).filter(r => r.player);

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, 'player-statistics')}
        <div style="padding-bottom: var(--sp-2xl);">${renderTable(rows)}</div>
      </div>`);
  } catch (err) {
    console.error('[competition-player-statistics] load failed:', err);
    viewContainer.renderError('Could not load player statistics.', () => competitionPlayerStatisticsView(params));
  }
  return { cleanup: null };
}

function renderTable(rows) {
  return `<table class="player-stats-table"><thead><tr><th>Player</th><th>Apps</th><th>Goals</th><th>Assists</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="/team/players/${r.player.slug}">${r.player.full_name}</a></td><td>${r.appearances ?? 0}</td><td>${r.goals ?? 0}</td><td>${r.assists ?? 0}</td></tr>`).join('')}</tbody></table>`;
}
