// netlify/edge-functions/og-meta.js
//
// Server-side metadata injection for social/search crawlers.
//
// Regular visitors are NOT rewritten.
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

const SUPABASE_URL =
  "https://pxtexddyvthgmietwhyc.supabase.co";

const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") || "";

const SITE_NAME = "Maguje FC";
const SITE_URL = "https://magujefc.netlify.app";

const DEFAULT_IMAGE =
  `${SITE_URL}/assets/og-default.jpg`;

const DEFAULT_LOGO =
  `${SITE_URL}/assets/maguje_logo.png`;

// Social/search crawlers that should receive server-side metadata.
const CRAWLER_UA =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot/i;

export default async (request, context) => {
  const userAgent =
    request.headers.get("user-agent") || "";

  // -------------------------------------------------------------
  // Normal browser request:
  // Let Netlify serve the normal SPA untouched.
  // -------------------------------------------------------------
  if (!CRAWLER_UA.test(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);

  const route = matchRoute(url.pathname);

  // Not a supported content-detail route.
  if (!route) {
    return context.next();
  }

  let meta;

  try {
    meta = await route.build(route.slug);
  } catch (err) {
    console.error(
      "[og-meta] metadata fetch failed:",
      err,
    );

    return context.next();
  }

  if (!meta) {
    return context.next();
  }

  const response = await context.next();

  if (!response.ok) {
    return response;
  }

  const html = await response.text();

  const image =
    absoluteUrl(
      url,
      meta.image || DEFAULT_IMAGE,
    );

  const rewritten = injectMeta(html, {
    title: meta.title,
    description:
      meta.description ||
      "Official content from Maguje FC.",
    image,
    pageUrl: url.toString(),
    type: meta.type || "website",
    jsonLd: buildJsonLd({
      route,
      title: meta.title,
      description:
        meta.description ||
        "Official content from Maguje FC.",
      image,
      pageUrl: url.toString(),
      meta,
    }),
  });

  const headers = new Headers(response.headers);

  headers.set(
    "content-type",
    "text/html; charset=UTF-8",
  );

  return new Response(rewritten, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/* =========================================================
   ROUTE MATCHING
   ========================================================= */

function matchRoute(pathname) {
  const table = [
    {
      re: /^\/news\/([^/]+)\/?$/,
      build: buildNewsMeta,
    },
    {
      re: /^\/match-reports\/([^/]+)\/?$/,
      build: buildMatchReportMeta,
    },
    {
      re: /^\/community\/([^/]+)\/?$/,
      build: buildActivityMeta,
    },
    {
      re: /^\/events\/([^/]+)\/?$/,
      build: buildEventMeta,
    },
    {
      re: /^\/gallery\/([^/]+)\/?$/,
      build: buildGalleryMeta,
    },
    {
      re: /^\/matches\/([^/]+)\/?$/,
      build: buildMatchMeta,
    },
    {
      re: /^\/players\/([^/]+)\/?$/,
      build: buildPlayerMeta,
    },
    {
      re: /^\/competitions\/([^/]+)\/?$/,
      build: buildCompetitionMeta,
    },
  ];

  for (const entry of table) {
    const match = pathname.match(entry.re);

    if (match) {
      return {
        slug: decodeURIComponent(match[1]),
        build: entry.build,
      };
    }
  }

  return null;
}

/* =========================================================
   SUPABASE REST
   ========================================================= */

async function sb(path, params = {}) {
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_ANON_KEY is not configured.",
    );
  }

  const url =
    new URL(
      `${SUPABASE_URL}/rest/v1/${path}`,
    );

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization:
        `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase REST ${response.status}: ${path}`,
    );
  }

  return response.json();
}

async function getCoverImage(postType, postId) {
  if (!postId) return null;

  const rows = await sb("post_media", {
    select: "media_library(url)",
    post_type: `eq.${postType}`,
    post_id: `eq.${postId}`,
    order: "display_order.asc",
    limit: "1",
  });

  return (
    rows?.[0]?.media_library?.url ||
    null
  );
}

