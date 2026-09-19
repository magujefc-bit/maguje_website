import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchCard } from "../components/match-card.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";
import { combineDateTime } from "./home.js";
import {
  seasonCompetitionFilter,
  bindSeasonCompetitionFilter,
  mostRecentSeason,
} from "../components/season-competition-filter.js";

injectStyle(
  "fixtures-view",
  `
  .fixtures-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .fixtures-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-sm); }
  .fixtures-section { margin-bottom: var(--sp-md); }
  .fixtures-section:last-child { padding-bottom: var(--sp-2xl); }
  .fixtures-section__title { font-size: var(--fs-lg); font-weight: 600; margin-bottom: var(--sp-sm); color: var(--color-ridge-green); }
  .fixtures-list { display: flex; flex-direction: column; gap: var(--sp-sm); }
`,
);

export async function fixturesView() {
  let allFixtures = [];
  let allResults = [];
  let competitions = [];
  let activeSeason = null;
  let activeCompetitionId = "all";

  await viewContainer.render(`
    <div class="container">
      <div class="fixtures-header"><h1 class="fixtures-title">Fixtures</h1><div data-slot="filter"></div></div>
      <div class="fixtures-section">
        <h2 class="fixtures-section__title">Upcoming Fixtures</h2>
        <div class="fixtures-list" data-slot="upcoming">${skeletons.matchList(6)}</div>
      </div>
      <div class="fixtures-section">
        <h2 class="fixtures-section__title">Past Results</h2>
        <div class="fixtures-list" data-slot="past">${skeletons.matchList(6)}</div>
      </div>
    </div>`);

  const root = document.querySelector("#app");
  await loadFixtures(root);
  return { cleanup: null };

  async function loadFixtures(root) {
    const filterSlot = root.querySelector('[data-slot="filter"]');

    try {
      // Fetch the full competitions list independently of match data, so a
      // competition with zero fixtures/results still shows up in the filter.
      const { data: competitionsData, error: compError } = await supabase
        .from("competitions")
        .select("id, name, season")
        .order("season", { ascending: false })
        .order("name", { ascending: true });
      if (compError) throw compError;
      competitions = competitionsData || [];

      const { data, error } = await supabase
        .from("v_fixture_results_match_rows")
        .select(
          "id, slug, match_date, match_time, status, competition_id, competition_name, home_team_name, home_team_logo, away_team_name, away_team_logo, is_home, our_score, opponent_score",
        )
        .in("status", ["scheduled", "completed"])
        .order("match_date", { ascending: true });
      if (error) throw error;

      const rows = (data || []).map((m) => ({
        ...m,
        competition: {
          id: m.competition_id,
          name: m.competition_name,
        },
        homeTeam: {
          name: m.home_team_name || "TBD",
          crestUrl: m.home_team_logo || "/assets/image-fallback.svg",
        },
        awayTeam: {
          name: m.away_team_name || "TBD",
          crestUrl: m.away_team_logo || "/assets/image-fallback.svg",
        },
        homeScore: m.is_home ? m.our_score : m.opponent_score,
        awayScore: m.is_home ? m.opponent_score : m.our_score,
        kickoffAt: combineDateTime(m.match_date, m.match_time),
      }));

      allFixtures = rows
        .filter((m) => m.status === "scheduled")
        .map((m) => ({ ...m, status: "scheduled" }));

      allResults = rows
        .filter((m) => m.status === "completed")
        .map((m) => ({ ...m, status: "completed" }));

      if (competitions.length > 0) {
        activeSeason = mostRecentSeason(competitions);

        filterSlot.innerHTML = seasonCompetitionFilter(competitions, {
          activeSeason,
          activeCompetitionId,
        });

        bindSeasonCompetitionFilter(filterSlot, competitions, (season, competitionId) => {
          activeSeason = season;
          activeCompetitionId = competitionId;
          renderLists(root);
        });
      }

      renderLists(root);
    } catch (err) {
      console.error("[fixtures] load failed:", err);
      root.querySelector('[data-slot="upcoming"]').innerHTML = states.error();
      states.bindRetry(root.querySelector('[data-slot="upcoming"]'), () =>
        loadFixtures(root),
      );
    }
  }

  function matchesActiveFilter(m) {
    if (!activeSeason) return true;
    if (activeCompetitionId !== "all") return m.competition_id === activeCompetitionId;

    const comp = competitions.find((c) => c.id === m.competition_id);
    return comp ? comp.season === activeSeason : false;
  }

  function renderLists(root) {
    const upcomingSlot = root.querySelector('[data-slot="upcoming"]');
    const pastSlot = root.querySelector('[data-slot="past"]');

    const filtered = allFixtures.filter(matchesActiveFilter);

    if (!filtered.length) {
      upcomingSlot.innerHTML = states.empty({
        message:
          activeCompetitionId === "all"
            ? "No upcoming fixtures scheduled."
            : "No fixtures in this competition.",
      });
    } else {
      upcomingSlot.innerHTML = filtered.map((m) => matchCard(m)).join("");
    }
    observeLazyImages(upcomingSlot);

    const pastFiltered = allResults.filter(matchesActiveFilter);

    if (!pastFiltered.length) {
      pastSlot.innerHTML = states.empty({
        message:
          activeCompetitionId === "all"
            ? "No past results."
            : "No results in this competition.",
      });
    } else {
      pastSlot.innerHTML = pastFiltered.map((m) => matchCard(m)).join("");
    }
    observeLazyImages(pastSlot);
  }
}