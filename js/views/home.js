import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchCard } from "../components/match-card.js";
import { newsCard } from "../components/news-card.js";
import { standingsTable } from "../components/standings-table.js";
import { liveIndicator } from "../components/controls.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";

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
     HERO
     ========================================================= */

  .home-hero-split {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-md);
    padding-block: var(--sp-lg);
    width: 100%;
    min-width: 0;
  }

  @media (min-width: 768px) and (max-width: 1199px) {
    .home-hero-split {
      grid-template-columns: 3fr 1fr;
      align-items: stretch;
    }
  }

  @media (min-width: 1200px) {
    .home-hero-split {
      grid-template-columns: 1fr 1fr;
      align-items: stretch;
    }
  }

  .home-hero {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: var(--color-pitch-shadow);
    border-radius: var(--radius-lg);
    padding: var(--sp-xl) var(--sp-lg);
    overflow: hidden;
    min-height: 280px;
    min-width: 0;
  }

  .home-hero::before {
    content: "";
    position: absolute;
    inset: 0;
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

  .home-hero__crest {
    width: clamp(56px, 8vw, 84px);
    height: auto;
    margin-bottom: var(--sp-sm);
    position: relative;
  }

  .home-hero__title {
    color: var(--color-summit-white);
    position: relative;
    margin-bottom: var(--sp-2xs);
  }

  .home-hero__tagline {
    color: rgba(247,249,246,0.75);
    position: relative;
    max-width: 42ch;
  }

  /* =========================================================
     KICKOFF REMINDER TOAST
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
     LIVE
     ========================================================= */

  .home-live-banner {
    background: rgba(196,59,59,0.06);
    border: 1px solid var(--color-live);
    border-radius: var(--radius-md);
    padding: var(--sp-sm);
    margin-bottom: var(--sp-md);
    overflow: hidden;
  }

  .home-live-banner__label {
    margin-bottom: var(--sp-xs);
  }

  /* =========================================================
     FIXTURES
     ========================================================= */

  .home-match-pair {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    min-width: 0;
    width: 100%;
  }

  .home-match-pair__label {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: rgba(16,36,26,0.5);
    margin-bottom: var(--sp-3xs);
  }

  /*
   * Horizontal fixture rail.
   *
   * Important:
   * The padding-right creates enough space for the final card
   * to scroll completely into view.
   */
  .home-fixtures-scroll {
    display: flex;
    gap: var(--sp-sm);
    width: 100%;
    max-width: 100%;
    min-width: 0;

    overflow-x: auto;
    overflow-y: hidden;

    padding: 0 var(--sp-xs) var(--sp-sm) 0;

    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;

    scrollbar-width: thin;
  }

  .home-fixture-card {
    flex: 0 0 86%;
    width: 86%;
    min-width: 0;
    max-width: 420px;
    scroll-snap-align: start;
  }

  @media (min-width: 600px) {
    .home-fixture-card {
      flex-basis: 56%;
      width: 56%;
    }
  }

  @media (min-width: 900px) {
    .home-fixture-card {
      flex-basis: 42%;
      width: 42%;
    }
  }

  @media (min-width: 1200px) {
    .home-fixture-card {
      flex-basis: 31%;
      width: 31%;
    }
  }

  .home-fixture-card > * {
    width: 100%;
    max-width: 100%;
  }

  /* =========================================================
     STANDINGS
     ========================================================= */

  .home-standings-section {
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  /*
   * Each competition is its own compact homepage card.
   * This is deliberately NOT the full standings page.
   */
  .home-standings-scroll {
    display: flex;
    gap: var(--sp-sm);

    width: 100%;
    max-width: 100%;
    min-width: 0;

    overflow-x: auto;
    overflow-y: hidden;

    padding: 0 var(--sp-xs) var(--sp-sm) 0;

    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;

    scrollbar-width: thin;
  }

  .home-standings-card {
    flex: 0 0 92%;
    width: 92%;
    max-width: 620px;
    min-width: 0;

    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);

    padding: var(--sp-sm);

    overflow: hidden;

    scroll-snap-align: start;
  }

  @media (min-width: 600px) {
    .home-standings-card {
      flex-basis: 70%;
      width: 70%;
    }
  }

  @media (min-width: 900px) {
    .home-standings-card {
      flex-basis: 55%;
      width: 55%;
    }
  }

  @media (min-width: 1200px) {
    .home-standings-card {
      flex-basis: 48%;
      width: 48%;
    }
  }

  .home-standings-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-xs);

    margin-bottom: var(--sp-xs);
    padding-bottom: var(--sp-xs);

    border-bottom: 1px solid var(--color-line);

    min-width: 0;
  }

  .home-standings-card__title {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--color-pitch-shadow);

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .home-standings-card__hint {
    flex: 0 0 auto;
    font-size: var(--fs-xs);
    color: rgba(16,36,26,0.45);
    white-space: nowrap;
  }

  /*
   * Prevent the standings table itself from pushing the
   * homepage outside the viewport.
   */
  .home-standings-card .standings-table,
  .home-standings-card table {
    width: 100%;
    max-width: 100%;
  }

  .home-standings-card table {
    table-layout: fixed;
  }

  /* =========================================================
     LATEST NEWS
     ========================================================= */

  .home-news-scroll {
    display: flex;
    gap: var(--sp-sm);

    width: 100%;
    max-width: 100%;
    min-width: 0;

    overflow-x: auto;
    overflow-y: hidden;

    padding: 0 var(--sp-xs) var(--sp-sm) 0;

    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;

    scrollbar-width: thin;
  }

  .home-news-card {
    flex: 0 0 86%;
    width: 86%;
    min-width: 0;
    max-width: 420px;

    scroll-snap-align: start;
  }

  @media (min-width: 600px) {
    .home-news-card {
      flex-basis: 56%;
      width: 56%;
    }
  }

  @media (min-width: 900px) {
    .home-news-card {
      flex-basis: 42%;
      width: 42%;
    }
  }

  @media (min-width: 1200px) {
    .home-news-card {
      flex-basis: 31%;
      width: 31%;
    }
  }

  .home-news-card > * {
    width: 100%;
    max-width: 100%;
  }

  /* =========================================================
     DESKTOP LAYOUT
     ========================================================= */

  .home-main-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-lg);
    width: 100%;
    min-width: 0;
  }

  @media (min-width: 1000px) {
    .home-main-grid {
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
      align-items: start;
    }
  }

  .home-main-grid > * {
    min-width: 0;
    max-width: 100%;
  }
