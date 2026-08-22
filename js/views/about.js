import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { lazyImage, observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';
import { aboutHeader } from './about-shared.js';

injectStyle('about-view', `
  .about-overview {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-lg);
    padding-bottom: var(--sp-2xl);
  }

  @media (min-width: 1200px) {
    .about-overview {
      grid-template-columns: 2fr 1fr;
    }
  }

  .about-crest {
    width: 96px;
    height: 96px;
    margin-bottom: var(--sp-md);
  }

  .about-description {
    font-size: var(--fs-md);
    line-height: var(--lh-normal);
    max-width: 65ch;
  }

  .about-facts {
    display: flex;
    gap: var(--sp-lg);
    margin-top: var(--sp-md);
    flex-wrap: wrap;
  }

  .about-fact__label {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: rgba(16,36,26,0.5);
  }

  .about-fact__value {
    font-size: var(--fs-md);
    font-weight: 700;
  }

  .about-navigation {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-sm);
    margin-top: var(--sp-xl);
    padding-top: var(--sp-lg);
    border-top: 1px solid var(--color-line);
  }

  .about-navigation__link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-xs) var(--sp-md);
    border: 1px solid var(--color-ridge-green);
    border-radius: var(--radius-sm);
    color: var(--color-ridge-green);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    transition:
      background var(--dur-fast) var(--ease-standard),
      color var(--dur-fast) var(--ease-standard);
  }

  .about-navigation__link:hover {
    background: var(--color-ridge-green);
    color: var(--color-summit-white);
  }
`);

export async function aboutView() {
  await viewContainer.render(`
    <div class="container">
      ${aboutHeader('About Maguje FC')}

      <div
        class="about-overview"
        data-slot="content"
      >
        <div class="skel skel-block" style="height:200px;"></div>
      </div>
    </div>
  `);

  const root = document.querySelector('#app');
  const slot = root.querySelector('[data-slot="content"]');

  try {
    const [
      { data: profile, error: profileErr },
      { data: contacts },
      { data: social }
    ] = await Promise.all([
      supabase
        .from('club_profile')
        .select(
          'name, founded_year, home_ground, location, description, crest_url'
        )
        .eq('id', 1)
        .maybeSingle(),

      supabase
        .from('club_contacts')
        .select('type, value'),

      supabase
        .from('club_social_links')
        .select('platform, url'),
    ]);

    if (profileErr) throw profileErr;

    if (!profile) {
      slot.innerHTML = states.empty({
        message: 'Club information coming soon.'
      });

      return { cleanup: null };
    }

    slot.innerHTML = `
      <div>
        <div class="about-crest">
          ${lazyImage({
            src: profile.crest_url,
            alt: profile.name,
            aspect: 'square'
          })}
        </div>

        <p class="about-description">
          ${profile.description || ''}
        </p>

        <div class="about-facts">
          ${
            profile.founded_year
              ? `
                <div>
                  <div class="about-fact__label">Founded</div>
                  <div class="about-fact__value">
                    ${profile.founded_year}
                  </div>
                </div>
              `
              : ''
          }

          ${
            profile.home_ground
              ? `
                <div>
                  <div class="about-fact__label">Home Ground</div>
                  <div class="about-fact__value">
                    ${profile.home_ground}
                  </div>
                </div>
              `
              : ''
          }
        </div>

        <nav
          class="about-navigation"
          aria-label="More about Maguje FC"
        >
          <a
            href="/about/history"
            class="about-navigation__link"
          >
            History
          </a>

          <a
            href="/about/vision-mission"
            class="about-navigation__link"
          >
            Vision & Mission
          </a>

          <a
            href="/about/honours"
            class="about-navigation__link"
          >
            Honours
          </a>
        </nav>
      </div>

      <div>
        ${contactRows(contacts || [])}

        ${
          social?.length
            ? `
              <div
                class="social-links"
                style="margin-top: var(--sp-md);"
              >
                ${social.map(s => `
                  <a
                    href="${s.url}"
                    class="social-links__link"
                    data-external
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${s.platform}
                  </a>
                `).join('')}
              </div>
            `
            : ''
        }
      </div>
    `;

    observeLazyImages(slot);

  } catch (err) {
    console.error('[about] load failed:', err);
    slot.innerHTML = states.error();
  }

  return { cleanup: null };
}

function contactRows(contacts) {
  if (!contacts.length) return '';

  return `
    <div class="club-contact">
      ${contacts.map(c => `
        <div class="club-contact__item">
          <span class="club-contact__label">
            ${c.type}
          </span>

          <span>
            ${
              c.type === 'email'
                ? `<a href="mailto:${c.value}">${c.value}</a>`
                : c.type === 'phone'
                  ? `<a href="tel:${c.value}">${c.value}</a>`
                  : c.value
            }
          </span>
        </div>
      `).join('')}
    </div>
  `;
}