import { supabase } from '../supabase-client.js';
import { competitionHeader } from '../components/competition-card.js';
import { standingsTable } from '../components/standings-table.js';
import { states } from '../components/states.js';
import { getMagujeTeamId } from './home.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('competition-shared', `
  .competition-subnav { display: flex; gap: var(--sp-md); overflow-x: auto; border-bottom: 1px solid var(--color-line); margin-bottom: var(--sp-lg); }
  .competition-subnav__link { font-size: var(--fs-sm); font-weight: 600; white-space: nowrap; padding-block: var(--sp-xs); color: rgba(16,36,26,0.6); border-bottom: 2px solid transparent; }
  .competition-subnav__link--active { color: var(--color-ridge-green); border-bottom-color: var(--color-ridge-green); }
`);

const STAGE_LABELS = {
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  third_place: 'Third Place',
  final: 'Final',
};
const KNOCKOUT_STAGE_ORDER = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];

export async function fetchCompetition(slug) {
  const { data, error } = await supabase.from('competitions').select('id, slug, name, season, type, start_date, end_date').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { count } = await supabase.from('competition_teams').select('team_id', { count: 'exact', head: true }).eq('competition_id', data.id).eq('is_active', true);
  return { ...data, teamCount: count || 0 };
}

export function competitionHeaderBlock(comp) {
  const shareUrl = comp.slug ? window.location.origin + '/competitions/' + comp.slug : null;
  return competitionHeader({ name: comp.name, season: comp.season, teamCount: comp.teamCount, shareUrl });
}

export function competitionSubNav(slug, activeTab, type) {
  const tabs = [
    { id: 'overview', label: 'Overview', path: `/competitions/${slug}` },
    ...(type === 'Friendly' ? [] : [{ id: 'standings', label: 'Standings', path: `/competitions/${slug}/standings` }]),
    { id: 'fixtures', label: 'Fixtures', path: `/competitions/${slug}/fixtures` },
    { id: 'results', label: 'Results', path: `/competitions/${slug}/results` },
    { id: 'player-statistics', label: 'Player Stats', path: `/competitions/${slug}/player-statistics` },
  ];
  return `<nav class="competition-subnav" aria-label="Competition sections">${tabs.map(t => `<a href="${t.path}" class="competition-subnav__link ${t.id === activeTab ? 'competition-subnav__link--active' : ''}">${t.label}</a>`).join('')}</nav>`;
}

export function notFoundBlock(backPath, backLabel) {
  return `<div class="container section" style="text-align:center;"><h1 class="text-display-xl">Competition not found</h1><a href="${backPath}" class="btn btn--primary" style="margin-top: var(--sp-md);">${backLabel}</a></div>`;
}

function toStandingsRow(r) {
  return {
    position: r.position,
    teamId: r.team_id,
    teamName: r.team_name,
    crestUrl: r.crest_url,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goals_for,
    goalsAgainst: r.goals_against,
    goalDifference: r.goal_difference,
    points: r.points,
  };
}

// Shared by competition-standings.js (per-competition page, with header/subnav
// around it) and standings.js (the dropdown-driven /standings page). Both call
// this with a { id, type } competition and get back a ready-to-insert HTML
// string — either the flat league table, or group tables + knockout bracket
// for a Tournament. Callers are responsible for handling type === 'Friendly'
// before calling this (neither current caller ever invokes it for a Friendly).
export async function fetchStandingsMarkup(comp) {
  const highlightTeamId = await getMagujeTeamId();
  if (comp.type === 'Tournament') {
    return fetchTournamentStandingsMarkup(comp, highlightTeamId);
  }
  return fetchLeagueStandingsMarkup(comp, highlightTeamId);
}

async function fetchLeagueStandingsMarkup(comp, highlightTeamId) {
  const { data, error } = await supabase.from('v_standings').select('team_id, team_name, crest_url, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, position').eq('competition_id', comp.id).order('position', { ascending: true });
  if (error) throw error;

  if (!data.length) return states.empty({ message: 'Standings not available yet.' });
  return standingsTable(data.map(toStandingsRow), { highlightTeamId });
}

async function fetchTournamentStandingsMarkup(comp, highlightTeamId) {
  const [{ data: groupRows, error: groupErr }, { data: knockoutMatches, error: knockoutErr }] = await Promise.all([
    supabase.from('v_group_standings').select('group_name, team_id, team_name, crest_url, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, position').eq('competition_id', comp.id).order('group_name', { ascending: true }).order('position', { ascending: true }),
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
          ${standingsTable(groups[name].map(toStandingsRow), { highlightTeamId })}
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
  return hasAnything ? groupTablesHtml + knockoutHtml : states.empty({ message: 'Standings will appear once group or knockout matches are recorded.' });
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