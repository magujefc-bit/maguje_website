import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { lazyImage, observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";

injectStyle(
  "player-profile-view",
  `
  /* =========================================================
     PLAYER PROFILE
     ========================================================= */

  .player-profile {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: var(--sp-md);
    align-items: start;
    padding-block: var(--sp-lg);
  }

  /* =========================================================
     PLAYER PHOTO
     ========================================================= */

  .player-profile__photo {
    width: 110px;
    aspect-ratio: 3 / 4;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-line);
  }

  .player-profile__photo img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center top;
  }

  /* =========================================================
     PLAYER DETAILS
     ========================================================= */

  .player-profile__info {
    min-width: 0;
  }

  .player-profile__header {
    margin: 0;
  }

  .player-profile__name {
    font-size: var(--fs-xl);
    line-height: 1.1;
    margin: 0 0 var(--sp-2xs);
    overflow-wrap: anywhere;
  }

  .player-profile__team {
    font-size: var(--fs-sm);
    font-weight: 600;
    line-height: 1.3;
    color: rgba(16, 36, 26, 0.65);
    margin-bottom: var(--sp-sm);
  }

  .player-profile__position {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    background: rgba(31, 107, 58, 0.1);
    color: var(--color-ridge-green);
    padding: var(--sp-3xs) var(--sp-xs);
    border-radius: var(--radius-sm);
    margin-right: var(--sp-xs);
  }

  .player-profile__number {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-trophy-gold);
  }

  /* =========================================================
     BIO
     Full width below photo + details
     ========================================================= */

  .player-profile__bio {
    grid-column: 1 / -1;
    width: 100%;
    margin: 0;
    padding-top: var(--sp-sm);
    font-size: var(--fs-md);
    line-height: var(--lh-normal);
    max-width: 75ch;
  }

  /* =========================================================
     STATS
     ========================================================= */

  .player-profile__stats {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
    margin-top: var(--sp-md);
  }

  .player-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-sm);
    width: 100%;
    margin: 0 0 var(--sp-lg);
  }

  .player-stat-card {
    min-width: 0;
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
    padding: var(--sp-md);
    text-align: center;
  }

  .player-stat-card__value {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    line-height: 1;
    color: var(--color-ridge-green);
    margin-bottom: var(--sp-xs);
  }

  .player-stat-card__label {
    font-size: var(--fs-xs);
    line-height: 1.3;
    text-transform: uppercase;
    color: rgba(16, 36, 26, 0.6);
  }

  /* =========================================================
     MATCH HISTORY
     ========================================================= */

  .player-profile__history {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
  }

  .player-history__title {
    font-size: var(--fs-lg);
    margin-bottom: var(--sp-sm);
  }

  .player-history-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-sm);
    width: 100%;
    padding: var(--sp-xs) 0;
    border-bottom: 1px solid var(--color-line);
    font-size: var(--fs-sm);
    text-decoration: none;
    color: inherit;
  }

  .player-history-row__opponent {
    font-weight: 600;
  }

  .player-history-row__date {
    color: rgba(16, 36, 26, 0.5);
    font-size: var(--fs-xs);
  }

  .player-history-row__contrib {
    flex-shrink: 0;
    font-family: var(--font-mono);
    color: var(--color-ridge-green);
    font-size: var(--fs-xs);
  }

  /* =========================================================
     TABLET
     ========================================================= */

  @media (min-width: 768px) {
    .player-profile {
      grid-template-columns: 180px minmax(0, 1fr);
      gap: var(--sp-xl);
    }

    .player-profile__photo {
      width: 180px;
    }

    .player-profile__name {
      font-size: var(--fs-2xl);
    }

    .player-profile__bio {
      padding-top: var(--sp-md);
    }

    .player-stat-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .player-stat-card {
      padding: var(--sp-lg);
    }
  }

  /* =========================================================
     DESKTOP
     ========================================================= */

  @media (min-width: 1200px) {
    .player-profile {
      grid-template-columns: 220px minmax(0, 1fr);
      gap: var(--sp-xl);
      max-width: 1100px;
      margin-inline: auto;
    }

    .player-profile__photo {
      width: 220px;
    }

    .player-profile__bio {
      padding-top: var(--sp-lg);
    }
  }

  /* =========================================================
     VERY SMALL PHONES
     ========================================================= */

  @media (max-width: 380px) {
    .player-profile {
      grid-template-columns: 90px minmax(0, 1fr);
      gap: var(--sp-sm);
    }

    .player-profile__photo {
      width: 90px;
    }

    .player-profile__name {
      font-size: var(--fs-lg);
    }

    .player-profile__team {
      font-size: var(--fs-xs);
    }

    .player-profile__position {
      font-size: 10px;
    }

    .player-profile__number {
      font-size: var(--fs-xs);
    }

    .player-stat-card {
      padding: var(--sp-sm);
    }

    .player-stat-card__value {
      font-size: var(--fs-lg);
    }
  }
`,
);

export async function playerProfileView(params) {
  const { slug } = params;

  await viewContainer.renderSkeleton(
    skeletons.playerProfile(),
  );

  const root = document.querySelector("#app");

  try {
    const { data: player, error } = await supabase
      .from("players")
      .select(
        "id, slug, team_name, full_name, position, jersey_number, photo_url, bio",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;

    if (!player) {
      await viewContainer.render(`
        <div
          class="container section"
          style="text-align:center;"
        >
          <h1 class="text-display-xl">
            Player not found
          </h1>

          <a
            href="/team"
            class="btn btn--primary"
            style="margin-top: var(--sp-md);"
          >
            Back to Team
          </a>
        </div>
      `);

      return { cleanup: null };
    }

    await renderProfile(root, player);

    return { cleanup: null };
  } catch (err) {
    console.error(
      "[player-profile] load failed:",
      err,
    );

    viewContainer.renderError(
      "Could not load this player.",
      () => playerProfileView(params),
    );

    return { cleanup: null };
  }
}

async function renderProfile(root, player) {
  await viewContainer.render(`
    <div class="container">

      <div class="player-profile">

        <!-- =================================================
             PHOTO
             ================================================= -->

        <div class="player-profile__photo">
          ${lazyImage({
            src: player.photo_url,
            alt: player.full_name,
            aspect: "portrait",
          })}
        </div>


        <!-- =================================================
             PLAYER DETAILS
             ================================================= -->

        <div class="player-profile__info">

          <div class="player-profile__header">

            <!-- Full Name -->
            <h1 class="player-profile__name">
              ${player.full_name}
            </h1>

            <!-- Team Name -->
            ${
              player.team_name
                ? `
                  <div class="player-profile__team">
                    ${player.team_name}
                  </div>
                `
                : ""
            }

            <!-- Position -->
            ${
              player.position
                ? `
                  <span class="player-profile__position">
                    ${player.position}
                  </span>
                `
                : ""
            }

            <!-- Jersey Number -->
            <span class="player-profile__number">
              #${player.jersey_number ?? "–"}
            </span>

          </div>

        </div>


        <!-- =================================================
             BIO
             This is below BOTH photo and player details.
             ================================================= -->

        ${
          player.bio
            ? `
              <p class="player-profile__bio">
                ${player.bio}
              </p>
            `
            : ""
        }


        <!-- =================================================
             STATS
             ================================================= -->

        <div
          class="player-profile__stats"
          data-slot="stats"
        >
          ${skeletons.standings(1)}
        </div>


        <!-- =================================================
             MATCH HISTORY
             ================================================= -->

        <div
          class="player-profile__history"
          data-slot="history"
        ></div>

      </div>

    </div>
  `);

  observeLazyImages(
    root.querySelector(".player-profile__photo"),
  );

  await loadStatsAndHistory(
    root,
    player.id,
  );
}

async function loadStatsAndHistory(
  root,
  playerId,
) {
  const statsSlot = root.querySelector(
    '[data-slot="stats"]',
  );

  const historySlot = root.querySelector(
    '[data-slot="history"]',
  );

  /* =========================================================
     CAREER STATS
     ========================================================= */

  try {
    const {
      data: stats,
      error: statsErr,
    } = await supabase
      .from("v_player_career_stats")
      .select(
        "appearances, goals, assists, yellow_cards",
      )
      .eq("player_id", playerId)
      .maybeSingle();

    if (statsErr) throw statsErr;

    statsSlot.innerHTML = statCards(
      stats || {
        appearances: 0,
        goals: 0,
        assists: 0,
        yellow_cards: 0,
      },
    );
  } catch (err) {
    console.error(
      "[player-profile] stats failed:",
      err,
    );

    statsSlot.innerHTML = states.error();

    states.bindRetry(
      statsSlot,
      () =>
        loadStatsAndHistory(
          root,
          playerId,
        ),
    );

    return;
  }

  /* =========================================================
     MATCH HISTORY
     ========================================================= */

  try {
    const {
      data: appearances,
      error: apErr,
    } = await supabase
      .from("v_player_appearances")
      .select(
        "goals, assists, match:matches(slug, match_date)",
      )
      .eq("player_id", playerId)
      .limit(10);

    if (apErr) throw apErr;

    if (!appearances?.length) {
      historySlot.innerHTML = `
        <h2 class="player-history__title">
          Match History
        </h2>

        ${states.empty({
          message:
            "No appearances recorded yet.",
        })}
      `;

      return;
    }

    /* =======================================================
       RESOLVE OPPONENT NAMES
       ======================================================= */

    const slugs = Array.from(
      new Set(
        appearances
          .map(
            (a) =>
              a.match?.slug,
          )
          .filter(Boolean),
      ),
    );

    let matchesMap = new Map();

    if (slugs.length) {
      const {
        data: matches,
      } = await supabase
        .from("matches")
        .select(
          "slug, match_date, opponent_team_id, our_score, opponent_score",
        )
        .in("slug", slugs);

      const resolved =
        await supabase.attachOpponents(
          matches || [],
        );

      matchesMap = new Map(
        (resolved || []).map(
          (m) => [m.slug, m],
        ),
      );
    }

    /* =======================================================
       ENRICH APPEARANCES
       ======================================================= */

    const enriched =
      appearances.map((a) => ({
        ...a,

        match: {
          ...(a.match || {}),
          ...(matchesMap.get(
            a.match?.slug,
          ) || {}),
        },
      }));

    /* =======================================================
       SORT NEWEST FIRST
       ======================================================= */

    const sorted = enriched
      .filter((a) => a.match)
      .sort(
        (a, b) =>
          new Date(
            b.match.match_date,
          ) -
          new Date(
            a.match.match_date,
          ),
      );

    historySlot.innerHTML = `
      <h2 class="player-history__title">
        Match History
      </h2>

      <div>
        ${sorted
          .map(historyRow)
          .join("")}
      </div>
    `;
  } catch (err) {
    console.error(
      "[player-profile] history failed:",
      err,
    );

    historySlot.innerHTML = `
      <h2 class="player-history__title">
        Match History
      </h2>

      ${states.error()}
    `;

    states.bindRetry(
      historySlot,
      () =>
        loadStatsAndHistory(
          root,
          playerId,
        ),
    );
  }
}

function statCards(stats) {
  const items = [
    {
      label: "Appearances",
      value:
        stats.appearances ?? 0,
    },
    {
      label: "Goals",
      value:
        stats.goals ?? 0,
    },
    {
      label: "Assists",
      value:
        stats.assists ?? 0,
    },
    {
      label: "Yellow Cards",
      value:
        stats.yellow_cards ?? 0,
    },
  ];

  return `
    <div class="player-stat-grid">

      ${items
        .map(
          (item) => `
            <div class="player-stat-card">

              <div
                class="player-stat-card__value"
              >
                ${item.value}
              </div>

              <div
                class="player-stat-card__label"
              >
                ${item.label}
              </div>

            </div>
          `,
        )
        .join("")}

    </div>
  `;
}

function historyRow(a) {
  const m = a.match;

  const contributions = [];

  if (a.goals) {
    contributions.push(
      `${a.goals}G`,
    );
  }

  if (a.assists) {
    contributions.push(
      `${a.assists}A`,
    );
  }

  return `
    <a
      href="/matches/${m.slug}"
      class="player-history-row"
    >

      <div>

        <div
          class="player-history-row__opponent"
        >
          vs ${m.opponent?.name || "TBD"}
        </div>

        <div
          class="player-history-row__date"
        >
          ${formatDate(
            m.match_date,
          )}
        </div>

      </div>

      <span
        class="player-history-row__contrib"
      >
        ${
          contributions.join(" ") ||
          "—"
        }
      </span>

    </a>
  `;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);

  if (isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleDateString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}