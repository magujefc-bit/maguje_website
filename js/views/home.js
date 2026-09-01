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
import { fetchOverlayGradients } from "../utils/overlay.js";

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

  /* HERO — background image from latest gallery upload, with a
     green overlay for the club-themed tint. Greeting is static
     chrome pinned above the carousel, never scrolls with it. */
  .home-hero {
    position: relative;
    background-color: var(--color-pitch-shadow);
    background-size: cover;
    background-position: center;
    border-radius: var(--radius-lg);
    overflow: hidden;
    min-height: 280px;
    width: 100%;
  }

  .home-hero__overlay {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: linear-gradient(
      180deg,
      rgba(9, 38, 20, 0.82) 0%,
      rgba(16, 155, 69, 0.55) 60%,
      rgba(9, 38, 20, 0.85) 100%
    );
  }

  .home-hero__greeting {
    position: relative;
    z-index: 2;
    padding: var(--sp-lg) var(--sp-lg) 0;
  }

  .home-hero__greeting-crest {
    width: clamp(48px, 12vw, 64px);
    height: auto;
    margin-bottom: var(--sp-xs);
  }

  .home-hero__greeting-title {
    color: var(--color-summit-white);
    margin: 0;
    text-shadow: 0 1px 3px rgba(0,0,0,0.35);
  }

  .home-hero-carousel {
    position: relative;
    z-index: 1;
  }

  .home-hero-carousel .carousel__track {
    height: 160px;
  }

  .home-hero-slide {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: var(--sp-md) var(--sp-lg) var(--sp-lg);
    height: 100%;
  }

  .home-hero-slide__title {
    color: var(--color-summit-white);
    margin-bottom: var(--sp-2xs);
    text-shadow: 0 1px 3px rgba(0,0,0,0.35);
  }

  .home-hero-slide__text {
    color: rgba(247,249,246,0.9);
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  .home-hero-slide__badge {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-3xs);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: var(--color-summit-white);
    background: rgba(0,0,0,0.25);
    padding: 2px var(--sp-2xs);
    border-radius: 999px;
    margin-bottom: var(--sp-xs);
    width: fit-content;
  }

  .home-hero-slide__badge--live { color: var(--color-live); }

  .home-kickoff-toast {
    display: flex;
    align-items: center;
    gap: var(--sp-2xs);
    width: fit-content;
    max-width: 100%;
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

  .home-section__title { font-size: var(--fs-xl); min-width: 0; }

  .home-section__link {
    flex: 0 0 auto;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-ridge-green);
    white-space: nowrap;
  }

  .home-fixture-card-wrap { display: flex; flex-direction: column; gap: var(--sp-sm); width: 100%; }
  .home-fixture-card-wrap[hidden] { display: none; }

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

/*
 * Latest gallery upload — same table + ordering as the Gallery
 * page itself (media_library, created_at desc), so the hero
 * background stays in sync automatically with new uploads.
 */
