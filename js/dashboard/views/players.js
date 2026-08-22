import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('players-view', `
  .toolbar input[type="text"] { width: 220px; }
  .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
  .player-card { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 1rem; transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .player-card:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(16,155,69,0.12); }
  .player-top { display: flex; gap: 0.8rem; align-items: flex-start; }
  .photo-thumb { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; background: #f0f4f1; flex-shrink: 0; }
  .player-info { flex: 1; min-width: 0; }
  .player-name { font-weight: 700; font-size: 0.95rem; color: #222; margin: 0 0 2px; }
  .player-meta { font-size: 0.78rem; color: #666; margin: 0 0 6px; }
  .player-tag { font-size: 0.75rem; background: #eaf6ee; color: #109b45; font-weight: 600; padding: 2px 7px; border-radius: 10px; margin-right: 4px; display: inline-block; }
  .player-tag.jersey-tag { background: #eef2fb; color: #2952a3; }
  .player-bio { font-size: 0.8rem; color: #666; margin: 0.6rem 0 0; }
  .player-actions { display: flex; gap: 0.4rem; margin-top: 0.8rem; }
`);

export async function playersView() {
  const admin = await requireAdmin(['senior_manager']);
  if (!admin) return { cleanup: null };

  let allPlayers = [];

  viewContainer.render(`
    ${pageHeader('Players', "Manage the club's player roster.")}

    <!-- ADD NEW -->
    <div class="card">
      <h2>Add New Player</h2>
      <div class="field-grid">
        <div>
          <label for="new-full-name">Full Name</label>
          <input type="text" id="new-full-name">
        </div>
        <div>
          <label for="new-team-name">Field / Shirt Name</label>
          <input type="text" id="new-team-name" placeholder="e.g. Ronaldo, Chao">
        </div>
      </div>
      <div class="field-grid three">
        <div>
          <label for="new-position">Position</label>
          <input type="text" id="new-position" placeholder="e.g. GK, LB, ST">
        </div>
        <div>
          <label for="new-jersey-number">Jersey Number</label>
          <input type="number" id="new-jersey-number" min="1" max="99" placeholder="e.g. 9">
        </div>
        <div>
          <label for="new-foot">Preferred Foot</label>
          <select id="new-foot">
            <option value="">—</option>
            <option value="Left">Left</option>
            <option value="Right">Right</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>
      <div class="field-grid">
        <div>
          <label for="new-player-role">Player Role</label>
          <input type="text" id="new-player-role" placeholder="e.g. Captain">
        </div>
      </div>
      <div class="field-grid full">
        <div>
          <label for="new-bio">Bio</label>
          <textarea id="new-bio"></textarea>
        </div>
      </div>
      <div class="field-grid">
        <div>
          <label for="new-photo">Photo</label>
          <input type="file" id="new-photo" accept="image/png, image/jpeg, image/webp">
        </div>
        <div class="checkbox-row" style="align-self:flex-end; margin-bottom: 1rem;">
          <input type="checkbox" id="new-is-active" checked>
          <label for="new-is-active" style="margin:0;">Active</label>
        </div>
      </div>
      <button id="create-player-btn" class="btn-primary">Add Player</button>
      <span id="create-status" class="save-status"></span>
    </div>

    <!-- LIST -->
    <div class="toolbar">
      <input type="text" id="search-input" placeholder="Search by name, field name, or position…">
      <select id="filter-active">
        <option value="">All statuses</option>
        <option value="true">Active only</option>
        <option value="false">Inactive only</option>
      </select>
    </div>

    <p id="load-status" class="save-status"></p>

    <div class="players-grid" id="players-grid"></div>
  `);

  // ---------- LOAD + FILTER ----------
  async function loadPlayers() {
    const statusEl = document.getElementById('load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('players')
      .select('*')
      .order('full_name');

    if (error) {
      statusEl.textContent = error.message;
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = '';
    allPlayers = data;
    renderGrid();
  }

  document.getElementById('search-input').addEventListener('input', renderGrid);
  document.getElementById('filter-active').addEventListener('change', renderGrid);

  function renderGrid() {
    const search = document.getElementById('search-input').value.trim().toLowerCase();
    const activeFilter = document.getElementById('filter-active').value;
    const grid = document.getElementById('players-grid');

    let filtered = allPlayers.filter(p => {
      const matchesSearch = !search ||
        p.full_name.toLowerCase().includes(search) ||
        (p.team_name || '').toLowerCase().includes(search) ||
        (p.position || '').toLowerCase().includes(search);
      const matchesActive = activeFilter === '' || String(p.is_active) === activeFilter;
      return matchesSearch && matchesActive;
    });

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-msg">No players found.</div>`;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(p => grid.appendChild(renderPlayerCard(p)));
  }

  function renderPlayerCard(item) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-top">
        <img class="photo-thumb" src="${item.photo_url || ''}" onerror="this.style.visibility='hidden'">
        <div class="player-info">
          <p class="player-name">${escapeHtml(item.team_name || '—')}</p>
          <p class="player-meta">${escapeHtml(item.full_name)}</p>
          ${item.jersey_number ? `<span class="player-tag jersey-tag">#${escapeHtml(String(item.jersey_number))}</span>` : ''}
          <span class="player-tag">${escapeHtml(item.position || '—')}</span>
          ${item.player_role ? `<span class="player-tag">${escapeHtml(item.player_role)}</span>` : ''}
          <div style="margin-top:4px;">
            <span class="status-pill ${item.is_active ? 'status-active' : 'status-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>
      ${item.bio ? `<p class="player-bio">${escapeHtml(item.bio)}</p>` : ''}
      <div class="player-actions">
        <button class="btn-secondary edit-btn">Edit</button>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => enterEditMode(card, item));
    card.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete ${item.full_name}?`)) return;
      const { error } = await supabaseClient.from('players').delete().eq('id', item.id);
      if (error) { alert(error.message); return; }
      loadPlayers();
    });

    return card;
  }

  // ---------- CREATE ----------
  document.getElementById('create-player-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('create-status');
    const full_name = document.getElementById('new-full-name').value.trim();
    const team_name = document.getElementById('new-team-name').value.trim() || null;
    const position = document.getElementById('new-position').value.trim() || null;
    const jerseyRaw = document.getElementById('new-jersey-number').value.trim();
    const jersey_number = jerseyRaw ? Number(jerseyRaw) : null;
    const prefered_foot = document.getElementById('new-foot').value || null;
    const player_role = document.getElementById('new-player-role').value.trim() || null;
    const bio = document.getElementById('new-bio').value.trim() || null;
    const is_active = document.getElementById('new-is-active').checked;
    const fileInput = document.getElementById('new-photo');

    if (!full_name) {
      statusEl.textContent = 'Full name is required.';
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = 'Saving...';
    statusEl.classList.remove('error');

    const { data: inserted, error } = await supabaseClient
      .from('players')
      .insert({ full_name, team_name, position, jersey_number, prefered_foot, player_role, bio, is_active })
      .select()
      .single();

    if (error) {
      statusEl.textContent = error.message;
      statusEl.classList.add('error');
      return;
    }

    if (fileInput.files[0]) {
      const photoUrl = await uploadPhoto(fileInput.files[0], 'players', inserted.id);
      if (photoUrl) {
        await supabaseClient.from('players').update({ photo_url: photoUrl }).eq('id', inserted.id);
      }
    }

    document.getElementById('new-full-name').value = '';
    document.getElementById('new-team-name').value = '';
    document.getElementById('new-position').value = '';
    document.getElementById('new-jersey-number').value = '';
    document.getElementById('new-foot').value = '';
    document.getElementById('new-player-role').value = '';
    document.getElementById('new-bio').value = '';
    document.getElementById('new-is-active').checked = true;
    fileInput.value = '';

    statusEl.textContent = 'Added ✓';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
    loadPlayers();
  });

  // ---------- EDIT ----------
  function enterEditMode(card, item) {
    card.innerHTML = `
      <div class="field-grid">
        <div>
          <label>Full Name</label>
          <input type="text" class="edit-name" value="${escapeAttr(item.full_name)}">
        </div>
        <div>
          <label>Field / Shirt Name</label>
          <input type="text" class="edit-team" value="${escapeAttr(item.team_name || '')}">
        </div>
      </div>
      <div class="field-grid three">
        <div>
          <label>Position</label>
          <input type="text" class="edit-position" value="${escapeAttr(item.position || '')}">
        </div>
        <div>
          <label>Jersey Number</label>
          <input type="number" class="edit-jersey-number" min="1" max="99" value="${escapeAttr(item.jersey_number ?? '')}">
        </div>
        <div>
          <label>Preferred Foot</label>
          <select class="edit-foot">
            <option value="" ${!item.prefered_foot ? 'selected' : ''}>—</option>
            <option value="Left" ${item.prefered_foot === 'Left' ? 'selected' : ''}>Left</option>
            <option value="Right" ${item.prefered_foot === 'Right' ? 'selected' : ''}>Right</option>
            <option value="Both" ${item.prefered_foot === 'Both' ? 'selected' : ''}>Both</option>
          </select>
        </div>
      </div>
      <div class="field-grid">
        <div>
          <label>Player Role</label>
          <input type="text" class="edit-player-role" value="${escapeAttr(item.player_role || '')}">
        </div>
      </div>
      <div class="field-grid full">
        <div>
          <label>Bio</label>
          <textarea class="edit-bio">${escapeHtml(item.bio || '')}</textarea>
        </div>
      </div>
      <div class="field-grid">
        <div>
          <label>Replace Photo</label>
          <input type="file" class="edit-photo" accept="image/png, image/jpeg, image/webp">
        </div>
        <div class="checkbox-row" style="align-self:flex-end; margin-bottom: 1rem;">
          <input type="checkbox" class="edit-active" ${item.is_active ? 'checked' : ''}>
          <label style="margin:0;">Active</label>
        </div>
      </div>
      <div class="player-actions">
        <button class="btn-primary save-edit-btn">Save</button>
        <button class="btn-secondary cancel-edit-btn">Cancel</button>
      </div>
      <span class="save-status edit-status"></span>
    `;

    card.querySelector('.save-edit-btn').addEventListener('click', async () => {
      const statusEl = card.querySelector('.edit-status');
      const full_name = card.querySelector('.edit-name').value.trim();
      const team_name = card.querySelector('.edit-team').value.trim() || null;
      const position = card.querySelector('.edit-position').value.trim() || null;
      const jerseyRaw = card.querySelector('.edit-jersey-number').value.trim();
      const jersey_number = jerseyRaw ? Number(jerseyRaw) : null;
      const prefered_foot = card.querySelector('.edit-foot').value || null;
      const player_role = card.querySelector('.edit-player-role').value.trim() || null;
      const bio = card.querySelector('.edit-bio').value.trim() || null;
      const is_active = card.querySelector('.edit-active').checked;
      const fileInput = card.querySelector('.edit-photo');

      if (!full_name) {
        statusEl.textContent = 'Full name is required.';
        statusEl.classList.add('error');
        return;
      }

      const { error } = await supabaseClient
        .from('players')
        .update({ full_name, team_name, position, jersey_number, prefered_foot, player_role, bio, is_active })
        .eq('id', item.id);

      if (error) {
        statusEl.textContent = error.message;
        statusEl.classList.add('error');
        return;
      }

      if (fileInput.files[0]) {
        const photoUrl = await uploadPhoto(fileInput.files[0], 'players', item.id);
        if (photoUrl) {
          await supabaseClient.from('players').update({ photo_url: photoUrl }).eq('id', item.id);
        }
      }

      loadPlayers();
    });

    card.querySelector('.cancel-edit-btn').addEventListener('click', () => loadPlayers());
  }

  // ---------- SHARED PHOTO UPLOAD ----------
  async function uploadPhoto(file, folder, recordId) {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${recordId}.${ext}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from('club-assets')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      alert(`Photo upload failed: ${uploadError.message}`);
      return null;
    }

    const { data } = supabaseClient.storage.from('club-assets').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  // ---------- UTIL ----------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  loadPlayers();

  return { cleanup: null };
}