`,
);

let MAGUJE_TEAM_ID = null;
let KICKOFF_TOAST_INTERVAL = null;

const MAX_FIXTURES = 4;
const MAX_COMPETITIONS = 4;
const MAX_NEWS = 4;
const MAX_MATCH_REPORTS = 4;
const STANDINGS_WINDOW = 3;
const KICKOFF_TOAST_WINDOW_START = (24 + 12) * 60 * 60 * 1000; // 1 day 12 hours
const KICKOFF_TOAST_WINDOW_END = 10 * 60 * 1000; // 10 minutes

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

      <!-- HERO -->
      <div class="home-hero-split">

        <div class="home-hero">
          <img
            src="/assets/maguje-crest.png"
            alt=""
            class="home-hero__crest"
          >

          <h1 class="text-display-2xl home-hero__title">
            Maguje FC
          </h1>

          <p class="text-body-md home-hero__tagline">
            Rooted in the community. Playing for the ridge.
          </p>
        </div>

        <div
          class="home-news-featured-slot"
          data-slot="featured-news"
        >
          ${skeletons.newsList(1)}
        </div>

      </div>

      <!-- KICKOFF REMINDER -->
      <div data-slot="kickoff-toast"></div>

      <!-- LIVE -->
      <div
        id="home-live-slot"
        data-slot="live"
      ></div>

      <!-- MAIN CONTENT -->
      <div class="home-main-grid">

        <!-- FIXTURES -->
        <section class="home-section">

          <div class="home-section__header">
            <h2 class="home-section__title">
              Fixtures
            </h2>

            <a
              href="/fixtures"
              class="home-section__link"
            >
              All matches →
            </a>
          </div>

          <div
            class="home-match-pair"
            data-slot="match-pair"
          >
            ${skeletons.matchList(2)}
          </div>

        </section>

        <!-- STANDINGS -->
        <section class="home-section home-standings-section">

          <div class="home-section__header">
            <h2 class="home-section__title">
              Standings
            </h2>

            <a
              href="/standings"
              class="home-section__link"
            >
              Full table →
            </a>
          </div>

          <div data-slot="standings">
            ${skeletons.standings(5)}
          </div>

        </section>

      </div>

      <!-- LATEST NEWS -->
      <section
        class="home-section"
        data-slot="news-section"
      >

        <div class="home-section__header">
          <h2 class="home-section__title">
            Latest Updates
          </h2>

          <a
            href="/news"
            class="home-section__link"
          >
            All news →
          </a>
        </div>

        <div
          class="home-news-scroll"
          data-slot="news-grid"
        >
          ${skeletons.newsList(2)}
        </div>

      </section>

      <!-- LATEST MATCH REPORTS -->
      <section
        class="home-section"
        data-slot="match-report-section"
      >

        <div class="home-section__header">
          <h2 class="home-section__title">
            Latest Match Reports
          </h2>

          <a
            href="/match-reports"
            class="home-section__link"
          >
            All reports →
          </a>
        </div>

        <div
          class="home-news-scroll"
          data-slot="match-report-slot"
        >
          ${skeletons.newsList(2)}
        </div>

      </section>

    </div>
  `);

  const root = document.querySelector("#app");

  loadFeaturedNews(root);
  loadLiveAndMatches(root, cleanupFns);
  loadStandings(root);
  loadSecondaryNews(root);
  loadFeaturedMatchReport(root);

  return {
    cleanup() {
      cleanupFns.forEach((fn) => fn());
    },
  };
}

