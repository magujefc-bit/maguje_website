import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { competitionCard } from '../components/competition-card.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('competitions-view', `
  .competitions-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .competitions-title { font-size: var(--fs-2xl); }
  .competitions-grid { padding-bottom: var(--sp-2xl); }
`);

export async function competitionsView() {
  await viewContainer.render(`
    <div class="container">
      <div class="competitions-header"><h1 class="competitions-title">Competitions</h1></div>
      <div class="grid grid--3 competitions-grid" data-slot="grid">${'<div class="card" style="height:180px;"><div class="skel skel-block" style="height:100%"></div></div>'.repeat(3)}</div>
    </div>`);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="grid"]');

  try {
    const { data, error } = await supabase.from('competitions').select('slug, name, season').order('season', { ascending: false });
    if (error) throw error;
    if (!data.length) { slot.innerHTML = states.empty({ message: 'No competitions listed yet.' }); return { cleanup: null }; }
    slot.innerHTML = data.map(c => competitionCard({ slug: c.slug, name: c.name, season: c.season })).join('');
  } catch (err) {
    console.error('[competitions] load failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, async () => { await competitionsView(); });
  }
  return { cleanup: null };
}
