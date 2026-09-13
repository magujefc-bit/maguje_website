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
  CASE
    WHEN m.is_internal = true AND m.is_home = true THEN 'Maguje FC'
    WHEN m.is_internal = true AND m.is_home = false THEN t.name
    WHEN m.is_internal = false THEN ta.name
  END AS home_team_name,
  CASE
    WHEN m.is_internal = true AND m.is_home = true THEN '/assets/crest.svg'
    WHEN m.is_internal = true AND m.is_home = false THEN t.logo_url
    WHEN m.is_internal = false THEN ta.logo_url
  END AS home_team_logo,
  CASE WHEN m.is_internal = true THEN t.name ELSE tb.name END AS opponent_name,
  CASE WHEN m.is_internal = true THEN t.logo_url ELSE tb.logo_url END AS opponent_logo_url,
  CASE WHEN m.is_internal = true THEN m.our_score ELSE m.team_a_score END AS our_score,
  CASE WHEN m.is_internal = true THEN m.opponent_score ELSE m.team_b_score END AS opponent_score,
  m.is_home,
  CASE
    WHEN m.is_internal = true AND m.is_home = true THEN t.name
    WHEN m.is_internal = true AND m.is_home = false THEN 'Maguje FC'
    WHEN m.is_internal = false THEN tb.name
  END AS away_team_name,
  CASE
    WHEN m.is_internal = true AND m.is_home = true THEN t.logo_url
    WHEN m.is_internal = true AND m.is_home = false THEN '/assets/crest.svg'
    WHEN m.is_internal = false THEN tb.logo_url
  END AS away_team_logo
FROM matches m
LEFT JOIN competitions c ON c.id = m.competition_id
LEFT JOIN teams ta ON ta.id = m.team_a_id
LEFT JOIN teams tb ON tb.id = m.team_b_id
LEFT JOIN teams t ON t.id = m.opponent_team_id;

CREATE OR REPLACE VIEW public.v_fixture_results_public AS
SELECT
  m.id,
  m.slug,
  m.match_date,
  m.match_time,
  m.status,
  m.is_internal,
  m.competition_id,
  c.name AS competition_name,
  m.opponent_team_id,
  t.name AS opponent_name,
  t.logo_url AS opponent_logo_url,
  m.our_score,
  m.opponent_score,
  m.is_home
FROM matches m
LEFT JOIN competitions c ON c.id = m.competition_id
LEFT JOIN teams t ON t.id = m.opponent_team_id
WHERE m.is_internal = true
ORDER BY m.match_date DESC;
