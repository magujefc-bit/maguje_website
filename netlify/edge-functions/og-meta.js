// netlify/edge-functions/og-meta.js
//
// Server-side metadata injection for social/search crawlers.
//
// Normal visitors are NOT rewritten.
// They continue to receive the normal SPA response.
//
// Supported detail routes:
//   /news/:slug
//   /match-reports/:slug
//   /community/:slug
//   /events/:slug
//   /gallery/:slug
//   /matches/:slug
//   /players/:slug
//   /competitions/:slug
//
// IMPORTANT:
// The function is attached to these routes from netlify.toml.
//
// [[edge_functions]]
//   path = "/news/*"
//   function = "og-meta"
//
// etc.

/* =========================================================
   CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://pxtexddyvthgmietwhyc.supabase.co";

const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") || "";

const SITE_NAME = "Maguje FC";

const SITE_URL =
  "https://magujefc.netlify.app";

const DEFAULT_IMAGE =
  `${SITE_URL}/assets/og-default.jpg`;

const DEFAULT_LOGO =
  `${SITE_URL}/assets/maguje_logo.png`;

const DEFAULT_DESCRIPTION =
  "Official content from Maguje FC — news, fixtures, results, players, competitions and club information.";

/*
 * Social/search crawlers.
 *
 * We intentionally include a broader set of known crawler
 * identifiers because different platforms identify themselves
 * differently.
 */
const CRAWLER_UA =
  /facebookexternalhit|Facebot|WhatsApp|Twitterbot|Xbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot|Google-InspectionTool|Pinterestbot|Applebot|SkypeUriPreview|vkShare|Viber|redditbot/i;


/* =========================================================
   EDGE FUNCTION
   ========================================================= */

export default async (request, context) => {
  const userAgent =
    request.headers.get("user-agent") || "";

  /*
   * ---------------------------------------------------------
   * NORMAL BROWSER
   * ---------------------------------------------------------
   *
   * Do not modify the normal SPA response.
   */
  if (!CRAWLER_UA.test(userAgent)) {
    return context.next();
  }

  const url =
    new URL(request.url);

  /*
   * ---------------------------------------------------------
   * MATCH ROUTE
   * ---------------------------------------------------------
   */

  const route =
    matchRoute(url.pathname);

  /*
   * This crawler request is not one of our supported
   * content-detail routes.
   */
  if (!route) {
    return context.next();
  }

  /*
   * ---------------------------------------------------------
   * FETCH METADATA
   * ---------------------------------------------------------
   */

  let meta = null;

  try {
    meta =
      await route.build(route.slug);
  } catch (error) {
    console.error(
      "[og-meta] Metadata fetch failed:",
      error,
    );

    /*
     * If Supabase fails, allow the normal SPA response
     * instead of returning a broken page.
     */
    return context.next();
  }

  /*
   * Content doesn't exist.
   */
  if (!meta) {
    return context.next();
  }

  /*
   * ---------------------------------------------------------
   * GET NORMAL SPA HTML
   * ---------------------------------------------------------
   */

  const response =
    await context.next();

  if (!response.ok) {
    return response;
  }

  const html =
    await response.text();

  /*
   * ---------------------------------------------------------
   * FINAL METADATA
   * ---------------------------------------------------------
   */

  const title =
    meta.title ||
    SITE_NAME;

  const description =
    cleanDescription(
      meta.description ||
        DEFAULT_DESCRIPTION,
    );

  /*
   * Always provide a valid image.
   *
   * If the content doesn't have an image, use the official
   * default social preview image.
   */
  const image =
    absoluteUrl(
      url,
      meta.image || DEFAULT_IMAGE,
    ) || DEFAULT_IMAGE;

  const pageUrl =
    canonicalPageUrl(url);

  const type =
    meta.type ||
    "website";

  /*
   * ---------------------------------------------------------
   * JSON-LD
   * ---------------------------------------------------------
   */

  const jsonLd =
    buildJsonLd({
      route,
      title,
      description,
      image,
      pageUrl,
      meta,
    });

  /*
   * ---------------------------------------------------------
   * INJECT EVERYTHING
   * ---------------------------------------------------------
   */

  const rewritten =
    injectMeta(html, {
      title,
      description,
      image,
      pageUrl,
      type,
      jsonLd,
    });

  const headers =
    new Headers(
      response.headers,
    );

  headers.set(
    "content-type",
    "text/html; charset=UTF-8",
  );

  /*
   * Tell crawlers/proxies that the response varies
   * according to the User-Agent.
   */
  headers.set(
    "Vary",
    "User-Agent",
  );

  return new Response(
    rewritten,
    {
      status:
        response.status,

      statusText:
        response.statusText,

      headers,
    },
  );
};


