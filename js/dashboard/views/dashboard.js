// dashboard-view.js
import { dashPath } from '../config.js';
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { injectStyle } from '../utils/inject-style.js';
import { OWNER_EMAIL } from '../owner-config.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('dashboard-view', `
  .welcome-hero { background: linear-gradient(135deg, #109b45, #046926); border-radius: 14px; padding: 1.8rem 2rem; color: #fff; margin-bottom: 2rem; }
  .welcome-hero h1 { margin: 0 0 0.3rem; font-size: 1.5rem; }
  .welcome-hero p { margin: 0; font-size: 0.92rem; opacity: 0.92; }
  .hero-role-badge { display: inline-block; margin-top: 0.7rem; padding: 0.25rem 0.7rem; border-radius: 999px; background: rgba(255,255,255,0.18); font-size: 0.72rem; letter-spacing: 0.03em; text-transform: capitalize; }
  .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1.1rem; }
  .card-link { background: #fff; padding: 1.3rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); text-decoration: none; color: inherit; display: block; transition: transform 0.15s ease, box-shadow 0.15s ease; border: 1px solid transparent; position: relative; }
  .card-link:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(16, 155, 69, 0.15); border-color: #109b4530; }
  .card-icon-wrap { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #109b45, #046926); display: flex; align-items: center; justify-content: center; margin-bottom: 0.7rem; }
  .card-icon-wrap svg { width: 21px; height: 21px; }
  .card-link h3 { margin: 0 0 0.35rem; font-size: 1rem; color: #222; }
  .card-link p { margin: 0; font-size: 0.82rem; color: #777; line-height: 1.4; }
  .card-arrow { position: absolute; top: 1.2rem; right: 1.3rem; color: #109b45; font-weight: 700; font-size: 1rem; }
  @media (max-width: 800px) { .welcome-hero { padding: 1.4rem 1.3rem; } }
  .install-stat { background: #fff; border: 1px solid #e2ece5; border-radius: 12px; padding: 1.1rem 1.3rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.9rem; max-width: 320px; }
  .install-stat__icon { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #109b45, #046926); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .install-stat__icon svg { width: 19px; height: 19px; }
  .install-stat__value { font-size: 1.4rem; font-weight: 700; color: #109b45; line-height: 1; }
  .install-stat__label { font-size: 0.78rem; color: #777; margin-top: 2px; }
`);

// Card icons — SVG (white stroke) to match the sidebar's icon style,
// rendered inside a green badge (.card-icon-wrap) since cards sit on
// a white background.
const CARD_ICONS = {
  groups: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="6.5" r="2.3"/><path d="M2.5 15c0-2.6 2-4.3 4.5-4.3s4.5 1.7 4.5 4.3"/><circle cx="14.5" cy="7" r="1.8"/><path d="M12.8 10.8c1.8.2 3.2 1.6 3.2 4.2"/></svg>`,
  authRecord: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="10" r="3.2"/><path d="M9.2 10h7.3"/><path d="M13.5 10v2.2M15.7 10v1.6"/></svg>`,
  systemLog: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M7 3h6a1 1 0 0 1 1 1v1H6V4a1 1 0 0 1 1-1z"/><rect x="4.5" y="4.5" width="11" height="13.5" rx="1.3"/><path d="M7 9h6M7 12h6M7 15h4"/></svg>`,
  developer: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M7 6 3 10l4 4"/><path d="M13 6l4 4-4 4"/></svg>`,
  bugIssueRecords: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="2.8" width="11" height="14.4" rx="1.4"/><path d="M5.3 7h6.4M5.3 9.6h6.4M5.3 12.2h4.4"/><circle cx="15.5" cy="4.5" r="1.7"/><path d="M15.5 6.2v3.6"/><path d="M13.9 7.4h1.3M13.9 9h1.5M17.1 7.4h-1.3M17.1 9h-1.5"/></svg>`,
  bugIssue: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="5.3" r="1.6"/><path d="M8.8 4 7.6 2.6M11.2 4 12.4 2.6"/><ellipse cx="10" cy="11.8" rx="3.4" ry="4.6"/><path d="M10 7.2v9"/><path d="M7 10h-2.2M7 13h-2.4M13 10h2.2M13 13h2.4"/></svg>`,
  messages: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><path d="M3 5.5l7 6 7-6"/></svg>`,
  player: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="4.8" r="2.1"/><path d="M10 7.2v4.8"/><path d="M10 9.5 7 11.5M10 9.5l3.3-1"/><path d="M10 12 7 17M10 12l3.3 4.5"/></svg>`,
  official: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 10h4"/><circle cx="13" cy="10" r="4"/><circle cx="13" cy="10" r="1.2"/><path d="M13 6v1.4"/></svg>`,
  clubStadium: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M2 9c0-2.8 3.6-5 8-5s8 2.2 8 5"/><path d="M2 9v3c0 2.8 3.6 5 8 5s8-2.2 8-5V9"/><ellipse cx="10" cy="9" rx="4" ry="1.6"/></svg>`,
  clubRecord: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 5.5h5l1.5 2h8.5v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/></svg>`,
  competitions: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M6 3h8v3.5a4 4 0 0 1-8 0V3z"/><path d="M6 4h-2a2 2 0 0 0 0 4h1.3"/><path d="M14 4h2a2 2 0 0 1 0 4h-1.3"/><path d="M10 10.5v3"/><path d="M8.5 13.5h3v3h-3z"/><path d="M7.5 16.5h5"/></svg>`,
  matchCenter: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="14" height="13" rx="1.5"/><path d="M3 8h14"/><path d="M7 2.5v3M13 2.5v3"/><circle cx="13.5" cy="12.5" r="3"/><path d="M13.5 11v1.6l1.1 1"/></svg>`,
  results: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5v15"/><path d="M5 3.5h9v6H5z"/><path d="M9.5 3.5v6M5 6.5h9"/></svg>`,
  matchReports: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="7.2"/><path d="M10 6.2l2.3 1.7-.9 2.7H8.6l-.9-2.7z"/><path d="M10 6.2V3.2M12.3 7.9l2.7-1M11.4 10.6l1.7 2.4M8.6 10.6l-1.7 2.4M7.7 7.9l-2.7-1"/></svg>`,
  events: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="14" height="13" rx="1.5"/><path d="M3 8h14"/><path d="M7 2.5v3M13 2.5v3"/><path d="M10 10.3l1 2 2.2.2-1.7 1.5.5 2.1-2-1.1-2 1.1.5-2.1-1.7-1.5 2.2-.2z"/></svg>`,
  news: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h11v10.5A1.5 1.5 0 0 1 12.5 16H5a2 2 0 0 1-2-2V4z"/><path d="M14 6.5h1.5A1 1 0 0 1 16.5 7.5v7a1.5 1.5 0 0 1-3 0V6"/><path d="M5.5 7h5M5.5 9.3h5M5.5 11.6h3.3"/></svg>`,
  mediaManagement: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><circle cx="7" cy="8" r="1.7"/><path d="M3 15l4.5-4.5 3 3 2.5-2.5 4.5 4.5"/></svg>`,
  installs: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M10 3v9"/><path d="M6.5 8.5 10 12l3.5-3.5"/><path d="M3.5 14.5v1.3a1.2 1.2 0 0 0 1.2 1.2h10.6a1.2 1.2 0 0 0 1.2-1.2v-1.3"/></svg>`,
};

// A short, role-specific welcome line for the hero — this is the only
// place warmth/tone differs; everything else in the hero is generic.
const WELCOME_COPY = {
  super_admin: "You have full oversight today — admin accounts, auth history, and system activity, all in one place.",
  senior_manager: "Here's everything you need to keep the club's roster and profile current.",
  match_manager: "Let's get today's competitions, fixtures, and results in order.",
  content_manager: "Time to bring the latest match action and club news to the fans.",
};

// Which summary cards each role sees. Kept in sync with sidebar.js's
// NAV_SECTIONS for the same role — every link a role has in the
// sidebar should also have a card here, so the dashboard itself is a
// complete landing page and not just a partial shortcut list. Cards
// marked ownerOnly are filtered out for every super_admin except
// OWNER_EMAIL, matching the rule sidebar.js applies to its own nav.
const ROLE_CONFIG = {
  super_admin: {
    cards: [
      { title: 'Managers', desc: 'Invite, deactivate, or reactivate admin accounts.', href: dashPath('/managers'), icon: CARD_ICONS.groups },
      { title: 'Auth Records', desc: 'Check login/auth history for all accounts.', href: dashPath('/auth-records'), icon: CARD_ICONS.authRecord },
      { title: 'System Log', desc: 'Review recent admin activity across the system.', href: dashPath('/system-log'), icon: CARD_ICONS.systemLog },
      { title: 'Developer Page', desc: 'Strictly for MAGUJE FC developer.', href: dashPath('/developer-profile'), icon: CARD_ICONS.developer, ownerOnly: true },
      { title: 'Bug Reports', desc: 'Review issues submitted by admins and visitors.', href: dashPath('/report-issue'), icon: CARD_ICONS.bugIssueRecords, ownerOnly: true },
    ],
  },
  senior_manager: {
    cards: [
      { title: 'Messages', desc: 'Chat with other club managers and admins.', href: dashPath('/messages'), icon: CARD_ICONS.messages },
      { title: 'Players', desc: 'Create and edit player roster records.', href: dashPath('/players'), icon: CARD_ICONS.player },
      { title: 'Officials', desc: 'Manage coaches and club officials.', href: dashPath('/officials'), icon: CARD_ICONS.official },
      { title: 'Club Profile & Contacts', desc: 'Edit club info, contacts, and social links.', href: dashPath('/club-profile'), icon: CARD_ICONS.clubStadium },
      { title: 'Club Records', desc: 'View club records.', href: dashPath('/club-records'), icon: CARD_ICONS.clubRecord },
    ],
  },
  match_manager: {
    cards: [
      { title: 'Messages', desc: 'Chat with other club managers and admins.', href: dashPath('/messages'), icon: CARD_ICONS.messages },
      { title: 'Competitions', desc: 'Create competitions and manage their matches.', href: dashPath('/competitions'), icon: CARD_ICONS.competitions },
      { title: 'Match Center', desc: 'Browse teams, players, and all matches.', href: dashPath('/match-center'), icon: CARD_ICONS.matchCenter },
      { title: 'Results', desc: "Record standings and match results as they're played.", href: dashPath('/results'), icon: CARD_ICONS.results },
      { title: 'Players', desc: 'View the player roster.', href: dashPath('/players'), icon: CARD_ICONS.player },
    ],
  },
  content_manager: {
    cards: [
      { title: 'Results', desc: 'Record and update match results directly.', href: dashPath('/results'), icon: CARD_ICONS.results },
      { title: 'Match Reports', desc: 'Feature match results in the feed.', href: dashPath('/content?tab=matches'), icon: CARD_ICONS.matchReports },
      { title: 'Events', desc: 'Feature upcoming events.', href: dashPath('/content?tab=events'), icon: CARD_ICONS.events },
      { title: 'News', desc: 'Feature news items.', href: dashPath('/content?tab=news'), icon: CARD_ICONS.news },
      { title: 'Media Library', desc: 'Upload and manage photos and videos.', href: dashPath('/content?tab=media'), icon: CARD_ICONS.mediaManagement },
    ],
  },
};

// Every role can report a bug (this is the public submission link, not
// the owner-only "Bug Reports" viewer above) — add it once, to all roles.
const REPORT_ISSUE_CARD = {
  title: 'Report an Issue',
  desc: 'Spotted a bug or something off? Let us know.',
  href: '/report-issue',
  icon: CARD_ICONS.bugIssue,
};

export async function dashboardView() {
  const admin = await requireAdmin();
  if (!admin) return { cleanup: null };

  const config = ROLE_CONFIG[admin.role];
  const visibleCards = [
    ...config.cards.filter((c) => !c.ownerOnly || admin.email === OWNER_EMAIL),
    REPORT_ISSUE_CARD,
  ];

  const rawName = admin.email.split('@')[0];
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const welcomeLine = WELCOME_COPY[admin.role] || "Here's what you can manage from your account.";

  viewContainer.render(`
    <div class="welcome-hero">
      <h1>Welcome back, ${displayName}</h1>
      <p>${welcomeLine}</p>
      <span class="hero-role-badge">${admin.role.replace('_', ' ')}</span>
    </div>
    ${admin.email === OWNER_EMAIL ? `
      <div class="install-stat" id="installStat">
        <span class="install-stat__icon">${CARD_ICONS.installs}</span>
        <div>
          <div class="install-stat__value" id="installCount">…</div>
          <div class="install-stat__label">App Installs</div>
        </div>
      </div>
    ` : ''}
    <div class="dashboard-grid" id="summaryGrid"></div>
  `);

  if (admin.email === OWNER_EMAIL) {
    loadInstallCount();
  }

  const grid = document.getElementById('summaryGrid');
  grid.innerHTML = visibleCards
    .map(
      (c) => `
        <a class="card-link" href="${c.href}">
          <span class="card-arrow">→</span>
          <span class="card-icon-wrap">${c.icon}</span>
          <h3>${c.title}</h3>
          <p>${c.desc}</p>
        </a>`,
    )
    .join('');

  return { cleanup: null };
}

async function loadInstallCount() {
  const el = document.getElementById('installCount');
  if (!el) return;

  const { count, error } = await supabaseClient
    .from('pwa_installs')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[dashboard] install count failed:', error);
    el.textContent = '—';
    return;
  }

  el.textContent = count ?? 0;
}