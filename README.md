Here's a documentation-quality addition, written for someone picking up this repo cold — corrects one factual error the original README actually had, and captures everything genuinely new from this session. Structured to slot in as new sections plus edits to the existing "Known gaps" list, not a full rewrite.

---

## Home Page Architecture

`js/views/home.js` was split from a single ~500-line file into a `js/views/home/` module, each file scoped to one responsibility:

| File | Responsibility |
|---|---|
| `home.js` | Orchestrator only — renders the page skeleton, fetches shared data once, calls each section's render function in page order, owns the shared auto-scroll timer. |
| `home/home-data.js` | All Supabase reads for the home page. No DOM access. |
| `home/home-shared.js` | Section header markup/styles and the carousel nav-button component shared across sections. |
| `home/hero-section.js` | Greeting + live/upcoming match carousel. |
| `home/fixtures-section.js` | Conditional live/upcoming fixture cards + countdown pill. |
| `home/events-section.js` | Conditional featured event card(s). |
| `home/spotlight-section.js` | Player spotlight carousel. |
| `home/news-section.js` / `home/reports-section.js` | Self-contained fetch + render for their own carousels. |
| `utils/format.js` | Shared pure display helpers (`excerptFrom`, `combineDateTime`, `toExternalMatch`, `escapeHtml`) — no Supabase, no DOM. |

**Page order:** Hero → Events (conditional) → Fixtures (conditional) → Spotlight → News → Match Reports.

**Known technical debt from this refactor:** `home.js` temporarily re-exports `getMagujeTeamId`, `fetchFirstMedia`, `fetchAllMedia`, `toExternalMatch`, `combineDateTime`, and `excerptFrom` for backward compatibility — at least 10 other views (`news.js`, `match-reports.js`, `fixtures.js`, `match-details.js`, etc.) still import these directly from `home.js` rather than their real new locations. This shim must stay in place until those 10 files' imports are updated individually; removing it early breaks the entire site (every JS module fails to load, since ES module resolution is all-or-nothing).

## Fixtures & Events Data Rules

- **`is_internal` must be `true`** to identify real matches in this club's data — despite what an earlier version of this README implied, this is not a flag for excluding derby matches. Any future query against `matches` should default to `is_internal = true`, not `false`.
- The upcoming-fixtures query returns matches scheduled for **today and tomorrow only**, and deliberately does **not** exclude a match whose kickoff time has already passed as long as its `status` is still `scheduled`/`pending` — this covers the common case where a match's status hasn't been manually updated yet after kickoff.
- Match rows only store `competition_id`, not a denormalized `competition_name` — the name is resolved via a small in-memory join against the `competitions` table (`id, name`), following the same batch-fetch pattern `attachOpponents` already uses for `opponent_team_id`.

## Global Carousel Behavior

Events, Fixtures, Spotlight, News, and Match Reports share one coordinated auto-scroll system, distinct from Hero's independent autoplay:

- A single 15-second timer (`AUTO_SCROLL_DELAY_MS` in `home.js`) starts fresh on every home page mount and repeats for as long as the page stays active. Navigating away and back resets it.
- Each qualifying section (2+ slides) advances one slide per tick, from wherever it currently sits, looping at its own end — sections do not jump to a shared absolute index.
- Manual swipe/scroll never pauses or resets the timer. This required adding an `advance()` method to `carousel.js` that bypasses the existing interaction-pause logic used by `tick()`.
- Sections with only 1 slide render no nav buttons and are excluded from the shared timer entirely — evaluated per render based on actual item count, not hardcoded.
- Every participating section's render function returns `{ cleanup, advance }` (or `undefined` if there's nothing to render), which `home.js` collects into a registry the timer calls on each tick.

## Hero

Fixed `aspect-ratio: 16 / 9` (not `min-height`, which previously let content push the box taller than intended). No club crest — removed by design. Rotates a live-match slide (if any) plus one slide per upcoming match, with no time restriction; unlike Fixtures section below it, Hero is not gated to a 48-hour window.

## Known Gaps — Updates

Remove from the old list: *"Match Reports have public pages but need a migration"* if that's since been applied — confirm before removing, as it wasn't touched in this refactor.

Add:
- Home page's 10-file compatibility shim (above) needs cleanup.
- News/Match Reports carousels can orphan a carousel instance if their retry-after-error path fires more than once — a pre-existing gap, not introduced by this refactor, not yet fixed.