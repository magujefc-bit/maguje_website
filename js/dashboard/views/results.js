import { router } from '../../router.js';
import { dashPath } from '../config.js';
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('results-view', `
  .comp-nav { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.6rem; margin-bottom: 1rem; }
  .comp-nav-item {
    padding: 0.5rem 1rem; border-radius: 20px; background: #eee; color: #333;
    font-size: 0.85rem; font-weight: 600; white-space: nowrap; cursor: pointer;
    text-decoration: none; flex-shrink: 0;
  }
  .comp-nav-item:hover { background: #e2ece5; }
  .comp-nav-item.active { background: #109b45; color: #fff; }

  .standings-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .standings-table th { text-align: left; background: #eaf6ee; color: #0d7f39; padding: 0.55rem 0.6rem; font-size: 0.75rem; }
  .standings-table th.num, .standings-table td.num { text-align: center; }
  .standings-table td { padding: 0.55rem 0.6rem; border-top: 1px solid #f0f4f1; }
  .standings-table tr.own-club-row { background: #eaf6ee; font-weight: 700; }
  .standings-table td.team-name { display: flex; align-items: center; gap: 0.4rem; }

  .match-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.7rem; }
  .match-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
  .match-matchup { font-weight: 700; font-size: 0.95rem; color: #222; }
  .match-meta { font-size: 0.78rem; color: #888; margin-top: 2px; }
  .status-upcoming { background: #f0f0f0; color: #777; }
  .score-pill { background: #e3f5e8; color: #109b45; font-size: 0.85rem; }
  .match-actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }

  .score-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .score-row input { width: 70px; text-align: center; font-size: 1.1rem; font-weight: 700; }
  .score-vs { font-weight: 700; color: #888; }
  .score-label { font-size: 0.8rem; color: #555; font-weight: 600; margin-bottom: 0.3rem; }

  .squad-table { width: 100%; border-collapse: collapse; }
  .squad-table th { text-align: left; font-size: 0.75rem; color: #888; padding: 0.4rem 0.5rem; border-bottom: 2px solid #f0f4f1; }
  .squad-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #f7f9f8; font-size: 0.85rem; vertical-align: middle; }
  .squad-table input[type="text"] { width: 100px; }
  .squad-table input[type="radio"] { margin-right: 4px; }

  .dynamic-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .dynamic-row select { flex: 1; min-width: 140px; }
  .dynamic-row input[type="number"] { width: 70px; }
`);

