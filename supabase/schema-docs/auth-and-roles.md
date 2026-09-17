Let me verify the exact `admin_role` enum values directly rather than relying on what's been implied throughout the conversation.

Confirmed — exactly the 4 roles referenced throughout, no hidden fifth role.

---

# `auth-and-roles.md` — Authentication & Role Model Reference

## Identity model

- Every admin **is** a Supabase Auth user — `admins.id` is the *same* UUID as `auth.users.id`, not a separately matched foreign key by email. This means an admin is authenticated first by Supabase Auth, then looked up in `admins` by that same ID to determine role and active status.
- **Onboarding is invite-only**, via magic link — there is no public sign-up. A `super_admin` creates the invite through the Managers dashboard page, which triggers a Supabase Auth invite email; the invited person sets their own password on first login.

## The `admin_role` enum (database-enforced, 4 values)

| Role | Domain |
|---|---|
| `super_admin` | Manager accounts, auth records, system log — plus owner-only tools if the email matches (see below) |
| `senior_manager` | Players, officials, club profile & contacts, club records |
| `match_manager` | Competitions, match center, results, live match management |
| `content_manager` | News, match reports, events; limited, time-windowed access to match events on delegated matches |

## Login flow

1. Visitor submits email/password on `/maguje-dashboard/login`.
2. Supabase Auth validates credentials, returns a session.
3. The app calls `getCurrentAdmin()`, which looks up `admins` by the authenticated user's ID.
4. If no matching row exists, or `is_active = false`, access is denied even with valid Auth credentials — deactivation is enforced at the app layer, not just by disabling the Auth account.
5. On success, a row is inserted into `login_sessions` (email, `login_at`); on logout, `logout_at` is set on that same row — this is the audit trail visible on the Auth Records dashboard page.
6. `requireAdmin([roles])` is called at the top of every dashboard view — it re-checks the session and role on every page load/navigation, and redirects to login if the check fails or the role isn't in the allowed list for that page.

## Owner-only tier (not a 5th role — an email check layered on top of `super_admin`)

Three tools — **Developer Page**, **Bug Report viewer**, **PWA install count** — are restricted to one specific email address, checked in two independent places so a UI bug alone can't expose them:

1. **Page-level check** (`js/dashboard/owner-config.js` → `OWNER_EMAIL`): the page itself verifies `admin.role === 'super_admin' && admin.email === OWNER_EMAIL` before rendering.
2. **Database RLS check** (see `rls-policies.md`): the same condition, hardcoded directly into the policy — currently the literal value `fabrisvicky1@gmail.com`.

This means **any future `super_admin` invited to the system automatically does NOT get access to these three tools** — only the one specific account matching that email, at both the UI and database level.

## Content Manager's special case — delegated match access

Unlike the other three roles (whose access is purely role-based, no extra conditions), `content_manager` has a narrower, **time-windowed** exception:
- A specific match can be flagged `content_manager_managed = true`.
- That flag only grants `content_manager` read/write access to that match's events (`match_goals`, `match_cards`, `match_lineups`, `match_substitutions`) **during a defined window**: from 10 minutes before kickoff, until either the match is marked completed or 1 day after its scheduled date — whichever comes first.
- Outside that window, or on any non-delegated match, `content_manager` has no access to match event tables at all.

This appears designed for live-match-day reporting duties handed to a content manager without granting them full `match_manager` privileges — a genuinely thoughtful, narrowly-scoped delegation pattern, built independently of this project's tracked work.

## Session/security notes worth keeping in mind
- Sessions are standard Supabase Auth JWTs — no custom token system.
- `login_sessions` currently has **no INSERT policy visible for any admin role** in the RLS audit (see `rls-policies.md`) — worth confirming whether session-logging happens via a trigger/service-role process, since a direct client-side insert would currently be blocked by RLS for every role.
- There is no rate-limiting or brute-force protection layer currently documented in this schema — login attempt throttling (if any) would be Supabase Auth's own built-in project-level setting, not something custom-built in this app.

---

Ready for **File 8 — `edge-functions.md`** next — this one I need to check live rather than assume, since I don't believe any were ever actually deployed (only discussed, for the audit-trail login idea, and left pending).