const SITE_NAME = "Maguje FC";
const SITE_URL = "https://magujefc.netlify.app";
const DEFAULT_DESCRIPTION =
  "Official home of Maguje FC — fixtures, results, standings, news, players, competitions and club information.";
const DEFAULT_IMAGE = `${SITE_URL}/assets/og-default.jpg`;
const DEFAULT_LOGO = `${SITE_URL}/assets/maguje_logo.png`;

function upsertMeta(attribute, key, content) {
  if (!content) return;

  let el = document.head.querySelector(
    `meta[${attribute}="${CSS.escape(key)}"]`,
  );

  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }

  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);

  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }

  el.setAttribute("href", href);
}

function upsertJsonLd(data) {
  let script = document.head.querySelector(
    'script[data-maguje-seo="jsonld"]',
  );

  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.magujeSeo = "jsonld";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
}

function removeJsonLd() {
  document.head
    .querySelector('script[data-maguje-seo="jsonld"]')
    ?.remove();
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, length = 160) {
  const text = cleanText(value);

  if (text.length <= length) return text;

  return `${text.slice(0, length - 1).trim()}…`;
}

function routeInfo(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/") {
    return {
      title: "Maguje FC — Official Football Club",
      description: DEFAULT_DESCRIPTION,
      type: "website",
    };
  }

  if (path === "/news") {
    return {
      title: `News | ${SITE_NAME}`,
      description: `Latest news and updates from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/news/")) {
    return {
      title: `News | ${SITE_NAME}`,
      description: `Read the latest news from ${SITE_NAME}.`,
      type: "article",
    };
  }

  if (path === "/fixtures") {
    return {
      title: `Fixtures | ${SITE_NAME}`,
      description: `Upcoming fixtures for ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/results") {
    return {
      title: `Results | ${SITE_NAME}`,
      description: `Match results and recent performances from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/match-reports/")) {
    return {
      title: `Match Report | ${SITE_NAME}`,
      description: `Read match reports and match-day stories from ${SITE_NAME}.`,
      type: "article",
    };
  }

  if (path === "/match-reports") {
    return {
      title: `Match Reports | ${SITE_NAME}`,
      description: `Match reports from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/matches/")) {
    return {
      title: `Match | ${SITE_NAME}`,
      description: `Match information, result and details from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/players") {
    return {
      title: `Players | ${SITE_NAME}`,
      description: `Meet the players of ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/players/")) {
    return {
      title: `Player Profile | ${SITE_NAME}`,
      description: `Player profile from ${SITE_NAME}.`,
      type: "profile",
    };
  }

  if (path === "/competitions") {
    return {
      title: `Competitions | ${SITE_NAME}`,
      description: `Competitions involving ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/competitions/")) {
    return {
      title: `Competition | ${SITE_NAME}`,
      description: `Competition information, fixtures, results and standings for ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/standings") {
    return {
      title: `Standings | ${SITE_NAME}`,
      description: `Football standings involving ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/gallery") {
    return {
      title: `Gallery | ${SITE_NAME}`,
      description: `Photos and visual stories from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/gallery/")) {
    return {
      title: `Gallery | ${SITE_NAME}`,
      description: `Photos from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/events") {
    return {
      title: `Events | ${SITE_NAME}`,
      description: `Events and activities from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/events/")) {
    return {
      title: `Event | ${SITE_NAME}`,
      description: `Event information from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/officials") {
    return {
      title: `Club Officials | ${SITE_NAME}`,
      description: `Club officials and leadership at ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path.startsWith("/officials/")) {
    return {
      title: `Official | ${SITE_NAME}`,
      description: `Club official profile from ${SITE_NAME}.`,
      type: "profile",
    };
  }

  if (path === "/club-profile") {
    return {
      title: `Club Profile | ${SITE_NAME}`,
      description: `Learn about ${SITE_NAME}, the club and its identity.`,
      type: "website",
    };
  }

  if (path === "/club-profile/history") {
    return {
      title: `Club History | ${SITE_NAME}`,
      description: `The history of ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/club-profile/mission-vision") {
    return {
      title: `Mission & Vision | ${SITE_NAME}`,
      description: `${SITE_NAME} mission, vision and values.`,
      type: "website",
    };
  }

  if (path === "/club-records") {
    return {
      title: `Club Records | ${SITE_NAME}`,
      description: `Historical records and statistics from ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/club-records/honours") {
    return {
      title: `Club Honours | ${SITE_NAME}`,
      description: `Honours and achievements of ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/supporters") {
    return {
      title: `Supporters | ${SITE_NAME}`,
      description: `Support ${SITE_NAME} and follow the club.`,
      type: "website",
    };
  }

  if (path === "/contact") {
    return {
      title: `Contact | ${SITE_NAME}`,
      description: `Contact ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/privacy") {
    return {
      title: `Privacy Policy | ${SITE_NAME}`,
      description: `Privacy policy for ${SITE_NAME}.`,
      type: "website",
    };
  }

  if (path === "/terms") {
    return {
      title: `Terms | ${SITE_NAME}`,
      description: `Terms and conditions for ${SITE_NAME}.`,
      type: "website",
    };
  }

  return {
    title: `${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    type: "website",
  };
}

function buildFallbackJsonLd({ title, description, canonical, type, image }) {
  const base = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsTeam",
        "@id": `${SITE_URL}/#team`,
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
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        publisher: {
          "@id": `${SITE_URL}/#team`,
        },
      },
    ],
  };

  if (type === "article") {
    base["@graph"].push({
      "@type": "Article",
      "@id": `${canonical}#article`,
      headline: title.replace(` | ${SITE_NAME}`, ""),
      description,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
      },
      image: image || DEFAULT_IMAGE,
      publisher: {
        "@id": `${SITE_URL}/#team`,
      },
    });
  }

  return base;
}

export function setSEO({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = "website",
  url = window.location.href,
  jsonLd = null,
} = {}) {
  const finalTitle = title || SITE_NAME;
  const finalDescription = truncate(
    description || DEFAULT_DESCRIPTION,
  );
  const canonical = new URL(url, SITE_URL).toString();
  const finalImage = new URL(image || DEFAULT_IMAGE, SITE_URL).toString();

  document.title = finalTitle;

  upsertMeta("name", "description", finalDescription);
  upsertMeta("name", "robots", "index, follow");

  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", finalTitle);
  upsertMeta("property", "og:description", finalDescription);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", finalImage);
  upsertMeta("property", "og:image:alt", finalTitle);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", finalTitle);
  upsertMeta("name", "twitter:description", finalDescription);
  upsertMeta("name", "twitter:image", finalImage);

  upsertLink("canonical", canonical);

  if (jsonLd) {
    upsertJsonLd(jsonLd);
  } else {
    upsertJsonLd(
      buildFallbackJsonLd({
        title: finalTitle,
        description: finalDescription,
        canonical,
        type,
        image: finalImage,
      }),
    );
  }
}

export function setRouteSEO(pathname = window.location.pathname) {
  const info = routeInfo(pathname);

  // If the rendered view has a useful H1, use it to make the
  // browser-facing title more specific.
  const h1 = document.querySelector("#app h1");
  const visibleTitle = cleanText(h1?.textContent);

  let title = info.title;

  if (
    visibleTitle &&
    !visibleTitle.toLowerCase().includes(SITE_NAME.toLowerCase()) &&
    pathname !== "/"
  ) {
    title = `${visibleTitle} | ${SITE_NAME}`;
  }

  // Use the first meaningful paragraph as a fallback description.
  const paragraph = document.querySelector(
    "#app article p, #app .article-content p, #app p",
  );

  const visibleDescription = cleanText(paragraph?.textContent);

  const description =
    visibleDescription.length >= 40
      ? truncate(visibleDescription)
      : info.description;

  const image = document.querySelector("#app img")?.src || DEFAULT_IMAGE;

  setSEO({
    title,
    description,
    image,
    type: info.type,
    url: `${SITE_URL}${pathname}`,
  });
}

