import { eventCard } from "../../components/event-card.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { initCarousel } from "../../components/carousel.js";
import { injectStyle } from "../../utils/inject-style.js";
import { carouselNavButtons, wireCarouselNav } from "./home-shared.js";

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
 * EVENTS SECTION — 0 events → nothing rendered; 1 event → single
 * card, no nav buttons, excluded from shared auto-scroll; 2+ →
 * carousel with nav buttons, included in shared auto-scroll.
 * Same pattern as fixtures-section.js.
 *
 * Returns { cleanup, advance } — advance only present with 2+
 * events. Returns undefined if there's nothing to render.
 */
export function renderEventsSection(root, events) {
  const section = root.querySelector('[data-slot="events-section"]');
  if (!section) return undefined;

  const list = events || [];

  if (!list.length) {
    section.hidden = true;
    section.innerHTML = "";
    return undefined;
  }

  section.hidden = false;

  if (list.length === 1) {
    section.innerHTML = `
      <div class="home-events-section__label">Upcoming Event</div>
      ${eventCard(list[0])}
    `;
    observeLazyImages(section);
    return undefined;
  }

  const slides = list.map((event) => `<div class="carousel__slide">${eventCard(event)}</div>`).join("");

  section.innerHTML = `
    <div class="home-events-section__label">Upcoming Events</div>
    <div class="home-carousel-wrap" data-slot="events-carousel-wrap">
      ${carouselNavButtons()}
      <div class="carousel" data-slot="events-carousel">
        <div class="carousel__track" data-track>${slides}</div>
      </div>
    </div>
  `;

  observeLazyImages(section);

  const wrapEl = section.querySelector('[data-slot="events-carousel-wrap"]');
  const carouselRoot = section.querySelector('[data-slot="events-carousel"]');
  const instance = initCarousel(carouselRoot, { autoplay: false });
  wireCarouselNav(wrapEl, instance);

  return {
    cleanup() {
      instance.destroy();
    },
    advance: instance.advance,
  };
}