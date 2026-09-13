ALTER TABLE public.match_report_posts
ADD COLUMN match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL;
