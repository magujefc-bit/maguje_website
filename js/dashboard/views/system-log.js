import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('system-log-view', `
  .filters { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; }
  .filters select, .filters input { padding: 0.5rem 0.7rem; border: 1px solid #d3ded6; border-radius: 6px; font-size: 0.85rem; }
  .filters input[type="text"] { width: 220px; }
  .log-table { min-width: 1000px; width: 100%; table-layout: fixed; }
  .log-table th, .log-table td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .log-table th:nth-child(5), .log-table td:nth-child(5) { max-width: 320px; }
  .diff-list { margin: 0; padding-left: 1.1rem; font-size: 0.82rem; color: #444; }
  .diff-list li { margin-bottom: 2px; word-break: break-all; }
  .diff-old { color: #b3261e; text-decoration: line-through; }
  .diff-new { color: #109b45; }
  .load-more-wrap { text-align: center; margin-top: 1rem; }
`);

const PAGE_SIZE = 30;

export async function systemLogView() {
  const admin = await requireAdmin(['super_admin']);
  if (!admin) return { cleanup: null };

  let offset = 0;
  let currentFilters = { table: '', action: '', search: '' };
  const seenTables = new Set();

  viewContainer.render(`
    ${pageHeader('System Log', 'Recent admin activity across the system.')}

    <div class="filters">
      <select id="filter-table"><option value="">All tables</option></select>
      <select id="filter-action">
        <option value="">All actions</option>
        <option value="INSERT">Created</option>
        <option value="UPDATE">Updated</option>
        <option value="DELETE">Deleted</option>
      </select>
      <input id="filter-search" type="text" placeholder="Search by actor email…" />
      <button id="apply-filters" class="btn-primary">Apply</button>
      <button id="clear-filters" class="btn-secondary">Clear</button>
    </div>

    <p id="load-status" class="save-status"></p>

    <div class="table-wrap">
      <table class="data-table log-table">
        <thead>
          <tr><th>Who</th><th>Action</th><th>Table</th><th>Affected</th><th>Details</th><th>Time</th></tr>
        </thead>
        <tbody id="log-body"></tbody>
      </table>
    </div>

    <div class="load-more-wrap">
      <button id="load-more-btn" class="btn-secondary hidden">Load more</button>
    </div>
  `);

  document.getElementById('apply-filters').addEventListener('click', () => {
    currentFilters.table = document.getElementById('filter-table').value;
    currentFilters.action = document.getElementById('filter-action').value;
    currentFilters.search = document.getElementById('filter-search').value.trim();
    loadLog(true);
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('filter-table').value = '';
    document.getElementById('filter-action').value = '';
    document.getElementById('filter-search').value = '';
    currentFilters = { table: '', action: '', search: '' };
    loadLog(true);
  });

  document.getElementById('load-more-btn').addEventListener('click', () => loadLog(false));

  async function loadLog(reset) {
    const statusEl = document.getElementById('load-status');
    const tbody = document.getElementById('log-body');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (reset) {
      offset = 0;
      tbody.innerHTML = '';
    }

    statusEl.textContent = 'Loading...';

    try {
      let query = supabaseClient
        .from('system_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (currentFilters.table) query = query.eq('table_name', currentFilters.table);
      if (currentFilters.action) query = query.eq('action', currentFilters.action);
      if (currentFilters.search) query = query.ilike('actor_email', `%${currentFilters.search}%`);

      const { data, error } = await query;

      if (error) {
        statusEl.textContent = error.message;
        return;
      }

      statusEl.textContent = '';
      populateTableFilter(data);
      data.forEach((entry) => tbody.appendChild(renderRow(entry)));

      offset += data.length;
      loadMoreBtn.classList.toggle('hidden', data.length < PAGE_SIZE);
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Network error loading log.';
    }
  }

  function populateTableFilter(entries) {
    const select = document.getElementById('filter-table');
    entries.forEach((e) => {
      if (!seenTables.has(e.table_name)) {
        seenTables.add(e.table_name);
        const opt = document.createElement('option');
        opt.value = e.table_name;
        opt.textContent = e.table_name;
        select.appendChild(opt);
      }
    });
  }

  function describeAffected(entry) {
    const source = entry.new_data || entry.old_data || {};
    const candidateFields = ['email', 'name', 'full_name', 'title'];
    for (const field of candidateFields) {
      if (source[field]) return source[field];
    }
    return entry.record_id ? `#${entry.record_id.slice(0, 8)}…` : '—';
  }

  function renderRow(entry) {
    const tr = document.createElement('tr');

    const actor = entry.actor_email || 'System / automated';
    const when = new Date(entry.created_at).toLocaleString();
    const affected = describeAffected(entry);

    let details = '';
    if (entry.action === 'UPDATE' && entry.old_data && entry.new_data) {
      details = renderDiff(entry.old_data, entry.new_data);
    } else if (entry.action === 'INSERT') {
      details = `<span class="muted">New record created</span>`;
    } else if (entry.action === 'DELETE') {
      details = `<span class="muted">Record removed</span>`;
    }

    tr.innerHTML = `
      <td>${escapeHtml(actor)}</td>
      <td><span class="badge badge-${entry.action}">${entry.action}</span></td>
      <td>${escapeHtml(entry.table_name)}</td>
      <td>${escapeHtml(affected)}</td>
      <td>${details}</td>
      <td>${when}</td>
    `;
    return tr;
  }

  function renderDiff(oldData, newData) {
    const changed = [];
    const skipFields = new Set(['id', 'updated_at', 'updated_by', 'created_at']);
    const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    keys.forEach((key) => {
      if (skipFields.has(key)) return;
      const oldVal = oldData[key];
      const newVal = newData[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push(
          `<li><strong>${escapeHtml(key)}:</strong> <span class="diff-old">${escapeHtml(String(oldVal))}</span> → <span class="diff-new">${escapeHtml(String(newVal))}</span></li>`,
        );
      }
    });

    return changed.length
      ? `<ul class="diff-list">${changed.join('')}</ul>`
      : `<span class="muted">No field changes</span>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  loadLog(true);

  return { cleanup: null };
}
