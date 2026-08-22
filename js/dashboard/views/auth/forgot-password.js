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
  .auth-card .auth-links { margin-top: 1rem; text-align: center; font-size: 0.85rem; }
  .auth-card .auth-links a { color: #1a1a2e; }
`);

export async function forgotPasswordView() {
  sidebar.unmount();
  document.body.classList.add('auth-mode');

  viewContainer.render(`
    <div class="auth-card">
      <h1>Reset Password</h1>
      <p class="auth-hint">Enter your email and we'll send you a reset link.</p>
      <div class="msg" id="msg"></div>
      <form id="resetForm">
        <input type="email" id="email" placeholder="Email" required>
        <button type="submit" id="submitBtn">Send Reset Link</button>
      </form>
      <div class="auth-links"><a href="${dashPath('/login')}">Back to login</a></div>
    </div>
  `);

  const form = document.getElementById('resetForm');
  const msg = document.getElementById('msg');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'msg';
    submitBtn.disabled = true;

    const email = document.getElementById('email').value.trim();

    // redirectTo now points at the SPA's reset-password route directly
    // (was a filename swap on the old multi-page site).
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + dashPath('/reset-password'),
    });

    submitBtn.disabled = false;

    if (error) {
      msg.textContent = 'Something went wrong. Try again.';
      msg.classList.add('error');
      return;
    }

    msg.textContent = 'If that email is registered, a reset link has been sent.';
    msg.classList.add('success');
    form.reset();
  });

  return { cleanup: () => document.body.classList.remove('auth-mode') };
}
