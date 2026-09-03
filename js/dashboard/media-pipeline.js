// js/media-pipeline.js
//
// Shared media pipeline. Three input paths, one processing pipeline:
//  - "Choose Existing": returns a real, already-uploaded media_library row immediately.
//    Untouched — never goes through crop/resize/watermark/compression/Blob conversion.
//  - "Choose From Device" and "Take Photo" (in-PWA camera): both funnel through the
//    same ratio-aware crop → watermark → tag steps, entirely in-browser, then return
//    a PENDING object — nothing touches Supabase yet. The host page must call
//    MediaPipeline.finalizeUpload(pending, postTitle) at actual publish time to
//    perform the real upload + media_library insert. This guarantees nothing is
//    saved to Supabase if the post is never published, and that a camera photo
//    the user never publishes never leaves the browser.

(function () {
  // Centralized aspect-ratio / output-dimension presets. Do not scatter
  // width/height values elsewhere in this file — everything reads from here.
  const MEDIA_PRESETS = {
    square:   { label: "1:1",  width: 1200, height: 1200 },
    portrait: { label: "3:4",  width: 1200, height: 1600 },
    landscape:{ label: "4:3",  width: 1600, height: 1200 },
    wide:     { label: "16:9", width: 1280, height: 720  },
    passport: { label: "Passport (35×45mm)", width: 413, height: 531 }
  };

  // Preserves the previous hard-coded 16:9 default for the device-upload path.
  const DEFAULT_DEVICE_PRESET = "wide";
  // Sensible default when opening the in-PWA camera.
  const DEFAULT_CAMERA_PRESET = "square";

  const OUTPUT_QUALITY = 0.9; // JPEG compression quality used for the final Blob

  let modalEl = null;
  let allPlayers = [];
  let allOfficials = [];
  let clubCrestUrl = null;

  // ---- Camera state ----
  let currentStream = null;

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
      .mp-viewport img { position: absolute; user-select: none; -webkit-user-drag: none; pointer-events: none; }
      .mp-zoom-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem; }
      .mp-zoom-row input[type="range"] { flex: 1; }
      .mp-field { margin-bottom: 1rem; }
      .mp-field label { display: block; font-size: 0.8rem; color: #555; margin-bottom: 0.3rem; font-weight: 600; }
      .mp-tag-search { width: 100%; padding: 0.5rem 0.6rem; border: 1px solid #d3ded6; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.6rem; box-sizing: border-box; }
      /* Horizontal, wrapping tag chips */
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
      .mp-file-input-wrap { border: 2px dashed #d3ded6; border-radius: 8px; padding: 2rem; text-align: center; color: #888; font-size: 0.88rem; cursor: pointer; }
      .mp-file-input-wrap:hover { border-color: #109b45; color: #109b45; }

      /* Camera */
      .mp-camera { display: flex; flex-direction: column; align-items: center; }
      .mp-camera-ratio { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin-bottom: 0.8rem; }
      .mp-camera-ratio-btn { border: 1px solid #d3ded6; background: #fff; color: #555; border-radius: 16px; padding: 0.35rem 0.8rem; font-size: 0.78rem; cursor: pointer; }
      .mp-camera-ratio-btn.selected { background: #109b45; color: #fff; border-color: #109b45; }
      .mp-camera-frame { width: 100%; max-width: 320px; background: #000; border-radius: 10px; overflow: hidden; position: relative; margin: 0 auto; }
      .mp-camera-video { width: 100%; height: 100%; object-fit: cover; display: block; }
      .mp-camera-controls { display: flex; align-items: center; justify-content: center; gap: 1.4rem; margin-top: 1rem; }
      .mp-camera-shutter { width: 60px; height: 60px; border-radius: 50%; background: #fff; border: 4px solid #109b45; cursor: pointer; padding: 0; }
      .mp-camera-shutter:active { background: #e5f4ea; }
      .mp-camera-switch { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #d3ded6; background: #fff; font-size: 1.1rem; cursor: pointer; }
      .mp-camera-preview { background: #222; }
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

  // Fit a preset's aspect ratio inside a mobile-first bounding box, regardless
  // of whether the preset is landscape, square, or portrait (e.g. passport).
  function getViewportDims(preset) {
    const MAX_W = 320, MAX_H = 320;
    const ratio = preset.width / preset.height;
    let w = MAX_W, h = Math.round(MAX_W / ratio);
    if (h > MAX_H) { h = MAX_H; w = Math.round(MAX_H * ratio); }
    return { w, h };
  }

  // ---------- Public: choice modal (Take Photo / Choose From Device / Choose Existing) ----------
  function selectImage() {
    return new Promise(async (resolve) => {
      injectStyles();

      modalEl = document.createElement("div");
      modalEl.className = "mp-overlay";
      document.body.appendChild(modalEl);

      renderChoiceStep(resolve);
    });
  }

  function renderChoiceStep(resolve) {
    stopCamera(); // defensive: ensure no stream is left running if we land back here

    modalEl.innerHTML = `
      <div class="mp-box" style="text-align:center;">
        <h2>Add Image</h2>
        <p style="font-size:0.88rem; color:#666; margin-bottom:1.2rem;">Take a new photo, upload one from your device, or reuse one already in the media library.</p>
        <div style="display:flex; gap:0.8rem; justify-content:center; flex-wrap:wrap;">
          <button class="mp-btn-primary" id="mp-choice-camera-btn">📷 Take Photo</button>
          <button class="mp-btn-primary" id="mp-choice-upload-btn">🖼️ Choose From Device</button>
          <button class="mp-btn-secondary" id="mp-choice-library-btn">🗂️ Choose Existing</button>
        </div>
        <div class="mp-actions" style="justify-content:center;">
          <button class="mp-btn-secondary" id="mp-choice-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    modalEl.querySelector("#mp-choice-cancel-btn").addEventListener("click", () => closeModal(resolve));

    modalEl.querySelector("#mp-choice-camera-btn").addEventListener("click", async () => {
      await ensureSupportingData();
      renderCameraStep(resolve, DEFAULT_CAMERA_PRESET);
    });

    modalEl.querySelector("#mp-choice-upload-btn").addEventListener("click", async () => {
      await ensureSupportingData();
      renderFileSelectStep(resolve);
    });

    modalEl.querySelector("#mp-choice-library-btn").addEventListener("click", async () => {
      modalEl.remove(); modalEl = null;
      resolve(await openLibraryPicker());
    });
  }

  function closeModal(resolve, result) {
    stopCamera();
    if (modalEl) modalEl.remove();
    modalEl = null;
    resolve(result || null);
  }

  // ===================================================================
  // CHOOSE FROM DEVICE (formerly "Upload New") — untouched contract,
  // now ratio-aware via the shared crop engine.
  // ===================================================================

  function renderFileSelectStep(resolve) {
    modalEl.innerHTML = `
      <div class="mp-box">
        <h2>Upload Media</h2>
        <div class="mp-step-label">Choose an image</div>
        <label class="mp-file-input-wrap">
          📷 Click to choose an image
          <input type="file" accept="image/png, image/jpeg, image/webp" style="display:none;" id="mp-file-input">
        </label>
        <div class="mp-actions">
          <button class="mp-btn-secondary" id="mp-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    modalEl.querySelector("#mp-cancel-btn").addEventListener("click", () => closeModal(resolve));
    modalEl.querySelector("#mp-file-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => renderRatioSelectStep(resolve, img, file);
      img.src = URL.createObjectURL(file);
    });
  }

  function renderRatioSelectStep(resolve, img, originalFile) {
    let selectedKey = DEFAULT_DEVICE_PRESET;

    modalEl.innerHTML = `
      <div class="mp-box">
        <h2>Upload Media</h2>
        <div class="mp-step-label">Choose aspect ratio</div>
        <div class="mp-camera-ratio" id="mp-device-ratio">
          ${Object.keys(MEDIA_PRESETS).map(key => `
            <button type="button" class="mp-camera-ratio-btn ${key === selectedKey ? 'selected' : ''}" data-key="${key}">${MEDIA_PRESETS[key].label}</button>
          `).join("")}
        </div>
        <div class="mp-actions">
          <button class="mp-btn-secondary" id="mp-back-btn">Back</button>
          <button class="mp-btn-primary" id="mp-ratio-continue-btn">Continue</button>
        </div>
      </div>
    `;

    modalEl.querySelectorAll(".mp-camera-ratio-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedKey = btn.dataset.key;
        modalEl.querySelectorAll(".mp-camera-ratio-btn").forEach(b => b.classList.toggle("selected", b === btn));
      });
    });

    modalEl.querySelector("#mp-back-btn").addEventListener("click", () => renderFileSelectStep(resolve));
    modalEl.querySelector("#mp-ratio-continue-btn").addEventListener("click", () => {
      renderCropStep(resolve, img, originalFile, selectedKey, "device");
    });
  }

  // ===================================================================
  // TAKE PHOTO — in-PWA camera (no external camera app)
  // ===================================================================

  async function startCamera(facingMode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("unsupported");
    }
    stopCamera();
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
    } catch (err) {
      if (err && (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError")) {
        // Fall back to whatever camera is available if the requested facing mode fails.
        currentStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      } else {
        throw err;
      }
    }
    return currentStream;
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
  }

  function capturePhotoFrame(video) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function canvasToImage(canvas) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = canvas.toDataURL("image/jpeg", 0.95);
    });
  }

  function getCameraErrorMessage(err) {
    const name = err && err.name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Camera access was denied. Allow camera access in your browser settings to use Take Photo.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No camera was found on this device.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "The camera is unavailable right now. It may be in use by another app.";
    }
    if (err && err.message === "unsupported") {
      return "Camera capture isn't supported in this browser.";
    }
    return "Could not start the camera. Please try again.";
  }

  async function renderCameraStep(resolve, presetKey) {
    presetKey = presetKey || DEFAULT_CAMERA_PRESET;
    let currentFacing = "environment"; // prefer rear camera

    modalEl.innerHTML = `
      <div class="mp-box" style="max-width:420px;">
        <h2>Take Photo</h2>
        <div class="mp-camera">
          <div class="mp-camera-ratio" id="mp-camera-ratio">
            ${Object.keys(MEDIA_PRESETS).map(key => `
              <button type="button" class="mp-camera-ratio-btn ${key === presetKey ? 'selected' : ''}" data-key="${key}">${MEDIA_PRESETS[key].label}</button>
            `).join("")}
          </div>
          <div class="mp-camera-frame" id="mp-camera-frame">
            <video class="mp-camera-video" id="mp-camera-video" autoplay playsinline muted></video>
          </div>
          <div class="mp-status" id="mp-camera-status"></div>
          <div class="mp-camera-controls">
            <button type="button" class="mp-camera-switch" id="mp-camera-switch-btn" title="Switch camera">🔄</button>
            <button type="button" class="mp-camera-shutter" id="mp-camera-shutter-btn" aria-label="Take photo"></button>
            <span style="width:44px;"></span>
          </div>
        </div>
        <div class="mp-actions" style="justify-content:center;">
          <button class="mp-btn-secondary" id="mp-camera-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    const frameEl = modalEl.querySelector("#mp-camera-frame");
    const videoEl = modalEl.querySelector("#mp-camera-video");
    const statusEl = modalEl.querySelector("#mp-camera-status");

    function setFrameRatio(key) {
      const p = MEDIA_PRESETS[key];
      frameEl.style.aspectRatio = `${p.width} / ${p.height}`;
    }
    setFrameRatio(presetKey);

    modalEl.querySelectorAll(".mp-camera-ratio-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        presetKey = btn.dataset.key;
        modalEl.querySelectorAll(".mp-camera-ratio-btn").forEach(b => b.classList.toggle("selected", b === btn));
        setFrameRatio(presetKey);
      });
    });

    modalEl.querySelector("#mp-camera-cancel-btn").addEventListener("click", () => {
      stopCamera();
      closeModal(resolve);
    });

    modalEl.querySelector("#mp-camera-switch-btn").addEventListener("click", async () => {
      currentFacing = currentFacing === "environment" ? "user" : "environment";
      await startCameraSafe();
    });

    modalEl.querySelector("#mp-camera-shutter-btn").addEventListener("click", async () => {
      if (!currentStream) return;
      const canvas = capturePhotoFrame(videoEl);
      stopCamera(); // stop the stream the moment we have the frame
      const img = await canvasToImage(canvas);
      renderCapturePreviewStep(resolve, img, presetKey);
    });

    async function startCameraSafe() {
      statusEl.style.color = "#109b45";
      statusEl.textContent = "Starting camera…";
      try {
        await startCamera(currentFacing);
        videoEl.srcObject = currentStream;
        videoEl.play().catch(() => {});
        statusEl.textContent = "";
      } catch (err) {
        statusEl.textContent = "";
        renderCameraErrorStep(resolve, err);
      }
    }

    await startCameraSafe();
  }

  function renderCameraErrorStep(resolve, err) {
    stopCamera();
    const message = getCameraErrorMessage(err);
    modalEl.innerHTML = `
      <div class="mp-box" style="text-align:center;">
        <h2>Take Photo</h2>
        <p style="font-size:0.88rem; color:#b3261e; margin-bottom:1.2rem;">${escapeHtml(message)}</p>
        <div class="mp-actions" style="justify-content:center;">
          <button class="mp-btn-secondary" id="mp-camera-err-back-btn">Back</button>
        </div>
      </div>
    `;
    modalEl.querySelector("#mp-camera-err-back-btn").addEventListener("click", () => renderChoiceStep(resolve));
  }

  function renderCapturePreviewStep(resolve, img, presetKey) {
    const preset = MEDIA_PRESETS[presetKey];
    modalEl.innerHTML = `
      <div class="mp-box" style="max-width:420px; text-align:center;">
        <h2>Take Photo</h2>
        <div class="mp-step-label">Preview</div>
        <div class="mp-camera-preview" style="max-width:280px; margin:0 auto 1rem; aspect-ratio:${preset.width}/${preset.height}; overflow:hidden; border-radius:8px;">
          <img src="${img.src}" style="width:100%; height:100%; object-fit:cover; display:block;">
        </div>
        <div class="mp-actions" style="justify-content:center;">
          <button class="mp-btn-secondary" id="mp-retake-btn">Retake</button>
          <button class="mp-btn-primary" id="mp-use-photo-btn">Use Photo</button>
        </div>
      </div>
    `;
    modalEl.querySelector("#mp-retake-btn").addEventListener("click", () => renderCameraStep(resolve, presetKey));
    modalEl.querySelector("#mp-use-photo-btn").addEventListener("click", () => {
      renderCropStep(resolve, img, null, presetKey, "camera");
    });
  }

  // ===================================================================
  // SHARED: ratio-aware crop step (used by both device uploads and camera captures)
  // ===================================================================

  function renderCropStep(resolve, img, originalFile, presetKey, source) {
    const preset = MEDIA_PRESETS[presetKey] || MEDIA_PRESETS[DEFAULT_DEVICE_PRESET];
    const { w: viewportW, h: viewportH } = getViewportDims(preset);

    modalEl.innerHTML = `
      <div class="mp-box">
        <h2>${source === "camera" ? "Take Photo" : "Upload Media"}</h2>
        <div class="mp-step-label">Crop to ${escapeHtml(preset.label)}</div>
        <div class="mp-viewport" id="mp-viewport" style="width:${viewportW}px; height:${viewportH}px;"></div>
        <div class="mp-zoom-row">
          <span>🔍−</span>
          <input type="range" id="mp-zoom-slider" min="0" max="100" value="0">
          <span>🔍+</span>
        </div>
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
      imgEl.style.width = naturalW * scale + "px";
      imgEl.style.height = naturalH * scale + "px";
      imgEl.style.left = tx + "px";
      imgEl.style.top = ty + "px";
    }

    imgEl.src = img.src;
    clamp(); applyTransform();

    let dragging = false, lastX = 0, lastY = 0;
    function startDrag(x, y) { dragging = true; lastX = x; lastY = y; viewport.classList.add("dragging"); }
    function moveDrag(x, y) {
      if (!dragging) return;
      tx += x - lastX; ty += y - lastY;
      lastX = x; lastY = y;
      clamp(); applyTransform();
    }
    function endDrag() { dragging = false; viewport.classList.remove("dragging"); }

    viewport.addEventListener("mousedown", (e) => startDrag(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", endDrag);
    viewport.addEventListener("touchstart", (e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); });
    viewport.addEventListener("touchmove", (e) => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
    viewport.addEventListener("touchend", endDrag);

    modalEl.querySelector("#mp-zoom-slider").addEventListener("input", (e) => {
      const oldScale = scale;
      const zoomExtra = parseInt(e.target.value) / 100;
      scale = coverScale * (1 + zoomExtra * 2);
      const centerX = viewportW / 2, centerY = viewportH / 2;
      const relX = (centerX - tx) / oldScale, relY = (centerY - ty) / oldScale;
      tx = centerX - relX * scale; ty = centerY - relY * scale;
      clamp(); applyTransform();
    });

    modalEl.querySelector("#mp-back-btn").addEventListener("click", () => {
      if (source === "camera") {
        renderCameraStep(resolve, presetKey);
      } else {
        renderRatioSelectStep(resolve, img, originalFile);
      }
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
  // SHARED: tag step → produces the PENDING object (unchanged contract)
  // ===================================================================

  function renderTagStep(resolve, croppedCanvas, goBack) {
    modalEl.innerHTML = `
      <div class="mp-box">
        <h2>Add Image</h2>
        <div class="mp-step-label">Tag participants (optional)</div>
        <img class="mp-preview-final" src="${croppedCanvas.toDataURL("image/jpeg", 0.9)}">
        <div class="mp-field">
          <label>Tag Players / Officials (optional — tap to select)</label>
          <input type="text" class="mp-tag-search" id="mp-tag-search" placeholder="Search…">
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
          .map(p => ({ key: `player:${p.id}`, type: "player", id: p.id, name: p.team_name || p.full_name, label: `🧑 ${p.team_name || p.full_name}` })),
        ...allOfficials.filter(o => !term || o.full_name.toLowerCase().includes(term))
          .map(o => ({ key: `official:${o.id}`, type: "official", id: o.id, name: o.full_name, label: `🎽 ${o.full_name}` })),
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
            <input type="text" class="mp-tag-search" id="mp-lib-search" placeholder="Search by slug, player, or official…">
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

  // ---------- Finalize a pending upload (called at actual post-publish time, unchanged) ----------
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