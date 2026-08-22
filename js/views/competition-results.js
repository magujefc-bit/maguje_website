import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchCard } from "../components/match-card.js";
import {
  fetchCompetition,
  competitionHeaderBlock,
  competitionSubNav,
  notFoundBlock,
} from "./competition-shared.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { toExternalMatch } from "./home.js";

export async function competitionResultsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.matchList(6));
  const root = document.querySelector("#app");

  try {
    const comp = await fetchCompetition(slug);
    if (!comp) {
      await viewContainer.render(
        notFoundBlock("/competitions", "Back to Competitions"),
      );
      return { cleanup: null };
    }

    const { data, error } = await supabase
      .from("matches")
      .select(
        "id, slug, match_date, our_score, opponent_score, opponent_team_id",
      )
      .eq("competition_id", comp.id)
      .eq("status", "completed")
      .eq("is_internal", false)
      .order("match_date", { ascending: false });
    if (error) throw error;
    const matchesWithOpp = await supabase.attachOpponents(data);

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, "results")}
        <div class="flex flex-col gap-sm" style="padding-bottom: var(--sp-2xl);" data-slot="list">${data.length ? matchesWithOpp.map((m) => matchCard(toExternalMatch({ ...m, status: "completed" }))).join("") : states.empty({ message: "No results yet in this competition." })}</div>
      </div>`);
    observeLazyImages(root);
  } catch (err) {
    console.error("[competition-results] load failed:", err);
    viewContainer.renderError("Could not load results.", () =>
      competitionResultsView(params),
    );
  }
  return { cleanup: null };
}
