import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { standingsTable } from '../components/standings-table.js';
import { fetchCompetition, competitionHeaderBlock, competitionSubNav, notFoundBlock } from './competition-shared.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('competition-details-view', `
  .competition-overview-section { margin-bottom: var(--sp-lg); }
  .competition-overview-section__title { font-size: var(--fs-lg); margin-bottom: var(--sp-sm); }
`);

export async function competitionDetailsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(`<div class="container"><div class="skel skel-block" style="height:100px; margin-bottom:var(--sp-lg);"></div><div class="skel skel-block" style="height:300px;"></div></div>`);
  const root = document.querySelector('#app');

  try {
    const comp = await fetchCompetition(slug);
    if (!comp) { await viewContainer.render(notFoundBlock('/competitions', 'Back to Competitions')); return { cleanup: null }; }

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, 'overview')}
        <div class="competition-overview-section">
          <h2 class="competition-overview-section__title">Standings Preview</h2>
          <div data-slot="standings-preview"><div class="skel skel-block" style="height:200px;"></div></div>
        </div>
      </div>`);

    observeLazyImages(root);
    loadStandingsPreview(root, comp.id);
  } catch (err) {
    console.error('[competition-details] load failed:', err);
    viewContainer.renderError('Could not load this competition.', () => competitionDetailsView(params));
  }
  return { cleanup: null };
}

async function loadStandingsPreview(root, competitionId) {
  const slot = root.querySelector('[data-slot="standings-preview"]');
  try {
    const { data, error } = await supabase.from('v_standings').select('team_id, team_name, crest_url, played, won, drawn, lost, points, position').eq('competition_id', competitionId).order('position', { ascending: true }).limit(5);
    if (error) throw error;
    if (!data.length) { slot.innerHTML = states.empty({ message: 'Standings not available yet for this competition.' }); return; }
    slot.innerHTML = standingsTable(data.map(r => ({ position: r.position, teamId: r.team_id, teamName: r.team_name, crestUrl: r.crest_url, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.points })));
    observeLazyImages(slot);
  } catch (err) {
    console.error('[competition-details] standings preview failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, () => loadStandingsPreview(root, competitionId));
  }
}
