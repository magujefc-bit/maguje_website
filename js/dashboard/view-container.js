class ViewContainer {
  constructor(mountSelector = '#main') {
    this.mount = document.querySelector(mountSelector);
    if (!this.mount) throw new Error(`[view-container] mount point "${mountSelector}" not found`);
  }

  render(content) {
    this.mount.innerHTML = '';
    if (typeof content === 'string') {
      const wrapper = document.createElement('div');
      wrapper.className = 'view';
      wrapper.innerHTML = content;
      this.mount.appendChild(wrapper);
    } else if (content instanceof Node) {
      this.mount.appendChild(content);
    }
  }

  renderError(message, onRetry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'view view--error';
    wrapper.innerHTML = `
      <h1>Something went wrong</h1>
      <p class="sub">${message}</p>
      <button class="btn-secondary" type="button" data-retry>Try again</button>`;
    this.mount.innerHTML = '';
    this.mount.appendChild(wrapper);
    if (onRetry) wrapper.querySelector('[data-retry]').addEventListener('click', onRetry);
  }
}

export const viewContainer = new ViewContainer('#main');
