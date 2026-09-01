import { viewContainer } from '../view-container.js';

export async function termsView() {
  await viewContainer.render(`
    <div class="container section--tight" style="max-width: 780px;">
      <h1 class="text-display-xl" style="margin-bottom: var(--sp-md);">
        Terms of Service
      </h1>

      <div class="article-content">
        <p><strong>Effective date:</strong> 1 Sep 2026</p>

        <p>
          By accessing or using this website (the "Site"), operated by
          Maguje FC, you agree to the following terms.
        </p>

        <h2>1. Use of the Site</h2>

        <p>
          The Site provides club news, fixtures, results, player and club
          information, and related content to the public. You agree to use
          the Site only for lawful purposes and not to:
        </p>

        <ul>
          <li>
            Attempt to disrupt, overload, or interfere with the Site's
            normal operation.
          </li>
          <li>
            Attempt to gain unauthorized access to the admin dashboard or
            any restricted area.
          </li>
          <li>
            Scrape, republish, or redistribute Site content at scale without
            permission.
          </li>
          <li>
            Submit false, abusive, or malicious content through the search,
            bug report, or any other input on the Site.
          </li>
        </ul>

        <h2>2. Admin Accounts</h2>

        <p>
          Access to the club's administrative dashboard is restricted to
          individuals invited by an existing club administrator. If you hold
          such an account:
        </p>

        <ul>
          <li>
            You are responsible for maintaining the confidentiality of your
            login credentials.
          </li>
          <li>
            You agree to use dashboard access only for legitimate
            club-administration purposes consistent with your assigned role.
          </li>
          <li>
            Maguje FC reserves the right to suspend or revoke dashboard
            access at any time, for any reason, including suspected misuse.
          </li>
        </ul>

        <h2>3. Content and Intellectual Property</h2>

        <p>
          The Maguje FC name, crest, and original content (news articles,
          match reports, photography, and graphics) published on this Site
          are the property of Maguje FC unless otherwise credited. You may
          share links to our content, but may not reproduce, redistribute, or
          claim ownership of it without permission.
        </p>

        <h2>4. Live Match Data</h2>

        <p>
          Live scores, match clocks, and event updates shown on the Site are
          provided on a best-effort basis and may be delayed, incomplete, or
          occasionally inaccurate due to the nature of live data entry and
          network conditions. This data should not be relied upon for any
          purpose requiring guaranteed accuracy (e.g., betting).
        </p>

        <h2>5. Third-Party Links</h2>

        <p>
          The Site may link to third-party websites (such as social media
          platforms). We are not responsible for the content, policies, or
          practices of any third-party site.
        </p>

        <h2>6. Disclaimer of Warranties</h2>

        <p>
          The Site is provided "as is" without warranties of any kind,
          express or implied. We do not guarantee that the Site will be
          error-free, uninterrupted, or available at all times.
        </p>

        <h2>7. Limitation of Liability</h2>

        <p>
          To the fullest extent permitted by law, Maguje FC shall not be
          liable for any indirect, incidental, or consequential damages
          arising from your use of, or inability to use, the Site.
        </p>

        <h2>8. Changes to These Terms</h2>

        <p>
          We may revise these Terms at any time. Continued use of the Site
          after changes are posted constitutes acceptance of the revised
          Terms.
        </p>

        <h2>9. Governing Law</h2>

        <p>
          These Terms are governed by the laws of Kenya.
        </p>

        <h2>10. Contact</h2>

        <p>
          Questions about these Terms can be directed to Maguje FC via our
          Contact page.
        </p>
      </div>
    </div>
  `);

  return { cleanup: null };
}