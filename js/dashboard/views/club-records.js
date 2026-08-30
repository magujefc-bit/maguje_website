import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('club-records-view', `
  .tabs { display: flex; gap: 0.4rem; margin-bottom: 1.2rem; border-bottom: 2px solid #e2ece5; }
  .tab-btn { background: none; border: none; padding: 0.7rem 1.1rem; font-size: 0.9rem; font-weight: 600; color: #777; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
  .tab-btn.active { color: #109b45; border-bottom-color: #109b45; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
  .honour-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.7rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.6rem; flex-wrap: wrap; }
  .honour-title { font-weight: 700; font-size: 0.95rem; color: #222; margin: 0; }
  .honour-meta { font-size: 0.78rem; color: #888; margin: 2px 0 4px; }
  .honour-desc { font-size: 0.85rem; color: #555; margin: 0; }
  .item-actions { display: flex; gap: 0.4rem; }
  .record-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.2rem; }
  .record-box { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 1.2rem; }
  .record-box h3 { margin: 0 0 0.7rem; font-size: 0.85rem; color: #109b45; text-transform: uppercase; letter-spacing: 0.03em; }
  .leader-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid #f0f4f1; font-size: 0.85rem; }
  .leader-row:last-child { border-bottom: none; }
  .leader-name { color: #333; }
  .leader-value { font-weight: 700; color: #109b45; }
  .biggest-win-box { text-align: center; padding: 1.5rem; }
  .biggest-win-box .matchup { font-size: 1.1rem; font-weight: 700; color: #222; margin-bottom: 0.3rem; }
  .biggest-win-box .score { font-size: 1.8rem; font-weight: 800; color: #109b45; margin-bottom: 0.3rem; }
  .biggest-win-box .meta { font-size: 0.8rem; color: #888; }
`);

