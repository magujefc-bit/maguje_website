import { eventCard } from "../../components/event-card.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { injectStyle } from "../../utils/inject-style.js";

injectStyle(
  "events-section",
  `
  .home-events-section {
    width: 100%;
  }

  .home-events-section[hidden] { display: none; }

  .home-events-section__label {
    display: flex;
    align-items: center;
    gap: var(--sp-2xs);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: rgba(16,36,26,0.5);
    margin-bottom: var(--sp-sm);
  }
`,
);

/*
 * EVENTS SECTION — a single featured event card, shown only when
 * home-data.js's fetchEventsData() found something within 48h.
 * Renders nothing at all otherwise, not even an empty state —
 * the section simply doesn't exist for that page load.
 */
export function renderEventsSection(root, event) {
  const section = root.querySelector('[data-slot="events-section"]');
  if (!section) return;

  if (!event) {
    section.hidden = true;
    section.innerHTML = "";
    return;
  }

  section.hidden = false;
  section.innerHTML = `
    <div class="home-events-section__label">Upcoming Event</div>
    ${eventCard(event)}
  `;

  observeLazyImages(section);
}