async function fetchLatestGalleryImageUrl() {
  const { data } = await supabase
    .from("media_library")
    .select("url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.url || null;
}

export async function homeView() {
  const cleanupFns = [];

  await viewContainer.render(`
    <div class="container home-page">

           <div class="home-feed">
        <div data-slot="hero-wrap">${skeletons.heroCarousel()}</div>
        <div data-slot="kickoff-toast"></div>
        <div class="home-fixture-card-wrap home-fixture-card-wrap--live" data-slot="live-wrap" hidden></div>
        <div class="home-fixture-card-wrap" data-slot="upcoming-wrap" hidden></div>

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
  const carouselInstances = [];

  // Fixtures data (for hero text + live/upcoming cards), spotlight
  // data (for hero text + spotlight section), and the hero's
  // background image all fetch in parallel, then the hero is
  // built once everything it needs is ready.
  const [fixturesInfo, spotlightItems, heroImageUrl] = await Promise.all([
    loadFixturesData(root),
    loadSpotlightData(),
    fetchLatestGalleryImageUrl(),
  ]);

  buildHero(root.querySelector('[data-slot="hero-wrap"]'), {
    ...fixturesInfo,
    spotlightItems,
    heroImageUrl,
  }, cleanupFns);

  renderSpotlightSection(root, spotlightItems, carouselInstances);
  loadSecondaryNews(root, carouselInstances);
  loadFeaturedMatchReport(root, carouselInstances);

  return {
    cleanup() {
      cleanupFns.forEach((fn) => fn());
      carouselInstances.forEach((c) => c.destroy());
    },
  };
}

/*
 * Fetches live match, next upcoming match, latest news, latest
 * match report. Renders the two independent fixture cards and
 * the kickoff toast directly. Returns the raw data so the hero
 * can build its own summary slides from the same information.
 */
async function loadFixturesData(root) {
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
      supabase.from("matches").select(`id, slug, match_date, match_time, our_score, opponent_score, opponent_team_id, is_home`).eq("is_live", true).eq("is_internal", true).limit(1),
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

    observeLazyImages(liveWrap);
    observeLazyImages(upcomingWrap);

    startKickoffToast(root, nextUpcoming);

    return { liveMatch, nextUpcoming, latestNews, latestReport };
  } catch (err) {
    console.error("[home] fixtures load failed:", err);
    liveWrap.hidden = true;
    upcomingWrap.hidden = true;
    return { liveMatch: null, nextUpcoming: null, latestNews: null, latestReport: null };
  }
}

function getKickoffTime(match) {
  const value = combineDateTime(match?.match_date, match?.match_time);
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/*
 * HERO
 * Background: latest gallery image + green overlay (falls back
 * to the plain pitch-shadow color if no gallery image exists).
 * Greeting is static chrome, pinned above the carousel — never
 * part of the sliding track.
 * Carousel slides, in order: Live, Upcoming, News, Match Report,
 * then one short slide per currently-eligible Spotlight category.
 */
function buildHero(heroWrap, { liveMatch, nextUpcoming, latestNews, latestReport, spotlightItems, heroImageUrl }, cleanupFns) {
  const slides = [];

  if (liveMatch) {
    const opponentName = liveMatch.opponent?.name || "our opponents";
    const venueBit = liveMatch.is_home === false ? ` at ${liveMatch.venue || opponentName + "'s ground"}` : "";
    slides.push(`
      <div class="home-hero-slide">
        <span class="home-hero-slide__badge home-hero-slide__badge--live">${liveIndicator("Live")}</span>
        <h2 class="text-display-md home-hero-slide__title">Maguje is playing ${escapeHtml(opponentName)}${venueBit}</h2>
        <p class="text-body-sm home-hero-slide__text">Don't miss live updates for this match.</p>
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
        <h2 class="text-display-md home-hero-slide__title">Maguje will play ${escapeHtml(opponentName)}${venueBit}, at ${kickoffLabel}</h2>
        <p class="text-body-sm home-hero-slide__text">Come support our boys — live updates might also be available, stay tuned.</p>
      </div>
    `);
  }

  if (latestNews) {
    slides.push(`
      <div class="home-hero-slide">
        <h2 class="text-display-md home-hero-slide__title">Club news awaiting you</h2>
        <p class="text-body-sm home-hero-slide__text">Scroll down to read.</p>
      </div>
    `);
  }

  if (latestReport) {
    slides.push(`
      <div class="home-hero-slide">
        <h2 class="text-display-md home-hero-slide__title">A match report is awaiting you</h2>
        <p class="text-body-sm home-hero-slide__text">Scroll down to read.</p>
      </div>
    `);
  }

  (spotlightItems || []).forEach((item) => {
    slides.push(`
      <div class="home-hero-slide">
        <span class="home-hero-slide__badge">${escapeHtml(item.label)}</span>
        <h2 class="text-display-md home-hero-slide__title">${escapeHtml(item.playerName)}</h2>
        <p class="text-body-sm home-hero-slide__text">${escapeHtml(item.statLine)}</p>
      </div>
    `);
  });

  if (!slides.length) {
    slides.push(`
      <div class="home-hero-slide">
        <h2 class="text-display-md home-hero-slide__title">Rooted in the community</h2>
        <p class="text-body-sm home-hero-slide__text">Playing for the ridge.</p>
      </div>
    `);
  }

  const bgStyle = heroImageUrl ? ` style="background-image: url('${heroImageUrl}');"` : "";

  heroWrap.innerHTML = `
    <div class="home-hero"${bgStyle}>
      <div class="home-hero__overlay"></div>
      <div class="home-hero__greeting">
        <img src="/assets/maguje-crest.png" alt="" class="home-hero__greeting-crest">
        <h1 class="text-display-lg home-hero__greeting-title">${getGreeting()}, welcome to Maguje FC</h1>
      </div>
      <div class="home-hero-carousel carousel" data-slot="hero-carousel">
        <div class="carousel__track" data-track>
          ${slides.map((s) => `<div class="carousel__slide">${s}</div>`).join("")}
        </div>
      </div>
    </div>
  `;

  const carouselRoot = heroWrap.querySelector('[data-slot="hero-carousel"]');
  const instance = initCarousel(carouselRoot);
  cleanupFns.push(() => instance.destroy());
}

function startKickoffToast(root, match) {
  if (KICKOFF_TOAST_INTERVAL) {
    clearInterval(KICKOFF_TOAST_INTERVAL);
    KICKOFF_TOAST_INTERVAL = null;
  }

  const slot = root.querySelector('[data-slot="kickoff-toast"]');
  if (!slot) return;

  if (!match) {
    slot.innerHTML = "";
    return;
  }

  const kickoffIso = combineDateTime(match.match_date, match.match_time);
  const target = kickoffIso ? new Date(kickoffIso).getTime() : NaN;

  if (Number.isNaN(target)) {
    slot.innerHTML = "";
    return;
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
 * PLAYER SPOTLIGHT — fetch only, no DOM. Returns an array of
 * eligible items (ties excluded), each with everything needed
 * for both the hero's short slide text and the full spotlight
 * card. Returns [] if fetch fails or nothing is eligible yet —
 * callers handle the placeholder case themselves.
 */
async function loadSpotlightData() {
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

    const items = [];

    if (matchStandout?.[0] && !matchStandout[0].is_tied) {
      const s = matchStandout[0];
      items.push({
        label: "Match Standout",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals_in_match, s.assists_in_match),
        meta: s.opponent_name ? `vs ${s.opponent_name}` : "",
      });
    }
    if (compStandout?.[0] && !compStandout[0].is_tied) {
      const s = compStandout[0];
      items.push({
        label: "Competition Standout",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals, s.assists),
      });
    }
    if (topScorers?.[0] && !topScorers[0].is_tied) {
      const s = topScorers[0];
      items.push({
        label: "Top Scorer",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.goals} goal${s.goals === 1 ? "" : "s"}`,
      });
    }
    if (topAssists?.[0] && !topAssists[0].is_tied) {
      const s = topAssists[0];
      items.push({
        label: "Top Assists",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.assists} assist${s.assists === 1 ? "" : "s"}`,
      });
    }
    if (discipline?.[0] && !discipline[0].is_tied) {
      const s = discipline[0];
      items.push({
        label: "Discipline",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.card_count} card${s.card_count === 1 ? "" : "s"} · ${s.appearances} apps`,
      });
    }

    return items;
  } catch (err) {
    console.error("[home] spotlight fetch failed:", err);
    return [];
  }
}