/* =========================================================
   ROUTE MATCHING
   ========================================================= */

function matchRoute(pathname) {
  const table = [
    {
      re:
        /^\/news\/([^/]+)\/?$/,

      build:
        buildNewsMeta,
    },

    {
      re:
        /^\/match-reports\/([^/]+)\/?$/,

      build:
        buildMatchReportMeta,
    },

    {
      re:
        /^\/community\/([^/]+)\/?$/,

      build:
        buildActivityMeta,
    },

    {
      re:
        /^\/events\/([^/]+)\/?$/,

      build:
        buildEventMeta,
    },

    {
      re:
        /^\/gallery\/([^/]+)\/?$/,

      build:
        buildGalleryMeta,
    },

    {
      re:
        /^\/matches\/([^/]+)\/?$/,

      build:
        buildMatchMeta,
    },

    {
      re:
        /^\/players\/([^/]+)\/?$/,

      build:
        buildPlayerMeta,
    },

    {
      re:
        /^\/competitions\/([^/]+)\/?$/,

      build:
        buildCompetitionMeta,
    },
  ];

  for (const entry of table) {
    const match =
      pathname.match(
        entry.re,
      );

    if (!match) {
      continue;
    }

    return {
      slug:
        decodeURIComponent(
          match[1],
        ),

      build:
        entry.build,
    };
  }

  return null;
}


/* =========================================================
   SUPABASE REST
   ========================================================= */

