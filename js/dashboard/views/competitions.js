import { dashPath } from '../config.js';
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('competitions-view', `
  .competition-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; }
  .competition-name { font-weight: 700; font-size: 0.95rem; color: #222; margin: 0; }
  .competition-meta { font-size: 0.78rem; color: #888; margin: 2px 0 0; }
  .match-count-pill { font-size: 0.72rem; background: #eaf6ee; color: #109b45; padding: 2px 8px; border-radius: 10px; font-weight: 700; margin-top: 4px; display: inline-block; }
`);

export async function competitionsView() {
  const admin = await requireAdmin(['match_manager']);
  if (!admin) return { cleanup: null };

  let allCompetitions = [];
  let matchCounts = {};
  let completedCounts = {};

  viewContainer.render(`
    ${pageHeader('Competitions', 'Create competitions and manage their matches.')}

    <div class="card">
      <h2>Add Competition</h2>
      <div class="field-grid">
        <div>
          <label>Name</label>
          <input type="text" id="new-comp-name" placeholder="e.g. County League">
        </div>
        <div>
          <label>Season</label>
          <input type="text" id="new-comp-season" placeholder="e.g. 2026">
        </div>
      </div>
      <div class="field-grid">
        <div>
          <label>Type</label>
          <select id="new-comp-type">
            <option value="League">League</option>
            <option value="Friendly">Friendly</option>
            <option value="Tournament">Tournament</option>
          </select>
        </div>
        <div></div>
      </div>
      <div class="field-grid">
        <div>
          <label>Start Date</label>
          <input type="date" id="new-comp-start">
        </div>
        <div>
          <label>End Date</label>
          <input type="date" id="new-comp-end">
        </div>
      </div>
      <button id="create-comp-btn" class="btn-primary">Add Competition</button>
      <span id="comp-create-status" class="save-status"></span>
    </div>

    <div class="card">
      <h2>All Competitions</h2>
      <p id="comp-load-status" class="save-status"></p>
      <div id="competitions-list"></div>
    </div>
  `);

  document.getElementById('create-comp-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('comp-create-status');
    const name = document.getElementById('new-comp-name').value.trim();
    const season = document.getElementById('new-comp-season').value.trim() || null;
    const type = document.getElementById('new-comp-type').value;
    const start_date = document.getElementById('new-comp-start').value || null;
    const end_date = document.getElementById('new-comp-end').value || null;

    if (!name) { statusEl.textContent = 'Name is required.'; statusEl.classList.add('error'); return; }

    const { error } = await supabaseClient.from('competitions').insert({ name, season, type, start_date, end_date });
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    document.getElementById('new-comp-name').value = '';
    document.getElementById('new-comp-season').value = '';
    document.getElementById('new-comp-type').value = 'League';
    document.getElementById('new-comp-start').value = '';
    document.getElementById('new-comp-end').value = '';

    statusEl.textContent = 'Added ✓';
    statusEl.classList.remove('error');
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
    loadCompetitions();
  });

  async function loadCompetitions() {
    const statusEl = document.getElementById('comp-load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('competitions')
      .select('*')
      .order('start_date', { ascending: false, nullsFirst: false });

    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    allCompetitions = data;

    const { data: matches } = await supabaseClient
      .from('matches')
      .select('competition_id, status');

    matchCounts = {};
    completedCounts = {};
    (matches || []).forEach(m => {
      matchCounts[m.competition_id] = (matchCounts[m.competition_id] || 0) + 1;
      if (m.status === 'completed') {
        completedCounts[m.competition_id] = (completedCounts[m.competition_id] || 0) + 1;
      }
    });

    statusEl.textContent = '';
    renderCompetitionsList();
  }

  function renderCompetitionsList() {
    const list = document.getElementById('competitions-list');
    if (!allCompetitions.length) {
      list.innerHTML = `<div class="empty-msg">No competitions yet.</div>`;
      return;
    }

    list.innerHTML = '';
    allCompetitions.forEach(c => {
      const count = matchCounts[c.id] || 0;
      const hasCompleted = (completedCounts[c.id] || 0) > 0;

      const card = document.createElement('div');
      card.className = 'competition-card';
      card.innerHTML = `
        <div>
          <p class="competition-name">${escapeHtml(c.name)}${c.season ? ` <span style="font-weight:400;color:#888;">(${escapeHtml(c.season)})</span>` : ''}</p>
          <p class="competition-meta">${escapeHtml(c.type || '—')} · ${c.start_date || '—'} to ${c.end_date || '—'}</p>
          <span class="match-count-pill">${count} match${count === 1 ? '' : 'es'}</span>
        </div>
        <div class="item-actions">
          <a class="btn-primary" style="text-decoration:none;" href="${dashPath('/competitions/detail')}?id=${c.id}">Manage Matches</a>
          ${hasCompleted
            ? '<span style="font-size:0.78rem; color:#999; font-style:italic;">🔒 Has played matches</span>'
            : '<button class="btn-danger delete-comp-btn">Delete</button>'}
        </div>
      `;

      card.querySelector('.delete-comp-btn')?.addEventListener('click', async () => {
        if (!confirm(`Delete competition "${c.name}"? This also deletes all its matches.`)) return;
        const { error } = await supabaseClient.from('competitions').delete().eq('id', c.id);
        if (error) {
          alert("Can't delete — this competition has completed matches, which are kept for record-keeping.");
          return;
        }
        loadCompetitions();
      });

      list.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  loadCompetitions();

  return { cleanup: null };
}