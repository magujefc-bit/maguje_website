ALTER TABLE public.matches
ADD CONSTRAINT matches_bracket_position_check
CHECK (bracket_position IS NULL OR bracket_position > 0);
