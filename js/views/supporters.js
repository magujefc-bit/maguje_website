import { viewContainer } from '../view-container.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('supporters-view', `
  .supporters-placeholder { text-align: center; padding-block: var(--sp-2xl); max-width: 60ch; margin-inline: auto; }
  .supporters-placeholder__badge { display: inline-block; font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-trophy-gold); border: 1px solid var(--color-trophy-gold); border-radius: 999px; padding: var(--sp-3xs) var(--sp-sm); margin-bottom: var(--sp-md); }
  .supporters-placeholder__title { font-size: var(--fs-2xl); margin-bottom: var(--sp-sm); }
  .supporters-placeholder__body { font-size: var(--fs-md); color: rgba(16,36,26,0.7); }
`);

export async function supportersView() {
  await viewContainer.render(`
    <div class="container">
      <div class="supporters-placeholder">
        <span class="supporters-placeholder__badge">Coming Soon</span>
        <h1 class="supporters-placeholder__title">Join Supporters</h1>
        <p class="supporters-placeholder__body">We're putting together the supporters program for Maguje FC. Check back soon, or follow our social channels for updates.</p>
      </div>
    </div>`);
  return { cleanup: null };
}
