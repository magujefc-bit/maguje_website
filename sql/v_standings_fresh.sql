-- Fresh standings view aggregated from per-team fixture rows
-- Produces: team_id, team_name, crest_url, competition_id,
-- played, won, drawn, lost, goals_for, goals_against, goal_difference, points, position
CREATE OR REPLACE VIEW public.v_standings_fresh AS
WITH base AS (
  SELECT
    team_id,
    team_name,
    crest_url,
    competition_id,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS played,
    SUM(CASE WHEN status = 'completed' AND COALESCE(goals_for,0) > COALESCE(goals_against,0) THEN 1 ELSE 0 END) AS won,
    SUM(CASE WHEN status = 'completed' AND COALESCE(goals_for,0) = COALESCE(goals_against,0) THEN 1 ELSE 0 END) AS drawn,
    SUM(CASE WHEN status = 'completed' AND COALESCE(goals_for,0) < COALESCE(goals_against,0) THEN 1 ELSE 0 END) AS lost,
    SUM(COALESCE(goals_for,0)) AS goals_for,
    SUM(COALESCE(goals_against,0)) AS goals_against,
    SUM(COALESCE(goals_for,0)) - SUM(COALESCE(goals_against,0)) AS goal_difference,
    SUM(
      CASE WHEN status = 'completed' THEN
        CASE WHEN COALESCE(goals_for,0) > COALESCE(goals_against,0) THEN 3
             WHEN COALESCE(goals_for,0) = COALESCE(goals_against,0) THEN 1
             ELSE 0 END
      ELSE 0 END
    ) AS points
  FROM v_fixture_results
  GROUP BY team_id, team_name, crest_url, competition_id
)
SELECT
  b.team_id,
  b.team_name,
  b.crest_url,
  b.competition_id,
  b.played,
  b.won,
  b.drawn,
  b.lost,
  b.goals_for,
  b.goals_against,
  b.goal_difference,
  b.points,
  dense_rank() OVER (
    PARTITION BY b.competition_id
    ORDER BY b.points DESC, b.goal_difference DESC, b.goals_for DESC, b.team_name ASC
  ) AS position
FROM base b;
