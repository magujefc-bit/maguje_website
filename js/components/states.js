export const states = {
  empty({ message = 'Nothing here yet.', hint = '' } = {}) {
    return `
      <div class="state-block state-block--empty" role="status">
        <div class="state-block__icon state-block__icon--empty" aria-hidden="true"></div>
        <p class="text-body-md">${message}</p>
        ${hint ? `<p class="text-body-sm state-block__hint">${hint}</p>` : ''}
      </div>`;
  },
  error({ message = 'Something went wrong loading this.', retryLabel = 'Try again' } = {}) {
    return `
      <div class="state-block state-block--error" role="alert">
        <div class="state-block__icon state-block__icon--error" aria-hidden="true"></div>
        <p class="text-body-md">${message}</p>
        <button type="button" class="btn btn--secondary" data-retry>${retryLabel}</button>
      </div>`;
  },
  bindRetry(container, onRetry) {
    const btn = container.querySelector('[data-retry]');
    if (btn) btn.addEventListener('click', onRetry, { once: true });
  },
};
