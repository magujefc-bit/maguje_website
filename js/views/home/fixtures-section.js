// src/views/home/fixtures-section.js
import { matchCard } from "../../components/match-card.js";
import { liveIndicator } from "../../components/controls.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { initCarousel } from "../../components/carousel.js";
import { injectStyle } from "../../utils/inject-style.js";
import { combineDateTime, escapeHtml, toExternalMatch } from "../../utils/format.js";
import { carouselNavButtons, wireCarouselNav } from "./home-shared.js";
import { supabase } from "../../supabase-client.js";

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
 * - The live card shows both a score and a live minute/stoppage
 *   clock (e.g. "23'" or "20+1'"), neither of which come from
 *   matches.our_score/opponent_score directly:
 *     - Score is derived by counting match_goals rows, same as
 *       fab-scoreboard.js — matches.our_score/opponent_score are
 *       not kept in sync with actual goals.
 *     - Clock is computed locally from live_state + phase start
 *       timestamps + half lengths, mirroring (and fixing the
 *       stoppage-time cap on) scoreboard-core.js's currentMinute.
 *       Duplicated here rather than imported because
 *       scoreboard-core.js is a global <script>, not an ES module,
 *       and isn't loaded on the home page bundle.
 *   subscribeLiveCard() wires both: an initial fetch, a realtime
 *   subscription on match_goals for score changes, and a 15s
 *   interval that just re-renders the clock label without hitting
 *   the DB. Detecting the match ending (is_live flipping false) is
 *   handled by home.js on next load, not here.
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

  const liveCardCleanup = liveMatch ? subscribeLiveCard(section, liveMatch) : undefined;

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
      if (liveCardCleanup) liveCardCleanup();
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

/*
 * Counts match_goals rows for this match and returns { our, opponent }
 * counts — NOT home/away yet, since that depends on is_home and is
 * resolved by toExternalMatch. Mirrors ScoreboardCore.computeScore's
 * source data (match_goals, filtered by is_opponent_goal).
 */
async function fetchGoalCounts(matchId) {
  const { data, error } = await supabase
    .from("match_goals")
    .select("is_opponent_goal")
    .eq("match_id", matchId);

  if (error) {
    console.error("[fixtures-section] match_goals fetch failed:", error);
    return null;
  }

  const opponent = data.filter((g) => g.is_opponent_goal).length;
  const our = data.length - opponent;
  return { our, opponent };
}

/*
 * Mirrors scoreboard-core.js's minuteWithStoppage() — same caps,
 * same "base+stoppage'" notation once a phase runs past its
 * configured length (e.g. a 20-minute half shows "20+1'" on minute
 * 21, not "21'"). Duplicated locally since scoreboard-core.js is a
 * global script, not importable here. Keep in sync if that file's
 * clock math changes.
 */
function formatStoppageMinute(elapsedInPhase, phaseLength, baseMinutes) {
  if (elapsedInPhase <= phaseLength) return `${baseMinutes + elapsedInPhase}'`;
  return `${baseMinutes + phaseLength}+${elapsedInPhase - phaseLength}'`;
}

function computeLiveClockLabel(match) {
  if (!match) return "";
  if (match.live_state === "half_time") return "HT";
  if (match.live_state === "full_time") return "FT";
  if (match.live_state === "not_started") return "";

  const halfLen = match.half_length_minutes || 45;
  const secondLen = match.second_half_length_minutes || halfLen;

  if (match.live_state === "first_half" && match.first_half_started_at) {
    const elapsed = Math.floor((Date.now() - new Date(match.first_half_started_at).getTime()) / 60000) + 1;
    return formatStoppageMinute(elapsed, halfLen, 0);
  }
  if (match.live_state === "second_half" && match.second_half_started_at) {
    const elapsed = Math.floor((Date.now() - new Date(match.second_half_started_at).getTime()) / 60000) + 1;
    return formatStoppageMinute(elapsed, secondLen, halfLen);
  }
  if (match.live_state === "extra_time" && match.extra_time_started_at) {
    const base = halfLen + secondLen;
    const elapsed = Math.floor((Date.now() - new Date(match.extra_time_started_at).getTime()) / 60000) + 1;
    const extraLen = match.extra_time_length_minutes || null;
    if (extraLen) return formatStoppageMinute(elapsed, extraLen, base);
    // No configured extra-time length on this row — uncapped, same
    // as scoreboard-core.js's fallback.
    return `${base + elapsed}'`;
  }
  return "";
}

function renderLiveCard(section, liveMatchRow, counts) {
  const wrap = section.querySelector(".home-fixture-card-wrap--live");
  if (!wrap) return;

  const merged = {
    ...liveMatchRow,
    our_score: counts.our,
    opponent_score: counts.opponent,
    liveClockLabel: computeLiveClockLabel(liveMatchRow) || "Live",
  };

  wrap.innerHTML = `
    <div class="home-fixture-card-wrap__label">${liveIndicator("Live Now")}</div>
    ${matchCard(toExternalMatch({ ...merged, status: "live" }))}
  `;
  observeLazyImages(wrap);
}

/*
 * Sets up the live card's score (via match_goals realtime) and
 * clock (via a local 15s tick — no DB call, just recomputed from
 * timestamps already on liveMatchRow). Returns a sync cleanup fn
 * immediately; the initial score fetch happens fire-and-forget so
 * cleanup registration in renderFixturesSection isn't blocked on it.
 */
function subscribeLiveCard(section, liveMatchRow) {
  if (!liveMatchRow?.id) return undefined;

  let latestCounts = null;

  async function refreshCounts() {
    const counts = await fetchGoalCounts(liveMatchRow.id);
    if (counts) {
      latestCounts = counts;
      renderLiveCard(section, liveMatchRow, latestCounts);
    }
  }

  refreshCounts();

  const channel = supabase
    .channel(`home-fixtures-live-${liveMatchRow.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "match_goals", filter: `match_id=eq.${liveMatchRow.id}` },
      refreshCounts,
    )
    .subscribe();

  // Re-renders using the last known score so the clock label stays
  // current even between goals. 15s keeps it fresh without
  // rebuilding the card every second.
  const clockIntervalId = setInterval(() => {
    if (latestCounts) renderLiveCard(section, liveMatchRow, latestCounts);
  }, 15000);

  return () => {
    supabase.removeChannel(channel);
    clearInterval(clockIntervalId);
  };
}