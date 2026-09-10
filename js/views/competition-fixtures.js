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
import { injectStyle } from "../utils/inject-style.js";
import { toExternalMatch } from "./home.js";

injectStyle(
  "competition-fixtures-view",
  `
  .comp-fixtures-section { margin-bottom: var(--sp-lg); }
  .comp-fixtures-section:last-child { padding-bottom: var(--sp-2xl); }
  .comp-fixtures-section__title { font-size: var(--fs-lg); font-weight: 600; margin-bottom: var(--sp-sm); color: var(--color-ridge-green); }
  .comp-fixtures-list { display: flex; flex-direction: column; gap: var(--sp-sm); }
`,
);

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
      .select(
        "id, slug, match_date, match_time, status, our_score, opponent_score, opponent_team_id, is_home, is_live, live_state",
      )
      .eq("competition_id", comp.id)
      .eq("is_internal", true)
      .in("status", ["scheduled", "cancelled", "completed"])
      .order("match_date", { ascending: true });
    if (error) throw error;
    const matchesWithOpp = await supabase.attachOpponents(data);

    const withCompetition = matchesWithOpp.map((m) => ({
      ...toExternalMatch(m),
      competition: { id: comp.id, name: comp.name },
    }));

    const scheduled = withCompetition.filter((m) => m.status !== "cancelled" && m.status !== "completed");
    const cancelled = withCompetition.filter((m) => m.status === "cancelled");
    const played = withCompetition.filter((m) => m.status === "completed");

    const scheduledSection = `
      <div class="comp-fixtures-section">
        <h2 class="comp-fixtures-section__title">Scheduled</h2>
        <div class="comp-fixtures-list">${scheduled.length ? scheduled.map((m) => matchCard(m)).join("") : states.empty({ message: "No upcoming match in this competition." })}</div>
      </div>`;

    const cancelledSection = cancelled.length
      ? `
      <div class="comp-fixtures-section">
        <h2 class="comp-fixtures-section__title">Cancelled</h2>
        <div class="comp-fixtures-list">${cancelled.map((m) => matchCard(m)).join("")}</div>
      </div>`
      : "";

    const playedSection = `
      <div class="comp-fixtures-section">
        <h2 class="comp-fixtures-section__title">Played</h2>
        <div class="comp-fixtures-list">${played.length ? played.map((m) => matchCard(m)).join("") : states.empty({ message: "No matches played yet in this competition." })}</div>
      </div>`;

    await viewContainer.render(`
      <div class="container">
        ${competitionHeaderBlock(comp)}
        ${competitionSubNav(slug, "fixtures")}
        ${scheduledSection}
        ${cancelledSection}
        ${playedSection}
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