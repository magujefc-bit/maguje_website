import { matchCard } from "../../components/match-card.js";
import { liveIndicator } from "../../components/controls.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { injectStyle } from "../../utils/inject-style.js";
import { combineDateTime, escapeHtml, toExternalMatch } from "../../utils/format.js";

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

// Match is eligible for this section once it's within 48 hours of
// kickoff, up until 10 minutes before — after that it's assumed to
// go live and the live card takes over instead.
const WINDOW_START_MS = 48 * 60 * 60 * 1000;
const WINDOW_END_MS = 10 * 60 * 1000;

/*
 * FIXTURES SECTION — centered countdown pill + upcoming card
 * (only when the next match is within 48h) and/or a live match
 * card. Renders nothing at all if neither condition is met.
 * Returns a cleanup fn (clears the kickoff interval) when one is
 * needed, or undefined otherwise — same contract as every other
 * section, so home.js can push it into cleanupFns unconditionally.
 */
export function renderFixturesSection(root, { liveMatch, nextUpcoming }) {
  const section = root.querySelector('[data-slot="fixtures-section"]');
  if (!section) return undefined;

  const upcomingWithinWindow = isWithinWindow(nextUpcoming) ? nextUpcoming : null;

  if (!liveMatch && !upcomingWithinWindow) {
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

  const upcomingBlock = upcomingWithinWindow
    ? `
      <div data-slot="kickoff-toast"></div>
      <div class="home-fixture-card-wrap">
        <div class="home-fixture-card-wrap__label">Upcoming</div>
        ${matchCard(toExternalMatch({ ...upcomingWithinWindow, status: upcomingWithinWindow.status || "scheduled" }), { href: "/fixtures" })}
      </div>
    `
    : "";

  section.innerHTML = liveBlock + upcomingBlock;

  observeLazyImages(section);

  if (upcomingWithinWindow) {
    return startKickoffToast(section, upcomingWithinWindow);
  }

  return undefined;
}

function isWithinWindow(match) {
  const kickoff = combineDateTime(match?.match_date, match?.match_time);
  if (!kickoff) return false;
  const diff = new Date(kickoff).getTime() - Date.now();
  return diff <= WINDOW_START_MS && diff > WINDOW_END_MS;
}

// Returns a cleanup fn that clears the interval it starts.
function startKickoffToast(section, match) {
  const slot = section.querySelector('[data-slot="kickoff-toast"]');
  if (!slot) return undefined;

  const kickoffIso = combineDateTime(match.match_date, match.match_time);
  const target = kickoffIso ? new Date(kickoffIso).getTime() : NaN;

  if (Number.isNaN(target)) {
    slot.innerHTML = "";
    return undefined;
  }

  function render() {
    const diff = target - Date.now();
    const inWindow = diff <= WINDOW_START_MS && diff > WINDOW_END_MS;
    slot.innerHTML = inWindow
      ? `<div class="home-kickoff-toast">
          <span>Kickoff in</span>
          <span class="home-kickoff-toast__time">${formatKickoffToastTime(diff)}</span>
          <span class="home-kickoff-toast__opp">vs ${escapeHtml(match.opponent?.name || "TBD")}</span>
        </div>`
      : "";
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