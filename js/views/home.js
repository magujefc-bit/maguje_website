import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { injectStyle } from "../utils/inject-style.js";

import {
  fetchFixturesData,
  fetchSpotlightData,
  fetchLatestGalleryImageUrl,
  fetchEventsData,
} from "./home/home-data.js";
import { renderHeroSection } from "./home/hero-section.js";
import { renderEventsSection } from "./home/events-section.js";
import { renderFixturesSection } from "./home/fixtures-section.js";
import { renderSpotlightSection } from "./home/spotlight-section.js";
import { renderNewsSection } from "./home/news-section.js";
import { renderReportsSection } from "./home/reports-section.js";

// ---------------------------------------------------------------
// COMPATIBILITY RE-EXPORTS — TEMPORARY
// These used to live directly in this file. At least 10 other
// views still import them from here:
//   getMagujeTeamId       ← main.js
//   fetchFirstMedia       ← news.js, match-reports.js, news-details.js, event-details.js
//   fetchAllMedia         ← match-report-details.js
//   toExternalMatch       ← competition-results.js, competition-fixtures.js, head-to-head-detail.js
//   combineDateTime       ← match-details.js, fixtures.js
//   excerptFrom           ← news.js, match-reports.js
// Do NOT remove this block until those files' own imports are
// updated to point at ./home/home-data.js and ../utils/format.js
// directly — removing this early will blank the whole site again.
// ---------------------------------------------------------------
export { getMagujeTeamId, fetchFirstMedia, fetchAllMedia } from "./home/home-data.js";
export { toExternalMatch, combineDateTime, excerptFrom } from "../utils/format.js";

const AUTO_SCROLL_DELAY_MS = 30000;

// Layout-only CSS specific to this file's own skeleton — not shared
// with any section, so it stays inline here rather than in home-shared.js.
injectStyle(
  "home-view",
  `
  .home-page.container {
    width: 100%;
    overflow-x: hidden;
    padding-inline: var(--sp-sm);
    padding-top: var(--sp-md);
  }

  .home-page * { min-width: 0; }

  .home-feed {
    display: flex;
    flex-direction: column;
    gap: var(--sp-lg);
    width: 100%;
  }
`,
);

export async function homeView() {
  const cleanupFns = [];

  // Shared registry of advance() fns for the global auto-scroll.
  // Sections push into this as they render (some are async, so
  // this may still be filling in after the timer has already
  // started — that's fine, the timer always reads the current
  // contents of the same array reference at each tick).
  const autoScrollRegistry = [];

  await viewContainer.render(`
    <div class="container home-page">
      <div class="home-feed">

        <div data-slot="hero-wrap">${skeletons.heroCarousel()}</div>

        <div class="home-events-section" data-slot="events-section" hidden></div>

        <div class="home-fixtures-section" data-slot="fixtures-section" hidden></div>

        <section class="home-section" data-slot="spotlight-section">
          <div class="home-section__header">
            <h2 class="home-section__title">Player Spotlight</h2>
          </div>
          <div class="home-carousel-wrap" data-slot="spotlight-carousel-wrap">
            <div class="carousel" data-slot="spotlight-carousel">
              <div class="carousel__track" data-track></div>
            </div>
          </div>
        </section>

        <section class="home-section" data-slot="news-section">
          <div class="home-section__header">
            <h2 class="home-section__title">Latest Updates</h2>
            <a href="/news" class="home-section__link">All news →</a>
          </div>
          <div class="home-carousel-wrap" data-slot="news-carousel-wrap">
            <div class="carousel" data-slot="news-carousel">
              <div class="carousel__track" data-track>${skeletons.newsList(2)}</div>
            </div>
          </div>
        </section>

        <section class="home-section" data-slot="match-report-section">
          <div class="home-section__header">
            <h2 class="home-section__title">Latest Match Reports</h2>
            <a href="/match-reports" class="home-section__link">All reports →</a>
          </div>
          <div class="home-carousel-wrap" data-slot="reports-carousel-wrap">
            <div class="carousel" data-slot="reports-carousel">
              <div class="carousel__track" data-track>${skeletons.newsList(2)}</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  `);

  const root = document.querySelector("#app");

  // Hero, Events, Fixtures, and Spotlight all depend on data fetched
  // once here — no section duplicates a query another section needs.
  const [fixtures, spotlightItems, heroImageUrl, events] = await Promise.all([
    fetchFixturesData(),
    fetchSpotlightData(),
    fetchLatestGalleryImageUrl(),
    fetchEventsData(),
  ]);

  // Rendered in page order: Hero → Events → Fixtures → Spotlight.
  // Hero is explicitly excluded from the shared auto-scroll system —
  // it keeps its own independent 7s autoplay and pushes its own
  // cleanup into cleanupFns internally (it takes cleanupFns as a
  // param, unlike every section below).
  renderHeroSection(root, { ...fixtures, heroImageUrl }, cleanupFns);

  registerSection(renderEventsSection(root, events), cleanupFns, autoScrollRegistry);
  registerSection(renderFixturesSection(root, fixtures), cleanupFns, autoScrollRegistry);
  registerSection(renderSpotlightSection(root, spotlightItems), cleanupFns, autoScrollRegistry);

  // News and Match Reports fetch independently and aren't awaited
  // here — they populate their own skeletons once ready, same as
  // the original home.js behavior. Their entries land in the
  // registry whenever their promise resolves.
  renderNewsSection(root).then((entry) => registerSection(entry, cleanupFns, autoScrollRegistry));
  renderReportsSection(root).then((entry) => registerSection(entry, cleanupFns, autoScrollRegistry));

  // Shared 15s auto-scroll: fires repeatedly while this page stays
  // mounted. Each tick calls advance() on every currently-registered
  // section — each section moves one slide from wherever it
  // currently sits, looping at its own end. Manual scroll/swipe
  // never touches this timer or this registry, by design (advance()
  // in carousel.js ignores the interaction-pause state entirely).
  // Starting a fresh interval + fresh registry on every homeView()
  // call is what makes "resets when the user leaves and comes back"
  // happen for free — there's nothing to explicitly reset, a
  // brand-new orchestrator is built on every mount.
  const autoScrollTimer = setInterval(() => {
    autoScrollRegistry.forEach((advance) => advance());
  }, AUTO_SCROLL_DELAY_MS);
  cleanupFns.push(() => clearInterval(autoScrollTimer));

  return {
    cleanup() {
      cleanupFns.forEach((fn) => fn());
    },
  };
}

// Unpacks a section's { cleanup, advance } return value (or
// undefined). Registers cleanup unconditionally when present;
// only registers advance when present, since single-slide
// sections return cleanup (if they have one, e.g. Fixtures'
// kickoff pill interval) but no advance — keeping them correctly
// excluded from the shared auto-scroll per spec.
function registerSection(entry, cleanupFns, autoScrollRegistry) {
  if (!entry) return;
  if (entry.cleanup) cleanupFns.push(entry.cleanup);
  if (entry.advance) autoScrollRegistry.push(entry.advance);
}