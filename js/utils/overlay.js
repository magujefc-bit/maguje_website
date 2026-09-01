// Shared helper for #27 (cover-image overlay gradients). overlay_templates
// stores a handful of preset CSS gradients; news_posts/match_report_posts/
// event_posts each carry a cover_overlay_id pointing at one. Rather than
// relying on PostgREST FK embedding (inconsistent across this project's
// tables), this does a small batch lookup and returns a plain id -> css
// gradient string Map, same defensive pattern used elsewhere in the app.
export async function fetchOverlayGradients(supabase, overlayIds) {
  const uniqueIds = [...new Set((overlayIds || []).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const { data, error } = await supabase
    .from('overlay_templates')
    .select('id, css_gradient')
    .in('id', uniqueIds);

  if (error) {
    console.error('[overlay] fetch failed:', error);
    return new Map();
  }

  return new Map((data || []).map((row) => [row.id, row.css_gradient]));
}
