ALTER TABLE public.competition_teams
ADD COLUMN is_active boolean NOT NULL DEFAULT true,
ADD COLUMN group_name text;
