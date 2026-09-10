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
          <div class="carousel" data-slot="spotlight-carousel">
            <div class="carousel__track" data-track></div>
          </div>
        </section>

        <section class="home-section" data-slot="news-section">
          <div class="home-section__header">
            <h2 class="home-section__title">Latest Updates</h2>
            <a href="/news" class="home-section__link">All news →</a>
          </div>
          <div class="carousel" data-slot="news-carousel">
            <div class="carousel__track" data-track>${skeletons.newsList(2)}</div>
          </div>
        </section>

        <section class="home-section" data-slot="match-report-section">
          <div class="home-section__header">
            <h2 class="home-section__title">Latest Match Reports</h2>
            <a href="/match-reports" class="home-section__link">All reports →</a>
          </div>
          <div class="carousel" data-slot="reports-carousel">
            <div class="carousel__track" data-track>${skeletons.newsList(2)}</div>
          </div>
        </section>

      </div>
    </div>
  `);

  const root = document.querySelector("#app");

  // Hero, Events, Fixtures, and Spotlight all depend on data fetched
  // once here — no section duplicates a query another section needs.
  const [fixtures, spotlightItems, heroImageUrl, event] = await Promise.all([
    fetchFixturesData(),
    fetchSpotlightData(),
    fetchLatestGalleryImageUrl(),
    fetchEventsData(),
  ]);

  // Rendered in page order: Hero → Events → Fixtures → Spotlight.
  // Hero pushes its own cleanup into cleanupFns internally (it takes
  // cleanupFns as a param) — every other section below returns its
  // cleanup fn instead, hence the addCleanup() wrapper on those.
  renderHeroSection(root, { ...fixtures, heroImageUrl }, cleanupFns);
  renderEventsSection(root, event);
  addCleanup(cleanupFns, renderFixturesSection(root, fixtures));
  addCleanup(cleanupFns, renderSpotlightSection(root, spotlightItems));

  // News and Match Reports fetch independently and aren't awaited
  // here — they populate their own skeletons once ready, same as
  // the original home.js behavior.
  renderNewsSection(root).then((cleanup) => addCleanup(cleanupFns, cleanup));
  renderReportsSection(root).then((cleanup) => addCleanup(cleanupFns, cleanup));

  return {
    cleanup() {
      cleanupFns.forEach((fn) => fn());
    },
  };
}

function addCleanup(cleanupFns, maybeFn) {
  if (typeof maybeFn === "function") cleanupFns.push(maybeFn);
}