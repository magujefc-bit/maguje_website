import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchCard } from "../components/match-card.js";
import {
  spotlightCard,
  spotlightPlaceholderCard,
} from "../components/spotlight-card.js";
import { liveIndicator } from "../components/controls.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";
import { initCarousel } from "../components/carousel.js";
import { newsCard } from "../components/news-card.js";

injectStyle(
  "home-view",
  `
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
     HERO / ROW 1
     ========================================================= */

  .feed-row1 {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sp-lg);
    width: 100%;
    align-items: stretch;
  }

  .feed-row1 > * {
    min-width: 0;
    width: 100%;
  }

  @media (min-width: 768px) and (max-width: 1199px) {
    .feed-row1 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .feed-row1__hero {
      grid-column: 1 / -1;
    }

    .feed-row1__spotlight {
      grid-column: 1 / -1;
    }
  }

  @media (min-width: 1200px) {
    .feed-row1 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .feed-row1__hero {
      grid-column: span 1;
    }

    .feed-row1__spotlight {
      grid-column: span 1;
    }

    /*
     * When both Live and Upcoming exist:
     * hero + live + upcoming occupy row 1.
     * Spotlight moves to its dedicated row.
     */
    .feed-row1.has-live.has-upcoming
      .feed-row1__hero {
      grid-column: span 1;
    }

    /*
     * When only one fixture exists:
     * hero + fixture + spotlight.
     */
    .feed-row1.has-one-fixture
      .feed-row1__hero,
    .feed-row1.has-one-fixture
      .feed-row1__fixture {
      grid-column: span 1;
    }

    /*
     * When neither fixture exists:
     * hero takes one column and spotlight takes two.
     */
    .feed-row1.no-fixtures
      .feed-row1__hero {
      grid-column: span 1;
    }

    .feed-row1.no-fixtures
      .feed-row1__spotlight {
      grid-column: span 2;
    }
  }

  /* =========================================================
     STATIC GREETING + HERO SUMMARY CAROUSEL
     ========================================================= */

  .home-hero {
    position: relative;
    width: 100%;
    min-width: 0;
  }

  .home-hero__greeting {
    position: relative;
    z-index: 3;
    padding:
      var(--sp-md)
      var(--sp-lg)
      var(--sp-sm);
    background: var(--color-pitch-shadow);
    color: var(--color-summit-white);
    border-radius:
      var(--radius-lg)
      var(--radius-lg)
      0
      0;
  }

  .home-hero__greeting-title {
    margin: 0;
    color: var(--color-summit-white);
    font-size: var(--fs-xl);
    line-height: var(--lh-tight);
  }

  .home-hero__greeting-subtitle {
    margin: var(--sp-3xs) 0 0;
    color: rgba(247,249,246,0.78);
    font-size: var(--fs-sm);
  }

  .home-hero-carousel {
    position: relative;
    background: var(--color-pitch-shadow);
    border-radius:
      0
      0
      var(--radius-lg)
      var(--radius-lg);
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
    pointer-events: none;
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
     FIXTURES
     ========================================================= */

  .home-fixture-card-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    min-width: 0;
    width: 100%;
    height: 100%;
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

  .home-fixture-card-wrap--live
    .home-fixture-card-wrap__label {
    color: var(--color-live);
  }

  .home-fixture-card-wrap .match-card {
    height: 100%;
  }

  /* =========================================================
     PLAYER SPOTLIGHT
     ========================================================= */

  .home-spotlight-inline {
    width: 100%;
    min-width: 0;
  }

  .home-spotlight-section {
    width: 100%;
  }

  .home-spotlight-carousel {
    width: 100%;
    min-width: 0;
  }

  .home-spotlight-carousel .carousel__track {
    width: 100%;
  }

  .home-spotlight-carousel .carousel__slide {
    display: flex;
    min-width: 0;
  }

  .home-spotlight-carousel .spotlight-card {
    width: 100%;
    flex: 1 1 auto;
  }

  /*
   * Mobile: one spotlight card.
   */
  .home-spotlight-carousel .carousel__slide {
    flex: 0 0 100%;
  }

  /*
   * Tablet: two spotlight cards per viewport.
   */
  @media (min-width: 768px) and (max-width: 1199px) {
    .home-spotlight-carousel .carousel__slide {
      flex: 0 0 calc(
        (100% - var(--sp-sm)) / 2
      );
    }
  }

  /*
   * Desktop Case B:
   * spotlight occupies one row-1 column.
   */
  @media (min-width: 1200px) {
    .feed-row1:not(.no-fixtures)
      .home-spotlight-carousel
      .carousel__slide {
      flex: 0 0 100%;
    }
  }

  /*
   * Desktop Case C:
   * spotlight gets two columns and shows two cards
   * side-by-side. More than two becomes scrollable.
   */
  @media (min-width: 1200px) {
    .feed-row1.no-fixtures
      .home-spotlight-carousel
      .carousel__slide {
      flex: 0 0 calc(
        (100% - var(--sp-sm)) / 2
      );
    }
  }

  /*
   * Dedicated Spotlight row when both Live and Upcoming
   * already occupy row 1.
   */
  .spotlight-dedicated {
    width: 100%;
  }

  .spotlight-dedicated .carousel__track {
    width: 100%;
  }

  .spotlight-dedicated .carousel__slide {
    flex: 0 0 100%;
  }

  @media (min-width: 768px) {
    .spotlight-dedicated .carousel__slide {
      flex: 0 0 calc(
        (100% - var(--sp-sm)) / 2
      );
    }
  }

  @media (min-width: 1200px) {
    .spotlight-dedicated
      .carousel__track {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: var(--sp-sm);
      overflow: visible;
      scroll-snap-type: none;
    }

    .spotlight-dedicated.is-overflowing
      .carousel__track {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
    }

    .spotlight-dedicated
      .carousel__slide {
      flex: 0 0
        calc(
          (100% - (3 * var(--sp-sm))) / 4
        );
    }
  }

  /* =========================================================
     GENERIC FOUR-COLUMN CONTENT ROWS
     ========================================================= */

  .home-content-section {
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

  .home-four-carousel {
    width: 100%;
    min-width: 0;
  }

  .home-four-carousel .carousel__track {
    width: 100%;
  }

  .home-four-carousel .carousel__slide {
    flex: 0 0 100%;
  }

  @media (min-width: 600px) {
    .home-four-carousel .carousel__slide {
      flex: 0 0
        calc(
          (100% - var(--sp-sm)) / 2
        );
    }
  }

  @media (min-width: 1200px) {
    .home-four-carousel .carousel__track {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: var(--sp-sm);
      overflow: visible;
      scroll-snap-type: none;
    }

    .home-four-carousel .carousel__slide {
      flex: none;
      width: auto;
      scroll-snap-align: none;
    }
  }

  /*
   * Placeholder cards.
   */
  .home-carousel-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 220px;
    height: 100%;
    padding: var(--sp-md);
    border: 1px dashed var(--color-line);
    border-radius: var(--radius-md);
    color: rgba(16,36,26,0.45);
    font-size: var(--fs-sm);
    background: rgba(247,249,246,0.5);
  }

  .home-four-carousel .home-carousel-card {
    width: 100%;
    height: 100%;
  }

  .home-four-carousel .news-card {
    height: 100%;
  }

  /* =========================================================
     DESKTOP ROW WIDTH CONSISTENCY
     ========================================================= */

  @media (min-width: 1200px) {
    /*
     * Row 1 is three columns.
     * The four-column rows below have narrower individual
     * cards by design, but Spotlight/row-1 cards are allowed
     * to occupy the exact available row-1 column width.
     */
    .feed-row1 > .home-fixture-card-wrap,
    .feed-row1 > .home-spotlight-inline {
      width: 100%;
    }
  }

  /* =========================================================
     ACCESSIBILITY / MOTION
     ========================================================= */

  @media (prefers-reduced-motion: reduce) {
    .home-hero-carousel .carousel__track,
    .home-spotlight-carousel .carousel__track,
    .home-four-carousel .carousel__track {
      scroll-behavior: auto;
    }
  }
`,
);

