import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('content-dashboard-view', `
  .image-slots {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  .image-slots.single {
    grid-template-columns: minmax(200px, 320px);
  }

  .image-slot {
    border: 2px dashed #d3ded6;
    border-radius: 8px;
    aspect-ratio: 16/9;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    background: #f7faf8;
    font-size: 0.78rem;
    color: #999;
    text-align: center;
  }

  .image-slot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .image-slot .slot-label {
    position: absolute;
    top: 4px;
    left: 6px;
    font-size: 0.68rem;
    background: rgba(0,0,0,0.5);
    color: #fff;
    padding: 1px 6px;
    border-radius: 8px;
    z-index: 2;
  }

  .image-slot .overlay-preview {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .overlay-picker {
    margin-bottom: 1rem;
  }

  .overlay-options {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }

  .overlay-swatch {
    width: 40px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid transparent;
  }

  .overlay-swatch.selected {
    border-color: #109b45;
  }

  .post-card {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.8rem;
    display: flex;
    gap: 1rem;
  }

  .post-thumb {
    width: 100px;
    height: 56px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
    background: #f0f4f1;
  }

  .post-info {
    flex: 1;
  }

  .post-title {
    font-weight: 700;
    font-size: 0.92rem;
    color: #222;
    margin: 0 0 3px;
  }

  .post-meta {
    font-size: 0.76rem;
    color: #888;
    margin: 0 0 4px;
  }

  .post-actions {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.4rem;
    flex-wrap: wrap;
  }

  .editing-indicator {
    display: inline-block;
    margin-left: 0.5rem;
    padding: 3px 8px;
    border-radius: 12px;
    background: #e8f5ed;
    color: #168a45;
    font-size: 0.72rem;
    font-weight: 600;
  }

  /* -------------------- Media library -------------------- */

  .media-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }

  .media-card {
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    display: flex;
    flex-direction: column;
  }

  .media-card img {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    background: #f0f4f1;
    display: block;
  }

  .media-card-body {
    padding: 0.6rem 0.7rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .media-card-slug {
    font-size: 0.7rem;
    color: #999;
    word-break: break-all;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    min-height: 1.4rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #eef0fa;
    color: #33409e;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 0.7rem;
  }

  .chip button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 0.8rem;
    line-height: 1;
    padding: 0;
  }

  .chip-add-row {
    display: flex;
    gap: 0.3rem;
    margin-top: 0.2rem;
    flex-wrap: wrap;
  }

  .chip-add-row select,
  .chip-add-row input {
    font-size: 0.75rem;
    padding: 3px 6px;
    flex: 1;
    min-width: 90px;
  }

  .chip-add-row button {
    font-size: 0.75rem;
    padding: 3px 8px;
  }

  .media-card-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.4rem;
  }

  .media-usage-note {
    font-size: 0.68rem;
    color: #999;
  }
`);

const POST_TYPE_CONFIG = {
  news: {
    table: 'news_posts',
    label: 'News',
    imageCount: 1
  },

  event: {
    table: 'event_posts',
    label: 'Events',
    imageCount: 1
  },

  match_report: {
    table: 'match_report_posts',
    label: 'Match Reports',
    imageCount: 4
  }
};

const TAB_QUERY_MAP = {
  matches: 'match_report',
  events: 'event',
  news: 'news',
  media: 'media'
};

