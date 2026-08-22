import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { articleHeader, articleMetadata, articleHeroImage, articleContent } from '../components/article.js';
import { shareBar, bindShareBar } from '../components/controls.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { fetchFirstMedia } from './home.js';

export async function activityDetailsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.article());
  const root = document.querySelector('#app');

  try {
    const { data: post, error } = await supabase.from('activity_posts').select('id, slug, title, body, created_at').eq('slug', slug).maybeSingle();
    if (error) throw error;

    if (!post) {
      await viewContainer.render(`<div class="container section" style="text-align:center;"><h1 class="text-display-xl">Activity not found</h1><a href="/community" class="btn btn--primary" style="margin-top: var(--sp-md);">Back to Community</a></div>`);
      return { cleanup: null };
    }

    const cover = await fetchFirstMedia('activity', post.id);
    const url = window.location.origin + '/community/' + post.slug;

    await viewContainer.render(`
      <div class="container section--tight" style="max-width: 780px;">
        ${articleHeader({ eyebrow: 'Community', title: post.title })}
        ${articleMetadata({ publishedAt: post.created_at })}
        ${cover ? articleHeroImage(cover, post.title) : ''}
        ${articleContent(post.body || '')}
        <div style="padding-block: var(--sp-md); border-top: 1px solid var(--color-line); margin-top: var(--sp-lg);">${shareBar(url, post.title)}</div>
      </div>`);
    observeLazyImages(root);
    bindShareBar(root);
    return { cleanup: null };
  } catch (err) {
    console.error('[activity-details] load failed:', err);
    viewContainer.renderError('Could not load this activity.', () => activityDetailsView(params));
    return { cleanup: null };
  }
}
