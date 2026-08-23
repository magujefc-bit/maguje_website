import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('developer-profile-view', `
  .item-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0; border-bottom: 1px solid #f0f4f1; }
  .item-row:last-child { border-bottom: none; }
  .item-row .item-type { width: 130px; font-weight: 600; color: #333; font-size: 0.85rem; }
  .item-row .item-value { flex: 1; font-size: 0.88rem; color: #444; word-break: break-all; }
  .item-actions { display: flex; gap: 0.4rem; }
  .add-form { display: flex; gap: 0.6rem; margin-top: 0.8rem; flex-wrap: wrap; }
  .add-form input { flex: 1; min-width: 140px; }
  .edit-row { display: flex; gap: 0.6rem; flex: 1; flex-wrap: wrap; }
  .edit-row input { flex: 1; min-width: 120px; }
  .dev-image-grid { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 0.6rem; }
  .dev-image-card { position: relative; width: 96px; }
  .dev-image-card img { width: 96px; height: 96px; object-fit: cover; border-radius: 8px; background: #f0f4f1; display: block; }
  .dev-image-card .delete-img-btn { position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%; background: #c43b3b; color: #fff; border: none; font-size: 0.75rem; cursor: pointer; line-height: 1; }
`);

export async function developerProfileView() {
  const admin = await requireAdmin(['super_admin']);
  if (!admin) return { cleanup: null };

  viewContainer.render(`
    ${pageHeader('Developer Page', 'Manage the content shown on the public /developer page.')}

    <!-- PROFILE -->
    <div class="card">
      <h2>Profile</h2>
      <div class="field-grid">
        <div>
          <label for="f-name">Name</label>
          <input type="text" id="f-name">
        </div>
        <div>
          <label for="f-title">Title</label>
          <input type="text" id="f-title" placeholder="e.g. Full-Stack Developer">
        </div>
      </div>
      <div class="field-grid full">
        <div>
          <label for="f-tagline">Tagline</label>
          <input type="text" id="f-tagline">
        </div>
      </div>
      <div class="field-grid full">
        <div>
          <label for="f-bio">Bio</label>
          <textarea id="f-bio"></textarea>
        </div>
      </div>
      <button id="save-profile-btn" class="btn-primary">Save Profile</button>
      <span id="profile-save-status" class="save-status"></span>
    </div>

    <!-- IMAGES -->
    <div class="card">
      <h2>Developer Photos</h2>
      <p class="sub">One is shown at random each day on the public page. Add a few for variety.</p>
      <div id="dev-images-grid" class="dev-image-grid"></div>
      <div class="add-form">
        <input type="file" id="new-dev-image" accept="image/png, image/jpeg, image/webp">
      </div>
      <span id="images-status" class="save-status"></span>
    </div>

    <!-- SKILLS -->
    <div class="card">
      <h2>Stack / Skills</h2>
      <div id="skills-list"></div>
      <div class="add-form">
        <input type="text" id="new-skill" placeholder="e.g. React / Vite">
        <button id="add-skill-btn" class="btn-secondary">Add Skill</button>
      </div>
      <span id="skills-status" class="save-status"></span>
    </div>

    <!-- PROJECTS -->
    <div class="card">
      <h2>Projects</h2>
      <div id="projects-list"></div>
      <div class="add-form">
        <input type="text" id="new-project-path" placeholder="Path (e.g. maguje-fc)">
        <input type="text" id="new-project-desc" placeholder="Description">
        <input type="url" id="new-project-url" placeholder="https:// (optional)">
        <button id="add-project-btn" class="btn-secondary">Add Project</button>
      </div>
      <span id="projects-status" class="save-status"></span>
    </div>

    <!-- SOCIAL LINKS -->
    <div class="card">
      <h2>Social Links</h2>
      <div id="social-list"></div>
      <div class="add-form">
        <input type="text" id="new-social-label" placeholder="Label (e.g. email, LinkedIn)">
        <input type="text" id="new-social-href" placeholder="Link (mailto:, https://, ...)">
        <button id="add-social-btn" class="btn-secondary">Add Link</button>
      </div>
      <span id="social-status" class="save-status"></span>
    </div>
  `);

  // ---------- PROFILE ----------
  async function loadProfile() {
    const { data, error } = await supabaseClient
      .from('developer_profile')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      setStatus('profile-save-status', error.message, true);
      return;
    }

    document.getElementById('f-name').value = data.name || '';
    document.getElementById('f-title').value = data.title || '';
    document.getElementById('f-tagline').value = data.tagline || '';
    document.getElementById('f-bio').value = data.bio || '';
  }

  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const payload = {
      name: document.getElementById('f-name').value.trim() || null,
      title: document.getElementById('f-title').value.trim() || null,
      tagline: document.getElementById('f-tagline').value.trim() || null,
      bio: document.getElementById('f-bio').value.trim() || null,
    };

    const { error } = await supabaseClient
      .from('developer_profile')
      .update(payload)
      .eq('id', 1);

    if (error) {
      setStatus('profile-save-status', error.message, true);
    } else {
      setStatus('profile-save-status', 'Saved ✓', false);
    }
  });

  // ---------- IMAGES ----------
  async function loadImages() {
    const grid = document.getElementById('dev-images-grid');
    const { data, error } = await supabaseClient
      .storage
      .from('club-assets')
      .list('developer-images', { sortBy: { column: 'created_at', order: 'asc' } });

    if (error) {
      setStatus('images-status', error.message, true);
      return;
    }

    const imageFiles = (data || []).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f.name));

    if (!imageFiles.length) {
      grid.innerHTML = `<div class="empty-msg">No photos uploaded yet.</div>`;
      return;
    }

    grid.innerHTML = '';
    imageFiles.forEach((file) => {
      const { data: urlData } = supabaseClient
        .storage
        .from('club-assets')
        .getPublicUrl(`developer-images/${file.name}`);

      const card = document.createElement('div');
      card.className = 'dev-image-card';
      card.innerHTML = `
        <img src="${urlData.publicUrl}" alt="">
        <button class="delete-img-btn" title="Delete">×</button>
      `;

      card.querySelector('.delete-img-btn').addEventListener('click', async () => {
        if (!confirm('Delete this photo?')) return;
        const { error: delError } = await supabaseClient
          .storage
          .from('club-assets')
          .remove([`developer-images/${file.name}`]);
        if (delError) { setStatus('images-status', delError.message, true); return; }
        loadImages();
      });

      grid.appendChild(card);
    });
  }

  document.getElementById('new-dev-image').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('images-status', 'Uploading...', false, true);

    const ext = file.name.split('.').pop();
    const path = `developer-images/${Date.now()}.${ext}`;

    const { error } = await supabaseClient
      .storage
      .from('club-assets')
      .upload(path, file, { upsert: false, cacheControl: '3600' });

    if (error) {
      setStatus('images-status', error.message, true);
      return;
    }

    e.target.value = '';
    setStatus('images-status', 'Uploaded ✓', false);
    loadImages();
  });

  // ---------- SKILLS ----------
  async function loadSkills() {
    const { data, error } = await supabaseClient
      .from('developer_skills')
      .select('*')
      .order('display_order', { ascending: true });

    const list = document.getElementById('skills-list');

    if (error) {
      setStatus('skills-status', error.message, true);
      return;
    }

    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No skills added yet.</div>`;
      return;
    }

    list.innerHTML = '';
    data.forEach((item) => list.appendChild(renderSkillRow(item)));
  }

  function renderSkillRow(item) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span class="item-value">${escapeHtml(item.skill_name)}</span>
      <div class="item-actions">
        <button class="btn-secondary edit-btn">Edit</button>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => {
      row.innerHTML = `
        <div class="edit-row">
          <input type="text" class="edit-f1" value="${escapeAttr(item.skill_name)}">
        </div>
        <div class="item-actions">
          <button class="btn-primary save-edit-btn">Save</button>
          <button class="btn-secondary cancel-edit-btn">Cancel</button>
        </div>
      `;

      row.querySelector('.save-edit-btn').addEventListener('click', async () => {
        const v1 = row.querySelector('.edit-f1').value.trim();
        if (!v1) return;
        const { error } = await supabaseClient
          .from('developer_skills')
          .update({ skill_name: v1 })
          .eq('id', item.id);
        if (error) { setStatus('skills-status', error.message, true); return; }
        loadSkills();
      });

      row.querySelector('.cancel-edit-btn').addEventListener('click', loadSkills);
    });

    row.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete skill "${item.skill_name}"?`)) return;
      const { error } = await supabaseClient.from('developer_skills').delete().eq('id', item.id);
      if (error) { setStatus('skills-status', error.message, true); return; }
      loadSkills();
    });

    return row;
  }

  document.getElementById('add-skill-btn').addEventListener('click', async () => {
    const skillName = document.getElementById('new-skill').value.trim();
    if (!skillName) { setStatus('skills-status', 'Skill name is required.', true); return; }

    const { data: existing } = await supabaseClient
      .from('developer_skills')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing?.length ? existing[0].display_order + 1 : 0;

    const { error } = await supabaseClient
      .from('developer_skills')
      .insert({ skill_name: skillName, display_order: nextOrder });

    if (error) { setStatus('skills-status', error.message, true); return; }

    document.getElementById('new-skill').value = '';
    setStatus('skills-status', 'Added ✓', false);
    loadSkills();
  });

  // ---------- PROJECTS ----------
  async function loadProjects() {
    const { data, error } = await supabaseClient
      .from('developer_projects')
      .select('*')
      .order('display_order', { ascending: true });

    const list = document.getElementById('projects-list');

    if (error) {
      setStatus('projects-status', error.message, true);
      return;
    }

    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No projects added yet.</div>`;
      return;
    }

    list.innerHTML = '';
    data.forEach((item) => list.appendChild(renderProjectRow(item)));
  }

  function renderProjectRow(item) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span class="item-type">${escapeHtml(item.path)}</span>
      <span class="item-value">${escapeHtml(item.description || '')}${item.url ? ` — ${escapeHtml(item.url)}` : ''}</span>
      <div class="item-actions">
        <button class="btn-secondary edit-btn">Edit</button>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => {
      row.innerHTML = `
        <div class="edit-row">
          <input type="text" class="edit-f1" placeholder="Path" value="${escapeAttr(item.path)}">
          <input type="text" class="edit-f2" placeholder="Description" value="${escapeAttr(item.description || '')}">
          <input type="text" class="edit-f3" placeholder="URL" value="${escapeAttr(item.url || '')}">
        </div>
        <div class="item-actions">
          <button class="btn-primary save-edit-btn">Save</button>
          <button class="btn-secondary cancel-edit-btn">Cancel</button>
        </div>
      `;

      row.querySelector('.save-edit-btn').addEventListener('click', async () => {
        const v1 = row.querySelector('.edit-f1').value.trim();
        const v2 = row.querySelector('.edit-f2').value.trim();
        const v3 = row.querySelector('.edit-f3').value.trim();
        if (!v1) return;
        const { error } = await supabaseClient
          .from('developer_projects')
          .update({ path: v1, description: v2 || null, url: v3 || null })
          .eq('id', item.id);
        if (error) { setStatus('projects-status', error.message, true); return; }
        loadProjects();
      });

      row.querySelector('.cancel-edit-btn').addEventListener('click', loadProjects);
    });

    row.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete project "${item.path}"?`)) return;
      const { error } = await supabaseClient.from('developer_projects').delete().eq('id', item.id);
      if (error) { setStatus('projects-status', error.message, true); return; }
      loadProjects();
    });

    return row;
  }

  document.getElementById('add-project-btn').addEventListener('click', async () => {
    const path = document.getElementById('new-project-path').value.trim();
    const description = document.getElementById('new-project-desc').value.trim();
    const url = document.getElementById('new-project-url').value.trim();
    if (!path) { setStatus('projects-status', 'Path is required.', true); return; }

    const { data: existing } = await supabaseClient
      .from('developer_projects')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing?.length ? existing[0].display_order + 1 : 0;

    const { error } = await supabaseClient
      .from('developer_projects')
      .insert({ path, description: description || null, url: url || null, display_order: nextOrder });

    if (error) { setStatus('projects-status', error.message, true); return; }

    document.getElementById('new-project-path').value = '';
    document.getElementById('new-project-desc').value = '';
    document.getElementById('new-project-url').value = '';
    setStatus('projects-status', 'Added ✓', false);
    loadProjects();
  });

  // ---------- SOCIAL LINKS ----------
  async function loadSocialLinks() {
    const { data, error } = await supabaseClient
      .from('developer_social_links')
      .select('*')
      .order('display_order', { ascending: true });

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
    data.forEach((item) => list.appendChild(renderSocialRow(item)));
  }

  function renderSocialRow(item) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span class="item-type">${escapeHtml(item.label)}</span>
      <span class="item-value">${escapeHtml(item.href)}</span>
      <div class="item-actions">
        <button class="btn-secondary edit-btn">Edit</button>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => {
      row.innerHTML = `
        <div class="edit-row">
          <input type="text" class="edit-f1" value="${escapeAttr(item.label)}">
          <input type="text" class="edit-f2" value="${escapeAttr(item.href)}">
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
          .from('developer_social_links')
          .update({ label: v1, href: v2 })
          .eq('id', item.id);
        if (error) { setStatus('social-status', error.message, true); return; }
        loadSocialLinks();
      });

      row.querySelector('.cancel-edit-btn').addEventListener('click', loadSocialLinks);
    });

    row.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete ${item.label} link?`)) return;
      const { error } = await supabaseClient.from('developer_social_links').delete().eq('id', item.id);
      if (error) { setStatus('social-status', error.message, true); return; }
      loadSocialLinks();
    });

    return row;
  }

  document.getElementById('add-social-btn').addEventListener('click', async () => {
    const label = document.getElementById('new-social-label').value.trim();
    const href = document.getElementById('new-social-href').value.trim();
    if (!label || !href) { setStatus('social-status', 'Label and link are required.', true); return; }

    const { data: existing } = await supabaseClient
      .from('developer_social_links')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing?.length ? existing[0].display_order + 1 : 0;

    const { error } = await supabaseClient
      .from('developer_social_links')
      .insert({ label, href, display_order: nextOrder });

    if (error) { setStatus('social-status', error.message, true); return; }

    document.getElementById('new-social-label').value = '';
    document.getElementById('new-social-href').value = '';
    setStatus('social-status', 'Added ✓', false);
    loadSocialLinks();
  });

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
  loadImages();
  loadSkills();
  loadProjects();
  loadSocialLinks();

  return { cleanup: null };
}
