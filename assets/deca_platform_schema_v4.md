# Newman Smith DECA Platform — Schema v4

Legend: **PK** = primary key, `uuid default gen_random_uuid()` unless noted. `FK -> schema.table` = foreign key. `?` = nullable.

```sql
CREATE SCHEMA practice;   -- shared vocabulary: clusters, instructional areas, PIs, blueprints
CREATE SCHEMA events;     -- event & scenario definitions
CREATE SCHEMA rubric;     -- scoring engine + roleplay submissions
CREATE SCHEMA testbank;   -- questions, exams, practice sessions
CREATE SCHEMA content;    -- vocab, flashcards, theories, visuals, notes
CREATE SCHEMA core;       -- users, chapters, points, tracking
```

Cross-schema FKs are fine in Postgres (`FK -> core.users(id)` works from any schema) — this is purely for organization, RLS, and readability, not a functional split.

---

## Changelog: v3 → v4

1. **Renamed the `taxonomy` schema to `practice`** throughout (no structural change, name only).
2. **Added `practice.blueprint_pi_events`** to fix a real gap: not every PI in a cluster's blueprint applies to every event that shares that blueprint. Example — the last few pages of the Finance blueprint apply to BFS but not to ACT, FCE, or FTDM, even though all four events use the same Finance cluster exam/blueprint. The old model only tracked "does this event use this blueprint at all" (`blueprint_events`), with no way to scope individual PIs within the blueprint to a subset of those events. `blueprint_pi_events` links a specific `blueprint_performance_indicators` row to a specific `event_id`, so PI-to-event coverage can be partial and explicit rather than assumed to be uniform across every event on the blueprint.

Migration SQL:
```sql
CREATE TABLE practice.blueprint_pi_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_pi_id uuid NOT NULL REFERENCES practice.blueprint_performance_indicators(id),
    event_id        uuid NOT NULL REFERENCES events.events(id),
    UNIQUE (blueprint_pi_id, event_id)
);
```

`practice.blueprint_events` is kept alongside this, not replaced — it still answers "does this event use this cluster's blueprint at all" cheaply (useful for UI event pickers, `exam_events` lookups), while `blueprint_pi_events` is the finer-grained layer underneath it that answers "does this specific PI apply to this specific event." Populate `blueprint_events` as a byproduct of loading `blueprint_pi_events` rather than maintaining the two separately.

---

## Changelog: v2 → v3

Two fixes to `events.scenarios`, found while checking the schema against a real district roleplay PDF (BFS-26 District Event 1):

1. **Added `scenario_number`** and widened the unique constraint to `(event_id, year, level, scenario_number)` — the old `(event_id, year, level)` constraint only allowed one scenario per level per year, but DECA publishes multiple numbered scenarios (District Event 1, District Event 2, ...) per event/year/level.
2. **Split `situation_description` into three columns** — `situation_description`, `judge_characterization`, `solution_text` — since the participant situation, judge characterization, and worked solution are three distinct texts in the source material, not one reused text.

Migration SQL:
```sql
ALTER TABLE events.scenarios DROP CONSTRAINT IF EXISTS scenarios_event_id_year_level_key;
ALTER TABLE events.scenarios ADD COLUMN scenario_number int NOT NULL DEFAULT 1;
ALTER TABLE events.scenarios ADD COLUMN judge_characterization text;
ALTER TABLE events.scenarios ADD COLUMN solution_text text;
ALTER TABLE events.scenarios ADD CONSTRAINT scenarios_unique UNIQUE (event_id, year, level, scenario_number);
```

---

## `practice`

