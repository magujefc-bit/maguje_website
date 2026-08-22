import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { states } from "../components/states.js";
import { matchCard } from "../components/match-card.js";
import { lazyImage, observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";
import { toExternalMatch } from "./home.js";

injectStyle(
  "h2h-detail-view",
  `
  .h2h-detail-header { display: flex; align-items: center; gap: var(--sp-md); padding-block: var(--sp-lg); }
  .h2h-detail-crest { width: 64px; height: 64px; flex-shrink: 0; }
  .h2h-detail-title { font-size: var(--fs-2xl); }
  .h2h-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-sm); margin-bottom: var(--sp-lg); }
  .h2h-summary__item { background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); text-align: center; }
  .h2h-summary__value { font-family: var(--font-display); font-size: var(--fs-xl); color: var(--color-ridge-green); }
  .h2h-summary__label { font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.6); }
  .h2h-competitions { margin-bottom: var(--sp-lg); }
  .h2h-competitions__title { font-size: var(--fs-lg); margin-bottom: var(--sp-sm); }
  .h2h-competitions__table { width: 100%; border-collapse: collapse; background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); overflow: hidden; }
  .h2h-competitions__table th, .h2h-competitions__table td { padding: var(--sp-xs) var(--sp-sm); text-align: center; font-size: var(--fs-sm); border-bottom: 1px solid var(--color-line); }
  .h2h-competitions__table th:first-child, .h2h-competitions__table td:first-child { text-align: left; }
  .h2h-competitions__table thead th { font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.6); font-weight: 600; }
  .h2h-competitions__table tbody tr:last-child td { border-bottom: none; }
  .h2h-competitions__season { color: rgba(16,36,26,0.5); font-size: var(--fs-xs); }
  .h2h-matches { display: flex; flex-direction: column; gap: var(--sp-sm); padding-bottom: var(--sp-2xl); }
`,
);

export async function headToHeadDetailView(params) {
  const { teamId } = params;

  await viewContainer.render(`
    <div class="container">
      <div class="h2h-detail-header"><div class="skel skel-block" style="width:64px;height:64px;border-radius:50%;"></div><h1 class="h2h-detail-title">Loading…</h1></div>
      <div class="skel skel-block" style="height:200px;"></div>
    </div>`);

  const root = document.querySelector("#app");

  try {
    const { data: summary, error: sumErr } = await supabase
      .from("v_head_to_head")
      .select(
        "opponent_team_id, opponent_name, opponent_crest, played, wins, draws, losses, goals_for, goals_against",
      )
      .eq("opponent_team_id", teamId)
      .maybeSingle();
    if (sumErr) throw sumErr;

    if (!summary) {
      await viewContainer.render(
        `<div class="container section" style="text-align:center;"><h1 class="text-display-xl">No record found</h1><a href="/team/head-to-head" class="btn btn--primary" style="margin-top: var(--sp-md);">Back to Head to Head</a></div>`,
      );
      return { cleanup: null };
    }

    const { data: byCompetition, error: compErr } = await supabase
      .from("v_head_to_head_by_competition")
      .select(
        "competition_id, competition_name, competition_season, played, wins, draws, losses, goals_for, goals_against",
      )
      .eq("opponent_team_id", teamId)
      .order("competition_season", { ascending: false, nullsFirst: false });
    if (compErr) throw compErr;

    const { data: matches, error: mErr } = await supabase
      .from("matches")
      .select(
        "id, slug, match_date, our_score, opponent_score, opponent_team_id",
      )
      .eq("opponent_team_id", teamId)
      .eq("status", "completed")
      .eq("is_internal", false)
      .order("match_date", { ascending: false });

    if (mErr) throw mErr;
    const matchesWithOpp = await supabase.attachOpponents(matches || []);

    await viewContainer.render(`
      <div class="container">
        <div class="h2h-detail-header">
          <div class="h2h-detail-crest">${lazyImage({ src: summary.opponent_crest, alt: summary.opponent_name, aspect: "square" })}</div>
          <h1 class="h2h-detail-title">Maguje FC vs ${summary.opponent_name}</h1>
        </div>
        <div class="h2h-summary">
          <div class="h2h-summary__item"><div class="h2h-summary__value">${summary.wins}</div><div class="h2h-summary__label">Wins</div></div>
          <div class="h2h-summary__item"><div class="h2h-summary__value">${summary.draws}</div><div class="h2h-summary__label">Draws</div></div>
          <div class="h2h-summary__item"><div class="h2h-summary__value">${summary.losses}</div><div class="h2h-summary__label">Losses</div></div>
        </div>
        <p class="text-body-sm" style="margin-bottom: var(--sp-md); color: rgba(16,36,26,0.6);">${summary.goals_for} goals for, ${summary.goals_against} goals against across ${summary.played} matches.</p>
        <div class="h2h-competitions" data-slot="competitions">
          <h2 class="h2h-competitions__title">By Competition</h2>
          ${
            byCompetition && byCompetition.length
              ? `<table class="h2h-competitions__table">
                  <thead><tr><th>Competition</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th></tr></thead>
                  <tbody>
                    ${byCompetition
                      .map(
                        (c) => `<tr>
                          <td>${c.competition_name || "—"}${c.competition_season ? ` <span class="h2h-competitions__season">${c.competition_season}</span>` : ""}</td>
                          <td>${c.played}</td>
                          <td>${c.wins}</td>
                          <td>${c.draws}</td>
                          <td>${c.losses}</td>
                          <td>${c.goals_for}</td>
                          <td>${c.goals_against}</td>
                        </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>`
              : states.empty({ message: "No competition breakdown available." })
          }
        </div>
        <div class="h2h-matches" data-slot="matches">
          ${matchesWithOpp.length ? matchesWithOpp.map((m) => matchCard(toExternalMatch({ ...m, status: "completed" }))).join("") : states.empty({ message: "No match history available." })}
        </div>
      </div>`);
    observeLazyImages(root);
    return { cleanup: null };
  } catch (err) {
    console.error("[head-to-head-detail] load failed:", err);
    viewContainer.renderError("Could not load this head-to-head record.", () =>
      headToHeadDetailView(params),
    );
    return { cleanup: null };
  }
}