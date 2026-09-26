// ============================================================
// SUPABASE CLIENT SETUP
// SINGLE SHARED INSTANCE for the entire site — public pages AND
// the dashboard both use this one client. It lives here (a classic
// script) because this loads before any ES module on every route,
// so /js/supabase-client.js (public ESM side) just re-exports this
// same instance instead of creating a second one.
//
// persistSession + autoRefreshToken are ON so a logged-in session
// (admin or supporter) survives page reloads and following a link
// between the public site and the dashboard without re-authenticating.
// Find project values in: Supabase Dashboard -> Project Settings -> API
// ============================================================
const SUPABASE_URL = "https://pxtexddyvthgmietwhyc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dGV4ZGR5dnRoZ21pZXR3aHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjY3MzcsImV4cCI6MjEwMTI0MjczN30.zO-XzH622ihYWrHHQ8cijXzlxWtNWQzLI42gker_Eq8";

// IMPORTANT: named supabaseClient, NOT supabase — the CDN library itself
// already uses the global name `supabase` (window.supabase). Declaring our
// own variable with that same name causes "Identifier already declared".
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 5 } },
});

// Returns the logged-in user's admin record (id, email, role, is_active)
// or null if not logged in, not found in admins table, or deactivated.
async function getCurrentAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabaseClient
    .from("admins")
    .select("id, email, role, is_active")
    .eq("id", session.user.id)
    .single();

  if (error || !data || !data.is_active) return null;
  return data;
}

// Bridge for the new ES-module views/components (sidebar.js, views/*.js).
// This file itself stays a classic script on purpose — media-pipeline.js
// and fab-scoreboard.js are untouched legacy IIFEs that expect
// window.supabaseClient to exist as a plain global, exactly as before.
window.supabaseClient = supabaseClient;
window.getCurrentAdmin = getCurrentAdmin;