import { router } from '../../router.js';
import { dashPath } from '../config.js';
import { supabaseClient } from '../supabase-client-esm.js';

// Same per-role nav sections as the original app-shell.js — unchanged.
// hrefs are now router paths (prefixed with the dashboard's base path)
// instead of filenames.
const NAV_SECTIONS = {
  super_admin: [
    {
      title: 'Admin Management',
      links: [
        { href: dashPath('/managers'), icon: '👥', label: 'Managers' },
        { href: dashPath('/auth-records'), icon: '🔑', label: 'Auth Records' },
        { href: dashPath('/system-log'), icon: '📋', label: 'System Log' },
        { href: dashPath('/developer-profile'), icon: '💻', label: 'Developer Page' },
      ],
    },
  ],
  senior_manager: [
    {
      title: 'Club Management',
      links: [
        { href: dashPath('/players'), icon: '🧑‍🤝‍🧑', label: 'Players' },
        { href: dashPath('/officials'), icon: '🎽', label: 'Officials' },
        { href: dashPath('/club-profile'), icon: '🏟️', label: 'Club Profile & Contacts' },
        { href: dashPath('/club-records'), icon: '📁', label: 'Club Records' },
      ],
    },
  ],
  match_manager: [
    {
      title: 'Competitions',
      links: [
        { href: dashPath('/competitions'), icon: '🏆', label: 'Competitions' },
        { href: dashPath('/match-center'), icon: '📅', label: 'Match Center' },
        { href: dashPath('/results'), icon: '📝', label: 'Results' },
      ],
    },
  ],
  content_manager: [
    {
      title: 'Feed & Content',
      links: [
        { href: dashPath('/content?tab=matches'), icon: '⚽', label: 'Match Reports' },
        { href: dashPath('/content?tab=activities'), icon: '📸', label: 'Club Activities' },
        { href: dashPath('/content?tab=events'), icon: '📆', label: 'Events' },
        { href: dashPath('/content?tab=news'), icon: '📰', label: 'News' },
      ],
    },
  ],
};

const SIDEBAR_STYLES = `
  <style>
    #menuToggle {
      display: none;
      background: #099220;
      color: #fff;
      border: none;
      padding: 0.6rem 1rem;
      font-size: 1rem;
      width: 100%;
      text-align: left;
      cursor: pointer;
    }

    nav#nav {
      transition: max-height 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, padding 0.25s ease, transform 0.25s ease;
      will-change: max-height, opacity, transform;
      transform-origin: top;
    }

    div.sidebar-footer {
      transition: max-height 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, padding 0.25s ease, transform 0.25s ease;
      will-change: max-height, opacity, transform;
      transform-origin: top;
    }

    @media (max-width: 800px) {
      #sidebar {
        width: 100%;
        flex-direction: row;
        flex-wrap: wrap;
        position: static;
        height: auto;
      }

      #menuToggle {
        display: block;
      }

      nav#nav {
        display: block;
        width: 100%;
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        padding-top: 0;
        padding-bottom: 0;
        transform: translateY(-6px);
      }

      nav#nav.open {
        max-height: 900px;
        opacity: 1;
        padding-top: 1rem;
        padding-bottom: 1rem;
        transform: translateY(0);
      }

      div.sidebar-footer {
        width: 100%;
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        padding-top: 0;
        padding-bottom: 0;
        border-top: 0;
        transform: translateY(-4px);
      }

      div.sidebar-footer.open {
        max-height: 140px;
        opacity: 1;
        padding-top: 0.9rem;
        padding-bottom: 0.9rem;
        border-top: 1px solid #ffffff1a;
        transform: translateY(0);
      }
    }
  </style>
`;

function buildNavMarkup(role) {
  const sections = NAV_SECTIONS[role] || [];
  return sections
    .map(
      (section) => `
        <div class="nav-section">
          <div class="nav-section-title">${section.title}</div>
          ${section.links
            .map(
              (link) => `
                <a class="nav-link" href="${link.href}">
                  <span class="icon">${link.icon}</span> ${link.label}
                </a>
              `,
            )
            .join('')}
        </div>
      `,
    )
    .join('');
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

async function wireLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      await supabaseClient
        .from('login_sessions')
        .update({ logout_at: new Date().toISOString() })
        .eq('admin_id', user.id)
        .is('logout_at', null);
    }
    await supabaseClient.auth.signOut();
    router.navigate(dashPath('/login'), { replace: true });
  });
}

function wireMobileMenu() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('nav').classList.toggle('open');
    document.querySelector('.sidebar-footer').classList.toggle('open');
  });
}

export const sidebar = {
  mount(role) {
    const rootEl = document.getElementById('app-sidebar-root');
    if (!rootEl) return;

    rootEl.innerHTML = `
      ${SIDEBAR_STYLES}
      <aside id="sidebar">
        <div class="sidebar-header">
          <img src="assets/maguje_logo.png" alt="Club Crest" class="club-crest" onerror="this.style.display='none'">
          <div class="sidebar-header-text">
            <h2 id="clubName">Maguje Fc</h2>
            <span class="role-badge" id="roleBadge">${role.replace('_', ' ')}</span>
          </div>
        </div>

        <button id="menuToggle">☰ Menu</button>

        <nav id="nav">${buildNavMarkup(role)}</nav>

        <div class="sidebar-footer">
          <button id="logoutBtn">Log Out</button>
        </div>
      </aside>
    `;

    highlightActiveLink(window.location.pathname, window.location.search);
    wireLogout();
    wireMobileMenu();
  },

  unmount() {
    const rootEl = document.getElementById('app-sidebar-root');
    if (rootEl) rootEl.innerHTML = '';
  },

  refreshActiveLink() {
    highlightActiveLink(window.location.pathname, window.location.search);
  },
};
