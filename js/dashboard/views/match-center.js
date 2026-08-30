import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('match-center-view', `
  .tabs { display: flex; gap: 0.4rem; margin-bottom: 1.2rem; border-bottom: 2px solid #e2ece5; }
  .tab-btn { background: none; border: none; padding: 0.7rem 1.1rem; font-size: 0.9rem; font-weight: 600; color: #777; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
  .tab-btn.active { color: #109b45; border-bottom-color: #109b45; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  .our-club-row { background: #eaf6ee; border-radius: 8px; padding: 0.7rem 0.9rem; margin-bottom: 0.6rem; font-size: 0.88rem; font-weight: 600; color: #109b45; }

.filter-popover { position: absolute; top: 100%; left: 0; margin-top: 6px; background: #fff; border: 1px solid #d3ded6; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 1rem; width: 240px; max-width: calc(100vw - 32px); z-index: 20; }

  .filter-popover .radio-line { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem; font-size: 0.85rem; }
  .filter-popover .radio-line input { width: auto; }
  .filter-popover select { width: 100%; margin-top: 0.4rem; padding: 0.5rem; border: 1px solid #d3ded6; border-radius: 6px; }

  .match-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
  .match-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; }
  .match-matchup { font-weight: 700; font-size: 0.98rem; color: #222; }
  .match-meta { font-size: 0.78rem; color: #888; margin-top: 2px; }
  .score-pill { background: #e3f5e8; color: #109b45; font-size: 0.85rem; }

  .squad-table { width: 100%; border-collapse: collapse; }
  .squad-table th { text-align: left; font-size: 0.75rem; color: #888; padding: 0.5rem 0.6rem; border-bottom: 2px solid #f0f4f1; }
  .squad-table td { padding: 0.5rem 0.6rem; border-bottom: 1px solid #f7f9f8; font-size: 0.85rem; }

  .popover-anchor { position: relative; display: inline-block; }
`);

