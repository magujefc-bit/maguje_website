CREATE OR REPLACE VIEW public.v_standings AS
WITH resolved AS (
  SELECT
    fr.competition_id,
    CASE
      WHEN fr.team_key = 'own' THEN '00000000-0000-0000-0000-000000000000'::uuid
      ELSE fr.team_key::uuid
    END AS team_id,
    fr.goals_for,
    fr.goals_against,
    fr.status
  FROM v_fixture_results fr
  WHERE fr.team_key IS NOT NULL
),
completed AS (
  SELECT
    r.competition_id,
    r.team_id,
    r.goals_for,
    r.goals_against,
    r.status
  FROM resolved r
  WHERE r.status = 'completed' AND r.team_id IS NOT NULL
),
agg AS (
  SELECT
    c.competition_id,
    c.team_id,
    count(*) AS played,
    count(*) FILTER (WHERE c.goals_for > c.goals_against) AS won,
    count(*) FILTER (WHERE c.goals_for = c.goals_against) AS drawn,
    count(*) FILTER (WHERE c.goals_for < c.goals_against) AS lost,
    sum(c.goals_for) AS goals_for,
    sum(c.goals_against) AS goals_against,
    sum(c.goals_for) - sum(c.goals_against) AS goal_difference,
    count(*) FILTER (WHERE c.goals_for > c.goals_against) * 3
      + count(*) FILTER (WHERE c.goals_for = c.goals_against) AS points
  FROM completed c
  GROUP BY c.competition_id, c.team_id
)
SELECT
  a.competition_id,
  a.team_id,
  COALESCE(t.name, cp.name) AS team_name,
  COALESCE(t.logo_url, cp.crest_url) AS crest_url,
  a.played,
  a.won,
  a.drawn,
  a.lost,
  a.goals_for,
  a.goals_against,
  a.goal_difference,
  a.points,
  rank() OVER (PARTITION BY a.competition_id ORDER BY a.points DESC, a.goal_difference DESC, a.goals_for DESC) AS "position"
FROM agg a
LEFT JOIN teams t ON t.id = a.team_id
LEFT JOIN club_profile cp ON a.team_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY a.competition_id, (rank() OVER (PARTITION BY a.competition_id ORDER BY a.points DESC, a.goal_difference DESC, a.goals_for DESC));