/* =========================================================
   FEATURED NEWS
   ========================================================= */

async function loadFeaturedNews(root) {
  const slot = root.querySelector(
    '[data-slot="featured-news"]',
  );

  try {
    const { data, error } = await supabase
      .from("news_posts")
      .select(
        "id, slug, title, body, created_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (error) throw error;

    if (!data?.length) {
      slot.innerHTML = states.empty({
        message:
          "No news yet — check back soon.",
      });

      return;
    }

    const post = data[0];

    const cover = await fetchFirstMedia(
      "news",
      post.id,
    );

    slot.innerHTML = newsCard(
      {
        slug: post.slug,
        title: post.title,
        excerpt: excerptFrom(post.body),
        coverImageUrl: cover,
        publishedAt: post.created_at,
      },
      {
        variant: "featured",
      },
    );

    observeLazyImages(slot);
  } catch (err) {
    console.error(
      "[home] featured news failed:",
      err,
    );

    slot.innerHTML = states.error();

    states.bindRetry(
      slot,
      () => loadFeaturedNews(root),
    );
  }
}

/* =========================================================
   LATEST MATCH REPORT
   ========================================================= */

async function loadFeaturedMatchReport(root) {
  const slot = root.querySelector(
    '[data-slot="match-report-slot"]',
  );

  try {
    /*
     * Same pattern as loadSecondaryNews: pull the newest
     * MAX_MATCH_REPORTS reports and lay them out as a
     * horizontally-scrollable rail (scrolls on mobile,
     * sits side by side on desktop).
     */
    const { data, error } = await supabase
      .from("match_report_posts")
      .select("id, slug, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_MATCH_REPORTS);

    if (error) throw error;

    if (!data?.length) {
      slot.innerHTML = states.empty({
        message: "No match reports yet — check back after the next game.",
      });

      return;
    }

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia(
          "match_report",
          post.id,
        );

        return `
          <div class="home-news-card">
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
        `;
      }),
    );

    slot.innerHTML = cards.join("");

    observeLazyImages(slot);
  } catch (err) {
    console.error(
      "[home] match reports failed:",
      err,
    );

    slot.innerHTML = states.error();

    states.bindRetry(
      slot,
      () => loadFeaturedMatchReport(root),
    );
  }
}

/* =========================================================
   FIXTURES
   ========================================================= */

