Found two active Edge Functions — **`invite-manager`** and **`list-auth-records`** — neither of which is the "secure-login audit trail" idea from earlier (that one was explicitly left pending and never built). These are separate, pre-existing infrastructure I hadn't seen before. Pulling their actual source to document accurately.

Found a real discrepancy worth documenting: this function inserts into a table called `system_logs` (plural), but my earlier table introspection only found `system_log` (singular) — no `system_logs` exists. This likely means every manager invite silently fails to write its audit log entry (the code doesn't check that insert's error, so the invite itself still succeeds). Documenting this factually. Now the second function.

Both retrieved and understood. Compiling the final file.

---

# `edge-functions.md` — Supabase Edge Functions Reference

Two active Edge Functions exist — both use the `@supabase/server` helper package with `withSupabase({ auth: 'user' }, ...)`, which authenticates the caller via their JWT and exposes both a request-scoped `ctx.supabase` client and a privileged `ctx.supabaseAdmin` (service-role) client.

## `invite-manager`
**Purpose:** Powers the "Invite Manager" flow on the Managers dashboard page. A plain client-side call can't do this — creating an Auth user via `admin.inviteUserByEmail` requires the service-role key, which must never be exposed to the browser, hence the server-side function.

**Flow:**
1. Verifies the caller is an *active* `super_admin` (queries `admins` directly — not just trusting the JWT's role claim).
2. Validates `email` and `role` (role must be one of the 4 valid `admin_role` enum values).
3. Sends a Supabase Auth invite email, redirecting to `/maguje-dashboard/reset-password` on acceptance.
4. Inserts the new row into `admins` (`id` = the newly created Auth user's ID, `is_active: true`, `invited_by` = the calling admin).
5. Attempts to log the action to `system_logs`.

**⚠️ Discovered bug, documented factually, not fixed:** step 5 inserts into a table called `system_logs` (plural) — but the actual table in this database is named `system_log` (singular; confirmed via direct schema introspection, see `tables.md`). This insert will fail every time, silently — its error isn't checked or surfaced, so the invite itself still succeeds, but **no audit log entry is ever actually created for a manager invite.** This likely also explains the earlier open question in `rls-policies.md` about `system_log` having no visible INSERT policy for any role: even if the policy existed, this function is writing to a table name that doesn't exist at all.

**JWT verification:** `verify_jwt: true` (gateway-enforced — an invalid/missing token is rejected before the function code even runs).

## `list-auth-records`
**Purpose:** Powers the Auth Records dashboard page — listing all Supabase Auth users (not just those in `admins`) cross-referenced with their admin role/status, for `super_admin` review.

**Flow:**
1. Verifies the caller is an *active* `super_admin` (same pattern as `invite-manager`).
2. Calls `auth.admin.listUsers()` via the service-role client (paginated, up to 1000).
3. Returns a sanitized subset per user: `id`, `email`, `created_at`, `last_sign_in_at`, `email_confirmed_at`, `banned_until` — deliberately **not** the full Auth user object (no password hashes, no raw metadata).
4. Cross-references each user against `admins` to attach `is_admin` / `admin_role` / `admin_active`.

**JWT verification:** `verify_jwt: false` **at the platform/gateway level** — meaning Supabase's edge infrastructure does not reject unauthenticated requests before they reach the function. Security is instead enforced **entirely inside the function's own code** (the `super_admin`-and-active check in step 1). This isn't necessarily a bug — the function does still correctly reject unauthorized callers — but it's a meaningfully different security posture than `invite-manager`'s gateway-enforced check, worth being aware of if this function is ever modified, since removing or altering that internal check would have no platform-level backstop.

---

## Summary table

| Function | Verify JWT (gateway) | Internal role check | Known issue |
|---|---|---|---|
| `invite-manager` | ✅ Yes | `super_admin`, active | Logs to non-existent `system_logs` table — audit entry silently never created |
| `list-auth-records` | ❌ No | `super_admin`, active (self-enforced) | None found — but security relies entirely on function code, not platform gateway |

---

That completes all 8 planned files:
1. `tables.md`
2. `views.md`
3. `constraints.md`
4. `relationships.md`
5. `rls-policies.md`
6. `storage.md`
7. `auth-and-roles.md`
8. `edge-functions.md`

**Real issues surfaced along the way, worth a decision on whether to fix:**
- `invite-manager`'s `system_logs` → `system_log` table name mismatch (audit logging silently broken)
- `post_media_post_type_check` and the `activities/` storage folder policies still reference the removed Activities feature
- `players` table has write access granted to two roles (`senior_manager` and `match_manager`) — confirm intentional
- `login_sessions` has no visible INSERT policy for any role — worth checking how session logging actually succeeds today

Want me to also write a short `README.md` to sit at the top of this folder indexing all 8 files, or is the set complete as-is?