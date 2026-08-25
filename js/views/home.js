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
    .home-page.container { max-width: 1600px; }
  }

  @media (min-width: 1920px) {
    .home-page.container { max-width: 1800px; }
  }

  .home-page * { min-width: 0; }

  /* =========================================================
     ROW 1 — Hero + Live + Upcoming + Spotlight (inline)

     Single shared grid. DOM order = priority order:
     hero, live, upcoming, spotlight-inline. Column count
     changes per breakpoint; items just wrap naturally, so
     there's never a fixed empty cell — column count always
     tracks how many items actually exist.

     Desktop only: if BOTH live and upcoming exist, spotlight
     is left OUT of this grid entirely (row1 = hero+live+
     upcoming = exactly 3) and instead renders in its own
     dedicated 4-column row further down the page. That
     decision is made in JS (see placeSpotlight()).
     ========================================================= */

  .feed-row1 {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-lg);
    width: 100%;
  }

  .feed-row1 > * { min-width: 0; width: 100%; }

  @media (min-width: 768px) and (max-width: 1199px) {
    .feed-row1 { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 1200px) {
    .feed-row1 { grid-template-columns: repeat(3, 1fr); }

    /* Only case where row1 would otherwise leave a gap:
       hero + spotlight alone, nothing else available.
       Spotlight widens to fill both remaining columns. */
    .feed-row1__spotlight--wide {
      grid-column: span 2;
    }
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
    width: 100%;
  }

  .home-hero-carousel::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(247,249,246,0.04) 0 2px, transparent 2px 40px),
      repeating-linear-gradient(90deg, rgba(247,249,246,0.04) 0 2px, transparent 2px 40px);
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

  .home-kickoff-toast__time { font-family: var(--font-mono); font-weight: 700; }
  .home-kickoff-toast__opp { color: rgba(247,249,246,0.75); overflow: hidden; text-overflow: ellipsis; }

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

  .home-section__title { font-size: var(--fs-xl); min-width: 0; }

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

  .home-fixture-card-wrap--live .home-fixture-card-wrap__label { color: var(--color-live); }

  /* =========================================================
     SPOTLIGHT — inline mode (lives inside .feed-row1)
     ========================================================= */

  .home-spotlight-inline { width: 100%; min-width: 0; }

  .spotlight-row {
    display: flex;
    gap: var(--sp-sm);
    width: 100%;
    min-width: 0;
  }

  /* =========================================================
     QUAD ROW — shared by Spotlight-standalone, News, Reports
     Mobile: 1 card visible, native scroll+snap
     Tablet: 2 cards visible, native scroll+snap
     Desktop: static grid, 4 across, no scroll
     (Spotlight-standalone may exceed 4 items — in that one
     case desktop stays a carousel instead of going static;
     controlled via .quad-row--overflow)
     ========================================================= */

  .quad-row .carousel__slide { flex: 0 0 100%; }

  @media (min-width: 768px) {
    .quad-row .carousel__slide { flex: 0 0 50%; }
  }

  @media (min-width: 1200px) {
    .quad-row:not(.quad-row--overflow) .carousel__track {
      overflow: visible;
      scroll-snap-type: none;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--sp-sm);
    }

    .quad-row:not(.quad-row--overflow) .carousel__slide {
      flex: none;
      width: auto;
      scroll-snap-align: none;
    }
  }

  .quad-row__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
    min-height: 140px;
    padding: var(--sp-sm);
    border: 1px dashed var(--color-line);
    border-radius: var(--radius-md);
    color: rgba(16,36,26,0.4);
    font-size: var(--fs-sm);
  }
