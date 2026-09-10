import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { fetchCompetition, competitionHeaderBlock, competitionSubNav, notFoundBlock } from './competition-shared.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { bindShareBar } from '../components/controls.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('competition-details-view', `
  .competition-overview-section { margin-bottom: var(--sp-lg); }
  .competition-overview-section__title { font-size: var(--fs-lg); margin-bottom: var(--sp-sm); }
  .competition-about { display: flex; flex-wrap: wrap; gap: var(--sp-xs) var(--sp-lg); font-size: var(--fs-sm); color: rgba(16,36,26,0.7); }
  .competition-about__item strong { color: var(--color-ink); font-weight: 600; }
  .competition-stats-grid { display: flex; flex-direction: column; gap: var(--sp-sm); }
  .competition-stats-row { display: grid; gap: var(--sp-sm); }
  .competition-stats-row--3 { grid-template-columns: repeat(3, 1fr); }
  .competition-stats-row--2 { grid-template-columns: repeat(2, 1fr); }
  .competition-stat { background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); text-align: center; }
  .competition-stat__value { font-family: var(--font-mono); font-size: var(--fs-xl); font-weight: 700; color: var(--color-ridge-green); }
  .competition-stat__label { font-size: var(--fs-xs); color: rgba(16,36,26,0.6); text-transform: uppercase; }
`);

export async function competitionDetailsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(`<div class="container"><div class="skel skel-block" style="height:100px; margin-bottom:var(--sp-lg);"></div><div class="skel skel-block" style="height:300px;"></div></div>`);
  const root = document.querySelector('#app');

  try {
    const comp = await fetchCompetition(slug);
    if (!comp) { await viewContainer.render(notFoundBlock('/competitions', 'Back to Competitions')); return { cleanup: null }; }

    const aboutSectionHtml = `
      <div class="competition-overview-section">
        <h2 class="competition-overview-section__title">About</h2>
        <div class="competition-about">
          <span class="competition-about__item"><strong>Season:</strong> ${comp.season || '—'}</span>
          <span class="competition-about__item"><strong>Starts:</strong> ${comp.start_date || '—'}</span>
          <span class="competition-about__item"><strong>Ends:</strong> ${comp.end_date || '—'}</span>
        </div>
      </div>
    `;

    const statsSectionHtml = `
      <div class="competition-overview-section">
        <h2 class="competition-overview-section__title">Match Stats</h2>
        <div class="competition-stats-grid" data-slot="stats">${skeletonStats()}</div>
      </div>
    `;

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, 'overview', comp.type)}
        ${aboutSectionHtml}
        ${statsSectionHtml}
      </div>`);

    observeLazyImages(root);
    bindShareBar(root);
    loadMatchStats(root, comp.id);
  } catch (err) {
    console.error('[competition-details] load failed:', err);
    viewContainer.renderError('Could not load this competition.', () => competitionDetailsView(params));
  }
  return { cleanup: null };
}

function skeletonStats() {
  return `
    <div class="competition-stats-row competition-stats-row--3">${Array(3).fill('<div class="skel skel-block" style="height:64px;"></div>').join('')}</div>
    <div class="competition-stats-row competition-stats-row--2">${Array(2).fill('<div class="skel skel-block" style="height:64px;"></div>').join('')}</div>
  `;
}

async function loadMatchStats(root, competitionId) {
  const slot = root.querySelector('[data-slot="stats"]');
  try {
    const base = () => supabase.from('matches').select('id', { count: 'exact', head: true }).eq('competition_id', competitionId).eq('is_internal', true);

    const [{ count: total }, { count: scheduled }, { count: played }, { count: postponed }, { count: cancelled }] = await Promise.all([
      base(),
      base().eq('status', 'scheduled'),
      base().eq('status', 'completed'),
      base().eq('status', 'postponed'),
      base().eq('status', 'cancelled'),
    ]);

    const stat = (label, value) => `
      <div class="competition-stat">
        <div class="competition-stat__value">${value || 0}</div>
        <div class="competition-stat__label">${label}</div>
      </div>
    `;

    slot.innerHTML = `
      <div class="competition-stats-row competition-stats-row--3">
        ${stat('Total Matches', total)}
        ${stat('Scheduled', scheduled)}
        ${stat('Played', played)}
      </div>
      <div class="competition-stats-row competition-stats-row--2">
        ${stat('Postponed', postponed)}
        ${stat('Cancelled', cancelled)}
      </div>
    `;
  } catch (err) {
    console.error('[competition-details] match stats failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, () => loadMatchStats(root, competitionId));
  }
}