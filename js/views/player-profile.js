import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { lazyImage, observeLazyImages } from "../components/lazy-image.js";
import { shareBar, bindShareBar } from "../components/controls.js";
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

  .player-profile__official-name {
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

  .player-profile__role {
    display: inline-block;
    font-size: var(--fs-xs);
    color: rgba(16, 36, 26, 0.6);
    margin-left: var(--sp-xs);
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
     TABS
     ========================================================= */

  .player-profile__tabs {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
    margin-top: var(--sp-md);
  }

  .player-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-line);
    margin-bottom: var(--sp-md);
  }

  .player-tab {
    flex: 1;
    text-align: center;
    padding: var(--sp-sm);
    font-size: var(--fs-sm);
    font-weight: 600;
    color: rgba(16, 36, 26, 0.5);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
  }

  .player-tab--active {
    color: var(--color-ridge-green);
    border-bottom-color: var(--color-ridge-green);
  }

  .player-tab-panel[hidden] {
    display: none;
  }

  /* =========================================================
     STATS
     ========================================================= */

  .player-stat-grid {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    width: 100%;
  }

  .player-stat-row {
    display: grid;
    gap: var(--sp-sm);
    width: 100%;
  }

  .player-stat-row--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .player-stat-row--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
     GALLERY
     ========================================================= */

  .player-gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-sm);
  }

  .player-gallery-item {
    display: block;
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-line);
  }

  .player-gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* =========================================================
     MATCH HISTORY
     ========================================================= */

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

    .player-profile__official-name {
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
        "id, slug, team_name, full_name, position, player_role, jersey_number, photo_url, bio",
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
            href="/players"
            class="btn btn--primary"
            style="margin-top: var(--sp-md);"
          >
            Back to Players
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
  const displayName = player.team_name || player.full_name;

  await viewContainer.render(`
    <div class="container">

      <div class="player-profile">

        <!-- =================================================
             PHOTO
             ================================================= -->

        <div class="player-profile__photo">
          ${lazyImage({
            src: player.photo_url,
            alt: displayName,
            aspect: "portrait",
          })}
        </div>


        <!-- =================================================
             PLAYER DETAILS
             ================================================= -->

        <div class="player-profile__info">

          <div class="player-profile__header">

            <!-- Field Name (primary) -->
            <h1 class="player-profile__name">
              ${displayName}
            </h1>

            <!-- Official Name (secondary, only shown when a field name exists) -->
            ${
              player.team_name
                ? `
                  <div class="player-profile__official-name">
                    ${player.full_name}
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

            <!-- Role -->
            ${
              player.player_role
                ? `
                  <span class="player-profile__role">
                    ${player.player_role}
                  </span>
                `
                : ""
            }

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

        <div style="margin-top: var(--sp-sm);">
          ${shareBar(window.location.origin + "/players/" + player.slug, displayName)}
        </div>

        <!-- =================================================
             TABS: Stats / Gallery / Match History
             ================================================= -->

        <div class="player-profile__tabs">

          <div class="player-tabs">
            <button type="button" class="player-tab player-tab--active" data-tab="stats">Stats</button>
            <button type="button" class="player-tab" data-tab="gallery">Gallery</button>
            <button type="button" class="player-tab" data-tab="history">Match History</button>
          </div>

          <div class="player-tab-panel" data-panel="stats">
            <div data-slot="stats">${skeletons.standings(1)}</div>
          </div>

          <div class="player-tab-panel" data-panel="gallery" hidden>
            <div data-slot="gallery">${skeletons.standings(1)}</div>
          </div>

          <div class="player-tab-panel" data-panel="history" hidden>
            <div data-slot="history"></div>
          </div>

        </div>

      </div>

    </div>
  `);

  observeLazyImages(
    root.querySelector(".player-profile__photo"),
  );

  bindShareBar(root);

  bindTabs(root);

  await loadStatsAndHistory(root, player.id);
  await loadGallery(root, player.id, displayName);
}

function bindTabs(root) {
  const tabButtons = root.querySelectorAll(".player-tab");
  const panels = {
    stats: root.querySelector('[data-panel="stats"]'),
    gallery: root.querySelector('[data-panel="gallery"]'),
    history: root.querySelector('[data-panel="history"]'),
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("player-tab--active"));
      btn.classList.add("player-tab--active");
      const target = btn.dataset.tab;
      Object.entries(panels).forEach(([key, panel]) => {
        panel.hidden = key !== target;
      });
    });
  });
}

async function loadGallery(root, playerId, displayName) {
  const gallerySlot = root.querySelector('[data-slot="gallery"]');

  try {
    const { data, error } = await supabase
      .from("media_participants")
      .select("media:media_library(slug, url)")
      .eq("participant_type", "player")
      .eq("participant_id", playerId);

    if (error) throw error;

    const items = (data || [])
      .map((row) => row.media)
      .filter(Boolean);

    if (!items.length) {
      gallerySlot.innerHTML = states.empty({
        message: `No featured image for ${displayName} yet.`,
      });
      return;
    }

    gallerySlot.innerHTML = `
      <div class="player-gallery-grid">
        ${items
          .map(
            (m) => `
              <a href="/gallery/${m.slug}" class="player-gallery-item">
                ${lazyImage({ src: m.url, alt: "", aspect: "square" })}
              </a>
            `,
          )
          .join("")}
      </div>
    `;

    observeLazyImages(gallerySlot);
  } catch (err) {
    console.error("[player-profile] gallery failed:", err);
    gallerySlot.innerHTML = states.error();
    states.bindRetry(gallerySlot, () => loadGallery(root, playerId, displayName));
  }
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
        "appearances, goals, assists, yellow_cards, red_cards",
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
        red_cards: 0,
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
     Only matches where this player has a recorded goal,
     assist, or card — a plain appearance with none of those
     doesn't show up here.
     ========================================================= */

  try {
    const [{ data: appearances, error: apErr }, { data: cardRows, error: cardErr }] = await Promise.all([
      supabase
        .from("v_player_appearances")
        .select(
          "goals, assists, match:matches(slug, match_date)",
        )
        .eq("player_id", playerId)
        .limit(30),
      supabase
        .from("match_cards")
        .select("match_id, card_type")
        .eq("player_id", playerId),
    ]);

    if (apErr) throw apErr;
    if (cardErr) throw cardErr;

    const cardedMatchIds = [...new Set((cardRows || []).map((r) => r.match_id))];

    // Resolve carded match_ids to slugs, since v_player_appearances only
    // gives us slugs, not match_id — then build a slug -> card_types map
    // so historyRow() can show 🟨/🟥 alongside the goal/assist badge.
    let cardTypesBySlug = new Map();
    if (cardedMatchIds.length) {
      const { data: cardedMatches } = await supabase
        .from("matches")
        .select("id, slug")
        .in("id", cardedMatchIds);

      const slugById = new Map((cardedMatches || []).map((m) => [m.id, m.slug]));

      (cardRows || []).forEach((r) => {
        const slug = slugById.get(r.match_id);
        if (!slug) return;
        if (!cardTypesBySlug.has(slug)) cardTypesBySlug.set(slug, []);
        cardTypesBySlug.get(slug).push(r.card_type);
      });
    }

    const relevant = (appearances || []).filter(
      (a) => a.goals > 0 || a.assists > 0 || cardTypesBySlug.has(a.match?.slug),
    );

    if (!relevant.length) {
      historySlot.innerHTML = states.empty({
        message: "No goals, assists, or cards recorded yet.",
      });

      return;
    }

    /* =======================================================
       RESOLVE OPPONENT NAMES
       ======================================================= */

    const slugs = Array.from(
      new Set(
        relevant
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
      relevant.map((a) => ({
        ...a,

        match: {
          ...(a.match || {}),
          ...(matchesMap.get(
            a.match?.slug,
          ) || {}),
        },

        cardTypes: cardTypesBySlug.get(a.match?.slug) || [],
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

    historySlot.innerHTML = states.error();

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
  const row1 = [
    { label: "Appearances", value: stats.appearances ?? 0 },
    { label: "Goals", value: stats.goals ?? 0 },
    { label: "Assists", value: stats.assists ?? 0 },
  ];

  const row2 = [
    { label: "Yellow Cards", value: stats.yellow_cards ?? 0 },
    { label: "Red Cards", value: stats.red_cards ?? 0 },
  ];

  const card = (item) => `
    <div class="player-stat-card">
      <div class="player-stat-card__value">${item.value}</div>
      <div class="player-stat-card__label">${item.label}</div>
    </div>
  `;

  return `
    <div class="player-stat-grid">
      <div class="player-stat-row player-stat-row--three">
        ${row1.map(card).join("")}
      </div>
      <div class="player-stat-row player-stat-row--two">
        ${row2.map(card).join("")}
      </div>
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

  (a.cardTypes || []).forEach((cardType) => {
    contributions.push(cardType === "red" ? "🟥" : "🟨");
  });

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