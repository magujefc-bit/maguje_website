// supabase-client.js (classic script, loaded before this) sets these on
// window. This module just re-exports those same instances for clean
// `import` syntax in view/component modules — no separate client, no
// logic duplicated.
export const supabaseClient = window.supabaseClient;
export const getCurrentAdmin = window.getCurrentAdmin;
