
---

# `rls-policies.md` — Row Level Security Policies Reference

## Key mechanisms used throughout

- **`my_role()`** — a helper function returning the current authenticated admin's role, used everywhere instead of repeating a subquery against `admins` in every policy.
- **Owner check pattern** — six tables (`developer_profile`, `developer_projects`, `developer_skills`, `developer_social_links`, `issue_reports`, `pwa_installs`) restrict write/read access to one specific admin via a literal email match:
  ```sql
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() 
          AND admins.role = 'super_admin' 
          AND admins.email = 'fabrisvicky1@gmail.com')
  ```
  This is the actual, current value of `OWNER_EMAIL` as enforced at the database level.
- **`is_delegated_match_in_window(match_id)`** — a helper function gating `content_manager`'s access to match events (`match_goals`, `match_cards`, `match_lineups`, `match_substitutions`). Not something built as part of this project's tracked work — pre-existing infrastructure.
- **Content manager match delegation** — `matches.content_manager_managed` (a boolean column not previously documented in this reference) combined with a **time window** (from 10 minutes before kickoff, until either the match is marked complete or 1 day after its date) lets a `content_manager` view/update a specifically delegated match during a live event — likely for live-reporting duties without full `match_manager` privileges. This is a genuinely notable, independently-built capability worth knowing about.

## Public read access (open to everyone, `qual: true`)
`club_contacts`, `club_honours`, `club_profile`, `club_social_links`, `competitions`, `event_posts`, `match_cards`, `match_goals`, `match_lineups`, `match_report_posts`, `match_substitutions`, `matches`, `media_library`, `media_participants`, `news_posts`, `officials`, `overlay_templates`, `players`, `post_media`, `teams` — all fully public for SELECT.

## Per-table policy summary

| Table | Public read | Admin read (all 4 roles) | Write access |
|---|---|---|---|
| `admins` | — | Self-read only + `super_admin` reads all | `super_admin` updates |
| `club_contacts` / `club_honours` / `club_profile` / `club_social_links` | ✅ | ✅ | `senior_manager` only |
| `competitions` | ✅ | ✅ | `match_manager` (insert/update; delete blocked if any completed match exists) |
| `competition_teams` | — | ✅ | `match_manager` |
| `contact_messages` | — | — | Anyone (`anon`) can insert; `senior_manager`/`match_manager` can read & mark read |
| `developer_profile` / `developer_projects` / `developer_skills` / `developer_social_links` | ✅ | — | Owner only (see above) |
| `event_posts` | ✅ | ✅ | `content_manager` |
| `issue_reports` | — | — | Anyone can insert; owner reads/updates/deletes |
| `login_sessions` | — | — | Self-insert/read/close own session; `super_admin` reads all |
| `match_cards` / `match_goals` / `match_lineups` / `match_substitutions` | ✅ | ✅ | `match_manager` (full); `content_manager` (only on delegated matches, within window) |
| `matches` | ✅ | ✅ | `match_manager` (insert always; update/delete only if not completed); `content_manager` (delegated match, within window, limited scope) |
| `match_report_posts` | ✅ | ✅ | `content_manager` |
| `media_library` / `media_participants` / `post_media` | ✅ | ✅ | `content_manager` |
| `news_posts` | ✅ | ✅ | `content_manager` |
| `officials` | ✅ | ✅ | `senior_manager` |
| `overlay_templates` | ✅ | ✅ | `content_manager` |
| `players` | ✅ | ✅ | `senior_manager` **and** `match_manager` (both roles can manage) |
| `pwa_installs` | — | — | Anyone can insert; owner reads |
| `system_log` | — | — | `super_admin` reads only (no policy allows writing — likely inserted via a trigger or service-role process, not directly by any admin role) |
| `teams` | ✅ | ✅ | `match_manager` |

## Tables with no RLS policies found
None currently missing — every table in the introspection has at least a public or admin-scoped policy. (`competition_teams` and `system_log` have narrower access than most — no public read at all, which is correct: internal bookkeeping, not visitor-facing data.)

---

**Two things worth a decision later, not fixed now since you asked for documentation, not further changes:**
1. `players` write access is granted to *both* `senior_manager` and `match_manager` — worth confirming that's intentional overlap rather than a leftover from before roles were fully separated.
2. `system_log` has no INSERT policy for any role — if log entries are meant to be written by application code (not a database trigger), inserts would currently fail silently for every role. Worth checking how log entries actually get created in practice.

