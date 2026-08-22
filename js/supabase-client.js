import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://pxtexddyvthgmietwhyc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dGV4ZGR5dnRoZ21pZXR3aHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjY3MzcsImV4cCI6MjEwMTI0MjczN30.zO-XzH622ihYWrHHQ8cijXzlxWtNWQzLI42gker_Eq8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

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
