// netlify/edge-functions/og-meta.js
//
// Injects per-page og:title / og:description / og:image (and og:url) into
// the served HTML, but ONLY for known social-preview crawlers hitting a
// content-detail route. Regular visitors always fall straight through to
// the normal SPA response untouched.

const SUPABASE_URL = "https://pxtexddyvthgmietwhyc.supabase.co";
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dGV4ZGR5dnRoZ21pZXR3aHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjY3MzcsImV4cCI6MjEwMTI0MjczN30.zO-XzH622ihYWrHHQ8cijXzlxWtNWQzLI42gker_Eq8";

const SITE_NAME = "Maguje FC";
const DEFAULT_IMAGE = "/assets/og-default.jpg";

// Any request whose User-Agent matches one of these is treated as a
// "give me a preview" crawler rather than a real visitor. Facebook and
// WhatsApp are the two that actually matter right now; the rest are
// free to include and cost nothing.
const CRAWLER_UA = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot/i;

export default async (request, context) => {
  const userAgent = request.headers.get("user-agent") || "";

  if (!CRAWLER_UA.test(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const route = matchRoute(url.pathname);

  if (!route) {
    return context.next();
  }

  let meta;
  try {
    meta = await route.build(route.slug);
  } catch (err) {
    console.error("[og-meta] fetch failed:", err);
    return context.next();
  }

  if (!meta) {
    return context.next();
  }

  const response = await context.next();
  const html = await response.text();

  const rewritten = injectMeta(html, {
    title: meta.title,
    description: meta.description,
    image: absoluteUrl(url, meta.image || DEFAULT_IMAGE),
    pageUrl: url.toString(),
  });

  return new Response(rewritten, {
    status: response.status,
    headers: response.headers,
  });
};

/* =========================================================
   ROUTE MATCHING
   ========================================================= */

function matchRoute(pathname) {
  const table = [
    { re: /^\/news\/([^/]+)\/?$/, build: buildNewsMeta },
    { re: /^\/match-reports\/([^/]+)\/?$/, build: buildMatchReportMeta },
    { re: /^\/community\/([^/]+)\/?$/, build: buildActivityMeta },
    { re: /^\/events\/([^/]+)\/?$/, build: buildEventMeta },
    { re: /^\/gallery\/([^/]+)\/?$/, build: buildGalleryMeta },
    { re: /^\/matches\/([^/]+)\/?$/, build: buildMatchMeta },
    { re: /^\/players\/([^/]+)\/?$/, build: buildPlayerMeta },
    { re: /^\/competitions\/([^/]+)\/?$/, build: buildCompetitionMeta },
  ];

  for (const entry of table) {
    const m = pathname.match(entry.re);
    if (m) return { slug: decodeURIComponent(m[1]), build: entry.build };
  }
  return null;
}

/* =========================================================
   SUPABASE REST HELPERS
   ========================================================= */

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${path}`);
  return res.json();
}

async function getCoverImage(postType, postId) {
  if (!postId) return null;
  const rows = await sb(
    `post_media?select=media_library(url)&post_type=eq.${postType}&post_id=eq.${postId}&order=display_order.asc&limit=1`,
  );
  return rows?.[0]?.media_library?.url || null;
}

function excerptFrom(body, len = 160) {
  if (!body) return "";
  const plain = String(body).replace(/<[^>]+>/g, "");
  return plain.length > len ? plain.slice(0, len) + "…" : plain;
}

/* =========================================================
   PER-ROUTE META BUILDERS
   ========================================================= */

async function buildNewsMeta(slug) {
  const rows = await sb(
    `news_posts?select=id,title,body&slug=eq.${slug}&limit=1`,
  );
  const post = rows?.[0];
  if (!post) return null;

  const image = await getCoverImage("news", post.id);

  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: excerptFrom(post.body),
    image,
  };
}

async function buildMatchReportMeta(slug) {
  const rows = await sb(
    `match_report_posts?select=id,title,body&slug=eq.${slug}&limit=1`,
  );
  const post = rows?.[0];
  if (!post) return null;

  const image = await getCoverImage("match_report", post.id);

  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: excerptFrom(post.body),
    image,
  };
}

async function buildActivityMeta(slug) {
  const rows = await sb(
    `activity_posts?select=id,title,body&slug=eq.${slug}&limit=1`,
  );
  const post = rows?.[0];
  if (!post) return null;

  const image = await getCoverImage("activity", post.id);

  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: excerptFrom(post.body),
    image,
  };
}

async function buildEventMeta(slug) {
  const rows = await sb(
    `event_posts?select=id,title,body,location,event_date&slug=eq.${slug}&limit=1`,
  );
  const post = rows?.[0];
  if (!post) return null;

  const image = await getCoverImage("event", post.id);

  const descriptionParts = [];
  if (post.event_date) descriptionParts.push(post.event_date);
  if (post.location) descriptionParts.push(post.location);
  const prefix = descriptionParts.length
    ? `${descriptionParts.join(" · ")} — `
    : "";

  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: `${prefix}${excerptFrom(post.body, 140)}`,
    image,
  };
}

async function buildGalleryMeta(slug) {
  const rows = await sb(
    `media_library?select=url&slug=eq.${slug}&limit=1`,
  );
  const item = rows?.[0];
  if (!item) return null;

  return {
    title: `Photo Gallery | ${SITE_NAME}`,
    description: `See more photos from ${SITE_NAME} on our gallery page.`,
    image: item.url,
  };
}

async function buildMatchMeta(slug) {
  const rows = await sb(
    `matches?select=slug,match_date,status,our_score,opponent_score,is_home,opponent_team_id&slug=eq.${slug}&limit=1`,
  );
  const match = rows?.[0];
  if (!match) return null;

  let opponent = null;
  if (match.opponent_team_id) {
    const teams = await sb(
      `teams?select=name,logo_url&id=eq.${match.opponent_team_id}&limit=1`,
    );
    opponent = teams?.[0] || null;
  }

  const opponentName = opponent?.name || "TBD";
  const isHome = match.is_home !== false;
  const homeLabel = isHome ? SITE_NAME : opponentName;
  const awayLabel = isHome ? opponentName : SITE_NAME;

  const isCompleted = match.status === "completed";
  const scoreLine = isCompleted
    ? ` ${match.our_score ?? 0}-${match.opponent_score ?? 0} `
    : " vs ";

  return {
    title: `${homeLabel}${scoreLine}${awayLabel} | ${SITE_NAME}`,
    description: isCompleted
      ? `Full result from ${homeLabel} ${scoreLine.trim()} ${awayLabel}.`
      : `Upcoming fixture: ${homeLabel} vs ${awayLabel}${match.match_date ? ` on ${match.match_date}` : ""}.`,
    image: opponent?.logo_url || null,
  };
}

async function buildPlayerMeta(slug) {
  const rows = await sb(
    `players?select=full_name,position,jersey_number,photo_url&slug=eq.${slug}&limit=1`,
  );
  const player = rows?.[0];
  if (!player) return null;

  const detailParts = [];
  if (player.position) detailParts.push(player.position);
  if (player.jersey_number) detailParts.push(`#${player.jersey_number}`);

  return {
    title: `${player.full_name} | ${SITE_NAME}`,
    description: detailParts.length
      ? `${player.full_name} — ${detailParts.join(" · ")} for ${SITE_NAME}.`
      : `${player.full_name} — player profile for ${SITE_NAME}.`,
    image: player.photo_url,
  };
}

async function buildCompetitionMeta(slug) {
  const rows = await sb(
    `competitions?select=name,season&slug=eq.${slug}&limit=1`,
  );
  const comp = rows?.[0];
  if (!comp) return null;

  return {
    title: `${comp.name}${comp.season ? ` (${comp.season})` : ""} | ${SITE_NAME}`,
    description: `Standings, fixtures and results for ${comp.name} — ${SITE_NAME}.`,
    image: null,
  };
}

/* =========================================================
   HTML REWRITE
   ========================================================= */

function absoluteUrl(pageUrl, path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, pageUrl.origin).toString();
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function injectMeta(html, { title, description, image, pageUrl }) {
  const safeTitle = escapeAttr(title);
  const safeDescription = escapeAttr(description);
  const safeImage = escapeAttr(image);
  const safeUrl = escapeAttr(pageUrl);

  let out = html;

  out = out.replace(
    /<title>.*?<\/title>/i,
    `<title>${safeTitle}</title>`,
  );

  out = out.replace(
    /<meta name="description" content=".*?">/i,
    `<meta name="description" content="${safeDescription}">`,
  );

  out = out.replace(
    /<meta property="og:title" content=".*?">/i,
    `<meta property="og:title" content="${safeTitle}">`,
  );

  out = out.replace(
    /<meta property="og:description" content=".*?">/i,
    `<meta property="og:description" content="${safeDescription}">`,
  );

  out = out.replace(
    /<meta property="og:image" content=".*?">/i,
    `<meta property="og:image" content="${safeImage}">`,
  );

  // og:url isn't in the current index.html — add it right after og:type
  // so crawlers know the canonical URL for this specific page.
  out = out.replace(
    /<meta property="og:type" content=".*?">/i,
    (matchTag) => `${matchTag}\n  <meta property="og:url" content="${safeUrl}">`,
  );

  return out;
}