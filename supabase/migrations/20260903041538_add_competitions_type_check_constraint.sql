ALTER TABLE public.competitions
ADD CONSTRAINT competitions_type_check
CHECK (type IN ('League', 'Friendly', 'Tournament'));
