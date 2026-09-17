
# `storage.md` — Storage Buckets & Policies Reference

## Buckets

| Bucket | Public | Size limit | MIME restriction |
|---|---|---|---|
| `club-assets` | Yes (public read) | None set | None set |

Only one bucket exists — every uploaded asset across the entire app (crests, player photos, news/event/match-report images, issue-report screenshots) lives here, organized by folder.

## Folder-based access map

| Folder | Who can write/update/delete |
|---|---|
| `profile/`, `officials/`, `players/` | `senior_manager` (folder-scoped policy) |
| `players/` | Also `match_manager`, via **two separate, overlapping policies** (`admin_upload_club_assets` and `match_manager_upload_player_media`) — redundant but not conflicting |
| `matches/` | `match_manager` |
| `media/` | `content_manager` (folder-scoped) **and** `super_admin` (`admin_upload_club_assets`) — two roles can write here |
| `events/`, `news/` | `content_manager` |
| `activities/` | `content_manager` — ⚠️ **stale**: references a folder tied to the removed Activities feature |
| `match-posts/` | `content_manager`, via a separate dedicated policy (`ALL` command — read/write/update/delete together) |
| `issue-screenshots/` | **Anyone** can insert (public, unauthenticated) — matches the public Report an Issue form needing to accept uploads from non-logged-in visitors |
| Any folder, any role | `super_admin` can write/update/delete everywhere, unconditionally |

## Read access
Fully public for the entire bucket — `bucket_id = 'club-assets'` with no folder restriction. Anyone can view any uploaded asset via its public URL.

## Notable patterns
- **`my_role()`** (same helper used in table RLS) governs most folder-scoped write policies here too — one consistent access-control mechanism across both database rows and storage objects.
- **Redundant policies for `players/`**: two separate INSERT policies both grant `match_manager` write access to this folder via different mechanisms (one checks `admins.role` directly, the other via `my_role()`). Functionally harmless — either one passing is sufficient — but worth consolidating for clarity if this gets refactored later.
- **`media/` folder has two roles with write access** (`content_manager` and `super_admin`) — confirm this overlap is intentional.

---
