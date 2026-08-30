import { dashPath } from '../config.js';
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('dashboard-view', `
  .welcome-hero { background: linear-gradient(135deg, #109b45, #046926); border-radius: 14px; padding: 1.8rem 2rem; color: #fff; margin-bottom: 2rem; }
  .welcome-hero h1 { margin: 0 0 0.3rem; font-size: 1.5rem; }
  .welcome-hero p { margin: 0; font-size: 0.92rem; opacity: 0.9; }
  .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1.1rem; }
  .card-link { background: #fff; padding: 1.3rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); text-decoration: none; color: inherit; display: block; transition: transform 0.15s ease, box-shadow 0.15s ease; border: 1px solid transparent; }
  .card-link:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(16, 155, 69, 0.15); border-color: #109b4530; }
  .card-icon { font-size: 1.6rem; margin-bottom: 0.6rem; display: inline-block; }
  .card-link h3 { margin: 0 0 0.35rem; font-size: 1rem; color: #222; }
  .card-link p { margin: 0; font-size: 0.82rem; color: #777; line-height: 1.4; }
  .card-arrow { float: right; color: #109b45; font-weight: 700; font-size: 1rem; }
  @media (max-width: 800px) { .welcome-hero { padding: 1.4rem 1.3rem; } }
`);

// Which summary cards each role sees — unchanged from dashboard.html,
// hrefs now built through dashPath().
const ROLE_CONFIG = {
  super_admin: {
    cards: [
      { title: 'Managers', desc: 'Invite, deactivate, or reactivate admin accounts.', href: dashPath('/managers'), icon: '👥' },
      { title: 'Auth Records', desc: 'Check login/auth history for all accounts.', href: dashPath('/auth-records'), icon: '🔑' },
      { title: 'System Log', desc: 'Review recent admin activity across the system.', href: dashPath('/system-log'), icon: '📋' },
      {title: 'Developer page', desc: 'Strictly for MAGUJE FC developer.', href: dashPath('/developer-profile'), icon: '💻'},
      
    ],
  },
  senior_manager: {
    cards: [
      { title: 'Players', desc: 'Create and edit player roster records.', href: dashPath('/players'), icon: '🧑\u200d🤝\u200d🧑' },
      { title: 'Officials', desc: 'Manage coaches and club officials.', href: dashPath('/officials'), icon: '🎽' },
      { title: 'Club Profile', desc: 'Edit club info, contacts, and social links.', href: dashPath('/club-profile'), icon: '🏟️' },
      { title: 'Club Records', desc: 'View club records.', href: dashPath('/club-records'), icon: '📁' },
    ],
  },
  match_manager: {
    cards: [
      { title: 'Competitions', desc: 'Create competitions and manage their matches.', href: dashPath('/competitions'), icon: '🏆' },
      { title: 'Match Center', desc: 'Browse teams, players, and all matches.', href: dashPath('/match-center'), icon: '📅' },
      { title: 'Results', desc: "Record standings and match results as they're played.", href: dashPath('/results'), icon: '📝' },
    ],
  },
  content_manager: {
    cards: [
      { title: 'Game Results', desc: 'Feature match results in the feed.', href: dashPath('/content?tab=matches'), icon: '⚽' },
      { title: 'Club Activities', desc: 'Feature club activities.', href: dashPath('/content?tab=activities'), icon: '📸' },
      { title: 'Events', desc: 'Feature upcoming events.', href: dashPath('/content?tab=events'), icon: '📆' },
      { title: 'News', desc: 'Feature news items.', href: dashPath('/content?tab=news'), icon: '📰' },
    ],
  },
};

export async function dashboardView() {
  const admin = await requireAdmin();
  if (!admin) return { cleanup: null };

  const config = ROLE_CONFIG[admin.role];

  viewContainer.render(`
    <div class="welcome-hero">
      <h1>Welcome, ${admin.email.split('@')[0]}</h1>
      <p>Here's what you can manage from your account.</p>
    </div>
    <div class="dashboard-grid" id="summaryGrid"></div>
  `);

  const grid = document.getElementById('summaryGrid');
  grid.innerHTML = config.cards
    .map(
      (c) => `
        <a class="card-link" href="${c.href}">
          <span class="card-arrow">→</span>
          <span class="card-icon">${c.icon}</span>
          <h3>${c.title}</h3>
          <p>${c.desc}</p>
        </a>`,
    )
    .join('');

  return { cleanup: null };
}