async function sb(
  path,
  params = {},
) {
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_ANON_KEY is not configured.",
    );
  }

  const url =
    new URL(
      `${SUPABASE_URL}/rest/v1/${path}`,
    );

  for (
    const [
      key,
      value,
    ]
    of Object.entries(params)
  ) {
    if (
      value !== undefined &&
      value !== null
    ) {
      url.searchParams.set(
        key,
        value,
      );
    }
  }

  const response =
    await fetch(
      url.toString(),
      {
        headers: {
          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`,

          Accept:
            "application/json",
        },
      },
    );

  if (!response.ok) {
    const body =
      await response.text()
        .catch(() => "");

    throw new Error(
      `Supabase REST ${response.status}: ${path}${body ? ` — ${body}` : ""}`,
    );
  }

  return response.json();
}


/* =========================================================
   MEDIA
   ========================================================= */

async function getCoverImage(
  postType,
  postId,
) {
  if (!postId) {
    return null;
  }

  const rows =
    await sb(
      "post_media",
      {
        select:
          "media_library(url)",

        post_type:
          `eq.${postType}`,

        post_id:
          `eq.${postId}`,

        order:
          "display_order.asc",

        limit:
          "1",
      },
    );

  return (
    rows?.[0]?.media_library?.url ||
    null
  );
}


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function stripHtml(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " ",
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " ",
    )
    .replace(
      /<[^>]+>/g,
      " ",
    )
    .replace(
      /&nbsp;/gi,
      " ",
    )
    .replace(
      /&amp;/gi,
      "&",
    )
    .replace(
      /&quot;/gi,
      '"',
    )
    .replace(
      /&#39;/gi,
      "'",
    )
    .replace(
      /&lt;/gi,
      "<",
    )
    .replace(
      /&gt;/gi,
      ">",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}


function excerptFrom(
  body,
  len = 160,
) {
  const plain =
    stripHtml(body);

  if (!plain) {
    return "";
  }

  if (
    plain.length <= len
  ) {
    return plain;
  }

  return (
    `${plain.slice(
      0,
      len - 1,
    ).trim()}…`
  );
}


function cleanDescription(
  value,
) {
  const text =
    stripHtml(value);

  if (!text) {
    return DEFAULT_DESCRIPTION;
  }

  /*
   * Social descriptions are easier to handle when they
   * aren't excessively long.
   */
  if (text.length > 300) {
    return (
      `${text.slice(0, 299).trim()}…`
    );
  }

  return text;
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeAttr(value) {
  return String(
    value ?? "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    );
}


/* =========================================================
   URL HELPERS
   ========================================================= */

function absoluteUrl(
  pageUrl,
  path,
) {
  if (!path) {
    return null;
  }

  const value =
    String(path).trim();

  if (!value) {
    return null;
  }

  /*
   * Already absolute.
   */
  if (
    /^https?:\/\//i.test(
      value,
    )
  ) {
    return value;
  }

  /*
   * Protocol-relative URL.
   */
  if (
    value.startsWith("//")
  ) {
    return `https:${value}`;
  }

  try {
    return new URL(
      value,
      pageUrl.origin,
    ).toString();
  } catch {
    return null;
  }
}


function canonicalPageUrl(
  url,
) {
  /*
   * Remove tracking parameters from the canonical URL.
   */
  const canonical =
    new URL(url.toString());

  const trackingParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
  ];

  for (
    const param
    of trackingParams
  ) {
    canonical.searchParams.delete(
      param,
    );
  }

  /*
   * Normalize trailing slash except for root.
   */
  if (
    canonical.pathname.length > 1
  ) {
    canonical.pathname =
      canonical.pathname.replace(
        /\/+$/,
        "",
      );
  }

  return canonical.toString();
}


/* =========================================================
   META BUILDERS
   ========================================================= */

async function buildNewsMeta(
  slug,
) {
  const rows =
    await sb(
      "news_posts",
      {
        select:
          "id,title,body",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const post =
    rows?.[0];

  if (!post) {
    return null;
  }

  const image =
    await getCoverImage(
      "news",
      post.id,
    );

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      excerptFrom(
        post.body,
      ) ||
      `Read the latest news from ${SITE_NAME}.`,

    image,

    type:
      "article",

    post,
  };
}


async function buildMatchReportMeta(
  slug,
) {
  const rows =
    await sb(
      "match_report_posts",
      {
        select:
          "id,title,body",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const post =
    rows?.[0];

  if (!post) {
    return null;
  }

  const image =
    await getCoverImage(
      "match_report",
      post.id,
    );

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      excerptFrom(
        post.body,
      ) ||
      `Read the latest match report from ${SITE_NAME}.`,

    image,

    type:
      "article",

    post,
  };
}


async function buildActivityMeta(
  slug,
) {
  const rows =
    await sb(
      "activity_posts",
      {
        select:
          "id,title,body",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const post =
    rows?.[0];

  if (!post) {
    return null;
  }

  const image =
    await getCoverImage(
      "activity",
      post.id,
    );

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      excerptFrom(
        post.body,
      ) ||
      `See the latest community updates from ${SITE_NAME}.`,

    image,

    type:
      "article",

    post,
  };
}


async function buildEventMeta(
  slug,
) {
  const rows =
    await sb(
      "event_posts",
      {
        select:
          "id,title,body,location,event_date",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const post =
    rows?.[0];

  if (!post) {
    return null;
  }

  const image =
    await getCoverImage(
      "event",
      post.id,
    );

  const descriptionParts =
    [];

  if (post.event_date) {
    descriptionParts.push(
      String(
        post.event_date,
      ),
    );
  }

  if (post.location) {
    descriptionParts.push(
      String(
        post.location,
      ),
    );
  }

  const prefix =
    descriptionParts.length
      ? `${descriptionParts.join(
          " · ",
        )} — `
      : "";

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      cleanDescription(
        `${prefix}${excerptFrom(
          post.body,
          180,
        )}`,
      ),

    image,

    type:
      "website",

    event:
      post,
  };
}


async function buildGalleryMeta(
  slug,
) {
  const rows =
    await sb(
      "media_library",
      {
        select:
          "url,slug",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const item =
    rows?.[0];

  if (!item) {
    return null;
  }

  return {
    title:
      `Photo Gallery | ${SITE_NAME}`,

    description:
      `See photos from ${SITE_NAME} in our official gallery.`,

    image:
      item.url,

    type:
      "website",

    gallery:
      item,
  };
}


async function buildMatchMeta(
  slug,
) {
  const rows =
    await sb(
      "matches",
      {
        select:
          "slug,match_date,status,our_score,opponent_score,is_home,opponent_team_id",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const match =
    rows?.[0];

  if (!match) {
    return null;
  }

  let opponent =
    null;

  if (
    match.opponent_team_id
  ) {
    const teams =
      await sb(
        "teams",
        {
          select:
            "name,logo_url",

          id:
            `eq.${match.opponent_team_id}`,

          limit:
            "1",
        },
      );

    opponent =
      teams?.[0] ||
      null;
  }

  const opponentName =
    opponent?.name ||
    "TBD";

  const isHome =
    match.is_home !== false;

  const homeLabel =
    isHome
      ? SITE_NAME
      : opponentName;

  const awayLabel =
    isHome
      ? opponentName
      : SITE_NAME;

  const isCompleted =
    match.status ===
    "completed";

  const scoreLine =
    isCompleted
      ? `${match.our_score ?? 0}-${match.opponent_score ?? 0}`
      : "vs";

  return {
    title:
      `${homeLabel} ${scoreLine} ${awayLabel} | ${SITE_NAME}`,

    description:
      isCompleted
        ? `Full result: ${homeLabel} ${scoreLine} ${awayLabel}.`
        : `Upcoming fixture: ${homeLabel} vs ${awayLabel}${
            match.match_date
              ? ` on ${match.match_date}`
              : ""
          }.`,


    /*
     * Prefer the opponent logo only if it exists.
     * Otherwise the global default image is used.
     */
    image:
      opponent?.logo_url ||
      null,

    type:
      "website",

    match,

    opponent,
  };
}


async function buildPlayerMeta(
  slug,
) {
  const rows =
    await sb(
      "players",
      {
        select:
          "full_name,position,jersey_number,photo_url",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const player =
    rows?.[0];

  if (!player) {
    return null;
  }

  const detailParts =
    [];

  if (player.position) {
    detailParts.push(
      player.position,
    );
  }

  if (
    player.jersey_number !==
      null &&
    player.jersey_number !==
      undefined
  ) {
    detailParts.push(
      `#${player.jersey_number}`,
    );
  }

  return {
    title:
      `${player.full_name} | ${SITE_NAME}`,

    description:
      detailParts.length
        ? `${player.full_name} — ${detailParts.join(
            " · ",
          )} for ${SITE_NAME}.`
        : `${player.full_name} — player profile for ${SITE_NAME}.`,

    image:
      player.photo_url ||
      null,

    type:
      "profile",

    player,
  };
}


