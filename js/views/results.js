import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchCard } from "../components/match-card.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";
import {
  seasonCompetitionFilter,
  bindSeasonCompetitionFilter,
  mostRecentSeason,
} from "../components/season-competition-filter.js";

injectStyle(
  "results-view",
  `
  .results-header { padding-block: var(--sp-lg) var(--sp-sm); }
  .results-title { font-size: var(--fs-2xl); margin-bottom: var(--sp-sm); }
  .results-list { display: flex; flex-direction: column; gap: var(--sp-sm); padding-bottom: var(--sp-2xl); }
`,
);

const PAGE_SIZE = 15;

export async function resultsView() {
  let allResults = [];
  let competitions = [];
  let activeSeason = null;
  let activeCompetitionId = "all";
  let visibleCount = PAGE_SIZE;

  await viewContainer.render(`
    <div class="container">
      <div class="results-header"><h1 class="results-title">Results</h1><div data-slot="filter"></div></div>
      <div class="results-list" data-slot="list">${skeletons.matchList(6)}</div>
      <div data-slot="load-more"></div>
    </div>`);

  const root = document.querySelector("#app");
  await loadResults(root);
  return { cleanup: null };

  async function loadResults(root) {
    const listSlot = root.querySelector('[data-slot="list"]');
    const filterSlot = root.querySelector('[data-slot="filter"]');

    try {
      // Fetch the full competitions list independently of match data, so a
      // competition with zero results still shows up in the filter.
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
        .eq("status", "completed")
        .order("match_date", { ascending: false });
      if (error) throw error;

      allResults = (data || []).map((m) => ({
        ...m,
        status: "completed",
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

      if (competitions.length > 0) {
        activeSeason = mostRecentSeason(competitions);

        filterSlot.innerHTML = seasonCompetitionFilter(competitions, {
          activeSeason,
          activeCompetitionId,
        });

        bindSeasonCompetitionFilter(filterSlot, competitions, (season, competitionId) => {
          activeSeason = season;
          activeCompetitionId = competitionId;
          visibleCount = PAGE_SIZE;
          renderList(root);
        });
      }

      renderList(root);
    } catch (err) {
      console.error("[results] load failed:", err);
      listSlot.innerHTML = states.error();
      states.bindRetry(listSlot, () => loadResults(root));
    }
  }

  function matchesActiveFilter(m) {
    if (!activeSeason) return true;
    if (activeCompetitionId !== "all") return m.competition_id === activeCompetitionId;

    const comp = competitions.find((c) => c.id === m.competition_id);
    return comp ? comp.season === activeSeason : false;
  }

  function renderList(root) {
    const listSlot = root.querySelector('[data-slot="list"]');
    const loadMoreSlot = root.querySelector('[data-slot="load-more"]');
    const filtered = allResults.filter(matchesActiveFilter);

    if (!filtered.length) {
      listSlot.innerHTML = states.empty({
        message:
          activeCompetitionId === "all"
            ? "No results yet this season."
            : "No results in this competition yet.",
      });
      loadMoreSlot.innerHTML = "";
      return;
    }

    const visible = filtered.slice(0, visibleCount);
    listSlot.innerHTML = visible.map((m) => matchCard(m)).join("");
    observeLazyImages(listSlot);

    if (filtered.length > visibleCount) {
      loadMoreSlot.innerHTML = `<div class="flex justify-center" style="padding-block: var(--sp-md);"><button type="button" class="btn btn--secondary" data-load-more>Load more results</button></div>`;
      loadMoreSlot
        .querySelector("[data-load-more]")
        .addEventListener("click", () => {
          visibleCount += PAGE_SIZE;
          renderList(root);
        });
    } else {
      loadMoreSlot.innerHTML = "";
    }
  }
}

function combineDateTime(date, time) {
  if (!date) return null;
  return `${date}T${time || "00:00:00"}`;
}