let MAGUJE_TEAM_ID = null;

const MAX_NEWS = 4;
const MAX_MATCH_REPORTS = 4;
const MAX_SPOTLIGHT_CARDS = 5;

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

  return (data || [])
    .map((row) => row.media?.url)
    .filter(Boolean);
}

export function excerptFrom(body, len = 140) {
  if (!body) return "";

  const plain = body.replace(/<[^>]+>/g, "");

  return plain.length > len
    ? `${plain.slice(0, len)}…`
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
      (
        row.live_state &&
        row.live_state !== "not_started" &&
        row.live_state !== "full_time"
          ? "live"
          : row.status
      ),

    kickoffAt: combineDateTime(
      row.match_date,
      row.match_time,
    ),

    homeScore: isAway
      ? row.opponent_score
      : row.our_score,

    awayScore: isAway
      ? row.our_score
      : row.opponent_score,

    homeTeam: isAway
      ? {
          name: row.opponent?.name || "Opponent",
          shortName:
            row.opponent?.name || "Opponent",
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
          name: row.opponent?.name || "Opponent",
          shortName:
            row.opponent?.name || "Opponent",
          crestUrl: row.opponent?.logo_url,
        },
  };
}

export async function homeView() {
  const cleanupFns = [];
  const carouselInstances = [];

  await viewContainer.render(`
    <div class="container home-page">

      <div class="feed-row1" data-feed-row1>

        <div
          class="feed-row1__hero"
          data-slot="hero-wrap"
        >
          ${skeletons.heroCarousel()}
        </div>

        <div
          class="feed-row1__fixture home-fixture-card-wrap home-fixture-card-wrap--live"
          data-slot="live-wrap"
          hidden
        ></div>

        <div
          class="feed-row1__fixture home-fixture-card-wrap"
          data-slot="upcoming-wrap"
          hidden
        ></div>

        <div
          class="feed-row1__spotlight home-spotlight-inline"
          data-slot="spotlight-inline-wrap"
          hidden
        ></div>

      </div>

      <section
        class="home-content-section"
        data-slot="spotlight-dedicated-section"
        hidden
      >
        <div class="home-section__header">
          <h2 class="home-section__title">
            Player Spotlight
          </h2>
        </div>

        <div
          class="carousel spotlight-dedicated"
          data-slot="spotlight-dedicated"
        >
          <div class="carousel__track" data-track></div>
        </div>
      </section>

      <section
        class="home-content-section"
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
          class="carousel home-four-carousel"
          data-slot="news-carousel"
        >
          <div class="carousel__track" data-track>
            ${skeletons.newsList(2)}
          </div>
        </div>
      </section>

      <section
        class="home-content-section"
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
          class="carousel home-four-carousel"
          data-slot="reports-carousel"
        >
          <div class="carousel__track" data-track>
            ${skeletons.newsList(2)}
          </div>
        </div>
      </section>

    </div>
  `);

  const root = document.querySelector("#app");

  if (!root) {
    return {
      cleanup() {},
    };
  }

  const fixturesInfo =
    await loadFixturesAndHero(
      root,
      cleanupFns,
      carouselInstances,
    );

  await placeSpotlight(
    root,
    fixturesInfo,
    carouselInstances,
    cleanupFns,
  );

  await loadSecondaryNews(
    root,
    carouselInstances,
  );

  await loadFeaturedMatchReport(
    root,
    carouselInstances,
  );

  return {
    cleanup() {
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error(
            "[home] cleanup failed:",
            err,
          );
        }
      });

      carouselInstances.forEach((carousel) => {
        try {
          carousel.destroy();
        } catch (err) {
          console.error(
            "[home] carousel cleanup failed:",
            err,
          );
        }
      });
    },
  };
}