`,
);

let MAGUJE_TEAM_ID = null;
let KICKOFF_TOAST_INTERVAL = null;

const MAX_FIXTURES = 4;
const MAX_NEWS = 4;
const MAX_MATCH_REPORTS = 4;
const KICKOFF_TOAST_WINDOW_START = (24 + 12) * 60 * 60 * 1000;
const KICKOFF_TOAST_WINDOW_END = 10 * 60 * 1000;
const GREETING_SEEN_KEY = "maguje_home_greeting_seen";

/* =========================================================
   UNCHANGED HELPERS (identical to before)
   ========================================================= */

export async function getMagujeTeamId() {
  if (MAGUJE_TEAM_ID) return MAGUJE_TEAM_ID;
  const { data } = await supabase.from("teams").select("id").ilike("name", "%maguje%").limit(1).maybeSingle();
  MAGUJE_TEAM_ID = data?.id || null;
  return MAGUJE_TEAM_ID;
}

export async function getPostId(table, slug) {
  const { data } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();
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
  return plain.length > len ? plain.slice(0, len) + "…" : plain;
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
      (row.live_state && row.live_state !== "not_started" && row.live_state !== "full_time" ? "live" : row.status),
    kickoffAt: combineDateTime(row.match_date, row.match_time),
    homeScore: isAway ? row.opponent_score : row.our_score,
    awayScore: isAway ? row.our_score : row.opponent_score,
    homeTeam: isAway
      ? { name: row.opponent?.name || "TBD", shortName: row.opponent?.name, crestUrl: row.opponent?.logo_url }
      : { name: "Maguje FC", shortName: "Maguje", crestUrl: "/assets/maguje-crest.png" },
    awayTeam: isAway
      ? { name: "Maguje FC", shortName: "Maguje", crestUrl: "/assets/maguje-crest.png" }
      : { name: row.opponent?.name || "TBD", shortName: row.opponent?.name, crestUrl: row.opponent?.logo_url },
  };
}

/* =========================================================
   HOME VIEW
   ========================================================= */

export async function homeView() {
  const cleanupFns = [];

  await viewContainer.render(`
    <div class="container home-page">

      <div data-slot="kickoff-toast"></div>

      <div class="feed-row1">
        <div data-slot="hero-wrap">${skeletons.heroCarousel()}</div>
        <div class="home-fixture-card-wrap home-fixture-card-wrap--live" data-slot="live-wrap" hidden></div>
        <div class="home-fixture-card-wrap" data-slot="upcoming-wrap" hidden></div>
        <div class="home-spotlight-inline" data-slot="spotlight-inline-wrap" hidden></div>
      </div>

      <section class="home-section" data-slot="spotlight-standalone-section" hidden>
        <div class="home-section__header">
          <h2 class="home-section__title">Player Spotlight</h2>
        </div>
        <div class="carousel quad-row" data-slot="spotlight-standalone">
          <div class="carousel__track" data-track></div>
        </div>
      </section>

      <section class="home-section" data-slot="news-section">
        <div class="home-section__header">
          <h2 class="home-section__title">Latest Updates</h2>
          <a href="/news" class="home-section__link">All news →</a>
        </div>
        <div class="carousel quad-row" data-slot="news-carousel">
          <div class="carousel__track" data-track>${skeletons.newsList(2)}</div>
        </div>
      </section>

      <section class="home-section" data-slot="match-report-section">
        <div class="home-section__header">
          <h2 class="home-section__title">Latest Match Reports</h2>
          <a href="/match-reports" class="home-section__link">All reports →</a>
        </div>
        <div class="carousel quad-row" data-slot="reports-carousel">
          <div class="carousel__track" data-track>${skeletons.newsList(2)}</div>
        </div>
      </section>

    </div>
  `);

  const root = document.querySelector("#app");
  const carouselInstances = [];

  const fixturesInfo = await loadFixturesAndHero(root, cleanupFns);
  placeSpotlight(root, fixturesInfo, carouselInstances, cleanupFns);
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
   ========================================================= */

async function loadFixturesAndHero(root, cleanupFns) {
  const heroWrap = root.querySelector('[data-slot="hero-wrap"]');
  const liveWrap = root.querySelector('[data-slot="live-wrap"]');
  const upcomingWrap = root.querySelector('[data-slot="upcoming-wrap"]');

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
      supabase.from("matches").select(`id, slug, match_date, match_time, our_score, opponent_score, opponent_team_id, is_home`).eq("is_live", true).limit(1),
      supabase.from("matches").select(`id, slug, match_date, match_time, our_score, opponent_score, opponent_team_id, is_home, status, venue`).eq("is_internal", true).in("status", ["scheduled", "pending"]).gte("match_date", today).order("match_date", { ascending: true }).order("match_time", { ascending: true }).limit(MAX_FIXTURES),
      supabase.from("news_posts").select("id, slug, title, created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("match_report_posts").select("id, slug, title, created_at").order("created_at", { ascending: false }).limit(1),
    ]);

    if (liveErr || upcomingErr || newsErr || reportErr) throw (liveErr || upcomingErr || newsErr || reportErr);

    const allFetched = [...(live || []), ...(upcoming || [])];
    const uniqueFetched = Array.from(new Map(allFetched.map((m) => [m.id, m])).values());
    const withOpp = uniqueFetched.length ? await supabase.attachOpponents(uniqueFetched) : [];
    const mapById = new Map(withOpp.map((m) => [m.id, m]));

    liveMatch = live?.length ? mapById.get(live[0].id) || live[0] : null;

    const upcomingMatches = (upcoming || [])
      .map((m) => mapById.get(m.id) || m)
      .sort((a, b) => getKickoffTime(a) - getKickoffTime(b));

    nextUpcoming = upcomingMatches[0] || null;
    latestNews = newsRows?.[0] || null;
    latestReport = reportRows?.[0] || null;

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

    if (nextUpcoming) {
      upcomingWrap.hidden = false;
      upcomingWrap.innerHTML = `
        <div class="home-fixture-card-wrap__label">Upcoming</div>
        ${matchCard(toExternalMatch({ ...nextUpcoming, status: nextUpcoming.status || "scheduled" }), { href: "/fixtures" })}
      `;
    } else {
      upcomingWrap.hidden = true;
      upcomingWrap.innerHTML = "";
    }

    buildHero(heroWrap, { liveMatch, nextUpcoming, latestNews, latestReport }, cleanupFns);

    observeLazyImages(liveWrap);
    observeLazyImages(upcomingWrap);

    cleanupFns.push(startKickoffToast(root, nextUpcoming));

    return { hasLive: !!liveMatch, hasUpcoming: !!nextUpcoming };
  } catch (err) {
    console.error("[home] fixtures/hero load failed:", err);
    heroWrap.innerHTML = states.error();
    states.bindRetry(heroWrap, () => loadFixturesAndHero(root, cleanupFns));
    return { hasLive: false, hasUpcoming: false };
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
    const venueBit = liveMatch.is_home === false ? ` at ${liveMatch.venue || opponentName + "'s ground"}` : "";
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
    const venueBit = nextUpcoming.is_home === false ? ` at ${nextUpcoming.venue || opponentName + "'s ground"}` : "";
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
  const skipIndicesOnLoop = greetingAlreadySeen ? [] : [0];
  const instance = initCarousel(carouselRoot, { skipIndicesOnLoop });
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
    const inWindow = diff <= KICKOFF_TOAST_WINDOW_START && diff > KICKOFF_TOAST_WINDOW_END;
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
   PLAYER SPOTLIGHT — fetch once, then decide placement
   (inline in .feed-row1, or standalone 4-col row) responsively
   ========================================================= */

async function placeSpotlight(root, { hasLive, hasUpcoming }, carouselInstances, cleanupFns) {
  const inlineWrap = root.querySelector('[data-slot="spotlight-inline-wrap"]');
  const standaloneSection = root.querySelector('[data-slot="spotlight-standalone-section"]');
  const standaloneRoot = root.querySelector('[data-slot="spotlight-standalone"]');
  const standaloneTrack = standaloneRoot.querySelector("[data-track]");

  let cards = [];

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

    if (matchStandout?.[0] && !matchStandout[0].is_tied) {
      const s = matchStandout[0];
      cards.push(spotlightCard({
        label: "Match Standout",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals_in_match, s.assists_in_match),
        meta: s.opponent_name ? `vs ${escapeHtml(s.opponent_name)}` : "",
      }));
    }
    if (compStandout?.[0] && !compStandout[0].is_tied) {
      const s = compStandout[0];
      cards.push(spotlightCard({
        label: "Competition Standout",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals, s.assists),
      }));
    }
    if (topScorers?.[0] && !topScorers[0].is_tied) {
      const s = topScorers[0];
      cards.push(spotlightCard({
        label: "Top Scorer",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.goals} goal${s.goals === 1 ? "" : "s"}`,
      }));
    }
    if (topAssists?.[0] && !topAssists[0].is_tied) {
      const s = topAssists[0];
      cards.push(spotlightCard({
        label: "Top Assists",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.assists} assist${s.assists === 1 ? "" : "s"}`,
      }));
    }
    if (discipline?.[0] && !discipline[0].is_tied) {
      const s = discipline[0];
      cards.push(spotlightCard({
        label: "Discipline",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.card_count} card${s.card_count === 1 ? "" : "s"} · ${s.appearances} apps`,
      }));
    }
  } catch (err) {
    console.error("[home] spotlight fetch failed:", err);
    cards = [];
  }

  // Before ANY match this season, or fetch failure: two placeholders.
  if (!cards.length) {
    cards = [spotlightPlaceholderCard(), spotlightPlaceholderCard()];
  }

  function renderInline() {
    inlineWrap.hidden = false;
    standaloneSection.hidden = true;

    const onlyOptionInRow1 = !hasLive && !hasUpcoming;
    inlineWrap.classList.toggle("feed-row1__spotlight--wide", onlyOptionInRow1);

    if (cards.length <= 2) {
      const [a, b] = cards;
      inlineWrap.innerHTML = `<div class="spotlight-row">${a || spotlightPlaceholderCard()}${b || spotlightPlaceholderCard()}</div>`;
      observeLazyImages(inlineWrap);
      return;
    }

    // More than 2 categories eligible — paginate as pairs, carousel.
    const pages = [];
    for (let i = 0; i < cards.length; i += 2) {
      pages.push(`<div class="carousel__slide"><div class="spotlight-row">${cards[i]}${cards[i + 1] || spotlightPlaceholderCard()}</div></div>`);
    }
    inlineWrap.innerHTML = `<div class="carousel" data-slot="spotlight-inline-carousel"><div class="carousel__track" data-track>${pages.join("")}</div></div>`;
    const carouselEl = inlineWrap.querySelector('[data-slot="spotlight-inline-carousel"]');
    const instance = initCarousel(carouselEl);
    carouselInstances.push(instance);
    observeLazyImages(inlineWrap);
  }

  function renderStandalone() {
    inlineWrap.hidden = true;
    standaloneSection.hidden = false;

    const overflow = cards.length > 4;
    standaloneRoot.classList.toggle("quad-row--overflow", overflow);

    const items = [...cards];
    if (!overflow) {
      while (items.length < 4) items.push(`<div class="quad-row__placeholder">More insights coming soon.</div>`);
    }

    standaloneTrack.innerHTML = items
      .map((html) => `<div class="carousel__slide"><div class="home-carousel-card">${html}</div></div>`)
      .join("");

    const instance = initCarousel(standaloneRoot);
    carouselInstances.push(instance);
    observeLazyImages(standaloneRoot);
  }

  function apply() {
    // Standalone only makes sense on desktop AND only when both
    // Live and Upcoming already filled row1's 3 slots.
    const isDesktop = window.matchMedia("(min-width: 1200px)").matches;
    const goesStandalone = isDesktop && hasLive && hasUpcoming;
    inlineWrap.innerHTML = "";
    standaloneTrack.innerHTML = "";
    if (goesStandalone) {
      renderStandalone();
    } else {
      renderInline();
    }
  }

  apply();

  const desktopQuery = window.matchMedia("(min-width: 1200px)");
  const onChange = () => apply();
  desktopQuery.addEventListener("change", onChange);
  cleanupFns.push(() => desktopQuery.removeEventListener("change", onChange));
}

