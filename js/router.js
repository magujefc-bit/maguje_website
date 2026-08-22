class Router {
  constructor() {
    this.routes = [];
    this.notFoundHandler = null;
    this.currentView = null;
    this.scrollPositions = new Map();
    this.isPopping = false;
    this._onLinkClick = this._onLinkClick.bind(this);
    this._onPopState = this._onPopState.bind(this);
  }

  add(pattern, handler) {
    const paramNames = [];
    const regexStr = pattern.replace(/\/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '/([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}/?$`);
    this.routes.push({ pattern, regex, paramNames, handler });
    return this;
  }

  notFound(handler) {
    this.notFoundHandler = handler;
    return this;
  }

  init() {
    document.addEventListener('click', this._onLinkClick);
    window.addEventListener('popstate', this._onPopState);
    this._resolve(window.location.pathname + window.location.search, { replace: true, isInitial: true });
  }

  navigate(path, { replace = false } = {}) {
    if (path === window.location.pathname + window.location.search) return;
    this._saveScrollPosition(window.location.pathname);
    if (replace) { window.history.replaceState({}, '', path); }
    else { window.history.pushState({}, '', path); }
    this._resolve(path, { replace });
  }

  _onLinkClick(e) {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;
    if (link.hasAttribute('data-external')) return;
    if (link.target === '_blank') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
    if (href.startsWith('#')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
    e.preventDefault();
    this.navigate(href);
  }

  _onPopState() {
    this.isPopping = true;
    this._resolve(window.location.pathname + window.location.search, { isPop: true });
  }

  async _resolve(fullPath, { isPop = false, isInitial = false } = {}) {
    const [pathname, search] = fullPath.split('?');
    const query = new URLSearchParams(search || '');

    if (this.currentView && typeof this.currentView.cleanup === 'function') {
      try { this.currentView.cleanup(); } catch (err) { console.error('[router] cleanup error:', err); }
      this.currentView = null;
    }

    const match = this._match(pathname);
    document.dispatchEvent(new CustomEvent('route:before', { detail: { path: pathname } }));

    try {
      if (match) {
        this.currentView = await match.handler(match.params, query) || null;
      } else if (this.notFoundHandler) {
        this.currentView = await this.notFoundHandler() || null;
      } else {
        console.warn('[router] no route matched and no 404 handler set:', pathname);
      }
    } catch (err) {
      console.error('[router] view render error:', err);
      document.dispatchEvent(new CustomEvent('route:error', { detail: { path: pathname, error: err } }));
    }

    if (isPop) {
      const saved = this.scrollPositions.get(pathname);
      window.scrollTo(0, saved ? saved.y : 0);
    } else if (!isInitial) {
      window.scrollTo(0, 0);
    }

    document.dispatchEvent(new CustomEvent('route:after', { detail: { path: pathname, params: match ? match.params : {} } }));
    this.isPopping = false;
  }

  _match(pathname) {
    for (const route of this.routes) {
      const m = pathname.match(route.regex);
      if (m) {
        const params = {};
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  _saveScrollPosition(pathname) {
    this.scrollPositions.set(pathname, { x: window.scrollX, y: window.scrollY });
  }
}

export const router = new Router();
