// ============================================================
// SUPABASE CLIENT SETUP
// Fill in your real project values below before testing.
// Find these in: Supabase Dashboard -> Project Settings -> API
// ============================================================
const SUPABASE_URL = "https://pxtexddyvthgmietwhyc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dGV4ZGR5dnRoZ21pZXR3aHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjY3MzcsImV4cCI6MjEwMTI0MjczN30.zO-XzH622ihYWrHHQ8cijXzlxWtNWQzLI42gker_Eq8";

// IMPORTANT: named supabaseClient, NOT supabase — the CDN library itself
// already uses the global name `supabase` (window.supabase). Declaring our
// own variable with that same name causes "Identifier already declared".
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
