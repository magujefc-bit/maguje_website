import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { aboutHeader } from './club-shared.js';
import { observeLazyImages } from '../components/lazy-image.js';

export async function clubOfficialsView() {
  await viewContainer.render(`
    <div class="container">

      ${aboutHeader('Club Officials')}

      <div
        class="grid grid--4"
        style="padding-bottom: var(--sp-2xl);"
        data-slot="content"
      >
        ${'<div class="skel skel-block" style="aspect-ratio:1/1;"></div>'.repeat(4)}
      </div>

    </div>
  `);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="content"]');

  try {
    const { data, error } = await supabase
      .from('officials')
      .select('full_name, official_role, photo_url')
      .eq('is_active', true);

    if (error) throw error;

    if (!data.length) {
      slot.className = '';
      slot.innerHTML = states.empty({
        message: 'Officials list coming soon.'
      });

      return { cleanup: null };
    }

    slot.innerHTML = data.map(o => `
      <div class="official-card">

        <div class="official-card__photo">
          <img
            src="${o.photo_url || ''}"
            alt="${o.full_name}"
            loading="lazy"
            decoding="async"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
            "
          >
        </div>

        <span class="official-card__name">
          ${o.full_name}
        </span>

        <span class="official-card__role">
          ${o.official_role || ''}
        </span>

      </div>
    `).join('');

    observeLazyImages(slot);

  } catch (err) {
    console.error('[club-officials] load failed:', err);
    slot.innerHTML = states.error();
  }

  return { cleanup: null };
}