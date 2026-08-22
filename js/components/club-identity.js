import { injectStyle } from '../utils/inject-style.js';
import { lazyImage } from './lazy-image.js';

injectStyle('club-identity', `
  .official-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-sm);
    transition: transform var(--dur-fast) var(--ease-standard);
  }

  .official-card:hover {
    transform: translateY(-2px);
  }

  .official-card__top {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
  }

  .official-card__photo {
    width: 88px;
    height: 88px;
    flex: 0 0 88px;
    border-radius: 50%;
    overflow: hidden;
  }

  .official-card__photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .official-card__identity {
    min-width: 0;
  }

  .official-card__name {
    font-size: var(--fs-md);
    font-weight: 700;
    line-height: var(--lh-tight);
  }

  .official-card__role {
    margin-top: var(--sp-3xs);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-ridge-green);
    text-transform: uppercase;
  }

  .official-card__bio {
    font-size: var(--fs-sm);
    line-height: var(--lh-normal);
    color: rgba(16, 36, 26, 0.72);
  }

  .honour-card {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-sm);
  }

  .honour-card__year {
    font-family: var(--font-display);
    font-size: var(--fs-lg);
    color: var(--color-trophy-gold);
    min-width: 4.5em;
  }

  .honour-card__title {
    font-size: var(--fs-md);
  }

  .honours-timeline {
    position: relative;
    border-left: 2px solid var(--color-trophy-gold);
    margin-left: var(--sp-sm);
    display: flex;
    flex-direction: column;
    gap: var(--sp-md);
  }

  .honours-timeline__item {
    position: relative;
    padding-left: var(--sp-md);
  }

  .honours-timeline__item::before {
    content: '';
    position: absolute;
    left: -7px;
    top: 6px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-trophy-gold);
  }

  .honours-timeline__year {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-ridge-green);
    font-weight: 700;
  }

  .honours-timeline__title {
    font-size: var(--fs-md);
    margin-top: 2px;
  }

  .history-timeline {
    display: flex;
    flex-direction: column;
    gap: var(--sp-lg);
  }

  .history-timeline__entry {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-sm);
    padding-bottom: var(--sp-lg);
    border-bottom: 1px solid var(--color-line);
  }

  .history-timeline__entry:last-child {
    border-bottom: none;
  }

  .history-timeline__year {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    color: var(--color-ridge-green);
  }

  .history-timeline__body {
    font-size: var(--fs-md);
    line-height: var(--lh-normal);
  }

  .history-timeline__image {
    aspect-ratio: 16/9;
    border-radius: var(--radius-md);
    overflow: hidden;
    margin-top: var(--sp-sm);
  }

  @media (min-width: 768px) {
    .history-timeline__entry {
      grid-template-columns: 140px 1fr;
      align-items: start;
    }
  }

  .vision-mission {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-md);
  }

  .vision-mission__block {
    background: var(--color-pitch-shadow);
    color: var(--color-summit-white);
    border-radius: var(--radius-lg);
    padding: var(--sp-lg);
  }

  .vision-mission__label {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-trophy-gold);
    margin-bottom: var(--sp-xs);
  }

  .vision-mission__text {
    font-size: var(--fs-md);
    line-height: var(--lh-normal);
  }

  @media (min-width: 768px) {
    .vision-mission {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .club-contact {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
  }

  .club-contact__item {
    display: flex;
    align-items: center;
    gap: var(--sp-2xs);
    font-size: var(--fs-md);
  }

  .club-contact__label {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: rgba(16,36,26,0.5);
    min-width: 6em;
  }

  .social-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-xs);
  }

  .social-links__link {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid var(--color-ridge-green);
    color: var(--color-ridge-green);
    border-radius: var(--radius-sm);
    padding: var(--sp-3xs) var(--sp-xs);
    transition:
      background var(--dur-fast) var(--ease-standard),
      color var(--dur-fast) var(--ease-standard);
  }

  .social-links__link:hover {
    background: var(--color-ridge-green);
    color: var(--color-summit-white);
  }
`);

export function officialCard(official) {
  return `
    <div class="official-card">

      <div class="official-card__top">

        <div class="official-card__photo">
          ${lazyImage({
            src: official.photoUrl,
            alt: official.name,
            aspect: 'square'
          })}
        </div>

        <div class="official-card__identity">

          <div class="official-card__name">
            ${official.name}
          </div>

          <div class="official-card__role">
            ${official.role || ''}
          </div>

        </div>

      </div>

      ${
        official.bio
          ? `<p class="official-card__bio">${official.bio}</p>`
          : ''
      }

    </div>
  `;
}

export function officialsGrid(officials) {
  return `
    <div class="grid grid--4">
      ${officials.map(officialCard).join('')}
    </div>
  `;
}

export function honourCard(honour) {
  return `
    <div class="honour-card">
      <span class="honour-card__year">${honour.year}</span>
      <span class="honour-card__title">${honour.title}</span>
    </div>
  `;
}

export function honoursTimeline(honours) {
  return `
    <div class="honours-timeline">
      ${honours.map(h => `
        <div class="honours-timeline__item">
          <div class="honours-timeline__year">${h.year}</div>
          <div class="honours-timeline__title">${h.title}</div>
        </div>
      `).join('')}
    </div>
  `;
}

export function historyTimeline(entries) {
  return `
    <div class="history-timeline">
      ${entries.map(e => `
        <div class="history-timeline__entry">
          <div class="history-timeline__year">${e.year}</div>

          <div>
            <p class="history-timeline__body">${e.body}</p>

            ${
              e.imageUrl
                ? `
                  <div class="history-timeline__image">
                    ${lazyImage({
                      src: e.imageUrl,
                      alt: `Maguje FC, ${e.year}`,
                      aspect: 'video'
                    })}
                  </div>
                `
                : ''
            }
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function visionMissionSection({ vision, mission }) {
  return `
    <div class="vision-mission">
      <div class="vision-mission__block">
        <div class="vision-mission__label">Vision</div>
        <p class="vision-mission__text">${vision}</p>
      </div>

      <div class="vision-mission__block">
        <div class="vision-mission__label">Mission</div>
        <p class="vision-mission__text">${mission}</p>
      </div>
    </div>
  `;
}

export function clubContact(contact) {
  const rows = [
    contact.email && {
      label: 'Email',
      value: `<a href="mailto:${contact.email}">${contact.email}</a>`
    },
    contact.phone && {
      label: 'Phone',
      value: `<a href="tel:${contact.phone}">${contact.phone}</a>`
    },
    contact.address && {
      label: 'Address',
      value: contact.address
    }
  ].filter(Boolean);

  return `
    <div class="club-contact">
      ${rows.map(r => `
        <div class="club-contact__item">
          <span class="club-contact__label">${r.label}</span>
          <span>${r.value}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function socialLinks(links) {
  if (!links.length) return '';

  return `
    <div class="social-links">
      ${links.map(s => `
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
  `;
}