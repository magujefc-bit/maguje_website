ALTER TABLE public.matches
ADD CONSTRAINT matches_stage_check
CHECK (
  stage IS NULL
  OR stage IN ('group', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final')
);
