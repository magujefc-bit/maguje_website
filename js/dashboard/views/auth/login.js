import { router } from '../../../router.js';
import { dashPath } from '../../config.js';
import { viewContainer } from '../../view-container.js';
import { sidebar } from '../../components/sidebar.js';
import { injectStyle } from '../../utils/inject-style.js';
import { supabaseClient, getCurrentAdmin } from '../../supabase-client-esm.js';

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
  .auth-card .auth-back-link { margin-top: 1.2rem; text-align: center; }
  .auth-card .auth-back-link a {
    display: inline-block; font-size: 0.82rem; color: #109b45; text-decoration: none;
    font-weight: 600; padding: 0.4rem 0.9rem; border: 1px solid #109b4540; border-radius: 20px;
  }
  .auth-card .auth-back-link a:hover { background: #eaf6ee; }
`);

export async function loginView() {
  // Faithful port of login.html — no session pre-check existed in the
  // original, so none is added here.
  sidebar.unmount();
  document.body.classList.add('auth-mode');

  viewContainer.render(`
    <div class="auth-card">
      <h1>Club Admin Login</h1>
      <div class="msg error" id="errorMsg"></div>
      <form id="loginForm">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit" id="submitBtn">Log In</button>
      </form>
      <div class="auth-links"><a href="${dashPath('/forgot-password')}">Forgot password?</a></div>
      <div class="auth-back-link"><a href="/">← Back to Maguje FC site</a></div>
    </div>
  `);

  const form = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (signInError) {
      errorMsg.textContent = 'Invalid email or password.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
      return;
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      errorMsg.textContent = 'This account is not an active admin.';
      await supabaseClient.auth.signOut();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
      return;
    }

    // After successful sign-in, record the session start
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      await supabaseClient.from('login_sessions').insert({
        admin_id: user.id,
        email: user.email,
        login_at: new Date().toISOString(),
      });
    }

    router.navigate(dashPath('/'), { replace: true });
  });

  return { cleanup: () => document.body.classList.remove('auth-mode') };
}