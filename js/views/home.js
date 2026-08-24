import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchCard } from "../components/match-card.js";
import { newsCard } from "../components/news-card.js";
import { spotlightCard, spotlightPlaceholderCard } from "../components/spotlight-card.js";
import { liveIndicator } from "../components/controls.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";
import { initCarousel } from "../components/carousel.js";

injectStyle(
  "home-view",
  `
  /* =========================================================
     HOME PAGE - GLOBAL OVERFLOW PROTECTION
     ========================================================= */

  .home-page.container {
    width: 100%;
    overflow-x: hidden;
    max-width: 1280px;
  }

  @media (min-width: 1440px) {
    .home-page.container {
      max-width: 1600px;
    }
  }

  @media (min-width: 1920px) {
    .home-page.container {
      max-width: 1800px;
    }
  }

  .home-page * {
    min-width: 0;
  }

  /* =========================================================
     FEED GRID
     data-fixtures-state, applied to this element by JS, drives
     which combination of Hero / Live / Upcoming / Spotlight is
     currently in play, per the responsive matrix:

     Tablet (768-1199px), 2 columns:
       state="none"          -> hero | spotlight-row (2 cols)
       state="live-only"     -> hero | live   (row2: spotlight-row, 2 cols, static)
       state="upcoming-only" -> hero | upcoming (row2: spotlight-row, 2 cols, static)
       state="both"          -> hero | live   (row2: upcoming | spotlight, 1 col each, spotlight slides)

     Desktop (>=1200px), 3 columns:
       state="none"          -> hero | spotlight-a | spotlight-b (row1, 3 cols, static)
       state="live-only"     -> hero | live | spotlight (row1, 3 cols, spotlight slides alone)
       state="upcoming-only" -> hero | upcoming | spotlight (row1, 3 cols, spotlight slides alone)
       state="both"          -> hero | live | upcoming (row1, 3 cols)
                                 spotlight-a | spotlight-b (row2, 2 cols, static)
     ========================================================= */

  .home-feed-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-lg);
    width: 100%;
    min-width: 0;
  }

  .home-feed-grid > * {
    min-width: 0;
    max-width: 100%;
  }

  @media (min-width: 768px) and (max-width: 1199px) {
    .home-feed-grid {
      grid-template-columns: 1fr 1fr;
    }

    .hf-hero { grid-column: 1; grid-row: 1; }

    [data-fixtures-state="none"] .hf-spotlight { grid-column: 1 / 3; grid-row: 2; }

    [data-fixtures-state="live-only"] .hf-live { grid-column: 2; grid-row: 1; }
    [data-fixtures-state="live-only"] .hf-spotlight { grid-column: 1 / 3; grid-row: 2; }

    [data-fixtures-state="upcoming-only"] .hf-upcoming { grid-column: 2; grid-row: 1; }
    [data-fixtures-state="upcoming-only"] .hf-spotlight { grid-column: 1 / 3; grid-row: 2; }

    [data-fixtures-state="both"] .hf-live { grid-column: 2; grid-row: 1; }
    [data-fixtures-state="both"] .hf-upcoming { grid-column: 1; grid-row: 2; }
    [data-fixtures-state="both"] .hf-spotlight { grid-column: 2; grid-row: 2; }
  }

  @media (min-width: 1200px) {
    .home-feed-grid {
      grid-template-columns: 1fr 1fr 1fr;
    }

    .hf-hero { grid-column: 1; grid-row: 1; }

    [data-fixtures-state="none"] .hf-spotlight-a { grid-column: 2; grid-row: 1; }
    [data-fixtures-state="none"] .hf-spotlight-b { grid-column: 3; grid-row: 1; }

    [data-fixtures-state="live-only"] .hf-live { grid-column: 2; grid-row: 1; }
    [data-fixtures-state="live-only"] .hf-spotlight { grid-column: 3; grid-row: 1; }

    [data-fixtures-state="upcoming-only"] .hf-upcoming { grid-column: 2; grid-row: 1; }
    [data-fixtures-state="upcoming-only"] .hf-spotlight { grid-column: 3; grid-row: 1; }

    [data-fixtures-state="both"] .hf-live { grid-column: 2; grid-row: 1; }
    [data-fixtures-state="both"] .hf-upcoming { grid-column: 3; grid-row: 1; }
    [data-fixtures-state="both"] .hf-spotlight-a { grid-column: 1 / 3; grid-row: 2; }
    [data-fixtures-state="both"] .hf-spotlight-b { grid-column: 3 / 4; grid-row: 2; }
  }

  /* =========================================================
     HERO CAROUSEL
     ========================================================= */

  .home-hero-carousel {
    position: relative;
    background: var(--color-pitch-shadow);
    border-radius: var(--radius-lg);
    overflow: hidden;
    min-height: 280px;
  }

  .home-hero-carousel::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image:
      repeating-linear-gradient(
        0deg,
        rgba(247,249,246,0.04) 0 2px,
        transparent 2px 40px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(247,249,246,0.04) 0 2px,
        transparent 2px 40px
      );
    opacity: 0.5;
  }

  .home-hero-carousel .carousel__track {
    position: relative;
    z-index: 1;
    height: 280px;
  }

  .home-hero-slide {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: var(--sp-xl) var(--sp-lg);
    height: 100%;
  }

  .home-hero-slide__crest {
    width: clamp(56px, 8vw, 84px);
    height: auto;
    margin-bottom: var(--sp-sm);
  }

  .home-hero-slide__title {
    color: var(--color-summit-white);
    margin-bottom: var(--sp-2xs);
  }

  .home-hero-slide__text {
    color: rgba(247,249,246,0.85);
    max-width: 48ch;
  }

  .home-hero-slide__live-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-3xs);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: var(--color-live);
    margin-bottom: var(--sp-xs);
  }

  /* =========================================================
     KICKOFF REMINDER TOAST (unchanged)
     ========================================================= */

  .home-kickoff-toast {
    display: flex;
    align-items: center;
    gap: var(--sp-2xs);
    width: fit-content;
    max-width: 100%;
    margin-bottom: var(--sp-md);
    padding: var(--sp-2xs) var(--sp-sm);
    background: var(--color-ridge-green);
    border-radius: 999px;
    font-size: var(--fs-xs);
    color: var(--color-summit-white);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .home-kickoff-toast__time {
    font-family: var(--font-mono);
    font-weight: 700;
  }

  .home-kickoff-toast__opp {
    color: rgba(247,249,246,0.75);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* =========================================================
     GENERAL SECTIONS
     ========================================================= */

  .home-section {
    padding-block: var(--sp-lg);
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
    font-size: var(--fs-xl);
    min-width: 0;
  }

  .home-section__link {
    flex: 0 0 auto;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-ridge-green);
    white-space: nowrap;
  }

  /* =========================================================
     FIXTURE CARDS (Live / Upcoming — independent)
     ========================================================= */

  .home-fixture-card-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    min-width: 0;
    width: 100%;
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

  .home-fixture-card-wrap--live .home-fixture-card-wrap__label {
    color: var(--color-live);
  }

  /* =========================================================
     PLAYER SPOTLIGHT
     ========================================================= */

  .home-spotlight-section {
    width: 100%;
    min-width: 0;
  }

  /* News / Match Reports carousels */

  .home-carousel-card {
    min-width: 0;
  }

  @media (min-width: 1200px) {
    .home-carousel--grid-desktop .carousel__track {
      overflow: visible;
      scroll-snap-type: none;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--sp-sm);
    }

    .home-carousel--grid-desktop .carousel__slide {
      flex: none;
      width: auto;
      scroll-snap-align: none;
    }
  }

  @media (min-width: 768px) and (max-width: 1199px) {
    .home-carousel--pair-tablet .carousel__slide {
      flex: 0 0 100%;
    }

    .home-carousel--pair-tablet .carousel__slide-inner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sp-sm);
    }
  }
`,
);