function statLineFromGoalsAssists(goals = 0, assists = 0) {
  const parts = [];
  if (goals) parts.push(`${goals} goal${goals === 1 ? "" : "s"}`);
  if (assists) parts.push(`${assists} assist${assists === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "Standout performance";
}

/*
 * Renders the dedicated Spotlight section (single-card-at-a-time
 * carousel) from data already fetched by loadSpotlightData().
 */
function renderSpotlightSection(root, spotlightItems, carouselInstances) {
  const carouselRoot = root.querySelector('[data-slot="spotlight-carousel"]');
  const track = carouselRoot.querySelector("[data-track]");

  let cardsHtml = (spotlightItems || []).map((item) =>
    spotlightCard({
      label: item.label,
      playerName: item.playerName,
      photoUrl: item.photoUrl,
      playerSlug: item.playerSlug,
      statLine: item.statLine,
      meta: item.meta,
    }),
  );

  if (!cardsHtml.length) {
    cardsHtml = [spotlightPlaceholderCard(), spotlightPlaceholderCard()];
  }

  track.innerHTML = cardsHtml.map((c) => `<div class="carousel__slide">${c}</div>`).join("");
  observeLazyImages(track);

  const instance = initCarousel(carouselRoot);
  carouselInstances.push(instance);
}

async function loadSecondaryNews(root, carouselInstances) {
  const carouselRoot = root.querySelector('[data-slot="news-carousel"]');
  const track = carouselRoot.querySelector("[data-track]");

  try {
    const { data, error } = await supabase
      .from("news_posts")
      .select("id, slug, title, body, created_at, cover_overlay_id")
      .order("created_at", { ascending: false })
      .limit(MAX_NEWS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({ message: "More updates coming soon." });
      return;
    }

    const overlayMap = await fetchOverlayGradients(supabase, data.map((p) => p.cover_overlay_id));

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("news", post.id);
        return `<div class="carousel__slide">${newsCard({
          slug: post.slug,
          title: post.title,
          excerpt: excerptFrom(post.body),
          coverImageUrl: cover,
          publishedAt: post.created_at,
          overlayGradient: overlayMap.get(post.cover_overlay_id) || null,
        })}</div>`;
      }),
    );

    track.innerHTML = cards.join("");
    observeLazyImages(track);

    const instance = initCarousel(carouselRoot);
    carouselInstances.push(instance);
  } catch (err) {
    console.error("[home] secondary news failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => loadSecondaryNews(root, carouselInstances));
  }
}

async function loadFeaturedMatchReport(root, carouselInstances) {
  const carouselRoot = root.querySelector('[data-slot="reports-carousel"]');
  const track = carouselRoot.querySelector("[data-track]");

  try {
    const { data, error } = await supabase
      .from("match_report_posts")
      .select("id, slug, title, body, created_at, cover_overlay_id")
      .order("created_at", { ascending: false })
      .limit(MAX_MATCH_REPORTS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({ message: "No match reports yet — check back after the next game." });
      return;
    }

    const overlayMap = await fetchOverlayGradients(supabase, data.map((p) => p.cover_overlay_id));

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("match_report", post.id);
        return `<div class="carousel__slide">${newsCard(
          { slug: post.slug, title: post.title, excerpt: excerptFrom(post.body), coverImageUrl: cover, publishedAt: post.created_at, overlayGradient: overlayMap.get(post.cover_overlay_id) || null },
          { basePath: "/match-reports", badge: "Match Report" },
        )}</div>`;
      }),
    );

    track.innerHTML = cards.join("");
    observeLazyImages(track);

    const instance = initCarousel(carouselRoot);
    carouselInstances.push(instance);
  } catch (err) {
    console.error("[home] match reports failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => loadFeaturedMatchReport(root, carouselInstances));
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
