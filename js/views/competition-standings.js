import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { states } from '../components/states.js';
import { standingsTable } from '../components/standings-table.js';
import { fetchCompetition, competitionHeaderBlock, competitionSubNav, notFoundBlock } from './competition-shared.js';
import { observeLazyImages } from '../components/lazy-image.js';

export async function competitionStandingsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.standings(10));
  const root = document.querySelector('#app');

  try {
    const comp = await fetchCompetition(slug);
    if (!comp) { await viewContainer.render(notFoundBlock('/competitions', 'Back to Competitions')); return { cleanup: null }; }

    const { data, error } = await supabase.from('v_standings').select('team_id, team_name, crest_url, played, won, drawn, lost, points, position').eq('competition_id', comp.id).order('position', { ascending: true });
    if (error) throw error;

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, 'standings')}
        <div data-slot="table">${data.length ? standingsTable(data.map(r => ({ position: r.position, teamId: r.team_id, teamName: r.team_name, crestUrl: r.crest_url, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.points }))) : states.empty({ message: 'Standings not available yet.' })}</div>
      </div>`);
    observeLazyImages(root);
  } catch (err) {
    console.error('[competition-standings] load failed:', err);
    viewContainer.renderError('Could not load standings.', () => competitionStandingsView(params));
  }
  return { cleanup: null };
}
