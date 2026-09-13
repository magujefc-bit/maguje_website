CREATE OR REPLACE VIEW public.v_spotlight_discipline AS
WITH ranked AS (
  SELECT *,
    RANK() OVER (PARTITION BY competition_id ORDER BY card_count ASC, appearances DESC) AS rnk,
    COUNT(*) OVER (PARTITION BY competition_id, card_count, appearances) AS tie_group_size
  FROM v_player_discipline_stats
)
SELECT r.*, (r.rnk = 1 AND r.tie_group_size > 1) AS is_tied, mc.completed_matches
FROM ranked r
JOIN v_competition_match_counts mc ON mc.competition_id = r.competition_id
WHERE r.rnk = 1 AND mc.completed_matches > 3;
