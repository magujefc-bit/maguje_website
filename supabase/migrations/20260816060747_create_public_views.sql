CREATE OR REPLACE VIEW public.v_standings AS
WITH maguje AS (
  SELECT id FROM public.teams WHERE name ILIKE '%maguje%' LIMIT 1
),
normalized_matches AS (
  SELECT
    competition_id,
    team_a_id AS team_id,
    team_b_id AS opponent_id,
    team_a_score AS team_score,
    team_b_score AS opponent_score
  FROM public.matches
  WHERE status = 'completed' AND is_internal = true AND team_a_id IS NOT NULL

  UNION ALL

  SELECT
    competition_id,
    team_b_id AS team_id,
    team_a_id AS opponent_id,
    team_b_score AS team_score,
    team_a_score AS opponent_score
  FROM public.matches
  WHERE status = 'completed' AND is_internal = true AND team_b_id IS NOT NULL

  UNION ALL

  SELECT
    m.competition_id,
    (SELECT id FROM maguje) AS team_id,
    m.opponent_team_id AS opponent_id,
    m.our_score AS team_score,
    m.opponent_score AS opponent_score
  FROM public.matches m
  WHERE m.status = 'completed' AND m.is_internal = false AND m.opponent_team_id IS NOT NULL
),
aggregated AS (
  SELECT
    competition_id,
    team_id,
    count(*) AS played,
    count(*) FILTER (WHERE team_score > opponent_score) AS won,
    count(*) FILTER (WHERE team_score = opponent_score) AS drawn,
    count(*) FILTER (WHERE team_score < opponent_score) AS lost,
    sum(team_score) AS goals_for,
    sum(opponent_score) AS goals_against,
    (count(*) FILTER (WHERE team_score > opponent_score) * 3
      + count(*) FILTER (WHERE team_score = opponent_score)) AS points
  FROM normalized_matches
  WHERE team_id IS NOT NULL
  GROUP BY competition_id, team_id
)
SELECT
  a.competition_id,
  a.team_id,
  t.name AS team_name,
  t.logo_url AS crest_url,
  a.played, a.won, a.drawn, a.lost,
  a.goals_for, a.goals_against, (a.goals_for - a.goals_against) AS goal_difference,
  a.points,
  rank() OVER (PARTITION BY a.competition_id ORDER BY a.points DESC, (a.goals_for - a.goals_against) DESC) AS position
FROM aggregated a
JOIN public.teams t ON t.id = a.team_id;

GRANT SELECT ON public.v_standings TO anon;

CREATE OR REPLACE VIEW public.v_player_stats AS
SELECT
  p.id AS player_id,
  m.competition_id,
  count(DISTINCT ml.match_id) AS appearances,
  count(DISTINCT g.id) FILTER (WHERE g.scorer_id = p.id AND g.is_opponent_goal = false) AS goals,
  count(DISTINCT g2.id) FILTER (WHERE g2.assist_id = p.id) AS assists,
  count(DISTINCT c.id) FILTER (WHERE c.card_type = 'yellow') AS yellow_cards,
  count(DISTINCT c.id) FILTER (WHERE c.card_type = 'red') AS red_cards
FROM public.players p
LEFT JOIN public.match_lineups ml ON ml.player_id = p.id
LEFT JOIN public.matches m ON m.id = ml.match_id
LEFT JOIN public.match_goals g ON g.scorer_id = p.id AND g.match_id = ml.match_id
LEFT JOIN public.match_goals g2 ON g2.assist_id = p.id AND g2.match_id = ml.match_id
LEFT JOIN public.match_cards c ON c.player_id = p.id AND c.match_id = ml.match_id
GROUP BY p.id, m.competition_id;

GRANT SELECT ON public.v_player_stats TO anon;

CREATE OR REPLACE VIEW public.v_player_career_stats AS
SELECT
  player_id,
  sum(appearances) AS appearances,
  sum(goals) AS goals,
  sum(assists) AS assists,
  sum(yellow_cards) AS yellow_cards,
  sum(red_cards) AS red_cards
FROM public.v_player_stats
GROUP BY player_id;

GRANT SELECT ON public.v_player_career_stats TO anon;

CREATE OR REPLACE VIEW public.v_player_appearances AS
SELECT
  ml.player_id,
  ml.match_id,
  ml.is_starter,
  count(DISTINCT g.id) FILTER (WHERE g.scorer_id = ml.player_id AND g.is_opponent_goal = false) AS goals,
  count(DISTINCT g2.id) FILTER (WHERE g2.assist_id = ml.player_id) AS assists
FROM public.match_lineups ml
LEFT JOIN public.match_goals g ON g.scorer_id = ml.player_id AND g.match_id = ml.match_id
LEFT JOIN public.match_goals g2 ON g2.assist_id = ml.player_id AND g2.match_id = ml.match_id
GROUP BY ml.player_id, ml.match_id, ml.is_starter;

GRANT SELECT ON public.v_player_appearances TO anon;

CREATE OR REPLACE VIEW public.v_search_index AS
SELECT 'news' AS type, title, left(body, 140) AS snippet, slug, '/news/' || slug AS path,
  created_at AS sort_date,
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,'')) AS search_vector
FROM public.news_posts

UNION ALL
SELECT 'event', title, location, slug, '/events/' || slug,
  coalesce(event_date::timestamptz, created_at),
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(location,''))
FROM public.event_posts

UNION ALL
SELECT 'activity', title, left(body, 140), slug, '/community/' || slug,
  created_at,
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))
FROM public.activity_posts

UNION ALL
SELECT 'player', full_name, position, slug, '/team/players/' || slug,
  NULL::timestamptz,
  to_tsvector('english', coalesce(full_name,'') || ' ' || coalesce(position,''))
FROM public.players

UNION ALL
SELECT 'team', name, NULL, id::text, '/team',
  NULL::timestamptz,
  to_tsvector('english', coalesce(name,''))
FROM public.teams

UNION ALL
SELECT 'competition', name, season, id::text, '/competitions',
  NULL::timestamptz,
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(season,''))
FROM public.competitions

UNION ALL
SELECT 'official', full_name, official_role, id::text, '/about/officials',
  NULL::timestamptz,
  to_tsvector('english', coalesce(full_name,'') || ' ' || coalesce(official_role,''))
FROM public.officials;

GRANT SELECT ON public.v_search_index TO anon;
