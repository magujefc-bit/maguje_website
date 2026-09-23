const SITE_NAME = "Maguje FC";
const SITE_URL = "https://magujefc.netlify.app";

const DEFAULT_LOGO =
  `${SITE_URL}/assets/maguje_logo.png`;

const DEFAULT_IMAGE =
  `${SITE_URL}/assets/og-default.jpg`;

/**
 * Convert a possibly relative URL into an absolute URL.
 */
export function absoluteSiteUrl(value) {
  if (!value) return null;

  try {
    return new URL(
      value,
      SITE_URL,
    ).toString();
  } catch {
    return null;
  }
}

/**
 * Remove empty / undefined values recursively.
 */
function clean(value) {
  if (Array.isArray(value)) {
    return value
      .map(clean)
      .filter(
        (item) =>
          item !== undefined &&
          item !== null,
      );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [
          key,
          clean(val),
        ])
        .filter(
          ([, val]) =>
            val !== undefined &&
            val !== null,
        ),
    );
  }

  return value;
}

/**
 * Base Maguje FC entity.
 */
export function magujeTeamSchema() {
  return {
    "@type": "SportsTeam",
    "@id": `${SITE_URL}/#team`,
    name: SITE_NAME,
    sport: "Football",
    url: SITE_URL,

    logo: {
      "@type": "ImageObject",
      url: DEFAULT_LOGO,
    },
  };
}

/**
 * Website schema.
 */
export function magujeWebsiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,

    description:
      "Official home of Maguje FC — fixtures, results, standings, news, players, competitions and club information.",

    publisher: {
      "@id": `${SITE_URL}/#team`,
    },
  };
}

/**
 * Basic page schema.
 */
export function webPageSchema({
  url = window.location.href,
  title = SITE_NAME,
  description = "",
} = {}) {
  const canonical =
    absoluteSiteUrl(url);

  return {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,

    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },

    about: {
      "@id": `${SITE_URL}/#team`,
    },
  };
}

/**
 * Article schema.
 */
export function articleSchema({
  url = window.location.href,
  title,
  description = "",
  image = DEFAULT_IMAGE,
  datePublished,
  dateModified,
  author,
} = {}) {
  const canonical =
    absoluteSiteUrl(url);

  const schema = {
    "@type": "Article",
    "@id": `${canonical}#article`,

    headline: title,

    description,

    image: [
      absoluteSiteUrl(
        image || DEFAULT_IMAGE,
      ),
    ],

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
    },

    publisher: {
      "@id": `${SITE_URL}/#team`,
    },
  };

  if (datePublished) {
    schema.datePublished =
      datePublished;
  }

  if (dateModified) {
    schema.dateModified =
      dateModified;
  }

  if (author) {
    schema.author = {
      "@type": "Person",
      name: author,
    };
  }

  return clean(schema);
}

/**
 * Player/person schema.
 */
export function playerSchema({
  url = window.location.href,
  name,
  image,
  position,
  jerseyNumber,
} = {}) {
  const canonical =
    absoluteSiteUrl(url);

  return clean({
    "@type": "Person",
    "@id": `${canonical}#person`,

    name,

    url: canonical,

    image: image
      ? [absoluteSiteUrl(image)]
      : undefined,

    jobTitle: position,

    memberOf: {
      "@id": `${SITE_URL}/#team`,
    },

    identifier:
      jerseyNumber !== undefined &&
      jerseyNumber !== null
        ? String(jerseyNumber)
        : undefined,
  });
}

/**
 * Football match schema.
 */
export function sportsEventSchema({
  url = window.location.href,
  name,
  startDate,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  image,
} = {}) {
  const canonical =
    absoluteSiteUrl(url);

  const schema = {
    "@type": "SportsEvent",
    "@id": `${canonical}#match`,

    name,

    url: canonical,

    sport: "Football",

    homeTeam: {
      "@type": "SportsTeam",
      name: homeTeam,
    },

    awayTeam: {
      "@type": "SportsTeam",
      name: awayTeam,
    },

    organizer: {
      "@id": `${SITE_URL}/#team`,
    },
  };

  if (startDate) {
    schema.startDate =
      startDate;
  }

  if (image) {
    schema.image = [
      absoluteSiteUrl(image),
    ];
  }

  if (
    homeScore !== undefined &&
    awayScore !== undefined
  ) {
    schema.homeTeam = {
      "@type": "SportsTeam",
      name: homeTeam,
      ...(homeScore !== null
        ? {
            score: homeScore,
          }
        : {}),
    };

    schema.awayTeam = {
      "@type": "SportsTeam",
      name: awayTeam,
      ...(awayScore !== null
        ? {
            score: awayScore,
          }
        : {}),
    };
  }

  if (status) {
    schema.eventStatus =
      status;
  }

  return clean(schema);
}

/**
 * Event schema for club events.
 */
export function eventSchema({
  url = window.location.href,
  name,
  description,
  startDate,
  endDate,
  location,
  image,
} = {}) {
  const canonical =
    absoluteSiteUrl(url);

  return clean({
    "@type": "Event",
    "@id": `${canonical}#event`,

    name,

    description,

    url: canonical,

    image: image
      ? [absoluteSiteUrl(image)]
      : undefined,

    startDate,
    endDate,

    location: location
      ? {
          "@type":
            "Place",
          name: location,
        }
      : undefined,

    organizer: {
      "@id": `${SITE_URL}/#team`,
    },
  });
}

/**
 * Competition schema.
 */
export function competitionSchema({
  url = window.location.href,
  name,
  season,
  description,
} = {}) {
  const canonical =
    absoluteSiteUrl(url);

  return clean({
    "@type": "SportsOrganization",
    "@id": `${canonical}#competition`,

    name,

    description,

    url: canonical,

    sport: "Football",

    memberOf: {
      "@id": `${SITE_URL}/#team`,
    },

    additionalProperty:
      season
        ? {
            "@type":
              "PropertyValue",
            name: "Season",
            value: season,
          }
        : undefined,
  });
}

/**
 * Build one complete JSON-LD graph.
 *
 * `entities` can contain any of the schemas generated above.
 */
export function buildJsonLdGraph({
  page = {},
  entities = [],
} = {}) {
  return clean({
    "@context": "https://schema.org",

    "@graph": [
      magujeTeamSchema(),
      magujeWebsiteSchema(),

      webPageSchema(page),

      ...entities,
    ],
  });
}

/**
 * Put JSON-LD into the current document.
 *
 * Existing Maguje JSON-LD is replaced instead of duplicated.
 */
export function injectJsonLd(data) {
  const existing =
    document.head.querySelector(
      'script[data-maguje-jsonld="true"]',
    );

  existing?.remove();

  if (!data) return;

  const script =
    document.createElement("script");

  script.type =
    "application/ld+json";

  script.dataset.magujeJsonld =
    "true";

  script.textContent =
    JSON.stringify(data);

  document.head.appendChild(
    script,
  );
}

/**
 * Convenience helper.
 */
export function setJsonLd({
  page = {},
  entities = [],
} = {}) {
  const graph =
    buildJsonLdGraph({
      page,
      entities,
    });

  injectJsonLd(graph);

  return graph;
}

