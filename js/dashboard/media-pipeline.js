// js/media-pipeline.js
//
// Shared media pipeline. Three input paths, one processing pipeline:
//  - "Choose Existing": returns a real, already-uploaded media_library row immediately.
//    Untouched - never goes through crop/resize/watermark/compression/Blob conversion.
//  - "Choose From Device" and "Take Photo": both go straight to the shared crop step,
//    then watermark + tag, entirely in-browser, then return a PENDING object.
//    Nothing touches Supabase until the host page calls
//    MediaPipeline.finalizeUpload(pending, postTitle) at publish time.

(function () {
  // Centralized aspect-ratio / output-dimension presets.
  const MEDIA_PRESETS = {
    square:   { label: "Headshot (1:1)", width: 1200, height: 1200 },
    portrait: { label: "3:4",  width: 1200, height: 1600 },
    landscape:{ label: "4:3",  width: 1600, height: 1200 },
    wide:     { label: "16:9", width: 1280, height: 720  },
    passport: { label: "Passport (35x45mm)", width: 413, height: 531 }
  };

  const DEFAULT_DEVICE_PRESET = "wide"; // 16:9 for posts

  // Only these two ratios are offered: 16:9 for posts, 1:1 headshot for profiles.
  const ALLOWED_PRESETS = ["wide", "square"];
  const PRESET_STORAGE_KEY = "mp_last_preset";

  const OUTPUT_QUALITY = 0.9; // JPEG quality for the final Blob

  function loadSavedPreset() {
    try {
      const k = localStorage.getItem(PRESET_STORAGE_KEY);
      if (ALLOWED_PRESETS.includes(k)) return k;
    } catch (e) {}
    return DEFAULT_DEVICE_PRESET;
  }
  function savePreset(key) {
    try { localStorage.setItem(PRESET_STORAGE_KEY, key); } catch (e) {}
  }

  let modalEl = null;
  let allPlayers = [];
  let allOfficials = [];
  let clubCrestUrl = null;
  let activePresetKey = DEFAULT_DEVICE_PRESET;

  function injectStyles() {
    if (document.getElementById("media-pipeline-styles")) return;
    const style = document.createElement("style");
    style.id = "media-pipeline-styles";
    style.textContent = `
      .mp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
      .mp-box { background: #fff; border-radius: 12px; padding: 1.5rem; max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto; font-family: system-ui, sans-serif; }
      .mp-box h2 { margin: 0 0 1rem; font-size: 1.1rem; color: #109b45; }
      .mp-step-label { font-size: 0.8rem; color: #888; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 700; }
      .mp-viewport { max-width: 100%; overflow: hidden; position: relative; background: #222; border-radius: 8px; margin: 0 auto 1rem; cursor: grab; }
      .mp-viewport.dragging { cursor: grabbing; }
      .mp-viewport img { position: absolute; max-width: none !important; max-height: none !important; min-width: 0; min-height: 0; margin: 0; user-select: none; -webkit-user-drag: none; pointer-events: none; }
      .mp-field { margin-bottom: 1rem; }
      .mp-field label { display: block; font-size: 0.8rem; color: #555; margin-bottom: 0.3rem; font-weight: 600; }
      .mp-tag-search { width: 100%; padding: 0.5rem 0.6rem; border: 1px solid #d3ded6; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.6rem; box-sizing: border-box; }
      .mp-tag-list { display: flex; flex-wrap: wrap; gap: 0.5rem; max-height: 180px; overflow-y: auto; padding: 0.3rem; border: 1px solid #f0f4f1; border-radius: 6px; }
      .mp-tag-chip { display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.7rem; border-radius: 16px; background: #f7faf8; border: 1px solid #e2ece5; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
      .mp-tag-chip.selected { background: #109b45; color: #fff; border-color: #109b45; }
      .mp-tag-chip input { display: none; }
      .mp-actions { display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 1.2rem; }
      .mp-btn-primary { background: #109b45; color: #fff; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
      .mp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .mp-btn-secondary { background: #eee; color: #333; border: none; padding: 0.6rem 1.1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
      .mp-status { font-size: 0.82rem; margin-top: 0.5rem; color: #b3261e; min-height: 1.2em; }
      .mp-preview-final { max-width: 100%; border-radius: 8px; margin-bottom: 1rem; }
    `;
    document.head.appendChild(style);
  }

  async function ensureSupportingData() {
    if (!allPlayers.length) {
      const { data } = await supabaseClient.from("players").select("id, full_name, team_name").eq("is_active", true).order("full_name");
      allPlayers = data || [];
    }
    if (!allOfficials.length) {
      const { data } = await supabaseClient.from("officials").select("id, full_name").eq("is_active", true).order("full_name");
      allOfficials = data || [];
    }
    if (!clubCrestUrl) {
      const { data } = await supabaseClient.from("club_profile").select("crest_url").eq("id", 1).single();
      clubCrestUrl = data ? data.crest_url : null;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function slugify(str) {
    return (str || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function shortRandomSuffix() {
    return Math.random().toString(36).slice(2, 8);
  }

  // Fit a preset's aspect ratio inside a mobile-first bounding box.
  function getViewportDims(preset) {
    const MAX_W = 320, MAX_H = 320;
    const ratio = preset.width / preset.height;
    let w = MAX_W, h = Math.round(MAX_W / ratio);
    if (h > MAX_H) { h = MAX_H; w = Math.round(MAX_H * ratio); }
    return { w, h };
  }

  // ---------- Public: choice modal ----------
  // Optional: selectImage({ ratio: "wide" | "square" }) to force a starting ratio.
  // With no argument, it starts from the last ratio used on this device (default 16:9).
  function selectImage(options) {
    activePresetKey = (options && ALLOWED_PRESETS.includes(options.ratio)) ? options.ratio : loadSavedPreset();
    return new Promise(async (resolve) => {
      injectStyles();

      modalEl = document.createElement("div");
      modalEl.className = "mp-overlay";
      document.body.appendChild(modalEl);

      renderChoiceStep(resolve);
    });
  }

  function renderChoiceStep(resolve) {
    modalEl.innerHTML = `
      <div class="mp-box" style="text-align:center;">
        <h2>Add Image</h2>
        <p style="font-size:0.88rem; color:#666; margin-bottom:1.2rem;">Take a new photo, upload one from your device, or reuse one already in the media library.</p>
        <div style="display:flex; gap:0.8rem; justify-content:center; flex-wrap:wrap;">
          <button class="mp-btn-primary" id="mp-choice-camera-btn">Take Photo</button>
          <button class="mp-btn-primary" id="mp-choice-upload-btn">Choose From Device</button>
          <button class="mp-btn-secondary" id="mp-choice-library-btn">Choose Existing</button>
        </div>
        <div class="mp-actions" style="justify-content:center;">
          <button class="mp-btn-secondary" id="mp-choice-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    modalEl.querySelector("#mp-choice-cancel-btn").addEventListener("click", () => closeModal(resolve));

    modalEl.querySelector("#mp-choice-camera-btn").addEventListener("click", () => {
      ensureSupportingData(); // not awaited, keeps the tap valid for opening the camera
      openNativeCamera(resolve);
    });

    modalEl.querySelector("#mp-choice-upload-btn").addEventListener("click", () => {
      ensureSupportingData();
      openDevicePicker(resolve);
    });

    modalEl.querySelector("#mp-choice-library-btn").addEventListener("click", async () => {
      modalEl.remove(); modalEl = null;
      resolve(await openLibraryPicker());
    });
  }

  function closeModal(resolve, result) {
    if (modalEl) modalEl.remove();
    modalEl = null;
    resolve(result || null);
  }

  // ===================================================================
  // TAKE PHOTO - native camera app via file input with capture
  // ===================================================================

  function openNativeCamera(resolve) {
    modalEl.innerHTML = `
      <div class="mp-box" style="text-align:center;">
        <h2>Take Photo</h2>
        <p style="font-size:0.88rem; color:#666;">Opening your camera...</p>
        <div class="mp-actions" style="justify-content:center;">
          <button class="mp-btn-secondary" id="mp-camera-native-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;

    function cleanup() {
      window.removeEventListener("focus", onFocusReturn);
      if (input.parentNode) input.remove();
    }

    // Most mobile browsers never fire 'cancel' on file inputs, so detect backing
    // out of the camera by checking for a chosen file after focus returns.
    function onFocusReturn() {
      setTimeout(() => {
        if (!settled && (!input.files || !input.files[0])) {
          settled = true;
          cleanup();
          renderChoiceStep(resolve);
        }
      }, 300);
    }
    window.addEventListener("focus", onFocusReturn);

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      settled = true;
      cleanup();
      if (!file) {
        renderChoiceStep(resolve);
        return;
      }
      const img = new Image();
      img.onload = () => renderCropStep(resolve, img, file, activePresetKey, "camera");
      img.src = URL.createObjectURL(file);
    });

    modalEl.querySelector("#mp-camera-native-cancel-btn").addEventListener("click", () => {
      settled = true;
      cleanup();
      renderChoiceStep(resolve);
    });

    input.click();
  }

  // ===================================================================
  // CHOOSE FROM DEVICE - opens the device file picker directly
  // ===================================================================

  function openDevicePicker(resolve) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg, image/webp";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      input.remove();
      if (!file) return; // choice modal stays visible
      const img = new Image();
      img.onload = () => renderCropStep(resolve, img, file, activePresetKey, "device");
      img.src = URL.createObjectURL(file);
    });

    input.click();
  }

  // ===================================================================
  // SHARED: crop step with ratio dropdown, drag and pinch zoom
  // ===================================================================

  function renderCropStep(resolve, img, originalFile, presetKey, source) {
    if (!ALLOWED_PRESETS.includes(presetKey)) presetKey = DEFAULT_DEVICE_PRESET;
    const preset = MEDIA_PRESETS[presetKey];
    const { w: viewportW, h: viewportH } = getViewportDims(preset);

    modalEl.innerHTML = `
      <div class="mp-box">
        <h2>${source === "camera" ? "Take Photo" : "Upload Media"}</h2>
        <div class="mp-step-label">Crop to ${escapeHtml(preset.label)}</div>
        <select id="mp-ratio-select" class="mp-tag-search">
          ${ALLOWED_PRESETS.map(k => `<option value="${k}" ${k === presetKey ? "selected" : ""}>${escapeHtml(MEDIA_PRESETS[k].label)}</option>`).join("")}
        </select>
        <div class="mp-viewport" id="mp-viewport" style="width:${viewportW}px; height:${viewportH}px;"></div>
        <div class="mp-actions">
          <button class="mp-btn-secondary" id="mp-back-btn">Back</button>
          <button class="mp-btn-primary" id="mp-confirm-crop-btn">Confirm Crop</button>
        </div>
      </div>
    `;

    const viewport = modalEl.querySelector("#mp-viewport");
    const imgEl = document.createElement("img");
    viewport.appendChild(imgEl);

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const coverScale = Math.max(viewportW / naturalW, viewportH / naturalH);

    let scale = coverScale;
    let tx = (viewportW - naturalW * scale) / 2;
    let ty = (viewportH - naturalH * scale) / 2;

    function clamp() {
      const w = naturalW * scale, h = naturalH * scale;
      tx = Math.min(0, Math.max(viewportW - w, tx));
      ty = Math.min(0, Math.max(viewportH - h, ty));
    }
    function applyTransform() {
      imgEl.style.maxWidth = "none";
      imgEl.style.maxHeight = "none";
      imgEl.style.width = naturalW * scale + "px";
      imgEl.style.height = naturalH * scale + "px";
      imgEl.style.left = tx + "px";
      imgEl.style.top = ty + "px";
    }

    imgEl.src = img.src;
    clamp(); applyTransform();

    // Free-hand placement and zoom: one finger drags, two fingers pinch, wheel on desktop.
    viewport.style.touchAction = "none";
    const pointers = new Map();
    let pinchStartDist = 0, pinchStartScale = scale;

    function zoomAt(newScale, cx, cy) {
      newScale = Math.min(coverScale * 4, Math.max(coverScale, newScale));
      const relX = (cx - tx) / scale, relY = (cy - ty) / scale;
      scale = newScale;
      tx = cx - relX * scale;
      ty = cy - relY * scale;
      clamp(); applyTransform();
    }
    function twoPoints() {
      const [a, b] = [...pointers.values()];
      return { a, b, dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }

    viewport.addEventListener("pointerdown", (e) => {
      viewport.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      viewport.classList.add("dragging");
      if (pointers.size === 2) {
        pinchStartDist = twoPoints().dist;
        pinchStartScale = scale;
      }
    });

    viewport.addEventListener("pointermove", (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        tx += e.clientX - prev.x;
        ty += e.clientY - prev.y;
        clamp(); applyTransform();
      } else if (pointers.size === 2) {
        const { a, b, dist } = twoPoints();
        const rect = viewport.getBoundingClientRect();
        zoomAt(pinchStartScale * (dist / pinchStartDist),
               (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) { pinchStartDist = 0; pinchStartScale = scale; }
      if (pointers.size === 0) viewport.classList.remove("dragging");
    }
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);

    viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomAt(scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    // Ratio dropdown: remember the choice on this device and redraw the frame.
    modalEl.querySelector("#mp-ratio-select").addEventListener("change", (e) => {
      activePresetKey = e.target.value;
      savePreset(activePresetKey);
      renderCropStep(resolve, img, originalFile, activePresetKey, source);
    });

    modalEl.querySelector("#mp-back-btn").addEventListener("click", () => {
      renderChoiceStep(resolve);
    });

    modalEl.querySelector("#mp-confirm-crop-btn").addEventListener("click", () => {
      const sx = (0 - tx) / scale, sy = (0 - ty) / scale;
      const sw = viewportW / scale, sh = viewportH / scale;

      const canvas = document.createElement("canvas");
      canvas.width = preset.width;
      canvas.height = preset.height;
      canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, preset.width, preset.height);

      renderTagStep(resolve, canvas, () => renderCropStep(resolve, img, originalFile, presetKey, source));
    });
  }

  // ===================================================================
  // SHARED: tag step -> produces the PENDING object (unchanged contract)
  // ===================================================================

  function renderTagStep(resolve, croppedCanvas, goBack) {
    modalEl.innerHTML = `
      <div class="mp-box">
        <h2>Add Image</h2>
        <div class="mp-step-label">Tag participants (optional)</div>
        <img class="mp-preview-final" src="${croppedCanvas.toDataURL("image/jpeg", 0.9)}">
        <div class="mp-field">
          <label>Tag Players / Officials (optional - tap to select)</label>
          <input type="text" class="mp-tag-search" id="mp-tag-search" placeholder="Search...">
          <div class="mp-tag-list" id="mp-tag-list"></div>
        </div>
        <div class="mp-status" id="mp-status"></div>
        <div class="mp-actions">
          <button class="mp-btn-secondary" id="mp-back-btn">Back</button>
          <button class="mp-btn-primary" id="mp-confirm-tags-btn">Use This Image</button>
        </div>
      </div>
    `;

    const selectedTags = new Map(); // key "type:id" -> {type, id, name}

    function renderTagList(filter) {
      const listEl = modalEl.querySelector("#mp-tag-list");
      const term = (filter || "").toLowerCase();

      const items = [
        ...allPlayers.filter(p => !term || p.full_name.toLowerCase().includes(term) || (p.team_name || "").toLowerCase().includes(term))
          .map(p => ({ key: `player:${p.id}`, type: "player", id: p.id, name: p.team_name || p.full_name, label: p.team_name || p.full_name })),
        ...allOfficials.filter(o => !term || o.full_name.toLowerCase().includes(term))
          .map(o => ({ key: `official:${o.id}`, type: "official", id: o.id, name: o.full_name, label: o.full_name + " (Official)" })),
      ];

      listEl.innerHTML = items.length
        ? items.map(item => `
            <label class="mp-tag-chip ${selectedTags.has(item.key) ? 'selected' : ''}" data-key="${item.key}">
              <input type="checkbox" ${selectedTags.has(item.key) ? "checked" : ""}>
              ${escapeHtml(item.label)}
            </label>
          `).join("")
        : `<div style="font-size:0.82rem;color:#999;">No matches.</div>`;

      listEl.querySelectorAll(".mp-tag-chip").forEach(chip => {
        chip.addEventListener("click", (e) => {
          e.preventDefault();
          const key = chip.dataset.key;
          const item = items.find(i => i.key === key);
          if (selectedTags.has(key)) {
            selectedTags.delete(key);
            chip.classList.remove("selected");
          } else {
            selectedTags.set(key, { type: item.type, id: item.id, name: item.name });
            chip.classList.add("selected");
          }
        });
      });
    }

    renderTagList("");
    modalEl.querySelector("#mp-tag-search").addEventListener("input", (e) => renderTagList(e.target.value));
    modalEl.querySelector("#mp-back-btn").addEventListener("click", () => {
      if (goBack) { goBack(); } else { renderChoiceStep(resolve); }
    });

    modalEl.querySelector("#mp-confirm-tags-btn").addEventListener("click", async () => {
      const statusEl = modalEl.querySelector("#mp-status");
      statusEl.style.color = "#109b45";
      statusEl.textContent = "Preparing image...";

      try {
        const watermarked = await applyWatermark(croppedCanvas);
        const blob = await new Promise(res => watermarked.toBlob(res, "image/jpeg", OUTPUT_QUALITY));
        const previewUrl = URL.createObjectURL(blob);

        closeModal(resolve, {
          pending: true,
          blob,
          previewUrl,
          tags: [...selectedTags.values()],
        });
      } catch (err) {
        statusEl.style.color = "#b3261e";
        statusEl.textContent = err.message;
      }
    });
  }

  function applyWatermark(sourceCanvas) {
    return new Promise((resolve) => {
      if (!clubCrestUrl) { resolve(sourceCanvas); return; }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = sourceCanvas.width;
      outCanvas.height = sourceCanvas.height;
      const ctx = outCanvas.getContext("2d");
      ctx.drawImage(sourceCanvas, 0, 0);

      const crestImg = new Image();
      crestImg.crossOrigin = "anonymous";
      crestImg.onload = () => {
        const margin = outCanvas.width * 0.03;
        const crestW = outCanvas.width * 0.12;
        const crestH = crestW * (crestImg.naturalHeight / crestImg.naturalWidth);
        ctx.globalAlpha = 0.55;
        ctx.drawImage(crestImg, outCanvas.width - crestW - margin, outCanvas.height - crestH - margin, crestW, crestH);
        ctx.globalAlpha = 1;
        resolve(outCanvas);
      };
      crestImg.onerror = () => resolve(sourceCanvas);
      crestImg.src = clubCrestUrl;
    });
  }

  // ---------- Reuse existing media (untouched) ----------
  function openLibraryPicker() {
    return new Promise(async (resolve) => {
      injectStyles();
      await ensureSupportingData();

      modalEl = document.createElement("div");
      modalEl.className = "mp-overlay";
      document.body.appendChild(modalEl);

      modalEl.innerHTML = `
        <div class="mp-box" style="max-width: 700px;">
          <h2>Choose from Media Library</h2>
          <div class="mp-field">
            <input type="text" class="mp-tag-search" id="mp-lib-search" placeholder="Search by slug, player, or official...">
          </div>
          <div id="mp-lib-status" style="font-size:0.82rem; color:#888; margin-bottom:0.6rem;">Loading...</div>
          <div id="mp-lib-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.7rem; max-height: 400px; overflow-y: auto;"></div>
          <div class="mp-actions">
            <button class="mp-btn-secondary" id="mp-lib-cancel-btn">Cancel</button>
          </div>
        </div>
      `;

      modalEl.querySelector("#mp-lib-cancel-btn").addEventListener("click", () => closeModal(resolve));

      let allMedia = [];
      let tagsByMediaId = {};

      const { data: mediaData, error } = await supabaseClient.from("media_library").select("*").order("created_at", { ascending: false });
      const statusEl = modalEl.querySelector("#mp-lib-status");

      if (error) { statusEl.textContent = error.message; statusEl.style.color = "#b3261e"; return; }

      allMedia = mediaData || [];

      const { data: tagData } = await supabaseClient.from("media_participants").select("*");
      (tagData || []).forEach(t => {
        if (!tagsByMediaId[t.media_id]) tagsByMediaId[t.media_id] = [];
        const name = t.participant_type === "player"
          ? (allPlayers.find(p => p.id === t.participant_id) || {}).full_name
          : (allOfficials.find(o => o.id === t.participant_id) || {}).full_name;
        tagsByMediaId[t.media_id].push(name || "Unknown");
      });

      statusEl.textContent = allMedia.length ? "" : "No media uploaded yet.";

      function renderGrid(filterTerm) {
        const grid = modalEl.querySelector("#mp-lib-grid");
        const term = (filterTerm || "").toLowerCase();
        const filtered = allMedia.filter(m => {
          if (!term) return true;
          const tags = (tagsByMediaId[m.id] || []).join(" ").toLowerCase();
          return m.slug.toLowerCase().includes(term) || tags.includes(term);
        });

        if (!filtered.length) {
          grid.innerHTML = `<div style="grid-column:1/-1; font-size:0.85rem; color:#999; text-align:center; padding:1rem;">No matches.</div>`;
          return;
        }

        grid.innerHTML = filtered.map(m => `
          <div class="mp-lib-item" data-id="${m.id}" style="cursor:pointer; border-radius:8px; overflow:hidden; border:2px solid transparent;">
            <img src="${m.url}" style="width:100%; aspect-ratio:16/9; object-fit:cover; display:block;">
            <div style="font-size:0.7rem; color:#666; padding:0.3rem; background:#f7faf8; text-align:center; word-break:break-all;">${escapeHtml(m.slug)}</div>
          </div>
        `).join("");

        grid.querySelectorAll(".mp-lib-item").forEach(item => {
          item.addEventListener("click", () => closeModal(resolve, allMedia.find(m => m.id === item.dataset.id)));
          item.addEventListener("mouseenter", () => item.style.borderColor = "#109b45");
          item.addEventListener("mouseleave", () => item.style.borderColor = "transparent");
        });
      }

      renderGrid("");
      modalEl.querySelector("#mp-lib-search").addEventListener("input", (e) => renderGrid(e.target.value));
    });
  }

  // ---------- Finalize a pending upload (unchanged) ----------
  async function finalizeUpload(pending, postTitle) {
    await ensureSupportingData();

    const baseSlug = slugify(postTitle);
    const tagSlugPart = pending.tags.map(t => slugify(t.name)).join("-");
    const parts = [baseSlug, tagSlugPart, shortRandomSuffix()].filter(Boolean);
    const finalSlug = parts.join("-");
    const path = `media/${finalSlug}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from("club-assets")
      .upload(path, pending.blob, { upsert: true, cacheControl: "3600", contentType: "image/jpeg" });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseClient.storage.from("club-assets").getPublicUrl(path);
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data: mediaRow, error: insertError } = await supabaseClient
      .from("media_library")
      .insert({ storage_path: path, url: publicUrlData.publicUrl, slug: finalSlug, created_by: user ? user.id : null })
      .select()
      .single();
    if (insertError) throw insertError;

    if (pending.tags.length) {
      const tagRows = pending.tags.map(t => ({ media_id: mediaRow.id, participant_type: t.type, participant_id: t.id }));
      await supabaseClient.from("media_participants").insert(tagRows);
    }

    return mediaRow;
  }

  window.MediaPipeline = { selectImage, openLibraryPicker, finalizeUpload, slugify };
})();