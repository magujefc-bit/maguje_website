import { viewContainer } from '../view-container.js';

export async function privacyView() {
  await viewContainer.render(`
    <div class="container section--tight" style="max-width: 780px;">
      <h1 class="text-display-xl" style="margin-bottom: var(--sp-md);">
        Privacy Policy
      </h1>

      <div class="article-content">
        <p><strong>Effective date:</strong> 1 Sep 2026</p>

        <p>
          Maguje FC ("we," "us," "the club") operates this website and its
          associated admin dashboard. This policy explains what information
          the site collects, how it's used, and your choices.
        </p>

        <h2>Information We Collect</h2>

        <h3>From general visitors</h3>

        <p>
          No account or personal registration is required to browse the
          public site.
        </p>

        <p>
          <strong>App install events:</strong> if you install this site as an
          app to your home screen (PWA), we log that an install happened,
          along with a randomly generated identifier stored in your browser —
          not your name, email, or any personal detail. This is used only to
          get a rough count of how many times the app has been installed.
        </p>

        <p>
          <strong>Bug/issue reports:</strong> if you use the
          "Report an Issue" form, we collect the description and any
          screenshot you choose to upload. You are not required to provide
          your name or contact details unless you include them voluntarily
          in your message.
        </p>

        <p>
          <strong>Local browser storage:</strong> we use your browser's local
          storage (not tracking cookies) to remember small preferences —
          such as whether you've dismissed the install prompt, or your
          device/theme display preference. This data stays on your device
          and is not sent to advertisers.
        </p>

        <p>
          <strong>Search:</strong> searches you perform on the site are
          processed to return results and are not stored or linked to you
          afterward.
        </p>

        <h3>From club administrators (dashboard users)</h3>

        <p>
          Admin accounts are created by invitation only. We store your email
          address, assigned role, and account status.
        </p>

        <p>
          We keep a record of login sessions (timestamps) for security and
          audit purposes. This is visible only to authorized administrators.
        </p>

        <h3>Club content data</h3>

        <p>
          Player, official, and team information (names, photos, positions,
          statistics) is managed by club administrators for the purpose of
          publishing official club content. If you are a player, official,
          or guardian and would like information corrected or removed, please
          contact us using the details on our Contact page.
        </p>

        <h2>What We Don't Do</h2>

        <p>
          We do not sell or share any data with advertisers.
        </p>

        <p>
          We do not run third-party advertising or tracking scripts.
        </p>

        <p>
          We do not use cookies for cross-site tracking.
        </p>

        <h2>Third-Party Services</h2>

        <p>
          This site relies on the following infrastructure providers to
          operate, each of whom processes data on our behalf under their own
          security practices:
        </p>

        <ul>
          <li>
            <strong>Supabase</strong> — database, authentication, file
            storage, and real-time updates.
          </li>
          <li>
            <strong>Cloudflare / Netlify</strong> — website hosting and
            content delivery.
          </li>
        </ul>

        <h2>Data Retention</h2>

        <p>
          Bug reports are retained for as long as needed to review and
          resolve the issue.
        </p>

        <p>
          Admin login records are retained as part of normal account security
          practices.
        </p>

        <p>
          App install counts are retained indefinitely as an aggregate
          figure and are not tied to any identifiable person.
        </p>

        <h2>Your Rights</h2>

        <p>
          You may request information about any data we hold that identifies
          you (for example, as a club administrator, player, or official),
          and request correction or removal, by contacting us via the details
          on our Contact page.
        </p>

        <h2>Children's Privacy</h2>

        <p>
          This site is not directed at children, and we do not knowingly
          collect personal information from children. Player records for
          youth-team members, where applicable, are managed directly by the
          club with appropriate parental/guardian involvement, not submitted
          directly by minors through this site.
        </p>

        <h2>Changes to This Policy</h2>

        <p>
          We may update this policy from time to time. The "Effective date"
          above will reflect the most recent revision.
        </p>

        <h2>Contact</h2>

        <p>
          Questions about this policy can be directed to Maguje FC via the
          contact details listed on our Contact page.
        </p>
      </div>
    </div>
  `);

  return { cleanup: null };
}