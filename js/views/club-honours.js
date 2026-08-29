import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { clubRecordsSubNav, aboutHeader } from './club-shared.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('club-honours-view', `
  .honour-row { display: flex; align-items: center; gap: var(--sp-sm); padding: var(--sp-sm); background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); margin-bottom: var(--sp-sm); }
  .honour-row__season { font-family: var(--font-display); font-size: var(--fs-lg); color: var(--color-trophy-gold); min-width: 5em; }
  .honour-row__title { font-size: var(--fs-md); }
  .honour-row__meta { font-size: var(--fs-xs); color: rgba(16,36,26,0.5); text-transform: uppercase; }
`);

export async function clubHonoursView() {
  await viewContainer.render(`
    <div class="container">
      ${aboutHeader('Club All-Time Records')}
      ${clubRecordsSubNav('honours')}
      <div style="padding-bottom: var(--sp-2xl);" data-slot="content"><div class="skel skel-block" style="height:200px;"></div></div>
    </div>`);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="content"]');

  try {
    const { data, error } = await supabase.from('club_honours').select('title, category, season, description').order('season', { ascending: false });
    if (error) throw error;
    if (!data.length) { slot.innerHTML = states.empty({ message: 'No honours recorded yet.' }); return { cleanup: null }; }
    slot.innerHTML = data.map(h => `<div class="honour-row"><div class="honour-row__season">${h.season || ''}</div><div><div class="honour-row__title">${h.title}</div>${h.category ? `<div class="honour-row__meta">${h.category}</div>` : ''}</div></div>`).join('');
  } catch (err) {
    console.error('[club-honours] load failed:', err);
    slot.innerHTML = states.error();
  }
  return { cleanup: null };
}
