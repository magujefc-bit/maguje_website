import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('content-dashboard-view', `
  .image-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-bottom: 1rem; }
  .image-slots.single { grid-template-columns: minmax(200px, 320px); }
  .image-slot { border: 2px dashed #d3ded6; border-radius: 8px; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; overflow: hidden; background: #f7faf8; font-size: 0.78rem; color: #999; text-align: center; }
  .image-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .image-slot .slot-label { position: absolute; top: 4px; left: 6px; font-size: 0.68rem; background: rgba(0,0,0,0.5); color: #fff; padding: 1px 6px; border-radius: 8px; }
  .image-slot .overlay-preview { position: absolute; inset: 0; }

  .overlay-picker { margin-bottom: 1rem; }
  .overlay-options { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem; }
  .overlay-swatch { width: 40px; height: 24px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; }
  .overlay-swatch.selected { border-color: #109b45; }

  .post-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; display: flex; gap: 1rem; }
  .post-thumb { width: 100px; height: 56px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #f0f4f1; }
  .post-info { flex: 1; }
  .post-title { font-weight: 700; font-size: 0.92rem; color: #222; margin: 0 0 3px; }
  .post-meta { font-size: 0.76rem; color: #888; margin: 0 0 4px; }
  .post-actions { display: flex; gap: 0.4rem; margin-top: 0.4rem; }
`);

const POST_TYPE_CONFIG = {
  news: { table: 'news_posts', label: 'News', imageCount: 1 },
  activity: { table: 'activity_posts', label: 'Club Activities', imageCount: 4 },
  event: { table: 'event_posts', label: 'Events', imageCount: 1 },
  match_report: { table: 'match_report_posts', label: 'Match Reports', imageCount: 4 },
};

const TAB_QUERY_MAP = { matches: 'match_report', activities: 'activity', events: 'event', news: 'news' };

