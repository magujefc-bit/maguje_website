import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('auth-records-view', `
  .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 0.6rem; }
  .search-box { padding: 0.5rem 0.75rem; border: 1px solid #d3ded6; border-radius: 6px; width: 260px; font-size: 0.88rem; }
  .record-count { color: #777; font-size: 0.82rem; }
  .load-status { color: #b3261e; min-height: 1.2em; font-size: 0.85rem; }
  .records-table th { cursor: pointer; user-select: none; }
  .active-indicator { display: inline-flex; align-items: center; gap: 0.22rem; color: #4b5563; font-weight: 600; }
  .active-indicator span { width: 0.38rem; height: 0.38rem; border-radius: 50%; background: currentColor; animation: active-dot-bounce 1.2s infinite ease-in-out; opacity: 0.7; }
  .active-indicator span:nth-child(2) { animation-delay: 0.15s; }
  .active-indicator span:nth-child(3) { animation-delay: 0.3s; }
  .load-more-wrap { text-align: center; margin-top: 1rem; }
  .sessions-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .sessions-table-wrap .data-table { min-width: 680px; }
  .sessions-table-wrap .data-table th, .sessions-table-wrap .data-table td { white-space: nowrap; }
  @keyframes active-dot-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.45; } 40% { transform: translateY(-3px); opacity: 1; } }
`);

const FUNCTION_URL = 'https://pxtexddyvthgmietwhyc.supabase.co/functions/v1/list-auth-records';
const PAGE_SIZE = 30;

export async function authRecordsView() {
  const admin = await requireAdmin(['super_admin']);
  if (!admin) return { cleanup: null };

  let allRecords = [];
  let sortState = { column: 'created_at', direction: 'desc' };
  let sessionOffset = 0;

  viewContainer.render(`
    ${pageHeader('Auth Records', 'Raw Supabase Auth accounts — signups, sign-ins, and status. Super admin only.')}

    <div class="toolbar">
      <input id="search-input" type="text" placeholder="Search by email…" class="search-box" />
      <span id="record-count" class="record-count"></span>
      <button id="refresh-btn" class="btn-primary">Refresh</button>
    </div>

    <p id="load-status" class="load-status"></p>

    <div class="table-wrap">
      <table class="data-table records-table">
        <thead>
          <tr>
            <th data-sort="email">Email</th>
            <th data-sort="created_at">Created</th>
            <th data-sort="last_sign_in_at">Last Sign-in</th>
            <th>Email Status</th>
            <th>Account Status</th>
            <th>Admin Role</th>
          </tr>
        </thead>
        <tbody id="records-body"></tbody>
      </table>
    </div>

    <div class="table-wrap" style="margin-top: 1.5rem">
      <h2 style="padding: 1rem 1rem 0; font-size: 1.05rem; color: #333">Login Sessions</h2>
      <p id="sessions-status" class="load-status" style="padding: 0 1rem"></p>
      <div class="sessions-table-wrap">
        <table class="data-table records-table">
          <thead>
            <tr><th>Email</th><th>Login</th><th>Logout</th><th>Duration</th></tr>
          </thead>
          <tbody id="sessions-body"></tbody>
        </table>
      </div>
      <div class="load-more-wrap">
        <button id="load-more-btn" class="btn-secondary hidden">Load more</button>
      </div>
    </div>
  `);

  document.getElementById('search-input').addEventListener('input', renderTable);
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadAuthRecords();
    loadLoginSessions(true);
  });
  document.getElementById('load-more-btn').addEventListener('click', () => loadLoginSessions(false));
  document.querySelectorAll('[data-sort]').forEach((th) => {
    th.addEventListener('click', () => setSort(th.dataset.sort));
  });

  async function loadAuthRecords() {
    const statusEl = document.getElementById('load-status');
    statusEl.textContent = 'Loading...';

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        statusEl.textContent = 'Not logged in.';
        return;
      }

      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = await res.json();

      if (!res.ok) {
        statusEl.textContent = json.error || 'Failed to load records.';
        return;
      }

      allRecords = json.records;
      statusEl.textContent = '';
      renderTable();
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Network error loading records.';
    }
  }

  function renderTable() {
    const tbody = document.getElementById('records-body');
    const search = document.getElementById('search-input').value.trim().toLowerCase();

    let filtered = allRecords.filter((r) => r.email.toLowerCase().includes(search));

    filtered.sort((a, b) => {
      const col = sortState.column;
      let valA = a[col] ?? '';
      let valB = b[col] ?? '';
      if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });

    tbody.innerHTML = filtered
      .map(
        (r) => `
        <tr>
          <td>${escapeHtml(r.email)}</td>
          <td>${formatDate(r.created_at)}</td>
          <td>${r.last_sign_in_at ? formatDate(r.last_sign_in_at) : '<span class="muted">Never</span>'}</td>
          <td>${r.email_confirmed_at ? '<span class="badge badge-confirmed">Confirmed</span>' : '<span class="badge badge-pending">Pending</span>'}</td>
          <td>${r.banned_until ? '<span class="badge badge-banned">Banned</span>' : '<span class="badge badge-active">Active</span>'}</td>
          <td>${r.is_admin ? `<span class="badge badge-role">${r.admin_role}</span>` : '<span class="muted">—</span>'}</td>
        </tr>
      `,
      )
      .join('');

    document.getElementById('record-count').textContent = `${filtered.length} of ${allRecords.length} accounts`;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString();
  }

  function setSort(column) {
    if (sortState.column === column) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.column = column;
      sortState.direction = 'asc';
    }
    renderTable();
  }

  async function loadLoginSessions(reset) {
    const statusEl = document.getElementById('sessions-status');
    const tbody = document.getElementById('sessions-body');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (reset) {
      sessionOffset = 0;
      tbody.innerHTML = '';
    }

    statusEl.textContent = 'Loading...';

    try {
      const { data, error } = await supabaseClient
        .from('login_sessions')
        .select('*')
        .order('login_at', { ascending: false })
        .range(sessionOffset, sessionOffset + PAGE_SIZE - 1);

      if (error) {
        statusEl.textContent = error.message;
        return;
      }

      statusEl.textContent = '';
      data.forEach((s) => {
        tbody.insertAdjacentHTML('beforeend', renderSessionRow(s));
      });

      sessionOffset += data.length;
      loadMoreBtn.classList.toggle('hidden', data.length < PAGE_SIZE);
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Network error loading sessions.';
    }
  }

  function renderSessionRow(s) {
    const loginTime = new Date(s.login_at);
    const logoutTime = s.logout_at ? new Date(s.logout_at) : null;
    const duration = logoutTime ? formatDuration(logoutTime - loginTime) : '<span class="muted">Ongoing</span>';

    return `
      <tr>
        <td>${escapeHtml(s.email)}</td>
        <td>${loginTime.toLocaleString()}</td>
        <td>${logoutTime ? logoutTime.toLocaleString() : `<span class="active-indicator" aria-label="Still active"><span></span><span></span><span></span></span>`}</td>
        <td>${duration}</td>
      </tr>
    `;
  }

  function formatDuration(ms) {
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  loadAuthRecords();
  loadLoginSessions(true);

  return { cleanup: null };
}