let MAGUJE_TEAM_ID = null;
let KICKOFF_TOAST_INTERVAL = null;

const MAX_FIXTURES = 4;
const MAX_NEWS = 4;
const MAX_MATCH_REPORTS = 4;
const KICKOFF_TOAST_WINDOW_START = (24 + 12) * 60 * 60 * 1000; // 1 day 12 hours
const KICKOFF_TOAST_WINDOW_END = 10 * 60 * 1000; // 10 minutes
const GREETING_SEEN_KEY = "maguje_home_greeting_seen";

/* =========================================================
   UNCHANGED HELPERS
   ========================================================= */

export async function getMagujeTeamId() {
  if (MAGUJE_TEAM_ID) return MAGUJE_TEAM_ID;

  const { data } = await supabase
    .from("teams")
    .select("id")
    .ilike("name", "%maguje%")
    .limit(1)
    .maybeSingle();

  MAGUJE_TEAM_ID = data?.id || null;
  return MAGUJE_TEAM_ID;
}

export async function getPostId(table, slug) {
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return data?.id || null;
}

export async function fetchFirstMedia(postType, postId) {
  if (!postId) return null;

  const { data } = await supabase
    .from("post_media")
    .select("media:media_library(url)")
    .eq("post_type", postType)
    .eq("post_id", postId)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.media?.url || null;
}

