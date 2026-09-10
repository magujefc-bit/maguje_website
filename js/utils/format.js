/**
 * Shared display-formatting helpers.
 * Pure functions only — no Supabase calls, no DOM access.
 * Used across home/ sections and other views.
 */

/**
 * Strips HTML tags from a body string and truncates to `len` chars,
 * appending an ellipsis if truncated.
 */
export function excerptFrom(body, len = 140) {
  if (!body) return "";
  const plain = body.replace(/<[^>]+>/g, "");
  return plain.length > len ? plain.slice(0, len) + "…" : plain;
}

/**
 * Combines a date string and time string into a single ISO-ish
 * datetime string. Defaults to midnight if no time is given.
 */
export function combineDateTime(date, time) {
  if (!date) return null;
  return `${date}T${time || "00:00:00"}`;
}

/**
 * Transforms a raw `matches` row (with opponent already attached)
 * into the shape matchCard() expects: home/away resolved based on
 * is_home, with Maguje FC's own crest/name filled in on our side.
 */
export function toExternalMatch(row) {
  const isAway = row.is_home === false;
  return {
    slug: row.slug,
    status:
      row.status ||
      (row.live_state && row.live_state !== "not_started" && row.live_state !== "full_time"
        ? "live"
        : row.status),
    kickoffAt: combineDateTime(row.match_date, row.match_time),
    homeScore: isAway ? row.opponent_score : row.our_score,
    awayScore: isAway ? row.our_score : row.opponent_score,
    homeTeam: isAway
      ? { name: row.opponent?.name || "TBD", shortName: row.opponent?.name, crestUrl: row.opponent?.logo_url }
      : { name: "Maguje FC", shortName: "Maguje", crestUrl: "/assets/maguje-crest.png" },
    awayTeam: isAway
      ? { name: "Maguje FC", shortName: "Maguje", crestUrl: "/assets/maguje-crest.png" }
      : { name: row.opponent?.name || "TBD", shortName: row.opponent?.name, crestUrl: row.opponent?.logo_url },
  };
}

/**
 * Escapes a value for safe interpolation into HTML template strings.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

