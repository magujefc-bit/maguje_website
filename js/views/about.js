import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { states } from '../components/states.js';
import { lazyImage, observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';
import { aboutHeader, clubProfileSubNav } from './club-shared.js';

injectStyle('about-view', `
  .about-overview {
    display: flex;
    flex-direction: column;
    gap: var(--sp-lg);
    padding-bottom: var(--sp-2xl);
  }

  .about-crest {
    width: 84px;
    height: 84px;
    margin: 0 auto var(--sp-sm);
  }

  .about-identity {
    text-align: center;
  }

  .about-club-name {
    font-size: var(--fs-lg);
    font-weight: 700;
    margin-bottom: var(--sp-3xs);
  }

  .about-meta-line {
    font-size: var(--fs-xs);
    color: rgba(16,36,26,0.55);
  }

  .about-ground-line {
    font-size: var(--fs-sm);
    color: rgba(16,36,26,0.7);
    margin-top: var(--sp-3xs);
  }

  .about-ground-line strong {
    color: var(--color-ink);
    font-weight: 600;
  }

  .about-divider {
    border: none;
    border-top: 1px solid var(--color-line);
    margin: 0;
  }

  .about-description {
    font-size: var(--fs-sm);
    line-height: var(--lh-normal);
  }
`);

export async function aboutView() {
  await viewContainer.render(`
    <div class="container">
      ${aboutHeader('Club Profile')}
      ${clubProfileSubNav('general')}

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

    const metaParts = [];
    if (profile.founded_year) metaParts.push(`Founded ${profile.founded_year}`);
    if (profile.location) metaParts.push(profile.location);

    slot.innerHTML = `
      <div class="about-identity">
        <div class="about-crest">
          ${lazyImage({
            src: profile.crest_url,
            alt: profile.name,
            aspect: 'square'
          })}
        </div>

        <div class="about-club-name">${profile.name || 'Maguje FC'}</div>

        ${
          metaParts.length
            ? `<div class="about-meta-line">${metaParts.join(' · ')}</div>`
            : ''
        }

        ${
          profile.home_ground
            ? `<div class="about-ground-line">Home ground: <strong>${profile.home_ground}</strong></div>`
            : ''
        }
      </div>

      <hr class="about-divider">

      <p class="about-description">
        ${profile.description || ''}
      </p>

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
