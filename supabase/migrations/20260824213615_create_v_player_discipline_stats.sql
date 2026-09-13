CREATE OR REPLACE VIEW public.v_player_discipline_stats AS
WITH apps AS (
  SELECT m.competition_id, l.player_id, COUNT(*) AS appearances
  FROM match_lineups l
  JOIN matches m ON m.id = l.match_id
  WHERE m.status = 'completed' AND m.is_internal = true
  GROUP BY m.competition_id, l.player_id
),
cards AS (
  SELECT m.competition_id, c.player_id, COUNT(*) AS card_count
  FROM match_cards c
  JOIN matches m ON m.id = c.match_id
  WHERE m.status = 'completed' AND m.is_internal = true
  GROUP BY m.competition_id, c.player_id
)
SELECT
  a.competition_id, a.player_id,
  p.full_name AS player_name, p.photo_url, p.slug AS player_slug,
  a.appearances, COALESCE(c.card_count, 0) AS card_count
FROM apps a
JOIN players p ON p.id = a.player_id
LEFT JOIN cards c
  ON c.competition_id = a.competition_id AND c.player_id = a.player_id;
