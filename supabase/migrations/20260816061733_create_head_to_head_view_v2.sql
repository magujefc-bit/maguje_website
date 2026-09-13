DROP VIEW IF EXISTS public.v_head_to_head CASCADE;

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
WHERE m.status = 'completed' AND m.is_internal = false AND m.opponent_team_id IS NOT NULL
GROUP BY m.opponent_team_id, t.name, t.logo_url;

GRANT SELECT ON public.v_head_to_head TO anon;
