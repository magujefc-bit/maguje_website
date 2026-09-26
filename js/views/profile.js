import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { showToast } from '../components/controls.js';
import { injectStyle } from '../utils/inject-style.js';
import { router } from '../router.js';
import { openAuthModal } from '../components/auth-modal.js';
import { resolveAccountType, changePassword } from '../auth.js';
import { header } from '../components/header.js';

injectStyle('profile-view', `
  .profile-view { max-width: 420px; margin: 0 auto; padding-block: var(--sp-lg) var(--sp-2xl); text-align: center; }
  .profile-greeting { font-size: var(--fs-xl); margin-bottom: var(--sp-lg); }
  .profile-avatar-wrap { position: relative; width: 96px; height: 96px; margin: 0 auto var(--sp-lg); }
  .profile-avatar-circle {
    width: 96px; height: 96px; border-radius: 50%; overflow: hidden;
    background: var(--color-line); display: flex; align-items: center; justify-content: center;
  }
  .profile-avatar-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .profile-avatar-circle svg { width: 44px; height: 44px; color: var(--color-ridge-green); }
  .profile-avatar-edit-btn {
    position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; border-radius: 50%;
    background: var(--color-ridge-green); color: var(--color-summit-white);
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--color-summit-white); padding: 0;
  }
  .profile-avatar-edit-btn svg { width: 16px; height: 16px; }
  .profile-form { display: flex; flex-direction: column; gap: var(--sp-sm); text-align: left; }
  .profile-form label { font-size: var(--fs-sm); font-weight: 600; margin-bottom: var(--sp-3xs); display: block; }
  .profile-form input { width: 100%; box-sizing: border-box; padding: var(--sp-xs) var(--sp-sm); border: 1px solid var(--color-line); border-radius: var(--radius-sm); font-family: var(--font-body); font-size: var(--fs-md); }
  .profile-form input:disabled { background: var(--color-line); color: rgba(16,36,26,0.6); }
  .profile-section { margin-top: var(--sp-xl); padding-top: var(--sp-lg); border-top: 1px solid var(--color-line); text-align: left; }
  .profile-section h2 { font-size: var(--fs-lg); margin-bottom: var(--sp-sm); }

  .pw-backdrop {
    position: fixed; inset: 0; z-index: var(--z-modal);
    background: rgba(11,31,20,0.72);
    display: flex; align-items: center; justify-content: center; padding: var(--sp-md);
    opacity: 0; transition: opacity var(--dur-base) var(--ease-standard);
  }
  .pw-backdrop--open { opacity: 1; }
  .pw-card {
    background: var(--color-summit-white); color: var(--color-ink);
    width: 100%; max-width: 340px; padding: var(--sp-lg) var(--sp-md);
    border-radius: var(--radius-lg); position: relative; text-align: left;
  }
  .pw-card h2 { font-size: var(--fs-lg); margin: 0 0 var(--sp-md); }
  .pw-card input { width: 100%; box-sizing: border-box; padding: var(--sp-2xs) var(--sp-xs); margin-bottom: var(--sp-xs); border: 1px solid var(--color-line); border-radius: var(--radius-sm); font-size: var(--fs-base); }
  .pw-card button[type="submit"] { width: 100%; padding: var(--sp-2xs); margin-top: var(--sp-2xs); background: var(--color-ridge-green); color: var(--color-summit-white); border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; }
  .pw-card button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
  .pw-close { position: absolute; top: var(--sp-sm); right: var(--sp-sm); width: 32px; height: 32px; border-radius: 50%; background: none; border: none; font-size: var(--fs-lg); }
  .pw-close:hover { background: var(--color-line); }
  .pw-msg { font-size: var(--fs-sm); margin-bottom: var(--sp-xs); min-height: 1.2em; }
  .pw-msg--error { color: var(--color-error); }
  .pw-msg--success { color: var(--color-success); }
`);

export async function profileView() {
  // Guard: /profile with no session bounces home and opens login.
  const accountType = await resolveAccountType();
  if (!accountType) {
    router.navigate('/', { replace: true });
    openAuthModal('login');
    return { cleanup: null };
  }

  await viewContainer.render(`
    <div class="container">
      <div class="profile-view" data-slot="body">
        <div class="skel skel-block" style="height:360px;"></div>
      </div>
    </div>`);

  const root = document.querySelector('#app');
  await loadProfile(root, accountType);
  return { cleanup: null };
}

async function loadProfile(root, accountType) {
  const slot = root.querySelector('[data-slot="body"]');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.navigate('/', { replace: true });
      openAuthModal('login');
      return;
    }

    const table = accountType === 'admin' ? 'admin_profiles' : 'supporters';
    const idColumn = accountType === 'admin' ? 'admin_id' : 'id';

    const { data: profile, error } = await supabase
      .from(table)
      .select('*')
      .eq(idColumn, session.user.id)
      .maybeSingle();

    if (error) throw error;

    renderBody(slot, {
      accountType,
      email: session.user.email,
      profile: profile || {},
      idColumn,
      table,
      userId: session.user.id,
    });
  } catch (err) {
    console.error('[profile] load failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, () => loadProfile(root, accountType));
  }
}

