// js/dashboard/views/installs.js
import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';
import { renderPeriodChart } from '../components/period-chart.js';

injectStyle('installs-view', `
  .stat-hero { background: #fff; border: 1px solid #e2ece5; border-radius: 12px; padding: 1.2rem 1.4rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; max-width: 320px; }
  .stat-hero__value { font-size: 1.8rem; font-weight: 700; color: #109b45; line-height: 1; }
  .stat-hero__label { font-size: 0.8rem; color: #777; margin-top: 3px; }

  .load-more-wrap { text-align: center; margin-top: 1rem; }
`);

const PAGE_SIZE = 30;

export async function installsView() {
  const admin = await requireAdmin(['super_admin']);
  if (!admin) return { cleanup: null };

  viewContainer.render(`
    ${pageHeader('App Installs', 'When the PWA has been installed, over time.')}

    <div class="stat-hero">
      <div>
        <div class="stat-hero__value" id="installTotal">…</div>
        <div class="stat-hero__label">Total Installs</div>
      </div>
    </div>

    <div id="chartSlot"></div>

    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Time</th><th>Device</th></tr></thead>
        <tbody id="installsBody"></tbody>
      </table>
    </div>

    <div class="load-more-wrap">
      <button id="loadMoreBtn" class="btn-secondary hidden">Load more</button>
    </div>
  `);

  let offset = 0;
  let reachedEnd = false;

  loadTotalAndChart();
  loadPage();

  document.getElementById('loadMoreBtn').addEventListener('click', loadPage);

  async function loadTotalAndChart() {
    const { count, error: countError } = await supabaseClient
      .from('pwa_installs')
      .select('*', { count: 'exact', head: true });

    document.getElementById('installTotal').textContent = countError ? '—' : (count ?? 0);
    if (countError) console.error('[installs] count failed:', countError);

    const { data: rows, error: rowsError } = await supabaseClient
      .from('pwa_installs')
      .select('installed_at');

    if (rowsError) {
      console.error('[installs] chart data failed:', rowsError);
      return;
    }

    const timestamps = (rows || [])
      .map((r) => r.installed_at)
      .filter(Boolean);

    renderPeriodChart(document.getElementById('chartSlot'), timestamps);
  }

  async function loadPage() {
    if (reachedEnd) return;
    const btn = document.getElementById('loadMoreBtn');
    btn.disabled = true;
    btn.textContent = 'Loading…';

    const { data, error } = await supabaseClient
      .from('pwa_installs')
      .select('id, device_id, installed_at')
      .order('installed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    btn.disabled = false;
    btn.textContent = 'Load more';

    if (error) {
      console.error('[installs] list failed:', error);
      return;
    }

    const tbody = document.getElementById('installsBody');
    if (offset === 0 && !data.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-msg">No installs recorded yet.</td></tr>`;
    } else {
      tbody.insertAdjacentHTML('beforeend', data.map((row) => {
        const d = new Date(row.installed_at);
        return `
          <tr>
            <td>${d.toLocaleDateString()}</td>
            <td>${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${row.device_id.slice(0, 8)}…</td>
          </tr>`;
      }).join(''));
    }

    offset += data.length;
    if (data.length < PAGE_SIZE) {
      reachedEnd = true;
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  }

  return { cleanup: null };
}