async function loadLiveAndMatches(
  root,
  cleanupFns,
) {
  const liveSlot = root.querySelector(
    '[data-slot="live"]',
  );

  const pairSlot = root.querySelector(
    '[data-slot="match-pair"]',
  );

  try {
    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const [
      { data: live, error: liveErr },
      { data: upcoming, error: upcomingErr },
      { data: previous, error: previousErr },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(
          `
          id,
          slug,
          match_date,
          match_time,
          our_score,
          opponent_score,
          opponent_team_id,
          is_home
        `,
        )
        .eq("is_live", true)
        .limit(1),

      /*
       * Fetch more than four because we may need to
       * fill the fixture rail with previous matches.
       */
      supabase
        .from("matches")
        .select(
          `
          id,
          slug,
          match_date,
          match_time,
          our_score,
          opponent_score,
          opponent_team_id,
          is_home,
          status
        `,
        )
        .eq("is_internal", true)
        .in("status", [
          "scheduled",
          "pending",
        ])
        .gte("match_date", today)
        .order("match_date", {
          ascending: true,
        })
        .order("match_time", {
          ascending: true,
        })
        .limit(12),

      /*
       * Previous matches are fetched separately so that
       * if there are fewer than four upcoming matches,
       * we can fill the remaining slots with the latest
       * completed matches.
       */
      supabase
        .from("matches")
        .select(
          `
          id,
          slug,
          match_date,
          match_time,
          our_score,
          opponent_score,
          opponent_team_id,
          is_home,
          status
        `,
        )
        .eq("is_internal", true)
        .eq("status", "completed")
        .lt("match_date", today)
        .order("match_date", {
          ascending: false,
        })
        .order("match_time", {
          ascending: false,
        })
        .limit(12),
    ]);

    if (
      liveErr ||
      upcomingErr ||
      previousErr
    ) {
      throw (
        liveErr ||
        upcomingErr ||
        previousErr
      );
    }

    /* -----------------------------------------------------
       LIVE MATCH
       ----------------------------------------------------- */

    const allFetched = [
      ...(live || []),
      ...(upcoming || []),
      ...(previous || []),
    ];

    const uniqueFetched = Array.from(
      new Map(
        allFetched.map((match) => [
          match.id,
          match,
        ]),
      ).values(),
    );

    const withOpp =
      uniqueFetched.length
        ? await supabase.attachOpponents(
            uniqueFetched,
          )
        : [];

    const mapById = new Map(
      withOpp.map((m) => [m.id, m]),
    );

    const liveMatch = live?.length
      ? mapById.get(live[0].id) ||
        live[0]
      : null;

    if (liveMatch) {
      liveSlot.innerHTML = `
        <div class="home-live-banner">

          <div class="home-live-banner__label">
            ${liveIndicator("Live Now")}
          </div>

          ${matchCard(
            toExternalMatch({
              ...liveMatch,
              status: "live",
            }),
          )}

        </div>
      `;
    } else {
      liveSlot.innerHTML = "";
    }

    /* -----------------------------------------------------
       BUILD FIXTURE LIST
       ----------------------------------------------------- */

    const upcomingMatches = (
      upcoming || []
    )
      .map(
        (match) =>
          mapById.get(match.id) ||
          match,
      )
      .sort(
        (a, b) =>
          getKickoffTime(a) -
          getKickoffTime(b),
      );

    const previousMatches = (
      previous || []
    )
      .map(
        (match) =>
          mapById.get(match.id) ||
          match,
      )
      .sort(
        (a, b) =>
          getKickoffTime(b) -
          getKickoffTime(a),
      );

    /*
     * First take the next four.
     *
     * If there are fewer than four future matches,
     * fill the remaining spaces with the latest
     * previous matches.
     *
     * Example:
     *
     * 1 upcoming + 3 previous
     * 2 upcoming + 2 previous
     * 3 upcoming + 1 previous
     * 0 upcoming + 4 previous
     */
    const selectedMatches = [
      ...upcomingMatches.slice(
        0,
        MAX_FIXTURES,
      ),
    ];

    if (
      selectedMatches.length <
      MAX_FIXTURES
    ) {
      const needed =
        MAX_FIXTURES -
        selectedMatches.length;

      selectedMatches.push(
        ...previousMatches
          .filter(
            (previousMatch) =>
              !selectedMatches.some(
                (selected) =>
                  selected.id ===
                  previousMatch.id,
              ),
          )
          .slice(0, needed),
      );
    }

    /* -----------------------------------------------------
       NO MATCHES AT ALL
       ----------------------------------------------------- */

    if (!selectedMatches.length) {
      pairSlot.innerHTML =
        states.empty({
          message:
            "Fixtures and results will appear here.",
        });

      cleanupFns.push(
        startKickoffToast(root, null),
      );

      return;
    }

    /* -----------------------------------------------------
       RENDER HORIZONTAL FIXTURE RAIL
       ----------------------------------------------------- */

    const fixtureCards =
      selectedMatches
        .map((match) => {
          const isUpcoming =
            getKickoffTime(match) >
            Date.now();

          return `
            <div class="home-fixture-card">

              <div class="home-match-pair__label">
                ${
                  isUpcoming
                    ? "Upcoming"
                    : "Previous"
                }
              </div>

              ${matchCard(
                toExternalMatch({
                  ...match,
                  status:
                    match.status ||
                    (isUpcoming
                      ? "scheduled"
                      : "completed"),
                }),
              )}

            </div>
          `;
        })
        .join("");

    pairSlot.innerHTML = `
      <div class="home-fixtures-scroll">
        ${fixtureCards}
      </div>
    `;

    observeLazyImages(pairSlot);
    observeLazyImages(liveSlot);

    /* -----------------------------------------------------
       KICKOFF REMINDER TOAST
       ----------------------------------------------------- */

    cleanupFns.push(
      startKickoffToast(
        root,
        upcomingMatches[0] || null,
      ),
    );
  } catch (err) {
    console.error(
      "[home] match data failed:",
      err,
    );

    pairSlot.innerHTML =
      states.error();

    states.bindRetry(
      pairSlot,
      () =>
        loadLiveAndMatches(
          root,
          cleanupFns,
        ),
    );
  }
}

