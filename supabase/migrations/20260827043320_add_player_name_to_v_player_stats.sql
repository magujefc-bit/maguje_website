CREATE OR REPLACE VIEW public.v_player_stats AS
 SELECT p.id AS player_id,
    m.competition_id,
    count(DISTINCT ml.match_id) AS appearances,
    count(DISTINCT g.id) FILTER (WHERE g.scorer_id = p.id AND g.is_opponent_goal = false) AS goals,
    count(DISTINCT g2.id) FILTER (WHERE g2.assist_id = p.id) AS assists,
    count(DISTINCT c.id) FILTER (WHERE c.card_type = 'yellow'::text) AS yellow_cards,
    count(DISTINCT c.id) FILTER (WHERE c.card_type = 'red'::text) AS red_cards,
    p.full_name AS player_name,
    p.photo_url,
    p.slug AS player_slug,
    p.jersey_number
   FROM players p
     LEFT JOIN match_lineups ml ON ml.player_id = p.id
     LEFT JOIN matches m ON m.id = ml.match_id
     LEFT JOIN match_goals g ON g.scorer_id = p.id AND g.match_id = ml.match_id
     LEFT JOIN match_goals g2 ON g2.assist_id = p.id AND g2.match_id = ml.match_id
     LEFT JOIN match_cards c ON c.player_id = p.id AND c.match_id = ml.match_id
  GROUP BY p.id, m.competition_id;
