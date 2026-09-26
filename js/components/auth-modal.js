// src/components/auth-modal.js
import { injectStyle } from '../utils/inject-style.js';
import { login, signupSupporter, requestPasswordReset } from '../auth.js';

injectStyle('auth-modal', `
  .auth-backdrop {
    position: fixed; inset: 0; z-index: var(--z-modal);
    background: rgba(11,31,20,0.72);
    display: flex; align-items: center; justify-content: center;
    padding: var(--sp-md);
    opacity: 0; transition: opacity var(--dur-base) var(--ease-standard);
  }
  .auth-backdrop--open { opacity: 1; }
  .auth-card {
    background: var(--color-summit-white); color: var(--color-ink);
    width: 100%; max-width: 360px;
    padding: var(--sp-lg) var(--sp-md);
    border-radius: var(--radius-lg);
    position: relative;
  }
  .auth-card .auth-close {
    all: unset;
    position: absolute; top: var(--sp-sm); right: var(--sp-sm);
    width: 32px; height: 32px;
    box-sizing: border-box;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    line-height: 1;
    font-size: var(--fs-lg); color: var(--color-ink);
    background: transparent;
    cursor: pointer;
    z-index: 2;
  }
  .auth-card .auth-close:hover { background: var(--color-line); }
  .auth-card h2 { font-size: var(--fs-lg); margin: 0 40px var(--sp-xs) 0; }
  .auth-card p.auth-hint { font-size: var(--fs-sm); color: rgba(16,36,26,0.7); margin: 0 0 var(--sp-md); }
  .auth-card input {
    width: 100%; padding: var(--sp-2xs) var(--sp-xs); margin-bottom: var(--sp-xs);
    border: 1px solid var(--color-line); border-radius: var(--radius-sm);
    font-size: var(--fs-base); box-sizing: border-box;
  }
  .auth-card button[type="submit"] {
    width: 100%; padding: var(--sp-2xs); margin-top: var(--sp-2xs);
    background: var(--color-ridge-green); color: var(--color-summit-white);
    border: none; border-radius: var(--radius-sm); font-weight: 600;
    font-size: var(--fs-base); cursor: pointer;
  }
  .auth-card button[type="submit"]:hover { background: var(--color-ridge-green-light); }
  .auth-card button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
  .auth-msg { font-size: var(--fs-sm); margin-bottom: var(--sp-xs); min-height: 1.2em; }
  .auth-msg--error { color: var(--color-error); }
  .auth-msg--success { color: var(--color-success); }
  .auth-links { margin-top: var(--sp-sm); text-align: center; font-size: var(--fs-sm); }
  .auth-links a, .auth-links button.link {
    color: var(--color-ridge-green); background: none; border: none; font: inherit;
    cursor: pointer; text-decoration: underline; padding: 0;
  }
`);

let modalRoot = null;
function ensureRoot() {
  if (modalRoot) return modalRoot;
  modalRoot = document.createElement('div');
  document.body.appendChild(modalRoot);
  return modalRoot;
}

function keyHandler(e) {
  if (e.key === 'Escape') close();
}

function close() {
  const backdrop = modalRoot?.querySelector('[data-auth-backdrop]');
  backdrop?.classList.remove('auth-backdrop--open');
  document.removeEventListener('keydown', keyHandler);
  setTimeout(() => { if (modalRoot) modalRoot.innerHTML = ''; }, 250);
  document.body.style.overflow = '';
}

function loginTemplate() {
  return `
    <h2>Log In</h2>
    <div class="auth-msg" data-auth-msg></div>
    <form data-auth-form="login">
      <input type="email" name="email" placeholder="Email" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Log In</button>
    </form>
    <div class="auth-links">
      <button type="button" class="link" data-auth-switch="forgot">Forgot password?</button>
    </div>
    <div class="auth-links">
      New here? <button type="button" class="link" data-auth-switch="signup">Sign up</button>
    </div>
  `;
}

function signupTemplate() {
  return `
    <h2>Join as a Supporter</h2>
    <div class="auth-msg" data-auth-msg></div>
    <form data-auth-form="signup">
      <input type="text" name="fullName" placeholder="Full name (optional)">
      <input type="email" name="email" placeholder="Email" required>
      <input type="password" name="password" placeholder="Password" minlength="6" required>
      <button type="submit">Sign Up</button>
    </form>
    <div class="auth-links">
      Already have an account? <button type="button" class="link" data-auth-switch="login">Log in</button>
    </div>
  `;
}

function forgotTemplate() {
  return `
    <h2>Reset Password</h2>
    <p class="auth-hint">Enter your email and we'll send you a reset link.</p>
    <div class="auth-msg" data-auth-msg></div>
    <form data-auth-form="forgot">
      <input type="email" name="email" placeholder="Email" required>
      <button type="submit">Send Reset Link</button>
    </form>
    <div class="auth-links">
      <button type="button" class="link" data-auth-switch="login">Back to login</button>
    </div>
  `;
}

function render(mode) {
  const root = ensureRoot();
  const templates = { login: loginTemplate, signup: signupTemplate, forgot: forgotTemplate };

  root.innerHTML = `
    <div class="auth-backdrop" data-auth-backdrop>
      <div class="auth-card">
        <button type="button" class="auth-close" data-auth-close aria-label="Close">×</button>
        ${templates[mode]()}
      </div>
    </div>
  `;

  const backdrop = root.querySelector('[data-auth-backdrop]');
  requestAnimationFrame(() => backdrop.classList.add('auth-backdrop--open'));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  root.querySelector('[data-auth-close]').addEventListener('click', close);

  root.querySelectorAll('[data-auth-switch]').forEach((btn) =>
    btn.addEventListener('click', () => render(btn.dataset.authSwitch)),
  );

  const form = root.querySelector('[data-auth-form]');
  const msg = root.querySelector('[data-auth-msg]');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'auth-msg';
    submitBtn.disabled = true;

    const data = new FormData(form);
    const kind = form.dataset.authForm;

    if (kind === 'login') {
      const { error } = await login(data.get('email').trim(), data.get('password'));
      submitBtn.disabled = false;
      if (error) {
        msg.textContent = 'Invalid email or password.';
        msg.classList.add('auth-msg--error');
        return;
      }
      close();
      return;
    }

    if (kind === 'signup') {
      const { error } = await signupSupporter(
        data.get('email').trim(),
        data.get('password'),
        data.get('fullName').trim(),
      );
      submitBtn.disabled = false;
      if (error) {
        msg.textContent = error.message?.includes('registered')
          ? 'That email is already in use.'
          : 'Could not create account. Please try again.';
        msg.classList.add('auth-msg--error');
        return;
      }
      close();
      return;
    }

    if (kind === 'forgot') {
      const { error } = await requestPasswordReset(data.get('email').trim());
      submitBtn.disabled = false;
      if (error) {
        msg.textContent = 'Something went wrong. Try again.';
        msg.classList.add('auth-msg--error');
        return;
      }
      msg.textContent = 'If that email is registered, a reset link has been sent.';
      msg.classList.add('auth-msg--success');
      form.reset();
    }
  });
}

export function openAuthModal(mode = 'login') {
  document.addEventListener('keydown', keyHandler);
  document.body.style.overflow = 'hidden';
  render(mode);
}