// Single shared Supabase client for the whole site (public + dashboard).
// The actual client is created once in /js/dashboard/supabase-client.js —
// a classic script that always loads before this ES module executes on
// every route (the dashboard's classic scripts are present in the SPA
// shell whether you're on a public page or in /maguje-dashboard).
// Re-exporting that same instance here (instead of calling createClient
// again) means a login anywhere in the app — public or dashboard —
// is the same session everywhere, with no separate client to sync.
export const supabase = window.supabaseClient;

// Helper: attach opponent team objects to match rows when the PostgREST FK
// relationship is unavailable. Accepts an array of match objects and returns
// a new array with `opponent` populated where possible.
export async function attachOpponents(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return matches;
  const ids = Array.from(
    new Set(matches.map((m) => m.opponent_team_id).filter(Boolean)),
  ).map(String);
  if (!ids.length) return matches.map((m) => ({ ...m, opponent: null }));
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, logo_url")
    .in("id", ids);
  if (error) throw error;
  const map = new Map((teams || []).map((t) => [String(t.id), t]));
  return matches.map((m) => ({
    ...m,
    opponent: map.get(String(m.opponent_team_id)) || null,
  }));
}

// Also expose as a method on the client for convenience in views
supabase.attachOpponents = attachOpponents;