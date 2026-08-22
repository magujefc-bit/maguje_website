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

export async function competitionFixturesView(params) {
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
      .select("id, slug, match_date, match_time, opponent_team_id")
      .eq("competition_id", comp.id)
      .eq("status", "scheduled")
      .eq("is_internal", false)
      .order("match_date", { ascending: true });
    if (error) throw error;
    const matchesWithOpp = await supabase.attachOpponents(data);

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, "fixtures")}
                <div class="flex flex-col gap-sm" style="padding-bottom: var(--sp-2xl);" data-slot="list">${data.length ? matchesWithOpp.map((m) => matchCard(toExternalMatch({ ...m, status: "scheduled" }))).join("") : states.empty({ message: "No fixtures in this competition." })}</div>
      </div>`);
    observeLazyImages(root);
  } catch (err) {
    console.error("[competition-fixtures] load failed:", err);
    viewContainer.renderError("Could not load fixtures.", () =>
      competitionFixturesView(params),
    );
  }
  return { cleanup: null };
}