async function buildCompetitionMeta(
  slug,
) {
  const rows =
    await sb(
      "competitions",
      {
        select:
          "name,season",

        slug:
          `eq.${slug}`,

        limit:
          "1",
      },
    );

  const competition =
    rows?.[0];

  if (!competition) {
    return null;
  }

  const seasonText =
    competition.season
      ? ` (${competition.season})`
      : "";

  return {
    title:
      `${competition.name}${seasonText} | ${SITE_NAME}`,

    description:
      `Fixtures, results and competition information for ${competition.name}${seasonText} — ${SITE_NAME}.`,

    image:
      null,

    type:
      "website",

    competition,
  };
}


/* =========================================================
   JSON-LD
   ========================================================= */

function buildJsonLd({
  route,
  title,
  description,
  image,
  pageUrl,
  meta,
}) {
  const teamId =
    `${SITE_URL}/#team`;

  const websiteId =
    `${SITE_URL}/#website`;

  const webpageId =
    `${pageUrl}#webpage`;

  const graph = [
    /*
     * -------------------------------------------------------
     * CLUB
     * -------------------------------------------------------
     */
    {
      "@type":
        "SportsTeam",

      "@id":
        teamId,

      name:
        SITE_NAME,

      sport:
        "Football",

      url:
        SITE_URL,

      logo: {
        "@type":
          "ImageObject",

        url:
          DEFAULT_LOGO,
      },
    },

    /*
     * -------------------------------------------------------
     * WEBSITE
     * -------------------------------------------------------
     */
    {
      "@type":
        "WebSite",

      "@id":
        websiteId,

      url:
        SITE_URL,

      name:
        SITE_NAME,

      description:
        "Official home of Maguje FC — fixtures, results, standings, news, players, competitions and club information.",

      publisher: {
        "@id":
          teamId,
      },
    },

    /*
     * -------------------------------------------------------
     * WEBPAGE
     * -------------------------------------------------------
     */
    {
      "@type":
        "WebPage",

      "@id":
        webpageId,

      url:
        pageUrl,

      name:
        title,

      description:
        description,

      image:
        image
          ? [image]
          : undefined,

      isPartOf: {
        "@id":
          websiteId,
      },

      about: {
        "@id":
          teamId,
      },
    },
  ];


  /* =======================================================
     ARTICLE
     ======================================================= */

  if (
    route.build ===
      buildNewsMeta ||

    route.build ===
      buildMatchReportMeta ||

    route.build ===
      buildActivityMeta
  ) {
    const articleTitle =
      title.replace(
        ` | ${SITE_NAME}`,
        "",
      );

    graph.push({
      "@type":
        "Article",

      "@id":
        `${pageUrl}#article`,

      headline:
        articleTitle,

      description:
        description,

      image:
        image
          ? [image]
          : undefined,

      mainEntityOfPage: {
        "@id":
          webpageId,
      },

      publisher: {
        "@id":
          teamId,
      },
    });
  }


  /* =======================================================
     EVENT
     ======================================================= */

  if (
    route.build ===
      buildEventMeta &&

    meta?.event
  ) {
    const event =
      meta.event;

    graph.push({
      "@type":
        "Event",

      "@id":
        `${pageUrl}#event`,

      name:
        event.title ||
        title.replace(
          ` | ${SITE_NAME}`,
          "",
        ),

      description:
        description,

      url:
        pageUrl,

      image:
        image
          ? [image]
          : undefined,

      organizer: {
        "@id":
          teamId,
      },

      startDate:
        event.event_date ||
        undefined,

      location:
        event.location
          ? {
              "@type":
                "Place",

              name:
                event.location,
            }
          : undefined,
    });
  }


  /* =======================================================
     GALLERY
     ======================================================= */

  if (
    route.build ===
      buildGalleryMeta
  ) {
    graph.push({
      "@type":
        "ImageGallery",

      "@id":
        `${pageUrl}#gallery`,

      name:
        title,

      description:
        description,

      url:
        pageUrl,

      image:
        image
          ? [image]
          : undefined,

      publisher: {
        "@id":
          teamId,
      },
    });
  }


  /* =======================================================
     PLAYER
     ======================================================= */

  if (
    route.build ===
      buildPlayerMeta &&

    meta?.player
  ) {
    const player =
      meta.player;

    graph.push({
      "@type":
        "Person",

      "@id":
        `${pageUrl}#person`,

      name:
        player.full_name,

      url:
        pageUrl,

      image:
        player.photo_url
          ? [
              absoluteUrl(
                new URL(pageUrl),
                player.photo_url,
              ),
            ]
          : undefined,

      memberOf: {
        "@id":
          teamId,
      },

      jobTitle:
        player.position ||
        undefined,
    });
  }


  /* =======================================================
     MATCH
     ======================================================= */

  if (
    route.build ===
      buildMatchMeta &&

    meta?.match
  ) {
    const opponentName =
      meta.opponent?.name ||
      "TBD";

    const isHome =
      meta.match.is_home !==
      false;

    const homeTeam =
      isHome
        ? SITE_NAME
        : opponentName;

    const awayTeam =
      isHome
        ? opponentName
        : SITE_NAME;

    const matchEvent = {
      "@type":
        "SportsEvent",

      "@id":
        `${pageUrl}#match`,

      name:
        `${homeTeam} vs ${awayTeam}`,

      url:
        pageUrl,

      image:
        image
          ? [image]
          : undefined,

      homeTeam: {
        "@type":
          "SportsTeam",

        name:
          homeTeam,
      },

      awayTeam: {
        "@type":
          "SportsTeam",

        name:
          awayTeam,
      },

      sport:
        "Football",

      organizer: {
        "@id":
          teamId,
      },

      startDate:
        meta.match.match_date ||
        undefined,
    };

    /*
     * Add the final score where available.
     */
    if (
      meta.match.status ===
        "completed"
    ) {
      matchEvent.eventStatus =
        "https://schema.org/EventScheduled";

      matchEvent.description =
        description;
    }

    graph.push(
      matchEvent,
    );
  }


  /* =======================================================
     COMPETITION
     ======================================================= */

  if (
    route.build ===
      buildCompetitionMeta &&

    meta?.competition
  ) {
    graph.push({
      "@type":
        "SportsEvent",

      "@id":
        `${pageUrl}#competition`,

      name:
        meta.competition.name,

      url:
        pageUrl,

      description:
        description,

      sport:
        "Football",

      organizer: {
        "@id":
          teamId,
      },
    });
  }


  return {
    "@context":
      "https://schema.org",

    "@graph":
      graph,
  };
}