export async function contentDashboardView(params, query) {
  const admin = await requireAdmin(['content_manager']);
  if (!admin) return { cleanup: null };

  const currentType = TAB_QUERY_MAP[query.get('tab')] || 'news';
  const config = POST_TYPE_CONFIG[currentType];
  const IMAGE_COUNT = config.imageCount;

  let selectedImages = new Array(IMAGE_COUNT).fill(null); // each: real media {id,url} OR pending {pending:true, blob, previewUrl, tags}
  let overlayTemplates = [];
  let selectedOverlayId = null;
  let allMatchReportsForDropdown = [];

  viewContainer.render(`
    <h1 id="page-title">Loading...</h1>
    <p class="sub" id="page-sub"></p>

    <div class="card">
      <h2 id="form-heading">Create Post</h2>

      <div class="field-grid full">
        <div>
          <label>Title *</label>
          <input type="text" id="f-title">
        </div>
      </div>

      <div id="extra-fields-container"></div>

      <div class="field-grid full">
        <div>
          <label>Body *</label>
          <textarea id="f-body"></textarea>
        </div>
      </div>

      <label id="images-label">Images</label>
      <div class="image-slots" id="image-slots"></div>

      <div class="overlay-picker" id="overlay-picker-wrap">
        <label>Cover Overlay (optional gradient over the cover image)</label>
        <div class="overlay-options" id="overlay-options"></div>
      </div>

      <button id="publish-btn" class="btn-primary" disabled>Publish Post</button>
      <span id="create-status" class="save-status"></span>
    </div>

    <div class="card">
      <h2>Published Posts</h2>
      <p id="list-status" class="save-status"></p>
      <div id="posts-list"></div>
    </div>
  `);

  // AppShell used to auto-highlight the matching nav-link by URL+tab;
  // the new sidebar component does the same via highlightActiveLink.
  // This was a harmless extra safeguard kept from the original code.
  document.querySelector(`[data-tab-link="${currentType}"]`)?.classList.add('active');

  document.getElementById('page-title').textContent = config.label;
  document.getElementById('page-sub').textContent = `Manage ${config.label.toLowerCase()} posts.`;
  document.getElementById('form-heading').textContent = `Create ${config.label} Post`;
  document.getElementById('images-label').textContent = IMAGE_COUNT === 1 ? 'Cover Image (required)' : 'Images (exactly 4 required) — image 1 is the cover';
  document.getElementById('image-slots').classList.toggle('single', IMAGE_COUNT === 1);

  renderImageSlots();
  renderExtraFields();

  // ---------- Extra fields per type ----------
  function renderExtraFields() {
    const container = document.getElementById('extra-fields-container');

    let extraHtml = '';
    if (currentType === 'event') {
      extraHtml += `
        <div class="field-grid">
          <div><label>Event Date</label><input type="date" id="f-event-date"></div>
          <div><label>Event Time</label><input type="time" id="f-event-time"></div>
        </div>
        <div class="field-grid full">
          <div><label>Location</label><input type="text" id="f-location" placeholder="e.g. County Stadium"></div>
        </div>
      `;
    }

    // Any type EXCEPT match_report can optionally link to a published Match Report page
    if (currentType !== 'match_report') {
      extraHtml += `
        <div class="field-grid full">
          <div><label>Related Match Report (optional — links to that page)</label><select id="f-linked-report"><option value="">— None —</option></select></div>
        </div>
      `;
    }

    container.innerHTML = extraHtml;
  }

  async function loadMatchReportsForDropdown() {
    const { data } = await supabaseClient.from('match_report_posts').select('id, title').order('created_at', { ascending: false });
    allMatchReportsForDropdown = data || [];
    const select = document.getElementById('f-linked-report');
    if (!select) return;
    allMatchReportsForDropdown.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.title;
      select.appendChild(opt);
    });
  }

  // ---------- Image slots ----------
  function renderImageSlots() {
    const container = document.getElementById('image-slots');
    container.innerHTML = '';

    for (let i = 0; i < IMAGE_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'image-slot';
      slot.dataset.index = i;
      updateSlotContent(slot, i);
      slot.addEventListener('click', () => handleSlotClick(i));
      container.appendChild(slot);
    }
  }

  function previewUrlFor(img) {
    return img.pending ? img.previewUrl : img.url;
  }

  function updateSlotContent(slot, index) {
    const img = selectedImages[index];
    const labelText = index === 0 ? 'Cover' : `Image ${index + 1}`;
    if (img) {
      slot.innerHTML = `<span class="slot-label">${labelText}</span><img src="${previewUrlFor(img)}" loading="lazy">${index === 0 ? '<div class="overlay-preview" id="cover-overlay-preview"></div>' : ''}`;
      if (index === 0) applyOverlayPreview();
    } else {
      slot.innerHTML = `<span class="slot-label">${labelText}</span>📷 Click to add`;
    }
  }

  async function handleSlotClick(index) {
    const media = await MediaPipeline.selectImage();
    if (media) {
      selectedImages[index] = media;
      renderImageSlots();
      updatePublishState();
    }
  }

  // ---------- Overlay templates ----------
  async function loadOverlayTemplates() {
    const { data } = await supabaseClient.from('overlay_templates').select('*').eq('is_active', true).order('name');
    overlayTemplates = data || [];

    const optionsEl = document.getElementById('overlay-options');
    optionsEl.innerHTML = `<div class="overlay-swatch selected" data-id="" title="None" style="background:#eee; display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:#999;">None</div>` +
      overlayTemplates.map(t => `<div class="overlay-swatch" data-id="${t.id}" title="${escapeHtml(t.name)}" style="background:${t.css_gradient};"></div>`).join('');

    optionsEl.querySelectorAll('.overlay-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        optionsEl.querySelectorAll('.overlay-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        selectedOverlayId = sw.dataset.id || null;
        applyOverlayPreview();
      });
    });
  }

  function applyOverlayPreview() {
    const preview = document.getElementById('cover-overlay-preview');
    if (!preview) return;
    const template = overlayTemplates.find(t => t.id === selectedOverlayId);
    preview.style.background = template ? template.css_gradient : 'none';
  }

  // ---------- Publish gating ----------
  function updatePublishState() {
    const title = document.getElementById('f-title').value.trim();
    const body = document.getElementById('f-body').value.trim();
    const allImagesSet = selectedImages.every(img => img !== null);
    document.getElementById('publish-btn').disabled = !(title && body && allImagesSet);
  }

  document.getElementById('f-title').addEventListener('input', updatePublishState);
  document.getElementById('f-body').addEventListener('input', updatePublishState);

  // ---------- Slug generation with collision handling ----------
  async function generateUniquePostSlug(title) {
    const base = MediaPipeline.slugify(title) || 'post';
    let candidate = base;
    let attempt = 1;

    while (true) {
      const { data } = await supabaseClient.from(config.table).select('id').eq('slug', candidate).maybeSingle();
      if (!data) return candidate;
      attempt++;
      candidate = `${base}-${attempt}`;
    }
  }

  // ---------- Publish ----------
  document.getElementById('publish-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('create-status');
    const publishBtn = document.getElementById('publish-btn');
    statusEl.classList.remove('error');
    publishBtn.disabled = true;

    const title = document.getElementById('f-title').value.trim();
    const body = document.getElementById('f-body').value.trim();

    try {
      statusEl.textContent = 'Generating slug...';
      const slug = await generateUniquePostSlug(title);

      let payload = { title, slug, body, cover_overlay_id: selectedOverlayId || null };

      if (currentType === 'event') {
        payload.event_date = document.getElementById('f-event-date').value || null;
        payload.event_time = document.getElementById('f-event-time').value || null;
        payload.location = document.getElementById('f-location').value.trim() || null;
      }
      if (currentType !== 'match_report') {
        const linkedSelect = document.getElementById('f-linked-report');
        payload.linked_match_report_id = (linkedSelect && linkedSelect.value) || null;
      }

      statusEl.textContent = 'Saving post...';
      const { data: post, error } = await supabaseClient.from(config.table).insert(payload).select().single();
      if (error) throw error;

      // Only NOW do pending images actually get uploaded to Supabase
      statusEl.textContent = 'Uploading images...';
      const mediaRows = [];
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        let mediaId;
        if (img.pending) {
          const realMedia = await MediaPipeline.finalizeUpload(img, title);
          mediaId = realMedia.id;
        } else {
          mediaId = img.id;
        }
        mediaRows.push({ post_type: currentType, post_id: post.id, media_id: mediaId, display_order: i + 1 });
      }

      const { error: mediaError } = await supabaseClient.from('post_media').insert(mediaRows);
      if (mediaError) throw mediaError;

      statusEl.textContent = 'Published ✓';
      statusEl.classList.remove('error');
      setTimeout(() => { statusEl.textContent = ''; }, 2500);

      document.getElementById('f-title').value = '';
      document.getElementById('f-body').value = '';
      if (currentType === 'event') {
        document.getElementById('f-event-date').value = '';
        document.getElementById('f-event-time').value = '';
        document.getElementById('f-location').value = '';
      }
      const linkedSelect = document.getElementById('f-linked-report');
      if (linkedSelect) linkedSelect.value = '';

      selectedImages = new Array(IMAGE_COUNT).fill(null);
      selectedOverlayId = null;
      renderImageSlots();
      loadOverlayTemplates();
      loadPosts();
    } catch (err) {
      statusEl.classList.add('error');
      statusEl.textContent = err.message;
    } finally {
      updatePublishState();
    }
  });

  // ---------- List posts ----------
  async function loadPosts() {
    const statusEl = document.getElementById('list-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient.from(config.table).select('*').order('created_at', { ascending: false });
    if (error) { statusEl.textContent = error.message; statusEl.classList.add('error'); return; }
    statusEl.textContent = '';

    const list = document.getElementById('posts-list');
    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No ${config.label.toLowerCase()} posts yet.</div>`;
      return;
    }

    list.innerHTML = '';
    for (const post of data) {
      list.appendChild(await renderPostCard(post));
    }
  }

  async function renderPostCard(post) {
    const { data: mediaLinks } = await supabaseClient
      .from('post_media')
      .select('media_id, display_order')
      .eq('post_type', currentType)
      .eq('post_id', post.id)
      .order('display_order')
      .limit(1);

    let thumbUrl = '';
    if (mediaLinks && mediaLinks.length) {
      const { data: media } = await supabaseClient.from('media_library').select('url').eq('id', mediaLinks[0].media_id).single();
      thumbUrl = media ? media.url : '';
    }

    const card = document.createElement('div');
    card.className = 'post-card';

    let metaExtra = '';
    if (currentType === 'event') metaExtra = ` · ${post.event_date || 'No date'} ${post.event_time || ''} · ${escapeHtml(post.location || 'No location')}`;

    card.innerHTML = `
      <img class="post-thumb" src="${thumbUrl}" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="post-info">
        <p class="post-title">${escapeHtml(post.title)}</p>
        <p class="post-meta">/${escapeHtml(post.slug)}${metaExtra} · ${new Date(post.created_at).toLocaleDateString()}</p>
        <div class="post-actions">
          <button class="btn-danger delete-post-btn">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('.delete-post-btn').addEventListener('click', async () => {
      if (!confirm(`Delete "${post.title}"?`)) return;
      await supabaseClient.from('post_media').delete().eq('post_type', currentType).eq('post_id', post.id);
      const { error } = await supabaseClient.from(config.table).delete().eq('id', post.id);
      if (error) { alert(error.message); return; }
      loadPosts();
    });

    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  await loadOverlayTemplates();
  if (currentType !== 'match_report') await loadMatchReportsForDropdown();
  loadPosts();

  return { cleanup: null };
}