/* =========================================================
   TEXT HELPERS
   ========================================================= */

function excerptFrom(body, len = 160) {
  if (!body) return "";

  const plain = String(body)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= len) {
    return plain;
  }

  return `${plain.slice(0, len - 1).trim()}…`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function absoluteUrl(pageUrl, path) {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(
    path,
    pageUrl.origin,
  ).toString();
}

/* =========================================================
   META BUILDERS
   ========================================================= */

async function buildNewsMeta(slug) {
  const rows = await sb("news_posts", {
    select: "id,title,body",
    slug: `eq.${slug}`,
    limit: "1",
  });

  const post = rows?.[0];

  if (!post) return null;

  const image = await getCoverImage(
    "news",
    post.id,
  );

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      excerptFrom(post.body),

    image,

    type: "article",
  };
}

async function buildMatchReportMeta(slug) {
  const rows = await sb(
    "match_report_posts",
    {
      select: "id,title,body",
      slug: `eq.${slug}`,
      limit: "1",
    },
  );

  const post = rows?.[0];

  if (!post) return null;

  const image = await getCoverImage(
    "match_report",
    post.id,
  );

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      excerptFrom(post.body),

    image,

    type: "article",
  };
}

async function buildActivityMeta(slug) {
  const rows = await sb(
    "activity_posts",
    {
      select: "id,title,body",
      slug: `eq.${slug}`,
      limit: "1",
    },
  );

  const post = rows?.[0];

  if (!post) return null;

  const image = await getCoverImage(
    "activity",
    post.id,
  );

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      excerptFrom(post.body),

    image,

    type: "article",
  };
}

async function buildEventMeta(slug) {
  const rows = await sb(
    "event_posts",
    {
      select:
        "id,title,body,location,event_date",
      slug: `eq.${slug}`,
      limit: "1",
    },
  );

  const post = rows?.[0];

  if (!post) return null;

  const image = await getCoverImage(
    "event",
    post.id,
  );

  const descriptionParts = [];

  if (post.event_date) {
    descriptionParts.push(
      post.event_date,
    );
  }

  if (post.location) {
    descriptionParts.push(
      post.location,
    );
  }

  const prefix =
    descriptionParts.length
      ? `${descriptionParts.join(" · ")} — `
      : "";

  return {
    title:
      `${post.title} | ${SITE_NAME}`,

    description:
      `${prefix}${excerptFrom(
        post.body,
        140,
      )}`,

    image,

    type: "event",
  };
}

async function buildGalleryMeta(slug) {
  const rows = await sb(
    "media_library",
    {
      select: "url",
      slug: `eq.${slug}`,
      limit: "1",
    },
  );

  const item = rows?.[0];

  if (!item) return null;

  return {
    title:
      `Photo Gallery | ${SITE_NAME}`,

    description:
      `See more photos from ${SITE_NAME} on our gallery page.`,

    image: item.url,

    type: "website",
  };
}

async function buildMatchMeta(slug) {
  const rows = await sb(
    "matches",
    {
      select:
        "slug,match_date,status,our_score,opponent_score,is_home,opponent_team_id",
      slug: `eq.${slug}`,
      limit: "1",
    },
  );

  const match = rows?.[0];

  if (!match) return null;

  let opponent = null;

  if (match.opponent_team_id) {
    const teams = await sb(
      "teams",
      {
        select: "name,logo_url",
        id:
          `eq.${match.opponent_team_id}`,
        limit: "1",
      },
    );

    opponent = teams?.[0] || null;
  }

  const opponentName =
    opponent?.name || "TBD";

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
    match.status === "completed";

  const scoreLine =
    isCompleted
      ? `${match.our_score ?? 0}-${match.opponent_score ?? 0}`
      : "vs";

  return {
    title:
      `${homeLabel} ${scoreLine} ${awayLabel} | ${SITE_NAME}`,

    description:
      isCompleted
        ? `Full result from ${homeLabel} ${scoreLine} ${awayLabel}.`
        : `Upcoming fixture: ${homeLabel} vs ${awayLabel}${
            match.match_date
              ? ` on ${match.match_date}`
              : ""
          }.`,

    image:
      opponent?.logo_url || null,

    type: "website",

    match,
    opponent,
  };
}