export async function fetchAllMedia(postType, postId) {
  if (!postId) return [];

  const { data } = await supabase
    .from("post_media")
    .select("media:media_library(url)")
    .eq("post_type", postType)
    .eq("post_id", postId)
    .order("display_order", { ascending: true });

  return (data || []).map((row) => row.media?.url).filter(Boolean);
}

export function excerptFrom(body, len = 140) {
  if (!body) return "";

  const plain = body.replace(/<[^>]+>/g, "");

  return plain.length > len
    ? plain.slice(0, len) + "…"
    : plain;
}

export function combineDateTime(date, time) {
  if (!date) return null;

  return `${date}T${time || "00:00:00"}`;
}

export function toExternalMatch(row) {
  const isAway = row.is_home === false;

  return {
    slug: row.slug,

    status:
      row.status ||
      (row.live_state &&
      row.live_state !== "not_started" &&
      row.live_state !== "full_time"
        ? "live"
        : row.status),

    kickoffAt: combineDateTime(
      row.match_date,
      row.match_time,
    ),

    homeScore: isAway ? row.opponent_score : row.our_score,
    awayScore: isAway ? row.our_score : row.opponent_score,

    homeTeam: isAway
      ? {
          name: row.opponent?.name || "TBD",
          shortName: row.opponent?.name,
          crestUrl: row.opponent?.logo_url,
        }
      : {
          name: "Maguje FC",
          shortName: "Maguje",
          crestUrl: "/assets/maguje-crest.png",
        },

    awayTeam: isAway
      ? {
          name: "Maguje FC",
          shortName: "Maguje",
          crestUrl: "/assets/maguje-crest.png",
        }
      : {
          name: row.opponent?.name || "TBD",
          shortName: row.opponent?.name,
          crestUrl: row.opponent?.logo_url,
        },
  };
}

/* =========================================================
   HOME VIEW
   ========================================================= */

export async function homeView() {
  const cleanupFns = [];

  await viewContainer.render(`
    <div class="container home-page">

      <!-- KICKOFF REMINDER -->
      <div data-slot="kickoff-toast"></div>

      <div class="home-feed-grid" data-fixtures-state="none">

        <!-- HERO -->
        <div class="hf-hero" data-slot="hero-wrap">
          ${skeletons.heroCarousel()}
        </div>

        <!-- LIVE (independent card) -->
        <div class="hf-live home-fixture-card-wrap home-fixture-card-wrap--live" data-slot="live-wrap" hidden></div>

        <!-- UPCOMING (independent card) -->
        <div class="hf-upcoming home-fixture-card-wrap" data-slot="upcoming-wrap" hidden></div>

        <!-- PLAYER SPOTLIGHT -->
        <div class="hf-spotlight home-spotlight-section" data-slot="spotlight-wrap">
          ${skeletons.spotlightRow()}
        </div>
        <div class="hf-spotlight-a home-spotlight-section" data-slot="spotlight-a-wrap" hidden></div>
        <div class="hf-spotlight-b home-spotlight-section" data-slot="spotlight-b-wrap" hidden></div>

      </div>

      <!-- LATEST NEWS -->
      <section class="home-section" data-slot="news-section">
        <div class="home-section__header">
          <h2 class="home-section__title">Latest Updates</h2>
          <a href="/news" class="home-section__link">All news →</a>
        </div>
        <div class="carousel" data-slot="news-carousel">
          <div class="carousel__track" data-track>
            ${skeletons.newsList(2)}
          </div>
        </div>
      </section>

      <!-- LATEST MATCH REPORTS -->
      <section class="home-section" data-slot="match-report-section">
        <div class="home-section__header">
          <h2 class="home-section__title">Latest Match Reports</h2>
          <a href="/match-reports" class="home-section__link">All reports →</a>
        </div>
        <div class="carousel" data-slot="reports-carousel">
          <div class="carousel__track" data-track>
            ${skeletons.newsList(2)}
          </div>
        </div>
      </section>

    </div>
  `);

  const root = document.querySelector("#app");
  const carouselInstances = [];

  const fixturesData = await loadFixturesAndHero(root, cleanupFns);
  await loadSpotlight(root, fixturesData.fixturesState);
  loadSecondaryNews(root, carouselInstances);
  loadFeaturedMatchReport(root, carouselInstances);

  return {
    cleanup() {
      cleanupFns.forEach((fn) => fn());
      carouselInstances.forEach((c) => c.destroy());
    },
  };
}

