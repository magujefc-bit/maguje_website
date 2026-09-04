import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { states } from '../components/states.js';
import { standingsTable } from '../components/standings-table.js';
import { fetchCompetition, competitionHeaderBlock, competitionSubNav, notFoundBlock } from './competition-shared.js';
import { observeLazyImages } from '../components/lazy-image.js';

const STAGE_LABELS = {
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  third_place: 'Third Place',
  final: 'Final',
};
const KNOCKOUT_STAGE_ORDER = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];

export async function competitionStandingsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.standings(10));
  const root = document.querySelector('#app');

  try {
    const comp = await fetchCompetition(slug);
    if (!comp) { await viewContainer.render(notFoundBlock('/competitions', 'Back to Competitions')); return { cleanup: null }; }

    if (comp.type === 'Friendly') {
      await viewContainer.render(`
        <div class="container">
          ${competitionHeaderBlock(comp)}
          ${competitionSubNav(slug, 'standings', comp.type)}
          <div data-slot="table">${states.empty({ message: 'Standings aren\u2019t tracked for friendly competitions.' })}</div>
        </div>`);
      return { cleanup: null };
    }

    if (comp.type === 'Tournament') {
      await renderTournamentStandings(root, comp, slug);
      return { cleanup: null };
    }

    // League — unchanged from before this feature existed.
    const { data, error } = await supabase.from('v_standings').select('team_id, team_name, crest_url, played, won, drawn, lost, points, position').eq('competition_id', comp.id).order('position', { ascending: true });
    if (error) throw error;

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, 'standings', comp.type)}
        <div data-slot="table">${data.length ? standingsTable(data.map(r => ({ position: r.position, teamId: r.team_id, teamName: r.team_name, crestUrl: r.crest_url, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.points }))) : states.empty({ message: 'Standings not available yet.' })}</div>
      </div>`);
    observeLazyImages(root);
  } catch (err) {
    console.error('[competition-standings] load failed:', err);
    viewContainer.renderError('Could not load standings.', () => competitionStandingsView(params));
  }
  return { cleanup: null };
}

async function renderTournamentStandings(root, comp, slug) {
  try {
    const [{ data: groupRows, error: groupErr }, { data: knockoutMatches, error: knockoutErr }] = await Promise.all([
      supabase.from('v_group_standings').select('group_name, team_id, team_name, crest_url, played, won, drawn, lost, points, position').eq('competition_id', comp.id).order('group_name', { ascending: true }).order('position', { ascending: true }),
      supabase.from('matches').select('id, slug, stage, bracket_position, status, our_score, opponent_score, team_a_score, team_b_score, is_internal, opponent_team_id, team_a_id, team_b_id').eq('competition_id', comp.id).not('stage', 'is', null).neq('stage', 'group').order('bracket_position', { ascending: true }),
    ]);
    if (groupErr) throw groupErr;
    if (knockoutErr) throw knockoutErr;

    const groups = {};
    (groupRows || []).forEach(r => {
      const key = r.group_name || 'Ungrouped';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    const groupNames = Object.keys(groups).sort();

    const groupTablesHtml = groupNames.length
      ? groupNames.map(name => `
          <div class="tournament-group-block">
            <h3 class="tournament-group-block__title">${name}</h3>
            ${standingsTable(groups[name].map(r => ({ position: r.position, teamId: r.team_id, teamName: r.team_name, crestUrl: r.crest_url, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.points })))}
          </div>
        `).join('')
      : '';

    const teamIds = [...new Set((knockoutMatches || []).flatMap(m => [m.opponent_team_id, m.team_a_id, m.team_b_id]).filter(Boolean))];
    const { data: teamsData } = teamIds.length ? await supabase.from('teams').select('id, name').in('id', teamIds) : { data: [] };
    const teamNameById = Object.fromEntries((teamsData || []).map(t => [t.id, t.name]));

    const knockoutByStage = {};
    (knockoutMatches || []).forEach(m => {
      if (!knockoutByStage[m.stage]) knockoutByStage[m.stage] = [];
      knockoutByStage[m.stage].push(m);
    });

    const knockoutHtml = KNOCKOUT_STAGE_ORDER
      .filter(stage => knockoutByStage[stage]?.length)
      .map(stage => `
        <div class="tournament-knockout-block">
          <h3 class="tournament-knockout-block__title">${STAGE_LABELS[stage]}</h3>
          ${knockoutByStage[stage].map(m => knockoutMatchRow(m, teamNameById)).join('')}
        </div>
      `).join('');

    const hasAnything = groupNames.length || knockoutHtml;

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, 'standings', comp.type)}
        <div data-slot="table">
          ${hasAnything ? groupTablesHtml + knockoutHtml : states.empty({ message: 'Standings will appear once group or knockout matches are recorded.' })}
        </div>
      </div>`);
    observeLazyImages(root);
  } catch (err) {
    console.error('[competition-standings] tournament load failed:', err);
    viewContainer.renderError('Could not load standings.', () => competitionStandingsView({ slug }));
  }
}

function knockoutMatchRow(m, teamNameById) {
  const homeName = m.is_internal ? 'Maguje FC' : (teamNameById[m.team_a_id] || 'TBD');
  const awayName = m.is_internal ? (teamNameById[m.opponent_team_id] || 'TBD') : (teamNameById[m.team_b_id] || 'TBD');
  const homeScore = m.is_internal ? m.our_score : m.team_a_score;
  const awayScore = m.is_internal ? m.opponent_score : m.team_b_score;
  const scoreLine = (homeScore !== null && awayScore !== null) ? `${homeScore} – ${awayScore}` : 'vs';
  const href = m.slug ? `/matches/${m.slug}` : null;
  const inner = `<span class="tournament-knockout-row__teams">${homeName} <strong>${scoreLine}</strong> ${awayName}</span>`;
  return href
    ? `<a href="${href}" class="tournament-knockout-row">${inner}</a>`
    : `<div class="tournament-knockout-row">${inner}</div>`;
}