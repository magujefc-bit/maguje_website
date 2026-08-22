import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { matchHeader } from "../components/match-header.js";
import { matchTimeline } from "../components/match-timeline.js";
import { matchCard } from "../components/match-card.js";
import { liveIndicator } from "../components/controls.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";
import { combineDateTime, toExternalMatch } from "./home.js";

injectStyle(
  "live-match-view",
  `
  .live-badge-row { display: flex; align-items: center; gap: var(--sp-sm); padding-block: var(--sp-md) var(--sp-sm); }
  .live-badge-row__note { font-size: var(--fs-sm); color: rgba(16,36,26,0.5); }
  .live-timeline-flash { animation: live-flash 1.2s ease-out; }
  @keyframes live-flash { 0% { background: rgba(31,107,58,0.15); } 100% { background: transparent; } }
  @media (prefers-reduced-motion: reduce) { .live-timeline-flash { animation: none; } }
`,
);

export async function liveMatchView() {
  const channels = [];
  let liveEvents = [];

  await viewContainer.renderSkeleton(
    `<div class="container"><div class="live-badge-row"><div class="skel skel-line" style="width:80px; height:1.5em; margin-bottom:0;"></div></div>${skeletons.matchDetails()}</div>`,
  );
  const root = document.querySelector("#app");

  try {
    const { data: match, error } = await supabase
      .from("matches")
      .select(
        "id, slug, match_date, match_time, status, live_state, our_score, opponent_score, venue, opponent_team_id, competition:competitions(id, name)",
      )
      .eq("is_live", true)
      .maybeSingle();

    if (error) throw error;

    if (!match) {
      await renderNoLiveMatch(root);
      return { cleanup: () => teardown(channels) };
    }
    // Attach opponent to match if available
    const [attached] = await supabase.attachOpponents([match]);
    const matchWithOpp = attached || match;

    liveEvents = await fetchTimelineEvents(matchWithOpp.id);
    await renderLiveMatch(root, matchWithOpp, liveEvents);
    subscribeToUpdates(root, match, channels, (newEvent) => {
      liveEvents = [...liveEvents, newEvent].sort(
        (a, b) => a.minute - b.minute,
      );
      const slot = root.querySelector('[data-slot="timeline"]');
      if (slot) {
        slot.innerHTML = matchTimeline(liveEvents);
        slot.classList.add("live-timeline-flash");
        setTimeout(() => slot.classList.remove("live-timeline-flash"), 1200);
      }
    });

    return { cleanup: () => teardown(channels) };
  } catch (err) {
    console.error("[live-match] load failed:", err);
    viewContainer.renderError("Could not check for a live match.", () =>
      liveMatchView(),
    );
    return { cleanup: () => teardown(channels) };
  }
}

async function fetchTimelineEvents(matchId) {
  const [goalsRes, cardsRes, subsRes] = await Promise.all([
    supabase
      .from("match_goals")
      .select(
        "minute, is_opponent_goal, scorer:players!match_goals_scorer_id_fkey(full_name), assist:players!match_goals_assist_id_fkey(full_name)",
      )
      .eq("match_id", matchId),
    supabase
      .from("match_cards")
      .select("minute, card_type, player:players(full_name)")
      .eq("match_id", matchId),
    supabase
      .from("match_substitutions")
      .select(
        "minute, player_in:players!match_substitutions_player_in_id_fkey(full_name), player_out:players!match_substitutions_player_out_id_fkey(full_name)",
      )
      .eq("match_id", matchId),
  ]);
  const events = [
    ...(goalsRes.data || [])
      .filter((g) => !g.is_opponent_goal)
      .map((g) => ({
        type: "goal",
        minute: g.minute ?? 0,
        player: g.scorer?.full_name || "Maguje FC",
        assistBy: g.assist?.full_name,
      })),
    ...(cardsRes.data || []).map((c) => ({
      type: "card",
      minute: c.minute ?? 0,
      player: c.player?.full_name,
      cardType: c.card_type,
    })),
    ...(subsRes.data || []).map((s) => ({
      type: "substitution",
      minute: s.minute ?? 0,
      player: s.player_in?.full_name,
      playerOut: s.player_out?.full_name,
    })),
  ];
  return events.sort((a, b) => a.minute - b.minute);
}

