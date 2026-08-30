import { viewContainer } from '../view-container.js';
import { requireOwner } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('report-issue-dashboard-view', `
  .report-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
  .report-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.6rem; flex-wrap: wrap; }
  .report-card__date { font-size: 0.78rem; color: #888; }
  .report-card__desc { margin: 0.5rem 0; font-size: 0.9rem; color: #222; white-space: pre-wrap; }
  .report-card__meta { font-size: 0.78rem; color: #888; margin-bottom: 0.5rem; }
  .report-card__meta a { color: #109b45; }
  .report-card__screenshot { max-width: 220px; border-radius: 6px; display: block; margin-bottom: 0.6rem; cursor: zoom-in; }
  .report-card__actions { display: flex; align-items: center; gap: 0.6rem; }
  .report-card__actions select { padding: 0.4rem 0.6rem; border: 1px solid #d3ded6; border-radius: 6px; font-size: 0.82rem; }
  .status-pill { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; text-transform: capitalize; }
  .status-open { background: #fdeceb; color: #c43b3b; }
  .status-reviewed { background: #fff6e0; color: #b8860b; }
  .status-resolved { background: #eaf6ee; color: #109b45; }
`);

export async function reportIssueDashboardView() {
  const admin = await requireOwner();
  if (!admin) return { cleanup: null };

  viewContainer.render(`
    ${pageHeader('Bug Reports', 'Issues reported by visitors and admins from the "Report an Issue" page.')}

    <div class="card">
      <div id="reports-status" class="save-status"></div>
      <div id="reports-list"></div>
    </div>
  `);

  await loadReports();

  async function loadReports() {
    const statusEl = document.getElementById('reports-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('issue_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      statusEl.textContent = error.message;
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = '';

    const list = document.getElementById('reports-list');

    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No issues reported yet.</div>`;
      return;
    }

    list.innerHTML = '';
    data.forEach((report) => list.appendChild(renderReportCard(report)));
  }

  function renderReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const date = new Date(report.created_at).toLocaleString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    card.innerHTML = `
      <div class="report-card__top">
        <span class="status-pill status-${report.status}">${report.status}</span>
        <span class="report-card__date">${date}</span>
      </div>

      <p class="report-card__desc">${escapeHtml(report.description)}</p>

      <div class="report-card__meta">
        ${report.reporter_context ? `From: ${escapeHtml(report.reporter_context)}` : ''}
        ${report.page_url ? ` · Page: <a href="${report.page_url}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.page_url)}</a>` : ''}
      </div>

      ${report.screenshot_url ? `<img src="${report.screenshot_url}" alt="Screenshot" class="report-card__screenshot" data-open-image>` : ''}

      <div class="report-card__actions">
        <select data-status-select>
          <option value="open" ${report.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="reviewed" ${report.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
          <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    card.querySelector('[data-status-select]').addEventListener('change', async (e) => {
      const { error } = await supabaseClient
        .from('issue_reports')
        .update({ status: e.target.value })
        .eq('id', report.id);

      if (error) { alert(error.message); return; }
      loadReports();
    });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this report? This cannot be undone.')) return;

      const { error } = await supabaseClient
        .from('issue_reports')
        .delete()
        .eq('id', report.id);

      if (error) { alert(error.message); return; }
      loadReports();
    });

    const screenshot = card.querySelector('[data-open-image]');
    if (screenshot) {
      screenshot.addEventListener('click', () => {
        window.open(report.screenshot_url, '_blank', 'noopener,noreferrer');
      });
    }

    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { cleanup: null };
}
