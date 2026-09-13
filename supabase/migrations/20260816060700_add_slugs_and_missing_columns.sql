-- Add slug to players (needed for /team/players/:slug routing)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS slug text UNIQUE;

UPDATE public.players
SET slug = lower(regexp_replace(full_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE public.players ALTER COLUMN slug SET NOT NULL;

-- Add jersey_number (nullable, to be filled in by admins later)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS jersey_number integer;

-- Add slug to matches (needed for /matches/:slug routing)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS slug text UNIQUE;

UPDATE public.matches m
SET slug = lower(regexp_replace(
  coalesce(m.match_date::text, 'match') || '-' ||
  coalesce(
    (SELECT name FROM public.teams WHERE id = m.team_a_id),
    (SELECT name FROM public.teams WHERE id = m.opponent_team_id),
    'match'
  ), '[^a-zA-Z0-9]+', '-', 'g'
)) || '-' || substring(m.id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE public.matches ALTER COLUMN slug SET NOT NULL;

-- Contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contact message"
  ON public.contact_messages FOR INSERT
  TO anon
  WITH CHECK (true);
