// sidebar.js
import { dashPath } from '../config.js';
import { OWNER_EMAIL } from '../owner-config.js';

const ICONS = {
  dashboard: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5 10 3l7 6.5"/><path d="M4.5 8.5V16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8.5"/><path d="M8 17v-4.5h4V17"/></svg>`,
  player: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="4.8" r="2.1"/><path d="M10 7.2v4.8"/><path d="M10 9.5 7 11.5M10 9.5l3.3-1"/><path d="M10 12 7 17M10 12l3.3 4.5"/></svg>`,
  official: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 10h4"/><circle cx="13" cy="10" r="4"/><circle cx="13" cy="10" r="1.2"/><path d="M13 6v1.4"/></svg>`,
  clubStadium: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M2 9c0-2.8 3.6-5 8-5s8 2.2 8 5"/><path d="M2 9v3c0 2.8 3.6 5 8 5s8-2.2 8-5V9"/><ellipse cx="10" cy="9" rx="4" ry="1.6"/></svg>`,
  clubRecord: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 5.5h5l1.5 2h8.5v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/></svg>`,
  bugIssueRecords: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="2.8" width="11" height="14.4" rx="1.4"/><path d="M5.3 7h6.4M5.3 9.6h6.4M5.3 12.2h4.4"/><circle cx="15.5" cy="4.5" r="1.7"/><path d="M15.5 6.2v3.6"/><path d="M13.9 7.4h1.3M13.9 9h1.5M17.1 7.4h-1.3M17.1 9h-1.5"/><path d="M14.6 3.3 13.7 2.2M16.4 3.3 17.3 2.2"/></svg>`,
  authRecord: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="10" r="3.2"/><path d="M9.2 10h7.3"/><path d="M13.5 10v2.2M15.7 10v1.6"/></svg>`,
  systemLog: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M7 3h6a1 1 0 0 1 1 1v1H6V4a1 1 0 0 1 1-1z"/><rect x="4.5" y="4.5" width="11" height="13.5" rx="1.3"/><path d="M7 9h6M7 12h6M7 15h4"/></svg>`,
  developer: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M7 6 3 10l4 4"/><path d="M13 6l4 4-4 4"/></svg>`,
  messages: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><path d="M3 5.5l7 6 7-6"/></svg>`,
  competitions: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M6 3h8v3.5a4 4 0 0 1-8 0V3z"/><path d="M6 4h-2a2 2 0 0 0 0 4h1.3"/><path d="M14 4h2a2 2 0 0 1 0 4h-1.3"/><path d="M10 10.5v3"/><path d="M8.5 13.5h3v3h-3z"/><path d="M7.5 16.5h5"/></svg>`,
  matchCenter: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="14" height="13" rx="1.5"/><path d="M3 8h14"/><path d="M7 2.5v3M13 2.5v3"/><circle cx="13.5" cy="12.5" r="3"/><path d="M13.5 11v1.6l1.1 1"/></svg>`,
  results: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5v15"/><path d="M5 3.5h9v6H5z"/><path d="M9.5 3.5v6M5 6.5h9"/></svg>`,
  matchReports: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="7.2"/><path d="M10 6.2l2.3 1.7-.9 2.7H8.6l-.9-2.7z"/><path d="M10 6.2V3.2M12.3 7.9l2.7-1M11.4 10.6l1.7 2.4M8.6 10.6l-1.7 2.4M7.7 7.9l-2.7-1"/></svg>`,
  events: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="14" height="13" rx="1.5"/><path d="M3 8h14"/><path d="M7 2.5v3M13 2.5v3"/><path d="M10 10.3l1 2 2.2.2-1.7 1.5.5 2.1-2-1.1-2 1.1.5-2.1-1.7-1.5 2.2-.2z"/></svg>`,
  news: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h11v10.5A1.5 1.5 0 0 1 12.5 16H5a2 2 0 0 1-2-2V4z"/><path d="M14 6.5h1.5A1 1 0 0 1 16.5 7.5v7a1.5 1.5 0 0 1-3 0V6"/><path d="M5.5 7h5M5.5 9.3h5M5.5 11.6h3.3"/></svg>`,
  mediaManagement: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><circle cx="7" cy="8" r="1.7"/><path d="M3 15l4.5-4.5 3 3 2.5-2.5 4.5 4.5"/></svg>`,
  hamburger: `<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M3 5.5h14M3 10h14M3 14.5h14"/></svg>`,
  close: `<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M5 5l10 10M15 5 5 15"/></svg>`,
  backHome: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 4 6 10l6.5 6"/></svg>`,
  installs: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M10 3v9"/><path d="M6.5 8.5 10 12l3.5-3.5"/><path d="M3.5 14.5v1.3a1.2 1.2 0 0 0 1.2 1.2h10.6a1.2 1.2 0 0 0 1.2-1.2v-1.3"/></svg>`,
  supporters: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="6.5" r="2.3"/><path d="M2.5 15c0-2.6 2-4.3 4.5-4.3s4.5 1.7 4.5 4.3"/><circle cx="14.5" cy="7" r="1.8"/><path d="M12.8 10.8c1.8.2 3.2 1.6 3.2 4.2"/></svg>`,
};

// Same per-role nav sections as the original app-shell.js — unchanged.
// hrefs are now router paths (prefixed with the dashboard's base path)
// instead of filenames. Links marked ownerOnly are filtered out for
// every super_admin except OWNER_EMAIL, even though the role itself
// grants everything else in this section.
const NAV_SECTIONS = {
  super_admin: [
    {
      title: 'Admin Management',
      links: [
        { href: dashPath('/managers'), icon: ICONS.official, label: 'Managers' },
        { href: dashPath('/auth-records'), icon: ICONS.authRecord, label: 'Auth Records' },
        { href: dashPath('/system-log'), icon: ICONS.systemLog, label: 'System Log' },
        { href: dashPath('/developer-profile'), icon: ICONS.developer, label: 'Developer Page', ownerOnly: true },
        { href: dashPath('/report-issue'), icon: ICONS.bugIssueRecords, label: 'Bug Reports', ownerOnly: true },
      ],
    },
    {
      title: 'Analytics',
      links: [
        { href: dashPath('/installs'), icon: ICONS.installs, label: 'App Installs' },
        { href: dashPath('/supporters'), icon: ICONS.supporters, label: 'Supporters' },
      ],
    },
  ],
  senior_manager: [
    {
      title: 'Club Management',
      links: [
        { href: dashPath('/messages'), icon: ICONS.messages, label: 'Messages' },
        { href: dashPath('/players'), icon: ICONS.player, label: 'Players' },
        { href: dashPath('/officials'), icon: ICONS.official, label: 'Officials' },
        { href: dashPath('/club-profile'), icon: ICONS.clubStadium, label: 'Club Profile & Contacts' },
        { href: dashPath('/club-records'), icon: ICONS.clubRecord, label: 'Club Records' },
      ],
    },
    {
      title: 'Analytics',
      links: [
        { href: dashPath('/supporters'), icon: ICONS.supporters, label: 'Supporters' },
      ],
    },
  ],
  match_manager: [
    {
      title: 'Competitions',
      links: [
        { href: dashPath('/messages'), icon: ICONS.messages, label: 'Messages' },
        { href: dashPath('/competitions'), icon: ICONS.competitions, label: 'Competitions' },
        { href: dashPath('/match-center'), icon: ICONS.matchCenter, label: 'Match Center' },
        { href: dashPath('/results'), icon: ICONS.results, label: 'Results' },
      ],
    },
    {
      title: 'Club Management',
      links: [
        { href: dashPath('/players'), icon: ICONS.player, label: 'Players' },
      ],
    },
  ],
  content_manager: [
    {
      title: 'Match Management',
      links: [
        { href: dashPath('/results'), icon: ICONS.results, label: 'Results' },
      ],
    },
    {
      title: 'Feed & Content',
      links: [
        { href: dashPath('/content?tab=matches'), icon: ICONS.matchReports, label: 'Match Reports' },
        { href: dashPath('/content?tab=events'), icon: ICONS.events, label: 'Events' },
        { href: dashPath('/content?tab=news'), icon: ICONS.news, label: 'News' },
        { href: dashPath('/content?tab=media'), icon: ICONS.mediaManagement, label: 'Media Library' },
      ],
    },
  ],
};

const SIDEBAR_STYLES = `
  <style>
    /* The nav icons are inline SVGs — size/center them explicitly so
       they line up regardless of each SVG's own width/height. */
    #sidebar .nav-link .icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    #sidebar .nav-link .icon svg {
      display: block;
      width: 20px;
      height: 20px;
    }

    #backToPublic {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.9rem 1rem;
      padding: 0.5rem 0.6rem;
      color: #e0e0e8;
      text-decoration: none;
      font-size: 0.85rem;
      border: 1px solid #ffffff40;
      border-radius: 6px;
    }
    #backToPublic:hover { background: #ffffff14; }
  </style>
