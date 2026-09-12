import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { injectStyle } from '../utils/inject-style.js';
import { attachTeamPicker } from '../components/team-picker.js';
import { escapeHtml } from '../utils/format.js';
import { matchCard } from '../components/match-card.js';
import { observeLazyImages } from '../components/lazy-image.js';

injectStyle('h2h-index-view', `
  .h2h-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .h2h-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-2xs); }
  .h2h-subtitle { color: rgba(16,36,26,0.6); margin-bottom: var(--sp-sm); }

  .h2h-tabs { display: flex; border-bottom: 1px solid var(--color-line); margin-bottom: var(--sp-lg); }
  .h2h-tab { flex: 1; text-align: center; padding: var(--sp-sm); font-size: var(--fs-sm); font-weight: 600; color: rgba(16,36,26,0.5); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; }
  .h2h-tab--active { color: var(--color-ridge-green); border-bottom-color: var(--color-ridge-green); }

  .h2h-panel[hidden] { display: none; }

  .h2h-compare { background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); }
  .h2h-compare__row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--sp-sm); margin-bottom: var(--sp-sm); }
  .h2h-compare__row--single { grid-template-columns: 1fr; }
  .h2h-compare__vs { font-family: var(--font-mono); font-size: var(--fs-sm); color: rgba(16,36,26,0.5); text-align: center; }
  .h2h-compare__status { font-size: var(--fs-sm); color: rgba(16,36,26,0.6); min-height: 1.2em; margin-bottom: var(--sp-sm); }
  .h2h-compare__status--error { color: #b3261e; }
  .h2h-compare__result { padding-top: var(--sp-sm); border-top: 1px solid var(--color-line); }

  .h2h-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-sm); margin-bottom: var(--sp-sm); }
  .h2h-summary__item { background: rgba(16,36,26,0.03); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); text-align: center; }
  .h2h-summary__value { font-family: var(--font-display); font-size: var(--fs-xl); color: var(--color-ridge-green); }
  .h2h-summary__label { font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.6); }

  .h2h-other-matches { display: flex; flex-direction: column; gap: var(--sp-sm); margin-top: var(--sp-sm); }
`);