export async function contentDashboardView(params, query) {
  const admin = await requireAdmin(['content_manager']);
  if (!admin) return { cleanup: null };

  const currentType = TAB_QUERY_MAP[query.get('tab')] || 'news';

  if (currentType === 'media') {
    return renderMediaLibraryView();
  }

  const config = POST_TYPE_CONFIG[currentType];
  const IMAGE_COUNT = config.imageCount;

  let selectedImages = new Array(IMAGE_COUNT).fill(null);
  let overlayTemplates = [];
  let selectedOverlayId = null;
  let allMatchReportsForDropdown = [];
  let allMatchesForDropdown = [];
  let allTeamsForDropdown = [];

  // Editing state
  let editingPostId = null;

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

      <button id="publish-btn" class="btn-primary" disabled>
        Publish Post
      </button>

      <button id="cancel-edit-btn" class="btn-secondary" style="display:none;">
  Cancel Edit
</button>

      <span id="create-status" class="save-status"></span>
    </div>

    <div class="card">
      <h2>Published Posts</h2>
      <p id="list-status" class="save-status"></p>
      <div id="posts-list"></div>
    </div>
  `);

  document
    .querySelector(`[data-tab-link="${currentType}"]`)
    ?.classList.add('active');

  document.getElementById('page-title').textContent = config.label;

  document.getElementById('page-sub').textContent =
    `Manage ${config.label.toLowerCase()} posts.`;

  document.getElementById('form-heading').textContent =
    `Create ${config.label} Post`;

  document.getElementById('images-label').textContent =
    IMAGE_COUNT === 1
      ? 'Cover Image (required)'
      : 'Images (exactly 4 required) — image 1 is the cover';

  document
    .getElementById('image-slots')
    .classList.toggle('single', IMAGE_COUNT === 1);

  renderImageSlots();
  renderExtraFields();

  // --------------------------------------------------
  // Extra fields
  // --------------------------------------------------

  function renderExtraFields() {
    const container = document.getElementById('extra-fields-container');

    let extraHtml = '';

    if (currentType === 'event') {
      extraHtml += `
        <div class="field-grid">
          <div>
            <label>Event Date</label>
            <input type="date" id="f-event-date">
          </div>

          <div>
            <label>Event Time</label>
            <input type="time" id="f-event-time">
          </div>
        </div>

        <div class="field-grid full">
          <div>
            <label>Location</label>
            <input
              type="text"
              id="f-location"
              placeholder="e.g. County Stadium"
            >
          </div>
        </div>
      `;
    }

    if (currentType !== 'match_report' && currentType !== 'news') {
      extraHtml += `
        <div class="field-grid full">
          <div>
            <label>
              Related Match Report
              (optional — links to that page)
            </label>

            <select id="f-linked-report">
              <option value="">— None —</option>
            </select>
          </div>
        </div>
      `;
    }

    if (currentType === 'match_report') {
      extraHtml += `
        <div class="field-grid full">
          <div>
            <label>
              Link to Match
              (optional — shown as "View Match" on the report page)
            </label>

            <select id="f-linked-match">
              <option value="">— None —</option>
            </select>
          </div>
        </div>
      `;
    }

    container.innerHTML = extraHtml;
  }

  function matchLabel(m) {
    const opponent = allTeamsForDropdown.find(t => t.id === m.opponent_team_id);
    const opponentName = opponent ? opponent.name : 'TBD';
    const date = m.match_date || '';
    return m.is_home
      ? `${date} — vs ${opponentName} (H)`
      : `${date} — vs ${opponentName} (A)`;
  }

  async function loadMatchesForDropdown() {
    const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }] =
      await Promise.all([
        supabaseClient
          .from('matches')
          .select('id, match_date, is_home, opponent_team_id')
          .order('match_date', { ascending: false }),
        supabaseClient.from('teams').select('id, name'),
      ]);

    if (matchesError || teamsError) {
      console.error('Could not load matches:', matchesError || teamsError);
      return;
    }

    allTeamsForDropdown = teams || [];
    allMatchesForDropdown = matches || [];

    const select = document.getElementById('f-linked-match');
    if (!select) return;

    allMatchesForDropdown.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = matchLabel(m);
      select.appendChild(option);
    });
  }

  async function loadMatchReportsForDropdown() {
    const { data, error } = await supabaseClient
      .from('match_report_posts')
      .select('id, title')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Could not load match reports:', error);
      return;
    }

    allMatchReportsForDropdown = data || [];

    const select = document.getElementById('f-linked-report');

    if (!select) return;

    allMatchReportsForDropdown.forEach(report => {
      const option = document.createElement('option');

      option.value = report.id;
      option.textContent = report.title;

      select.appendChild(option);
    });
  }

  // --------------------------------------------------
  // Image slots
  // --------------------------------------------------

  function renderImageSlots() {
    const container = document.getElementById('image-slots');

    container.innerHTML = '';

    for (let i = 0; i < IMAGE_COUNT; i++) {
      const slot = document.createElement('div');

      slot.className = 'image-slot';
      slot.dataset.index = i;

      updateSlotContent(slot, i);

      slot.addEventListener('click', () => {
        handleSlotClick(i);
      });

      container.appendChild(slot);
    }
  }

  function previewUrlFor(img) {
    return img.pending
      ? img.previewUrl
      : img.url;
  }

  function updateSlotContent(slot, index) {
    const img = selectedImages[index];

    const labelText =
      index === 0
        ? 'Cover'
        : `Image ${index + 1}`;

    if (img) {
      slot.innerHTML = `
        <span class="slot-label">
          ${labelText}
        </span>

        <img
          src="${previewUrlFor(img)}"
          loading="lazy"
        >

        ${
          index === 0
            ? '<div class="overlay-preview" id="cover-overlay-preview"></div>'
            : ''
        }
      `;

      if (index === 0) {
        applyOverlayPreview();
      }
    } else {
      slot.innerHTML = `
        <span class="slot-label">
          ${labelText}
        </span>

        📷 Click to add
      `;
    }
  }

  async function handleSlotClick(index) {
    const media = await MediaPipeline.selectImage();

    if (!media) return;

    selectedImages[index] = media;

    renderImageSlots();
    updatePublishState();
  }

  // --------------------------------------------------
  // Overlay templates
  // --------------------------------------------------

  async function loadOverlayTemplates() {
    const { data, error } = await supabaseClient
      .from('overlay_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Could not load overlay templates:', error);
      return;
    }

    overlayTemplates = data || [];

    const optionsEl =
      document.getElementById('overlay-options');

    optionsEl.innerHTML = `
      <div
        class="overlay-swatch selected"
        data-id=""
        title="None"
        style="
          background:#eee;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:0.6rem;
          color:#999;
        "
      >
        None
      </div>

      ${overlayTemplates
        .map(template => `
          <div
            class="overlay-swatch"
            data-id="${template.id}"
            title="${escapeHtml(template.name)}"
            style="background:${template.css_gradient};"
          ></div>
        `)
        .join('')}
    `;

    optionsEl
      .querySelectorAll('.overlay-swatch')
      .forEach(swatch => {
        swatch.addEventListener('click', () => {
          optionsEl
            .querySelectorAll('.overlay-swatch')
            .forEach(s => {
              s.classList.remove('selected');
            });

          swatch.classList.add('selected');

          selectedOverlayId =
            swatch.dataset.id || null;

          applyOverlayPreview();
        });
      });
  }

  function selectOverlay(overlayId) {
    selectedOverlayId = overlayId || null;

    const optionsEl =
      document.getElementById('overlay-options');

    optionsEl
      .querySelectorAll('.overlay-swatch')
      .forEach(swatch => {
        swatch.classList.toggle(
          'selected',
          (swatch.dataset.id || null) === selectedOverlayId
        );
      });

    applyOverlayPreview();
  }

  function applyOverlayPreview() {
    const preview =
      document.getElementById('cover-overlay-preview');

    if (!preview) return;

    const template =
      overlayTemplates.find(
        t => t.id === selectedOverlayId
      );

    preview.style.background =
      template
        ? template.css_gradient
        : 'none';
  }

  // --------------------------------------------------
  // Publish / edit gating
  // --------------------------------------------------

  function updatePublishState() {
    const title =
      document.getElementById('f-title').value.trim();

    const body =
      document.getElementById('f-body').value.trim();

    const allImagesSet =
      selectedImages.every(img => img !== null);

    document.getElementById('publish-btn').disabled =
      !(title && body && allImagesSet);
  }

  document
    .getElementById('f-title')
    .addEventListener('input', updatePublishState);

  document
    .getElementById('f-body')
    .addEventListener('input', updatePublishState);

  // --------------------------------------------------
  // Slug generation
  // --------------------------------------------------

  async function generateUniquePostSlug(title, excludeId = null) {
    const base =
      MediaPipeline.slugify(title) || 'post';

    let candidate = base;
    let attempt = 1;

    while (true) {
      const { data, error } =
        await supabaseClient
          .from(config.table)
          .select('id')
          .eq('slug', candidate)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data || data.id === excludeId) {
        return candidate;
      }

      attempt++;

      candidate =
        `${base}-${attempt}`;
    }
  }

  // --------------------------------------------------
  // Reset form
  // --------------------------------------------------

  function resetForm() {
    editingPostId = null;

    document.getElementById('f-title').value = '';
    document.getElementById('f-body').value = '';

    if (currentType === 'event') {
      document.getElementById('f-event-date').value = '';
      document.getElementById('f-event-time').value = '';
      document.getElementById('f-location').value = '';
    }

    const linkedSelect =
      document.getElementById('f-linked-report');

    if (linkedSelect) {
      linkedSelect.value = '';
    }

    const linkedMatchSelect =
      document.getElementById('f-linked-match');

    if (linkedMatchSelect) {
      linkedMatchSelect.value = '';
    }

    selectedImages =
      new Array(IMAGE_COUNT).fill(null);

    selectedOverlayId = null;

    document.getElementById('form-heading').textContent =
      `Create ${config.label} Post`;

    document.getElementById('publish-btn').textContent =
      'Publish Post';

    document.getElementById('cancel-edit-btn').style.display =
      'none';

    document.getElementById('create-status').textContent = '';

    selectOverlay(null);

    renderImageSlots();
    updatePublishState();
  }

  // --------------------------------------------------
  // Load post for editing
  // --------------------------------------------------

  async function editPost(post) {
    const statusEl =
      document.getElementById('create-status');

    try {
      statusEl.classList.remove('error');
      statusEl.textContent = 'Loading post...';

      editingPostId = post.id;

      // Basic fields
      document.getElementById('f-title').value =
        post.title || '';

      document.getElementById('f-body').value =
        post.body || '';

      // Event fields
      if (currentType === 'event') {
        document.getElementById('f-event-date').value =
          post.event_date || '';

        document.getElementById('f-event-time').value =
          post.event_time || '';

        document.getElementById('f-location').value =
          post.location || '';
      }

      // Related match report
      if (currentType !== 'match_report' && currentType !== 'news') {
        const linkedSelect =
          document.getElementById('f-linked-report');

        if (linkedSelect) {
          linkedSelect.value =
            post.linked_match_report_id || '';
        }
      }

      // Linked match (match_report tab only)
      if (currentType === 'match_report') {
        const linkedMatchSelect =
          document.getElementById('f-linked-match');

        if (linkedMatchSelect) {
          linkedMatchSelect.value =
            post.match_id || '';
        }
      }

      // Overlay
      selectOverlay(
        post.cover_overlay_id || null
      );

      // Load media
      const { data: mediaLinks, error: mediaError } =
        await supabaseClient
          .from('post_media')
          .select('media_id, display_order')
          .eq('post_type', currentType)
          .eq('post_id', post.id)
          .order('display_order');

      if (mediaError) {
        throw mediaError;
      }

      selectedImages =
        new Array(IMAGE_COUNT).fill(null);

      for (const link of mediaLinks || []) {
        const index =
          Number(link.display_order) - 1;

        if (index < 0 || index >= IMAGE_COUNT) {
          continue;
        }

        const { data: media, error } =
          await supabaseClient
            .from('media_library')
            .select('id, url')
            .eq('id', link.media_id)
            .single();

        if (error) {
          console.warn(
            'Could not load media:',
            link.media_id,
            error
          );
          continue;
        }

        if (media) {
          selectedImages[index] = {
            id: media.id,
            url: media.url,
            pending: false
          };
        }
      }

      renderImageSlots();
      updatePublishState();

      document.getElementById('form-heading').innerHTML =
        `Edit ${config.label} Post
         <span class="editing-indicator">Editing</span>`;

      document.getElementById('publish-btn').textContent =
        'Update Post';

      document.getElementById('cancel-edit-btn').style.display =
        'inline-block';

      statusEl.textContent =
        `Editing "${post.title}"`;

      // Bring the form into view
      document
        .getElementById('form-heading')
        .scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    } catch (err) {
      console.error(err);

      statusEl.classList.add('error');
      statusEl.textContent =
        `Could not load post: ${err.message}`;

      editingPostId = null;
    }
  }

  // --------------------------------------------------
  // Publish / Update
  // --------------------------------------------------

  document
    .getElementById('publish-btn')
    .addEventListener('click', async () => {

      const statusEl =
        document.getElementById('create-status');

      const publishBtn =
        document.getElementById('publish-btn');

      statusEl.classList.remove('error');

      publishBtn.disabled = true;

      const title =
        document.getElementById('f-title').value.trim();

      const body =
        document.getElementById('f-body').value.trim();

      const isEditing =
        Boolean(editingPostId);

      try {
        // --------------------------------------------
        // Generate slug
        // --------------------------------------------

        statusEl.textContent =
          'Generating slug...';

        const slug =
          await generateUniquePostSlug(
            title,
            editingPostId
          );

        // --------------------------------------------
        // Build payload
        // --------------------------------------------

        let payload = {
          title,
          slug,
          body,
          cover_overlay_id:
            selectedOverlayId || null
        };

        if (currentType === 'event') {
          payload.event_date =
            document.getElementById('f-event-date').value ||
            null;

          payload.event_time =
            document.getElementById('f-event-time').value ||
            null;

          payload.location =
            document.getElementById('f-location').value.trim() ||
            null;
        }

        if (currentType !== 'match_report' && currentType !== 'news') {
          const linkedSelect =
            document.getElementById('f-linked-report');

          payload.linked_match_report_id =
            (linkedSelect && linkedSelect.value) || null;
        }

        if (currentType === 'match_report') {
          const linkedMatchSelect =
            document.getElementById('f-linked-match');

          payload.match_id =
            (linkedMatchSelect && linkedMatchSelect.value) || null;
        }

        // --------------------------------------------
        // Create OR update post
        // --------------------------------------------

        let postId;

        if (isEditing) {
          statusEl.textContent =
            'Updating post...';

          const { error } =
            await supabaseClient
              .from(config.table)
              .update(payload)
              .eq('id', editingPostId);

          if (error) {
            throw error;
          }

          postId = editingPostId;

        } else {
          statusEl.textContent =
            'Saving post...';

          const { data: post, error } =
            await supabaseClient
              .from(config.table)
              .insert(payload)
              .select()
              .single();

          if (error) {
            throw error;
          }

          postId = post.id;
        }

        // --------------------------------------------
        // Process images
        // --------------------------------------------

        statusEl.textContent =
          'Processing images...';

        const mediaRows = [];

        for (
          let i = 0;
          i < selectedImages.length;
          i++
        ) {
          const img =
            selectedImages[i];

          let mediaId;

          if (img.pending) {
            const realMedia =
              await MediaPipeline.finalizeUpload(
                img,
                title
              );

            mediaId = realMedia.id;
          } else {
            mediaId = img.id;
          }

          mediaRows.push({
            post_type: currentType,
            post_id: postId,
            media_id: mediaId,
            display_order: i + 1
          });
        }

        // --------------------------------------------
        // Replace media links
        // --------------------------------------------

        if (isEditing) {
          statusEl.textContent =
            'Updating images...';

          const { error: deleteMediaError } =
            await supabaseClient
              .from('post_media')
              .delete()
              .eq('post_type', currentType)
              .eq('post_id', postId);

          if (deleteMediaError) {
            throw deleteMediaError;
          }
        }

        const { error: mediaError } =
          await supabaseClient
            .from('post_media')
            .insert(mediaRows);

        if (mediaError) {
          throw mediaError;
        }

        // --------------------------------------------
        // Finished
        // --------------------------------------------

        statusEl.classList.remove('error');

        statusEl.textContent =
          isEditing
            ? 'Post updated ✓'
            : 'Published ✓';

        setTimeout(() => {
          statusEl.textContent = '';
        }, 2500);

        resetForm();

        await loadPosts();

      } catch (err) {
        console.error(err);

        statusEl.classList.add('error');

        statusEl.textContent =
          err.message || 'Something went wrong.';

      } finally {
        updatePublishState();
      }
    });

  // --------------------------------------------------
  // Cancel editing
  // --------------------------------------------------

  document
    .getElementById('cancel-edit-btn')
    .addEventListener('click', () => {
      resetForm();
    });

  // --------------------------------------------------
  // List posts
  // --------------------------------------------------

  async function loadPosts() {
    const statusEl =
      document.getElementById('list-status');

    statusEl.textContent =
      'Loading...';

    statusEl.classList.remove('error');

    const { data, error } =
      await supabaseClient
        .from(config.table)
        .select('*')
        .order('created_at', {
          ascending: false
        });

    if (error) {
      statusEl.textContent =
        error.message;

      statusEl.classList.add('error');

      return;
    }

    statusEl.textContent = '';

    const list =
      document.getElementById('posts-list');

    if (!data.length) {
      list.innerHTML = `
        <div class="empty-msg">
          No ${config.label.toLowerCase()} posts yet.
        </div>
      `;

      return;
    }

    list.innerHTML = '';

    for (const post of data) {
      list.appendChild(
        await renderPostCard(post)
      );
    }
  }

  // --------------------------------------------------
  // Render published post card
  // --------------------------------------------------

  async function renderPostCard(post) {
    const { data: mediaLinks } =
      await supabaseClient
        .from('post_media')
        .select('media_id, display_order')
        .eq('post_type', currentType)
        .eq('post_id', post.id)
        .order('display_order')
        .limit(1);

    let thumbUrl = '';

    if (
      mediaLinks &&
      mediaLinks.length
    ) {
      const { data: media } =
        await supabaseClient
          .from('media_library')
          .select('url')
          .eq(
            'id',
            mediaLinks[0].media_id
          )
          .single();

      thumbUrl =
        media
          ? media.url
          : '';
    }

    const card =
      document.createElement('div');

    card.className =
      'post-card';

    let metaExtra = '';

    if (currentType === 'event') {
      metaExtra =
        ` · ${post.event_date || 'No date'} ` +
        `${post.event_time || ''} · ` +
        `${escapeHtml(post.location || 'No location')}`;
    }

    card.innerHTML = `
      <img
        class="post-thumb"
        src="${escapeHtml(thumbUrl)}"
        loading="lazy"
        onerror="this.style.visibility='hidden'"
      >

      <div class="post-info">

        <p class="post-title">
          ${escapeHtml(post.title)}
        </p>

        <p class="post-meta">
          /${escapeHtml(post.slug)}
          ${metaExtra}
          · ${new Date(post.created_at).toLocaleDateString()}
        </p>

        <div class="post-actions">

<button
  class="btn-secondary edit-post-btn"
>
  Edit
</button>

          <button
            class="btn-danger delete-post-btn"
          >
            Delete
          </button>

        </div>

      </div>
    `;

    // ----------------------------------------------
    // Edit button
    // ----------------------------------------------

    card
      .querySelector('.edit-post-btn')
      .addEventListener('click', () => {
        editPost(post);
      });

    // ----------------------------------------------
    // Delete button
    // ----------------------------------------------

    card
      .querySelector('.delete-post-btn')
      .addEventListener('click', async () => {

        if (
          !confirm(
            `Delete "${post.title}"?`
          )
        ) {
          return;
        }

        const { error: mediaDeleteError } =
          await supabaseClient
            .from('post_media')
            .delete()
            .eq('post_type', currentType)
            .eq('post_id', post.id);

        if (mediaDeleteError) {
          alert(mediaDeleteError.message);
          return;
        }

        const { error } =
          await supabaseClient
            .from(config.table)
            .delete()
            .eq('id', post.id);

        if (error) {
          alert(error.message);
          return;
        }

        // If the deleted post was being edited,
        // return to create mode.
        if (editingPostId === post.id) {
          resetForm();
        }

        loadPosts();
      });

    return card;
  }

  // --------------------------------------------------
  // Escape HTML
  // --------------------------------------------------

  function escapeHtml(str) {
    const div =
      document.createElement('div');

    div.textContent =
      str ?? '';

    return div.innerHTML;
  }

  // --------------------------------------------------
  // Initial loading
  // --------------------------------------------------

  await loadOverlayTemplates();

  if (currentType !== 'match_report' && currentType !== 'news') {
    await loadMatchReportsForDropdown();
  }

  if (currentType === 'match_report') {
    await loadMatchesForDropdown();
  }

  await loadPosts();

  return {
    cleanup: null
  };
}

// ======================================================
// Media Library (standalone, reusable media)
// ======================================================
//
// Uploading here reuses MediaPipeline.selectImage() / finalizeUpload(),
// the exact same pipeline used by the post-image slots above — so the
// same crop/watermark step runs, and any players/officials tagged during
// that flow already land in media_participants automatically.
//
// This view adds the piece that didn't exist yet: browsing everything in
// media_library on its own (not tied to a post), retroactively adding or
// removing person tags on media that's already uploaded, and deleting
// media that's not currently attached to any post (both the DB row and
// the file in the "club-assets" storage bucket).

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function renderMediaLibraryView() {
  let allMedia = [];
  let allPlayers = [];
  let allOfficials = [];

  viewContainer.render(`
    <h1>Media Library</h1>
    <p class="sub">
      Upload and manage reusable media. Anything here can be attached to
      news, event, or match report posts later.
    </p>

    <div class="card">
      <div class="media-toolbar">
        <h2>All Media</h2>
        <button id="upload-media-btn" class="btn-primary">
          + Upload Media
        </button>
      </div>

      <p id="media-status" class="save-status"></p>
      <div id="media-grid" class="media-grid"></div>
    </div>
  `);

  document
    .querySelector('[data-tab-link="media"]')
    ?.classList.add('active');

  document
    .getElementById('upload-media-btn')
    .addEventListener('click', handleUploadMedia);

  await loadPeopleOptions();
  await loadMedia();

  // --------------------------------------------------
  // Load reference data (players + officials, including
  // inactive ones — old media may tag a retired player)
  // --------------------------------------------------

  async function loadPeopleOptions() {
    const [{ data: players, error: playersError }, { data: officials, error: officialsError }] =
      await Promise.all([
        supabaseClient.from('players').select('id, full_name, team_name').order('full_name'),
        supabaseClient.from('officials').select('id, full_name').order('full_name'),
      ]);

    if (playersError) {
      console.warn('Could not load players:', playersError);
    }

    if (officialsError) {
      console.warn('Could not load officials:', officialsError);
    }

    allPlayers = players || [];
    allOfficials = officials || [];
  }

  // --------------------------------------------------
  // Load all media + their person tags + post usage count
  // --------------------------------------------------

  async function loadMedia() {
    const statusEl = document.getElementById('media-status');
    statusEl.textContent = 'Loading...';
    statusEl.classList.remove('error');

    const { data: mediaRows, error: mediaError } = await supabaseClient
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (mediaError) {
      statusEl.textContent = mediaError.message;
      statusEl.classList.add('error');
      return;
    }

    const mediaIds = (mediaRows || []).map(m => m.id);

    const [
      { data: participants, error: participantsError },
      { data: usageLinks, error: usageError },
    ] = await Promise.all([
      mediaIds.length
        ? supabaseClient.from('media_participants').select('*').in('media_id', mediaIds)
        : { data: [], error: null },
      mediaIds.length
        ? supabaseClient.from('post_media').select('media_id').in('media_id', mediaIds)
        : { data: [], error: null },
    ]);

    if (participantsError || usageError) {
      console.error(participantsError || usageError);
    }

    const usageCountByMedia = {};
    (usageLinks || []).forEach(link => {
      usageCountByMedia[link.media_id] = (usageCountByMedia[link.media_id] || 0) + 1;
    });

    allMedia = (mediaRows || []).map(media => ({
      ...media,
      participants: (participants || []).filter(p => p.media_id === media.id),
      usageCount: usageCountByMedia[media.id] || 0,
    }));

    statusEl.textContent = '';
    renderMediaGrid();
  }

  // --------------------------------------------------
  // Render grid
  // --------------------------------------------------

  function renderMediaGrid() {
    const grid = document.getElementById('media-grid');
    grid.innerHTML = '';

    if (!allMedia.length) {
      grid.innerHTML = `<div class="empty-msg">No media yet. Upload some above.</div>`;
      return;
    }

    allMedia.forEach(media => {
      grid.appendChild(renderMediaCard(media));
    });
  }

  function participantLabel(p) {
    if (p.participant_type === 'custom') {
      return p.custom_name || '(unnamed)';
    }

    const source = p.participant_type === 'player' ? allPlayers : allOfficials;
    const found = source.find(person => person.id === p.participant_id);
    return found ? found.full_name : '(unknown)';
  }

  function renderMediaCard(media) {
    const card = document.createElement('div');
    card.className = 'media-card';

    card.innerHTML = `
      <img src="${escapeHtml(media.url)}" loading="lazy">
      <div class="media-card-body">

        <div class="media-card-slug">${escapeHtml(media.slug)}</div>

        <div class="chip-row people-row"></div>

        <div class="chip-add-row">
          <select class="person-type-select">
            <option value="player">Player</option>
            <option value="official">Official</option>
            <option value="custom">Custom name</option>
          </select>
          <select class="person-id-select"></select>
          <input type="text" class="custom-name-input" placeholder="Name" style="display:none;">
          <button class="btn-secondary add-person-btn">Tag</button>
        </div>

        <div class="media-usage-note">
          ${media.usageCount > 0
            ? `Used on ${media.usageCount} post${media.usageCount === 1 ? '' : 's'}`
            : 'Not used on any post yet'}
        </div>

        <div class="media-card-actions">
          <button class="btn-danger delete-media-btn">Delete</button>
        </div>
      </div>
    `;

    renderPersonChips(card, media);
    populatePersonIdSelect(card, 'player');

    card.querySelector('.person-type-select').addEventListener('change', (e) => {
      const type = e.target.value;
      const idSelect = card.querySelector('.person-id-select');
      const customInput = card.querySelector('.custom-name-input');

      if (type === 'custom') {
        idSelect.style.display = 'none';
        customInput.style.display = '';
      } else {
        idSelect.style.display = '';
        customInput.style.display = 'none';
        populatePersonIdSelect(card, type);
      }
    });

    card.querySelector('.add-person-btn').addEventListener('click', async () => {
      const type = card.querySelector('.person-type-select').value;

      if (type === 'custom') {
        const name = card.querySelector('.custom-name-input').value.trim();
        if (!name) return;
        await addPersonTagToMedia(media.id, { type, customName: name });
        card.querySelector('.custom-name-input').value = '';
      } else {
        const id = card.querySelector('.person-id-select').value;
        if (!id) return;
        await addPersonTagToMedia(media.id, { type, personId: id });
      }

      await loadMedia();
    });

    card.querySelector('.delete-media-btn').addEventListener('click', async () => {
      await handleDeleteMedia(media);
    });

    return card;
  }

  function populatePersonIdSelect(card, type) {
    const select = card.querySelector('.person-id-select');
    const source = type === 'player' ? allPlayers : allOfficials;

    select.innerHTML = source
      .map(p => `
        <option value="${p.id}">
          ${escapeHtml(p.full_name)}${type === 'player' && p.team_name ? ` (${escapeHtml(p.team_name)})` : ''}
        </option>
      `)
      .join('');
  }

  function renderPersonChips(card, media) {
    const row = card.querySelector('.people-row');

    row.innerHTML = media.participants
      .map(p => `
        <span class="chip" data-participant-id="${p.id}">
          ${escapeHtml(participantLabel(p))}
          <button data-action="remove-person" data-id="${p.id}">×</button>
        </span>
      `)
      .join('');

    row.querySelectorAll('[data-action="remove-person"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await removePersonTag(btn.dataset.id);
        await loadMedia();
      });
    });
  }

  // --------------------------------------------------
  // Upload — reuses the shared MediaPipeline (same crop/
  // watermark/tag flow as post images). If the pipeline's own
  // tag step selected any players/officials, finalizeUpload
  // already writes those into media_participants for us.
  // --------------------------------------------------

  async function handleUploadMedia() {
    const statusEl = document.getElementById('media-status');

    const media = await MediaPipeline.selectImage();
    if (!media) return;

    // "Choose Existing" returns an already-uploaded row — nothing to do.
    if (!media.pending) {
      await loadMedia();
      return;
    }

    const label = window.prompt(
      'Give this media a short label (used to name the file):',
      ''
    );

    if (label === null) {
      // User cancelled the prompt — the pending blob is just discarded,
      // nothing was ever sent to Supabase (per MediaPipeline's contract).
      return;
    }

    try {
      statusEl.textContent = 'Uploading...';
      statusEl.classList.remove('error');

      await MediaPipeline.finalizeUpload(media, label);

      statusEl.textContent = 'Uploaded ✓';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);

      await loadMedia();
    } catch (err) {
      console.error(err);
      statusEl.textContent = err.message || 'Upload failed.';
      statusEl.classList.add('error');
    }
  }

  // --------------------------------------------------
  // Person tags (retroactive add/remove on existing media)
  // --------------------------------------------------

  async function addPersonTagToMedia(mediaId, { type, personId, customName }) {
    const payload = {
      media_id: mediaId,
      participant_type: type,
      participant_id: type === 'custom' ? null : personId,
      custom_name: type === 'custom' ? customName : null,
    };

    const { error } = await supabaseClient
      .from('media_participants')
      .insert(payload);

    if (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function removePersonTag(id) {
    const { error } = await supabaseClient
      .from('media_participants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert(error.message);
    }
  }

  // --------------------------------------------------
  // Delete media — blocked while still attached to a post,
  // otherwise removes the participant tags, the storage
  // object, then the media_library row itself.
  // --------------------------------------------------

  async function handleDeleteMedia(media) {
    if (media.usageCount > 0) {
      alert(
        `This media is attached to ${media.usageCount} post(s). ` +
        `Remove it from those posts before deleting it here.`
      );
      return;
    }

    if (!confirm('Delete this media permanently? This cannot be undone.')) {
      return;
    }

    const statusEl = document.getElementById('media-status');

    try {
      const { error: participantsError } = await supabaseClient
        .from('media_participants')
        .delete()
        .eq('media_id', media.id);

      if (participantsError) throw participantsError;

      if (media.storage_path) {
        const { error: storageError } = await supabaseClient.storage
          .from('club-assets')
          .remove([media.storage_path]);

        if (storageError) {
          console.warn('Could not remove storage file:', storageError);
        }
      }

      const { error } = await supabaseClient
        .from('media_library')
        .delete()
        .eq('id', media.id);

      if (error) throw error;

      await loadMedia();
    } catch (err) {
      console.error(err);
      statusEl.textContent = err.message || 'Could not delete media.';
      statusEl.classList.add('error');
    }
  }

  return { cleanup: null };
}