async function renderNoLiveMatch(root) {
  let nextMatchHtml = states.empty({
    message: "No match is live right now.",
    hint: "Check back on match day.",
  });
  try {
    const { data } = await supabase
      .from("matches")
      .select("slug, match_date, match_time, opponent_team_id")
      .eq("status", "scheduled")
      .eq("is_internal", false)
      .order("match_date", { ascending: true })
      .limit(1);
    if (data?.length) {
      const [attached] = await supabase.attachOpponents(data);
      const next = attached || data[0];
      nextMatchHtml = `${states.empty({ message: "No match is live right now." })}<div style="margin-top: var(--sp-md);"><div class="home-match-pair__label">Next Match</div>${matchCard(toExternalMatch({ ...next, status: "scheduled" }))}</div>`;
    }
  } catch {
    /* falls back to plain empty state */
  }

  await viewContainer.render(
    `<div class="container"><h1 class="text-display-xl" style="margin-bottom: var(--sp-md);">Live Match</h1><div data-slot="empty">${nextMatchHtml}</div></div>`,
  );
  observeLazyImages(root.querySelector('[data-slot="empty"]'));
}

async function renderLiveMatch(root, match, events) {
  const headerData = {
    status: "live",
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
  };

  await viewContainer.render(`
    <div class="container">
      <div class="live-badge-row">${liveIndicator("Live")}<span class="live-badge-row__note">${(match.live_state || "").replace("_", " ") || "Updating automatically"}</span></div>
      <div data-slot="header">${matchHeader(headerData)}</div>
      <div style="padding-top: var(--sp-md);">
        <h2 class="text-display-lg" style="margin-bottom: var(--sp-sm);">Timeline</h2>
        <div data-slot="timeline">${events.length ? matchTimeline(events) : states.empty({ message: "No match events yet." })}</div>
      </div>
    </div>`);
  observeLazyImages(root.querySelector('[data-slot="header"]'));
}

function subscribeToUpdates(root, match, channels, onNewEvent) {
  const matchChannel = supabase
    .channel(`live-match-${match.id}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matches",
        filter: `id=eq.${match.id}`,
      },
      (payload) => {
        const headerSlot = root.querySelector('[data-slot="header"]');
        if (headerSlot) {
          headerSlot.innerHTML = matchHeader({
            status: payload.new.is_live ? "live" : payload.new.status,
            kickoffAt: combineDateTime(
              payload.new.match_date,
              payload.new.match_time,
            ),
            venue: payload.new.venue,
            homeScore: payload.new.our_score,
            awayScore: payload.new.opponent_score,
            homeTeam: { name: "Maguje FC", crestUrl: "/assets/crest.svg" },
            awayTeam: {
              name: match.opponent?.name || "TBD",
              crestUrl: match.opponent?.logo_url,
            },
          });
          observeLazyImages(headerSlot);
        }
        if (!payload.new.is_live) {
          const badgeRow = root.querySelector(".live-badge-row");
          if (badgeRow)
            badgeRow.innerHTML = `<span class="text-body-sm" style="color: var(--color-ridge-green); font-weight:600;">Full time — <a href="/matches/${match.slug}" style="text-decoration: underline;">view full match details →</a></span>`;
        }
      },
    )
    .subscribe();
  channels.push(matchChannel);

  const goalsChannel = supabase
    .channel(`live-goals-${match.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "match_goals",
        filter: `match_id=eq.${match.id}`,
      },
      async (payload) => {
        if (payload.new.is_opponent_goal) return;
        const player = await fetchPlayerName(payload.new.scorer_id);
        onNewEvent({ type: "goal", minute: payload.new.minute ?? 0, player });
      },
    )
    .subscribe();
  channels.push(goalsChannel);

  const cardsChannel = supabase
    .channel(`live-cards-${match.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "match_cards",
        filter: `match_id=eq.${match.id}`,
      },
      async (payload) => {
        const player = await fetchPlayerName(payload.new.player_id);
        onNewEvent({
          type: "card",
          minute: payload.new.minute ?? 0,
          player,
          cardType: payload.new.card_type,
        });
      },
    )
    .subscribe();
  channels.push(cardsChannel);

  const subsChannel = supabase
    .channel(`live-subs-${match.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "match_substitutions",
        filter: `match_id=eq.${match.id}`,
      },
      async (payload) => {
        const playerIn = await fetchPlayerName(payload.new.player_in_id);
        const playerOut = await fetchPlayerName(payload.new.player_out_id);
        onNewEvent({
          type: "substitution",
          minute: payload.new.minute ?? 0,
          player: playerIn,
          playerOut,
        });
      },
    )
    .subscribe();
  channels.push(subsChannel);
}

async function fetchPlayerName(playerId) {
  if (!playerId) return "";
  const { data } = await supabase
    .from("players")
    .select("full_name")
    .eq("id", playerId)
    .maybeSingle();
  return data?.full_name || "";
}

function teardown(channels) {
  channels.forEach((ch) => {
    try {
      supabase.removeChannel(ch);
    } catch (err) {
      console.error("[live-match] cleanup error:", err);
    }
  });
  channels.length = 0;
}
