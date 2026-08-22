import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { lazyImage, observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('h2h-index-view', `
  .h2h-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .h2h-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-2xs); }
  .h2h-subtitle { color: rgba(16,36,26,0.6); }
  .h2h-list { display: flex; flex-direction: column; gap: var(--sp-sm); padding-bottom: var(--sp-2xl); }
  .h2h-row { display: flex; align-items: center; gap: var(--sp-sm); background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); transition: border-color var(--dur-fast) var(--ease-standard); }
  .h2h-row:hover { border-color: var(--color-ridge-green); }
  .h2h-row__crest { width: 40px; height: 40px; flex-shrink: 0; }
  .h2h-row__name { font-weight: 600; flex: 1; }
  .h2h-row__record { font-family: var(--font-mono); font-size: var(--fs-sm); color: rgba(16,36,26,0.7); white-space: nowrap; }
  .h2h-row__record strong { color: var(--color-ridge-green); }
`);

export async function headToHeadIndexView() {
  await viewContainer.render(`
    <div class="container">
      <div class="h2h-header">
        <h1 class="h2h-title">Head to Head</h1>
        <p class="h2h-subtitle">Maguje FC's record against every opponent faced.</p>
      </div>
      <div class="h2h-list" data-slot="list">
        <div class="skel skel-block" style="height:60px;margin-bottom:var(--sp-sm);"></div>
        <div class="skel skel-block" style="height:60px;margin-bottom:var(--sp-sm);"></div>
        <div class="skel skel-block" style="height:60px;"></div>
      </div>
    </div>`);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="list"]');

  try {
    const { data, error } = await supabase.from('v_head_to_head').select('opponent_team_id, opponent_name, opponent_crest, played, wins, draws, losses').order('played', { ascending: false });
    if (error) throw error;

    if (!data.length) { slot.innerHTML = states.empty({ message: 'No completed matches recorded yet.' }); return { cleanup: null }; }

    slot.innerHTML = data.map(row => `
      <a href="/team/head-to-head/${row.opponent_team_id}" class="h2h-row">
        <div class="h2h-row__crest">${lazyImage({ src: row.opponent_crest, alt: row.opponent_name, aspect: 'square' })}</div>
        <span class="h2h-row__name">${row.opponent_name}</span>
        <span class="h2h-row__record"><strong>${row.wins}W</strong> ${row.draws}D ${row.losses}L <span style="color:rgba(16,36,26,0.4);">(${row.played} played)</span></span>
      </a>
    `).join('');
    observeLazyImages(slot);
  } catch (err) {
    console.error('[head-to-head-index] load failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, async () => { await headToHeadIndexView(); });
  }
  return { cleanup: null };
}
