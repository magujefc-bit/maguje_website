// js/views/contact.js
import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { showToast } from '../components/controls.js';
import { injectStyle } from '../utils/inject-style.js';
import { router } from '../router.js';
import { openAuthModal } from '../components/auth-modal.js';
import { getProfileSnapshot } from '../auth.js';

injectStyle('contact-view', `
  .contact-view { max-width: 560px; margin: 0 auto; padding-block: var(--sp-lg) var(--sp-2xl); }
  .contact-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-2xs); }
  .contact-sender-note { font-size: var(--fs-sm); color: rgba(16,36,26,0.65); margin-bottom: var(--sp-lg); }
  .contact-sender-note strong { color: var(--color-ink); }
  .contact-form { display: flex; flex-direction: column; gap: var(--sp-sm); }
  .contact-form textarea { width: 100%; min-height: 140px; resize: vertical; padding: var(--sp-xs) var(--sp-sm); border: 1px solid var(--color-line); border-radius: var(--radius-sm); font-family: var(--font-body); font-size: var(--fs-md); }
  .contact-form label { font-size: var(--fs-sm); font-weight: 600; margin-bottom: var(--sp-3xs); display: block; }
  .contact-find-us { margin-top: var(--sp-2xl); padding-top: var(--sp-lg); border-top: 1px solid var(--color-line); }
  .contact-find-us h2 { font-size: var(--fs-lg); margin-bottom: var(--sp-sm); }
  .contact-find-us__group + .contact-find-us__group { margin-top: var(--sp-md); }
`);

export async function contactView() {
  // Guard: /contact with no session bounces home and opens login.
  const snapshot = await getProfileSnapshot();
  if (!snapshot.accountType) {
    router.navigate('/', { replace: true });
    openAuthModal('login');
    return { cleanup: null };
  }

  const displayName = (snapshot.fullName || '').trim() || snapshot.email.split('@')[0];

  await viewContainer.render(`
    <div class="container">
      <div class="contact-view">
        <h1 class="contact-title">Share with us</h1>
        <p class="contact-sender-note">Sending as <strong>${displayName}</strong></p>

        <form class="contact-form" data-contact-form>
          <div>
            <label for="contact-message">Message</label>
            <textarea id="contact-message" name="message" required></textarea>
          </div>
          <button type="submit" class="btn btn--primary">Send Message</button>
        </form>

        <div class="contact-find-us">
          <h2>You can also find us in</h2>
          <div data-slot="find-us"><div class="skel skel-block" style="height:60px;"></div></div>
        </div>
      </div>
    </div>`);

  const root = document.querySelector('#app');
  await loadFindUs(root);
  bindForm(root, { name: displayName, email: snapshot.email });
  return { cleanup: null };
}

async function loadFindUs(root) {
  const slot = root.querySelector('[data-slot="find-us"]');
  try {
    const [{ data: contacts, error: cErr }, { data: social, error: sErr }] = await Promise.all([
      supabase.from('club_contacts').select('type, value'),
      supabase.from('club_social_links').select('platform, url'),
    ]);
    if (cErr) throw cErr;
    if (sErr) throw sErr;

    const contactsHtml = contacts?.length
      ? `<div class="contact-find-us__group club-contact">${contacts.map(c => `
          <div class="club-contact__item">
            <span class="club-contact__label">${c.type}</span>
            ${c.type === 'email'
              ? `<a href="mailto:${c.value}" data-external>${c.value}</a>`
              : c.type === 'phone'
                ? `<a href="tel:${c.value}" data-external>${c.value}</a>`
                : `<span>${c.value}</span>`}
          </div>`).join('')}</div>`
      : '';

    const socialHtml = social?.length
      ? `<div class="contact-find-us__group social-links">${social.map(s => `<a href="${s.url}" class="social-links__link" data-external target="_blank" rel="noopener noreferrer">${s.platform}</a>`).join('')}</div>`
      : '';

    slot.innerHTML = (contactsHtml || socialHtml)
      ? contactsHtml + socialHtml
      : states.empty({ message: 'Contact details coming soon.' });
  } catch (err) {
    console.error('[contact] find-us failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, () => loadFindUs(root));
  }
}

function bindForm(root, sender) {
  const form = root.querySelector('[data-contact-form]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.navigate('/', { replace: true });
        openAuthModal('login');
        return;
      }

      const message = form.querySelector('#contact-message').value;
      const { error } = await supabase.from('contact_messages').insert({
        name: sender.name,
        email: sender.email,
        message,
        submitted_by: session.user.id,
      });
      if (error) throw error;
      showToast('Message sent — thank you!');
      form.querySelector('#contact-message').value = '';
    } catch (err) {
      console.error('[contact] submit failed:', err);
      showToast('Could not send message. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
}