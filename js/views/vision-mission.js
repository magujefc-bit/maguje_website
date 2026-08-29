import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { visionMissionSection } from '../components/club-identity.js';
import { clubProfileSubNav, aboutHeader } from './club-shared.js';

export async function visionMissionView() {
  await viewContainer.render(`
    <div class="container">
      ${aboutHeader('Vision & Mission')}
      ${clubProfileSubNav('mission-vision')}
      <div style="padding-bottom: var(--sp-2xl);" data-slot="content"><div class="skel skel-block" style="height:200px;"></div></div>
    </div>`);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="content"]');

  try {
    const { data, error } = await supabase.from('club_profile').select('vision, mission').eq('id', 1).maybeSingle();
    if (error) throw error;
    slot.innerHTML = (data?.vision || data?.mission) ? visionMissionSection({ vision: data.vision || '', mission: data.mission || '' }) : states.empty({ message: 'Vision and mission coming soon.' });
  } catch (err) {
    console.error('[vision-mission] load failed:', err);
    slot.innerHTML = states.error();
  }
  return { cleanup: null };
}
