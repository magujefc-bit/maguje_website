import { viewContainer } from '../view-container.js';

export async function privacyView() {
  await viewContainer.render(`
    <div class="container section--tight" style="max-width: 780px;">
      <h1 class="text-display-xl" style="margin-bottom: var(--sp-md);">Privacy Policy</h1>
      <div class="article-content">
        <p>This page outlines how Maguje FC collects, uses, and protects personal information submitted through this website, including contact form submissions.</p>
        <p>Full policy content to be added.</p>
      </div>
    </div>`);
  return { cleanup: null };
}
