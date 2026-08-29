import { injectStyle } from '../utils/inject-style.js';

injectStyle('club-shared', `
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

export function clubProfileSubNav(activeTab) {
  const tabs = [
    {
      id: 'general',
      label: 'General',
      path: '/club-profile'
    },
    {
      id: 'mission-vision',
      label: 'Mission & Vision',
      path: '/club-profile/mission-vision'
    },
    {
      id: 'history',
      label: 'History',
      path: '/club-profile/history'
    },
  ];

  return `
    <nav
      class="about-subnav"
      aria-label="Club Profile sections"
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

export function clubRecordsSubNav(activeTab) {
  const tabs = [
    {
      id: 'all-time-stats',
      label: 'All-Time Stats',
      path: '/club-records'
    },
    {
      id: 'honours',
      label: 'Honours / Achievements',
      path: '/club-records/honours'
    },
  ];

  return `
    <nav
      class="about-subnav"
      aria-label="Club All-Time Records sections"
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