```
clusters
  id                    PK
  name
  slug

instructional_areas                        -- global, not owned by one cluster (BL, FI, EN, ...)
  id                    PK
  code                  unique
  name
  standard_text

performance_elements
  id                    PK
  instructional_area_id FK -> practice.instructional_areas
  element_text
  display_order

performance_indicators                     -- global master bank, one row per PI code
  id                    PK
  pi_code               unique
  indicator_text
  performance_element_id FK -> practice.performance_elements

pi_tiers                                   -- lookup table, not an enum (CS, SP, SU, MN, ON...)
  id                    PK
  code
  label

pi_blueprints                              -- the FULL cluster-wide exam blueprint (~150 PIs), e.g. "2026-27 HS Entrepreneurship PIs"
                                            -- NOT the same as a single roleplay event's short PI list — see events.event_performance_indicators
  id                    PK
  title
  year
  cluster_id            FK -> practice.clusters
  posted_date
  source_url

blueprint_events                           -- which exam-writing events this full blueprint feeds (e.g. Entrepreneurship Series)
  id                    PK
  blueprint_id          FK -> practice.pi_blueprints
  event_id              FK -> events.events

blueprint_performance_indicators           -- the ~150 PIs in the blueprint, with cluster-assigned tier
  id                    PK
  blueprint_id          FK -> practice.pi_blueprints
  pi_id                 FK -> practice.performance_indicators
  tier_id               FK -> practice.pi_tiers
  display_order

blueprint_pi_events                        -- scopes which events within the cluster a given blueprint PI actually applies to
                                            -- NOT every PI in a blueprint applies to every event on that blueprint —
                                            -- e.g. the last several pages of the Finance blueprint apply to BFS but not to ACT, FCE, or FTDM,
                                            -- even though all four events share the same Finance blueprint/exam.
                                            -- blueprint_events (above) says an event uses this blueprint at all;
                                            -- this table says a *specific PI within it* applies to that event. Partial coverage is expected, not an error.
  id                    PK
  blueprint_pi_id       FK -> practice.blueprint_performance_indicators
  event_id              FK -> events.events
  UNIQUE (blueprint_pi_id, event_id)
```

---

## `events`

```
events
  id                    PK
  event_code             e.g. "ETDM"
  event_name             e.g. "Entrepreneurship Team Decision Making"
  event_format           (roleplay_team | roleplay_individual | written | exam_only)
  cluster_id             FK -> practice.clusters

event_performance_indicators                -- the curated PI list on THIS event's cover page (e.g. ETDM-26's 5 PIs)
  id                    PK
  event_id              FK -> events.events
  pi_id                  FK -> practice.performance_indicators
  tier_id?               FK -> practice.pi_tiers
  display_order

scenarios
  id                    PK
  event_id              FK -> events.events
  year
  level                  (district | state | icdc)
  scenario_number         int, default 1  -- distinguishes multiple scenarios published for the same event/year/level (e.g. "District Event 1" vs "District Event 2"); defaults to 1 so single-scenario events don't need to set it
  instructional_area_id  FK -> practice.instructional_areas
  scenario_title
  situation_description   -- participant-facing "Event Situation" text (2nd person, "you are to assume the role of...")
  judge_characterization  -- judge-facing "Judge Role-Play Characterization" text (3rd person, "the participant"); not identical wording to situation_description, includes judge's follow-up-question context
  solution_text           -- worked answer key / model solution (e.g. calculations, narrative explanation) participants can check their prep against
  source_url
  UNIQUE (event_id, year, level, scenario_number)

scenario_judge_questions                   -- variable-length list of judge follow-ups
  id                    PK
  scenario_id           FK -> events.scenarios
  question_text
  display_order
```

A given event's PI list lives directly on `events.event_performance_indicators` — one row per PI, straight FK, no indirection. All scenarios under that event share it automatically since they all point at the same `event_id`.

**Why `scenario_number` exists:** DECA regularly publishes more than one scenario per event/year/level (e.g. "District Event 1" and "District Event 2") to prevent predictability across competition rounds. The old `UNIQUE (event_id, year, level)` constraint could only hold one row per level per year, which would collide the moment a second district scenario was loaded. `scenario_number` (1, 2, 3...) makes each one distinct while keeping them all queryable together under the same event/year/level.

