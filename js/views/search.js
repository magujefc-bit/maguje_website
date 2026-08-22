import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { searchBox, bindSearchBox } from '../components/controls.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('search-view', `
  .search-view-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .search-view-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-sm); }
  .search-results { padding-bottom: var(--sp-2xl); }
  .search-result-group { margin-bottom: var(--sp-lg); }
  .search-result-group__label { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.05em; color: rgba(16,36,26,0.5); margin-bottom: var(--sp-xs); padding-bottom: var(--sp-2xs); border-bottom: 1px solid var(--color-line); }
  .search-result-row { display: block; padding: var(--sp-xs) 0; border-bottom: 1px solid var(--color-line); }
  .search-result-row__title { font-size: var(--fs-md); font-weight: 600; }
  .search-result-row__snippet { font-size: var(--fs-sm); color: rgba(16,36,26,0.6); }
  .search-prompt { text-align: center; padding-block: var(--sp-xl); color: rgba(16,36,26,0.5); }
`);

const TYPE_LABELS = { news: 'News', event: 'Events', activity: 'Community', player: 'Players', team: 'Team', competition: 'Competitions', official: 'Officials' };

export async function searchView(params, query) {
  const initialQuery = query.get('q') || '';

  await viewContainer.render(`
    <div class="container">
      <div class="search-view-header">
        <h1 class="search-view-title">Search</h1>
        ${searchBox({ placeholder: 'Search news, players, matches, competitions…', value: initialQuery })}
      </div>
      <div class="search-results" data-slot="results">${initialQuery ? '<div class="search-prompt">Searching…</div>' : '<div class="search-prompt">Start typing to search Maguje FC.</div>'}</div>
    </div>`);

  const root = document.querySelector('#app');
  bindSearchBox(root, (q) => runSearch(root, q));
  if (initialQuery) await runSearch(root, initialQuery, { skipUrlUpdate: true });
  return { cleanup: null };
}

async function runSearch(root, rawQuery, { skipUrlUpdate = false } = {}) {
  const slot = root.querySelector('[data-slot="results"]');
  const q = rawQuery.trim();
  if (!skipUrlUpdate) window.history.replaceState({}, '', q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  if (!q) { slot.innerHTML = '<div class="search-prompt">Start typing to search Maguje FC.</div>'; return; }
  if (q.length < 2) { slot.innerHTML = '<div class="search-prompt">Keep typing…</div>'; return; }

  slot.innerHTML = '<div class="search-prompt">Searching…</div>';
  try {
    const { data, error } = await supabase.from('v_search_index').select('type, title, snippet, path, sort_date').textSearch('search_vector', q, { type: 'websearch' }).order('sort_date', { ascending: false, nullsFirst: false }).limit(40);
    if (error) throw error;
    if (!data.length) { slot.innerHTML = states.empty({ message: `No results for "${q}".` }); return; }
    slot.innerHTML = renderGrouped(data);
  } catch (err) {
    console.error('[search] query failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, () => runSearch(root, rawQuery, { skipUrlUpdate }));
  }
}

function renderGrouped(results) {
  const groups = new Map();
  results.forEach(r => { if (!groups.has(r.type)) groups.set(r.type, []); groups.get(r.type).push(r); });
  return Array.from(groups.entries()).map(([type, items]) => `<div class="search-result-group"><div class="search-result-group__label">${TYPE_LABELS[type] || type} (${items.length})</div>${items.map(r => `<a href="${r.path}" class="search-result-row"><div class="search-result-row__title">${r.title}</div>${r.snippet ? `<div class="search-result-row__snippet">${r.snippet}</div>` : ''}</a>`).join('')}</div>`).join('');
}