/* =========================================================
   HTML META INJECTION
   ========================================================= */

function injectMeta(
  html,
  {
    title,
    description,
    image,
    pageUrl,
    type,
    jsonLd,
  },
) {
  const safeTitle =
    escapeAttr(title);

  const safeDescription =
    escapeAttr(description);

  const safeImage =
    escapeAttr(image);

  const safeUrl =
    escapeAttr(pageUrl);

  const safeType =
    escapeAttr(
      type ||
        "website",
    );

  let out =
    html;


  /* =======================================================
     TITLE
     ======================================================= */

  out =
    replaceOrInsert(
      out,

      /<title\b[^>]*>[\s\S]*?<\/title>/i,

      `<title>${safeTitle}</title>`,
    );


  /* =======================================================
     DESCRIPTION
     ======================================================= */

  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']description["'][^>]*>/i,

      `<meta name="description" content="${safeDescription}">`,
    );


  /* =======================================================
     ROBOTS
     ======================================================= */

  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']robots["'][^>]*>/i,

      `<meta name="robots" content="index, follow">`,
    );


  /* =======================================================
     CANONICAL
     ======================================================= */

  out =
    replaceOrInsert(
      out,

      /<link\s+rel=["']canonical["'][^>]*>/i,

      `<link rel="canonical" href="${safeUrl}">`,
    );


  /* =======================================================
     OPEN GRAPH
     ======================================================= */

  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:site_name["'][^>]*>/i,

      `<meta property="og:site_name" content="${escapeAttr(
        SITE_NAME,
      )}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:title["'][^>]*>/i,

      `<meta property="og:title" content="${safeTitle}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:description["'][^>]*>/i,

      `<meta property="og:description" content="${safeDescription}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:type["'][^>]*>/i,

      `<meta property="og:type" content="${safeType}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:url["'][^>]*>/i,

      `<meta property="og:url" content="${safeUrl}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:image["'][^>]*>/i,

      `<meta property="og:image" content="${safeImage}">`,
    );


  /*
   * Explicit image MIME/size information.
   *
   * Your default image is expected to be a normal JPEG.
   */
  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:image:secure_url["'][^>]*>/i,

      `<meta property="og:image:secure_url" content="${safeImage}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:image:alt["'][^>]*>/i,

      `<meta property="og:image:alt" content="${safeTitle}">`,
    );


  /*
   * These dimensions are particularly useful for large
   * social previews.
   */
  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:image:width["'][^>]*>/i,

      `<meta property="og:image:width" content="1200">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+property=["']og:image:height["'][^>]*>/i,

      `<meta property="og:image:height" content="630">`,
    );


  /* =======================================================
     TWITTER / X
     ======================================================= */

  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']twitter:card["'][^>]*>/i,

      `<meta name="twitter:card" content="summary_large_image">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']twitter:title["'][^>]*>/i,

      `<meta name="twitter:title" content="${safeTitle}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']twitter:description["'][^>]*>/i,

      `<meta name="twitter:description" content="${safeDescription}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']twitter:image["'][^>]*>/i,

      `<meta name="twitter:image" content="${safeImage}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']twitter:image:alt["'][^>]*>/i,

      `<meta name="twitter:image:alt" content="${safeTitle}">`,
    );


  out =
    replaceOrInsert(
      out,

      /<meta\s+name=["']twitter:url["'][^>]*>/i,

      `<meta name="twitter:url" content="${safeUrl}">`,
    );


  /* =======================================================
     JSON-LD
     ======================================================= */

  out =
    injectJsonLd(
      out,
      jsonLd,
    );


  return out;
}


/* =========================================================
   REPLACE OR INSERT
   ========================================================= */

function replaceOrInsert(
  html,
  regex,
  replacement,
) {
  if (
    regex.test(html)
  ) {
    return html.replace(
      regex,
      replacement,
    );
  }

  return html.replace(
    /<\/head>/i,

    `  ${replacement}\n</head>`,
  );
}


/* =========================================================
   JSON-LD INJECTION
   ========================================================= */

function injectJsonLd(
  html,
  data,
) {
  if (!data) {
    return html;
  }

  /*
   * Remove an old generated JSON-LD block if present.
   */
  let out =
    html.replace(
      /<script[^>]*data-maguje-jsonld[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );


  /*
   * Escape characters that could terminate or interfere
   * with a script block.
   */
  const json =
    JSON.stringify(data)
      .replaceAll(
        "<",
        "\\u003c",
      )
      .replaceAll(
        ">",
        "\\u003e",
      )
      .replaceAll(
        "&",
        "\\u0026",
      );


  const script =
    `<script type="application/ld+json" data-maguje-jsonld="true">${json}</script>`;


  out =
    out.replace(
      /<\/head>/i,

      `  ${script}\n</head>`,
    );


  return out;
}