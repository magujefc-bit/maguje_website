DROP VIEW IF EXISTS public.v_standings CASCADE;
DROP VIEW IF EXISTS public.v_head_to_head CASCADE;

-- v_standings now derives from the pre-existing, authoritative v_fixture_results,
-- which correctly encodes: is_internal = true -> our_score/opponent_score ("own" row),
-- is_internal = false -> team_a_score/team_b_score (two of our own squads).
CREATE VIEW public.v_standings AS
WITH resolved AS (
  SELECT
    fr.competition_id,
    CASE WHEN fr.team_key = 'own'
      THEN (SELECT id FROM public.teams WHERE name ILIKE '%maguje%' LIMIT 1)
      ELSE fr.team_key::uuid
    END AS team_id,
    fr.goals_for, fr.goals_against, fr.status
  FROM public.v_fixture_results fr
),
completed AS (
  SELECT * FROM resolved WHERE status = 'completed' AND team_id IS NOT NULL
),
agg AS (
  SELECT
    competition_id, team_id,
    count(*) AS played,
    count(*) FILTER (WHERE goals_for > goals_against) AS won,
    count(*) FILTER (WHERE goals_for = goals_against) AS drawn,
    count(*) FILTER (WHERE goals_for < goals_against) AS lost,
    sum(goals_for) AS goals_for,
    sum(goals_against) AS goals_against,
    (count(*) FILTER (WHERE goals_for > goals_against) * 3
      + count(*) FILTER (WHERE goals_for = goals_against)) AS points
  FROM completed
  GROUP BY competition_id, team_id
)
SELECT
  a.competition_id, a.team_id, t.name AS team_name, t.logo_url AS crest_url,
  a.played, a.won, a.drawn, a.lost, a.goals_for, a.goals_against,
  (a.goals_for - a.goals_against) AS goal_difference, a.points,
  rank() OVER (PARTITION BY a.competition_id ORDER BY a.points DESC, (a.goals_for - a.goals_against) DESC) AS position
FROM agg a
JOIN public.teams t ON t.id = a.team_id;

GRANT SELECT ON public.v_standings TO anon;

-- v_head_to_head needs opponent identity, which v_fixture_results doesn't carry
-- for external matches, so this stays sourced directly from matches -- just with
-- the is_internal filter corrected to TRUE (external-opponent matches).
CREATE VIEW public.v_head_to_head AS
SELECT
  m.opponent_team_id,
  t.name AS opponent_name,
  t.logo_url AS opponent_crest,
  count(*) AS played,
  count(*) FILTER (WHERE m.our_score > m.opponent_score) AS wins,
  count(*) FILTER (WHERE m.our_score = m.opponent_score) AS draws,
  count(*) FILTER (WHERE m.our_score < m.opponent_score) AS losses,
  sum(m.our_score) AS goals_for,
  sum(m.opponent_score) AS goals_against
FROM public.matches m
JOIN public.teams t ON t.id = m.opponent_team_id
WHERE m.status = 'completed' AND m.is_internal = true AND m.opponent_team_id IS NOT NULL
GROUP BY m.opponent_team_id, t.name, t.logo_url;

GRANT SELECT ON public.v_head_to_head TO anon;
