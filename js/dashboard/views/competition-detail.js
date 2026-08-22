import { dashPath } from '../config.js';
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('competition-detail-view', `
  .autocomplete-wrap { position: relative; }
  .autocomplete-list { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #d3ded6; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); z-index: 10; max-height: 160px; overflow-y: auto; }
  .autocomplete-item { padding: 0.5rem 0.7rem; font-size: 0.85rem; cursor: pointer; }
  .autocomplete-item:hover { background: #eaf6ee; }
  .autocomplete-item.club-suggestion { color: #109b45; font-weight: 700; }

  .match-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
  .match-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; }
  .match-matchup { font-weight: 700; font-size: 0.98rem; color: #222; }
  .match-meta { font-size: 0.78rem; color: #888; margin-top: 2px; }
  .score-pill { background: #e3f5e8; color: #109b45; font-size: 0.85rem; }
  .lock-note { font-size: 0.75rem; color: #999; font-style: italic; }
  .item-actions { display: flex; gap: 0.4rem; }

  .stats-box { margin-top: 0.7rem; padding: 0.7rem; background: #f7faf8; border-radius: 8px; font-size: 0.82rem; color: #444; }
  .stats-box h4 { margin: 0 0 0.4rem; font-size: 0.8rem; color: #109b45; }
  .stats-box ul { margin: 0; padding-left: 1.1rem; }
`);