function statLineFromGoalsAssists(goals = 0, assists = 0) {
  const parts = [];
  if (goals) parts.push(`${goals} goal${goals === 1 ? "" : "s"}`);
  if (assists) parts.push(`${assists} assist${assists === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "Standout performance";
}

/* =========================================================
   LATEST NEWS (data logic unchanged; render target + desktop
   static-grid/placeholder behavior updated)
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
        return newsCard({
          slug: post.slug,
          title: post.title,
          excerpt: excerptFrom(post.body),
          coverImageUrl: cover,
          publishedAt: post.created_at,
        });
      }),
    );

    renderQuadRow(carouselRoot, track, cards, carouselInstances);
  } catch (err) {
    console.error("[home] secondary news failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => loadSecondaryNews(root, carouselInstances));
  }
}

/* =========================================================
   LATEST MATCH REPORTS (same pattern)
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
      track.innerHTML = states.empty({ message: "No match reports yet — check back after the next game." });
      return;
    }

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("match_report", post.id);
        return newsCard(
          { slug: post.slug, title: post.title, excerpt: excerptFrom(post.body), coverImageUrl: cover, publishedAt: post.created_at },
          { basePath: "/match-reports", badge: "Match Report" },
        );
      }),
    );

    renderQuadRow(carouselRoot, track, cards, carouselInstances);
  } catch (err) {
    console.error("[home] match reports failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => loadFeaturedMatchReport(root, carouselInstances));
  }
}

/*
 * Shared quad-row renderer: mobile shows 1/view, tablet 2/view
 * (native scroll+snap, CSS-driven), desktop shows a static 4-up
 * grid, padded with placeholder cards if fewer than 4 exist.
 * News/Reports never exceed 4 (fetch is capped), so no overflow
 * case here — that's only relevant for Spotlight-standalone.
 */
function renderQuadRow(carouselRoot, track, cardsHtml, carouselInstances) {
  const items = [...cardsHtml];
  while (items.length < 4) {
    items.push(`<div class="quad-row__placeholder">More coming soon.</div>`);
  }

  track.innerHTML = items
    .map((html) => `<div class="carousel__slide"><div class="home-carousel-card">${html}</div></div>`)
    .join("");

  observeLazyImages(track);

  const instance = initCarousel(carouselRoot);
  carouselInstances.push(instance);
}

/* =========================================================
   SMALL HTML SAFETY HELPER (unchanged)
   ========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