export async function resultsView(params, query) {
  const admin = await requireAdmin(['match_manager']);
  if (!admin) return { cleanup: null };

  const matchId = query.get('match');
  let selectedCompetitionId = query.get('competition') || '';

  let allTeams = [];
  let allCompetitions = [];
  let allPlayers = [];
  let ourClubName = 'Our Club';
  let currentMatch = null;

  let squadState = {};
  let subsList = [];
  let cardsList = [];
  let goalsList = [];

  viewContainer.render(`
    <!-- ===================== LIST VIEW (standings + results) ===================== -->
    <div id="list-view">
      <h1>Results</h1>
      <p class="sub">Standings and results by competition.</p>

      <div class="comp-nav" id="comp-nav"></div>

      <div class="card">
        <h2>Standings</h2>
        <p id="standings-status" class="save-status"></p>
        <div id="standings-container"></div>
      </div>

      <div class="card">
        <h2>Matches</h2>
        <p id="matches-status" class="save-status"></p>
        <div id="matches-container"></div>
      </div>
    </div>

    <!-- ===================== FORM VIEW (record a result) ===================== -->
    <div id="form-view" class="hidden">
      <a class="back-link" href="${dashPath('/results')}" id="back-to-list-link">← Back to Results</a>
      <h1 id="form-title">Loading...</h1>
      <p class="sub" id="form-subtitle"></p>

      <div class="card hidden" id="external-form-card">
        <h2>Final Score</h2>
        <div class="score-row">
          <div>
            <div class="score-label" id="ext-team-a-label">Team A</div>
            <input type="number" id="ext-score-a" min="0">
          </div>
          <span class="score-vs">–</span>
          <div>
            <div class="score-label" id="ext-team-b-label">Team B</div>
            <input type="number" id="ext-score-b" min="0">
          </div>
        </div>
        <button id="save-external-btn" class="btn-primary">Save & Complete Match</button>
        <span id="external-save-status" class="save-status"></span>
      </div>

      <div class="card hidden" id="internal-form-card">
        <h2>Final Score</h2>
        <div class="score-row">
          <div>
            <div class="score-label" id="int-us-label">Us</div>
            <input type="number" id="int-score-us" min="0">
          </div>
          <span class="score-vs">–</span>
          <div>
            <div class="score-label" id="int-opponent-label">Opponent</div>
            <input type="number" id="int-score-opponent" min="0">
          </div>
        </div>

        <h3>Squad</h3>
        <p class="empty-msg">Select who's in the squad, and whether they started or were on the bench.</p>
        <table class="squad-table">
          <thead><tr><th>Player</th><th>In Squad</th><th>Starting</th><th>Bench</th><th>Position</th></tr></thead>
          <tbody id="squad-tbody"></tbody>
        </table>

        <h3>Substitutions</h3>
        <div id="subs-rows"></div>
        <button class="btn-secondary" id="add-sub-btn">+ Add Substitution</button>

        <h3>Cards</h3>
        <div id="cards-rows"></div>
        <button class="btn-secondary" id="add-card-btn">+ Add Card</button>

        <h3>Goals</h3>
        <div id="goals-rows"></div>
        <button class="btn-secondary" id="add-goal-btn">+ Add Goal</button>

        <div style="margin-top:1.5rem;">
          <button id="save-internal-btn" class="btn-primary">Save & Complete Match</button>
          <span id="internal-save-status" class="save-status"></span>
        </div>
      </div>

      <div class="card hidden" id="already-locked-card">
        <p class="empty-msg">This match is already completed and locked. Delete and recreate it in Competitions to change the result.</p>
      </div>
    </div>
  `);

  async function loadClubName() {
    const { data } = await supabaseClient.from('club_profile').select('name, crest_url').eq('id', 1).single();
    ourClubName = (data && data.name) ? data.name : 'Our Club';
  }
  async function loadTeams() {
    const { data } = await supabaseClient.from('teams').select('*');
    allTeams = data || [];
  }
  async function loadCompetitions() {
    const { data } = await supabaseClient.from('competitions').select('*').order('start_date', { ascending: false, nullsFirst: false });
    allCompetitions = data || [];
  }
  async function loadPlayers() {
    const { data } = await supabaseClient.from('players').select('*').eq('is_active', true).order('full_name');
    allPlayers = data || [];
  }
  function teamName(id) {
    const t = allTeams.find(t => t.id === id);
    return t ? t.name : 'Unknown team';
  }
  function competitionName(id) {
    const c = allCompetitions.find(c => c.id === id);
    return c ? c.name : 'Unknown competition';
  }
  function playerDisplayName(id) {
    const p = allPlayers.find(p => p.id === id);
    return p ? (p.team_name || p.full_name) : 'Unknown player';
  }
  function scheduledDateTime(m) {
    if (!m.match_date) return new Date(0);
    return new Date(`${m.match_date}T${m.match_time || '00:00'}`);
  }
  function hasKickedOff(m) {
    return scheduledDateTime(m).getTime() <= Date.now();
  }

  // ================= LIST VIEW =================
  async function showListView() {
    document.getElementById('list-view').classList.remove('hidden');
    document.getElementById('form-view').classList.add('hidden');

    if (!selectedCompetitionId && allCompetitions.length) {
      selectedCompetitionId = allCompetitions[0].id;
    }

    renderCompetitionNav();

    if (selectedCompetitionId) {
      await loadStandings();
      await loadCompetitionMatches();
    }
  }

  function renderCompetitionNav() {
    const nav = document.getElementById('comp-nav');

    if (!allCompetitions.length) {
      nav.innerHTML = `<span class="empty-msg">No competitions yet</span>`;
      return;
    }

    nav.innerHTML = allCompetitions.map(c => `
      <a href="#" class="comp-nav-item ${c.id === selectedCompetitionId ? 'active' : ''}" data-id="${c.id}">
        ${escapeHtml(c.name)}${c.season ? ` (${escapeHtml(c.season)})` : ''}
      </a>
    `).join('');

    nav.querySelectorAll('.comp-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        selectedCompetitionId = item.dataset.id;
        history.replaceState(null, '', `${dashPath('/results')}?competition=${selectedCompetitionId}`);
        renderCompetitionNav();
        loadStandings();
        loadCompetitionMatches();
      });
    });
  }

  async function loadStandings() {
    const statusEl = document.getElementById('standings-status');
    const container = document.getElementById('standings-container');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('v_standings')
      .select('*')
      .eq('competition_id', selectedCompetitionId);

    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
    statusEl.textContent = '';

    if (!data.length) {
      container.innerHTML = `<div class="empty-msg">No standings yet — no completed matches in this competition.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="standings-table">
        <thead>
          <tr>
            <th>Team</th>
            <th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th>
            <th class="num">GF</th><th class="num">GA</th><th class="num">GD</th><th class="num">Pts</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr class="${row.team_key === 'own' ? 'own-club-row' : ''}">
              <td class="team-name">${row.team_key === 'own' ? '⭐ ' : ''}${escapeHtml(row.team_name || 'Unknown')}</td>
              <td class="num">${row.played}</td>
              <td class="num">${row.won}</td>
              <td class="num">${row.drawn}</td>
              <td class="num">${row.lost}</td>
              <td class="num">${row.goals_for}</td>
              <td class="num">${row.goals_against}</td>
              <td class="num">${row.goal_difference}</td>
              <td class="num"><strong>${row.points}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async function loadCompetitionMatches() {
    const statusEl = document.getElementById('matches-status');
    const container = document.getElementById('matches-container');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('competition_id', selectedCompetitionId);

    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
    statusEl.textContent = '';

    if (!data.length) {
      container.innerHTML = `<div class="empty-msg">No matches in this competition yet.</div>`;
      return;
    }

    const sorted = [...data].sort((a, b) => scheduledDateTime(b) - scheduledDateTime(a));

    container.innerHTML = '';
    sorted.forEach(m => container.appendChild(renderMatchListItem(m)));
  }

  function renderMatchListItem(m) {
    const card = document.createElement('div');
    card.className = 'match-card';

    let matchupText;
    if (m.is_internal) {
      const homeSide = m.is_home ? ourClubName : teamName(m.opponent_team_id);
      const awaySide = m.is_home ? teamName(m.opponent_team_id) : ourClubName;
      matchupText = `${homeSide} vs ${awaySide}`;
    } else {
      matchupText = `${teamName(m.team_a_id)} vs ${teamName(m.team_b_id)}`;
    }

    let rightSideHtml = '';

    if (m.status === 'completed') {
      const homeScore = m.is_internal ? (m.is_home ? m.our_score : m.opponent_score) : m.team_a_score;
      const awayScore = m.is_internal ? (m.is_home ? m.opponent_score : m.our_score) : m.team_b_score;
      rightSideHtml = `<span class="status-pill score-pill">${homeScore} – ${awayScore}</span>`;
    } else if (m.status === 'cancelled') {
      rightSideHtml = `<span class="status-pill status-cancelled">Cancelled</span>`;
    } else if (m.status === 'postponed') {
      rightSideHtml = `<span class="status-pill status-postponed">Postponed</span>`;
    } else {
      // status === "scheduled"
      const isLive = m.is_internal && m.live_state && m.live_state !== 'not_started';
      const actions = [];

      if (isLive) {
        actions.push(`<a class="btn-secondary" style="text-decoration:none;" href="${dashPath('/live-match')}?match=${m.id}">🔴 Manage Live</a>`);
      } else {
        if (m.is_internal) {
          actions.push(`<a class="btn-secondary" style="text-decoration:none;" href="${dashPath('/live-match')}?match=${m.id}">▶️ Go Live</a>`);
        }
        if (hasKickedOff(m)) {
          actions.push(`<a class="btn-primary" style="text-decoration:none;" href="${dashPath('/results')}?match=${m.id}&competition=${selectedCompetitionId}">Record Result</a>`);
        } else {
          actions.push(`<span class="status-pill status-upcoming">Upcoming</span>`);
        }
      }

      rightSideHtml = `<div class="match-actions">${actions.join('')}</div>`;
    }

    card.innerHTML = `
      <div class="match-top">
        <div>
          <div class="match-matchup">${escapeHtml(matchupText)}</div>
          <div class="match-meta">${m.match_date || 'No date'} ${m.match_time || ''} · ${escapeHtml(m.venue || 'No venue')}</div>
        </div>
        ${rightSideHtml}
      </div>
    `;

    return card;
  }

  // ================= FORM VIEW =================
  async function showForm(id) {
    document.getElementById('list-view').classList.add('hidden');
    document.getElementById('form-view').classList.remove('hidden');

    const backLink = document.getElementById('back-to-list-link');
    backLink.href = selectedCompetitionId ? `${dashPath('/results')}?competition=${selectedCompetitionId}` : dashPath('/results');

    const { data, error } = await supabaseClient.from('matches').select('*').eq('id', id).single();
    if (error || !data) {
      document.getElementById('main').innerHTML = `<h1>Match not found</h1><p class="sub"><a href="${dashPath('/results')}">Go back</a></p>`;
      return;
    }

    currentMatch = data;
    if (!selectedCompetitionId) selectedCompetitionId = currentMatch.competition_id;

    if (currentMatch.status === 'completed') {
      document.getElementById('form-title').textContent = 'Already completed';
      document.getElementById('already-locked-card').classList.remove('hidden');
      return;
    }

    if (!hasKickedOff(currentMatch)) {
      document.getElementById('form-title').textContent = "This match hasn't kicked off yet";
      document.getElementById('form-subtitle').textContent = `Scheduled for ${currentMatch.match_date} ${currentMatch.match_time}. Results can only be recorded once kickoff time has passed.`;
      return;
    }

    if (currentMatch.is_internal) {
      setupInternalForm();
    } else {
      setupExternalForm();
    }
  }

  function setupExternalForm() {
    const teamAName = teamName(currentMatch.team_a_id);
    const teamBName = teamName(currentMatch.team_b_id);

    document.getElementById('form-title').textContent = `${teamAName} vs ${teamBName}`;
    document.getElementById('form-subtitle').textContent = `${competitionName(currentMatch.competition_id)} · ${currentMatch.match_date} ${currentMatch.match_time}`;
    document.getElementById('external-form-card').classList.remove('hidden');
    document.getElementById('ext-team-a-label').textContent = teamAName;
    document.getElementById('ext-team-b-label').textContent = teamBName;

    document.getElementById('save-external-btn').addEventListener('click', async () => {
      const statusEl = document.getElementById('external-save-status');
      const scoreA = document.getElementById('ext-score-a').value;
      const scoreB = document.getElementById('ext-score-b').value;

      if (scoreA === '' || scoreB === '') {
        statusEl.textContent = 'Both scores are required.';
        statusEl.classList.add('error');
        return;
      }

      const { error } = await supabaseClient
        .from('matches')
        .update({ team_a_score: parseInt(scoreA), team_b_score: parseInt(scoreB), status: 'completed' })
        .eq('id', currentMatch.id);

      if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
      router.navigate(`${dashPath('/results')}?competition=${selectedCompetitionId}`, { replace: true });
    });
  }

  function setupInternalForm() {
    const homeSide = currentMatch.is_home ? ourClubName : teamName(currentMatch.opponent_team_id);
    const awaySide = currentMatch.is_home ? teamName(currentMatch.opponent_team_id) : ourClubName;

    document.getElementById('form-title').textContent = `${homeSide} vs ${awaySide}`;
    document.getElementById('form-subtitle').textContent = `${competitionName(currentMatch.competition_id)} · ${currentMatch.match_date} ${currentMatch.match_time}`;
    document.getElementById('internal-form-card').classList.remove('hidden');
    document.getElementById('int-us-label').textContent = ourClubName;
    document.getElementById('int-opponent-label').textContent = teamName(currentMatch.opponent_team_id);

    allPlayers.forEach(p => {
      squadState[p.id] = { included: false, role: 'bench', position_played: p.position || '' };
    });

    renderSquadTable();
    renderSubsRows();
    renderCardsRows();
    renderGoalsRows();

    document.getElementById('add-sub-btn').addEventListener('click', () => {
      subsList.push({ player_out_id: '', player_in_id: '', minute: '' });
      renderSubsRows();
    });
    document.getElementById('add-card-btn').addEventListener('click', () => {
      cardsList.push({ player_id: '', card_type: 'yellow', minute: '' });
      renderCardsRows();
    });
    document.getElementById('add-goal-btn').addEventListener('click', () => {
      goalsList.push({ scorer_id: '', assist_id: '', minute: '' });
      renderGoalsRows();
    });

    document.getElementById('save-internal-btn').addEventListener('click', saveInternalResult);
  }

  function renderSquadTable() {
    const tbody = document.getElementById('squad-tbody');
    tbody.innerHTML = '';

    allPlayers.forEach(p => {
      const state = squadState[p.id];
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(p.team_name || p.full_name)}</td>
        <td><input type="checkbox" class="squad-included" data-player="${p.id}" ${state.included ? 'checked' : ''}></td>
        <td><input type="radio" name="role-${p.id}" class="squad-role" value="starting" data-player="${p.id}" ${state.role === 'starting' ? 'checked' : ''} ${!state.included ? 'disabled' : ''}></td>
        <td><input type="radio" name="role-${p.id}" class="squad-role" value="bench" data-player="${p.id}" ${state.role === 'bench' ? 'checked' : ''} ${!state.included ? 'disabled' : ''}></td>
        <td><input type="text" class="squad-position" data-player="${p.id}" value="${escapeAttr(state.position_played)}" ${!state.included ? 'disabled' : ''}></td>
      `;
      tbody.appendChild(row);
    });

    tbody.querySelectorAll('.squad-included').forEach(cb => {
      cb.addEventListener('change', () => {
        squadState[cb.dataset.player].included = cb.checked;
        renderSquadTable();
        renderSubsRows(); renderCardsRows(); renderGoalsRows();
      });
    });
    tbody.querySelectorAll('.squad-role').forEach(radio => {
      radio.addEventListener('change', () => {
        squadState[radio.dataset.player].role = radio.value;
        renderSubsRows();
      });
    });
    tbody.querySelectorAll('.squad-position').forEach(input => {
      input.addEventListener('input', () => {
        squadState[input.dataset.player].position_played = input.value;
      });
    });
  }

  function squadIds(roleFilter) {
    return Object.entries(squadState)
      .filter(([id, s]) => s.included && (!roleFilter || s.role === roleFilter))
      .map(([id]) => id);
  }
  function playerOptionsHtml(ids, selectedId) {
    return `<option value="">—</option>` + ids.map(id =>
      `<option value="${id}" ${id === selectedId ? 'selected' : ''}>${escapeHtml(playerDisplayName(id))}</option>`
    ).join('');
  }

  function renderSubsRows() {
    const container = document.getElementById('subs-rows');
    const starters = squadIds('starting');
    const bench = squadIds('bench');

    container.innerHTML = subsList.map((sub, idx) => `
      <div class="dynamic-row">
        <select data-idx="${idx}" data-field="player_out_id">${playerOptionsHtml(starters, sub.player_out_id)}</select>
        <span>→</span>
        <select data-idx="${idx}" data-field="player_in_id">${playerOptionsHtml(bench, sub.player_in_id)}</select>
        <input type="number" placeholder="min" data-idx="${idx}" data-field="minute" value="${sub.minute}">
        <button class="btn-danger remove-sub-btn" data-idx="${idx}">Remove</button>
      </div>
    `).join('') || `<p class="empty-msg">No substitutions added.</p>`;

    container.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('input', () => { subsList[el.dataset.idx][el.dataset.field] = el.value; });
    });
    container.querySelectorAll('.remove-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => { subsList.splice(btn.dataset.idx, 1); renderSubsRows(); });
    });
  }

  function renderCardsRows() {
    const container = document.getElementById('cards-rows');
    const squad = squadIds();

    container.innerHTML = cardsList.map((c, idx) => `
      <div class="dynamic-row">
        <select data-idx="${idx}" data-field="player_id">${playerOptionsHtml(squad, c.player_id)}</select>
        <select data-idx="${idx}" data-field="card_type">
          <option value="yellow" ${c.card_type === 'yellow' ? 'selected' : ''}>Yellow</option>
          <option value="red" ${c.card_type === 'red' ? 'selected' : ''}>Red</option>
        </select>
        <input type="number" placeholder="min" data-idx="${idx}" data-field="minute" value="${c.minute}">
        <button class="btn-danger remove-card-btn" data-idx="${idx}">Remove</button>
      </div>
    `).join('') || `<p class="empty-msg">No cards added.</p>`;

    container.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('input', () => { cardsList[el.dataset.idx][el.dataset.field] = el.value; });
    });
    container.querySelectorAll('.remove-card-btn').forEach(btn => {
      btn.addEventListener('click', () => { cardsList.splice(btn.dataset.idx, 1); renderCardsRows(); });
    });
  }

  function renderGoalsRows() {
    const container = document.getElementById('goals-rows');
    const squad = squadIds();

    container.innerHTML = goalsList.map((g, idx) => `
      <div class="dynamic-row">
        <select data-idx="${idx}" data-field="scorer_id">${playerOptionsHtml(squad, g.scorer_id)}</select>
        <span>assist:</span>
        <select data-idx="${idx}" data-field="assist_id">${playerOptionsHtml(squad, g.assist_id)}</select>
        <input type="number" placeholder="min" data-idx="${idx}" data-field="minute" value="${g.minute}">
        <button class="btn-danger remove-goal-btn" data-idx="${idx}">Remove</button>
      </div>
    `).join('') || `<p class="empty-msg">No goals added.</p>`;

    container.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('input', () => { goalsList[el.dataset.idx][el.dataset.field] = el.value; });
    });
    container.querySelectorAll('.remove-goal-btn').forEach(btn => {
      btn.addEventListener('click', () => { goalsList.splice(btn.dataset.idx, 1); renderGoalsRows(); });
    });
  }

  async function saveInternalResult() {
    const statusEl = document.getElementById('internal-save-status');
    const scoreUs = document.getElementById('int-score-us').value;
    const scoreOpponent = document.getElementById('int-score-opponent').value;

    if (scoreUs === '' || scoreOpponent === '') {
      statusEl.textContent = 'Both scores are required.';
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = 'Saving...';
    statusEl.classList.remove('error');

    try {
      const lineupRows = Object.entries(squadState)
        .filter(([id, s]) => s.included)
        .map(([id, s]) => ({
          match_id: currentMatch.id, player_id: id,
          is_starter: s.role === 'starting', position_played: s.position_played || null,
        }));
      if (lineupRows.length) {
        const { error } = await supabaseClient.from('match_lineups').insert(lineupRows);
        if (error) throw error;
      }

      const subRows = subsList.filter(s => s.player_out_id && s.player_in_id).map(s => ({
        match_id: currentMatch.id, player_out_id: s.player_out_id, player_in_id: s.player_in_id,
        minute: s.minute ? parseInt(s.minute) : null,
      }));
      if (subRows.length) {
        const { error } = await supabaseClient.from('match_substitutions').insert(subRows);
        if (error) throw error;
      }

      const cardRows = cardsList.filter(c => c.player_id).map(c => ({
        match_id: currentMatch.id, player_id: c.player_id, card_type: c.card_type,
        minute: c.minute ? parseInt(c.minute) : null,
      }));
      if (cardRows.length) {
        const { error } = await supabaseClient.from('match_cards').insert(cardRows);
        if (error) throw error;
      }

      const goalRows = goalsList.filter(g => g.scorer_id).map(g => ({
        match_id: currentMatch.id, scorer_id: g.scorer_id, assist_id: g.assist_id || null,
        minute: g.minute ? parseInt(g.minute) : null,
      }));
      if (goalRows.length) {
        const { error } = await supabaseClient.from('match_goals').insert(goalRows);
        if (error) throw error;
      }

      const { error: finalError } = await supabaseClient
        .from('matches')
        .update({ our_score: parseInt(scoreUs), opponent_score: parseInt(scoreOpponent), status: 'completed' })
        .eq('id', currentMatch.id);
      if (finalError) throw finalError;

      router.navigate(`${dashPath('/results')}?competition=${selectedCompetitionId}`, { replace: true });
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}. Some data may have partially saved — check the match before retrying.`;
      statusEl.classList.add('error');
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  await loadClubName();
  await Promise.all([loadTeams(), loadCompetitions(), loadPlayers()]);

  if (matchId) {
    await showForm(matchId);
  } else {
    await showListView();
  }

  return { cleanup: null };
}