/* =========================================================
   HERO + LIVE + UPCOMING
   (fetch is shared since the hero's summary slides are built
   from the same live/upcoming/news/report data as the two
   independent fixture cards)
   ========================================================= */

async function loadFixturesAndHero(root, cleanupFns) {
  const heroWrap = root.querySelector('[data-slot="hero-wrap"]');
  const liveWrap = root.querySelector('[data-slot="live-wrap"]');
  const upcomingWrap = root.querySelector('[data-slot="upcoming-wrap"]');
  const grid = root.querySelector(".home-feed-grid");

  let liveMatch = null;
  let nextUpcoming = null;
  let latestNews = null;
  let latestReport = null;

  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      { data: live, error: liveErr },
      { data: upcoming, error: upcomingErr },
      { data: newsRows, error: newsErr },
      { data: reportRows, error: reportErr },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(`
          id, slug, match_date, match_time, our_score, opponent_score,
          opponent_team_id, is_home
        `)
        .eq("is_live", true)
        .limit(1),

      supabase
        .from("matches")
        .select(`
          id, slug, match_date, match_time, our_score, opponent_score,
          opponent_team_id, is_home, status, venue
        `)
        .eq("is_internal", true)
        .in("status", ["scheduled", "pending"])
        .gte("match_date", today)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true })
        .limit(MAX_FIXTURES),

      supabase
        .from("news_posts")
        .select("id, slug, title, created_at")
        .order("created_at", { ascending: false })
        .limit(1),

      supabase
        .from("match_report_posts")
        .select("id, slug, title, created_at")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (liveErr || upcomingErr || newsErr || reportErr) {
      throw (liveErr || upcomingErr || newsErr || reportErr);
    }

    const allFetched = [...(live || []), ...(upcoming || [])];
    const uniqueFetched = Array.from(
      new Map(allFetched.map((m) => [m.id, m])).values(),
    );
    const withOpp = uniqueFetched.length
      ? await supabase.attachOpponents(uniqueFetched)
      : [];
    const mapById = new Map(withOpp.map((m) => [m.id, m]));

    liveMatch = live?.length ? mapById.get(live[0].id) || live[0] : null;

    const upcomingMatches = (upcoming || [])
      .map((m) => mapById.get(m.id) || m)
      .sort((a, b) => getKickoffTime(a) - getKickoffTime(b));

    nextUpcoming = upcomingMatches[0] || null;
    latestNews = newsRows?.[0] || null;
    latestReport = reportRows?.[0] || null;

    /* ---------------- LIVE CARD ---------------- */
    if (liveMatch) {
      liveWrap.hidden = false;
      liveWrap.innerHTML = `
        <div class="home-fixture-card-wrap__label">${liveIndicator("Live Now")}</div>
        ${matchCard(toExternalMatch({ ...liveMatch, status: "live" }))}
      `;
    } else {
      liveWrap.hidden = true;
      liveWrap.innerHTML = "";
    }

    /* ---------------- UPCOMING CARD (links to /fixtures) ---------------- */
    if (nextUpcoming) {
      upcomingWrap.hidden = false;
      upcomingWrap.innerHTML = `
        <div class="home-fixture-card-wrap__label">Upcoming</div>
        ${matchCard(
          toExternalMatch({
            ...nextUpcoming,
            status: nextUpcoming.status || "scheduled",
          }),
          { href: "/fixtures" },
        )}
      `;
    } else {
      upcomingWrap.hidden = true;
      upcomingWrap.innerHTML = "";
    }

    /* ---------------- GRID STATE ---------------- */
    const fixturesState = liveMatch && nextUpcoming
      ? "both"
      : liveMatch
        ? "live-only"
        : nextUpcoming
          ? "upcoming-only"
          : "none";

    grid.dataset.fixturesState = fixturesState;

    /* ---------------- HERO CAROUSEL ---------------- */
    buildHero(heroWrap, {
      liveMatch,
      nextUpcoming,
      latestNews,
      latestReport,
    }, cleanupFns);

    observeLazyImages(liveWrap);
    observeLazyImages(upcomingWrap);

    /* ---------------- KICKOFF TOAST (unchanged logic) ---------------- */
    cleanupFns.push(startKickoffToast(root, nextUpcoming));

    return { fixturesState };
  } catch (err) {
    console.error("[home] fixtures/hero load failed:", err);
    heroWrap.innerHTML = states.error();
    states.bindRetry(heroWrap, () => loadFixturesAndHero(root, cleanupFns));
    return { fixturesState: "none" };
  }
}

