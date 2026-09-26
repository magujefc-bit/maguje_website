// js/views/report-issue.js
import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { showToast } from '../components/controls.js';
import { injectStyle } from '../utils/inject-style.js';
import { router } from '../router.js';
import { openAuthModal } from '../components/auth-modal.js';
import { getProfileSnapshot } from '../auth.js';

injectStyle('report-issue-view', `
  .report-issue-view { max-width: 560px; margin: 0 auto; padding-block: var(--sp-lg) var(--sp-2xl); }
  .report-issue-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-2xs); }
  .report-issue-sender-note { font-size: var(--fs-sm); color: rgba(16,36,26,0.65); margin-bottom: var(--sp-lg); }
  .report-issue-sender-note strong { color: var(--color-ink); }
  .report-issue-form { display: flex; flex-direction: column; gap: var(--sp-sm); }
  .report-issue-form label { font-size: var(--fs-sm); font-weight: 600; margin-bottom: var(--sp-3xs); display: block; }
  .report-issue-form textarea { width: 100%; min-height: 140px; resize: vertical; padding: var(--sp-xs) var(--sp-sm); border: 1px solid var(--color-line); border-radius: var(--radius-sm); font-family: var(--font-body); font-size: var(--fs-md); }
  .report-issue-form input[type="file"] { width: 100%; font-size: var(--fs-sm); }
  .report-issue-hint { font-size: var(--fs-xs); color: rgba(16,36,26,0.55); margin-top: var(--sp-3xs); }
`);

export async function reportIssueView() {
  // Guard: /report-issue with no session bounces home and opens login.
  const snapshot = await getProfileSnapshot();
  if (!snapshot.accountType) {
    router.navigate('/', { replace: true });
    openAuthModal('login');
    return { cleanup: null };
  }

  const displayName = (snapshot.fullName || '').trim() || snapshot.email.split('@')[0];

  await viewContainer.render(`
    <div class="container">
      <div class="report-issue-view">
        <h1 class="report-issue-title">Report an Issue</h1>
        <p class="report-issue-sender-note">Reporting as <strong>${displayName}</strong></p>

        <form class="report-issue-form" data-report-form>
          <div>
            <label for="report-description">What happened?</label>
            <textarea id="report-description" name="description" required placeholder="e.g. The fixtures page shows the wrong date for Saturday's match"></textarea>
          </div>

          <div>
            <label for="report-screenshot">Screenshot (optional)</label>
            <input type="file" id="report-screenshot" name="screenshot" accept="image/png, image/jpeg, image/webp">
            <p class="report-issue-hint">A picture of what you're seeing makes it much easier for us to fix.</p>
          </div>

          <button type="submit" class="btn btn--primary">Send Report</button>
        </form>
      </div>
    </div>`);

  const root = document.querySelector('#app');
  bindForm(root, { name: displayName, email: snapshot.email });
  return { cleanup: null };
}

function bindForm(root, reporter) {
  const form = root.querySelector('[data-report-form]');

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

      const description = form.querySelector('#report-description').value.trim();
      const file = form.querySelector('#report-screenshot').files[0];

      if (!description) {
        showToast('Please describe what happened.');
        return;
      }

      let screenshotUrl = null;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `issue-screenshots/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('club-assets')
          .upload(path, file, { upsert: false, cacheControl: '3600' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('club-assets')
          .getPublicUrl(path);

        screenshotUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('issue_reports').insert({
        description,
        screenshot_url: screenshotUrl,
        page_url: document.referrer || null,
        submitted_by: session.user.id,
        reporter_name: reporter.name,
        reporter_email: reporter.email,
      });

      if (insertError) throw insertError;

      showToast('Thanks — your report has been sent!');
      form.querySelector('#report-description').value = '';
      form.querySelector('#report-screenshot').value = '';
    } catch (err) {
      console.error('[report-issue] submit failed:', err);
      showToast('Could not send your report. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Report';
    }
  });
}