# Maguje FC — Public Website

Vanilla HTML/CSS/JS single-page application (client-side router, no
build step, no framework), backed by Supabase project
`pxtexddyvthgmietwhyc` (magujefcDataBase).

## Running locally

Any static file server works, e.g.:

```
npx serve .
```

or open `index.html` via a local dev server that supports SPA fallback
(all routes should serve `index.html`).

## Deploying

Deploy as a static site (Netlify, Vercel, etc.) with a catch-all
rewrite rule: every path → `/index.html`, status 200. Without this,
direct navigation to e.g. `/fixtures` will 404 at the host level
before the client router ever runs.

## IMPORTANT — read before connecting the admin dashboard

This public site was built against the live database, and a few
schema changes were made directly via migration to support it:

1. **`players.slug`**, **`matches.slug`**, **`competitions.slug`** —
   added as `NOT NULL UNIQUE` columns. A `BEFORE INSERT` trigger on
   each table auto-generates a slug if one isn't provided, so **the
   existing admin dashboard does not need any code changes** to keep
   creating players/matches/competitions.
2. **`players.jersey_number`** — added, nullable. Existing players
   have `NULL` here until filled in via the dashboard.
3. **`contact_messages`** table — new, for the public Contact form.
   No dashboard UI exists yet to view these; check the table directly
   in Supabase Studio, or ask to have an admin view built.
4. **Five new views** (read-only, safe, no dashboard impact):
   `v_standings`, `v_player_stats`, `v_player_career_stats`,
   `v_player_appearances`, `v_search_index`, `v_head_to_head`.

None of these changes alter or remove any existing column the
dashboard already relies on. If the dashboard has its own slug or
jersey-number input fields already, they'll just populate the new
columns going forward — no conflict either way.

## Known gaps / follow-ups

- **Match Reports** now have their own public pages (`/match-reports`
  list + `/match-reports/:slug` detail, plus a "Latest Match Report"
  home section) — mirrors the News pages, with a photo gallery/
  lightbox for the extra images. Run
  `sql/add_match_report_public_read.sql` before deploying — it adds
  the anon SELECT policy `match_report_posts` was missing.
  **Not yet done:** `match_report_posts` has no `match_id` column, so
  there's still no automatic link from a specific Match Details page
  to its report — reports are a standalone content feed, same as
  News. If a "Read the match report →" link on Match Details is
  wanted, the dashboard needs a `match_id` FK added to
  `match_report_posts` first.
- **Internal derby matches** (`matches.is_internal = true`, using
  `team_a_id`/`team_b_id`) are not shown anywhere on the public site —
  every match view assumes Maguje FC vs an external opponent.
- **`overlay_templates`** (CSS gradient cover treatment) exists in the
  schema but isn't used — news/event/activity covers currently just
  use the first linked photo from `post_media` via `media_library.url`.
- **OG meta tag injection** (per-route social preview tags) is not
  built — needs a Netlify/Supabase Edge Function that intercepts the
  initial HTML request and injects the right `<meta property="og:*">`
  tags before the SPA takes over, especially for News/Match/Player
  detail pages with dynamic slugs.
- **`sitemap.xml`** is not generated — needs a build-time or scheduled
  script pulling all dynamic slugs (news, matches, players,
  competitions, events, activities, gallery) into a sitemap.
- **RLS**: all `anon`-facing tables/views used here should be
  double-checked for public SELECT policies in Supabase before going
  live — most were granted during this build, but a full audit is
  worth doing once.

## Project structure

```
index.html
css/            8 stylesheets (tokens, responsive, components, states)
js/
  main.js       boots the app, registers every route
  router.js     hand-rolled SPA router (History API)
  view-container.js   handles view swap + transitions
  supabase-client.js  Supabase client init
  utils/        shared helpers (style injection)
  components/   21 reusable UI components (cards, tables, controls…)
  views/        38 page views, one per route
assets/         placeholder crest/favicon/fallback SVGs — replace with real artwork
sql/            migration change log
```
