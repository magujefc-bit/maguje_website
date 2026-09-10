import { supabase } from "../../supabase-client.js";
import { combineDateTime, toExternalMatch } from "../../utils/format.js";

const MAX_FIXTURES = 4;
const EVENT_WINDOW_MS = 48 * 60 * 60 * 1000;

let MAGUJE_TEAM_ID = null;

export async function getMagujeTeamId() {
  if (MAGUJE_TEAM_ID) return MAGUJE_TEAM_ID;
  const { data } = await supabase.from("teams").select("id").ilike("name", "%maguje%").limit(1).maybeSingle();
  MAGUJE_TEAM_ID = data?.id || null;
  return MAGUJE_TEAM_ID;
}

export async function getPostId(table, slug) {
  const { data } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();
  return data?.id || null;
}

export async function fetchFirstMedia(postType, postId) {
  if (!postId) return null;
  const { data } = await supabase
    .from("post_media")
    .select("media:media_library(url)")
    .eq("post_type", postType)
    .eq("post_id", postId)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.media?.url || null;
}

export async function fetchAllMedia(postType, postId) {
  if (!postId) return [];
  const { data } = await supabase
    .from("post_media")
    .select("media:media_library(url)")
    .eq("post_type", postType)
    .eq("post_id", postId)
    .order("display_order", { ascending: true });
  return (data || []).map((row) => row.media?.url).filter(Boolean);
}

export async function fetchLatestGalleryImageUrl() {
  const { data } = await supabase
    .from("media_library")
    .select("url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.url || null;
}

// Batch-resolves competition_id → { id, name } the same way
// supabase.attachOpponents resolves opponent_team_id → team.
// Local to home-data.js since it's only used here right now.
async function attachCompetitions(matches) {
  if (!matches.length) return matches;
  const ids = Array.from(new Set(matches.map((m) => m.competition_id).filter(Boolean))).map(String);
  if (!ids.length) return matches.map((m) => ({ ...m, competition: null }));

  const { data: competitions, error } = await supabase.from("competitions").select("id, name").in("id", ids);
  if (error) throw error;

  const map = new Map((competitions || []).map((c) => [String(c.id), c]));
  return matches.map((m) => ({
    ...m,
    competition: map.get(String(m.competition_id)) || null,
  }));
}

/*
 * Live match + all matches scheduled today and tomorrow, still
 * showing status "scheduled"/"pending" ones even if their kickoff
 * time has already passed. is_internal must be TRUE for real
 * matches — confirmed against this club's actual data.
 * competition_id is resolved to { id, name } via attachCompetitions
 * above (matches table only stores the id, not the name), so
 * toExternalMatch() can pass it straight to matchCard().
 */
export async function fetchFixturesData() {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    const [
      { data: live, error: liveErr },
      { data: upcoming, error: upcomingErr },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(`id, slug, match_date, match_time, our_score, opponent_score, opponent_team_id, is_home, competition_id`)
        .eq("is_live", true)
        .eq("is_internal", true)
        .limit(1),
      supabase
        .from("matches")
        .select(`id, slug, match_date, match_time, our_score, opponent_score, opponent_team_id, is_home, status, venue, competition_id`)
        .eq("is_internal", true)
        .in("status", ["scheduled", "pending"])
        .gte("match_date", today)
        .lte("match_date", tomorrow)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true }),
    ]);

    if (liveErr || upcomingErr) throw (liveErr || upcomingErr);

    const allFetched = [...(live || []), ...(upcoming || [])];
    const uniqueFetched = Array.from(new Map(allFetched.map((m) => [m.id, m])).values());

    const withOpp = uniqueFetched.length ? await supabase.attachOpponents(uniqueFetched) : [];
    const withCompetition = await attachCompetitions(withOpp);
    const mapById = new Map(withCompetition.map((m) => [m.id, m]));

    const liveMatch = live?.length ? mapById.get(live[0].id) || live[0] : null;

    const upcomingMatches = (upcoming || [])
      .map((m) => mapById.get(m.id) || m)
      .sort((a, b) => getKickoffTime(a) - getKickoffTime(b));

    return { liveMatch, upcomingMatches };
  } catch (err) {
    console.error("[home-data] fixtures fetch failed:", err);
    return { liveMatch: null, upcomingMatches: [] };
  }
}

function getKickoffTime(match) {
  const value = combineDateTime(match?.match_date, match?.match_time);
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export async function fetchEventsData() {
  try {
    const { data, error } = await supabase
      .from("event_posts")
      .select("slug, title, location, event_date, event_time")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });

    if (error) throw error;
    if (!data?.length) return null;

    const now = Date.now();

    const upcoming = data
      .map((event) => {
        const startAt = combineDateTime(event.event_date, event.event_time);
        const time = startAt ? new Date(startAt).getTime() : NaN;
        return { ...event, startAt, time };
      })
      .filter((event) => !Number.isNaN(event.time) && event.time >= now)
      .sort((a, b) => a.time - b.time);

    const next = upcoming[0];
    if (!next) return null;

    const withinWindow = next.time - now <= EVENT_WINDOW_MS;
    return withinWindow ? next : null;
  } catch (err) {
    console.error("[home-data] events fetch failed:", err);
    return null;
  }
}

export async function fetchSpotlightData() {
  try {
    const [
      { data: matchStandout },
      { data: compStandout },
      { data: topScorers },
      { data: topAssists },
      { data: discipline },
    ] = await Promise.all([
      supabase.from("v_spotlight_match_standout").select("*").limit(1),
      supabase.from("v_spotlight_competition_standout").select("*").order("weighted_score", { ascending: false }).limit(1),
      supabase.from("v_spotlight_top_scorers").select("*").order("goals", { ascending: false }).limit(1),
      supabase.from("v_spotlight_top_assists").select("*").order("assists", { ascending: false }).limit(1),
      supabase.from("v_spotlight_discipline").select("*").limit(1),
    ]);

    const items = [];

    if (matchStandout?.[0] && !matchStandout[0].is_tied) {
      const s = matchStandout[0];
      items.push({
        label: "Match Standout",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals_in_match, s.assists_in_match),
        meta: s.opponent_name ? `vs ${s.opponent_name}` : "",
      });
    }
    if (compStandout?.[0] && !compStandout[0].is_tied) {
      const s = compStandout[0];
      items.push({
        label: "Competition Standout",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: statLineFromGoalsAssists(s.goals, s.assists),
      });
    }
    if (topScorers?.[0] && !topScorers[0].is_tied) {
      const s = topScorers[0];
      items.push({
        label: "Top Scorer",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.goals} goal${s.goals === 1 ? "" : "s"}`,
      });
    }
    if (topAssists?.[0] && !topAssists[0].is_tied) {
      const s = topAssists[0];
      items.push({
        label: "Top Assists",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.assists} assist${s.assists === 1 ? "" : "s"}`,
      });
    }
    if (discipline?.[0] && !discipline[0].is_tied) {
      const s = discipline[0];
      items.push({
        label: "Discipline",
        playerName: s.player_name, photoUrl: s.photo_url, playerSlug: s.player_slug,
        statLine: `${s.card_count} card${s.card_count === 1 ? "" : "s"} · ${s.appearances} apps`,
      });
    }

    return items;
  } catch (err) {
    console.error("[home-data] spotlight fetch failed:", err);
    return [];
  }
}

function statLineFromGoalsAssists(goals = 0, assists = 0) {
  const parts = [];
  if (goals) parts.push(`${goals} goal${goals === 1 ? "" : "s"}`);
  if (assists) parts.push(`${assists} assist${assists === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "Standout performance";
}