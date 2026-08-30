import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('club-profile-view', `
  .tabs { display: flex; gap: 0.4rem; margin-bottom: 1.2rem; border-bottom: 2px solid #e2ece5; }
  .tab-btn { background: none; border: none; padding: 0.7rem 1.1rem; font-size: 0.9rem; font-weight: 600; color: #777; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
  .tab-btn.active { color: #109b45; border-bottom-color: #109b45; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
  .item-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0; border-bottom: 1px solid #f0f4f1; }
  .item-row:last-child { border-bottom: none; }
  .item-row .item-type { width: 130px; font-weight: 600; color: #333; font-size: 0.85rem; }
  .item-row .item-value { flex: 1; font-size: 0.88rem; color: #444; word-break: break-all; }
  .item-actions { display: flex; gap: 0.4rem; }
  .add-form { display: flex; gap: 0.6rem; margin-top: 0.8rem; flex-wrap: wrap; }
  .add-form input { flex: 1; min-width: 140px; }
  .edit-row { display: flex; gap: 0.6rem; flex: 1; flex-wrap: wrap; }
  .edit-row input { flex: 1; min-width: 120px; }
  .save-bar { display: flex; align-items: center; gap: 0.8rem; margin: 1rem 0 1.5rem; }
`);

export async function clubProfileView() {
  const admin = await requireAdmin(['senior_manager']);
  if (!admin) return { cleanup: null };

  viewContainer.render(`
    ${pageHeader('Club Profile', "Manage the club's public profile, contact details, and social links.")}

    <div class="tabs">
      <button class="tab-btn active" data-tab="general">General</button>
      <button class="tab-btn" data-tab="mission-vision">Mission &amp; Vision</button>
      <button class="tab-btn" data-tab="history">History</button>
    </div>

    <!-- Shared save bar — one save covers every tab's fields, since
         they all live in the same club_profile row. -->
    <div class="save-bar">
      <button id="save-profile-btn" class="btn-primary">Save Profile</button>
      <span id="profile-save-status" class="save-status"></span>
    </div>

    <!-- ===================== GENERAL TAB ===================== -->
    <div class="tab-panel active" id="tab-general">
      <div class="card">
        <h2>General</h2>
        <div class="field-grid">
          <div>
            <label for="f-name">Club Name</label>
            <input type="text" id="f-name">
          </div>
          <div>
            <label for="f-founded">Founded Year</label>
            <input type="number" id="f-founded" min="1800" max="2100">
          </div>
        </div>
        <div class="field-grid">
          <div>
            <label for="f-crest-file">Club Crest</label>
            <div style="display:flex; align-items:center; gap:0.8rem;">
              <img id="crest-preview" src="" alt="No crest uploaded"
                   style="width:64px; height:64px; object-fit:cover; border-radius:8px; background:#f0f4f1; display:none;">
              <input type="file" id="f-crest-file" accept="image/png, image/jpeg, image/webp">
            </div>
            <span id="crest-upload-status" class="save-status"></span>
          </div>
          <div>
            <label for="f-ground">Home Ground</label>
            <input type="text" id="f-ground">
          </div>
        </div>
        <div class="field-grid full">
          <div>
            <label for="f-location">Location</label>
            <input type="text" id="f-location">
          </div>
        </div>
        <div class="field-grid full">
          <div>
            <label for="f-description">Description</label>
            <textarea id="f-description"></textarea>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Contacts</h2>
        <div id="contacts-list"></div>
        <div class="add-form">
          <input type="text" id="new-contact-type" placeholder="Type (e.g. Phone, Email, Address)">
          <input type="text" id="new-contact-value" placeholder="Value">
          <button id="add-contact-btn" class="btn-secondary">Add Contact</button>
        </div>
        <span id="contacts-status" class="save-status"></span>
      </div>

      <div class="card">
        <h2>Social Links</h2>
        <div id="social-list"></div>
        <div class="add-form">
          <input type="text" id="new-social-platform" placeholder="Platform (e.g. Instagram, X, Facebook)">
          <input type="url" id="new-social-url" placeholder="https://...">
          <button id="add-social-btn" class="btn-secondary">Add Link</button>
        </div>
        <span id="social-status" class="save-status"></span>
      </div>
    </div>

    <!-- ===================== MISSION & VISION TAB ===================== -->
    <div class="tab-panel" id="tab-mission-vision">
      <div class="card">
        <h2>Mission &amp; Vision</h2>
        <div class="field-grid full">
          <div>
            <label for="f-vision">Vision</label>
            <textarea id="f-vision" placeholder="Shown on the public site's Mission & Vision page"></textarea>
          </div>
        </div>
        <div class="field-grid full">
          <div>
            <label for="f-mission">Mission</label>
            <textarea id="f-mission" placeholder="Shown on the public site's Mission & Vision page"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== HISTORY TAB ===================== -->
    <div class="tab-panel" id="tab-history">
      <div class="card">
        <h2>Club History</h2>
        <div class="field-grid full">
          <div>
            <label for="f-history">Club History</label>
            <textarea id="f-history" placeholder="Shown on the public site's Club History page"></textarea>
          </div>
        </div>
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

  // ---------- PROFILE ----------
  async function loadProfile() {
    const { data, error } = await supabaseClient
      .from('club_profile')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      setStatus('profile-save-status', error.message, true);
      return;
    }

    document.getElementById('f-name').value = data.name || '';
    document.getElementById('f-founded').value = data.founded_year || '';
    if (data.crest_url) {
      const preview = document.getElementById('crest-preview');
      preview.src = data.crest_url;
      preview.style.display = 'inline-block';
    }
    document.getElementById('f-ground').value = data.home_ground || '';
    document.getElementById('f-location').value = data.location || '';
    document.getElementById('f-description').value = data.description || '';
    document.getElementById('f-vision').value = data.vision || '';
    document.getElementById('f-mission').value = data.mission || '';
    document.getElementById('f-history').value = data.history || '';
  }

  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const payload = {
      name: document.getElementById('f-name').value.trim() || null,
      founded_year: document.getElementById('f-founded').value ? parseInt(document.getElementById('f-founded').value) : null,
      home_ground: document.getElementById('f-ground').value.trim() || null,
      location: document.getElementById('f-location').value.trim() || null,
      description: document.getElementById('f-description').value.trim() || null,
      vision: document.getElementById('f-vision').value.trim() || null,
      mission: document.getElementById('f-mission').value.trim() || null,
      history: document.getElementById('f-history').value.trim() || null,
    };

    const { error } = await supabaseClient
      .from('club_profile')
      .update(payload)
      .eq('id', 1);

    if (error) {
      setStatus('profile-save-status', error.message, true);
    } else {
      setStatus('profile-save-status', 'Saved ✓', false);
    }
  });

  document.getElementById('f-crest-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('crest-upload-status');
    statusEl.classList.remove('error');
    statusEl.textContent = 'Uploading...';

    const ext = file.name.split('.').pop();
    const path = `profile/crest.${ext}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from('club-assets')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      statusEl.textContent = uploadError.message;
      statusEl.classList.add('error');
      return;
    }

    const { data: publicUrlData } = supabaseClient
      .storage
      .from('club-assets')
      .getPublicUrl(path);

    const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabaseClient
      .from('club_profile')
      .update({ crest_url: publicUrlData.publicUrl })
      .eq('id', 1);

    if (dbError) {
      statusEl.textContent = dbError.message;
      statusEl.classList.add('error');
      return;
    }

    const preview = document.getElementById('crest-preview');
    preview.src = bustedUrl;
    preview.style.display = 'inline-block';

    statusEl.textContent = 'Uploaded ✓';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  });

  // ---------- CONTACTS ----------
  async function loadContacts() {
    const { data, error } = await supabaseClient
      .from('club_contacts')
      .select('*')
      .order('type');

    const list = document.getElementById('contacts-list');

    if (error) {
      setStatus('contacts-status', error.message, true);
      return;
    }

    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No contacts added yet.</div>`;
      return;
    }

    list.innerHTML = '';
    data.forEach(item => list.appendChild(renderContactRow(item)));
  }

  function renderContactRow(item) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span class="item-type">${escapeHtml(item.type)}</span>
      <span class="item-value">${escapeHtml(item.value)}</span>
      <div class="item-actions">
        <button class="btn-secondary edit-btn">Edit</button>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => enterEditMode(row, item, 'contact'));
    row.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete contact "${item.type}"?`)) return;
      const { error } = await supabaseClient.from('club_contacts').delete().eq('id', item.id);
      if (error) { setStatus('contacts-status', error.message, true); return; }
      loadContacts();
    });

    return row;
  }

  document.getElementById('add-contact-btn').addEventListener('click', async () => {
    const type = document.getElementById('new-contact-type').value.trim();
    const value = document.getElementById('new-contact-value').value.trim();
    if (!type || !value) { setStatus('contacts-status', 'Type and value are required.', true); return; }

    const { error } = await supabaseClient.from('club_contacts').insert({ type, value });
    if (error) { setStatus('contacts-status', error.message, true); return; }

    document.getElementById('new-contact-type').value = '';
    document.getElementById('new-contact-value').value = '';
    setStatus('contacts-status', 'Added ✓', false);
    loadContacts();
  });

  // ---------- SOCIAL LINKS ----------
  async function loadSocialLinks() {
    const { data, error } = await supabaseClient
      .from('club_social_links')
      .select('*')
      .order('platform');

    const list = document.getElementById('social-list');

    if (error) {
      setStatus('social-status', error.message, true);
      return;
    }

    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No social links added yet.</div>`;
      return;
    }

    list.innerHTML = '';
    data.forEach(item => list.appendChild(renderSocialRow(item)));
  }

  function renderSocialRow(item) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span class="item-type">${escapeHtml(item.platform)}</span>
      <span class="item-value">${escapeHtml(item.url)}</span>
      <div class="item-actions">
        <button class="btn-secondary edit-btn">Edit</button>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => enterEditMode(row, item, 'social'));
    row.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete ${item.platform} link?`)) return;
      const { error } = await supabaseClient.from('club_social_links').delete().eq('id', item.id);
      if (error) { setStatus('social-status', error.message, true); return; }
      loadSocialLinks();
    });

    return row;
  }

  document.getElementById('add-social-btn').addEventListener('click', async () => {
    const platform = document.getElementById('new-social-platform').value.trim();
    const url = document.getElementById('new-social-url').value.trim();
    if (!platform || !url) { setStatus('social-status', 'Platform and URL are required.', true); return; }

    const { error } = await supabaseClient.from('club_social_links').insert({ platform, url });
    if (error) { setStatus('social-status', error.message, true); return; }

    document.getElementById('new-social-platform').value = '';
    document.getElementById('new-social-url').value = '';
    setStatus('social-status', 'Added ✓', false);
    loadSocialLinks();
  });

  // ---------- SHARED: inline edit mode ----------
  function enterEditMode(row, item, kind) {
    const isContact = kind === 'contact';
    const field1 = isContact ? item.type : item.platform;
    const field2 = isContact ? item.value : item.url;
    const table = isContact ? 'club_contacts' : 'club_social_links';
    const col1 = isContact ? 'type' : 'platform';
    const col2 = isContact ? 'value' : 'url';

    row.innerHTML = `
      <div class="edit-row">
        <input type="text" class="edit-f1" value="${escapeAttr(field1)}">
        <input type="text" class="edit-f2" value="${escapeAttr(field2)}">
      </div>
      <div class="item-actions">
        <button class="btn-primary save-edit-btn">Save</button>
        <button class="btn-secondary cancel-edit-btn">Cancel</button>
      </div>
    `;

    row.querySelector('.save-edit-btn').addEventListener('click', async () => {
      const v1 = row.querySelector('.edit-f1').value.trim();
      const v2 = row.querySelector('.edit-f2').value.trim();
      if (!v1 || !v2) return;

      const { error } = await supabaseClient
        .from(table)
        .update({ [col1]: v1, [col2]: v2 })
        .eq('id', item.id);

      if (error) {
        setStatus(isContact ? 'contacts-status' : 'social-status', error.message, true);
        return;
      }

      isContact ? loadContacts() : loadSocialLinks();
    });

    row.querySelector('.cancel-edit-btn').addEventListener('click', () => {
      isContact ? loadContacts() : loadSocialLinks();
    });
  }

  // ---------- UTIL ----------
  function setStatus(elId, msg, isError) {
    const el = document.getElementById(elId);
    el.textContent = msg;
    el.classList.toggle('error', isError);
    if (!isError) setTimeout(() => { el.textContent = ''; }, 2500);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  loadProfile();
  loadContacts();
  loadSocialLinks();

  return { cleanup: null };
        }
