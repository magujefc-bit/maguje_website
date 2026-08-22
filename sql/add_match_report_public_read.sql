-- =====================================================================
-- Migration: allow public (anon) read access to match_report_posts
-- Run this in Supabase Dashboard > SQL Editor on pxtexddyvthgmietwhyc
-- =====================================================================
--
-- Why: match_report_posts currently only has SELECT policies for admin
-- roles (see "admins can view match_report_posts" in the dashboard's
-- RLS export). The new /match-reports and /match-reports/:slug public
-- pages query this table directly with the anon key, so it needs the
-- same kind of public SELECT policy that news_posts already has live
-- (not reflected in the dashboard repo's RLS Status.csv, but required
-- for the existing /news pages to work).
--
-- post_media and media_library are NOT touched here — since news
-- articles already display images through those same two tables with
-- the anon key, they already have the necessary public read access.
-- This migration only closes the gap for match_report_posts itself.

create policy "public can view match_report_posts"
  on public.match_report_posts
  for select
  to anon
  using (true);

-- Optional sanity check after running — should return rows with the anon key:
-- select id, slug, title from match_report_posts order by created_at desc limit 5;