function getKickoffTime(match) {
  const value = combineDateTime(
    match?.match_date,
    match?.match_time,
  );

  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
}

/* =========================================================
   KICKOFF REMINDER TOAST
   ========================================================= */

/*
 * Compact "kicks off in" reminder shown just below the hero.
 *
 * Visible only in the window between 1 day 12 hours before
 * kickoff and 10 minutes before kickoff — outside that range
 * it renders nothing.
 */
function startKickoffToast(root, match) {
  if (KICKOFF_TOAST_INTERVAL) {
    clearInterval(KICKOFF_TOAST_INTERVAL);
    KICKOFF_TOAST_INTERVAL = null;
  }

  const slot = root.querySelector(
    '[data-slot="kickoff-toast"]',
  );
  if (!slot) return () => {};

  if (!match) {
    slot.innerHTML = "";
    return () => {};
  }

  const kickoffIso = combineDateTime(
    match.match_date,
    match.match_time,
  );
  const target = kickoffIso
    ? new Date(kickoffIso).getTime()
    : NaN;

  if (Number.isNaN(target)) {
    slot.innerHTML = "";
    return () => {};
  }

  function render() {
    const diff = target - Date.now();
    const inWindow =
      diff <= KICKOFF_TOAST_WINDOW_START &&
      diff > KICKOFF_TOAST_WINDOW_END;

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
  const totalMinutes = Math.max(
    0,
    Math.floor(diffMs / 60000),
  );
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(
    (totalMinutes % 1440) / 60,
  );
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

/* =========================================================
   STANDINGS
   ========================================================= */

/*
 * Returns a preview window of up to STANDINGS_WINDOW rows
 * centered on Maguje FC's row within an already
 * position-sorted list:
 *
 * - Maguje in 1st: rows 1-3
 * - Maguje last: last 3 rows
 * - Maguje in the middle: the row above, Maguje, the row below
 * - Maguje not found / table has <= 3 teams: first 3 rows
 */
function getStandingsWindow(rows) {
  if (rows.length <= STANDINGS_WINDOW) {
    return rows;
  }

  const magujeIndex = rows.findIndex((r) =>
    (r.team_name || "").toLowerCase().includes("maguje"),
  );

  if (magujeIndex === -1) {
    return rows.slice(0, STANDINGS_WINDOW);
  }

  if (magujeIndex === 0) {
    return rows.slice(0, STANDINGS_WINDOW);
  }

  if (magujeIndex === rows.length - 1) {
    return rows.slice(rows.length - STANDINGS_WINDOW);
  }

  return rows.slice(magujeIndex - 1, magujeIndex + 2);
}

async function loadStandings(root) {
  const slot = root.querySelector(
    '[data-slot="standings"]',
  );

  try {
    /*
     * Select all columns because the standings view may
     * contain competition fields such as:
     *
     * competition_id
     * competition_name
     * competition
     *
     * We resolve the available name below without requiring
     * one exact competition column.
     */
    const {
      data,
      error,
    } = await supabase
      .from("v_standings")
      .select("*")
      .order("position", {
        ascending: true,
      });

    if (error) throw error;

    if (!data?.length) {
      slot.innerHTML =
        states.empty({
          message:
            "Standings will appear once the season begins.",
        });

      return;
    }

    /* -----------------------------------------------------
       GROUP BY COMPETITION
       ----------------------------------------------------- */

    const competitionMap =
      new Map();

    data.forEach((row) => {
      const competitionId =
        row.competition_id ??
        row.competitionId ??
        row.competition ??
        row.competition_name ??
        row.competitionName ??
        "default";

      const competitionName =
        row.competition_name ??
        row.competitionName ??
        (
          typeof row.competition ===
          "string"
            ? row.competition
            : null
        ) ??
        "Competition";

      if (
        !competitionMap.has(
          String(competitionId),
        )
      ) {
        competitionMap.set(
          String(competitionId),
          {
            id: String(
              competitionId,
            ),
            name: competitionName,
            rows: [],
          },
        );
      }

      competitionMap
        .get(String(competitionId))
        .rows.push(row);
    });

    /*
     * Limit the homepage to four competitions.
     */
    const competitions =
      Array.from(
        competitionMap.values(),
      ).slice(
        0,
        MAX_COMPETITIONS,
      );

    /* -----------------------------------------------------
       RENDER COMPETITION CARDS
       ----------------------------------------------------- */

    const cards =
      competitions
        .map(
          (competition) => {
            const windowRows = getStandingsWindow(
              competition.rows,
            );
            const magujeRow = windowRows.find((r) =>
              (r.team_name || "").toLowerCase().includes("maguje"),
            );

            return `
            <article class="home-standings-card">

              <div class="home-standings-card__header">

                <h3 class="home-standings-card__title">
                  ${escapeHtml(
                    competition.name,
                  )}
                </h3>

                <span class="home-standings-card__hint">
                  View →
                </span>

              </div>

              <div>
                ${standingsTable(
                  windowRows.map(
                    (r) => ({
                      position:
                        r.position,

                      teamId:
                        r.team_id,

                      teamName:
                        r.team_name,

                      crestUrl:
                        r.crest_url,

                      played:
                        r.played,

                      won:
                        r.won,

                      drawn:
                        r.drawn,

                      lost:
                        r.lost,

                      points:
                        r.points,
                    }),
                  ),
                  {
                    highlightTeamId:
                      magujeRow
                        ? magujeRow.team_id
                        : null,
                  },
                )}
              </div>

            </article>
          `;
          },
        )
        .join("");

    slot.innerHTML = `
      <div class="home-standings-scroll">
        ${cards}
      </div>
    `;

    observeLazyImages(slot);
  } catch (err) {
    console.error(
      "[home] standings failed:",
      err,
    );

    slot.innerHTML =
      states.error();

    states.bindRetry(
      slot,
      () => loadStandings(root),
    );
  }
}

/* =========================================================
   LATEST NEWS
   ========================================================= */

async function loadSecondaryNews(root) {
  const slot = root.querySelector(
    '[data-slot="news-grid"]',
  );

  try {
    /*
     * Always retrieve the four newest posts.
     *
     * This means:
     *
     * News 1
     * News 2
     * News 3
     * News 4
     *
     * As new news is added, the older cards naturally
     * drop out of this homepage list.
     */
    const {
      data,
      error,
    } = await supabase
      .from("news_posts")
      .select(
        "id, slug, title, body, created_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(MAX_NEWS);

    if (error) throw error;

    if (!data?.length) {
      slot.innerHTML =
        states.empty({
          message:
            "More updates coming soon.",
        });

      return;
    }

    const cards =
      await Promise.all(
        data.map(
          async (post) => {
            const cover =
              await fetchFirstMedia(
                "news",
                post.id,
              );

            return `
              <div class="home-news-card">
                ${newsCard({
                  slug: post.slug,
                  title: post.title,
                  excerpt:
                    excerptFrom(
                      post.body,
                    ),
                  coverImageUrl:
                    cover,
                  publishedAt:
                    post.created_at,
                })}
              </div>
            `;
          },
        ),
      );

    slot.innerHTML =
      cards.join("");

    observeLazyImages(slot);
  } catch (err) {
    console.error(
      "[home] secondary news failed:",
      err,
    );

    slot.innerHTML =
      states.error();

    states.bindRetry(
      slot,
      () =>
        loadSecondaryNews(root),
    );
  }
}

/* =========================================================
   SMALL HTML SAFETY HELPER
   ========================================================= */

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