`;

function buildNavMarkup(role, email) {
  const sections = NAV_SECTIONS[role] || [];

  // Standalone home link above the role-specific sections, so there's
  // always a way back to the dashboard landing page from any sub-page.
  const homeSection = `
    <div class="nav-section">
      <a class="nav-link" href="${dashPath('/')}">
        <span class="icon">${ICONS.dashboard}</span> Dashboard
      </a>
    </div>
  `;

  const roleSections = sections
    .map(
      (section) => {
        const visibleLinks = section.links.filter(
          (link) => !link.ownerOnly || email === OWNER_EMAIL,
        );

        if (!visibleLinks.length) return '';

        return `
          <div class="nav-section">
            <div class="nav-section-title">${section.title}</div>
            ${visibleLinks
              .map(
                (link) => `
                  <a class="nav-link" href="${link.href}">
                    <span class="icon">${link.icon}</span> ${link.label}
                  </a>
                `,
              )
              .join('')}
          </div>
        `;
      },
    )
    .join('');

  return homeSection + roleSections;
}

function highlightActiveLink(pathname, search) {
  const currentTab = new URLSearchParams(search || '').get('tab');
  document.querySelectorAll('#nav .nav-link').forEach((link) => {
    const linkUrl = new URL(link.getAttribute('href'), window.location.origin);
    const linkTab = linkUrl.searchParams.get('tab');
    const pathMatches = linkUrl.pathname === pathname;
    const tabMatches = (linkTab || null) === (currentTab || null);
    link.classList.toggle('active', pathMatches && tabMatches);
  });
}

function openDrawer() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('dashDrawerBackdrop')?.classList.add('open');
  document.getElementById('dashMenuToggle')?.setAttribute('aria-expanded', 'true');
}

function closeDrawer() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('dashDrawerBackdrop')?.classList.remove('open');
  document.getElementById('dashMenuToggle')?.setAttribute('aria-expanded', 'false');
}

function wireDrawer() {
  const toggleBtn = document.getElementById('dashMenuToggle');
  const backdrop = document.getElementById('dashDrawerBackdrop');
  const sidebarEl = document.getElementById('sidebar');

  toggleBtn?.addEventListener('click', () => {
    sidebarEl.classList.contains('open') ? closeDrawer() : openDrawer();
  });

  backdrop?.addEventListener('click', closeDrawer);
}

export const sidebar = {
  mount(role, email) {
    const rootEl = document.getElementById('app-sidebar-root');
    if (!rootEl) return;

    rootEl.innerHTML = `
      ${SIDEBAR_STYLES}

      <div id="dashMobileTopbar">
        <img src="assets/maguje_logo.png" alt="Club Crest" class="dash-topbar-crest" onerror="this.style.display='none'">
        <span class="dash-topbar-title">Dashboard</span>
        <button type="button" id="dashMenuToggle" aria-label="Open menu" aria-expanded="false">
          ${ICONS.hamburger}
        </button>
      </div>

      <div id="dashDrawerBackdrop"></div>

      <aside id="sidebar">
        <div class="sidebar-header">
          <img src="assets/maguje_logo.png" alt="Club Crest" class="club-crest" onerror="this.style.display='none'">
          <div class="sidebar-header-text">
            <h2 id="clubName">Maguje Fc</h2>
            <span class="role-badge" id="roleBadge">${role.replace('_', ' ')}</span>
          </div>
        </div>

        <a id="backToPublic" href="/">
          <span class="icon">${ICONS.backHome}</span> Back to Public View
        </a>

        <nav id="nav">${buildNavMarkup(role, email)}</nav>
      </aside>
    `;

    highlightActiveLink(window.location.pathname, window.location.search);
    wireDrawer();
  },

  unmount() {
    const rootEl = document.getElementById('app-sidebar-root');
    if (rootEl) rootEl.innerHTML = '';
  },

  refreshActiveLink() {
    highlightActiveLink(window.location.pathname, window.location.search);
  },
};