function getKickoffTime(match) {
  const value = combineDateTime(match?.match_date, match?.match_time);
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/* =========================================================
   HERO — greeting (once) + sliding summary carousel
   ========================================================= */

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function buildHero(heroWrap, { liveMatch, nextUpcoming, latestNews, latestReport }, cleanupFns) {
  const slides = [];
  const greetingAlreadySeen = sessionStorage.getItem(GREETING_SEEN_KEY) === "1";

  // Greeting slide — shown once per visit only.
  if (!greetingAlreadySeen) {
    slides.push(`
      <div class="home-hero-slide">
        <img src="/assets/maguje-crest.png" alt="" class="home-hero-slide__crest">
        <h1 class="text-display-2xl home-hero-slide__title">${getGreeting()}!</h1>
        <p class="text-body-md home-hero-slide__text">Welcome to the official home of Maguje FC.</p>
      </div>
    `);
    sessionStorage.setItem(GREETING_SEEN_KEY, "1");
  }

  if (liveMatch) {
    const opponentName = liveMatch.opponent?.name || "our opponents";
    const venueBit = liveMatch.is_home === false
      ? ` at ${liveMatch.venue || opponentName + "'s ground"}`
      : "";
    slides.push(`
      <div class="home-hero-slide">
        <div class="home-hero-slide__live-badge">${liveIndicator("Live")}</div>
        <h2 class="text-display-lg home-hero-slide__title">Maguje is playing ${escapeHtml(opponentName)}${venueBit}</h2>
        <p class="text-body-md home-hero-slide__text">Don't miss live updates for this match.</p>
      </div>
    `);
  }

  if (nextUpcoming) {
    const opponentName = nextUpcoming.opponent?.name || "our opponents";
    const venueBit = nextUpcoming.is_home === false
      ? ` at ${nextUpcoming.venue || opponentName + "'s ground"}`
      : "";
    const kickoff = combineDateTime(nextUpcoming.match_date, nextUpcoming.match_time);
    const kickoffLabel = kickoff
      ? new Date(kickoff).toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })
      : "soon";
    slides.push(`
      <div class="home-hero-slide">
        <h2 class="text-display-lg home-hero-slide__title">Maguje will play ${escapeHtml(opponentName)}${venueBit}, at ${kickoffLabel}</h2>
        <p class="text-body-md home-hero-slide__text">We invite you to come and support our boys — live updates might also be available, stay tuned.</p>
      </div>
    `);
  }

  if (latestNews) {
    slides.push(`
      <div class="home-hero-slide">
        <h2 class="text-display-lg home-hero-slide__title">Club news awaiting you</h2>
        <p class="text-body-md home-hero-slide__text">Scroll down to read.</p>
      </div>
    `);
  }

  if (latestReport) {
    slides.push(`
      <div class="home-hero-slide">
        <h2 class="text-display-lg home-hero-slide__title">A match report is awaiting you</h2>
        <p class="text-body-md home-hero-slide__text">Scroll down to read.</p>
      </div>
    `);
  }

  // Absolute fallback — no live/upcoming/news/report at all yet.
  if (!slides.length) {
    slides.push(`
      <div class="home-hero-slide">
        <img src="/assets/maguje-crest.png" alt="" class="home-hero-slide__crest">
        <h1 class="text-display-2xl home-hero-slide__title">Maguje FC</h1>
        <p class="text-body-md home-hero-slide__text">Rooted in the community. Playing for the ridge.</p>
      </div>
    `);
  }

  heroWrap.innerHTML = `
    <div class="home-hero-carousel carousel" data-slot="hero-carousel">
      <div class="carousel__track" data-track>
        ${slides.map((s) => `<div class="carousel__slide">${s}</div>`).join("")}
      </div>
    </div>
  `;

  const carouselRoot = heroWrap.querySelector('[data-slot="hero-carousel"]');
  // Skip index 0 (greeting) on autoplay loop-back, only if it was rendered.
  const skipIndicesOnLoop = greetingAlreadySeen ? [] : [0];
  const instance = initCarousel(carouselRoot, { intervalMs: 5000, skipIndicesOnLoop });
  cleanupFns.push(() => instance.destroy());
}