export async function clubRecordsView() {
  const admin = await requireAdmin(['senior_manager']);
  if (!admin) return { cleanup: null };

  let ourClubName = 'Our Club';
  let allTeams = [];

  viewContainer.render(`
    ${pageHeader('Club All-Time Records', 'All-time statistical records, honours, and achievements.')}

    <div class="tabs">
      <button class="tab-btn active" data-tab="stats">All-Time Stats</button>
      <button class="tab-btn" data-tab="honours">Honours</button>
    </div>

    <!-- ===================== ALL-TIME STATS TAB ===================== -->
    <div class="tab-panel active" id="tab-stats">
      <p id="records-load-status" class="save-status"></p>

      <div class="record-grid">
        <div class="record-box"><h3>Top Scorers</h3><div id="top-scorers-list"></div></div>
        <div class="record-box"><h3>Most Appearances</h3><div id="top-appearances-list"></div></div>
        <div class="record-box"><h3>Most Assists</h3><div id="top-assists-list"></div></div>
        <div class="record-box"><h3>Discipline (Cards)</h3><div id="top-discipline-list"></div></div>
      </div>

      <div class="record-box biggest-win-box" id="biggest-win-box">
        <div class="empty-msg">Loading biggest win…</div>
      </div>
    </div>

    <!-- ===================== HONOURS TAB ===================== -->
    <div class="tab-panel" id="tab-honours">
      <div class="card">
        <h2>Add Honour</h2>
        <div class="field-grid">
          <div>
            <label>Title</label>
            <input type="text" id="new-honour-title" placeholder="e.g. County League Champions">
          </div>
          <div>
            <label>Category</label>
            <input type="text" id="new-honour-category" placeholder="e.g. Champions, Cup Winners, Promotion">
          </div>
        </div>
        <div class="field-grid">
          <div>
            <label>Season</label>
            <input type="text" id="new-honour-season" placeholder="e.g. 2024/2025">
          </div>
          <div></div>
        </div>
        <div class="field-grid full">
          <div>
            <label>Description</label>
            <textarea id="new-honour-desc" placeholder="Optional details"></textarea>
          </div>
        </div>
        <button id="create-honour-btn" class="btn-primary">Add Honour</button>
        <span id="honour-create-status" class="save-status"></span>
      </div>

      <div class="card">
        <h2>Honours & Achievements</h2>
        <p id="honours-load-status" class="save-status"></p>
        <div id="honours-list"></div>
      </div>
    </div>
  `);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  async function loadClubName() {
    const { data } = await supabaseClient.from('club_profile').select('name').eq('id', 1).single();
    ourClubName = (data && data.name) ? data.name : 'Our Club';
  }
  async function loadTeams() {
    const { data } = await supabaseClient.from('teams').select('*');
    allTeams = data || [];
  }
  function teamName(id) {
    const t = allTeams.find(t => t.id === id);
    return t ? t.name : 'Unknown team';
  }

  // ================= HONOURS =================
  async function loadHonours() {
    const statusEl = document.getElementById('honours-load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('club_honours')
      .select('*')
      .order('season', { ascending: false, nullsFirst: false });

    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
    statusEl.textContent = '';

    const list = document.getElementById('honours-list');
    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No honours recorded yet.</div>`;
      return;
    }

    list.innerHTML = '';
    data.forEach(h => list.appendChild(renderHonourCard(h)));
  }

  function renderHonourCard(h) {
    const card = document.createElement('div');
    card.className = 'honour-card';
    card.innerHTML = `
      <div>
        <p class="honour-title">🏆 ${escapeHtml(h.title)}</p>
        <p class="honour-meta">${escapeHtml(h.category || '—')} ${h.season ? '· ' + escapeHtml(h.season) : ''}</p>
        ${h.description ? `<p class="honour-desc">${escapeHtml(h.description)}</p>` : ''}
      </div>
      <div class="item-actions">
        <button class="btn-secondary edit-honour-btn">Edit</button>
        <button class="btn-danger delete-honour-btn">Delete</button>
      </div>
    `;

    card.querySelector('.delete-honour-btn').addEventListener('click', async () => {
      if (!confirm(`Delete honour "${h.title}"?`)) return;
      const { error } = await supabaseClient.from('club_honours').delete().eq('id', h.id);
      if (error) { alert(error.message); return; }
      loadHonours();
    });

    card.querySelector('.edit-honour-btn').addEventListener('click', () => enterHonourEditMode(card, h));

    return card;
  }

  function enterHonourEditMode(card, h) {
    card.innerHTML = `
      <div style="width:100%;">
        <div class="field-grid">
          <div>
            <label>Title</label>
            <input type="text" class="edit-title" value="${escapeAttr(h.title)}">
          </div>
          <div>
            <label>Category</label>
            <input type="text" class="edit-category" value="${escapeAttr(h.category || '')}">
          </div>
        </div>
        <div class="field-grid">
          <div>
            <label>Season</label>
            <input type="text" class="edit-season" value="${escapeAttr(h.season || '')}">
          </div>
          <div></div>
        </div>
        <div class="field-grid full">
          <div>
            <label>Description</label>
            <textarea class="edit-desc">${escapeHtml(h.description || '')}</textarea>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn-primary save-honour-btn">Save</button>
          <button class="btn-secondary cancel-honour-btn">Cancel</button>
        </div>
        <span class="save-status edit-honour-status"></span>
      </div>
    `;

    card.querySelector('.cancel-honour-btn').addEventListener('click', () => loadHonours());

    card.querySelector('.save-honour-btn').addEventListener('click', async () => {
      const statusEl = card.querySelector('.edit-honour-status');
      const title = card.querySelector('.edit-title').value.trim();
      const category = card.querySelector('.edit-category').value.trim() || null;
      const season = card.querySelector('.edit-season').value.trim() || null;
      const description = card.querySelector('.edit-desc').value.trim() || null;

      if (!title) { statusEl.textContent = 'Title is required.'; statusEl.classList.add('error'); return; }

      const { error } = await supabaseClient
        .from('club_honours')
        .update({ title, category, season, description })
        .eq('id', h.id);

      if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
      loadHonours();
    });
  }

  document.getElementById('create-honour-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('honour-create-status');
    const title = document.getElementById('new-honour-title').value.trim();
    const category = document.getElementById('new-honour-category').value.trim() || null;
    const season = document.getElementById('new-honour-season').value.trim() || null;
    const description = document.getElementById('new-honour-desc').value.trim() || null;

    if (!title) { statusEl.textContent = 'Title is required.'; statusEl.classList.add('error'); return; }

    const { error } = await supabaseClient.from('club_honours').insert({ title, category, season, description });
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }

    document.getElementById('new-honour-title').value = '';
    document.getElementById('new-honour-category').value = '';
    document.getElementById('new-honour-season').value = '';
    document.getElementById('new-honour-desc').value = '';

    statusEl.textContent = 'Added ✓';
    statusEl.classList.remove('error');
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
    loadHonours();
  });

  // ================= ALL-TIME STATS =================
  async function loadAllTimeRecords() {
    const statusEl = document.getElementById('records-load-status');
    statusEl.textContent = 'Loading...';

    const { data: stats, error } = await supabaseClient.from('v_player_stats').select('*');
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
    statusEl.textContent = '';

    renderLeaderboard('top-scorers-list', stats, 'goals');
    renderLeaderboard('top-appearances-list', stats, 'appearances');
    renderLeaderboard('top-assists-list', stats, 'assists');
    renderDisciplineLeaderboard(stats);
    loadBiggestWin();
  }

  function renderLeaderboard(elId, stats, field, limit = 5) {
    const container = document.getElementById(elId);
    const sorted = [...stats].filter(p => p[field] > 0).sort((a, b) => b[field] - a[field]).slice(0, limit);

    if (!sorted.length) {
      container.innerHTML = `<div class="empty-msg">No data yet.</div>`;
      return;
    }

    container.innerHTML = sorted.map(p => `
      <div class="leader-row">
        <span class="leader-name">${escapeHtml(p.player_name || 'Unknown player')}</span>
        <span class="leader-value">${p[field]}</span>
      </div>
    `).join('');
  }

  function renderDisciplineLeaderboard(stats, limit = 5) {
    const container = document.getElementById('top-discipline-list');
    const withCards = stats
      .map(p => ({ ...p, totalCards: (p.yellow_cards || 0) + (p.red_cards || 0) }))
      .filter(p => p.totalCards > 0)
      .sort((a, b) => b.totalCards - a.totalCards)
      .slice(0, limit);

    if (!withCards.length) {
      container.innerHTML = `<div class="empty-msg">No cards recorded yet.</div>`;
      return;
    }

    container.innerHTML = withCards.map(p => `
      <div class="leader-row">
        <span class="leader-name">${escapeHtml(p.player_name || 'Unknown player')}</span>
        <span class="leader-value">🟨${p.yellow_cards} 🟥${p.red_cards}</span>
      </div>
    `).join('');
  }

  async function loadBiggestWin() {
    const box = document.getElementById('biggest-win-box');

    const { data, error } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('is_internal', true)
      .eq('status', 'completed');

    if (error || !data || !data.length) {
      box.innerHTML = `<div class="empty-msg">No completed matches yet.</div>`;
      return;
    }

    let biggest = null;
    let biggestMargin = -1;

    data.forEach(m => {
      const margin = m.our_score - m.opponent_score;
      if (margin > biggestMargin) {
        biggestMargin = margin;
        biggest = m;
      }
    });

    if (!biggest || biggestMargin <= 0) {
      box.innerHTML = `<div class="empty-msg">No wins recorded yet.</div>`;
      return;
    }

    const homeSide = biggest.is_home ? ourClubName : teamName(biggest.opponent_team_id);
    const awaySide = biggest.is_home ? teamName(biggest.opponent_team_id) : ourClubName;
    const homeScore = biggest.is_home ? biggest.our_score : biggest.opponent_score;
    const awayScore = biggest.is_home ? biggest.opponent_score : biggest.our_score;

    box.innerHTML = `
      <h3>Biggest Win</h3>
      <div class="matchup">${escapeHtml(homeSide)} vs ${escapeHtml(awaySide)}</div>
      <div class="score">${homeScore} – ${awayScore}</div>
      <div class="meta">${biggest.match_date || ''}</div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  loadClubName().then(() => {
    loadTeams();
    loadHonours();
    loadAllTimeRecords();
  });

  return { cleanup: null };
      }
