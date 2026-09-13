import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { aboutHeader } from './club-shared.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { officialsGrid } from '../components/club-identity.js';
import { OFFICIAL_ROLES } from '../utils/official-roles.js';

export async function clubOfficialsView() {
  await viewContainer.render(`
    <div class="container">

      ${aboutHeader('Club Officials')}

      <div
        style="padding-bottom: var(--sp-2xl);"
        data-slot="content"
      >
        <div class="grid grid--4">${'<div class="skel skel-block" style="aspect-ratio:1/1;"></div>'.repeat(4)}</div>
      </div>

    </div>
  `);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="content"]');

  try {
    const { data, error } = await supabase
      .from('officials')
      .select('slug, full_name, official_role, photo_url, bio')
      .eq('is_active', true);

    if (error) throw error;

    if (!data.length) {
      slot.innerHTML = states.empty({
        message: 'Officials list coming soon.'
      });

      return { cleanup: null };
    }

    // Sort by the canonical role order (Patron, Team Manager, Head
    // Coach, ...), then alphabetically by name within each role.
    // Any official whose role isn't in the canonical list (or has
    // no role set) sorts to the end, after everyone with a
    // recognized role — rather than disappearing or sorting first.
    const sorted = [...data].sort((a, b) => {
      const rankA = OFFICIAL_ROLES.indexOf(a.official_role);
      const rankB = OFFICIAL_ROLES.indexOf(b.official_role);
      const orderA = rankA === -1 ? OFFICIAL_ROLES.length : rankA;
      const orderB = rankB === -1 ? OFFICIAL_ROLES.length : rankB;
      if (orderA !== orderB) return orderA - orderB;
      return a.full_name.localeCompare(b.full_name);
    });

    slot.innerHTML = officialsGrid(
      sorted.map((o) => ({
        slug: o.slug,
        name: o.full_name,
        role: o.official_role,
        photoUrl: o.photo_url,
        bio: o.bio,
      }))
    );

    observeLazyImages(slot);

  } catch (err) {
    console.error('[club-officials] load failed:', err);
    slot.innerHTML = states.error();
  }

  return { cleanup: null };
}