/* =========================================================
   KICKOFF REMINDER TOAST (unchanged)
   ========================================================= */

function startKickoffToast(root, match) {
  if (KICKOFF_TOAST_INTERVAL) {
    clearInterval(KICKOFF_TOAST_INTERVAL);
    KICKOFF_TOAST_INTERVAL = null;
  }

  const slot = root.querySelector('[data-slot="kickoff-toast"]');
  if (!slot) return () => {};

  if (!match) {
    slot.innerHTML = "";
    return () => {};
  }

  const kickoffIso = combineDateTime(match.match_date, match.match_time);
  const target = kickoffIso ? new Date(kickoffIso).getTime() : NaN;

  if (Number.isNaN(target)) {
    slot.innerHTML = "";
    return () => {};
  }

  function render() {
    const diff = target - Date.now();
    const inWindow =
      diff <= KICKOFF_TOAST_WINDOW_START && diff > KICKOFF_TOAST_WINDOW_END;

    slot.innerHTML = inWindow
      ? `<div class="home-kickoff-toast">
          <span>Kickoff in</span>
          <span class="home-kickoff-toast__time">${formatKickoffToastTime(diff)}</span>
          <span class="home-kickoff-toast__opp">vs ${escapeHtml(match.opponent?.name || "TBD")}</span>
        </div>`
      : "";
  }

  render();
  KICKOFF_TOAST_INTERVAL = setInterval(render, 30000);

  return () => {
    clearInterval(KICKOFF_TOAST_INTERVAL);
    KICKOFF_TOAST_INTERVAL = null;
  };
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

/* =========================================================
   PLAYER SPOTLIGHT
   ========================================================= */

async function loadSpotlight(root, fixturesState) {
  // Layout differs depending on whether Live/Upcoming took the
  // shared-column slot ("hf-spotlight") or Spotlight got its own
  // two dedicated columns ("hf-spotlight-a" / "hf-spotlight-b").
  const sharedWrap = root.querySelector('[data-slot="spotlight-wrap"]');
  const aWrap = root.querySelector('[data-slot="spotlight-a-wrap"]');
  const bWrap = root.querySelector('[data-slot="spotlight-b-wrap"]');

  const usesDedicatedSlots = fixturesState === "none" || fixturesState === "both";

  sharedWrap.hidden = usesDedicatedSlots;
  aWrap.hidden = !usesDedicatedSlots;
  bWrap.hidden = !usesDedicatedSlots;

  const targetWrap = usesDedicatedSlots ? null : sharedWrap;

  try {
    const [
      { data: matchStandout },
      { data: compStandout },
      { data: topScorers },
      { data: topAssists },
      { data: discipline },
    ] = await Promise.all([
      supabase.from("v_spotlight_match_standout").select("*").limit(1),
      supabase.from("v_spotlight_competition_standout").select("*").order("weighted_score", { ascending: false }).limit(1),
      supabase.from("v_spotlight_top_scorers").select("*").order("goals", { ascending: false }).limit(1),
      supabase.from("v_spotlight_top_assists").select("*").order("assists", { ascending: false }).limit(1),
      supabase.from("v_spotlight_discipline").select("*").limit(1),
    ]);

    const cards = [];

    if (matchStandout?.[0] && !matchStandout[0].is_tied) {
      const s = matchStandout[0];
      cards.push(spotlightCard({
        label: "Match Standout",
        playerName: s.player_name,
        photoUrl: s.photo_url,
        playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals_in_match, s.assists_in_match),
        meta: s.opponent_name ? `vs ${escapeHtml(s.opponent_name)}` : "",
      }));
    }

    if (compStandout?.[0] && !compStandout[0].is_tied) {
      const s = compStandout[0];
      cards.push(spotlightCard({
        label: "Competition Standout",
        playerName: s.player_name,
        photoUrl: s.photo_url,
        playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals, s.assists),
      }));
    }

    if (topScorers?.[0] && !topScorers[0].is_tied) {
      const s = topScorers[0];
      cards.push(spotlightCard({
        label: "Top Scorer",
        playerName: s.player_name,
        photoUrl: s.photo_url,
        playerSlug: s.player_slug,
        statLine: `${s.goals} goal${s.goals === 1 ? "" : "s"}`,
      }));
    }

    if (topAssists?.[0] && !topAssists[0].is_tied) {
      const s = topAssists[0];
      cards.push(spotlightCard({
        label: "Top Assists",
        playerName: s.player_name,
        photoUrl: s.photo_url,
        playerSlug: s.player_slug,
        statLine: `${s.assists} assist${s.assists === 1 ? "" : "s"}`,
      }));
    }

    if (discipline?.[0] && !discipline[0].is_tied) {
      const s = discipline[0];
      cards.push(spotlightCard({
        label: "Discipline",
        playerName: s.player_name,
        photoUrl: s.photo_url,
        playerSlug: s.player_slug,
        statLine: `${s.card_count} card${s.card_count === 1 ? "" : "s"} · ${s.appearances} apps`,
      }));
    }

    renderSpotlight({ cards, targetWrap, aWrap, bWrap, usesDedicatedSlots });
  } catch (err) {
    console.error("[home] spotlight failed:", err);
    const errTarget = usesDedicatedSlots ? aWrap : sharedWrap;
    errTarget.innerHTML = states.error();
    states.bindRetry(errTarget, () => loadSpotlight(root, fixturesState));
  }
}

