const TRANSITION_MS = 220;

class ViewContainer {
  constructor(mountSelector = '#app') {
    this.mount = document.querySelector(mountSelector);
    if (!this.mount) throw new Error(`[view-container] mount point "${mountSelector}" not found`);
    this._transitioning = false;
  }

  async render(content, { skipTransition = false } = {}) {
    const hasExisting = this.mount.firstElementChild !== null;
    if (hasExisting && !skipTransition) await this._playExit();

    this.mount.innerHTML = '';
    if (typeof content === 'string') {
      const wrapper = document.createElement('div');
      wrapper.className = 'view';
      wrapper.innerHTML = content;
      this.mount.appendChild(wrapper);
    } else if (content instanceof Node) {
      content.classList?.add('view');
      this.mount.appendChild(content);
    }
    if (!skipTransition) this._playEnter();
  }

  async renderSkeleton(skeletonHtml) {
    await this.render(skeletonHtml, { skipTransition: false });
  }

  renderError(message, onRetry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'view view--error';
    wrapper.innerHTML = `
      <div class="state-block state-block--error">
        <p class="text-body-md">${message}</p>
        <button class="btn btn--secondary" type="button" data-retry>Try again</button>
      </div>`;
    this.mount.innerHTML = '';
    this.mount.appendChild(wrapper);
    this._playEnter();
    if (onRetry) wrapper.querySelector('[data-retry]').addEventListener('click', onRetry);
  }

  renderEmpty(message) {
    const wrapper = document.createElement('div');
    wrapper.className = 'view view--empty';
    wrapper.innerHTML = `<div class="state-block state-block--empty"><p class="text-body-md">${message}</p></div>`;
    this.mount.innerHTML = '';
    this.mount.appendChild(wrapper);
    this._playEnter();
  }

  _playExit() {
    return new Promise((resolve) => {
      const current = this.mount.firstElementChild;
      if (!current) return resolve();
      current.classList.add('view--exiting');
      window.setTimeout(resolve, TRANSITION_MS);
    });
  }

  _playEnter() {
    const el = this.mount.firstElementChild;
    if (!el) return;
    el.classList.add('view--entering');
    void el.offsetWidth;
    el.classList.add('view--entered');
    window.setTimeout(() => { el.classList.remove('view--entering', 'view--entered'); }, TRANSITION_MS);
  }
}

export const viewContainer = new ViewContainer('#app');