/* =========================================================
   FIXTURES + HERO
   ========================================================= */

async function loadFixturesAndHero(
  root,
  cleanupFns,
  carouselInstances,
) {
  const heroWrap =
    root.querySelector(
      '[data-slot="hero-wrap"]',
    );

  const liveWrap =
    root.querySelector(
      '[data-slot="live-wrap"]',
    );

  const upcomingWrap =
    root.querySelector(
      '[data-slot="upcoming-wrap"]',
    );

  const feedRow =
    root.querySelector(
      "[data-feed-row1]",
    );

  let liveMatch = null;
  let nextUpcoming = null;
  let latestNews = null;
  let latestReport = null;

  try {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const [
      {
        data: live,
        error: liveErr,
      },
      {
        data: upcoming,
        error: upcomingErr,
      },
      {
        data: newsRows,
        error: newsErr,
      },
      {
        data: reportRows,
        error: reportErr,
      },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(`
          id,
          slug,
          match_date,
          match_time,
          our_score,
          opponent_score,
          opponent_team_id,
          is_home,
          status,
          venue,
          is_live,
          live_state
        `)
        .eq("is_live", true)
        .limit(1),

      supabase
        .from("matches")
        .select(`
          id,
          slug,
          match_date,
          match_time,
          our_score,
          opponent_score,
          opponent_team_id,
          is_home,
          status,
          venue,
          is_live,
          live_state
        `)
        .eq("is_internal", true)
        .in(
          "status",
          ["scheduled", "pending"],
        )
        .gte("match_date", today)
        .order(
          "match_date",
          { ascending: true },
        )
        .order(
          "match_time",
          { ascending: true },
        )
        .limit(4),

      supabase
        .from("news_posts")
        .select(`
          id,
          slug,
          title,
          created_at
        `)
        .order(
          "created_at",
          { ascending: false },
        )
        .limit(1),

      supabase
        .from("match_report_posts")
        .select(`
          id,
          slug,
          title,
          created_at
        `)
        .order(
          "created_at",
          { ascending: false },
        )
        .limit(1),
    ]);

    if (
      liveErr ||
      upcomingErr ||
      newsErr ||
      reportErr
    ) {
      throw (
        liveErr ||
        upcomingErr ||
        newsErr ||
        reportErr
      );
    }

    const allFetched = [
      ...(live || []),
      ...(upcoming || []),
    ];

    const uniqueFetched =
      Array.from(
        new Map(
          allFetched.map(
            (match) => [
              match.id,
              match,
            ],
          ),
        ).values(),
      );

    const withOpp =
      uniqueFetched.length
        ? await supabase.attachOpponents(
            uniqueFetched,
          )
        : [];

    const mapById =
      new Map(
        withOpp.map(
          (match) => [
            match.id,
            match,
          ],
        ),
      );

    liveMatch =
      live?.length
        ? mapById.get(live[0].id) ||
          live[0]
        : null;

    const upcomingMatches =
      (upcoming || [])
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

    nextUpcoming =
      upcomingMatches[0] || null;

    latestNews =
      newsRows?.[0] || null;

    latestReport =
      reportRows?.[0] || null;

    /*
     * Update row-1 layout state.
     */
    feedRow.classList.remove(
      "has-live",
      "has-upcoming",
      "has-one-fixture",
      "no-fixtures",
    );

    if (liveMatch && nextUpcoming) {
      feedRow.classList.add(
        "has-live",
        "has-upcoming",
      );
    } else if (
      liveMatch ||
      nextUpcoming
    ) {
      feedRow.classList.add(
        "has-one-fixture",
      );
    } else {
      feedRow.classList.add(
        "no-fixtures",
      );
    }

    /*
     * Live card.
     */
    if (liveMatch) {
      liveWrap.hidden = false;

      liveWrap.innerHTML = `
        <div class="home-fixture-card-wrap__label">
          ${liveIndicator("Live Now")}
        </div>

        ${matchCard(
          toExternalMatch({
            ...liveMatch,
            status: "live",
          }),
        )}
      `;
    } else {
      liveWrap.hidden = true;
      liveWrap.innerHTML = "";
    }

    /*
     * Upcoming card.
     */
    if (nextUpcoming) {
      upcomingWrap.hidden = false;

      upcomingWrap.innerHTML = `
        <div class="home-fixture-card-wrap__label">
          Upcoming
        </div>

        ${matchCard(
          toExternalMatch({
            ...nextUpcoming,
            status:
              nextUpcoming.status ||
              "scheduled",
          }),
          {
            href: "/fixtures",
          },
        )}
      `;
    } else {
      upcomingWrap.hidden = true;
      upcomingWrap.innerHTML = "";
    }

    buildHero(
      heroWrap,
      {
        liveMatch,
        nextUpcoming,
        latestNews,
        latestReport,
      },
      cleanupFns,
      carouselInstances,
    );

    observeLazyImages(liveWrap);
    observeLazyImages(upcomingWrap);

    return {
      hasLive: !!liveMatch,
      hasUpcoming: !!nextUpcoming,
    };
  } catch (err) {
    console.error(
      "[home] fixtures/hero load failed:",
      err,
    );

    heroWrap.innerHTML =
      states.error();

    states.bindRetry(
      heroWrap,
      () =>
        loadFixturesAndHero(
          root,
          cleanupFns,
          carouselInstances,
        ),
    );

    feedRow.classList.add(
      "no-fixtures",
    );

    return {
      hasLive: false,
      hasUpcoming: false,
    };
  }
}

