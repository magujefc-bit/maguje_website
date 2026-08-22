import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { articleHeader, articleMetadata, articleHeroImage, articleContent } from '../components/article.js';
import { shareBar, bindShareBar } from '../components/controls.js';
import { lazyImage, observeLazyImages } from '../components/lazy-image.js';
import { openLightbox } from '../components/lightbox.js';
import { injectStyle } from '../utils/inject-style.js';
import { fetchAllMedia } from './home.js';

injectStyle('match-report-details-view', `
  .match-report-details-share { padding-block: var(--sp-md); border-top: 1px solid var(--color-line); margin-top: var(--sp-lg); }
  .match-report-gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-sm); margin-block: var(--sp-lg); }
  .match-report-gallery__item { aspect-ratio: 4/3; border-radius: var(--radius-md); overflow: hidden; cursor: zoom-in; }
  .match-report-gallery__item img { width: 100%; height: 100%; object-fit: cover; display: block; }
`);

export async function matchReportDetailsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.article());
  const root = document.querySelector('#app');

  try {
    const { data: post, error } = await supabase.from('match_report_posts').select('id, slug, title, body, created_at').eq('slug', slug).maybeSingle();
    if (error) throw error;

    if (!post) {
      await viewContainer.render(`<div class="container section" style="text-align:center;"><h1 class="text-display-xl">Match report not found</h1><a href="/match-reports" class="btn btn--primary" style="margin-top: var(--sp-md);">Back to Match Reports</a></div>`);
      return { cleanup: null };
    }

    const images = await fetchAllMedia('match_report', post.id);
    const [cover, ...rest] = images;
    const url = window.location.origin + '/match-reports/' + post.slug;

    await viewContainer.render(`
      <div class="container section--tight" style="max-width: 780px;">
        ${articleHeader({ eyebrow: 'Match Report', title: post.title })}
        ${articleMetadata({ publishedAt: post.created_at })}
        ${cover ? articleHeroImage(cover, post.title) : ''}
        ${articleContent(post.body || '')}
        ${rest.length ? `<div class="match-report-gallery" data-slot="gallery">${rest.map((url, i) => `<div class="match-report-gallery__item" data-lightbox-index="${i + 1}">${lazyImage({ src: url, alt: post.title, aspect: '' })}</div>`).join('')}</div>` : ''}
        <div class="match-report-details-share">${shareBar(url, post.title)}</div>
        <div style="text-align:center;"><a href="/match-reports" class="btn btn--secondary" style="margin-top: var(--sp-md);">Back to Match Reports</a></div>
      </div>`);

    observeLazyImages(root);
    bindShareBar(root);

    const lightboxItems = images.map((fullUrl) => ({ fullUrl, caption: post.title }));
    root.querySelector('[data-slot="gallery"]')?.querySelectorAll('[data-lightbox-index]').forEach((el) => {
      el.addEventListener('click', () => openLightbox(lightboxItems, Number(el.dataset.lightboxIndex)));
    });

    return { cleanup: null };
  } catch (err) {
    console.error('[match-report-details] load failed:', err);
    viewContainer.renderError('Could not load this match report.', () => matchReportDetailsView(params));
    return { cleanup: null };
  }
}