function avatarMarkup(avatarUrl) {
  if (avatarUrl) return `<img src="${avatarUrl}" alt="">`;
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="currentColor"/>
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="currentColor"/>
    </svg>
  `;
}

function editIconMarkup(hasAvatar) {
  return hasAvatar
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;
}

function renderBody(slot, ctx) {
  const { accountType, email, profile } = ctx;
  const roleLabel = accountType === 'admin' ? 'admin' : 'supporter';
  const displayName = (profile.full_name || '').trim() || email.split('@')[0];

  slot.innerHTML = `
    <p class="profile-greeting">${displayName}, welcome to your ${roleLabel} account</p>

    <div class="profile-avatar-wrap">
      <div class="profile-avatar-circle" data-avatar-circle>${avatarMarkup(profile.avatar_url)}</div>
      <button type="button" class="profile-avatar-edit-btn" data-avatar-edit-btn aria-label="${profile.avatar_url ? 'Change photo' : 'Add photo'}">
        ${editIconMarkup(!!profile.avatar_url)}
      </button>
      <input type="file" accept="image/*" data-avatar-input hidden>
    </div>

    <form class="profile-form" data-profile-form>
      <div>
        <label for="profile-email">Email</label>
        <input type="email" id="profile-email" value="${email}" disabled>
      </div>
      <div>
        <label for="profile-name">Full Name</label>
        <input type="text" id="profile-name" name="full_name" value="${profile.full_name || ''}">
      </div>
      <div>
        <label for="profile-phone">Phone</label>
        <input type="text" id="profile-phone" name="phone" value="${profile.phone || ''}">
      </div>
      <button type="submit" class="btn btn--primary">Save Changes</button>
    </form>

    <div class="profile-section">
      <h2>Account Management</h2>
      <button type="button" class="btn btn--secondary" data-open-password-modal>Manage Password</button>
    </div>
  `;

  bindAvatarUpload(slot, ctx);
  bindProfileForm(slot, ctx);
  slot.querySelector('[data-open-password-modal]').addEventListener('click', openPasswordModal);
}

function bindAvatarUpload(slot, { accountType, table, idColumn, userId }) {
  const editBtn = slot.querySelector('[data-avatar-edit-btn]');
  const fileInput = slot.querySelector('[data-avatar-input]');
  const circle = slot.querySelector('[data-avatar-circle]');

  editBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    editBtn.disabled = true;
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = publicUrlData.publicUrl;

      const { error: saveError } = await supabase
        .from(table)
        .upsert({ [idColumn]: userId, avatar_url: avatarUrl }, { onConflict: idColumn });
      if (saveError) throw saveError;

      circle.innerHTML = avatarMarkup(avatarUrl);
      editBtn.innerHTML = editIconMarkup(true);
      editBtn.setAttribute('aria-label', 'Change photo');
      showToast('Photo updated');
      header.refreshAccount();
    } catch (err) {
      console.error('[profile] avatar upload failed:', err);
      showToast('Could not upload photo. Please try again.');
    } finally {
      editBtn.disabled = false;
      fileInput.value = '';
    }
  });
}

function bindProfileForm(slot, { accountType, table, idColumn, userId }) {
  const form = slot.querySelector('[data-profile-form]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const formData = new FormData(form);
    const payload = {
      [idColumn]: userId,
      full_name: formData.get('full_name'),
      phone: formData.get('phone'),
    };

    try {
      const { error } = await supabase.from(table).upsert(payload, { onConflict: idColumn });
      if (error) throw error;
      showToast('Profile updated');
      header.refreshAccount();
    } catch (err) {
      console.error('[profile] save failed:', err);
      showToast('Could not save changes. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
}

let pwModalRoot = null;
function ensurePwRoot() {
  if (pwModalRoot) return pwModalRoot;
  pwModalRoot = document.createElement('div');
  document.body.appendChild(pwModalRoot);
  return pwModalRoot;
}

function closePasswordModal() {
  const backdrop = pwModalRoot?.querySelector('[data-pw-backdrop]');
  backdrop?.classList.remove('pw-backdrop--open');
  document.removeEventListener('keydown', pwKeyHandler);
  setTimeout(() => { if (pwModalRoot) pwModalRoot.innerHTML = ''; }, 250);
  document.body.style.overflow = '';
}

function pwKeyHandler(e) {
  if (e.key === 'Escape') closePasswordModal();
}

function openPasswordModal() {
  const root = ensurePwRoot();
  root.innerHTML = `
    <div class="pw-backdrop" data-pw-backdrop>
      <div class="pw-card">
        <button type="button" class="pw-close" data-pw-close aria-label="Close">×</button>
        <h2>Manage Password</h2>
        <div class="pw-msg" data-pw-msg></div>
        <form data-pw-form>
          <input type="password" name="current" placeholder="Current password" required>
          <input type="password" name="next" placeholder="New password" minlength="6" required>
          <input type="password" name="confirm" placeholder="Confirm new password" minlength="6" required>
          <button type="submit">Update Password</button>
        </form>
      </div>
    </div>
  `;

  const backdrop = root.querySelector('[data-pw-backdrop]');
  requestAnimationFrame(() => backdrop.classList.add('pw-backdrop--open'));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closePasswordModal(); });
  root.querySelector('[data-pw-close]').addEventListener('click', closePasswordModal);
  document.addEventListener('keydown', pwKeyHandler);
  document.body.style.overflow = 'hidden';

  const form = root.querySelector('[data-pw-form]');
  const msg = root.querySelector('[data-pw-msg]');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'pw-msg';

    const data = new FormData(form);
    const current = data.get('current');
    const next = data.get('next');
    const confirm = data.get('confirm');

    if (next !== confirm) {
      msg.textContent = 'New passwords do not match.';
      msg.classList.add('pw-msg--error');
      return;
    }

    submitBtn.disabled = true;
    const { error } = await changePassword(current, next);
    submitBtn.disabled = false;

    if (error) {
      msg.textContent = error.message || 'Could not update password.';
      msg.classList.add('pw-msg--error');
      return;
    }

    msg.textContent = 'Password updated.';
    msg.classList.add('pw-msg--success');
    form.reset();
    setTimeout(closePasswordModal, 1200);
  });
}