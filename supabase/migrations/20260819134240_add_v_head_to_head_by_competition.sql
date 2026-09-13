CREATE VIEW public.v_head_to_head_by_competition AS
SELECT
  m.opponent_team_id,
  t.name AS opponent_name,
  t.logo_url AS opponent_crest,
  m.competition_id,
  c.name AS competition_name,
  c.season AS competition_season,
  count(*) AS played,
  count(*) FILTER (WHERE m.our_score > m.opponent_score) AS wins,
  count(*) FILTER (WHERE m.our_score = m.opponent_score) AS draws,
  count(*) FILTER (WHERE m.our_score < m.opponent_score) AS losses,
  sum(m.our_score) AS goals_for,
  sum(m.opponent_score) AS goals_against
FROM matches m
JOIN teams t ON t.id = m.opponent_team_id
LEFT JOIN competitions c ON c.id = m.competition_id
WHERE m.status = 'completed'
  AND m.is_internal = true
  AND m.opponent_team_id IS NOT NULL
GROUP BY m.opponent_team_id, t.name, t.logo_url, m.competition_id, c.name, c.season
ORDER BY t.name, c.season DESC NULLS LAST;