**Why the situation text is split into three columns:** the participant-facing situation, the judge-facing characterization, and the solution are three genuinely different texts, not one text reused in three places — the judge version carries different framing (third person, includes judge's follow-up questions) and the solution is the worked answer key. Collapsing them into a single `situation_description` loses the ability to show participants a reference solution to self-check against, which is a core practice-tool feature.

This is a different thing from `practice.pi_blueprints`: that table is the *full cluster-wide exam blueprint* (the ~150-PI document, used to tag test-bank questions across the whole cluster) — a genuinely shared, versioned document worth deduplicating. An event's roleplay rubric only needs its own short, curated list, so it doesn't route through the blueprint at all — just `event_performance_indicators.pi_id -> practice.performance_indicators`, same master table, no shared-list layer in between.

---

## `rubric`

```
rubric_templates
  id                    PK
  event_id              FK -> events.events
  year
  title
  max_total_points
  presentation_weight    -- multiplier applied to presentation score vs exam (e.g. 2 = presentation counts twice)

rubric_criteria                            -- one row per numbered line on the Judge's Evaluation Form
  id                    PK
  rubric_template_id    FK -> rubric.rubric_templates
  display_order
  criterion_group        (performance_indicator | twenty_first_century_skills | overall_impression)
  criterion_text
  pi_id?                FK -> practice.performance_indicators
  max_points

rubric_levels                              -- 4 rows per criterion: little_no_value/below_expectations/meets_expectations/exceeds_expectations
  id                    PK
  criterion_id          FK -> rubric.rubric_criteria
  level_name             (little_no_value | below_expectations | meets_expectations | exceeds_expectations)
  min_points
  max_points
  level_order

submissions
  id                    PK
  user_id                FK -> core.users
  scenario_id            FK -> events.scenarios
  event_id               FK -> events.events
  video_url
  transcript_text
  duration_seconds
  attempt_number
  status                  (submitted | under_review | reviewed)
  submitted_at
  reviewed_at

submission_comments
  id                    PK
  submission_id          FK -> rubric.submissions
  author_id              FK -> core.users
  timestamp_seconds
  comment_text
  pi_id?                FK -> practice.performance_indicators
  created_at

submission_scores
  id                    PK
  submission_id          FK -> rubric.submissions
  scorer_id              FK -> core.users
  rubric_template_id     FK -> rubric.rubric_templates
  overall_feedback
  total_score
  scored_at

submission_criterion_scores                -- one row per rubric_criteria, per scoring pass
  id                    PK
  submission_score_id    FK -> rubric.submission_scores
  criterion_id           FK -> rubric.rubric_criteria
  points_awarded
  level_id?             FK -> rubric.rubric_levels
  comment
```

---

## `testbank`

**How you know what test a question belongs to:** questions live in `testbank.questions` only once — the bank. `testbank.exam_questions` is the join table that says "question X is item #7 on exam 1327." A question can be on zero, one, or many exams; a practice session pulling randomly from the bank never needs an `exam_id` at all.

```
questions                                  -- the bank — every question lives here exactly once
  id                    PK
  question_text
  pi_id                  FK -> practice.performance_indicators
  instructional_area_id  FK -> practice.instructional_areas   (denormalized copy, for fast filtering)
  difficulty
  question_type           (multiple_choice | true_false)
  lap_module_id?         FK -> testbank.lap_modules
  source_id?             FK -> testbank.sources
  rationale

question_choices
  id                    PK
  question_id            FK -> testbank.questions
  choice_label            (A/B/C/D)
  choice_text
  is_correct
  display_order

lap_modules                                -- e.g. "LAP-CR-001—Share the Promise", reused across many questions
  id                    PK
  lap_code               unique
  title

sources                                    -- reusable citations (articles, textbooks), deduped across questions
  id                    PK
  author
  title
  publisher
  url
  published_date
  accessed_date

exams                                      -- a named compilation, e.g. "Test 1327"
  id                    PK
  exam_code
  title
  year
  posted_date
  source_org

exam_events                                -- "used for the following events"
  id                    PK
  exam_id                FK -> testbank.exams
  event_id               FK -> events.events

exam_questions                             -- <<< this is the answer to "what test does a question belong to"
  id                    PK
  exam_id                FK -> testbank.exams
  question_id            FK -> testbank.questions
  display_order

test_sessions
  id                    PK
  user_id                 FK -> core.users
  session_type            (full | custom | pi_targeted | official_exam)
  exam_id?               FK -> testbank.exams        (set when session_type = official_exam)
  started_at
  completed_at
  score
  total_questions
  config                 jsonb

test_answers
  id                    PK
  session_id              FK -> testbank.test_sessions
  question_id             FK -> testbank.questions
  chosen_choice_id        FK -> testbank.question_choices
  is_correct
  time_spent_seconds

test_notes
  id                    PK
  session_id              FK -> testbank.test_sessions
  user_id                 FK -> core.users
  question_id             FK -> testbank.questions
  note_text
  created_at
```

---

## `content`

```
vocab_terms
  id                    PK
  term
  definition
  instructional_area_id  FK -> practice.instructional_areas
  example_usage
  source_id?             FK -> testbank.sources

flashcard_sets
  id                    PK
  title
  set_type                (pi | vocab | custom)
  instructional_area_id? FK -> practice.instructional_areas
  created_by             FK -> core.users

flashcards
  id                    PK
  set_id                 FK -> content.flashcard_sets
  front_text
  back_text
  pi_id?                FK -> practice.performance_indicators

user_flashcard_progress
  id                    PK
  user_id                FK -> core.users
  flashcard_id            FK -> content.flashcards
  status                  (learning | know_it)
  last_seen

theories
  id                    PK
  theory_name
  category                (motivational | psychological | fallacy)
  explanation
  example_scenario
  cluster_id              FK -> practice.clusters

visuals
  id                    PK
  title
  description
  cluster_id              FK -> practice.clusters
  image_url
  source_type             (chart | matrix | framework)

notes
  id                    PK
  user_id                 FK -> core.users
  tab_name
  content                 jsonb
  updated_at
```

---

## `core`

```
users
  id                    PK
  first_name
  last_name
  email
  password_hash
  role                    (student | officer | advisor)
  grade_level
  chapter_id              FK -> core.chapters
  last_login
  created_at
  total_points
  avatar_url
  is_public_on_leaderboard

chapters
  id                    PK
  school_name
  chapter_name
  advisor_user_id         FK -> core.users
  state

pi_performance                             -- incrementally updated via trigger
  id                    PK
  user_id                 FK -> core.users
  pi_id                   FK -> practice.performance_indicators
  source                  (test | roleplay)
  total_attempts
  correct_count
  last_updated

user_points_log
  id                    PK
  user_id                 FK -> core.users
  points_earned
  action_type
  reference_type          (test_session | submission | flashcard_set | manual)
  reference_id             uuid
  earned_at

announcements
  id                    PK
  author_id               FK -> core.users
  message
  visible_to               (all | officers | students)
  created_at
  expires_at
```

`core.weak_pis` — VIEW, not a table: `SELECT ... FROM core.pi_performance WHERE correct_count::float / total_attempts < 0.7`

---

## Open questions

- Resolved: `scenario_number` defaults to `1` (see migration SQL above — `NOT NULL DEFAULT 1`). Loaders for single-scenario events don't need to set it explicitly; it only needs to be passed when loading a second/third numbered scenario for the same event/year/level.

- Written events (business plans, no video) — add `submissions.document_url`, or split into a separate `written_submissions` table?
- Should `rubric_templates` version per year even when criteria don't change, or should scenarios always point at the latest template for their event?
- `pi_performance`: trigger-maintained (fast reads) or computed on-demand as a view (simpler)? Either is fine at MVP scale.
