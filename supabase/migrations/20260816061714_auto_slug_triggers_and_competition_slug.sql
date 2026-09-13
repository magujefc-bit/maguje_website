-- ===================================================================
-- Auto-generate slugs on INSERT so the admin dashboard doesn't need
-- any code changes to keep creating players/matches/competitions.
-- If the dashboard doesn't send a slug, one is generated automatically.
-- If it does send one (future-proofing), that value is respected.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.generate_player_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.full_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_player_slug ON public.players;
CREATE TRIGGER trg_generate_player_slug
  BEFORE INSERT ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.generate_player_slug();

CREATE OR REPLACE FUNCTION public.generate_match_slug()
RETURNS trigger AS $$
DECLARE
  opponent_name text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    SELECT name INTO opponent_name FROM public.teams
    WHERE id = COALESCE(NEW.opponent_team_id, NEW.team_b_id);

    NEW.slug := lower(regexp_replace(
      coalesce(NEW.match_date::text, 'match') || '-' || coalesce(opponent_name, 'match'),
      '[^a-zA-Z0-9]+', '-', 'g'
    )) || '-' || substring(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_match_slug ON public.matches;
CREATE TRIGGER trg_generate_match_slug
  BEFORE INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.generate_match_slug();

-- ===================================================================
-- Competitions also has no slug column — add it, same auto-gen pattern
-- ===================================================================

ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS slug text UNIQUE;

UPDATE public.competitions
SET slug = lower(regexp_replace(name || '-' || coalesce(season, ''), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE public.competitions ALTER COLUMN slug SET NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_competition_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name || '-' || coalesce(NEW.season, ''), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_competition_slug ON public.competitions;
CREATE TRIGGER trg_generate_competition_slug
  BEFORE INSERT ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.generate_competition_slug();

-- Refresh v_search_index now that competitions has a real slug
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
SELECT 'competition', name, season, slug, '/competitions/' || slug,
  NULL::timestamptz,
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(season,''))
FROM public.competitions
UNION ALL
SELECT 'official', full_name, official_role, id::text, '/about/officials',
  NULL::timestamptz,
  to_tsvector('english', coalesce(full_name,'') || ' ' || coalesce(official_role,''))
FROM public.officials;

GRANT SELECT ON public.v_search_index TO anon;
