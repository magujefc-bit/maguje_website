import { matchCard } from "../../components/match-card.js";
import { liveIndicator } from "../../components/controls.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { initCarousel } from "../../components/carousel.js";
import { injectStyle } from "../../utils/inject-style.js";
import { combineDateTime, escapeHtml, toExternalMatch } from "../../utils/format.js";
import { carouselNavButtons, wireCarouselNav } from "./home-shared.js";

injectStyle(
  "fixtures-section",
  `
  .home-fixtures-section {
    width: 100%;
  }

  .home-fixtures-section[hidden] { display: none; }

  .home-fixture-card-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    width: 100%;
  }

  .home-fixture-card-wrap + .home-fixture-card-wrap {
    margin-top: var(--sp-sm);
  }

  .home-fixture-card-wrap__label {
    display: flex;
    align-items: center;
    gap: var(--sp-2xs);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: rgba(16,36,26,0.5);
  }

  .home-fixture-card-wrap--live .home-fixture-card-wrap__label { color: var(--color-live); }

  .home-kickoff-toast {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2xs);
    width: fit-content;
    max-width: 100%;
    margin-inline: auto;
    padding: var(--sp-2xs) var(--sp-sm);
    background: var(--color-ridge-green);
    border-radius: 999px;
    font-size: var(--fs-xs);
    color: var(--color-summit-white);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .home-kickoff-toast__time { font-family: var(--font-mono); font-weight: 700; }
  .home-kickoff-toast__opp { color: rgba(247,249,246,0.75); overflow: hidden; text-overflow: ellipsis; }
`,
);

/*
 * FIXTURES SECTION.
 * - liveMatch: shown on its own card if present, always. Not part
 *   of the upcoming carousel — live has no "next slide" concept.
 * - upcomingMatches: 0 → nothing rendered below live; 1 → single
 *   card, no nav buttons, excluded from the shared auto-scroll;
 *   2+ → carousel with nav buttons, included in auto-scroll.
 * - Each upcoming card gets its own countdown pill, but only if
 *   that match's kickoff hasn't passed yet.
 *
 * Returns { cleanup, advance } — advance is only present when
 * there are 2+ upcoming matches (a real carousel to advance).
 * Returns undefined if there's nothing to render at all.
 */
export function renderFixturesSection(root, { liveMatch, upcomingMatches }) {
  const section = root.querySelector('[data-slot="fixtures-section"]');
  if (!section) return undefined;

  const upcoming = upcomingMatches || [];

  if (!liveMatch && !upcoming.length) {
    section.hidden = true;
    section.innerHTML = "";
    return undefined;
  }

  section.hidden = false;

  const liveBlock = liveMatch
    ? `
      <div class="home-fixture-card-wrap home-fixture-card-wrap--live">
        <div class="home-fixture-card-wrap__label">${liveIndicator("Live Now")}</div>
        ${matchCard(toExternalMatch({ ...liveMatch, status: "live" }))}
      </div>
    `
    : "";

  section.innerHTML = liveBlock + buildUpcomingBlock(upcoming);
  observeLazyImages(section);

  const pillCleanups = upcoming.map((match, i) => startKickoffToast(section, match, i));

  let carouselInstance = null;
  if (upcoming.length > 1) {
    const wrapEl = section.querySelector('[data-slot="fixtures-carousel-wrap"]');
    const carouselRoot = section.querySelector('[data-slot="fixtures-carousel"]');
    carouselInstance = initCarousel(carouselRoot, { autoplay: false });
    wireCarouselNav(wrapEl, carouselInstance);
  }

  return {
    cleanup() {
      pillCleanups.forEach((fn) => fn && fn());
      if (carouselInstance) carouselInstance.destroy();
    },
    advance: carouselInstance ? carouselInstance.advance : undefined,
  };
}

function buildUpcomingBlock(upcoming) {
  if (!upcoming.length) return "";

  if (upcoming.length === 1) {
    return singleUpcomingCard(upcoming[0], 0);
  }

  const slides = upcoming.map((match, i) => `<div class="carousel__slide">${singleUpcomingCard(match, i)}</div>`).join("");

  return `
    <div class="home-carousel-wrap" data-slot="fixtures-carousel-wrap">
      ${carouselNavButtons()}
      <div class="carousel" data-slot="fixtures-carousel">
        <div class="carousel__track" data-track>${slides}</div>
      </div>
    </div>
  `;
}

function singleUpcomingCard(match, index) {
  return `
    <div class="home-fixture-card-wrap">
      <div data-slot="kickoff-toast-${index}"></div>
      <div class="home-fixture-card-wrap__label">Upcoming</div>
      ${matchCard(toExternalMatch({ ...match, status: match.status || "scheduled" }), { href: "/fixtures" })}
    </div>
  `;
}

function isFutureKickoff(match) {
  const kickoff = combineDateTime(match?.match_date, match?.match_time);
  if (!kickoff) return false;
  return new Date(kickoff).getTime() - Date.now() > 0;
}

// Returns a cleanup fn that clears the interval it starts, or
// undefined if this match's kickoff has already passed (no pill).
function startKickoffToast(section, match, index) {
  const slot = section.querySelector(`[data-slot="kickoff-toast-${index}"]`);
  if (!slot) return undefined;

  if (!isFutureKickoff(match)) {
    slot.innerHTML = "";
    return undefined;
  }

  const kickoffIso = combineDateTime(match.match_date, match.match_time);
  const target = new Date(kickoffIso).getTime();

  function render() {
    const diff = target - Date.now();
    if (diff <= 0) {
      slot.innerHTML = "";
      return;
    }
    slot.innerHTML = `<div class="home-kickoff-toast">
        <span>Kickoff in</span>
        <span class="home-kickoff-toast__time">${formatKickoffToastTime(diff)}</span>
        <span class="home-kickoff-toast__opp">vs ${escapeHtml(match.opponent?.name || "TBD")}</span>
      </div>`;
  }

  render();
  const intervalId = setInterval(render, 30000);
  return () => clearInterval(intervalId);
}

function formatKickoffToastTime(diffMs) {
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}