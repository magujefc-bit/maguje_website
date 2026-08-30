import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchHeader } from "../components/match-header.js";
import { matchTimeline } from "../components/match-timeline.js";
import { startingXIList, substituteList } from "../components/lineup.js";
import { shareBar, bindShareBar } from "../components/controls.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";
import { combineDateTime } from "./home.js";

injectStyle(
  "match-details-view",
  `
  .match-details-main { padding-block: var(--sp-lg); }
  .match-details-content { padding-top: var(--sp-md); display: flex; flex-direction: column; gap: var(--sp-lg); }
  .match-details-panel { }
  .match-details-panel__title { font-size: var(--fs-lg); margin-bottom: var(--sp-sm); }
  .match-details-sidebar { display: flex; flex-direction: column; gap: var(--sp-md); }
  .sidebar-card { background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); }
  .sidebar-card__title { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.5); margin-bottom: var(--sp-xs); }
  .match-details-scoreboard-wrap { margin-bottom: var(--sp-md); }
`,
);

export async function matchDetailsView(params) {
  const { slug } = params;
  await viewContainer.renderSkeleton(skeletons.matchDetails());
  const root = document.querySelector("#app");
  const channels = [];

  try {
    const { data: match, error } = await supabase
      .from("matches")
      .select(
        "id, slug, match_date, match_time, status, live_state, is_live, our_score, opponent_score, venue, opponent_team_id, competition:competitions(id, name)",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;

    if (!match) {
      await viewContainer.render(
        `<div class="container section" style="text-align:center;"><h1 class="text-display-xl">Match not found</h1><a href="/fixtures" class="btn btn--primary" style="margin-top: var(--sp-md);">View Fixtures</a></div>`,
      );
      return { cleanup: null };
    }

    const [attached] = await supabase.attachOpponents([match]);
    await renderMatch(root, attached || match, channels);

    return {
      cleanup: () => {
        channels.forEach((ch) => supabase.removeChannel(ch));
      },
    };
  } catch (err) {
    console.error("[match-details] load failed:", err);
    viewContainer.renderError("Could not load this match.", () =>
      matchDetailsView(params),
    );
    return { cleanup: null };
  }
}

async function renderMatch(root, match, channels) {
  const isLive =
    window.ScoreboardCore &&
    window.ScoreboardCore.isLivePhase(match.live_state);

  await viewContainer.render(`
    <div class="container match-details-main">
      <div data-slot="header"></div>
      <div class="layout-split match-details-content">
        <div>
          <div class="match-details-panel">
            <h2 class="match-details-panel__title">Match Events</h2>
            <div data-slot="events-panel"></div>
          </div>
          <div class="match-details-panel" style="margin-top: var(--sp-lg);">
            <h2 class="match-details-panel__title">Lineups</h2>
            <div data-slot="lineups-panel"></div>
          </div>
        </div>
        <div class="match-details-sidebar" data-slot="sidebar"></div>
      </div>
    </div>`);

  const headerSlot = root.querySelector('[data-slot="header"]');

  if (isLive) {
    const scoreboard = document.createElement("fab-scoreboard");
    // Explicitly inject the SAME client instance this page already
    // uses, instead of letting the component fall back to whatever
    // window.supabaseClient happens to be (which, on the public
    // site, is actually a separate dashboard client instance —
    // that mismatch was the root cause of updates needing a refresh).
    scoreboard.supabaseClient = supabase;
    scoreboard.setAttribute("match-id", match.id);
    const wrap = document.createElement("div");
    wrap.className = "match-details-scoreboard-wrap";
    wrap.appendChild(scoreboard);
    headerSlot.appendChild(wrap);
  } else {
    headerSlot.innerHTML = matchHeader({
      status: match.is_live ? "live" : match.status,
      kickoffAt: combineDateTime(match.match_date, match.match_time),
      venue: match.venue,
      homeScore: match.our_score,
      awayScore: match.opponent_score,
      competition: match.competition,
      homeTeam: { name: "Maguje FC", crestUrl: "/assets/crest.svg" },
      awayTeam: {
        name: match.opponent?.name || "TBD",
        crestUrl: match.opponent?.logo_url,
      },
    });
    observeLazyImages(headerSlot);
  }

  const eventsSlot = root.querySelector('[data-slot="events-panel"]');
  const lineupsSlot = root.querySelector('[data-slot="lineups-panel"]');

  async function loadAndRenderDetails() {
    const [goalsRes, cardsRes, subsRes, lineupsRes] = await Promise.all([
      supabase
        .from("match_goals")
        .select(
          "minute, is_opponent_goal, scorer:players!match_goals_scorer_id_fkey(full_name), assist:players!match_goals_assist_id_fkey(full_name)",
        )
        .eq("match_id", match.id),
      supabase
        .from("match_cards")
        .select("minute, card_type, player:players(full_name)")
        .eq("match_id", match.id),
      supabase
        .from("match_substitutions")
        .select(
          "minute, player_in:players!match_substitutions_player_in_id_fkey(full_name), player_out:players!match_substitutions_player_out_id_fkey(full_name)",
        )
        .eq("match_id", match.id),
      supabase
        .from("match_lineups")
        .select(
          "is_starter, position_played, player:players(full_name, jersey_number)",
        )
        .eq("match_id", match.id),
    ]);

    const events = buildTimeline(
      goalsRes.data || [],
      cardsRes.data || [],
      subsRes.data || [],
    );
    const lineups = lineupsRes.data || [];

    eventsSlot.innerHTML = events.length
      ? matchTimeline(events)
      : states.empty({ message: "No match events yet." });

    if (!lineups.length) {
      lineupsSlot.innerHTML = states.empty({
        message: "Lineup not yet announced.",
      });
    } else {
      const starting = lineups
        .filter((l) => l.is_starter)
        .map((l) => ({
          number: l.player.jersey_number ?? "–",
          name: l.player.full_name,
          position: l.position_played,
        }));
      const subs = lineups
        .filter((l) => !l.is_starter)
        .map((l) => ({
          number: l.player.jersey_number ?? "–",
          name: l.player.full_name,
          position: l.position_played,
        }));
      lineupsSlot.innerHTML = startingXIList(starting) + substituteList(subs);
    }
  }

  await loadAndRenderDetails();

  // Match Events and Lineups now stay live too — any goal, card,
  // substitution, or lineup change re-fetches and re-renders both
  // panels immediately, no refresh needed.
  const detailsChannel = supabase
    .channel(`match-details-${match.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "match_goals", filter: `match_id=eq.${match.id}` }, loadAndRenderDetails)
    .on("postgres_changes", { event: "*", schema: "public", table: "match_cards", filter: `match_id=eq.${match.id}` }, loadAndRenderDetails)
    .on("postgres_changes", { event: "*", schema: "public", table: "match_substitutions", filter: `match_id=eq.${match.id}` }, loadAndRenderDetails)
    .on("postgres_changes", { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${match.id}` }, loadAndRenderDetails)
    .subscribe();

  channels.push(detailsChannel);

  const shareUrl = window.location.origin + "/matches/" + match.slug;
  const shareTitle = `Maguje FC vs ${match.opponent?.name || "TBD"}`;

  root.querySelector('[data-slot="sidebar"]').innerHTML = `
        <div class="sidebar-card"><div class="sidebar-card__title">Venue</div><p class="text-body-sm">${match.venue || "Not specified"}</p></div>
        <div class="sidebar-card" style="margin-top: var(--sp-sm);"><div class="sidebar-card__title">Head to Head</div><p class="text-body-sm">Explore Maguje FC's records against opponents.</p><a href="/results/head-to-head" class="btn btn--secondary" style="margin-top: var(--sp-xs); display:inline-block;">View head-to-head →</a></div>
        <div class="sidebar-card" style="margin-top: var(--sp-sm);"><div class="sidebar-card__title">Share</div>${shareBar(shareUrl, shareTitle)}</div>
      `;

  bindShareBar(root.querySelector('[data-slot="sidebar"]'));
}

function buildTimeline(goals, cards, subs) {
  const events = [
    ...goals
      .filter((g) => !g.is_opponent_goal)
      .map((g) => ({
        type: "goal",
        minute: g.minute ?? 0,
        player: g.scorer?.full_name || "Maguje FC",
        assistBy: g.assist?.full_name,
      })),
    ...cards.map((c) => ({
      type: "card",
      minute: c.minute ?? 0,
      player: c.player?.full_name,
      cardType: c.card_type,
    })),
    ...subs.map((s) => ({
      type: "substitution",
      minute: s.minute ?? 0,
      player: s.player_in?.full_name,
      playerOut: s.player_out?.full_name,
    })),
  ];
  return events.sort((a, b) => a.minute - b.minute);
}