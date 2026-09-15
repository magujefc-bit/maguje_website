 `post_media_post_type_check` still lists `'activity'` as a valid value, even though the `activity_posts` table itself was dropped when Community/Activities was removed — a small leftover inconsistency, noted rather than silently fixed since you just asked for documentation.

---

# `constraints.md` — Database CHECK Constraints Reference

## `matches` (6 constraints — the most heavily guarded table)

| Constraint | Rule | Purpose |
|---|---|---|
| `fixture_shape_check` | Either `is_internal=true` with `opponent_team_id` set and `team_a_id`/`team_b_id` both null, **or** `is_internal=false` with both `team_a_id`/`team_b_id` set and `opponent_team_id` null | Enforces the two mutually exclusive match shapes — never allows a half-internal, half-external row |
| `fixtures_status_check` | `status` ∈ `scheduled`, `completed`, `postponed`, `cancelled` | |
| `matches_live_state_check` | `live_state` ∈ `not_started`, `first_half`, `half_time`, `second_half`, `extra_time`, `full_time` | Drives the live scoreboard's phase display |
| `matches_penalty_winner_check` | `penalty_winner` ∈ `us`, `opponent` (or null) | |
| `live_only_before_completion` | `is_live` and `status = 'completed'` can never both be true simultaneously | Prevents a completed match from still showing as live |
| `matches_stage_check` | `stage` is null **or** one of `group`, `round_of_32`, `round_of_16`, `quarterfinal`, `semifinal`, `third_place`, `final` | Tournament-only field |
| `matches_bracket_position_check` | `bracket_position` is null **or** a positive integer | Tournament knockout ordering only |

## `competitions`
| Constraint | Rule |
|---|---|
| `competitions_type_check` | `type` ∈ `League`, `Friendly`, `Tournament` |

## `match_goals`
| Constraint | Rule |
|---|---|
| `goal_scorer_shape_check` | If `is_opponent_goal=true`, `scorer_id` must be null; if `false`, `scorer_id` must be set | Prevents an opponent's goal from being incorrectly attributed to a Maguje player |

## `match_cards`
| Constraint | Rule |
|---|---|
| `fixture_cards_card_type_check` | `card_type` ∈ `yellow`, `red` |

## `officials`
| Constraint | Rule |
|---|---|
| `officials_official_role_check` | `official_role` is null or one of a fixed 11-item list: Patron, Team Manager, Head Coach, Assistant Coach, Fitness Coach, Club Treasurer, Club Secretary, Team Doctor, Performance Analyst, Kit Manager, Media Manager |

## `post_media`
| Constraint | Rule | Note |
|---|---|---|
| `post_media_display_order_check` | `display_order` between 1 and 4 inclusive | Matches the 4-image cap used across News/Match Reports/Events |
| `post_media_post_type_check` | `post_type` ∈ `news`, `activity`, `event`, `match_report` | ⚠️ **Stale value:** `'activity'` remains a technically-valid value here even though the `activity_posts` table was dropped when Community/Activities was removed. Harmless (nothing currently inserts this value) but worth cleaning up in a future migration if strict accuracy matters. |

## `media_participants`
| Constraint | Rule |
|---|---|
| `media_participants_participant_type_check` | `participant_type` ∈ `player`, `official`, `custom` |
| `media_participants_custom_name_check` | If `participant_type='custom'`, `custom_name` must be set and `participant_id` null; if `player`/`official`, the reverse | Enforces one-or-the-other, never both |

## `system_log`
| Constraint | Rule |
|---|---|
| `system_log_action_check` | `action` ∈ `INSERT`, `UPDATE`, `DELETE` |

## `issue_reports`
| Constraint | Rule |
|---|---|
| `issue_reports_status_check` | `status` ∈ `open`, `reviewed`, `resolved` |

## Singleton-row guards
| Table | Constraint | Rule |
|---|---|---|
| `club_profile` | `club_profile_id_check` | `id = 1` — physically prevents more than one club profile row from ever existing |
| `developer_profile` | `developer_profile_single_row` | Same pattern, `id = 1` |

---

Ready for **File 4 — `relationships.md`** (every foreign key, mapped out) next.