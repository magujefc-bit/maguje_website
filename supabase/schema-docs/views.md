Got all 19. Worth noting: `v_search_index` now covers far more than what I originally built — it's expanded to include `match_report`, `match`, `honour`, and `club_page` (History/Vision & Mission/General) entries, beyond the original News/Event/Player/Team/Competition/Official set. Someone extended it since — documenting it as it stands now, not as I last left it.

---

# `views.md` — Database Views Reference

## Standings

### `v_fixture_results`
Foundational view — unifies internal (Maguje's own) and external (third-party) match results into one consistent `(competition_id, team_key, goals_for, goals_against, status, stage, group_name)` shape via 4-way `UNION ALL`. Everything else standings-related builds on this.

```sql
 SELECT matches.competition_id,
    'own'::text AS team_key,
    matches.our_score AS goals_for,
    matches.opponent_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = true
UNION ALL
 SELECT matches.competition_id,
    matches.opponent_team_id::text AS team_key,
    matches.opponent_score AS goals_for,
    matches.our_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = true
UNION ALL
 SELECT matches.competition_id,
    matches.team_a_id::text AS team_key,
    matches.team_a_score AS goals_for,
    matches.team_b_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = false
UNION ALL
 SELECT matches.competition_id,
    matches.team_b_id::text AS team_key,
    matches.team_b_score AS goals_for,
    matches.team_a_score AS goals_against,
    matches.status,
    matches.stage,
    matches.group_name
   FROM matches
  WHERE matches.is_internal = false;
```

### `v_standings`
League standings — points/W/D/L/GF/GA/rank, partitioned by `competition_id`. Powers `/standings` and the League branch of `/competitions/:slug/standings`.

```sql
WITH resolved AS (
  SELECT fr.competition_id,
    CASE WHEN fr.team_key = 'own' THEN '00000000-0000-0000-0000-000000000000'::uuid
         ELSE fr.team_key::uuid END AS team_id,
    fr.goals_for, fr.goals_against, fr.status
  FROM v_fixture_results fr
  WHERE fr.team_key IS NOT NULL
), completed AS (
  SELECT r.competition_id, r.team_id, r.goals_for, r.goals_against, r.status
  FROM resolved r WHERE r.status = 'completed' AND r.team_id IS NOT NULL
), agg AS (
  SELECT c.competition_id, c.team_id,
    count(*) AS played,
    count(*) FILTER (WHERE c.goals_for > c.goals_against) AS won,
    count(*) FILTER (WHERE c.goals_for = c.goals_against) AS drawn,
    count(*) FILTER (WHERE c.goals_for < c.goals_against) AS lost,
    sum(c.goals_for) AS goals_for,
    sum(c.goals_against) AS goals_against,
    sum(c.goals_for) - sum(c.goals_against) AS goal_difference,
    count(*) FILTER (WHERE c.goals_for > c.goals_against) * 3
      + count(*) FILTER (WHERE c.goals_for = c.goals_against) AS points
  FROM completed c GROUP BY c.competition_id, c.team_id
)
SELECT a.competition_id, a.team_id,
  COALESCE(t.name, cp.name) AS team_name,
  COALESCE(t.logo_url, cp.crest_url) AS crest_url,
  a.played, a.won, a.drawn, a.lost, a.goals_for, a.goals_against, a.goal_difference, a.points,
  rank() OVER (PARTITION BY a.competition_id ORDER BY a.points DESC, a.goal_difference DESC, a.goals_for DESC) AS "position"
FROM agg a
  LEFT JOIN teams t ON t.id = a.team_id
  LEFT JOIN club_profile cp ON a.team_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY a.competition_id, "position";
```

### `v_group_standings`
Same aggregation logic as `v_standings`, additionally partitioned by `group_name` and filtered to `stage = 'group'`. Powers Tournament group-stage tables.

```sql
WITH resolved AS (
  SELECT fr.competition_id, fr.group_name,
    CASE WHEN fr.team_key = 'own' THEN '00000000-0000-0000-0000-000000000000'::uuid
         ELSE fr.team_key::uuid END AS team_id,
    fr.goals_for, fr.goals_against, fr.status
  FROM v_fixture_results fr
  WHERE fr.team_key IS NOT NULL AND fr.stage = 'group'
), completed AS (
  SELECT r.competition_id, r.group_name, r.team_id, r.goals_for, r.goals_against, r.status
  FROM resolved r WHERE r.status = 'completed' AND r.team_id IS NOT NULL
), agg AS (
  SELECT c.competition_id, c.group_name, c.team_id,
    count(*) AS played,
    count(*) FILTER (WHERE c.goals_for > c.goals_against) AS won,
    count(*) FILTER (WHERE c.goals_for = c.goals_against) AS drawn,
    count(*) FILTER (WHERE c.goals_for < c.goals_against) AS lost,
    sum(c.goals_for) AS goals_for,
    sum(c.goals_against) AS goals_against,
    sum(c.goals_for) - sum(c.goals_against) AS goal_difference,
    count(*) FILTER (WHERE c.goals_for > c.goals_against) * 3
      + count(*) FILTER (WHERE c.goals_for = c.goals_against) AS points
  FROM completed c GROUP BY c.competition_id, c.group_name, c.team_id
)
SELECT a.competition_id, a.group_name, a.team_id,
  COALESCE(t.name, cp.name) AS team_name,
  COALESCE(t.logo_url, cp.crest_url) AS crest_url,
  a.played, a.won, a.drawn, a.lost, a.goals_for, a.goals_against, a.goal_difference, a.points,
  rank() OVER (PARTITION BY a.competition_id, a.group_name ORDER BY a.points DESC, a.goal_difference DESC, a.goals_for DESC) AS "position"
FROM agg a
  LEFT JOIN teams t ON t.id = a.team_id
  LEFT JOIN club_profile cp ON a.team_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY a.competition_id, a.group_name, "position";
```

### `v_competition_match_counts`
Simple helper — completed internal match count per competition. Powers the "more than 3 matches" gating rule for Player Spotlight categories.

```sql
SELECT competition_id, count(*) AS completed_matches
FROM matches
WHERE status = 'completed' AND is_internal = true
GROUP BY competition_id;
```

---

## Head-to-Head

### `v_head_to_head`
Maguje's all-time record vs. each opponent (across all competitions combined).

```sql
SELECT m.opponent_team_id, t.name AS opponent_name, t.logo_url AS opponent_crest,
  count(*) AS played,
  count(*) FILTER (WHERE m.our_score > m.opponent_score) AS wins,
  count(*) FILTER (WHERE m.our_score = m.opponent_score) AS draws,
  count(*) FILTER (WHERE m.our_score < m.opponent_score) AS losses,
  sum(m.our_score) AS goals_for, sum(m.opponent_score) AS goals_against
FROM matches m JOIN teams t ON t.id = m.opponent_team_id
WHERE m.status = 'completed' AND m.is_internal = true AND m.opponent_team_id IS NOT NULL
GROUP BY m.opponent_team_id, t.name, t.logo_url;
```

### `v_head_to_head_by_competition`
Same as above, split out per competition instead of combined.

```sql
SELECT m.opponent_team_id, t.name AS opponent_name, t.logo_url AS opponent_crest,
  m.competition_id, c.name AS competition_name, c.season AS competition_season,
  count(*) AS played,
  count(*) FILTER (WHERE m.our_score > m.opponent_score) AS wins,
  count(*) FILTER (WHERE m.our_score = m.opponent_score) AS draws,
  count(*) FILTER (WHERE m.our_score < m.opponent_score) AS losses,
  sum(m.our_score) AS goals_for, sum(m.opponent_score) AS goals_against
FROM matches m
  JOIN teams t ON t.id = m.opponent_team_id
  LEFT JOIN competitions c ON c.id = m.competition_id
WHERE m.status = 'completed' AND m.is_internal = true AND m.opponent_team_id IS NOT NULL
GROUP BY m.opponent_team_id, t.name, t.logo_url, m.competition_id, c.name, c.season
ORDER BY t.name, c.season DESC NULLS LAST;
```

### `v_external_head_to_head`
Head-to-head between two **non-Maguje** teams, derived from external `team_a`/`team_b` matches. Not built as part of this project's tracked work — pre-existing/independently added infrastructure.

```sql
SELECT LEAST(m.team_a_id, m.team_b_id) AS team_1_id,
  GREATEST(m.team_a_id, m.team_b_id) AS team_2_id,
  t1.name AS team_1_name, t1.logo_url AS team_1_crest,
  t2.name AS team_2_name, t2.logo_url AS team_2_crest,
  count(*) AS played,
  count(*) FILTER (WHERE (m.team_a_id = LEAST(m.team_a_id, m.team_b_id) AND m.team_a_score > m.team_b_score)
    OR (m.team_b_id = LEAST(m.team_a_id, m.team_b_id) AND m.team_b_score > m.team_a_score)) AS team_1_wins,
  count(*) FILTER (WHERE m.team_a_score = m.team_b_score) AS draws,
  count(*) FILTER (WHERE (m.team_a_id = GREATEST(m.team_a_id, m.team_b_id) AND m.team_a_score > m.team_b_score)
    OR (m.team_b_id = GREATEST(m.team_a_id, m.team_b_id) AND m.team_b_score > m.team_a_score)) AS team_2_wins,
  sum(CASE WHEN m.team_a_id = LEAST(m.team_a_id, m.team_b_id) THEN m.team_a_score ELSE m.team_b_score END) AS team_1_goals,
  sum(CASE WHEN m.team_a_id = GREATEST(m.team_a_id, m.team_b_id) THEN m.team_a_score ELSE m.team_b_score END) AS team_2_goals
FROM matches m
  JOIN teams t1 ON t1.id = LEAST(m.team_a_id, m.team_b_id)
  JOIN teams t2 ON t2.id = GREATEST(m.team_a_id, m.team_b_id)
WHERE m.status = 'completed' AND m.is_internal = false AND m.team_a_id IS NOT NULL AND m.team_b_id IS NOT NULL
GROUP BY LEAST(m.team_a_id, m.team_b_id), GREATEST(m.team_a_id, m.team_b_id), t1.name, t1.logo_url, t2.name, t2.logo_url;
```

### `v_fixture_results_match_rows`
Flat, denormalized row-per-match view for internal matches with resolved home/away team names and crests (handles the `is_home` flip so the club's own name always appears correctly). Not part of tracked project work — pre-existing.

```sql
SELECT m.id, m.slug, m.match_date, m.match_time, m.status, m.is_internal, m.competition_id,
  c.name AS competition_name,
  CASE WHEN m.is_home = true THEN 'Maguje FC' ELSE t.name END AS home_team_name,
  CASE WHEN m.is_home = true THEN '/assets/crest.svg' ELSE t.logo_url END AS home_team_logo,
  t.name AS opponent_name, t.logo_url AS opponent_logo_url,
  m.our_score, m.opponent_score, m.is_home,
  CASE WHEN m.is_home = true THEN t.name ELSE 'Maguje FC' END AS away_team_name,
  CASE WHEN m.is_home = true THEN t.logo_url ELSE '/assets/crest.svg' END AS away_team_logo
FROM matches m
  LEFT JOIN competitions c ON c.id = m.competition_id
  LEFT JOIN teams t ON t.id = m.opponent_team_id
WHERE m.is_internal = true;
```

---

## Player Statistics & Spotlight

### `v_player_stats`
All-Time Stats — appearances/goals/assists/cards per player per competition. No filtering by competition type.

```sql
SELECT p.id AS player_id, m.competition_id,
  count(DISTINCT ml.match_id) AS appearances,
  count(DISTINCT g.id) FILTER (WHERE g.scorer_id = p.id AND g.is_opponent_goal = false) AS goals,
  count(DISTINCT g2.id) FILTER (WHERE g2.assist_id = p.id) AS assists,
  count(DISTINCT c.id) FILTER (WHERE c.card_type = 'yellow') AS yellow_cards,
  count(DISTINCT c.id) FILTER (WHERE c.card_type = 'red') AS red_cards,
  p.full_name AS player_name, p.photo_url, p.slug AS player_slug, p.jersey_number
FROM players p
  LEFT JOIN match_lineups ml ON ml.player_id = p.id
  LEFT JOIN matches m ON m.id = ml.match_id
  LEFT JOIN match_goals g ON g.scorer_id = p.id AND g.match_id = ml.match_id
  LEFT JOIN match_goals g2 ON g2.assist_id = p.id AND g2.match_id = ml.match_id
  LEFT JOIN match_cards c ON c.player_id = p.id AND c.match_id = ml.match_id
GROUP BY p.id, m.competition_id;
```

### `v_player_career_stats`
Sums `v_player_stats` across all competitions into one lifetime total per player. Not built as tracked project work — pre-existing.

```sql
SELECT player_id,
  sum(appearances) AS appearances, sum(goals) AS goals, sum(assists) AS assists,
  sum(yellow_cards) AS yellow_cards, sum(red_cards) AS red_cards
FROM v_player_stats
GROUP BY player_id;
```

### `v_player_appearances`
Per-match-per-player row with that match's goals/assists — a finer-grained building block than `v_player_stats`. Pre-existing.

```sql
SELECT ml.player_id, ml.match_id, ml.is_starter,
  count(DISTINCT g.id) FILTER (WHERE g.scorer_id = ml.player_id AND g.is_opponent_goal = false) AS goals,
  count(DISTINCT g2.id) FILTER (WHERE g2.assist_id = ml.player_id) AS assists
FROM match_lineups ml
  LEFT JOIN match_goals g ON g.scorer_id = ml.player_id AND g.match_id = ml.match_id
  LEFT JOIN match_goals g2 ON g2.assist_id = ml.player_id AND g2.match_id = ml.match_id
GROUP BY ml.player_id, ml.match_id, ml.is_starter;
```

### `v_player_discipline_stats`
Cards + appearances per player per competition — feeds the Discipline spotlight category.

```sql
WITH apps AS (
  SELECT m.competition_id, l.player_id, count(*) AS appearances
  FROM match_lineups l JOIN matches m ON m.id = l.match_id
  WHERE m.status = 'completed' AND m.is_internal = true
  GROUP BY m.competition_id, l.player_id
), cards AS (
  SELECT m.competition_id, c.player_id, count(*) AS card_count
  FROM match_cards c JOIN matches m ON m.id = c.match_id
  WHERE m.status = 'completed' AND m.is_internal = true
  GROUP BY m.competition_id, c.player_id
)
SELECT a.competition_id, a.player_id, p.full_name AS player_name, p.photo_url, p.slug AS player_slug,
  a.appearances, COALESCE(c.card_count, 0) AS card_count
FROM apps a
  JOIN players p ON p.id = a.player_id
  LEFT JOIN cards c ON c.competition_id = a.competition_id AND c.player_id = a.player_id;
```

### `v_player_match_scores`
Base layer for all Spotlight categories — per-match goals/assists/weighted score (`goals × 2 + assists`).

```sql
WITH goals AS (
  SELECT match_id, scorer_id AS player_id, count(*) AS goals
  FROM match_goals WHERE is_opponent_goal = false AND scorer_id IS NOT NULL
  GROUP BY match_id, scorer_id
), assists AS (
  SELECT match_id, assist_id AS player_id, count(*) AS assists
  FROM match_goals WHERE is_opponent_goal = false AND assist_id IS NOT NULL
  GROUP BY match_id, assist_id
), combined AS (
  SELECT COALESCE(g.match_id, a.match_id) AS match_id, COALESCE(g.player_id, a.player_id) AS player_id,
    COALESCE(g.goals, 0) AS goals_in_match, COALESCE(a.assists, 0) AS assists_in_match
  FROM goals g FULL JOIN assists a ON g.match_id = a.match_id AND g.player_id = a.player_id
)
SELECT c.match_id, c.player_id, p.full_name AS player_name, p.photo_url, p.slug AS player_slug,
  m.competition_id, m.match_date, m.slug AS match_slug, t.name AS opponent_name,
  c.goals_in_match, c.assists_in_match, c.goals_in_match * 2 + c.assists_in_match AS weighted_score
FROM combined c
  JOIN matches m ON m.id = c.match_id
  JOIN players p ON p.id = c.player_id
  LEFT JOIN teams t ON t.id = m.opponent_team_id
WHERE m.status = 'completed' AND m.is_internal = true;
```

### `v_spotlight_top_scorers` / `v_spotlight_top_assists`
Top scorer/assister per competition, gated to `completed_matches > 3`, tie-flagged via `is_tied`.

```sql
-- v_spotlight_top_scorers
WITH totals AS (
  SELECT player_id, player_name, photo_url, player_slug, competition_id, sum(goals_in_match) AS goals
  FROM v_player_match_scores GROUP BY player_id, player_name, photo_url, player_slug, competition_id
  HAVING sum(goals_in_match) > 0
), ranked AS (
  SELECT *, rank() OVER (PARTITION BY competition_id ORDER BY goals DESC) AS rnk,
    count(*) OVER (PARTITION BY competition_id, goals) AS tie_group_size
  FROM totals
)
SELECT r.competition_id, r.player_id, r.player_name, r.photo_url, r.player_slug, r.goals,
  (r.rnk = 1 AND r.tie_group_size > 1) AS is_tied, mc.completed_matches
FROM ranked r JOIN v_competition_match_counts mc ON mc.competition_id = r.competition_id
WHERE r.rnk = 1 AND mc.completed_matches > 3;

-- v_spotlight_top_assists follows the identical pattern, substituting assists_in_match for goals_in_match.
```

### `v_spotlight_discipline`
Fewest cards first, then most appearances as tiebreaker.

```sql
WITH ranked AS (
  SELECT *, rank() OVER (PARTITION BY competition_id ORDER BY card_count, appearances DESC) AS rnk,
    count(*) OVER (PARTITION BY competition_id, card_count, appearances) AS tie_group_size
  FROM v_player_discipline_stats
)
SELECT r.*, (r.rnk = 1 AND r.tie_group_size > 1) AS is_tied, mc.completed_matches
FROM ranked r JOIN v_competition_match_counts mc ON mc.competition_id = r.competition_id
WHERE r.rnk = 1 AND mc.completed_matches > 3;
```

### `v_spotlight_match_standout`
Highest weighted score in the single most recent completed match. Ungated (available from match 1).

```sql
WITH latest_match AS (
  SELECT id AS match_id FROM matches
  WHERE status = 'completed' AND is_internal = true
  ORDER BY match_date DESC, match_time DESC LIMIT 1
), scores AS (
  SELECT s.* FROM v_player_match_scores s JOIN latest_match lm ON lm.match_id = s.match_id
), ranked AS (
  SELECT *, rank() OVER (ORDER BY weighted_score DESC) AS rnk,
    count(*) OVER (PARTITION BY weighted_score) AS tie_group_size
  FROM scores
)
SELECT *, (rnk = 1 AND tie_group_size > 1) AS is_tied
FROM ranked WHERE rnk = 1;
```

### `v_spotlight_competition_standout`
Highest cumulative weighted score across the whole competition. Gated to `completed_matches > 3`.

```sql
WITH totals AS (
  SELECT player_id, player_name, photo_url, player_slug, competition_id,
    sum(goals_in_match) AS goals, sum(assists_in_match) AS assists, sum(weighted_score) AS weighted_score
  FROM v_player_match_scores
  GROUP BY player_id, player_name, photo_url, player_slug, competition_id
), ranked AS (
  SELECT *, rank() OVER (PARTITION BY competition_id ORDER BY weighted_score DESC) AS rnk,
    count(*) OVER (PARTITION BY competition_id, weighted_score) AS tie_group_size
  FROM totals
)
SELECT r.*, (r.rnk = 1 AND r.tie_group_size > 1) AS is_tied, mc.completed_matches
FROM ranked r JOIN v_competition_match_counts mc ON mc.competition_id = r.competition_id
WHERE r.rnk = 1 AND mc.completed_matches > 3;
```

---

## Search

### `v_search_index`
Full-text search source for `/search`. **Now covers 9 content types** (expanded since this project's tracked build — News, Event, Player, Team, Competition, Official were the original 6; Match Report, Match, Honour, and 3 Club-Profile sub-pages have been added independently since):

| Type | Source | Path pattern |
|---|---|---|
| `news` | `news_posts` | `/news/:slug` |
| `event` | `event_posts` | `/events/:slug` |
| `player` | `players` | `/players/:slug` |
| `team` | `teams` | `/results/head-to-head/:teamId` |
| `competition` | `competitions` | `/competitions/:slug` |
| `official` | `officials` | `/officials/:slug` |
| `match_report` | `match_report_posts` | `/match-reports/:slug` |
| `match` | `matches` (internal only) | `/matches/:slug` |
| `honour` | `club_honours` | `/club-records/honours` |
| `club_page` ×3 | `club_profile` | `/club-profile`, `/club-profile/history`, `/club-profile/mission-vision` |

Each branch produces `(type, title, snippet, slug, path, sort_date, search_vector)`; `search_vector` uses `to_tsvector('english', concat_ws(' ', ...relevant fields))`.

---
