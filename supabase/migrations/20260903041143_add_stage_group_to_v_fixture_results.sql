CREATE OR REPLACE VIEW public.v_fixture_results AS
 SELECT matches.competition_id,
    'own'::text AS team_key,
    matches.our_score AS goals_for,
    matches.opponent_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = true
UNION ALL
 SELECT matches.competition_id,
    matches.opponent_team_id::text AS team_key,
    matches.opponent_score AS goals_for,
    matches.our_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = true
UNION ALL
 SELECT matches.competition_id,
    matches.team_a_id::text AS team_key,
    matches.team_a_score AS goals_for,
    matches.team_b_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = false
UNION ALL
 SELECT matches.competition_id,
    matches.team_b_id::text AS team_key,
    matches.team_b_score AS goals_for,
    matches.team_a_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = false;