export async function competitionDetailView(params, query) {
  const admin = await requireAdmin(['match_manager']);
  if (!admin) return { cleanup: null };

  const competitionId = query.get('id');

  let competition = null;
  let allTeams = [];
  let allMatches = [];
  let ourClubName = 'Our Club';
  let ourClubHomeGround = '';

  viewContainer.render(`
    <a class="back-link" href="${dashPath('/competitions')}">← Back to Competitions</a>
    <h1 id="comp-title">Loading...</h1>
    <p class="sub" id="comp-subtitle"></p>

    <div class="card">
      <h2>Add Match</h2>
      <div class="field-grid">
        <div class="autocomplete-wrap">
          <label>Home</label>
          <input type="text" id="new-home-input" placeholder="Type or search team name">
          <div class="autocomplete-list hidden" id="new-home-suggestions"></div>
        </div>
        <div class="autocomplete-wrap">
          <label>Away</label>
          <input type="text" id="new-away-input" placeholder="Type or search team name">
          <div class="autocomplete-list hidden" id="new-away-suggestions"></div>
        </div>
      </div>
      <div class="field-grid three">
        <div>
          <label>Venue</label>
          <input type="text" id="new-venue-input" placeholder="Auto-fills from home team">
        </div>
        <div>
          <label>Match Date *</label>
          <input type="date" id="new-date-input" required>
        </div>
        <div>
          <label>Kickoff Time *</label>
          <input type="time" id="new-time-input" required>
        </div>
      </div>
      <button id="create-match-btn" class="btn-primary">Add Match</button>
      <span id="create-match-status" class="save-status"></span>
    </div>

    <div class="card">
      <h2>Matches</h2>
      <p id="matches-load-status" class="save-status"></p>
      <div id="matches-list"></div>
    </div>

    <div class="modal-overlay hidden" id="modal-overlay">
      <div class="modal-box">
        <p id="modal-message"></p>
        <div>
          <label for="modal-home-ground">Home Ground (optional)</label>
          <input type="text" id="modal-home-ground" placeholder="e.g. County Stadium">
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
          <button class="btn-primary" id="modal-confirm-btn">Yes, Save Team</button>
        </div>
      </div>
    </div>
  `);

  if (!competitionId) {
    document.getElementById('main').innerHTML =
      `<h1>No competition selected</h1><p class="sub"><a href="${dashPath('/competitions')}">Go back to Competitions</a></p>`;
    return { cleanup: null };
  }

  async function loadClubName() {
    const { data } = await supabaseClient.from('club_profile').select('name, home_ground').eq('id', 1).single();
    ourClubName = (data && data.name) ? data.name : 'Our Club';
    ourClubHomeGround = (data && data.home_ground) ? data.home_ground : '';
  }

  function isClubName(name) {
    return name.trim().toLowerCase() === ourClubName.trim().toLowerCase();
  }

  function homeGroundFor(name) {
    if (isClubName(name)) return ourClubHomeGround;
    const t = allTeams.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
    return t ? (t.home_ground || '') : null;
  }

  async function loadCompetition() {
    const { data, error } = await supabaseClient.from('competitions').select('*').eq('id', competitionId).single();
    if (error || !data) {
      document.getElementById('main').innerHTML =
        `<h1>Competition not found</h1><p class="sub"><a href="${dashPath('/competitions')}">Go back to Competitions</a></p>`;
      return;
    }
    competition = data;
    document.getElementById('comp-title').textContent = competition.name;
    document.getElementById('comp-subtitle').textContent =
      `${competition.type || '—'} · ${competition.season || 'No season'} · ${competition.start_date || '—'} to ${competition.end_date || '—'}`;
  }

  async function loadTeams() {
    const { data, error } = await supabaseClient.from('teams').select('*').order('name');
    if (!error) allTeams = data;
  }

  function teamName(id) {
    const t = allTeams.find(t => t.id === id);
    return t ? t.name : 'Unknown team';
  }

  // ---------- AUTOCOMPLETE (with home-ground autofill for the Home field) ----------
  function attachAutocomplete(inputEl, listEl, autofillVenue) {
    inputEl.addEventListener('input', () => {
      const val = inputEl.value.trim().toLowerCase();
      if (!val) { listEl.classList.add('hidden'); listEl.innerHTML = ''; return; }

      let html = '';
      if (ourClubName.toLowerCase().includes(val)) {
        html += `<div class="autocomplete-item club-suggestion" data-name="${escapeAttr(ourClubName)}">⭐ ${escapeHtml(ourClubName)}</div>`;
      }

      const matches = allTeams.filter(t => t.name.toLowerCase().includes(val)).slice(0, 6);
      html += matches.map(t => `<div class="autocomplete-item" data-name="${escapeAttr(t.name)}">${escapeHtml(t.name)}</div>`).join('');

      if (!html) { listEl.classList.add('hidden'); listEl.innerHTML = ''; return; }

      listEl.innerHTML = html;
      listEl.classList.remove('hidden');

      listEl.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          inputEl.value = item.dataset.name;
          listEl.classList.add('hidden');
          if (autofillVenue) applyVenueAutofill(item.dataset.name);
        });
      });
    });

    if (autofillVenue) {
      inputEl.addEventListener('blur', () => {
        setTimeout(() => applyVenueAutofill(inputEl.value), 150);
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target !== inputEl) listEl.classList.add('hidden');
    });
  }

  function applyVenueAutofill(name) {
    const ground = homeGroundFor(name);
    if (ground) {
      const venueInput = document.getElementById('new-venue-input');
      venueInput.value = ground;
    }
  }

  // ---------- NEW-TEAM CONFIRMATION MODAL (with Home Ground field) ----------
  function confirmNewTeam(name) {
    return new Promise((resolve) => {
      document.getElementById('modal-message').textContent =
        `"${name}" is a new team. Do you want to save it to the system?`;
      document.getElementById('modal-home-ground').value = '';
      document.getElementById('modal-overlay').classList.remove('hidden');

      const confirmBtn = document.getElementById('modal-confirm-btn');
      const cancelBtn = document.getElementById('modal-cancel-btn');

      function cleanup(result) {
        document.getElementById('modal-overlay').classList.add('hidden');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onConfirm() {
        cleanup({ proceed: true, homeGround: document.getElementById('modal-home-ground').value.trim() || null });
      }
      function onCancel() { cleanup({ proceed: false }); }

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  async function resolveTeamId(rawName) {
    const name = rawName.trim();
    const existing = allTeams.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    const result = await confirmNewTeam(name);
    if (!result.proceed) return undefined;

    const { data, error } = await supabaseClient
      .from('teams')
      .insert({ name, home_ground: result.homeGround })
      .select()
      .single();
    if (error) throw error;
    allTeams.push(data);
    return data.id;
  }

  // ---------- CREATE MATCH ----------
  document.getElementById('create-match-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('create-match-status');
    const homeName = document.getElementById('new-home-input').value.trim();
    const awayName = document.getElementById('new-away-input').value.trim();
    const venue = document.getElementById('new-venue-input').value.trim() || null;
    const match_date = document.getElementById('new-date-input').value;
    const match_time = document.getElementById('new-time-input').value;

    if (!homeName || !awayName) { statusEl.textContent = 'Both Home and Away are required.'; statusEl.classList.add('error'); return; }
    if (!match_date || !match_time) { statusEl.textContent = 'Match date and kickoff time are both required.'; statusEl.classList.add('error'); return; }
    if (isClubName(homeName) && isClubName(awayName)) { statusEl.textContent = "Your club can't play itself."; statusEl.classList.add('error'); return; }

    statusEl.textContent = '';
    statusEl.classList.remove('error');

    try {
      let payload = { competition_id: competitionId, match_date, match_time, venue, status: 'scheduled' };

      if (isClubName(homeName) || isClubName(awayName)) {
        payload.is_internal = true;
        payload.is_home = isClubName(homeName);
        const opponentName = isClubName(homeName) ? awayName : homeName;
        const opponentId = await resolveTeamId(opponentName);
        if (opponentId === undefined) { statusEl.textContent = 'Cancelled — fix the team name and try again.'; return; }
        payload.opponent_team_id = opponentId;
      } else {
        payload.is_internal = false;
        const teamAId = await resolveTeamId(homeName);
        if (teamAId === undefined) { statusEl.textContent = 'Cancelled — fix the team name and try again.'; return; }
        const teamBId = await resolveTeamId(awayName);
        if (teamBId === undefined) { statusEl.textContent = 'Cancelled — fix the team name and try again.'; return; }
        payload.team_a_id = teamAId;
        payload.team_b_id = teamBId;
      }

      const { error } = await supabaseClient.from('matches').insert(payload);
      if (error) throw error;

      document.getElementById('new-home-input').value = '';
      document.getElementById('new-away-input').value = '';
      document.getElementById('new-venue-input').value = '';
      document.getElementById('new-date-input').value = '';
      document.getElementById('new-time-input').value = '';

      statusEl.textContent = 'Match added ✓';
      setTimeout(() => { statusEl.textContent = ''; }, 2500);
      loadMatches();
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.classList.add('error');
    }
  });

  // ---------- LOAD + RENDER MATCHES ----------
  async function loadMatches() {
    const statusEl = document.getElementById('matches-load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('competition_id', competitionId);

    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    statusEl.textContent = '';
    allMatches = data;
    renderMatchesList();
  }

  function scheduledDateTime(m) {
    if (!m.match_date) return new Date(0);
    return new Date(`${m.match_date}T${m.match_time || '00:00'}`);
  }

  function hasKickedOff(m) {
    return scheduledDateTime(m).getTime() <= Date.now();
  }

  function renderMatchesList() {
    const list = document.getElementById('matches-list');
    if (!allMatches.length) {
      list.innerHTML = `<div class="empty-msg">No matches yet.</div>`;
      return;
    }

    const sorted = [...allMatches].sort((a, b) => scheduledDateTime(b) - scheduledDateTime(a));

    list.innerHTML = '';
    sorted.forEach(m => list.appendChild(renderMatchCard(m)));
  }

  function renderMatchCard(m) {
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

    const isLocked = m.status === 'completed';

    let statusPillHtml;
    if (isLocked) {
      const homeScore = m.is_internal ? (m.is_home ? m.our_score : m.opponent_score) : m.team_a_score;
      const awayScore = m.is_internal ? (m.is_home ? m.opponent_score : m.our_score) : m.team_b_score;
      statusPillHtml = `<span class="status-pill score-pill">${homeScore} – ${awayScore}</span>`;
    } else {
      statusPillHtml = `<span class="status-pill status-${m.status}">${m.status}</span>`;
    }

    let liveControlHtml = '';
    if (m.status === 'scheduled') {
      const isLive = m.is_internal && m.live_state && m.live_state !== 'not_started';
      const actions = [];

      if (isLive) {
        actions.push(`<a class="btn-secondary" style="text-decoration:none;" href="${dashPath('/live-match')}?match=${m.id}">🔴 Manage Live</a>`);
      } else {
        if (m.is_internal) {
          actions.push(`<a class="btn-secondary" style="text-decoration:none;" href="${dashPath('/live-match')}?match=${m.id}">▶️ Go Live</a>`);
        }
        if (hasKickedOff(m)) {
          actions.push(`<a class="btn-primary" style="text-decoration:none;" href="${dashPath('/results')}?match=${m.id}&competition=${m.competition_id}">Record Result</a>`);
        }
      }

      liveControlHtml = actions.length ? `<div style="margin-top:0.4rem; display:flex; gap:0.4rem; flex-wrap:wrap;">${actions.join('')}</div>` : '';
    }

    card.innerHTML = `
      <div class="match-top">
        <div>
          <div class="match-matchup">${escapeHtml(matchupText)}</div>
          <div class="match-meta">${m.match_date || 'No date'} ${m.match_time || ''} · ${escapeHtml(m.venue || 'No venue')}</div>
        </div>
        <div style="text-align:right;">
          ${statusPillHtml}
          ${liveControlHtml}
          <div class="item-actions" style="margin-top:0.5rem;">
            ${isLocked
              ? '<span class="lock-note">🔒 Locked — kept for record-keeping</span>'
              : '<button class="btn-secondary edit-match-btn">Edit</button><button class="btn-danger delete-match-btn">Delete</button>'}
          </div>
        </div>
      </div>
      <div class="stats-container"></div>
    `;

    if (!isLocked) {
      card.querySelector('.edit-match-btn').addEventListener('click', () => enterMatchEditMode(card, m));
      card.querySelector('.delete-match-btn').addEventListener('click', async () => {
        if (!confirm('Delete this match? This also removes any recorded match events.')) return;
        const { error } = await supabaseClient.from('matches').delete().eq('id', m.id);
        if (error) { alert(error.message); return; }
        loadMatches();
      });
    } else if (m.is_internal) {
      loadMatchStats(card, m);
    }

    return card;
  }

  function enterMatchEditMode(card, m) {
    const isOur = m.is_internal;
    const homeName = isOur ? (m.is_home ? ourClubName : teamName(m.opponent_team_id)) : teamName(m.team_a_id);
    const awayName = isOur ? (m.is_home ? teamName(m.opponent_team_id) : ourClubName) : teamName(m.team_b_id);

    card.innerHTML = `
      <div class="field-grid">
        <div class="autocomplete-wrap">
          <label>Home</label>
          <input type="text" class="edit-home-input" value="${escapeAttr(homeName)}">
          <div class="autocomplete-list hidden edit-home-suggestions"></div>
        </div>
        <div class="autocomplete-wrap">
          <label>Away</label>
          <input type="text" class="edit-away-input" value="${escapeAttr(awayName)}">
          <div class="autocomplete-list hidden edit-away-suggestions"></div>
        </div>
      </div>
      <div class="field-grid three">
        <div>
          <label>Venue</label>
          <input type="text" class="edit-venue-input" value="${escapeAttr(m.venue || '')}">
        </div>
        <div>
          <label>Match Date *</label>
          <input type="date" class="edit-date-input" value="${m.match_date || ''}" required>
        </div>
        <div>
          <label>Kickoff Time *</label>
          <input type="time" class="edit-time-input" value="${m.match_time || ''}" required>
        </div>
      </div>
      <div class="field-grid">
        <div>
          <label>Status</label>
          <select class="edit-status-input">
            <option value="scheduled" ${m.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
            <option value="postponed" ${m.status === 'postponed' ? 'selected' : ''}>Postponed</option>
            <option value="cancelled" ${m.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
        <div></div>
      </div>
      <div class="item-actions">
        <button class="btn-primary save-match-btn">Save</button>
        <button class="btn-secondary cancel-match-btn">Cancel</button>
      </div>
      <span class="save-status edit-match-status"></span>
    `;

    const homeInput = card.querySelector('.edit-home-input');
    attachAutocomplete(homeInput, card.querySelector('.edit-home-suggestions'), true);
    attachAutocomplete(card.querySelector('.edit-away-input'), card.querySelector('.edit-away-suggestions'), false);

    card.querySelector('.cancel-match-btn').addEventListener('click', () => renderMatchesList());

    card.querySelector('.save-match-btn').addEventListener('click', async () => {
      const statusEl = card.querySelector('.edit-match-status');
      const newHomeName = card.querySelector('.edit-home-input').value.trim();
      const newAwayName = card.querySelector('.edit-away-input').value.trim();
      const venue = card.querySelector('.edit-venue-input').value.trim() || null;
      const match_date = card.querySelector('.edit-date-input').value;
      const match_time = card.querySelector('.edit-time-input').value;
      const status = card.querySelector('.edit-status-input').value;

      if (!newHomeName || !newAwayName) { statusEl.textContent = 'Both Home and Away are required.'; statusEl.classList.add('error'); return; }
      if (!match_date || !match_time) { statusEl.textContent = 'Match date and kickoff time are both required.'; statusEl.classList.add('error'); return; }
      if (isClubName(newHomeName) && isClubName(newAwayName)) { statusEl.textContent = "Your club can't play itself."; statusEl.classList.add('error'); return; }

      try {
        let payload = { venue, match_date, match_time, status };

        if (isClubName(newHomeName) || isClubName(newAwayName)) {
          payload.is_internal = true;
          payload.is_home = isClubName(newHomeName);
          const opponentName = isClubName(newHomeName) ? newAwayName : newHomeName;
          const opponentId = await resolveTeamId(opponentName);
          if (opponentId === undefined) { statusEl.textContent = 'Cancelled.'; return; }
          payload.opponent_team_id = opponentId;
          payload.team_a_id = null;
          payload.team_b_id = null;
        } else {
          payload.is_internal = false;
          const teamAId = await resolveTeamId(newHomeName);
          if (teamAId === undefined) { statusEl.textContent = 'Cancelled.'; return; }
          const teamBId = await resolveTeamId(newAwayName);
          if (teamBId === undefined) { statusEl.textContent = 'Cancelled.'; return; }
          payload.team_a_id = teamAId;
          payload.team_b_id = teamBId;
          payload.opponent_team_id = null;
          payload.is_home = null;
        }

        const { error } = await supabaseClient.from('matches').update(payload).eq('id', m.id);
        if (error) throw error;
        loadMatches();
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.classList.add('error');
      }
    });
  }

  async function loadMatchStats(card, match) {
    const container = card.querySelector('.stats-container');

    const [{ data: goals }, { data: cards }] = await Promise.all([
      supabaseClient.from('match_goals').select('minute, players!scorer_id(full_name, team_name), assist:players!assist_id(full_name, team_name)').eq('match_id', match.id).order('minute'),
      supabaseClient.from('match_cards').select('minute, card_type, players(full_name, team_name)').eq('match_id', match.id).order('minute'),
    ]);

    let html = `<div class="stats-box">`;

    if (goals && goals.length) {
      html += `<h4>Goals</h4><ul>` + goals.map(g => {
        const scorer = g.players ? (g.players.team_name || g.players.full_name) : 'Unknown';
        const assist = g.assist ? ` (assist: ${escapeHtml(g.assist.team_name || g.assist.full_name)})` : '';
        return `<li>${g.minute ? g.minute + "' " : ''}${escapeHtml(scorer)}${assist}</li>`;
      }).join('') + `</ul>`;
    }

    if (cards && cards.length) {
      html += `<h4 style="margin-top:0.5rem;">Cards</h4><ul>` + cards.map(c => {
        const player = c.players ? (c.players.team_name || c.players.full_name) : 'Unknown';
        return `<li>${c.minute ? c.minute + "' " : ''}${c.card_type === 'yellow' ? '🟨' : '🟥'} ${escapeHtml(player)}</li>`;
      }).join('') + `</ul>`;
    }

    if (!(goals && goals.length) && !(cards && cards.length)) {
      html += `<span class="empty-msg">No goals or cards recorded.</span>`;
    }

    html += `</div>`;
    container.innerHTML = html;
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
  await loadCompetition();
  await loadTeams();
  await loadMatches();

  attachAutocomplete(document.getElementById('new-home-input'), document.getElementById('new-home-suggestions'), true);
  attachAutocomplete(document.getElementById('new-away-input'), document.getElementById('new-away-suggestions'), false);

  return { cleanup: null };
}
