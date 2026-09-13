CREATE OR REPLACE VIEW public.v_search_index AS
 SELECT 'news'::text AS type,
    news_posts.title,
    "left"(news_posts.body, 140) AS snippet,
    news_posts.slug,
    '/news/'::text || news_posts.slug AS path,
    news_posts.created_at AS sort_date,
    to_tsvector('english'::regconfig, (COALESCE(news_posts.title, ''::text) || ' '::text) || COALESCE(news_posts.body, ''::text)) AS search_vector
   FROM news_posts
UNION ALL
 SELECT 'event'::text AS type,
    event_posts.title,
    event_posts.location AS snippet,
    event_posts.slug,
    '/events/'::text || event_posts.slug AS path,
    COALESCE(event_posts.event_date::timestamp with time zone, event_posts.created_at) AS sort_date,
    to_tsvector('english'::regconfig, (COALESCE(event_posts.title, ''::text) || ' '::text) || COALESCE(event_posts.location, ''::text)) AS search_vector
   FROM event_posts
UNION ALL
 SELECT 'activity'::text AS type,
    activity_posts.title,
    "left"(activity_posts.body, 140) AS snippet,
    activity_posts.slug,
    '/community/'::text || activity_posts.slug AS path,
    activity_posts.created_at AS sort_date,
    to_tsvector('english'::regconfig, (COALESCE(activity_posts.title, ''::text) || ' '::text) || COALESCE(activity_posts.body, ''::text)) AS search_vector
   FROM activity_posts
UNION ALL
 SELECT 'player'::text AS type,
    players.full_name AS title,
    players."position" AS snippet,
    players.slug,
    '/players/'::text || players.slug AS path,
    NULL::timestamp with time zone AS sort_date,
    to_tsvector('english'::regconfig, (COALESCE(players.full_name, ''::text) || ' '::text) || COALESCE(players."position", ''::text)) AS search_vector
   FROM players
UNION ALL
 SELECT 'team'::text AS type,
    teams.name AS title,
    NULL::text AS snippet,
    teams.id::text AS slug,
    '/players'::text AS path,
    NULL::timestamp with time zone AS sort_date,
    to_tsvector('english'::regconfig, COALESCE(teams.name, ''::text)) AS search_vector
   FROM teams
UNION ALL
 SELECT 'competition'::text AS type,
    competitions.name AS title,
    competitions.season AS snippet,
    competitions.slug,
    '/competitions/'::text || competitions.slug AS path,
    NULL::timestamp with time zone AS sort_date,
    to_tsvector('english'::regconfig, (COALESCE(competitions.name, ''::text) || ' '::text) || COALESCE(competitions.season, ''::text)) AS search_vector
   FROM competitions
UNION ALL
 SELECT 'official'::text AS type,
    officials.full_name AS title,
    officials.official_role AS snippet,
    officials.id::text AS slug,
    '/officials'::text AS path,
    NULL::timestamp with time zone AS sort_date,
    to_tsvector('english'::regconfig, (COALESCE(officials.full_name, ''::text) || ' '::text) || COALESCE(officials.official_role, ''::text)) AS search_vector
   FROM officials;
