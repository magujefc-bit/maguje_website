import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { articleHeader, articleContent, articleHeroImage } from '../components/article.js';
import { shareBar, bindShareBar } from '../components/controls.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { fetchFirstMedia } from './home.js';
import { fetchOverlayGradients } from '../utils/overlay.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('event-details-view', `
  .event-details-meta { display: flex; flex-wrap: wrap; gap: var(--sp-md); padding-block: var(--sp-sm) var(--sp-lg); border-bottom: 1px solid var(--color-line); margin-bottom: var(--sp-lg); }
  .event-details-meta__item { display: flex; flex-direction: column; gap: 2px; }
  .event-details-meta__label { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.5); }
  .event-details-meta__value { font-size: var(--fs-md); font-weight: 600; }
`);

export async function eventDetailsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.article());
  const root = document.querySelector('#app');

  try {
    const { data: post, error } = await supabase.from('event_posts').select('id, slug, title, body, location, event_date, event_time, cover_overlay_id').eq('slug', slug).maybeSingle();
    if (error) throw error;

    if (!post) {
      await viewContainer.render(`<div class="container section" style="text-align:center;"><h1 class="text-display-xl">Event not found</h1><a href="/events" class="btn btn--primary" style="margin-top: var(--sp-md);">Back to Events</a></div>`);
      return { cleanup: null };
    }

    const cover = await fetchFirstMedia('event', post.id);
    const overlayMap = await fetchOverlayGradients(supabase, [post.cover_overlay_id]);
    const overlayGradient = overlayMap.get(post.cover_overlay_id) || null;
    const url = window.location.origin + '/events/' + post.slug;

    await viewContainer.render(`
      <div class="container section--tight" style="max-width: 780px;">
        ${articleHeader({ eyebrow: 'Club Event', title: post.title })}
        <div class="event-details-meta">
          ${post.event_date ? `<div class="event-details-meta__item"><span class="event-details-meta__label">Date</span><span class="event-details-meta__value">${formatDate(post.event_date)}</span></div>` : ''}
          ${post.event_time ? `<div class="event-details-meta__item"><span class="event-details-meta__label">Time</span><span class="event-details-meta__value">${post.event_time}</span></div>` : ''}
          ${post.location ? `<div class="event-details-meta__item"><span class="event-details-meta__label">Location</span><span class="event-details-meta__value">${post.location}</span></div>` : ''}
        </div>
        ${cover ? articleHeroImage(cover, post.title, overlayGradient) : ''}
        ${articleContent(post.body || '')}
        <div style="padding-block: var(--sp-md); border-top: 1px solid var(--color-line); margin-top: var(--sp-lg);">${shareBar(url, post.title)}</div>
      </div>`);
    observeLazyImages(root);
    bindShareBar(root);
    return { cleanup: null };
  } catch (err) {
    console.error('[event-details] load failed:', err);
    viewContainer.renderError('Could not load this event.', () => eventDetailsView(params));
    return { cleanup: null };
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