function statLineFromGoalsAssists(goals = 0, assists = 0) {
  const parts = [];
  if (goals) parts.push(`${goals} goal${goals === 1 ? "" : "s"}`);
  if (assists) parts.push(`${assists} assist${assists === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "Standout performance";
}

function renderSpotlight({ cards, targetWrap, aWrap, bWrap, usesDedicatedSlots }) {
  // Pad/chunk into pairs; placeholder fills any missing slot.
  const placeholder = spotlightPlaceholderCard();

  if (cards.length <= 2) {
    const [first, second] = cards;
    if (usesDedicatedSlots) {
      aWrap.innerHTML = first || placeholder;
      bWrap.innerHTML = second || placeholder;
    } else {
      targetWrap.innerHTML = `<div class="spotlight-row">${first || placeholder}${second || placeholder}</div>`;
    }
    observeLazyImages(usesDedicatedSlots ? aWrap : targetWrap);
    observeLazyImages(usesDedicatedSlots ? bWrap : targetWrap);
    return;
  }

  // More than 2 eligible categories — build paged pairs and slide.
  const pages = [];
  for (let i = 0; i < cards.length; i += 2) {
    pages.push([cards[i], cards[i + 1] || placeholder]);
  }

  const trackHtml = pages
    .map((pair) => `<div class="carousel__slide"><div class="spotlight-row">${pair[0]}${pair[1]}</div></div>`)
    .join("");

  if (usesDedicatedSlots) {
    // Two dedicated columns still slide together as one unit —
    // render the carousel spanning both by putting it in slot A
    // and hiding slot B's own box (kept in DOM/hidden, not removed,
    // to preserve the grid-area CSS wiring).
    aWrap.innerHTML = `<div class="carousel" data-slot="spotlight-carousel"><div class="carousel__track" data-track>${trackHtml}</div></div>`;
    bWrap.innerHTML = "";
    bWrap.style.display = "none";
    const carouselEl = aWrap.querySelector('[data-slot="spotlight-carousel"]');
    initCarousel(carouselEl, { intervalMs: 5000 });
    observeLazyImages(aWrap);
  } else {
    targetWrap.innerHTML = `<div class="carousel" data-slot="spotlight-carousel"><div class="carousel__track" data-track>${trackHtml}</div></div>`;
    const carouselEl = targetWrap.querySelector('[data-slot="spotlight-carousel"]');
    initCarousel(carouselEl, { intervalMs: 5000 });
    observeLazyImages(targetWrap);
  }
}

/* =========================================================
   LATEST NEWS
   (data logic identical to the original loadSecondaryNews —
   only the render target changed from a scroll rail to a
   carousel track)
   ========================================================= */

async function loadSecondaryNews(root, carouselInstances) {
  const carouselRoot = root.querySelector('[data-slot="news-carousel"]');
  const track = carouselRoot.querySelector("[data-track]");

  try {
    const { data, error } = await supabase
      .from("news_posts")
      .select("id, slug, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_NEWS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({ message: "More updates coming soon." });
      return;
    }

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("news", post.id);
        return `
          <div class="carousel__slide">
            <div class="home-carousel-card">
              ${newsCard({
                slug: post.slug,
                title: post.title,
                excerpt: excerptFrom(post.body),
                coverImageUrl: cover,
                publishedAt: post.created_at,
              })}
            </div>
          </div>
        `;
      }),
    );

    track.innerHTML = cards.join("");
    observeLazyImages(track);

    applyResponsiveCarouselBehavior(carouselRoot, carouselInstances);
  } catch (err) {
    console.error("[home] secondary news failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => loadSecondaryNews(root, carouselInstances));
  }
}

/* =========================================================
   LATEST MATCH REPORTS
   (data logic identical to the original loadFeaturedMatchReport
   — only the render target changed)
   ========================================================= */

async function loadFeaturedMatchReport(root, carouselInstances) {
  const carouselRoot = root.querySelector('[data-slot="reports-carousel"]');
  const track = carouselRoot.querySelector("[data-track]");

  try {
    const { data, error } = await supabase
      .from("match_report_posts")
      .select("id, slug, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_MATCH_REPORTS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({
        message: "No match reports yet — check back after the next game.",
      });
      return;
    }

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("match_report", post.id);
        return `
          <div class="carousel__slide">
            <div class="home-carousel-card">
              ${newsCard(
                {
                  slug: post.slug,
                  title: post.title,
                  excerpt: excerptFrom(post.body),
                  coverImageUrl: cover,
                  publishedAt: post.created_at,
                },
                {
                  basePath: "/match-reports",
                  badge: "Match Report",
                },
              )}
            </div>
          </div>
        `;
      }),
    );

    track.innerHTML = cards.join("");
    observeLazyImages(track);

    applyResponsiveCarouselBehavior(carouselRoot, carouselInstances);
  } catch (err) {
    console.error("[home] match reports failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => loadFeaturedMatchReport(root, carouselInstances));
  }
}

/*
 * News / Match Reports: mobile & tablet slide (drag-tracking),
 * desktop shows all 4 statically since they fit the row.
 * Re-checked on resize since the breakpoint crossing needs to
 * toggle autoplay/drag on or off.
 */
function applyResponsiveCarouselBehavior(carouselRoot, carouselInstances) {
  const desktopQuery = window.matchMedia("(min-width: 1200px)");
  let instance = null;

  function apply() {
    if (instance) {
      instance.destroy();
      instance = null;
    }
    if (desktopQuery.matches) {
      carouselRoot.classList.add("home-carousel--grid-desktop");
    } else {
      carouselRoot.classList.remove("home-carousel--grid-desktop");
      instance = initCarousel(carouselRoot, { intervalMs: 5000 });
      carouselInstances.push(instance);
    }
  }

  apply();
  desktopQuery.addEventListener("change", apply);
}

/* =========================================================
   SMALL HTML SAFETY HELPER (unchanged)
   ========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
