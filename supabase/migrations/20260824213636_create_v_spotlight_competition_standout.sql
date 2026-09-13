CREATE OR REPLACE VIEW public.v_spotlight_competition_standout AS
WITH totals AS (
  SELECT player_id, player_name, photo_url, player_slug, competition_id,
         SUM(goals_in_match) AS goals,
         SUM(assists_in_match) AS assists,
         SUM(weighted_score) AS weighted_score
  FROM v_player_match_scores
  GROUP BY player_id, player_name, photo_url, player_slug, competition_id
),
ranked AS (
  SELECT *,
    RANK() OVER (PARTITION BY competition_id ORDER BY weighted_score DESC) AS rnk,
    COUNT(*) OVER (PARTITION BY competition_id, weighted_score) AS tie_group_size
  FROM totals
)
SELECT r.*, (r.rnk = 1 AND r.tie_group_size > 1) AS is_tied, mc.completed_matches
FROM ranked r
JOIN v_competition_match_counts mc ON mc.competition_id = r.competition_id
WHERE r.rnk = 1 AND mc.completed_matches > 3;
