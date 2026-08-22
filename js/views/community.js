import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { states } from '../components/states.js';
import { newsCard } from '../components/news-card.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';
import { fetchFirstMedia, excerptFrom } from './home.js';

injectStyle('community-view', `
  .community-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .community-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-2xs); }
  .community-subtitle { color: rgba(16,36,26,0.6); }
  .community-grid { padding-bottom: var(--sp-2xl); }
`);

const PAGE_SIZE = 9;

export async function communityView() {
  let allActivities = [];
  let visibleCount = PAGE_SIZE;

  await viewContainer.render(`
    <div class="container">
      <div class="community-header"><h1 class="community-title">Community Activities</h1><p class="community-subtitle">Maguje FC in the community — outreach, clinics, and local partnerships.</p></div>
      <div class="grid grid--3 community-grid" data-slot="grid">${skeletons.newsList(6)}</div>
      <div data-slot="load-more"></div>
    </div>`);

  const root = document.querySelector('#app');
  await loadActivities(root);
  return { cleanup: null };

  async function loadActivities(root) {
    const gridSlot = root.querySelector('[data-slot="grid"]');
    try {
      const { data, error } = await supabase.from('activity_posts').select('id, slug, title, body, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      allActivities = data;
      await renderGrid(root);
    } catch (err) {
      console.error('[community] load failed:', err);
      gridSlot.innerHTML = states.error();
      states.bindRetry(gridSlot, () => loadActivities(root));
    }
  }

  async function renderGrid(root) {
    const gridSlot = root.querySelector('[data-slot="grid"]');
    const loadMoreSlot = root.querySelector('[data-slot="load-more"]');
    if (!allActivities.length) { gridSlot.innerHTML = states.empty({ message: 'No community activities posted yet.' }); loadMoreSlot.innerHTML = ''; return; }
    const visible = allActivities.slice(0, visibleCount);
    const cards = await Promise.all(visible.map(async a => {
      const cover = await fetchFirstMedia('activity', a.id);
      return newsCard({ slug: a.slug, title: a.title, excerpt: excerptFrom(a.body), coverImageUrl: cover, publishedAt: a.created_at });
    }));
    gridSlot.innerHTML = cards.join('');
    observeLazyImages(gridSlot);
    if (allActivities.length > visibleCount) {
      loadMoreSlot.innerHTML = `<div class="flex justify-center" style="padding-block: var(--sp-md) var(--sp-2xl);"><button type="button" class="btn btn--secondary" data-load-more>Load more</button></div>`;
      loadMoreSlot.querySelector('[data-load-more]').addEventListener('click', () => { visibleCount += PAGE_SIZE; renderGrid(root); });
    } else { loadMoreSlot.innerHTML = ''; }
  }
}
