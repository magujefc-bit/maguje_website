import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { clubProfileSubNav, aboutHeader } from './club-shared.js';

export async function clubHistoryView() {
  await viewContainer.render(`
    <div class="container">
      ${aboutHeader('Club History')}
      ${clubProfileSubNav('history')}
      <div style="padding-bottom: var(--sp-2xl); max-width: 68ch;" data-slot="content"><div class="skel skel-block" style="height:200px;"></div></div>
    </div>`);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="content"]');

  try {
    const { data, error } = await supabase.from('club_profile').select('history').eq('id', 1).maybeSingle();
    if (error) throw error;
    slot.innerHTML = data?.history ? `<div class="article-content">${data.history}</div>` : states.empty({ message: 'Club history coming soon.' });
  } catch (err) {
    console.error('[club-history] load failed:', err);
    slot.innerHTML = states.error();
  }
  return { cleanup: null };
}
