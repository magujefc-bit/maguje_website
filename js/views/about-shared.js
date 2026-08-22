import { injectStyle } from '../utils/inject-style.js';

injectStyle('about-shared', `
  .about-header {
    padding-block: var(--sp-lg) var(--sp-sm);
  }

  .about-title {
    font-size: var(--fs-2xl);
  }

  .about-subnav {
    display: flex;
    gap: var(--sp-md);
    overflow-x: auto;
    border-bottom: 1px solid var(--color-line);
    margin-bottom: var(--sp-lg);
  }

  .about-subnav__link {
    font-size: var(--fs-sm);
    font-weight: 600;
    white-space: nowrap;
    padding-block: var(--sp-xs);
    color: rgba(16,36,26,0.6);
    border-bottom: 2px solid transparent;
  }

  .about-subnav__link--active {
    color: var(--color-ridge-green);
    border-bottom-color: var(--color-ridge-green);
  }
`);

export function aboutSubNav(activeTab) {
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      path: '/about'
    },
    {
      id: 'history',
      label: 'History',
      path: '/about/history'
    },
    {
      id: 'vision-mission',
      label: 'Vision & Mission',
      path: '/about/vision-mission'
    },
    {
      id: 'honours',
      label: 'Honours',
      path: '/about/honours'
    },
  ];

  return `
    <nav
      class="about-subnav"
      aria-label="About sections"
    >
      ${tabs.map(t => `
        <a
          href="${t.path}"
          class="about-subnav__link ${
            t.id === activeTab
              ? 'about-subnav__link--active'
              : ''
          }"
        >
          ${t.label}
        </a>
      `).join('')}
    </nav>
  `;
}

export function aboutHeader(title) {
  return `
    <div class="about-header">
      <h1 class="about-title">${title}</h1>
    </div>
  `;
}