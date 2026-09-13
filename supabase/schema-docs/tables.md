Core Tables Reference

*This documents live database structure as of the query above. Regenerate after schema changes — this is a snapshot, not a changelog.*

## `admins`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | — |
| email | text | NO | — |
| role | enum (user-defined) | NO | — |
| is_active | boolean | NO | true |
| invited_by | uuid | YES | — |
| created_at | timestamptz | NO | now() |

## `login_sessions`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| admin_id | uuid | NO | — |
| email | text | NO | — |
| login_at | timestamptz | NO | now() |
| logout_at | timestamptz | YES | — |

## `system_log`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| actor_id | uuid | YES | — |
| actor_email | text | YES | — |
| action | text | NO | — |
| table_name | text | NO | — |
| record_id | text | YES | — |
| old_data | jsonb | YES | — |
| new_data | jsonb | YES | — |
| created_at | timestamptz | NO | now() |

## `teams`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | — |
| logo_url | text | YES | — |
| home_ground | text | YES | — |
| created_by, updated_by | uuid | YES | — |
| created_at, updated_at | timestamptz | NO | now() |

## `players`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| team_name | text | YES | — |
| full_name | text | NO | — |
| photo_url | text | YES | — |
| position | text | YES | — |
| prefered_foot | text | YES | — |
| player_role | text | YES | — |
| bio | text | YES | — |
| is_active | boolean | NO | true |
| slug | text | NO | — |
| jersey_number | integer | YES | — |
| created_by, updated_by | uuid | YES | — |
| created_at, updated_at | timestamptz | NO | now() |

## `officials`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| full_name | text | NO | — |
| photo_url | text | YES | — |
| official_role | text | YES | — |
| bio | text | YES | — |
| is_active | boolean | NO | true |
| slug | text | NO | — |
| created_by, updated_by | uuid | YES | — |
| created_at, updated_at | timestamptz | NO | now() |

## `competitions`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | — |
| season | text | YES | — |
| type | text | YES | — | *(CHECK: League / Friendly / Tournament — see constraints.md)* |
| start_date, end_date | date | YES | — |
| slug | text | NO | — |
| created_by, updated_by | uuid | YES | — |
| created_at, updated_at | timestamptz | NO | now() |

## `competition_teams`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| competition_id | uuid | NO | — |
| team_id | uuid | NO | — |
| is_active | boolean | NO | true |
| group_name | text | YES | — |
| created_at | timestamptz | NO | now() |

## `matches`
The core, most heavily-extended table. Two mutually exclusive shapes (enforced by `fixture_shape_check`):
- **Internal** (`is_internal = true`): Maguje's own match — uses `opponent_team_id`, `is_home`, `our_score`, `opponent_score`
- **External** (`is_internal = false`): match between two other teams — uses `team_a_id`, `team_b_id`, `team_a_score`, `team_b_score`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| competition_id | uuid | NO | — |
| is_internal | boolean | NO | — |
| opponent_team_id | uuid | YES | — |
| is_home | boolean | YES | — |
| our_score, opponent_score | integer | YES | — |
| team_a_id, team_b_id | uuid | YES | — |
| team_a_score, team_b_score | integer | YES | — |
| match_date | date | YES | — |
| match_time | time | YES | — |
| venue | text | YES | — |
| status | text | NO | 'scheduled' |
| slug | text | NO | — |
| is_live | boolean | NO | false |
| live_state | text | NO | 'not_started' |
| half_length_minutes | integer | YES | — |
| first_half_started_at | timestamptz | YES | — |
| second_half_started_at | timestamptz | YES | — |
| second_half_length_minutes | integer | YES | — |
| extra_time_started_at | timestamptz | YES | — |
| extra_time_length_minutes | integer | YES | — |
| went_to_penalties | boolean | NO | false |
| penalty_winner | text | YES | — |
| **stage** | text | YES | — | *(CHECK — see constraints.md; Tournament only)* |
| **group_name** | text | YES | — | *(Tournament group stage only)* |
| **bracket_position** | integer | YES | — | *(CHECK: >0 — Tournament knockout ordering only)* |
| created_by, updated_by | uuid | YES | — |
| created_at, updated_at | timestamptz | NO | now() |

## `match_goals`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| match_id | uuid | NO | — |
| scorer_id, assist_id | uuid | YES | — |
| minute | integer | YES | — |
| is_opponent_goal | boolean | NO | false |
| created_at | timestamptz | NO | now() |

## `match_cards`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| match_id | uuid | NO | — |
| player_id | uuid | NO | — |
| card_type | text | NO | — | *(CHECK: yellow/red)* |
| minute | integer | YES | — |
| created_at | timestamptz | NO | now() |

## `match_substitutions`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| match_id | uuid | NO | — |
| player_out_id, player_in_id | uuid | NO | — |
| minute | integer | YES | — |
| created_at | timestamptz | NO | now() |

## `match_lineups`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| match_id | uuid | NO | — |
| player_id | uuid | NO | — |
| is_starter | boolean | NO | true |
| position_played | text | YES | — |
| created_at | timestamptz | NO | now() |

**Note:** goals/cards/subs/lineups only ever track Maguje's own players — never opponent players, by design.

## `news_posts`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title, slug, body | text | NO | — |
| cover_overlay_id | uuid | YES | — |
| created_by, updated_by | uuid | YES | — |
| created_at, updated_at | timestamptz | NO | now() |

*(`linked_match_report_id` was removed from this table — News no longer links to Match Reports.)*

## `match_report_posts`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title, slug, body | text | NO | — |
| cover_overlay_id | uuid | YES | — |
| match_id | uuid | YES | — | *(links to the actual match played — "View Match" feature)* |
| created_by, updated_by | uuid | YES | — |
| created_at, updated_at | timestamptz | NO | now() |

## `event_posts`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title, slug, body | text | NO | — |
| event_date | date | YES | — |
| event_time | time | YES | — |
| location | text | YES | — |
| cover_overlay_id | uuid | YES | — |
| linked_match_report_id | uuid | YES | — | *(kept — Events still may link to a report; only News had this removed)* |
| created_by | uuid | YES | — |
| created_at | timestamptz | NO | now() |

## `overlay_templates`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | — |
| css_gradient | text | NO | — |
| is_active | boolean | NO | true |
| created_at | timestamptz | NO | now() |

## `club_profile`
Singleton table (`id` fixed at `1`).
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | integer | NO | 1 |
| name, crest_url, description, home_ground, location | text | YES | — |
| founded_year | integer | YES | — |
| vision, mission, history | text | YES | '' |
| updated_by | uuid | YES | — |
| updated_at | timestamptz | YES | now() |

## `club_contacts`, `club_social_links`, `club_honours`
Straightforward supporting tables for the Club Profile / Club All-Time Records pages — type/value pairs, platform/URL pairs, and honours records (title, category, season, description) respectively.

## `developer_profile`, `developer_projects`, `developer_skills`, `developer_social_links`
Content for the owner-only `/developer` page.

## `media_library`, `media_participants`, `post_media`
Media/storage bookkeeping: `media_library` is the raw asset registry; `post_media` links a media item to a specific post (News/Match Report/Event) with display order; `media_participants` links a media item to people/entities featured in it.

## `contact_messages`
Public contact form submissions — name, email, message, timestamp.

## `issue_reports`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| description | text | NO | — |
| screenshot_url, page_url, reporter_context | text | YES | — |
| status | text | NO | 'open' |
| created_at | timestamptz | YES | now() |

## `pwa_installs`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| device_id | uuid | NO | — |
| installed_at | timestamptz | YES | now() |

---



