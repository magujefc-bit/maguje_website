import { viewContainer } from '../view-container.js';

export async function termsView() {
  await viewContainer.render(`
    <div class="container section--tight" style="max-width: 780px;">
      <h1 class="text-display-xl" style="margin-bottom: var(--sp-md);">Terms of Service</h1>
      <div class="article-content">
        <p>This page outlines the terms governing use of the Maguje FC website, including acceptable use, content ownership, and disclaimers.</p>
        <p>Full terms content to be added.</p>
      </div>
    </div>`);
  return { cleanup: null };
}
