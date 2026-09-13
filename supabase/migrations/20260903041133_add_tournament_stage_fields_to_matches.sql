ALTER TABLE public.matches
ADD COLUMN stage text,
ADD COLUMN group_name text,
ADD COLUMN bracket_position integer;
