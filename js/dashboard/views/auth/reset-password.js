// js/dashboard/views/auth/reset-password.js
import { router } from '../../../router.js';
import { dashPath } from '../../config.js';
import { viewContainer } from '../../view-container.js';
import { sidebar } from '../../components/sidebar.js';
import { injectStyle } from '../../utils/inject-style.js';
import { supabaseClient } from '../../supabase-client-esm.js';

injectStyle('auth-card', `
  .auth-card { background: #fff; padding: 2rem; border-radius: 10px; box-shadow: 0 2px 12px rgba(9, 116, 36, 0.08); width: 320px; }
  .auth-card h1 { font-size: 1.25rem; margin: 0 0 1.5rem; }
  .auth-card p.auth-hint { font-size: 0.85rem; color: #555; margin: -1rem 0 1.2rem; }
  .auth-card input { width: 100%; padding: 0.6rem; margin-bottom: 0.9rem; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
  .auth-card label { display: block; font-size: 0.8rem; color: #555; margin-bottom: 0.3rem; font-weight: 600; }
  .auth-card button { width: 100%; padding: 0.65rem; background: #109b45; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
  .auth-card button:disabled { opacity: 0.6; cursor: not-allowed; }
  .auth-card .msg { font-size: 0.85rem; margin-bottom: 0.9rem; min-height: 1em; }
  .auth-card .msg.error { color: #c0392b; }
  .auth-card .msg.success { color: #1e8449; }
  .auth-card .avatar-field-wrap { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.1rem; }
  .auth-card .avatar-preview { width: 56px; height: 56px; border-radius: 50%; background: #eef4ef; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .auth-card .avatar-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .auth-card .avatar-preview svg { width: 26px; height: 26px; color: #109b45; }
  .auth-card input[type="file"] { border: none; padding: 0; font-size: 0.78rem; }
`);

function personIconMarkup() {
  return `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/></svg>`;
}

export async function resetPasswordView() {
  // supabase-js automatically reads the recovery token from the URL
  // and establishes a temporary session for this action. Supabase
  // tags an invite link (vs a plain password-reset link) with
  // type=invite in the redirect hash — read it here, before
  // supabase-js's detectSessionInUrl has a chance to strip the hash
  // via history.replaceState.
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const isInvite = hashParams.get('type') === 'invite';

  sidebar.unmount();
  document.body.classList.add('auth-mode');

  viewContainer.render(`
    <div class="auth-card">
      <h1>${isInvite ? 'Welcome — Set Up Your Account' : 'Set New Password'}</h1>
      <div class="msg" id="msg"></div>
      <form id="pwForm">
        ${isInvite ? `
          <label for="fullName">Full Name</label>
          <input type="text" id="fullName" placeholder="Your full name" required>

          <label for="avatarInput">Profile Photo (optional)</label>
          <div class="avatar-field-wrap">
            <div class="avatar-preview" id="avatarPreview">${personIconMarkup()}</div>
            <input type="file" id="avatarInput" accept="image/*">
          </div>
        ` : ''}

        <input type="password" id="password" placeholder="New password" minlength="6" required>
        <input type="password" id="confirm" placeholder="Confirm password" minlength="6" required>
        <button type="submit" id="submitBtn">${isInvite ? 'Set Up Account' : 'Update Password'}</button>
      </form>
    </div>
  `);

  const form = document.getElementById('pwForm');
  const msg = document.getElementById('msg');
  const submitBtn = document.getElementById('submitBtn');
  let redirectTimer = null;

  if (isInvite) {
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files?.[0];
      if (!file) return;
      avatarPreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'msg';

    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    if (password !== confirm) {
      msg.textContent = 'Passwords do not match.';
      msg.classList.add('error');
      return;
    }

    const fullName = isInvite ? document.getElementById('fullName').value.trim() : '';
    if (isInvite && !fullName) {
      msg.textContent = 'Please enter your full name.';
      msg.classList.add('error');
      return;
    }

    submitBtn.disabled = true;

    const { error: pwError } = await supabaseClient.auth.updateUser({ password });
    if (pwError) {
      submitBtn.disabled = false;
      msg.textContent = 'Could not update password. The link may have expired.';
      msg.classList.add('error');
      return;
    }

    if (isInvite) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const userId = session.user.id;

        let avatarUrl = null;
        const avatarFile = document.getElementById('avatarInput').files?.[0];
        if (avatarFile) {
          const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${userId}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(path, avatarFile, { cacheControl: '3600', contentType: avatarFile.type });
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
          avatarUrl = publicUrlData.publicUrl;
        }

        const { error: profileError } = await supabaseClient
          .from('admin_profiles')
          .upsert(
            { admin_id: userId, full_name: fullName, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) },
            { onConflict: 'admin_id' },
          );
        if (profileError) throw profileError;
      } catch (err) {
        console.error('[reset-password] profile setup failed:', err);
        submitBtn.disabled = false;
        msg.textContent = 'Password was set, but saving your profile failed. You can finish it from your profile page after logging in.';
        msg.classList.add('error');
        await supabaseClient.auth.signOut();
        redirectTimer = setTimeout(() => router.navigate(dashPath('/login'), { replace: true }), 2500);
        return;
      }
    }

    submitBtn.disabled = false;
    msg.textContent = isInvite ? 'Account set up. Redirecting to login...' : 'Password updated. Redirecting to login...';
    msg.classList.add('success');
    await supabaseClient.auth.signOut();
    redirectTimer = setTimeout(() => router.navigate(dashPath('/login'), { replace: true }), 1500);
  });

  return {
    cleanup: () => {
      document.body.classList.remove('auth-mode');
      if (redirectTimer) clearTimeout(redirectTimer);
    },
  };
}