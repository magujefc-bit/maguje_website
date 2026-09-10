import { injectStyle } from "../../utils/inject-style.js";

/*
 * Shared markup + styles for home-page sections.
 *
 * 1. Section header pattern (soft eyebrow-style title + optional
 *    "see all →" link): used by Spotlight, News, Match Reports.
 *    Matches the small mono-uppercase label style already used by
 *    Events ("UPCOMING EVENT") and Fixtures ("Upcoming") — kept
 *    small deliberately so these headers don't eat vertical space.
 *
 * 2. Carousel nav buttons (prev/next, icon-only SVG) + the wiring
 *    helper that hooks them up to a carousel instance's goTo/
 *    currentIndex/slideCount: used by Fixtures, Spotlight, News,
 *    Match Reports whenever they render 2+ slides. Events isn't
 *    included since it only ever shows a single featured card.
 */
injectStyle(
  "home-shared",
  `
  .home-section {
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .home-section__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sp-sm);
    margin-bottom: var(--sp-sm);
    min-width: 0;
  }

  .home-section__title {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: rgba(16,36,26,0.5);
    font-weight: 600;
    min-width: 0;
  }

  .home-section__link {
    flex: 0 0 auto;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-ridge-green);
    white-space: nowrap;
  }

  .home-carousel-wrap { position: relative; }

  .home-carousel-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(16,36,26,0.55);
    border-radius: 50%;
    border: none;
    color: var(--color-summit-white);
    cursor: pointer;
  }

  .home-carousel-nav svg { width: 16px; height: 16px; }
  .home-carousel-nav--prev { left: var(--sp-2xs); }
  .home-carousel-nav--next { right: var(--sp-2xs); }
`,
);

const ICON_PREV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
const ICON_NEXT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

export function carouselNavButtons() {
  return `
    <button type="button" class="home-carousel-nav home-carousel-nav--prev" data-nav="prev" aria-label="Previous">${ICON_PREV}</button>
    <button type="button" class="home-carousel-nav home-carousel-nav--next" data-nav="next" aria-label="Next">${ICON_NEXT}</button>
  `;
}

export function wireCarouselNav(containerEl, instance) {
  const prevBtn = containerEl.querySelector('[data-nav="prev"]');
  const nextBtn = containerEl.querySelector('[data-nav="next"]');
  if (!prevBtn || !nextBtn) return;

  prevBtn.addEventListener("click", () => {
    const count = instance.slideCount();
    if (!count) return;
    const prev = (instance.currentIndex() - 1 + count) % count;
    instance.goTo(prev);
  });

  nextBtn.addEventListener("click", () => {
    const count = instance.slideCount();
    if (!count) return;
    const next = (instance.currentIndex() + 1) % count;
    instance.goTo(next);
  });
}