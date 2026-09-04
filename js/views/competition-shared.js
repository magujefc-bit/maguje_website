import { supabase } from '../supabase-client.js';
import { competitionHeader } from '../components/competition-card.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('competition-shared', `
  .competition-subnav { display: flex; gap: var(--sp-md); overflow-x: auto; border-bottom: 1px solid var(--color-line); margin-bottom: var(--sp-lg); }
  .competition-subnav__link { font-size: var(--fs-sm); font-weight: 600; white-space: nowrap; padding-block: var(--sp-xs); color: rgba(16,36,26,0.6); border-bottom: 2px solid transparent; }
  .competition-subnav__link--active { color: var(--color-ridge-green); border-bottom-color: var(--color-ridge-green); }
`);

// competitions now has a real slug column (added via migration + auto-gen trigger).
// No badge/logo column exists in this schema, so competitionHeaderBlock omits it.
export async function fetchCompetition(slug) {
  const { data, error } = await supabase.from('competitions').select('id, slug, name, season, type').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { count } = await supabase.from('competition_teams').select('team_id', { count: 'exact', head: true }).eq('competition_id', data.id).eq('is_active', true);
  return { ...data, teamCount: count || 0 };
}

export function competitionHeaderBlock(comp) {
  return competitionHeader({ name: comp.name, season: comp.season, badgeUrl: null, teamCount: comp.teamCount });
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