export async function matchCenterView() {
  const admin = await requireAdmin(['match_manager']);
  if (!admin) return { cleanup: null };

  let allTeams = [];
  let allCompetitions = [];
  let allMatches = [];
  let allPlayerStats = [];
  let ourClubName = 'Our Club';
  let filterCompetitionId = '';
  let filterStatus = '';
  let sortMode = 'name';

  viewContainer.render(`
    ${pageHeader('Match Center', 'Browse teams and matches across all competitions.')}

    <div class="tabs">
      <button class="tab-btn active" data-tab="teams">Teams</button>
      <button class="tab-btn" data-tab="players">Players</button>
      <button class="tab-btn" data-tab="matches">Matches</button>
    </div>

    <!-- ===================== PLAYERS TAB ===================== -->
    <div class="tab-panel" id="tab-players">
      <div class="card">
        <h2>Player Statistics</h2>
        <div class="toolbar">
          <input type="text" id="player-stats-search" placeholder="Search players…">
          <div class="popover-anchor">
            <button class="btn-icon" id="sort-toggle-btn" title="Sort">🔽 Sort</button>

            <div class="filter-popover hidden" id="sort-popover">
              <div class="radio-line">
                <input type="radio" name="sort-mode" value="name" id="sort-mode-name" checked>
                <label for="sort-mode-name" style="margin:0;">Name (A–Z)</label>
              </div>
              <div class="radio-line">
                <input type="radio" name="sort-mode" value="appearances" id="sort-mode-appearances">
                <label for="sort-mode-appearances" style="margin:0;">Appearances</label>
              </div>
              <div class="radio-line">
                <input type="radio" name="sort-mode" value="goals" id="sort-mode-goals">
                <label for="sort-mode-goals" style="margin:0;">Goals</label>
              </div>
              <div class="radio-line">
                <input type="radio" name="sort-mode" value="assists" id="sort-mode-assists">
                <label for="sort-mode-assists" style="margin:0;">Assists</label>
              </div>
              <div class="radio-line">
                <input type="radio" name="sort-mode" value="yellow_cards" id="sort-mode-yellow">
                <label for="sort-mode-yellow" style="margin:0;">Yellow Cards</label>
              </div>
              <div class="radio-line">
                <input type="radio" name="sort-mode" value="red_cards" id="sort-mode-red">
                <label for="sort-mode-red" style="margin:0;">Red Cards</label>
              </div>

              <button id="sort-apply-btn" class="btn-primary" style="margin-top:0.8rem; width:100%;">Apply</button>
            </div>
          </div>
          <span id="active-sort-label" style="font-size:0.82rem; color:#666;">Name (A–Z)</span>
        </div>
        <p id="player-stats-status" class="save-status"></p>
        <div style="overflow-x:auto;">
          <table class="squad-table" style="width:100%;">
            <thead>
              <tr>
                <th>Player</th>
                <th style="text-align:center;">Appearances</th>
                <th style="text-align:center;">Goals</th>
                <th style="text-align:center;">Assists</th>
                <th style="text-align:center;">🟨</th>
                <th style="text-align:center;">🟥</th>
              </tr>
            </thead>
            <tbody id="player-stats-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===================== TEAMS TAB ===================== -->
    <div class="tab-panel active" id="tab-teams">
      <div class="card">
        <h2>Teams</h2>
        <div class="toolbar">
          <input type="text" id="team-search" placeholder="Search teams…">
        </div>
        <p id="team-load-status" class="save-status"></p>
        <div class="our-club-row" id="our-club-row">Loading club name…</div>
        <div id="teams-list"></div>
      </div>
    </div>

    <!-- ===================== MATCHES TAB ===================== -->
    <div class="tab-panel" id="tab-matches">
      <div class="card">
        <h2>Matches</h2>
        <div class="toolbar">
          <div class="popover-anchor">
            <button class="btn-icon" id="filter-toggle-btn" title="Filter">🔽 Filter</button>

            <div class="filter-popover hidden" id="filter-popover">
              <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:0.3rem;">Competition</label>
              <select id="filter-competition-select">
                <option value="">All Competitions</option>
              </select>

              <label style="display:block; font-size:0.8rem; font-weight:600; margin:0.8rem 0 0.3rem;">Status</label>
              <select id="filter-status-select">
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button id="filter-apply-btn" class="btn-primary" style="margin-top:0.8rem; width:100%;">Apply</button>
            </div>
          </div>
          <span id="active-filter-label" style="font-size:0.82rem; color:#666;">Sorted by date</span>
        </div>
        <p id="match-load-status" class="save-status"></p>
        <div id="matches-list"></div>
      </div>
    </div>
  `);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  async function loadClubName() {
    const { data } = await supabaseClient.from('club_profile').select('name').eq('id', 1).single();
    ourClubName = (data && data.name) ? data.name : 'Our Club';
    document.getElementById('our-club-row').textContent = `⭐ ${ourClubName} (this is your club)`;
  }

  // ================= PLAYERS TAB =================
  async function loadPlayerStats() {
    const statusEl = document.getElementById('player-stats-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient.from('v_player_stats').select('*');
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    statusEl.textContent = '';
    allPlayerStats = data;
    renderPlayerStatsTable();
  }

  document.getElementById('player-stats-search').addEventListener('input', renderPlayerStatsTable);

  function renderPlayerStatsTable() {
    const search = document.getElementById('player-stats-search').value.trim().toLowerCase();
    const tbody = document.getElementById('player-stats-tbody');

    let filtered = allPlayerStats.filter(p =>
      !search ||
      (p.player_name || '').toLowerCase().includes(search)
    );

    if (sortMode === 'name') {
      filtered.sort((a, b) => (a.player_name || '').localeCompare(b.player_name || ''));
    } else {
      filtered.sort((a, b) => (b[sortMode] || 0) - (a[sortMode] || 0));
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">No players found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td>${escapeHtml(p.player_name)}</td>
        <td style="text-align:center;">${p.appearances}</td>
        <td style="text-align:center;">${p.goals}</td>
        <td style="text-align:center;">${p.assists}</td>
        <td style="text-align:center;">${p.yellow_cards}</td>
        <td style="text-align:center;">${p.red_cards}</td>
      </tr>
    `).join('');
  }

  document.getElementById('sort-toggle-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('sort-popover').classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    const popover = document.getElementById('sort-popover');
    if (popover && !popover.contains(e.target) && e.target.id !== 'sort-toggle-btn') {
      popover.classList.add('hidden');
    }
  });

  document.getElementById('sort-apply-btn').addEventListener('click', () => {
    sortMode = document.querySelector('input[name="sort-mode"]:checked').value;

    const labels = {
      name: 'Name (A–Z)',
      appearances: 'Appearances',
      goals: 'Goals',
      assists: 'Assists',
      yellow_cards: 'Yellow Cards',
      red_cards: 'Red Cards',
    };
    document.getElementById('active-sort-label').textContent = labels[sortMode];

    document.getElementById('sort-popover').classList.add('hidden');
    renderPlayerStatsTable();
  });

  // ================= TEAMS TAB =================
  async function loadTeams() {
    const statusEl = document.getElementById('team-load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient.from('teams').select('*').order('name');
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    statusEl.textContent = '';
    allTeams = data;
    renderTeamsList();
  }

  document.getElementById('team-search').addEventListener('input', renderTeamsList);

  function renderTeamsList() {
    const search = document.getElementById('team-search').value.trim().toLowerCase();
    const list = document.getElementById('teams-list');
    const filtered = allTeams.filter(t => !search || t.name.toLowerCase().includes(search));

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-msg">No teams found.</div>`;
      return;
    }

    list.innerHTML = '';
    filtered.forEach(t => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <span class="item-main"><span class="item-name">${escapeHtml(t.name)}</span></span>
        <div class="item-actions">
          <button class="btn-secondary rename-btn">Rename</button>
          <button class="btn-danger delete-btn">Delete</button>
        </div>
      `;
      row.querySelector('.rename-btn').addEventListener('click', async () => {
        const newName = prompt('Rename team:', t.name);
        if (!newName || !newName.trim()) return;
        const { error } = await supabaseClient.from('teams').update({ name: newName.trim() }).eq('id', t.id);
        if (error) { alert(error.message); return; }
        loadTeams();
      });
      row.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm(`Delete team "${t.name}"? This will fail if it's used in any match.`)) return;
        const { error } = await supabaseClient.from('teams').delete().eq('id', t.id);
        if (error) { alert(error.message); return; }
        loadTeams();
      });
      list.appendChild(row);
    });
  }

  // ================= MATCHES TAB =================
  async function loadCompetitions() {
    const { data, error } = await supabaseClient.from('competitions').select('*').order('name');
    if (!error) {
      allCompetitions = data;
      populateCompetitionFilterDropdown();
    }
  }

  function populateCompetitionFilterDropdown() {
    const select = document.getElementById('filter-competition-select');
    select.innerHTML = `<option value="">All Competitions</option>` + allCompetitions.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}${c.season ? ` (${escapeHtml(c.season)})` : ''}</option>`
    ).join('');
  }

  async function loadMatches() {
    const statusEl = document.getElementById('match-load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient.from('matches').select('*');
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    statusEl.textContent = '';
    allMatches = data;
    renderMatchesList();
  }

  function teamName(id) {
    const t = allTeams.find(t => t.id === id);
    return t ? t.name : 'Unknown team';
  }

  function competitionName(id) {
    const c = allCompetitions.find(c => c.id === id);
    return c ? c.name : 'Unknown competition';
  }

  document.getElementById('filter-toggle-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('filter-popover').classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    const popover = document.getElementById('filter-popover');
    if (!popover.contains(e.target) && e.target.id !== 'filter-toggle-btn') {
      popover.classList.add('hidden');
    }
  });

  document.getElementById('filter-apply-btn').addEventListener('click', () => {
    filterCompetitionId = document.getElementById('filter-competition-select').value;
    filterStatus = document.getElementById('filter-status-select').value;

    const labelParts = [];
    if (filterCompetitionId) labelParts.push(competitionName(filterCompetitionId));
    if (filterStatus) labelParts.push(filterStatus);
    document.getElementById('active-filter-label').textContent = labelParts.length
      ? labelParts.join(' · ')
      : 'Sorted by date';

    document.getElementById('filter-popover').classList.add('hidden');
    renderMatchesList();
  });

  function renderMatchesList() {
    const list = document.getElementById('matches-list');
    let filtered = [...allMatches];

    if (filterCompetitionId) {
      filtered = filtered.filter(m => m.competition_id === filterCompetitionId);
    }
    if (filterStatus) {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    filtered.sort((a, b) => {
      if (!a.match_date) return 1;
      if (!b.match_date) return -1;
      return new Date(a.match_date) - new Date(b.match_date);
    });

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-msg">No matches found.</div>`;
      return;
    }

    list.innerHTML = '';
    filtered.forEach(m => list.appendChild(renderMatchCard(m)));
  }

  function renderMatchCard(m) {
    const card = document.createElement('div');
    card.className = 'match-card';

    let matchupHtml;
    if (m.is_internal) {
      const homeSide = m.is_home ? ourClubName : teamName(m.opponent_team_id);
      const awaySide = m.is_home ? teamName(m.opponent_team_id) : ourClubName;
      matchupHtml = `${escapeHtml(homeSide)} vs ${escapeHtml(awaySide)}`;
    } else {
      matchupHtml = `${escapeHtml(teamName(m.team_a_id))} vs ${escapeHtml(teamName(m.team_b_id))}`;
    }

    let statusHtml;
    if (m.status === 'completed') {
      const homeScore = m.is_internal ? (m.is_home ? m.our_score : m.opponent_score) : m.team_a_score;
      const awayScore = m.is_internal ? (m.is_home ? m.opponent_score : m.our_score) : m.team_b_score;
      statusHtml = `<span class="status-pill score-pill">${homeScore} – ${awayScore}</span>`;
    } else {
      statusHtml = `<span class="status-pill status-${m.status}">${m.status}</span>`;
    }

    card.innerHTML = `
      <div class="match-top">
        <div>
          <div class="match-matchup">${matchupHtml}</div>
          <div class="match-meta">${escapeHtml(competitionName(m.competition_id))} · ${m.match_date || 'No date'} ${m.match_time || ''} · ${escapeHtml(m.venue || 'No venue')}</div>
        </div>
        ${statusHtml}
      </div>
    `;

    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  await loadClubName();
  await Promise.all([loadTeams(), loadCompetitions(), loadPlayerStats()]);
  await loadMatches();

  return { cleanup: null };
}