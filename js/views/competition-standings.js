import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { states } from '../components/states.js';
import { bindStandingsScroll } from '../components/standings-table.js';
import { fetchCompetition, fetchStandingsMarkup, competitionHeaderBlock, competitionSubNav, notFoundBlock } from './competition-shared.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { bindShareBar } from '../components/controls.js';

export async function competitionStandingsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.standings(10));
  const root = document.querySelector('#app');

  try {
    const comp = await fetchCompetition(slug);
    if (!comp) { await viewContainer.render(notFoundBlock('/competitions', 'Back to Competitions')); return { cleanup: null }; }

    if (comp.type === 'Friendly') {
      await viewContainer.render(`
        <div class="container">
          ${competitionHeaderBlock(comp)}
          ${competitionSubNav(slug, 'standings', comp.type)}
          <div data-slot="table">${states.empty({ message: 'Standings aren\u2019t tracked for friendly competitions.' })}</div>
        </div>`);
      bindShareBar(root);
      return { cleanup: null };
    }

    const tableHtml = await fetchStandingsMarkup(comp);

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, 'standings', comp.type)}
        <div data-slot="table">${tableHtml}</div>
      </div>`);
    observeLazyImages(root);
    bindShareBar(root);
    bindStandingsScroll(root);
  } catch (err) {
    console.error('[competition-standings] load failed:', err);
    viewContainer.renderError('Could not load standings.', () => competitionStandingsView(params));
  }
  return { cleanup: null };
}
