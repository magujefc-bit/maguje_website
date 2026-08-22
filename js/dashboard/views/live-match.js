import { router } from '../../router.js';
import { dashPath } from '../config.js';
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('live-match-view', `
  /* Page-specific only. The scoreboard's own styling lives inside
     the <fab-scoreboard> component's Shadow DOM (fab-scoreboard.js). */
  .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.7rem; margin-bottom: 1rem; }
  .action-btn { background: #eaf6ee; color: #109b45; border: 1px solid #109b4530; padding: 0.8rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; text-align: center; }
  .action-btn:hover { background: #109b45; color: #fff; }

  .phase-btn-row { display: flex; gap: 0.6rem; margin-top: 1rem; }

  .event-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0; border-bottom: 1px solid #f0f4f1; font-size: 0.85rem; }
  .event-row:last-child { border-bottom: none; }
  .event-minute { font-weight: 700; color: #109b45; width: 45px; flex-shrink: 0; }

  .squad-check-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.2rem; border-bottom: 1px solid #f7f9f8; font-size: 0.85rem; }
  .squad-check-row input { width: auto; }
`);

export async function liveMatchView(params, query) {
  const admin = await requireAdmin(['match_manager']);
  if (!admin) return { cleanup: null };

  const matchId = query.get('match');

  let currentMatch = null;
  let ourClubName = 'Our Club';
  let allTeams = [];
  let allPlayers = [];
  let goals = [];
  let cards = [];
  let subs = [];
  let matchLineups = [];
  let squadSets = { onPitch: new Set(), bench: new Set() };
  let pendingGoalSide = 'us';
  let scoreboardMounted = false;

  viewContainer.render(`
    <a class="back-link" id="back-link" href="${dashPath('/competitions')}">← Back</a>
    <h1 id="page-title">Loading...</h1>
    <p class="sub" id="page-sub"></p>

    <div id="scoreboard-slot" style="margin-bottom:1.2rem;"></div>

    <!-- PRE-START -->
    <div class="card" id="pre-start-card">
      <h2>Set Up & Start the Match</h2>
      <div class="field-grid">
        <div>
          <label>First Half Length (minutes)</label>
          <input type="number" id="half1-length-input" value="45" min="1">
        </div>
        <div>
          <label>Second Half Length (minutes)</label>
          <input type="number" id="half2-length-input" value="45" min="1">
        </div>
      </div>
      <h3>Starting XI (max 11)</h3>
      <p class="empty-msg" id="starter-count-label">0 / 11 selected</p>
      <div id="starter-select-list" style="max-height:280px; overflow-y:auto; border:1px solid #f0f4f1; border-radius:8px; padding:0.4rem;"></div>
      <button id="start-game-btn" class="btn-primary" style="margin-top:1rem;">▶️ Start Game</button>
      <span id="start-status" class="save-status"></span>
    </div>

    <!-- LIVE CONTROLS -->
    <div class="card hidden" id="live-controls-card">
      <h2>Match Actions</h2>
      <div class="action-grid">
        <div class="action-btn" id="record-our-goal-btn">⚽ Our Goal</div>
        <div class="action-btn" id="record-opponent-goal-btn">🥅 Opponent Goal</div>
        <div class="action-btn" id="record-card-btn">🟨 Record Card</div>
        <div class="action-btn" id="record-sub-btn">🔄 Substitution</div>
      </div>
      <div class="phase-btn-row" id="phase-btn-row"></div>
      <span id="live-action-status" class="save-status"></span>
    </div>

    <div class="card">
      <h2>Match Events</h2>
      <div id="events-list"><div class="empty-msg">No events yet.</div></div>
    </div>

    <!-- Goal modal -->
    <div class="modal-overlay hidden" id="goal-modal">
      <div class="modal-box">
        <h3 id="goal-modal-title">Record Goal</h3>
        <div id="goal-our-fields">
          <div class="field-grid">
            <div><label>Scorer</label><select id="goal-scorer-select"></select></div>
            <div><label>Assist (optional)</label><select id="goal-assist-select"><option value="">—</option></select></div>
          </div>
        </div>
        <div id="goal-opponent-note" class="hidden">
          <p class="empty-msg">This records a goal for the opponent — no scorer needed, just the time.</p>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="goal-cancel-btn">Cancel</button>
          <button class="btn-primary" id="goal-save-btn">Save Goal</button>
        </div>
        <span id="goal-status" class="save-status"></span>
      </div>
    </div>

    <!-- Card modal -->
    <div class="modal-overlay hidden" id="card-modal">
      <div class="modal-box">
        <h3>Record Card</h3>
        <div class="field-grid">
          <div><label>Player (on pitch)</label><select id="card-player-select"></select></div>
          <div><label>Type</label><select id="card-type-select"><option value="yellow">Yellow</option><option value="red">Red</option></select></div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="card-cancel-btn">Cancel</button>
          <button class="btn-primary" id="card-save-btn">Save Card</button>
        </div>
        <span id="card-status" class="save-status"></span>
      </div>
    </div>

    <!-- Substitution modal -->
    <div class="modal-overlay hidden" id="sub-modal">
      <div class="modal-box">
        <h3>Record Substitution</h3>
        <div class="field-grid">
          <div><label>Player Out (on pitch)</label><select id="sub-out-select"></select></div>
          <div><label>Player In (bench)</label><select id="sub-in-select"></select></div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="sub-cancel-btn">Cancel</button>
          <button class="btn-primary" id="sub-save-btn">Save Substitution</button>
        </div>
        <span id="sub-status" class="save-status"></span>
      </div>
    </div>

    <!-- Draw handling modal -->
    <div class="modal-overlay hidden" id="draw-modal">
      <div class="modal-box">
        <h3>Scores Level</h3>
        <p class="empty-msg">The match is tied. What happens next?</p>
        <div id="draw-continue-option">
          <div class="field-grid">
            <div><label>Extra Time Length (minutes)</label><input type="number" id="et-length-input" value="15" min="1"></div>
          </div>
          <button class="btn-primary" id="draw-continue-btn" style="width:100%; margin-bottom:0.6rem;">▶️ Continue — Extra Time</button>
        </div>
        <button class="btn-secondary" id="draw-penalties-btn" style="width:100%; margin-bottom:0.6rem;">🥅 Go to Penalties</button>
        <button class="btn-secondary" id="draw-record-btn" style="width:100%;">🤝 Record as Draw</button>
        <div class="modal-actions">
          <button class="btn-secondary" id="draw-cancel-btn">Cancel</button>
        </div>
        <span id="draw-status" class="save-status"></span>
      </div>
    </div>

    <!-- Penalty result modal -->
    <div class="modal-overlay hidden" id="penalty-modal">
      <div class="modal-box">
        <h3>Penalty Shootout Result</h3>
        <p class="empty-msg">The score stays as the drawn result — this just records who progressed.</p>
        <button class="btn-primary" id="pen-us-btn" style="width:100%; margin-bottom:0.6rem;">We Won on Penalties</button>
        <button class="btn-secondary" id="pen-opponent-btn" style="width:100%;">Opponent Won on Penalties</button>
        <div class="modal-actions">
          <button class="btn-secondary" id="pen-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `);

  if (!matchId) {
    document.getElementById('main').innerHTML = `<h1>No match selected</h1>`;
    return { cleanup: null };
  }

  async function loadClubName() {
    const { data } = await supabaseClient.from('club_profile').select('name').eq('id', 1).single();
    ourClubName = (data && data.name) ? data.name : 'Our Club';
  }
  async function loadTeams() {
    const { data } = await supabaseClient.from('teams').select('*');
    allTeams = data || [];
  }
  async function loadPlayers() {
    const { data } = await supabaseClient.from('players').select('*').eq('is_active', true).order('full_name');
    allPlayers = data || [];
  }
  function teamName(id) { return (allTeams.find(t => t.id === id) || {}).name || 'Unknown team'; }
  function playerName(id) { const p = allPlayers.find(p => p.id === id); return p ? (p.team_name || p.full_name) : 'Unknown'; }

  async function loadMatch() {
    const { data, error } = await supabaseClient.from('matches').select('*').eq('id', matchId).single();
    if (error || !data) { document.getElementById('main').innerHTML = `<h1>Match not found</h1>`; return; }
    currentMatch = data;

    document.getElementById('back-link').href = `${dashPath('/competitions/detail')}?id=${data.competition_id}`;

    if (!currentMatch.is_internal) {
      document.getElementById('main').innerHTML = `<h1>Live tracking is only available for our own matches</h1><p class="sub"><a href="${dashPath('/competitions/detail')}?id=${data.competition_id}">Go back</a></p>`;
      return;
    }
    if (currentMatch.status === 'completed') {
      document.getElementById('main').innerHTML = `<h1>This match is already completed and locked</h1><p class="sub"><a href="${dashPath('/competitions/detail')}?id=${data.competition_id}">Go back</a></p>`;
      return;
    }

    const opponentName = teamName(currentMatch.opponent_team_id);
    const homeSide = currentMatch.is_home ? ourClubName : opponentName;
    const awaySide = currentMatch.is_home ? opponentName : ourClubName;

    document.getElementById('page-title').textContent = `${homeSide} vs ${awaySide}`;
    document.getElementById('page-sub').textContent = `${currentMatch.match_date || ''} ${currentMatch.match_time || ''} · ${currentMatch.venue || ''}`;

    mountScoreboard();

    if (currentMatch.live_state === 'not_started') {
      renderStarterChecklist();
    }

    await loadMatchData();
    renderControls();
  }

  function mountScoreboard() {
    if (scoreboardMounted) return;
    const slot = document.getElementById('scoreboard-slot');
    if (!slot) return;
    const sb = document.createElement('fab-scoreboard');
    sb.setAttribute('match-id', matchId);
    slot.replaceWith(sb);
    scoreboardMounted = true;
  }

  async function loadMatchData() {
    const [{ data: g }, { data: c }, { data: s }, { data: l }] = await Promise.all([
      supabaseClient.from('match_goals').select('*').eq('match_id', matchId).order('minute'),
      supabaseClient.from('match_cards').select('*').eq('match_id', matchId).order('minute'),
      supabaseClient.from('match_substitutions').select('*').eq('match_id', matchId).order('minute'),
      supabaseClient.from('match_lineups').select('*').eq('match_id', matchId),
    ]);
    goals = g || []; cards = c || []; subs = s || []; matchLineups = l || [];
    squadSets = computeSquadSets();
    renderEventsList();
  }

  function computeSquadSets() {
    const starterIds = new Set(matchLineups.filter(l => l.is_starter).map(l => l.player_id));
    const subbedOffIds = new Set(subs.map(s => s.player_out_id));
    const subbedOnIds = new Set(subs.map(s => s.player_in_id));

    const onPitch = new Set([...starterIds].filter(id => !subbedOffIds.has(id)));
    subbedOnIds.forEach(id => onPitch.add(id));

    const recordedIds = new Set(matchLineups.map(l => l.player_id));
    const bench = new Set(allPlayers.map(p => p.id).filter(id => !recordedIds.has(id)));

    return { onPitch, bench };
  }

  function renderEventsList() {
    const container = document.getElementById('events-list');
    const items = [
      ...goals.map(x => ({ minute: x.minute, html: x.is_opponent_goal ? `⚽ Goal — ${teamName(currentMatch.opponent_team_id)}` : `⚽ Goal — ${playerName(x.scorer_id)}${x.assist_id ? ` (assist: ${playerName(x.assist_id)})` : ''}` })),
      ...cards.map(x => ({ minute: x.minute, html: `${x.card_type === 'yellow' ? '🟨' : '🟥'} ${playerName(x.player_id)}` })),
      ...subs.map(x => ({ minute: x.minute, html: `🔄 ${playerName(x.player_out_id)} → ${playerName(x.player_in_id)}` })),
    ].sort((a, b) => (a.minute || 0) - (b.minute || 0));

    container.innerHTML = items.length
      ? items.map(i => `<div class="event-row"><span class="event-minute">${i.minute || 0}'</span><span>${i.html}</span></div>`).join('')
      : `<div class="empty-msg">No events yet.</div>`;
  }

  function renderStarterChecklist() {
    const container = document.getElementById('starter-select-list');
    container.innerHTML = allPlayers.map(p => `
      <label class="squad-check-row">
        <input type="checkbox" class="starter-checkbox" value="${p.id}">
        <span style="flex:1;">${escapeHtml(p.team_name || p.full_name)}</span>
      </label>
    `).join('');

    container.querySelectorAll('.starter-checkbox').forEach(cb => {
      cb.addEventListener('change', updateStarterCount);
    });
    updateStarterCount();
  }

  function updateStarterCount() {
    const count = document.querySelectorAll('.starter-checkbox:checked').length;
    const label = document.getElementById('starter-count-label');
    label.textContent = `${count} / 11 selected`;
    label.classList.toggle('error', count > 11);
  }

  document.getElementById('start-game-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('start-status');
    const half1 = parseInt(document.getElementById('half1-length-input').value);
    const half2 = parseInt(document.getElementById('half2-length-input').value);
    const starterIds = [...document.querySelectorAll('.starter-checkbox:checked')].map(cb => cb.value);

    if (!half1 || half1 < 1 || !half2 || half2 < 1) {
      statusEl.textContent = 'Enter valid lengths for both halves.';
      statusEl.classList.add('error');
      return;
    }
    if (starterIds.length < 1) {
      statusEl.textContent = 'Select at least 1 starting player.';
      statusEl.classList.add('error');
      return;
    }
    if (starterIds.length > 11) {
      statusEl.textContent = "Starting XI can't exceed 11 players.";
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = 'Starting...';
    statusEl.classList.remove('error');

    try {
      const lineupRows = starterIds.map(id => ({ match_id: matchId, player_id: id, is_starter: true }));
      const { error: lineupError } = await supabaseClient.from('match_lineups').insert(lineupRows);
      if (lineupError) throw lineupError;

      await updateMatch({
        is_live: true,
        live_state: 'first_half',
        half_length_minutes: half1,
        second_half_length_minutes: half2,
        first_half_started_at: new Date().toISOString(),
      });
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.classList.add('error');
    }
  });

  function renderControls() {
    const preStart = document.getElementById('pre-start-card');
    const liveCard = document.getElementById('live-controls-card');
    const phaseRow = document.getElementById('phase-btn-row');

    if (currentMatch.live_state === 'not_started') {
      preStart.classList.remove('hidden');
      liveCard.classList.add('hidden');
      return;
    }

    preStart.classList.add('hidden');
    liveCard.classList.remove('hidden');

    phaseRow.innerHTML = '';
    if (currentMatch.live_state === 'first_half') {
      phaseRow.innerHTML = `<button class="btn-secondary" id="half-time-btn">⏸️ Half Time</button>`;
      document.getElementById('half-time-btn').addEventListener('click', async () => {
        await updateMatch({ live_state: 'half_time' });
      });
    } else if (currentMatch.live_state === 'half_time') {
      phaseRow.innerHTML = `<button class="btn-primary" id="start-2nd-btn">▶️ Start 2nd Half</button>`;
      document.getElementById('start-2nd-btn').addEventListener('click', async () => {
        await updateMatch({ live_state: 'second_half', second_half_started_at: new Date().toISOString() });
      });
    } else if (currentMatch.live_state === 'second_half') {
      phaseRow.innerHTML = `<button class="btn-danger" id="end-game-btn">⏹️ End Game</button>`;
      document.getElementById('end-game-btn').addEventListener('click', () => handleEndGameClick(false));
    } else if (currentMatch.live_state === 'extra_time') {
      phaseRow.innerHTML = `<button class="btn-danger" id="end-game-btn">⏹️ End Game (Extra Time)</button>`;
      document.getElementById('end-game-btn').addEventListener('click', () => handleEndGameClick(true));
    }
  }

  async function updateMatch(payload) {
    const { error } = await supabaseClient.from('matches').update(payload).eq('id', matchId);
    if (error) { alert(error.message); return; }
    await loadMatch();
  }

  function playerOptionsFromSet(idSet, includeBlank) {
    const ids = [...idSet];
    return (includeBlank ? `<option value="">—</option>` : '') + ids.map(id => `<option value="${id}">${escapeHtml(playerName(id))}</option>`).join('');
  }

  document.getElementById('record-our-goal-btn').addEventListener('click', () => {
    pendingGoalSide = 'us';
    document.getElementById('goal-modal-title').textContent = 'Record Our Goal';
    document.getElementById('goal-our-fields').classList.remove('hidden');
    document.getElementById('goal-opponent-note').classList.add('hidden');
    document.getElementById('goal-scorer-select').innerHTML = playerOptionsFromSet(squadSets.onPitch, false);
    document.getElementById('goal-assist-select').innerHTML = playerOptionsFromSet(squadSets.onPitch, true);
    document.getElementById('goal-status').textContent = '';
    document.getElementById('goal-modal').classList.remove('hidden');
  });

  document.getElementById('record-opponent-goal-btn').addEventListener('click', () => {
    pendingGoalSide = 'opponent';
    document.getElementById('goal-modal-title').textContent = 'Record Opponent Goal';
    document.getElementById('goal-our-fields').classList.add('hidden');
    document.getElementById('goal-opponent-note').classList.remove('hidden');
    document.getElementById('goal-status').textContent = '';
    document.getElementById('goal-modal').classList.remove('hidden');
  });

  document.getElementById('goal-cancel-btn').addEventListener('click', () => document.getElementById('goal-modal').classList.add('hidden'));

  document.getElementById('goal-save-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('goal-status');
    const minute = ScoreboardCore.currentMinute(currentMatch);

    const payload = pendingGoalSide === 'opponent'
      ? { match_id: matchId, is_opponent_goal: true, scorer_id: null, minute }
      : { match_id: matchId, is_opponent_goal: false, scorer_id: document.getElementById('goal-scorer-select').value, assist_id: document.getElementById('goal-assist-select').value || null, minute };

    if (pendingGoalSide === 'us' && !payload.scorer_id) {
      statusEl.textContent = 'Select a scorer.';
      statusEl.classList.add('error');
      return;
    }

    const { error } = await supabaseClient.from('match_goals').insert(payload);
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    document.getElementById('goal-modal').classList.add('hidden');
    await loadMatchData();
  });

  document.getElementById('record-card-btn').addEventListener('click', () => {
    document.getElementById('card-player-select').innerHTML = playerOptionsFromSet(squadSets.onPitch, false);
    document.getElementById('card-status').textContent = '';
    document.getElementById('card-modal').classList.remove('hidden');
  });
  document.getElementById('card-cancel-btn').addEventListener('click', () => document.getElementById('card-modal').classList.add('hidden'));
  document.getElementById('card-save-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('card-status');
    const payload = { match_id: matchId, player_id: document.getElementById('card-player-select').value, card_type: document.getElementById('card-type-select').value, minute: ScoreboardCore.currentMinute(currentMatch) };
    const { error } = await supabaseClient.from('match_cards').insert(payload);
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
    document.getElementById('card-modal').classList.add('hidden');
    await loadMatchData();
  });

  document.getElementById('record-sub-btn').addEventListener('click', () => {
    document.getElementById('sub-out-select').innerHTML = playerOptionsFromSet(squadSets.onPitch, false);
    document.getElementById('sub-in-select').innerHTML = playerOptionsFromSet(squadSets.bench, false);
    document.getElementById('sub-status').textContent = '';
    document.getElementById('sub-modal').classList.remove('hidden');
  });
  document.getElementById('sub-cancel-btn').addEventListener('click', () => document.getElementById('sub-modal').classList.add('hidden'));
  document.getElementById('sub-save-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('sub-status');
    const playerOut = document.getElementById('sub-out-select').value;
    const playerIn = document.getElementById('sub-in-select').value;

    if (!playerOut || !playerIn) { statusEl.textContent = 'Both players are required.'; statusEl.classList.add('error'); return; }
    if (playerOut === playerIn) { statusEl.textContent = "Player out and in can't be the same."; statusEl.classList.add('error'); return; }

    const minute = ScoreboardCore.currentMinute(currentMatch);

    const { error } = await supabaseClient.from('match_substitutions').insert({ match_id: matchId, player_out_id: playerOut, player_in_id: playerIn, minute });
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    const { error: lineupErr } = await supabaseClient.from('match_lineups').insert({ match_id: matchId, player_id: playerIn, is_starter: false });
    if (lineupErr && lineupErr.code !== '23505') {
      statusEl.textContent = `Substitution saved, but lineup update failed: ${lineupErr.message}`;
      statusEl.classList.add('error');
    }

    document.getElementById('sub-modal').classList.add('hidden');
    await loadMatchData();
  });

  function handleEndGameClick(isExtraTime) {
    const ourScore = goals.filter(g => !g.is_opponent_goal).length;
    const oppScore = goals.filter(g => g.is_opponent_goal).length;

    if (ourScore === oppScore) {
      openDrawModal(isExtraTime);
    } else {
      finalizeMatch({});
    }
  }

  function openDrawModal(isExtraTime) {
    document.getElementById('draw-continue-option').classList.toggle('hidden', isExtraTime);
    document.getElementById('draw-status').textContent = '';
    document.getElementById('draw-modal').classList.remove('hidden');
  }

  document.getElementById('draw-cancel-btn').addEventListener('click', () => document.getElementById('draw-modal').classList.add('hidden'));

  document.getElementById('draw-continue-btn').addEventListener('click', async () => {
    const etLen = parseInt(document.getElementById('et-length-input').value) || 15;
    document.getElementById('draw-modal').classList.add('hidden');
    await updateMatch({ live_state: 'extra_time', extra_time_started_at: new Date().toISOString(), extra_time_length_minutes: etLen });
  });

  document.getElementById('draw-penalties-btn').addEventListener('click', () => {
    document.getElementById('draw-modal').classList.add('hidden');
    document.getElementById('penalty-modal').classList.remove('hidden');
  });

  document.getElementById('draw-record-btn').addEventListener('click', async () => {
    document.getElementById('draw-modal').classList.add('hidden');
    await finalizeMatch({});
  });

  document.getElementById('pen-cancel-btn').addEventListener('click', () => document.getElementById('penalty-modal').classList.add('hidden'));
  document.getElementById('pen-us-btn').addEventListener('click', async () => {
    document.getElementById('penalty-modal').classList.add('hidden');
    await finalizeMatch({ went_to_penalties: true, penalty_winner: 'us' });
  });
  document.getElementById('pen-opponent-btn').addEventListener('click', async () => {
    document.getElementById('penalty-modal').classList.add('hidden');
    await finalizeMatch({ went_to_penalties: true, penalty_winner: 'opponent' });
  });

  async function finalizeMatch(extra) {
    const ourScore = goals.filter(g => !g.is_opponent_goal).length;
    const oppScore = goals.filter(g => g.is_opponent_goal).length;

    const { error } = await supabaseClient.from('matches').update({
      live_state: 'full_time',
      is_live: false,
      status: 'completed',
      our_score: ourScore,
      opponent_score: oppScore,
      ...extra,
    }).eq('id', matchId);

    if (error) { alert(error.message); return; }
    router.navigate(`${dashPath('/competitions/detail')}?id=${currentMatch.competition_id}`, { replace: true });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  await loadClubName();
  await loadTeams();
  await loadPlayers();
  await loadMatch();

  return { cleanup: null };
}
