-- =====================================================================
-- MIGRATIONS APPLIED TO pxtexddyvthgmietwhyc (magujefcDataBase)
-- Run in this order if rebuilding on a fresh project.
-- =====================================================================

-- 1. add_slugs_and_missing_columns
--    - players.slug (unique, backfilled from full_name)
--    - players.jersey_number (nullable)
--    - matches.slug (unique, backfilled)
--    - contact_messages table + anon INSERT policy

-- 2. create_public_views (v1, superseded)
-- 3. drop_old_conflicting_views
-- 4. create_public_views (v2)
--    - v_standings, v_player_stats, v_player_career_stats,
--      v_player_appearances, v_search_index

-- 5. auto_slug_triggers_and_competition_slug
--    - BEFORE INSERT triggers on players/matches/competitions that
--      auto-generate a slug if the dashboard doesn't supply one
--    - competitions.slug column added (was missing entirely)
--    - v_search_index refreshed to use competitions.slug

-- 6. create_head_to_head_view (v2)
--    - v_head_to_head: aggregate W/D/L/GF/GA per opponent

-- 7. add_match_report_public_read (see add_match_report_public_read.sql
--    in this folder — NOT YET RUN, run manually before deploying the
--    /match-reports pages)
--    - anon SELECT policy on match_report_posts

-- Full SQL for each is in the Supabase project's migration history
-- (Dashboard > Database > Migrations). This file is a change log, not
-- a replayable script — copy the actual SQL from the dashboard if you
-- need to reapply on another project.
