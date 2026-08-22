import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { showToast } from '../components/controls.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('contact-view', `
  .contact-view { display: grid; grid-template-columns: 1fr; gap: var(--sp-lg); padding-block: var(--sp-lg) var(--sp-2xl); }
  @media (min-width: 1200px) { .contact-view { grid-template-columns: 1fr 1fr; } }
  .contact-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-sm); }
  .contact-form { display: flex; flex-direction: column; gap: var(--sp-sm); }
  .contact-form input, .contact-form textarea { width: 100%; padding: var(--sp-xs) var(--sp-sm); border: 1px solid var(--color-line); border-radius: var(--radius-sm); font-family: var(--font-body); font-size: var(--fs-md); }
  .contact-form textarea { min-height: 120px; resize: vertical; }
  .contact-form label { font-size: var(--fs-sm); font-weight: 600; margin-bottom: var(--sp-3xs); display: block; }
`);

export async function contactView() {
  await viewContainer.render(`
    <div class="container">
      <div class="contact-view">
        <div>
          <h1 class="contact-title">Contact</h1>
          <div data-slot="details"><div class="skel skel-block" style="height:150px;"></div></div>
        </div>
        <div>
          <h2 class="contact-title" style="font-size: var(--fs-xl);">Send a Message</h2>
          <form class="contact-form" data-contact-form>
            <div><label for="contact-name">Name</label><input type="text" id="contact-name" name="name" required></div>
            <div><label for="contact-email">Email</label><input type="email" id="contact-email" name="email" required></div>
            <div><label for="contact-message">Message</label><textarea id="contact-message" name="message" required></textarea></div>
            <button type="submit" class="btn btn--primary">Send Message</button>
          </form>
        </div>
      </div>
    </div>`);

  const root = document.querySelector('#app');
  await loadDetails(root);
  bindForm(root);
  return { cleanup: null };
}

async function loadDetails(root) {
  const slot = root.querySelector('[data-slot="details"]');
  try {
    const [{ data: contacts, error: cErr }, { data: social, error: sErr }] = await Promise.all([
      supabase.from('club_contacts').select('type, value'),
      supabase.from('club_social_links').select('platform, url'),
    ]);
    if (cErr) throw cErr;
    if (sErr) throw sErr;
    slot.innerHTML = `
      ${contacts?.length ? `<div class="club-contact">${contacts.map(c => `<div class="club-contact__item"><span class="club-contact__label">${c.type}</span><span>${c.value}</span></div>`).join('')}</div>` : states.empty({ message: 'Contact details coming soon.' })}
      ${social?.length ? `<div class="social-links" style="margin-top: var(--sp-md);">${social.map(s => `<a href="${s.url}" class="social-links__link" data-external target="_blank" rel="noopener noreferrer">${s.platform}</a>`).join('')}</div>` : ''}`;
  } catch (err) {
    console.error('[contact] details failed:', err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, () => loadDetails(root));
  }
}

function bindForm(root) {
  const form = root.querySelector('[data-contact-form]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try {
      const formData = new FormData(form);
      const { error } = await supabase.from('contact_messages').insert({ name: formData.get('name'), email: formData.get('email'), message: formData.get('message') });
      if (error) throw error;
      showToast('Message sent — thank you!');
      form.reset();
    } catch (err) {
      console.error('[contact] submit failed:', err);
      showToast('Could not send message. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
}