async function buildPlayerMeta(slug) {
  const rows = await sb(
    "players",
    {
      select:
        "full_name,position,jersey_number,photo_url",
      slug: `eq.${slug}`,
      limit: "1",
    },
  );

  const player = rows?.[0];

  if (!player) return null;

  const detailParts = [];

  if (player.position) {
    detailParts.push(
      player.position,
    );
  }

  if (
    player.jersey_number !== null &&
    player.jersey_number !== undefined
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

    image: player.photo_url,

    type: "profile",

    player,
  };
}

async function buildCompetitionMeta(slug) {
  const rows = await sb(
    "competitions",
    {
      select: "name,season",
      slug: `eq.${slug}`,
      limit: "1",
    },
  );

  const competition = rows?.[0];

  if (!competition) return null;

  return {
    title:
      `${competition.name}${
        competition.season
          ? ` (${competition.season})`
          : ""
      } | ${SITE_NAME}`,

    description:
      `Standings, fixtures and results for ${competition.name} — ${SITE_NAME}.`,

    image: null,

    type: "website",

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
  const page = new URL(pageUrl);

  const teamId =
    `${SITE_URL}/#team`;

  const graph = [
    {
      "@type": "SportsTeam",
      "@id": teamId,
      name: SITE_NAME,
      sport: "Football",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_LOGO,
      },
    },

    {
      "@type": "WebSite",
      "@id":
        `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description:
        "Official home of Maguje FC — fixtures, results, standings, news, players, competitions and club information.",
      publisher: {
        "@id": teamId,
      },
    },

    {
      "@type": "WebPage",
      "@id":
        `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      isPartOf: {
        "@id":
          `${SITE_URL}/#website`,
      },
      about: {
        "@id": teamId,
      },
    },
  ];

  // -----------------------------------------------------------
  // News / match report / activity
  // -----------------------------------------------------------
  if (
    route.build === buildNewsMeta ||
    route.build === buildMatchReportMeta ||
    route.build === buildActivityMeta
  ) {
    graph.push({
      "@type": "Article",
      "@id":
        `${pageUrl}#article`,
      headline:
        title.replace(
          ` | ${SITE_NAME}`,
          "",
        ),
      description,
      image: [image],
      mainEntityOfPage: {
        "@id":
          `${pageUrl}#webpage`,
      },
      publisher: {
        "@id": teamId,
      },
    });
  }

  // -----------------------------------------------------------
  // Event
  // -----------------------------------------------------------
  if (
    route.build === buildEventMeta &&
    meta?.event
  ) {
    graph.push({
      "@type": "Event",
      "@id":
        `${pageUrl}#event`,
      name:
        meta.event.title ||
        title.replace(
          ` | ${SITE_NAME}`,
          "",
        ),
      description,
      url: pageUrl,
      image: [image],
      organizer: {
        "@id": teamId,
      },
    });
  }

  // -----------------------------------------------------------
  // Player
  // -----------------------------------------------------------
  if (
    route.build === buildPlayerMeta &&
    meta?.player
  ) {
    graph.push({
      "@type": "Person",
      "@id":
        `${pageUrl}#person`,
      name:
        meta.player.full_name,
      url: pageUrl,
      image:
        meta.player.photo_url
          ? [
              absoluteUrl(
                page,
                meta.player.photo_url,
              ),
            ]
          : undefined,
      memberOf: {
        "@id": teamId,
      },
      jobTitle:
        meta.player.position ||
        undefined,
    });
  }

  // -----------------------------------------------------------
  // Match
  // -----------------------------------------------------------
  if (
    route.build === buildMatchMeta &&
    meta?.match
  ) {
    const opponentName =
      meta.opponent?.name ||
      "TBD";

    const isHome =
      meta.match.is_home !== false;

    const homeTeam =
      isHome
        ? SITE_NAME
        : opponentName;

    const awayTeam =
      isHome
        ? opponentName
        : SITE_NAME;

    graph.push({
      "@type": "SportsEvent",
      "@id":
        `${pageUrl}#match`,
      name:
        `${homeTeam} vs ${awayTeam}`,
      url: pageUrl,
      image: [image],
      homeTeam: {
        "@type": "SportsTeam",
        name: homeTeam,
      },
      awayTeam: {
        "@type": "SportsTeam",
        name: awayTeam,
      },
      sport: "Football",
      organizer: {
        "@id": teamId,
      },
      startDate:
        meta.match.match_date ||
        undefined,
    });
  }

  // -----------------------------------------------------------
  // Competition
  // -----------------------------------------------------------
  if (
    route.build === buildCompetitionMeta &&
    meta?.competition
  ) {
    graph.push({
      "@type": "SportsEvent",
      "@id":
        `${pageUrl}#competition`,
      name:
        meta.competition.name,
      url: pageUrl,
      sport: "Football",
      organizer: {
        "@id": teamId,
      },
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
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
    escapeAttr(type || "website");

  let out = html;

  // -----------------------------------------------------------
  // TITLE
  // -----------------------------------------------------------
  out = replaceOrInsert(
    out,
    /<title>.*?<\/title>/i,
    `<title>${safeTitle}</title>`,
  );

  // -----------------------------------------------------------
  // DESCRIPTION
  // -----------------------------------------------------------
  out = replaceOrInsert(
    out,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${safeDescription}">`,
  );

  // -----------------------------------------------------------
  // ROBOTS
  // -----------------------------------------------------------
  out = replaceOrInsert(
    out,
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="index, follow">`,
  );

  // -----------------------------------------------------------
  // CANONICAL
  // -----------------------------------------------------------
  out = replaceOrInsert(
    out,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${safeUrl}">`,
  );

  // -----------------------------------------------------------
  // OPEN GRAPH
  // -----------------------------------------------------------
  out = replaceOrInsert(
    out,
    /<meta\s+property=["']og:site_name["'][^>]*>/i,
    `<meta property="og:site_name" content="${escapeAttr(
      SITE_NAME,
    )}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${safeTitle}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${safeDescription}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${safeType}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${safeUrl}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${safeImage}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+property=["']og:image:alt["'][^>]*>/i,
    `<meta property="og:image:alt" content="${safeTitle}">`,
  );

  // -----------------------------------------------------------
  // TWITTER / X
  // -----------------------------------------------------------
  out = replaceOrInsert(
    out,
    /<meta\s+name=["']twitter:card["'][^>]*>/i,
    `<meta name="twitter:card" content="summary_large_image">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${safeTitle}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${safeDescription}">`,
  );

  out = replaceOrInsert(
    out,
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${safeImage}">`,
  );

  // -----------------------------------------------------------
  // JSON-LD
  // -----------------------------------------------------------
  out = injectJsonLd(
    out,
    jsonLd,
  );

  return out;
}

function replaceOrInsert(
  html,
  regex,
  replacement,
) {
  if (regex.test(html)) {
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

function injectJsonLd(
  html,
  data,
) {
  if (!data) return html;

  // Remove a previous generated block if one exists.
  let out = html.replace(
    /<script[^>]*data-maguje-jsonld[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );

  const json = JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

  const script =
    `<script type="application/ld+json" data-maguje-jsonld="true">${json}</script>`;

  out = out.replace(
    /<\/head>/i,
    `  ${script}\n</head>`,
  );

  return out;
}