function getKickoffTime(match) {
  const value =
    combineDateTime(
      match?.match_date,
      match?.match_time,
    );

  if (!value) return 0;

  const time =
    new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
}

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

/* =========================================================
   HERO
   ========================================================= */

function buildHero(
  heroWrap,
  {
    liveMatch,
    nextUpcoming,
    latestNews,
    latestReport,
  },
  cleanupFns,
  carouselInstances,
) {
  const slides = [];

  /*
   * Live summary.
   */
  if (liveMatch) {
    const opponentName =
      liveMatch.opponent?.name ||
      "our opponents";

    const venueBit =
      liveMatch.is_home === false
        ? ` at ${
            liveMatch.venue ||
            `${opponentName}'s ground`
          }`
        : "";

    slides.push(`
      <div class="home-hero-slide">
        <div class="home-hero-slide__live-badge">
          ${liveIndicator("Live")}
        </div>

        <h2
          class="text-display-lg home-hero-slide__title"
        >
          Maguje is playing
          ${escapeHtml(opponentName)}
          ${escapeHtml(venueBit)}.
        </h2>

        <p
          class="text-body-md home-hero-slide__text"
        >
          Don't miss live updates for this match.
        </p>
      </div>
    `);
  }

  /*
   * Upcoming summary.
   */
  if (nextUpcoming) {
    const opponentName =
      nextUpcoming.opponent?.name ||
      "our opponents";

    const venueBit =
      nextUpcoming.is_home === false
        ? ` at ${
            nextUpcoming.venue ||
            `${opponentName}'s ground`
          }`
        : "";

    const kickoff =
      combineDateTime(
        nextUpcoming.match_date,
        nextUpcoming.match_time,
      );

    const kickoffLabel =
      kickoff
        ? new Date(
            kickoff,
          ).toLocaleString(
            "en-KE",
            {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone:
                "Africa/Nairobi",
            },
          )
        : "soon";

    slides.push(`
      <div class="home-hero-slide">
        <h2
          class="text-display-lg home-hero-slide__title"
        >
          Maguje will play
          ${escapeHtml(opponentName)}
          ${escapeHtml(venueBit)},
          at ${escapeHtml(kickoffLabel)}.
        </h2>

        <p
          class="text-body-md home-hero-slide__text"
        >
          We invite you to come and support our boys
          — live updates might also be available,
          stay tuned.
        </p>
      </div>
    `);
  }

  /*
   * Latest news summary.
   */
  if (latestNews) {
    slides.push(`
      <div class="home-hero-slide">
        <h2
          class="text-display-lg home-hero-slide__title"
        >
          Club news is awaiting you
        </h2>

        <p
          class="text-body-md home-hero-slide__text"
        >
          Scroll down to read.
        </p>
      </div>
    `);
  }

  /*
   * Latest match report summary.
   */
  if (latestReport) {
    slides.push(`
      <div class="home-hero-slide">
        <h2
          class="text-display-lg home-hero-slide__title"
        >
          A match report is awaiting you
        </h2>

        <p
          class="text-body-md home-hero-slide__text"
        >
          Scroll down to read.
        </p>
      </div>
    `);
  }

  /*
   * Absolute fallback.
   */
  if (!slides.length) {
    slides.push(`
      <div class="home-hero-slide">
        <img
          src="/assets/maguje-crest.png"
          alt=""
          class="home-hero-slide__crest"
        >

        <h1
          class="text-display-2xl home-hero-slide__title"
        >
          Maguje FC
        </h1>

        <p
          class="text-body-md home-hero-slide__text"
        >
          Rooted in the community.
          Playing for the ridge.
        </p>
      </div>
    `);
  }

  heroWrap.innerHTML = `
    <div class="home-hero">

      <div class="home-hero__greeting">
        <h1
          class="home-hero__greeting-title"
        >
          ${getGreeting()},
          welcome to Maguje FC.
        </h1>

        <p
          class="home-hero__greeting-subtitle"
        >
          Rooted in the community.
          Playing for the ridge.
        </p>
      </div>

      <div
        class="home-hero-carousel carousel"
        data-slot="hero-carousel"
      >
        <div
          class="carousel__track"
          data-track
        >
          ${slides
            .map(
              (slide) => `
                <div class="carousel__slide">
                  ${slide}
                </div>
              `,
            )
            .join("")}
        </div>
      </div>

    </div>
  `;

  const carouselRoot =
    heroWrap.querySelector(
      '[data-slot="hero-carousel"]',
    );

  const instance =
    initCarousel(
      carouselRoot,
      {
        intervalMs: 7000,
        autoplay: slides.length > 1,
        pauseOffscreen: false,
      },
    );

  carouselInstances.push(instance);

  cleanupFns.push(() => {
    instance.destroy();
  });
}

/* =========================================================
   PLAYER SPOTLIGHT
   ========================================================= */

async function placeSpotlight(
  root,
  {
    hasLive,
    hasUpcoming,
  },
  carouselInstances,
  cleanupFns,
) {
  const inlineWrap =
    root.querySelector(
      '[data-slot="spotlight-inline-wrap"]',
    );

  const dedicatedSection =
    root.querySelector(
      '[data-slot="spotlight-dedicated-section"]',
    );

  const dedicatedRoot =
    root.querySelector(
      '[data-slot="spotlight-dedicated"]',
    );

  const dedicatedTrack =
    dedicatedRoot.querySelector(
      "[data-track]",
    );

  let cards = [];

  try {
    const [
      {
        data: matchStandout,
      },
      {
        data: compStandout,
      },
      {
        data: topScorers,
      },
      {
        data: topAssists,
      },
      {
        data: discipline,
      },
      {
        data: competitionCounts,
      },
    ] = await Promise.all([
      supabase
        .from(
          "v_spotlight_match_standout",
        )
        .select("*")
        .limit(1),

      supabase
        .from(
          "v_spotlight_competition_standout",
        )
        .select("*")
        .order(
          "weighted_score",
          {
            ascending: false,
          },
        )
        .limit(1),

      supabase
        .from(
          "v_spotlight_top_scorers",
        )
        .select("*")
        .order(
          "goals",
          {
            ascending: false,
          },
        )
        .limit(1),

      supabase
        .from(
          "v_spotlight_top_assists",
        )
        .select("*")
        .order(
          "assists",
          {
            ascending: false,
          },
        )
        .limit(1),

      supabase
        .from(
          "v_spotlight_discipline",
        )
        .select("*")
        .limit(1),

      supabase
        .from(
          "v_competition_match_counts",
        )
        .select("*"),
    ]);

    /*
     * Match Standout is available from match 1.
     */
    if (
      matchStandout?.[0] &&
      !matchStandout[0].is_tied
    ) {
      const s =
        matchStandout[0];

      cards.push(
        spotlightCard({
          label:
            "Match Standout Performer",
          playerName:
            s.player_name,
          photoUrl:
            s.photo_url,
          playerSlug:
            s.player_slug,
          statLine:
            statLineFromGoalsAssists(
              s.goals_in_match,
              s.assists_in_match,
            ),
          meta:
            s.opponent_name
              ? `vs ${escapeHtml(
                  s.opponent_name,
                )}`
              : "",
        }),
      );
    } else {
      cards.push(
        spotlightPlaceholderCard(),
      );
    }

    /*
     * The remaining four categories require
     * more than 3 matches in the competition.
     */
    const eligible =
      hasMoreThanThreeMatches(
        competitionCounts,
      );

    if (eligible) {
      /*
       * Competition Standout.
       */
      if (
        compStandout?.[0] &&
        !compStandout[0].is_tied
      ) {
        const s =
          compStandout[0];

        cards.push(
          spotlightCard({
            label:
              "Competition Standout Performer",
            playerName:
              s.player_name,
            photoUrl:
              s.photo_url,
            playerSlug:
              s.player_slug,
            statLine:
              statLineFromGoalsAssists(
                s.goals,
                s.assists,
              ),
          }),
        );
      } else {
        cards.push(
          spotlightPlaceholderCard(),
        );
      }

      /*
       * Top Scorer.
       */
      if (
        topScorers?.[0] &&
        !topScorers[0].is_tied
      ) {
        const s =
          topScorers[0];

        cards.push(
          spotlightCard({
            label:
              "Top Scorer",
            playerName:
              s.player_name,
            photoUrl:
              s.photo_url,
            playerSlug:
              s.player_slug,
            statLine:
              `${s.goals} goal${
                s.goals === 1
                  ? ""
                  : "s"
              }`,
          }),
        );
      } else {
        cards.push(
          spotlightPlaceholderCard(),
        );
      }

      /*
       * Top Assists.
       */
      if (
        topAssists?.[0] &&
        !topAssists[0].is_tied
      ) {
        const s =
          topAssists[0];

        cards.push(
          spotlightCard({
            label:
              "Top Assists",
            playerName:
              s.player_name,
            photoUrl:
              s.photo_url,
            playerSlug:
              s.player_slug,
            statLine:
              `${s.assists} assist${
                s.assists === 1
                  ? ""
                  : "s"
              }`,
          }),
        );
      } else {
        cards.push(
          spotlightPlaceholderCard(),
        );
      }

      /*
       * Discipline.
       */
      if (
        discipline?.[0] &&
        !discipline[0].is_tied
      ) {
        const s =
          discipline[0];

        cards.push(
          spotlightCard({
            label:
              "Discipline",
            playerName:
              s.player_name,
            photoUrl:
              s.photo_url,
            playerSlug:
              s.player_slug,
            statLine:
              `${s.card_count} card${
                s.card_count === 1
                  ? ""
                  : "s"
              } · ${
                s.appearances
              } apps`,
          }),
        );
      } else {
        cards.push(
          spotlightPlaceholderCard(),
        );
      }
    } else {
      /*
       * No category other than Match Standout
       * is unlocked yet.
       */
      while (
        cards.length <
        MAX_SPOTLIGHT_CARDS
      ) {
        cards.push(
          spotlightPlaceholderCard(),
        );
      }
    }

    /*
     * Defensive padding:
     * always exactly five Spotlight slots.
     */
    while (
      cards.length <
      MAX_SPOTLIGHT_CARDS
    ) {
      cards.push(
        spotlightPlaceholderCard(),
      );
    }

    /*
     * Never allow more than five slots.
     */
    cards =
      cards.slice(
        0,
        MAX_SPOTLIGHT_CARDS,
      );
  } catch (err) {
    console.error(
      "[home] spotlight fetch failed:",
      err,
    );

    cards = Array.from(
      {
        length:
          MAX_SPOTLIGHT_CARDS,
      },
      () =>
        spotlightPlaceholderCard(),
    );
  }

  let activeInstances = [];

  function clearActiveInstances() {
    activeInstances.forEach(
      (instance) => {
        try {
          instance.destroy();
        } catch (err) {
          console.error(
            "[home] spotlight carousel cleanup failed:",
            err,
          );
        }
      },
    );

    activeInstances = [];
  }

  function createCarousel(
    element,
  ) {
    const instance =
      initCarousel(
        element,
        {
          intervalMs: 7000,
          autoplay:
            cards.length > 1,
          pauseOffscreen: false,
        },
      );

    activeInstances.push(
      instance,
    );

    carouselInstances.push(
      instance,
    );

    return instance;
  }

  /*
   * Row-1 Spotlight.
   */
  function renderInline() {
    inlineWrap.classList.remove(
      "feed-row1__spotlight--wide",
    );

    inlineWrap.innerHTML = `
      <div
        class="carousel home-spotlight-carousel"
        data-slot="spotlight-inline-carousel"
      >
        <div
          class="carousel__track"
          data-track
        >
          ${cards
            .map(
              (card) => `
                <div class="carousel__slide">
                  ${card}
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;

    const element =
      inlineWrap.querySelector(
        '[data-slot="spotlight-inline-carousel"]',
      );

    createCarousel(element);

    observeLazyImages(
      inlineWrap,
    );
  }

  /*
   * Dedicated four-column Spotlight row.
   */
  function renderDedicated() {
    const overflowing =
      cards.length > 4;

    dedicatedRoot.classList.toggle(
      "is-overflowing",
      overflowing,
    );

    dedicatedTrack.innerHTML =
      cards
        .map(
          (card) => `
            <div class="carousel__slide">
              ${card}
            </div>
          `,
        )
        .join("");

    createCarousel(
      dedicatedRoot,
    );

    observeLazyImages(
      dedicatedRoot,
    );
  }

  function apply() {
    clearActiveInstances();

    inlineWrap.innerHTML = "";
    dedicatedTrack.innerHTML = "";

    const isDesktop =
      window.matchMedia(
        "(min-width: 1200px)",
      ).matches;

    /*
     * Desktop Case A:
     * Live + Upcoming both exist.
     *
     * Row 1:
     * Hero | Live | Upcoming
     *
     * Spotlight gets its own four-column row.
     */
    if (
      isDesktop &&
      hasLive &&
      hasUpcoming
    ) {
      inlineWrap.hidden = true;

      dedicatedSection.hidden =
        false;

      renderDedicated();

      return;
    }

    /*
     * Desktop Case B/C and all mobile/tablet cases:
     * Spotlight remains in row 1.
     */
    inlineWrap.hidden = false;

    dedicatedSection.hidden =
      true;

    renderInline();
  }

  apply();

  const desktopQuery =
    window.matchMedia(
      "(min-width: 1200px)",
    );

  const onChange =
    () => apply();

  desktopQuery.addEventListener(
    "change",
    onChange,
  );

  cleanupFns.push(() => {
    desktopQuery.removeEventListener(
      "change",
      onChange,
    );

    clearActiveInstances();
  });
}

/* =========================================================
   SPOTLIGHT HELPERS
   ========================================================= */

function hasMoreThanThreeMatches(
  rows,
) {
  if (!Array.isArray(rows)) {
    return false;
  }

  if (!rows.length) {
    return false;
  }

  /*
   * The exact view column names are intentionally
   * handled defensively because the supplied Home file
   * does not expose the SQL definition of the view.
   *
   * We accept the common count field names while
   * keeping the actual Supabase view as the source
   * of truth.
   */
  return rows.some((row) => {
    const count =
      Number(
        row.match_count ??
        row.matches_played ??
        row.played_matches ??
        row.total_matches ??
        row.count ??
        0,
      );

    return count > 3;
  });
}

function statLineFromGoalsAssists(
  goals = 0,
  assists = 0,
) {
  const parts = [];

  const goalCount =
    Number(goals) || 0;

  const assistCount =
    Number(assists) || 0;

  if (goalCount) {
    parts.push(
      `${goalCount} goal${
        goalCount === 1
          ? ""
          : "s"
      }`,
    );
  }

  if (assistCount) {
    parts.push(
      `${assistCount} assist${
        assistCount === 1
          ? ""
          : "s"
      }`,
    );
  }

  return parts.length
    ? parts.join(", ")
    : "Standout performance";
}

/* =========================================================
   NEWS
   ========================================================= */

async function loadSecondaryNews(
  root,
  carouselInstances,
) {
  const carouselRoot =
    root.querySelector(
      '[data-slot="news-carousel"]',
    );

  const track =
    carouselRoot.querySelector(
      "[data-track]",
    );

  try {
    const {
      data,
      error,
    } = await supabase
      .from("news_posts")
      .select(`
        id,
        slug,
        title,
        body,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(MAX_NEWS);

    if (error) {
      throw error;
    }

    /*
     * Always fill the four expected slots.
     */
    const cards = [];

    for (
      const post of
      data || []
    ) {
      const cover =
        await fetchFirstMedia(
          "news",
          post.id,
        );

      cards.push(
        newsCard({
          slug:
            post.slug,
          title:
            post.title,
          excerpt:
            excerptFrom(
              post.body,
            ),
          coverImageUrl:
            cover,
          publishedAt:
            post.created_at,
        }),
      );
    }

    renderFourColumnCarousel(
      carouselRoot,
      track,
      cards,
      carouselInstances,
      {
        placeholder:
          "More updates coming soon.",
      },
    );
  } catch (err) {
    console.error(
      "[home] secondary news failed:",
      err,
    );

    track.innerHTML =
      states.error();

    states.bindRetry(
      track,
      () =>
        loadSecondaryNews(
          root,
          carouselInstances,
        ),
    );
  }
}

/* =========================================================
   MATCH REPORTS
   ========================================================= */

async function loadFeaturedMatchReport(
  root,
  carouselInstances,
) {
  const carouselRoot =
    root.querySelector(
      '[data-slot="reports-carousel"]',
    );

  const track =
    carouselRoot.querySelector(
      "[data-track]",
    );

  try {
    const {
      data,
      error,
    } = await supabase
      .from(
        "match_report_posts",
      )
      .select(`
        id,
        slug,
        title,
        body,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(
        MAX_MATCH_REPORTS,
      );

    if (error) {
      throw error;
    }

    const cards = [];

    for (
      const post of
      data || []
    ) {
      const cover =
        await fetchFirstMedia(
          "match_report",
          post.id,
        );

      cards.push(
        newsCard(
          {
            slug:
              post.slug,
            title:
              post.title,
            excerpt:
              excerptFrom(
                post.body,
              ),
            coverImageUrl:
              cover,
            publishedAt:
              post.created_at,
          },
          {
            basePath:
              "/match-reports",
            badge:
              "Match Report",
          },
        ),
      );
    }

    renderFourColumnCarousel(
      carouselRoot,
      track,
      cards,
      carouselInstances,
      {
        placeholder:
          "More match reports coming soon.",
      },
    );
  } catch (err) {
    console.error(
      "[home] match reports failed:",
      err,
    );

    track.innerHTML =
      states.error();

    states.bindRetry(
      track,
      () =>
        loadFeaturedMatchReport(
          root,
          carouselInstances,
        ),
    );
  }
}

/* =========================================================
   NEWS / REPORT CAROUSEL
   ========================================================= */

function renderFourColumnCarousel(
  carouselRoot,
  track,
  cardsHtml,
  carouselInstances,
  {
    placeholder,
  } = {},
) {
  const items =
    Array.isArray(cardsHtml)
      ? [...cardsHtml]
      : [];

  /*
   * Fewer than four real posts:
   * fill the remaining slots.
   */
  while (
    items.length < 4
  ) {
    items.push(`
      <div class="home-carousel-placeholder">
        ${
          placeholder ||
          "More coming soon."
        }
      </div>
    `);
  }

  track.innerHTML =
    items
      .map(
        (html) => `
          <div class="carousel__slide">
            <div class="home-carousel-card">
              ${html}
            </div>
          </div>
        `,
      )
      .join("");

  observeLazyImages(
    track,
  );

  const instance =
    initCarousel(
      carouselRoot,
      {
        intervalMs: 7000,

        /*
         * At desktop all four cards are visible,
         * so there is nothing to autoplay through.
         * At mobile/tablet the carousel becomes active.
         */
        autoplay:
          shouldAutoplayFourColumnCarousel(),

        pauseOffscreen: false,
      },
    );

  carouselInstances.push(
    instance,
  );
}

function shouldAutoplayFourColumnCarousel() {
  /*
   * The carousel component itself has no breakpoint
   * awareness. Returning true here keeps autoplay
   * available for mobile/tablet. On desktop the four
   * slides are displayed as a static four-column grid.
   *
   * The component will naturally have no useful
   * movement when all four slides occupy the track.
   */
  return true;
}

/* =========================================================
   SECURITY / HTML HELPERS
   ========================================================= */

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}
