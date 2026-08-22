# Maguje FC — Admin Dashboard (merged into the public site's SPA)

This used to be its own standalone single-page app, deployed side by
side with the public site under `/maguje-dashboard/`. It's now merged
into the **same** app as `maguje-public` — one `index.html`, one
router (`../router.js`), one `main.js` that registers both the public
site's routes and these, all under one origin. No second deployment,
no cross-app rewrite rules, no separate dev server needed — see the
root project README (or just run any static server with SPA-fallback
from the `maguje-public` folder, since it's one app now).

## Why the merge happened

The original plan was two separate SPAs deployed in sibling folders
under one domain, linked by a plain `<a>` in the public site's footer.
That required each app's host to have its own SPA-fallback rewrite
rule scoped to its own path — straightforward on a real host, but
painful to reproduce locally (`npx serve` doesn't do path-scoped
rewrites out of the box) and just extra moving parts for no real
benefit once it was clear both would always ship together. Folding
the dashboard's routes into the public site's existing router removes
all of that — it's one app with two route groups now.

## URL structure

Every dashboard route lives under `/maguje-dashboard/*`
(`js/dashboard/config.js`'s `BASE_PATH`). The public site's footer
links to `/maguje-dashboard/login` as a normal internal link — no
`data-external` needed anymore, since it's the same router now.

## How the shell switches

`index.html` has two shells side by side:
- Public: `#site-header` / `#app` / `#site-footer`
- Dashboard: `#dashboard-shell` (wraps `#app-sidebar-root` + `#main`)

`js/main.js`'s `route:after` listener toggles which one is visible
based on whether the current path starts with `BASE_PATH`, and toggles
`body.dashboard-mode` for the dashboard's flex layout. Each dashboard
view still mounts/unmounts the sidebar itself via `requireAdmin()` /
`components/sidebar.js`, same as before — the route listener only
handles the outer public-vs-dashboard chrome switch.

## CSS scoping

`css/dashboard-shared.css` is loaded globally (same `<head>` as every
public stylesheet), so every selector in it is prefixed with
`#dashboard-shell` — including bare element selectors like `label`,
`input`, `textarea`, `select`, which originally applied unscoped and
would otherwise have clobbered form styling across the whole public
site. `body { ... }` became `body.dashboard-mode { ... }` for the same
reason (`body` can't be scoped under a wrapper div since it's an
ancestor, not a descendant). The one exception is `.hidden`, which
lives in the public site's `css/global.css` now since it's used by
`main.js`'s shell-toggle logic on elements *outside* `#dashboard-shell`
(`#site-header`, `#app`, etc.) as well as inside it.

## Structure

```
js/
  main.js                 shared router boot — registers BOTH public
                          and dashboard routes, toggles the shell
  router.js                shared History-API router
  view-container.js        public site's — mounts into #app
  dashboard/
    config.js               BASE_PATH ("/maguje-dashboard")
    auth-gate.js             requireAdmin() — port of the old
                            app-shell.js's AppShell.init()
    view-container.js        dashboard's own — mounts into #main
    supabase-client.js       classic script (unchanged logic), sets
                            window.supabaseClient/getCurrentAdmin
    supabase-client-esm.js   re-exports those two for `import` in
                            view/component modules
    media-pipeline.js        classic script, unchanged
    scoreboard-core.js       classic script, unchanged
    fab-scoreboard.js        classic script, unchanged (<fab-scoreboard>
                            custom element, used by live-match)
    components/
      sidebar.js              nav + role gating
      page-header.js          shared <h1>+subtitle
    utils/
      inject-style.js         idempotent <style> injection
    views/
      auth/login.js, forgot-password.js, reset-password.js
      dashboard.js
      managers.js, auth-records.js, system-log.js         (super_admin)
      players.js, officials.js, club-profile.js,
        club-records.js                                    (senior_manager)
      competitions.js, competition-detail.js,
        match-center.js, results.js, live-match.js          (match_manager)
      content-dashboard.js                                  (content_manager)
```

The three classic scripts (`supabase-client.js`, `media-pipeline.js`,
`fab-scoreboard.js`) are loaded via plain `<script>` tags in
`index.html` (not modules) — same as the original standalone build.
They're global on every page load regardless of route, which is
harmless: they only define functions/attach globals, they don't
execute anything until a dashboard view actually calls them.

## Business logic

Untouched throughout every merge and restructure — every Supabase
query, the `is_internal`/`is_home` match-side branching, RLS-dependent
flows, form validation, etc. Only the delivery mechanism (routing, DOM
mounting, CSS scoping, import paths) changed.

## Two additive fixes included from the original restructure

1. **`players.jersey_number`** — field added to the Add Player and
   Edit Player forms.
2. **`club_profile.vision` / `.mission` / `.history`** — fields added
   to Club Profile.

## A bug this merge surfaced (now fixed)

Several files in the original standalone build had relative import
paths that were simply wrong (e.g. `auth-gate.js` importing sibling
files like `config.js` via `'../config.js'` instead of `'./config.js'`,
and `views/auth/*.js` missing a `../` level). `node --check` only
parses syntax — it doesn't resolve `import` targets — so this went
undetected in every prior syntax check. It would have caused a hard
module-load failure for `requireAdmin()`, meaning no protected
dashboard page would have actually rendered even once login worked.
Every relative import path in this folder has been re-verified against
the real file tree (not just re-guessed) as part of this merge.
