import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { lazyImage, observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';
import { attachTeamPicker } from '../components/team-picker.js';
import { escapeHtml } from '../utils/format.js';

injectStyle('h2h-index-view', `
  .h2h-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .h2h-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-2xs); }
  .h2h-subtitle { color: rgba(16,36,26,0.6); margin-bottom: var(--sp-sm); }
  .h2h-search { width: 100%; padding: var(--sp-xs) var(--sp-sm); border: 1px solid var(--color-line); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-sm); }

  .h2h-compare { background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); margin-bottom: var(--sp-lg); }
  .h2h-compare__title { font-size: var(--fs-lg); margin-bottom: var(--sp-sm); }
  .h2h-compare__row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--sp-sm); margin-bottom: var(--sp-sm); }
  .h2h-compare__vs { font-family: var(--font-mono); font-size: var(--fs-sm); color: rgba(16,36,26,0.5); text-align: center; }
  .h2h-compare__status { font-size: var(--fs-sm); color: rgba(16,36,26,0.6); min-height: 1.2em; margin-bottom: var(--sp-sm); }
  .h2h-compare__status--error { color: #b3261e; }
  .h2h-compare__result { padding-top: var(--sp-sm); border-top: 1px solid var(--color-line); }

  .h2h-list { display: flex; flex-direction: column; gap: var(--sp-sm); padding-bottom: var(--sp-2xl); }
  .h2h-row { display: flex; align-items: center; gap: var(--sp-sm); background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); transition: border-color var(--dur-fast) var(--ease-standard); }
  .h2h-row:hover { border-color: var(--color-ridge-green); }
  .h2h-row__crest { width: 40px; height: 40px; flex-shrink: 0; }
  .h2h-row__name { font-weight: 600; flex: 1; }
  .h2h-row__record { font-family: var(--font-mono); font-size: var(--fs-sm); color: rgba(16,36,26,0.7); white-space: nowrap; }
  .h2h-row__record strong { color: var(--color-ridge-green); }

  .h2h-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-sm); margin-bottom: var(--sp-sm); }
  .h2h-summary__item { background: var(--color-cloud-mist, #f5f7f5); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); text-align: center; }
  .h2h-summary__value { font-family: var(--font-display); font-size: var(--fs-xl); color: var(--color-ridge-green); }
  .h2h-summary__label { font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.6); }
`);

export async function headToHeadIndexView() {
  let allOpponents = [];
  let allTeams = [];
  let magujeTeamId = null;
  let team1 = null;
  let team2 = null;

  await viewContainer.render(`
    <div class="container">
      <div class="h2h-header">
        <h1 class="h2h-title">Head to Head</h1>
        <p class="h2h-subtitle">Maguje FC's record against every opponent faced.</p>
      </div>

      <div class="h2h-compare">
        <h2 class="h2h-compare__title">Compare two teams</h2>
        <div class="h2h-compare__row">
          <div data-slot="team1-picker"></div>
          <span class="h2h-compare__vs">VS</span>
          <div data-slot="team2-picker"></div>
        </div>
        <button type="button" class="btn btn--secondary" data-slot="compare-btn" style="width:100%;">Compare</button>
        <p class="h2h-compare__status" data-slot="compare-status"></p>
        <div data-slot="compare-result"></div>
      </div>

      <input type="text" id="h2h-search" class="h2h-search" placeholder="Search opponent…">
      <div class="h2h-list" data-slot="list">
        <div class="skel skel-block" style="height:60px;margin-bottom:var(--sp-sm);"></div>
        <div class="skel skel-block" style="height:60px;margin-bottom:var(--sp-sm);"></div>
        <div class="skel skel-block" style="height:60px;"></div>
      </div>
    </div>`);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="list"]');
  const searchInput = root.querySelector('#h2h-search');
  const statusEl = root.querySelector('[data-slot="compare-status"]');
  const resultEl = root.querySelector('[data-slot="compare-result"]');

  // ---------- Existing Maguje-vs-opponent list (unchanged behavior) ----------
  try {
    const { data, error } = await supabase.from('v_head_to_head').select('opponent_team_id, opponent_name, opponent_crest, played, wins, draws, losses').order('played', { ascending: false });
    if (error) throw error;

    if (!data.length) {
      slot.innerHTML = states.empty({ message: 'No completed matches recorded yet.' });
    } else {
      allOpponents = data;
      searchInput.addEventListener('input', renderList);
      renderList();
    }
  } catch (err) {
    console.error('[head-to-head-index] load failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, async () => { await headToHeadIndexView(); });
  }

  function renderList() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query
      ? allOpponents.filter((row) => row.opponent_name.toLowerCase().includes(query))
      : allOpponents;

    if (!filtered.length) {
      slot.innerHTML = states.empty({ message: `No opponents matching "${searchInput.value.trim()}".` });
      return;
    }

    slot.innerHTML = filtered.map(row => `
      <a href="/results/head-to-head/${row.opponent_team_id}" class="h2h-row">
        <div class="h2h-row__crest">${lazyImage({ src: row.opponent_crest, alt: row.opponent_name, aspect: 'square' })}</div>
        <span class="h2h-row__name">${row.opponent_name}</span>
        <span class="h2h-row__record"><strong>${row.wins}W</strong> ${row.draws}D ${row.losses}L <span style="color:rgba(16,36,26,0.4);">(${row.played} played)</span></span>
      </a>
    `).join('');
    observeLazyImages(slot);
  }

  // ---------- Compare-two-teams section ----------
  try {
    const { data, error } = await supabase.from('teams').select('id, name, logo_url').order('name');
    if (error) throw error;
    allTeams = data || [];

    const maguje = allTeams.find((t) => t.name.toLowerCase().includes('maguje'));
    magujeTeamId = maguje ? maguje.id : null;

    attachTeamPicker(root.querySelector('[data-slot="team1-picker"]'), {
      teams: allTeams,
      placeholder: 'Team 1…',
      onSelect: (team) => { team1 = team; resetStatus(); },
    });

    attachTeamPicker(root.querySelector('[data-slot="team2-picker"]'), {
      teams: allTeams,
      placeholder: 'Team 2…',
      onSelect: (team) => { team2 = team; resetStatus(); },
    });

    root.querySelector('[data-slot="compare-btn"]').addEventListener('click', runCompare);
  } catch (err) {
    console.error('[head-to-head-index] team picker setup failed:', err);
    statusEl.textContent = 'Could not load teams for comparison right now.';
    statusEl.classList.add('h2h-compare__status--error');
  }

  function resetStatus() {
    statusEl.textContent = '';
    statusEl.classList.remove('h2h-compare__status--error');
    resultEl.innerHTML = '';
  }

  async function runCompare() {
    resetStatus();

    if (!team1 || !team2) {
      statusEl.textContent = 'Select both teams first.';
      statusEl.classList.add('h2h-compare__status--error');
      return;
    }
    if (team1.id === team2.id) {
      statusEl.textContent = 'Pick two different teams.';
      statusEl.classList.add('h2h-compare__status--error');
      return;
    }

    statusEl.textContent = 'Loading…';

    try {
      const involvesMaguje = team1.id === magujeTeamId || team2.id === magujeTeamId;

      if (involvesMaguje) {
        const opponent = team1.id === magujeTeamId ? team2 : team1;
        const magujeIsTeam1 = team1.id === magujeTeamId;

        const { data, error } = await supabase
          .from('v_head_to_head')
          .select('played, wins, draws, losses, goals_for, goals_against')
          .eq('opponent_team_id', opponent.id)
          .maybeSingle();
        if (error) throw error;

        statusEl.textContent = '';
        if (!data) {
          resultEl.innerHTML = states.empty({ message: `No completed matches between ${team1.name} and ${team2.name} yet.` });
          return;
        }

        renderResult({
          team1Name: team1.name,
          team2Name: team2.name,
          team1Wins: magujeIsTeam1 ? data.wins : data.losses,
          team2Wins: magujeIsTeam1 ? data.losses : data.wins,
          draws: data.draws,
          team1Goals: magujeIsTeam1 ? data.goals_for : data.goals_against,
          team2Goals: magujeIsTeam1 ? data.goals_against : data.goals_for,
          played: data.played,
        });
      } else {
        const { data, error } = await supabase
          .from('v_external_head_to_head')
          .select('team_1_id, team_2_id, played, team_1_wins, team_2_wins, draws, team_1_goals, team_2_goals')
          .or(`and(team_1_id.eq.${team1.id},team_2_id.eq.${team2.id}),and(team_1_id.eq.${team2.id},team_2_id.eq.${team1.id})`)
          .maybeSingle();
        if (error) throw error;

        statusEl.textContent = '';
        if (!data) {
          resultEl.innerHTML = states.empty({ message: `No completed matches between ${team1.name} and ${team2.name} yet.` });
          return;
        }

        const team1IsStoredTeam1 = String(data.team_1_id) === String(team1.id);

        renderResult({
          team1Name: team1.name,
          team2Name: team2.name,
          team1Wins: team1IsStoredTeam1 ? data.team_1_wins : data.team_2_wins,
          team2Wins: team1IsStoredTeam1 ? data.team_2_wins : data.team_1_wins,
          draws: data.draws,
          team1Goals: team1IsStoredTeam1 ? data.team_1_goals : data.team_2_goals,
          team2Goals: team1IsStoredTeam1 ? data.team_2_goals : data.team_1_goals,
          played: data.played,
        });
      }
    } catch (err) {
      console.error('[head-to-head-index] compare failed:', err);
      statusEl.textContent = 'Something went wrong loading that comparison.';
      statusEl.classList.add('h2h-compare__status--error');
    }
  }

  function renderResult({ team1Name, team2Name, team1Wins, team2Wins, draws, team1Goals, team2Goals, played }) {
    resultEl.innerHTML = `
      <div class="h2h-compare__result">
        <div class="h2h-summary">
          <div class="h2h-summary__item"><div class="h2h-summary__value">${team1Wins}</div><div class="h2h-summary__label">${escapeHtml(team1Name)} Wins</div></div>
          <div class="h2h-summary__item"><div class="h2h-summary__value">${draws}</div><div class="h2h-summary__label">Draws</div></div>
          <div class="h2h-summary__item"><div class="h2h-summary__value">${team2Wins}</div><div class="h2h-summary__label">${escapeHtml(team2Name)} Wins</div></div>
        </div>
        <p class="text-body-sm" style="color: rgba(16,36,26,0.6);">${escapeHtml(team1Name)} ${team1Goals} – ${team2Goals} ${escapeHtml(team2Name)} aggregate across ${played} match${played === 1 ? '' : 'es'}.</p>
      </div>
    `;
  }

  return { cleanup: null };
}