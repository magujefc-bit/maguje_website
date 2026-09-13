CREATE OR REPLACE VIEW public.v_spotlight_top_assists AS
WITH totals AS (
  SELECT player_id, player_name, photo_url, player_slug, competition_id,
         SUM(assists_in_match) AS assists
  FROM v_player_match_scores
  GROUP BY player_id, player_name, photo_url, player_slug, competition_id
  HAVING SUM(assists_in_match) > 0
),
ranked AS (
  SELECT *,
    RANK() OVER (PARTITION BY competition_id ORDER BY assists DESC) AS rnk,
    COUNT(*) OVER (PARTITION BY competition_id, assists) AS tie_group_size
  FROM totals
)
SELECT r.competition_id, r.player_id, r.player_name, r.photo_url, r.player_slug,
       r.assists, (r.rnk = 1 AND r.tie_group_size > 1) AS is_tied,
       mc.completed_matches
FROM ranked r
JOIN v_competition_match_counts mc ON mc.competition_id = r.competition_id
WHERE r.rnk = 1 AND mc.completed_matches > 3;
