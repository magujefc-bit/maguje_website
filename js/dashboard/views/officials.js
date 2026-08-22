import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('officials-view', `
  .toolbar input[type="text"] { width: 240px; }
  .officials-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
  .official-card { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 1rem; transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .official-card:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(16,155,69,0.12); }
  .official-top { display: flex; gap: 0.8rem; align-items: flex-start; }
  .photo-thumb { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; background: #f0f4f1; flex-shrink: 0; }
  .official-info { flex: 1; min-width: 0; }
  .official-name { font-weight: 700; font-size: 0.95rem; color: #222; margin: 0 0 2px; }
  .official-role { font-size: 0.8rem; color: #109b45; font-weight: 600; margin: 0 0 6px; }
  .official-bio { font-size: 0.8rem; color: #666; margin: 0.6rem 0 0; }
  .official-actions { display: flex; gap: 0.4rem; margin-top: 0.8rem; }
`);

export async function officialsView() {
  const admin = await requireAdmin(['senior_manager']);
  if (!admin) return { cleanup: null };

  let allOfficials = [];

  viewContainer.render(`
    ${pageHeader('Officials', 'Manage coaches, staff, and other club officials.')}

    <!-- ADD NEW -->
    <div class="card">
      <h2>Add New Official</h2>
      <div class="field-grid">
        <div>
          <label for="new-full-name">Full Name</label>
          <input type="text" id="new-full-name">
        </div>
        <div>
          <label for="new-official-role">Role</label>
          <input type="text" id="new-official-role" placeholder="e.g. Head Coach">
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
      <button id="create-official-btn" class="btn-primary">Add Official</button>
      <span id="create-status" class="save-status"></span>
    </div>

    <!-- LIST -->
    <div class="toolbar">
      <input type="text" id="search-input" placeholder="Search by name or role…">
      <select id="filter-active">
        <option value="">All statuses</option>
        <option value="true">Active only</option>
        <option value="false">Inactive only</option>
      </select>
    </div>

    <p id="load-status" class="save-status"></p>

    <div class="officials-grid" id="officials-grid"></div>
  `);

  // ---------- LOAD + FILTER ----------
  async function loadOfficials() {
    const statusEl = document.getElementById('load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('officials')
      .select('*')
      .order('full_name');

    if (error) {
      statusEl.textContent = error.message;
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = '';
    allOfficials = data;
    renderGrid();
  }

  document.getElementById('search-input').addEventListener('input', renderGrid);
  document.getElementById('filter-active').addEventListener('change', renderGrid);

  function renderGrid() {
    const search = document.getElementById('search-input').value.trim().toLowerCase();
    const activeFilter = document.getElementById('filter-active').value;
    const grid = document.getElementById('officials-grid');

    let filtered = allOfficials.filter(o => {
      const matchesSearch = !search ||
        o.full_name.toLowerCase().includes(search) ||
        (o.official_role || '').toLowerCase().includes(search);
      const matchesActive = activeFilter === '' || String(o.is_active) === activeFilter;
      return matchesSearch && matchesActive;
    });

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-msg">No officials found.</div>`;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(o => grid.appendChild(renderOfficialCard(o)));
  }

  function renderOfficialCard(item) {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.innerHTML = `
      <div class="official-top">
        <img class="photo-thumb" src="${item.photo_url || ''}" onerror="this.style.visibility='hidden'">
        <div class="official-info">
          <p class="official-name">${escapeHtml(item.full_name)}</p>
          <p class="official-role">${escapeHtml(item.official_role || '—')}</p>
          <span class="status-pill ${item.is_active ? 'status-active' : 'status-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      ${item.bio ? `<p class="official-bio">${escapeHtml(item.bio)}</p>` : ''}
      <div class="official-actions">
        <button class="btn-secondary edit-btn">Edit</button>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => enterEditMode(card, item));
    card.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete ${item.full_name}?`)) return;
      const { error } = await supabaseClient.from('officials').delete().eq('id', item.id);
      if (error) { alert(error.message); return; }
      loadOfficials();
    });

    return card;
  }

  // ---------- CREATE ----------
  document.getElementById('create-official-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('create-status');
    const full_name = document.getElementById('new-full-name').value.trim();
    const official_role = document.getElementById('new-official-role').value.trim() || null;
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
      .from('officials')
      .insert({ full_name, official_role, bio, is_active })
      .select()
      .single();

    if (error) {
      statusEl.textContent = error.message;
      statusEl.classList.add('error');
      return;
    }

    if (fileInput.files[0]) {
      const photoUrl = await uploadPhoto(fileInput.files[0], 'officials', inserted.id);
      if (photoUrl) {
        await supabaseClient.from('officials').update({ photo_url: photoUrl }).eq('id', inserted.id);
      }
    }

    document.getElementById('new-full-name').value = '';
    document.getElementById('new-official-role').value = '';
    document.getElementById('new-bio').value = '';
    document.getElementById('new-is-active').checked = true;
    fileInput.value = '';

    statusEl.textContent = 'Added ✓';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
    loadOfficials();
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
          <label>Role</label>
          <input type="text" class="edit-role" value="${escapeAttr(item.official_role || '')}">
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
      <div class="official-actions">
        <button class="btn-primary save-edit-btn">Save</button>
        <button class="btn-secondary cancel-edit-btn">Cancel</button>
      </div>
      <span class="save-status edit-status"></span>
    `;

    card.querySelector('.save-edit-btn').addEventListener('click', async () => {
      const statusEl = card.querySelector('.edit-status');
      const full_name = card.querySelector('.edit-name').value.trim();
      const official_role = card.querySelector('.edit-role').value.trim() || null;
      const bio = card.querySelector('.edit-bio').value.trim() || null;
      const is_active = card.querySelector('.edit-active').checked;
      const fileInput = card.querySelector('.edit-photo');

      if (!full_name) {
        statusEl.textContent = 'Full name is required.';
        statusEl.classList.add('error');
        return;
      }

      const { error } = await supabaseClient
        .from('officials')
        .update({ full_name, official_role, bio, is_active })
        .eq('id', item.id);

      if (error) {
        statusEl.textContent = error.message;
        statusEl.classList.add('error');
        return;
      }

      if (fileInput.files[0]) {
        const photoUrl = await uploadPhoto(fileInput.files[0], 'officials', item.id);
        if (photoUrl) {
          await supabaseClient.from('officials').update({ photo_url: photoUrl }).eq('id', item.id);
        }
      }

      loadOfficials();
    });

    card.querySelector('.cancel-edit-btn').addEventListener('click', () => loadOfficials());
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

  loadOfficials();

  return { cleanup: null };
}
