CREATE OR REPLACE VIEW public.v_player_match_scores AS
WITH goals AS (
  SELECT match_id, scorer_id AS player_id, COUNT(*) AS goals
  FROM match_goals
  WHERE is_opponent_goal = false AND scorer_id IS NOT NULL
  GROUP BY match_id, scorer_id
),
assists AS (
  SELECT match_id, assist_id AS player_id, COUNT(*) AS assists
  FROM match_goals
  WHERE is_opponent_goal = false AND assist_id IS NOT NULL
  GROUP BY match_id, assist_id
),
combined AS (
  SELECT
    COALESCE(g.match_id, a.match_id) AS match_id,
    COALESCE(g.player_id, a.player_id) AS player_id,
    COALESCE(g.goals, 0) AS goals_in_match,
    COALESCE(a.assists, 0) AS assists_in_match
  FROM goals g
  FULL OUTER JOIN assists a
    ON g.match_id = a.match_id AND g.player_id = a.player_id
)
SELECT
  c.match_id,
  c.player_id,
  p.full_name AS player_name,
  p.photo_url,
  p.slug AS player_slug,
  m.competition_id,
  m.match_date,
  m.slug AS match_slug,
  t.name AS opponent_name,
  c.goals_in_match,
  c.assists_in_match,
  (c.goals_in_match * 2 + c.assists_in_match) AS weighted_score
FROM combined c
JOIN matches m ON m.id = c.match_id
JOIN players p ON p.id = c.player_id
LEFT JOIN teams t ON t.id = m.opponent_team_id
WHERE m.status = 'completed' AND m.is_internal = true;