export async function headToHeadIndexView() {
  let allTeams = [];
  let magujeTeamId = null;

  // "Our" tab state
  let ourOpponent = null;

  // "Other" tab state
  let otherTeam1 = null;
  let otherTeam2 = null;

  await viewContainer.render(`
    <div class="container">
      <div class="h2h-header">
        <h1 class="h2h-title">Head to Head</h1>
        <p class="h2h-subtitle">Explore any two teams' record against each other.</p>
      </div>

      <div class="h2h-tabs">
        <button type="button" class="h2h-tab h2h-tab--active" data-tab="our">Our Head to Head</button>
        <button type="button" class="h2h-tab" data-tab="other">Other Head to Head</button>
      </div>

      <div class="h2h-panel" data-panel="our">
        <div class="h2h-compare">
          <div class="h2h-compare__row h2h-compare__row--single">
            <div data-slot="our-opponent-picker"></div>
          </div>
          <button type="button" class="btn btn--secondary" data-slot="our-go-btn" style="width:100%;">View Head to Head</button>
          <p class="h2h-compare__status" data-slot="our-status"></p>
        </div>
      </div>

      <div class="h2h-panel" data-panel="other" hidden>
        <div class="h2h-compare">
          <div class="h2h-compare__row">
            <div data-slot="other-team1-picker"></div>
            <span class="h2h-compare__vs">VS</span>
            <div data-slot="other-team2-picker"></div>
          </div>
          <button type="button" class="btn btn--secondary" data-slot="other-compare-btn" style="width:100%;">Compare</button>
          <p class="h2h-compare__status" data-slot="other-status"></p>
          <div data-slot="other-result"></div>
        </div>
      </div>
    </div>`);

  const root = document.querySelector('#app');

  // ---------- Tab switching ----------
  const tabButtons = root.querySelectorAll('.h2h-tab');
  const panels = { our: root.querySelector('[data-panel="our"]'), other: root.querySelector('[data-panel="other"]') };

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('h2h-tab--active'));
      btn.classList.add('h2h-tab--active');
      const target = btn.dataset.tab;
      panels.our.hidden = target !== 'our';
      panels.other.hidden = target !== 'other';
    });
  });

  // ---------- Load teams (shared by both tabs), excluding Maguje from every picker ----------
  const ourStatusEl = root.querySelector('[data-slot="our-status"]');
  const otherStatusEl = root.querySelector('[data-slot="other-status"]');
  const otherResultEl = root.querySelector('[data-slot="other-result"]');

  try {
    const { data, error } = await supabase.from('teams').select('id, name, logo_url').order('name');
    if (error) throw error;
    allTeams = data || [];

    const maguje = allTeams.find((t) => t.name.toLowerCase().includes('maguje'));
    magujeTeamId = maguje ? maguje.id : null;
    const selectableTeams = magujeTeamId ? allTeams.filter((t) => t.id !== magujeTeamId) : allTeams;

    attachTeamPicker(root.querySelector('[data-slot="our-opponent-picker"]'), {
      teams: selectableTeams,
      placeholder: 'Search opponent…',
      onSelect: (team) => { ourOpponent = team; ourStatusEl.textContent = ''; ourStatusEl.classList.remove('h2h-compare__status--error'); },
    });

    attachTeamPicker(root.querySelector('[data-slot="other-team1-picker"]'), {
      teams: selectableTeams,
      placeholder: 'Team 1…',
      onSelect: (team) => { otherTeam1 = team; resetOtherStatus(); },
    });

    attachTeamPicker(root.querySelector('[data-slot="other-team2-picker"]'), {
      teams: selectableTeams,
      placeholder: 'Team 2…',
      onSelect: (team) => { otherTeam2 = team; resetOtherStatus(); },
    });

    root.querySelector('[data-slot="our-go-btn"]').addEventListener('click', () => {
      if (!ourOpponent) {
        ourStatusEl.textContent = 'Select an opponent first.';
        ourStatusEl.classList.add('h2h-compare__status--error');
        return;
      }
      window.history.pushState({}, '', `/results/head-to-head/${ourOpponent.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    root.querySelector('[data-slot="other-compare-btn"]').addEventListener('click', runOtherCompare);
  } catch (err) {
    console.error('[head-to-head-index] team load failed:', err);
    ourStatusEl.textContent = 'Could not load teams right now.';
    ourStatusEl.classList.add('h2h-compare__status--error');
    otherStatusEl.textContent = 'Could not load teams right now.';
    otherStatusEl.classList.add('h2h-compare__status--error');
  }

  function resetOtherStatus() {
    otherStatusEl.textContent = '';
    otherStatusEl.classList.remove('h2h-compare__status--error');
    otherResultEl.innerHTML = '';
  }

  async function runOtherCompare() {
    resetOtherStatus();

    if (!otherTeam1 || !otherTeam2) {
      otherStatusEl.textContent = 'Select both teams first.';
      otherStatusEl.classList.add('h2h-compare__status--error');
      return;
    }
    if (otherTeam1.id === otherTeam2.id) {
      otherStatusEl.textContent = 'Pick two different teams.';
      otherStatusEl.classList.add('h2h-compare__status--error');
      return;
    }

    otherStatusEl.textContent = 'Loading…';

    try {
      const [{ data, error }, { data: matchRows, error: mErr }] = await Promise.all([
        supabase
          .from('v_external_head_to_head')
          .select('team_1_id, team_2_id, played, team_1_wins, team_2_wins, draws, team_1_goals, team_2_goals')
          .or(`and(team_1_id.eq.${otherTeam1.id},team_2_id.eq.${otherTeam2.id}),and(team_1_id.eq.${otherTeam2.id},team_2_id.eq.${otherTeam1.id})`)
          .maybeSingle(),
        supabase
          .from('matches')
          .select('id, slug, match_date, team_a_id, team_b_id, team_a_score, team_b_score, competition_id')
          .eq('is_internal', false)
          .eq('status', 'completed')
          .or(`and(team_a_id.eq.${otherTeam1.id},team_b_id.eq.${otherTeam2.id}),and(team_a_id.eq.${otherTeam2.id},team_b_id.eq.${otherTeam1.id})`)
          .order('match_date', { ascending: false }),
      ]);
      if (error) throw error;
      if (mErr) throw mErr;

      otherStatusEl.textContent = '';
      if (!data) {
        otherResultEl.innerHTML = states.empty({ message: `No completed matches between ${otherTeam1.name} and ${otherTeam2.name} yet.` });
        return;
      }

      const team1IsStoredTeam1 = String(data.team_1_id) === String(otherTeam1.id);

      const competitionIds = [...new Set((matchRows || []).map((m) => m.competition_id).filter(Boolean))];
      const { data: competitionRows } = competitionIds.length
        ? await supabase.from('competitions').select('id, name').in('id', competitionIds)
        : { data: [] };
      const competitionNameById = Object.fromEntries((competitionRows || []).map((c) => [c.id, c.name]));

      renderOtherResult({
        team1Name: otherTeam1.name,
        team2Name: otherTeam2.name,
        team1Wins: team1IsStoredTeam1 ? data.team_1_wins : data.team_2_wins,
        team2Wins: team1IsStoredTeam1 ? data.team_2_wins : data.team_1_wins,
        draws: data.draws,
        team1Goals: team1IsStoredTeam1 ? data.team_1_goals : data.team_2_goals,
        team2Goals: team1IsStoredTeam1 ? data.team_2_goals : data.team_1_goals,
        played: data.played,
      });

      renderOtherMatches(matchRows || [], otherTeam1, otherTeam2, competitionNameById);
    } catch (err) {
      console.error('[head-to-head-index] compare failed:', err);
      otherStatusEl.textContent = 'Something went wrong loading that comparison.';
      otherStatusEl.classList.add('h2h-compare__status--error');
    }
  }

  function renderOtherResult({ team1Name, team2Name, team1Wins, team2Wins, draws, team1Goals, team2Goals, played }) {
    otherResultEl.innerHTML = `
      <div class="h2h-compare__result">
        <div class="h2h-summary">
          <div class="h2h-summary__item"><div class="h2h-summary__value">${team1Wins}</div><div class="h2h-summary__label">${escapeHtml(team1Name)} Wins</div></div>
          <div class="h2h-summary__item"><div class="h2h-summary__value">${draws}</div><div class="h2h-summary__label">Draws</div></div>
          <div class="h2h-summary__item"><div class="h2h-summary__value">${team2Wins}</div><div class="h2h-summary__label">${escapeHtml(team2Name)} Wins</div></div>
        </div>
        <p class="text-body-sm" style="color: rgba(16,36,26,0.6);">${escapeHtml(team1Name)} ${team1Goals} – ${team2Goals} ${escapeHtml(team2Name)} aggregate across ${played} match${played === 1 ? '' : 'es'}.</p>
        <div class="h2h-other-matches" data-slot="other-matches"></div>
      </div>
    `;
  }

  function renderOtherMatches(matchRows, team1, team2, competitionNameById) {
    const slot = otherResultEl.querySelector('[data-slot="other-matches"]');
    if (!slot) return;

    if (!matchRows.length) {
      slot.innerHTML = states.empty({ message: 'No individual match records available for these two teams.' });
      return;
    }

    slot.innerHTML = matchRows.map((m) => matchCard(toExternalOnlyMatch(m, team1, team2, competitionNameById))).join('');
    observeLazyImages(slot);
  }

  // Builds a matchCard()-compatible object for a match between two teams
  // where NEITHER side is necessarily Maguje — unlike toExternalMatch() in
  // home.js, which always assumes Maguje is one of the two sides.
  function toExternalOnlyMatch(m, team1, team2, competitionNameById) {
    const team1IsTeamA = String(m.team_a_id) === String(team1.id);
    const homeTeam = team1IsTeamA ? team1 : team2;
    const awayTeam = team1IsTeamA ? team2 : team1;
    return {
      slug: m.slug,
      status: 'completed',
      kickoffAt: m.match_date,
      homeScore: m.team_a_score,
      awayScore: m.team_b_score,
      homeTeam: { name: homeTeam.name, crestUrl: homeTeam.logo_url },
      awayTeam: { name: awayTeam.name, crestUrl: awayTeam.logo_url },
      competition: m.competition_id ? { id: m.competition_id, name: competitionNameById[m.competition_id] } : null,
    };
  }

  return { cleanup: null };
}