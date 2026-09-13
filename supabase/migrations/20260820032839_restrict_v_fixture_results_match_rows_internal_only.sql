CREATE OR REPLACE VIEW public.v_fixture_results_match_rows AS
SELECT
  m.id,
  m.slug,
  m.match_date,
  m.match_time,
  m.status,
  m.is_internal,
  m.competition_id,
  c.name AS competition_name,
  CASE WHEN m.is_home = true THEN 'Maguje FC' ELSE t.name END AS home_team_name,
  CASE WHEN m.is_home = true THEN '/assets/crest.svg' ELSE t.logo_url END AS home_team_logo,
  t.name AS opponent_name,
  t.logo_url AS opponent_logo_url,
  m.our_score,
  m.opponent_score,
  m.is_home,
  CASE WHEN m.is_home = true THEN t.name ELSE 'Maguje FC' END AS away_team_name,
  CASE WHEN m.is_home = true THEN t.logo_url ELSE '/assets/crest.svg' END AS away_team_logo
FROM matches m
LEFT JOIN competitions c ON c.id = m.competition_id
LEFT JOIN teams t ON t.id = m.opponent_team_id
WHERE m.is_internal = true;
