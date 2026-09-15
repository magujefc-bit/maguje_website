

---

# `relationships.md` — Foreign Key Relationships Reference

## Auth & Admin

```
admins.id             → auth.users.id           (Supabase Auth linkage — an admin IS an auth user)
admins.invited_by     → admins.id               (self-referential — who invited this admin)
```

## Competitions & Teams

```
matches.competition_id           → competitions.id
competition_teams.competition_id → competitions.id
competition_teams.team_id        → teams.id

matches.opponent_team_id → teams.id   (internal matches only)
matches.team_a_id        → teams.id   (external matches only)
matches.team_b_id        → teams.id   (external matches only)
```

## Match Events (all point back to `matches` and `players`)

```
match_lineups.match_id       → matches.id
match_lineups.player_id      → players.id

match_substitutions.match_id       → matches.id
match_substitutions.player_in_id   → players.id
match_substitutions.player_out_id  → players.id

match_cards.match_id   → matches.id
match_cards.player_id  → players.id

match_goals.match_id    → matches.id
match_goals.scorer_id   → players.id   (nullable — null when is_opponent_goal = true)
match_goals.assist_id   → players.id   (nullable — optional even on Maguje's own goals)
```

## Content

```
news_posts.cover_overlay_id         → overlay_templates.id
event_posts.cover_overlay_id        → overlay_templates.id
match_report_posts.cover_overlay_id → overlay_templates.id

match_report_posts.match_id            → matches.id              ("View Match" feature)
event_posts.linked_match_report_id     → match_report_posts.id   (Events only — News had this removed)
```

## Media

```
post_media.media_id            → media_library.id
media_participants.media_id    → media_library.id
```

---

## Notable non-relationships (worth documenting explicitly, since they're easy to assume incorrectly)

- **`activity_posts`** — table no longer exists (removed with Community/Activities feature). No FK cleanup was needed since nothing else referenced it directly via a *database-enforced* FK — though `post_media.post_type` and the (now stale) `'activity'` CHECK value are soft, string-based references with no FK backing them. See `constraints.md`.
- **`players.team_name`** despite its name, is **not** a foreign key to `teams` — it's a plain text column (likely a display-name override). Actual team membership isn't modeled as a player→team relationship at all in this schema; players belong to Maguje FC implicitly (the whole `players` table *is* Maguje's roster), and `teams` exists purely to represent **opponents**.
- **`club_profile`, `developer_profile`** — singleton tables (enforced by `CHECK (id = 1)`, see `constraints.md`), not related to anything via FK — there's only ever one row.
- **`v_group_standings`, `v_standings`, `v_fixture_results`** and all **spotlight views** are *views*, not tables — they have no FK constraints of their own; their "relationships" are just JOIN logic baked into the view definition (fully documented in `views.md`).

---

