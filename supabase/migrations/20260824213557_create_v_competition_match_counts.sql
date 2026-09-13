CREATE OR REPLACE VIEW public.v_competition_match_counts AS
SELECT competition_id, COUNT(*) AS completed_matches
FROM matches
WHERE status = 'completed' AND is_internal = true
GROUP BY competition_id;
