-- Drop superseded content tables (0 rows, unreferenced by dashboard or public site;
-- replaced by news_posts / event_posts / activity_posts / match_report_posts)
drop table if exists public.feed_news;
drop table if exists public.feed_events;
drop table if exists public.feed_activities;
drop table if exists public.feed_match_posts;

-- Drop duplicate/superseded views (unreferenced by any app code or by other views;
-- superseded by v_fixture_results_match_rows, which correctly handles home/away swap)
drop view if exists public.v_fixture_results_public;
drop view if exists public.v_completed_matches;
