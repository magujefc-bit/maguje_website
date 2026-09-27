// js/dashboard/views/supporters.js
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';
import { renderPeriodChart } from '../components/period-chart.js';

injectStyle('supporters-view', `
  .stat-hero { background: #fff; border: 1px solid #e2ece5; border-radius: 12px; padding: 1.2rem 1.4rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; max-width: 320px; }
  .stat-hero__value { font-size: 1.8rem; font-weight: 700; color: #109b45; line-height: 1; }
  .stat-hero__label { font-size: 0.8rem; color: #777; margin-top: 3px; }

  .filters { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; }
  .filters input[type="text"] { width: 240px; padding: 0.5rem 0.7rem; border: 1px solid #d3ded6; border-radius: 6px; font-size: 0.85rem; }

  .load-more-wrap { text-align: center; margin-top: 1rem; }
`);

const PAGE_SIZE = 30;

export async function supportersView() {
  const admin = await requireAdmin(['super_admin', 'senior_manager']);
  if (!admin) return { cleanup: null };

  viewContainer.render(`
    ${pageHeader('Supporters', 'Everyone with a supporter account, and when they joined.')}

    <div class="stat-hero">
      <div>
        <div class="stat-hero__value" id="supporterTotal">…</div>
        <div class="stat-hero__label">Total Supporters</div>
      </div>
    </div>

    <div id="chartSlot"></div>

    <div class="filters">
      <input id="searchInput" type="text" placeholder="Search by name or email…" />
      <button id="searchBtn" class="btn-primary">Search</button>
      <button id="clearBtn" class="btn-secondary">Clear</button>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
        <tbody id="supportersBody"></tbody>
      </table>
    </div>

    <div class="load-more-wrap">
      <button id="loadMoreBtn" class="btn-secondary hidden">Load more</button>
    </div>
  `);

  let offset = 0;
  let reachedEnd = false;
  let searchTerm = '';

  loadTotalAndChart();
  loadPage();

  document.getElementById('loadMoreBtn').addEventListener('click', loadPage);
  document.getElementById('searchBtn').addEventListener('click', () => {
    searchTerm = document.getElementById('searchInput').value.trim();
    resetAndReload();
  });
  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    searchTerm = '';
    resetAndReload();
  });

  function resetAndReload() {
    offset = 0;
    reachedEnd = false;
    document.getElementById('supportersBody').innerHTML = '';
    loadPage();
  }

  async function loadTotalAndChart() {
    const { count, error: countError } = await supabaseClient
      .from('supporters')
      .select('*', { count: 'exact', head: true });

    document.getElementById('supporterTotal').textContent = countError ? '—' : (count ?? 0);
    if (countError) console.error('[supporters] count failed:', countError);

    const { data: rows, error: rowsError } = await supabaseClient
      .from('supporters')
      .select('created_at');

    if (rowsError) {
      console.error('[supporters] chart data failed:', rowsError);
      return;
    }

    const timestamps = (rows || []).map((r) => r.created_at).filter(Boolean);
    renderPeriodChart(document.getElementById('chartSlot'), timestamps, countError ? null : (count ?? 0), { entityLabel: 'supporters' });
  }

  async function loadPage() {
    if (reachedEnd) return;
    const btn = document.getElementById('loadMoreBtn');
    btn.disabled = true;
    btn.textContent = 'Loading…';

    let query = supabaseClient
      .from('supporters')
      .select('id, full_name, email, created_at, is_active')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    btn.disabled = false;
    btn.textContent = 'Load more';

    if (error) {
      console.error('[supporters] list failed:', error);
      return;
    }

    const tbody = document.getElementById('supportersBody');
    if (offset === 0 && !data.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No supporters found.</td></tr>`;
    } else {
      tbody.insertAdjacentHTML('beforeend', data.map((row) => `
        <tr>
          <td>${row.full_name || '—'}</td>
          <td>${row.email || '—'}</td>
          <td>${new Date(row.created_at).toLocaleDateString()}</td>
          <td><span class="badge ${row.is_active ? 'badge-active' : 'badge-banned'}">${row.is_active ? 'Active' : 'Deactivated'}</span></td>
          <td>
            <button class="btn-secondary" data-id="${row.id}" data-active="${row.is_active}">
              ${row.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          </td>
        </tr>`).join(''));
    }

    wireActionButtons();

    offset += data.length;
    if (data.length < PAGE_SIZE) {
      reachedEnd = true;
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  }

  function wireActionButtons() {
    document.querySelectorAll('#supportersBody button[data-id]').forEach((btn) => {
      // Avoid double-binding rows that already have a listener from a
      // previous loadPage() call — only wire freshly inserted rows.
      if (btn.dataset.wired) return;
      btn.dataset.wired = 'true';

      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const isActive = btn.dataset.active === 'true';
        const action = isActive ? 'deactivate' : 'reactivate';

        btn.disabled = true;
        btn.textContent = '…';

        const { data, error } = await supabaseClient.functions.invoke('manage-supporter', {
          body: { supporter_id: id, action },
        });

        if (error || data?.error) {
          console.error('[supporters] manage-supporter failed:', error || data.error);
          alert('Could not update this supporter. Try again.');
          btn.disabled = false;
          btn.textContent = isActive ? 'Deactivate' : 'Reactivate';
          return;
        }

        const row = btn.closest('tr');
        const statusCell = row.children[3];
        statusCell.innerHTML = `<span class="badge ${!isActive ? 'badge-active' : 'badge-banned'}">${!isActive ? 'Active' : 'Deactivated'}</span>`;

        btn.dataset.active = String(!isActive);
        btn.textContent = !isActive ? 'Deactivate' : 'Reactivate';
        btn.disabled = false;
      });
    });
  }

  return { cleanup: null };
}