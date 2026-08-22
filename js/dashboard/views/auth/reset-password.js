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
  .auth-card button { width: 100%; padding: 0.65rem; background: #109b45; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
  .auth-card button:disabled { opacity: 0.6; cursor: not-allowed; }
  .auth-card .msg { font-size: 0.85rem; margin-bottom: 0.9rem; min-height: 1em; }
  .auth-card .msg.error { color: #c0392b; }
  .auth-card .msg.success { color: #1e8449; }
`);

export async function resetPasswordView() {
  // supabase-js automatically reads the recovery token from the URL
  // and establishes a temporary session for this action.
  sidebar.unmount();
  document.body.classList.add('auth-mode');

  viewContainer.render(`
    <div class="auth-card">
      <h1>Set New Password</h1>
      <div class="msg" id="msg"></div>
      <form id="pwForm">
        <input type="password" id="password" placeholder="New password" minlength="6" required>
        <input type="password" id="confirm" placeholder="Confirm password" minlength="6" required>
        <button type="submit" id="submitBtn">Update Password</button>
      </form>
    </div>
  `);

  const form = document.getElementById('pwForm');
  const msg = document.getElementById('msg');
  const submitBtn = document.getElementById('submitBtn');
  let redirectTimer = null;

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

    submitBtn.disabled = true;
    const { error } = await supabaseClient.auth.updateUser({ password });
    submitBtn.disabled = false;

    if (error) {
      msg.textContent = 'Could not update password. The link may have expired.';
      msg.classList.add('error');
      return;
    }

    msg.textContent = 'Password updated. Redirecting to login...';
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
