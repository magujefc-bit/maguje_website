import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { openLightbox } from '../components/lightbox.js';
import { lazyImage, observeLazyImages } from '../components/lazy-image.js';
import { shareBar, bindShareBar } from '../components/controls.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('gallery-details-view', `
  .gallery-details { padding-block: var(--sp-lg) var(--sp-2xl); }
  .gallery-details__image-wrap { max-width: 800px; margin-inline: auto; border-radius: var(--radius-lg); overflow: hidden; cursor: zoom-in; }
  .gallery-details__back { display: inline-block; margin-top: var(--sp-md); }
`);

export async function galleryDetailsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(`<div class="container gallery-details"><div class="skel skel-block" style="max-width:800px; margin-inline:auto; aspect-ratio:4/3;"></div></div>`);
  const root = document.querySelector('#app');

  try {
    const { data: item, error } = await supabase.from('media_library').select('slug, url').eq('slug', slug).maybeSingle();
    if (error) throw error;

    if (!item) {
      await viewContainer.render(`<div class="container section" style="text-align:center;"><h1 class="text-display-xl">Photo not found</h1><a href="/gallery" class="btn btn--primary" style="margin-top: var(--sp-md);">Back to Gallery</a></div>`);
      return { cleanup: null };
    }

    const url = window.location.origin + '/gallery/' + item.slug;

    await viewContainer.render(`
      <div class="container gallery-details">
        <div class="gallery-details__image-wrap" data-lightbox-trigger>${lazyImage({ src: item.url, alt: '', aspect: '' })}</div>
        <div style="text-align:center; margin-top: var(--sp-md); display:flex; justify-content:center;">${shareBar(url, 'Photo — Maguje FC')}</div>
        <div style="text-align:center;"><a href="/gallery" class="btn btn--secondary gallery-details__back">Back to Gallery</a></div>
      </div>`);
    observeLazyImages(root);
    bindShareBar(root);
    root.querySelector('[data-lightbox-trigger]').addEventListener('click', () => openLightbox([{ fullUrl: item.url, caption: '' }], 0));
    return { cleanup: null };
  } catch (err) {
    console.error('[gallery-details] load failed:', err);
    viewContainer.renderError('Could not load this photo.', () => galleryDetailsView(params));
    return { cleanup: null };
  }
}
