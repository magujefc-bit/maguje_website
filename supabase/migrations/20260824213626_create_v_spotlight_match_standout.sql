CREATE OR REPLACE VIEW public.v_spotlight_match_standout AS
WITH latest_match AS (
  SELECT id AS match_id
  FROM matches
  WHERE status = 'completed' AND is_internal = true
  ORDER BY match_date DESC, match_time DESC
  LIMIT 1
),
scores AS (
  SELECT s.*
  FROM v_player_match_scores s
  JOIN latest_match lm ON lm.match_id = s.match_id
),
ranked AS (
  SELECT *,
    RANK() OVER (ORDER BY weighted_score DESC) AS rnk,
    COUNT(*) OVER (PARTITION BY weighted_score) AS tie_group_size
  FROM scores
)
SELECT *, (rnk = 1 AND tie_group_size > 1) AS is_tied
FROM ranked
WHERE rnk = 1;
