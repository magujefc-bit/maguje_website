import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { states } from '../components/states.js';
import { newsCard } from '../components/news-card.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';
import { fetchFirstMedia, excerptFrom } from './home.js';
import { fetchOverlayGradients } from '../utils/overlay.js';

injectStyle('match-reports-view', `
  .match-reports-view-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .match-reports-view-title { font-size: var(--fs-2xl); }
  .match-reports-view-grid { padding-bottom: var(--sp-lg); }
`);

const PAGE_SIZE = 9;

export async function matchReportsView() {
  let allPosts = [];
  let visibleCount = PAGE_SIZE;

  await viewContainer.render(`
    <div class="container">
      <div class="match-reports-view-header"><h1 class="match-reports-view-title">Match Reports</h1></div>
      <div class="grid grid--3 match-reports-view-grid" data-slot="grid">${skeletons.newsList(6)}</div>
      <div data-slot="load-more"></div>
    </div>`);

  const root = document.querySelector('#app');
  await loadReports(root);
  return { cleanup: null };

  async function loadReports(root) {
    const gridSlot = root.querySelector('[data-slot="grid"]');
    try {
      const { data, error } = await supabase.from('match_report_posts').select('id, slug, title, body, created_at, cover_overlay_id').order('created_at', { ascending: false });
      if (error) throw error;
      allPosts = data;
      await renderGrid(root);
    } catch (err) {
      console.error('[match-reports] load failed:', err);
      gridSlot.innerHTML = states.error();
      states.bindRetry(gridSlot, () => loadReports(root));
    }
  }

  async function renderGrid(root) {
    const gridSlot = root.querySelector('[data-slot="grid"]');
    const loadMoreSlot = root.querySelector('[data-slot="load-more"]');
    if (!allPosts.length) { gridSlot.innerHTML = states.empty({ message: 'No match reports posted yet.' }); loadMoreSlot.innerHTML = ''; return; }
    const visible = allPosts.slice(0, visibleCount);
    const overlayMap = await fetchOverlayGradients(supabase, visible.map(p => p.cover_overlay_id));
    const cards = await Promise.all(visible.map(async p => {
      const cover = await fetchFirstMedia('match_report', p.id);
      return newsCard({ slug: p.slug, title: p.title, excerpt: excerptFrom(p.body), coverImageUrl: cover, publishedAt: p.created_at, overlayGradient: overlayMap.get(p.cover_overlay_id) || null }, { basePath: '/match-reports', badge: 'Match Report' });
    }));
    gridSlot.innerHTML = cards.join('');
    observeLazyImages(gridSlot);
    if (allPosts.length > visibleCount) {
      loadMoreSlot.innerHTML = `<div class="flex justify-center" style="padding-block: var(--sp-md) var(--sp-2xl);"><button type="button" class="btn btn--secondary" data-load-more>Load more reports</button></div>`;
      loadMoreSlot.querySelector('[data-load-more]').addEventListener('click', () => { visibleCount += PAGE_SIZE; renderGrid(root); });
    } else { loadMoreSlot.innerHTML = ''; }
  }
}
