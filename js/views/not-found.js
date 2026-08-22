import { viewContainer } from '../view-container.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('not-found-view', `
  .not-found { text-align: center; padding-block: var(--sp-2xl); }
  .not-found__code { font-family: var(--font-display); font-size: clamp(4rem, 15vw, 8rem); color: var(--color-ridge-green); line-height: 1; }
  .not-found__title { font-size: var(--fs-xl); margin-block: var(--sp-sm); }
  .not-found__body { color: rgba(16,36,26,0.6); margin-bottom: var(--sp-lg); }
`);

export async function notFoundView() {
  await viewContainer.render(`
    <div class="container">
      <div class="not-found">
        <div class="not-found__code">404</div>
        <h1 class="not-found__title">Page not found</h1>
        <p class="not-found__body">The page you're looking for doesn't exist or may have moved.</p>
        <a href="/" class="btn btn--primary">Back to Home</a>
      </div>
    </div>`);
  return { cleanup: null };
}
