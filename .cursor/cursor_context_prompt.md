# Newman Smith DECA Platform — Cursor Context Prompt

Paste this entire document into Cursor at the start of any session working on this project. It contains everything needed to write correct code against this database without guessing at the schema.

---

## 1. Project overview

A centralized training platform for Newman Smith High School DECA members to practice roleplays, take practice tests, study Performance Indicators, and track progress.

- **URLs:** newmansmithdeca.com / nshsdeca.com
- **Tech stack:** HTML, CSS, JavaScript — hosted on Vercel, database on Supabase (PostgreSQL)
- **User roles:** student, officer (Pres, VP, etc), advisor
- **GitHub:** https://github.com/nshsdecasite/nshsdeca.git

---

## 2. Database architecture — 6 Postgres schemas

```sql
CREATE SCHEMA IF NOT EXISTS practice;  -- shared vocabulary: clusters, instructional areas, PIs, blueprints
CREATE SCHEMA IF NOT EXISTS events;    -- event & scenario definitions
CREATE SCHEMA IF NOT EXISTS rubric;    -- scoring engine + roleplay submissions
CREATE SCHEMA IF NOT EXISTS testbank;  -- questions, exams, practice sessions
CREATE SCHEMA IF NOT EXISTS content;   -- vocab, flashcards, theories, visuals, notes
CREATE SCHEMA IF NOT EXISTS core;      -- users, chapters, points, tracking
```

All `id` columns are `uuid PRIMARY KEY DEFAULT gen_random_uuid()`. Cross-schema foreign keys work natively in Postgres (`FK -> core.users(id)` is valid from any schema) — the schema split is purely for organization, RLS, and readability, not a functional boundary. Never assume a table lives in a different schema than listed below; always qualify table names with their schema (e.g. `practice.performance_indicators`, not just `performance_indicators`).

---

## 3. Full schema (current version, v4)

### `practice`

```sql
CREATE TABLE practice.clusters (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name  text NOT NULL,
    slug  text NOT NULL UNIQUE
);

CREATE TABLE practice.instructional_areas (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code           text NOT NULL UNIQUE,   -- e.g. "PM", "EN", "FI"
    name           text NOT NULL,
    standard_text  text
);

CREATE TABLE practice.performance_elements (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructional_area_id uuid NOT NULL REFERENCES practice.instructional_areas(id),
    element_text          text NOT NULL,
    display_order         int,
    UNIQUE (instructional_area_id, element_text)
);

CREATE TABLE practice.performance_indicators (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pi_code                text NOT NULL UNIQUE,   -- e.g. "EN:040", "FI:093"
    indicator_text         text NOT NULL,
    performance_element_id uuid REFERENCES practice.performance_elements(id)
);

CREATE TABLE practice.pi_tiers (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code  text NOT NULL UNIQUE,   -- PQ, CS, SP, SU, MN, ON
    label text NOT NULL
);

CREATE TABLE practice.pi_blueprints (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text NOT NULL,
    year        int,
    cluster_id  uuid REFERENCES practice.clusters(id),
    posted_date date,
    source_url  text
);

CREATE TABLE practice.blueprint_events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id uuid NOT NULL REFERENCES practice.pi_blueprints(id),
    event_id     uuid NOT NULL REFERENCES events.events(id),
    UNIQUE (blueprint_id, event_id)
);

CREATE TABLE practice.blueprint_performance_indicators (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id  uuid NOT NULL REFERENCES practice.pi_blueprints(id),
    pi_id         uuid NOT NULL REFERENCES practice.performance_indicators(id),
    tier_id       uuid REFERENCES practice.pi_tiers(id),
    display_order int,
    UNIQUE (blueprint_id, pi_id)
);

CREATE TABLE practice.blueprint_pi_events (
    -- Scopes which events a specific blueprint PI actually applies to. NOT every PI in a cluster's
    -- blueprint applies to every event that shares that blueprint — e.g. the last several pages of the
    -- Finance blueprint apply to BFS but not to ACT, FCE, or FTDM, even though all four events use the
    -- same Finance cluster exam/blueprint. blueprint_events (above) says an event uses the blueprint at
    -- all; this table says a *specific PI within it* applies to that event. Partial coverage is expected.
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_pi_id uuid NOT NULL REFERENCES practice.blueprint_performance_indicators(id),
    event_id        uuid NOT NULL REFERENCES events.events(id),
    UNIQUE (blueprint_pi_id, event_id)
);
```

**`pi_tiers` seed data:**

| code | label |
|---|---|
| PQ | Prerequisite |
| CS | Career Sustaining |
| SP | Specialist |
| SU | Supervisor |
| MN | Manager |
| ON | Owner |

### `events`

```sql
CREATE TABLE events.events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code   text NOT NULL UNIQUE,   -- e.g. "ETDM", "BFS" (drop year suffix)
    event_name   text NOT NULL,
    event_format text NOT NULL CHECK (event_format IN (
                     'roleplay_team','roleplay_individual','written','exam_only')),
    cluster_id   uuid REFERENCES practice.clusters(id)
);

CREATE TABLE events.event_performance_indicators (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      uuid NOT NULL REFERENCES events.events(id),
    pi_id         uuid NOT NULL REFERENCES practice.performance_indicators(id),
    tier_id       uuid REFERENCES practice.pi_tiers(id),
    display_order int,
    UNIQUE (event_id, pi_id)
);

CREATE TABLE events.scenarios (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id               uuid NOT NULL REFERENCES events.events(id),
    year                   int,
    level                  text CHECK (level IN ('district','state','icdc')),
    scenario_number        int NOT NULL DEFAULT 1,   -- see note below
    instructional_area_id  uuid REFERENCES practice.instructional_areas(id),
    scenario_title         text,
    situation_description  text,   -- participant-facing "Event Situation" (2nd person)
    judge_characterization text,   -- judge-facing "Judge Role-Play Characterization" (3rd person) — NOT identical text to situation_description
    solution_text          text,   -- worked answer key / model solution
    source_url             text,
    UNIQUE (event_id, year, level, scenario_number)
);

CREATE TABLE events.scenario_judge_questions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id   uuid NOT NULL REFERENCES events.scenarios(id),
    question_text text NOT NULL,
    display_order int,
    UNIQUE (scenario_id, display_order)
);
```

### `rubric`

```sql
CREATE TABLE rubric.rubric_templates (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            uuid NOT NULL REFERENCES events.events(id),
    year                int,
    title               text,
    max_total_points    int,
    presentation_weight int DEFAULT 2,   -- presentation counts this many times the exam score
    UNIQUE (event_id, year)
);

CREATE TABLE rubric.rubric_criteria (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_template_id uuid NOT NULL REFERENCES rubric.rubric_templates(id),
    display_order      int,
    criterion_group    text NOT NULL CHECK (criterion_group IN (
                           'performance_indicator',
                           'twenty_first_century_skills',
                           'overall_impression')),
    criterion_text     text NOT NULL,
    pi_id              uuid REFERENCES practice.performance_indicators(id),
    max_points         int,   -- VARIES per event/year — never hardcode a point scale
    UNIQUE (rubric_template_id, display_order)
);

CREATE TABLE rubric.rubric_levels (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    criterion_id uuid NOT NULL REFERENCES rubric.rubric_criteria(id),
    level_name   text NOT NULL CHECK (level_name IN (
                     'little_no_value',
                     'below_expectations',
                     'meets_expectations',
                     'exceeds_expectations')),
    min_points   int,
    max_points   int,
    level_order  int,
    UNIQUE (criterion_id, level_name)
);

CREATE TABLE rubric.submissions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid REFERENCES core.users(id),
    scenario_id      uuid REFERENCES events.scenarios(id),
    event_id         uuid REFERENCES events.events(id),
    video_url        text,
    transcript_text  text,
    duration_seconds int,
    attempt_number   int DEFAULT 1,
    status           text DEFAULT 'submitted' CHECK (status IN (
                         'submitted','under_review','reviewed')),
    submitted_at     timestamptz DEFAULT now(),
    reviewed_at      timestamptz
);

CREATE TABLE rubric.submission_comments (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     uuid NOT NULL REFERENCES rubric.submissions(id),
    author_id         uuid REFERENCES core.users(id),
    timestamp_seconds int,
    comment_text      text,
    pi_id             uuid REFERENCES practice.performance_indicators(id),
    created_at        timestamptz DEFAULT now()
);

CREATE TABLE rubric.submission_scores (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id      uuid NOT NULL REFERENCES rubric.submissions(id),
    scorer_id          uuid REFERENCES core.users(id),
    rubric_template_id uuid REFERENCES rubric.rubric_templates(id),
    overall_feedback   text,
    total_score        int,
    scored_at          timestamptz DEFAULT now()
);

CREATE TABLE rubric.submission_criterion_scores (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_score_id uuid NOT NULL REFERENCES rubric.submission_scores(id),
    criterion_id        uuid NOT NULL REFERENCES rubric.rubric_criteria(id),
    points_awarded      int,
    level_id            uuid REFERENCES rubric.rubric_levels(id),
    comment             text
);
```

### `testbank`

```sql
CREATE TABLE testbank.lap_modules (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lap_code text NOT NULL UNIQUE,   -- e.g. "LAP-CR-001"
    title    text
);

CREATE TABLE testbank.sources (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author         text,
    title          text,
    publisher      text,
    url            text,
    published_date date,
    accessed_date  date
);

CREATE TABLE testbank.questions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text         text NOT NULL,
    pi_id                 uuid REFERENCES practice.performance_indicators(id),
    instructional_area_id uuid REFERENCES practice.instructional_areas(id),  -- denormalized copy for fast filtering
    difficulty            text,
    question_type         text DEFAULT 'multiple_choice' CHECK (question_type IN (
                              'multiple_choice','true_false')),
    lap_module_id         uuid REFERENCES testbank.lap_modules(id),
    source_id             uuid REFERENCES testbank.sources(id),
    rationale             text
);

CREATE TABLE testbank.question_choices (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id   uuid NOT NULL REFERENCES testbank.questions(id),
    choice_label  text NOT NULL,   -- A, B, C, D
    choice_text   text NOT NULL,
    is_correct    boolean NOT NULL DEFAULT false,
    display_order int
);

CREATE TABLE testbank.exams (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_code   text NOT NULL UNIQUE,   -- e.g. "TEST-1324"
    title       text,
    year        int,
    posted_date date,
    source_org  text
);

CREATE TABLE testbank.exam_events (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id  uuid NOT NULL REFERENCES testbank.exams(id),
    event_id uuid NOT NULL REFERENCES events.events(id),
    UNIQUE (exam_id, event_id)
);

CREATE TABLE testbank.exam_questions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id       uuid NOT NULL REFERENCES testbank.exams(id),
    question_id   uuid NOT NULL REFERENCES testbank.questions(id),
    display_order int,
    UNIQUE (exam_id, question_id)
);

CREATE TABLE testbank.test_sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES core.users(id),
    session_type    text CHECK (session_type IN (
                        'full','custom','pi_targeted','official_exam')),
    exam_id         uuid REFERENCES testbank.exams(id),   -- set only when session_type = official_exam
    started_at      timestamptz DEFAULT now(),
    completed_at    timestamptz,
    score           int,
    total_questions int,
    config          jsonb
);

CREATE TABLE testbank.test_answers (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         uuid NOT NULL REFERENCES testbank.test_sessions(id),
    question_id        uuid NOT NULL REFERENCES testbank.questions(id),
    chosen_choice_id   uuid REFERENCES testbank.question_choices(id),
    is_correct         boolean,
    time_spent_seconds int
);

CREATE TABLE testbank.test_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid NOT NULL REFERENCES testbank.test_sessions(id),
    user_id     uuid REFERENCES core.users(id),
    question_id uuid NOT NULL REFERENCES testbank.questions(id),
    note_text   text,
    created_at  timestamptz DEFAULT now()
);
```

### `content`

```sql
CREATE TABLE content.vocab_terms (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    term                  text NOT NULL,
    definition            text,
    instructional_area_id uuid REFERENCES practice.instructional_areas(id),
    example_usage         text,
    source_id             uuid REFERENCES testbank.sources(id)
);

CREATE TABLE content.flashcard_sets (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 text NOT NULL,
    set_type              text CHECK (set_type IN ('pi','vocab','custom')),
    instructional_area_id uuid REFERENCES practice.instructional_areas(id),
    created_by            uuid REFERENCES core.users(id)
);

CREATE TABLE content.flashcards (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id     uuid NOT NULL REFERENCES content.flashcard_sets(id),
    front_text text NOT NULL,
    back_text  text NOT NULL,
    pi_id      uuid REFERENCES practice.performance_indicators(id)
);

CREATE TABLE content.user_flashcard_progress (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid REFERENCES core.users(id),
    flashcard_id uuid NOT NULL REFERENCES content.flashcards(id),
    status       text CHECK (status IN ('learning','know_it')),
    last_seen    timestamptz
);

CREATE TABLE content.theories (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    theory_name      text NOT NULL,
    category         text CHECK (category IN ('motivational','psychological','fallacy')),
    explanation      text,
    example_scenario text,
    cluster_id       uuid REFERENCES practice.clusters(id)
);

CREATE TABLE content.visuals (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text NOT NULL,
    description text,
    cluster_id  uuid REFERENCES practice.clusters(id),
    image_url   text,
    source_type text CHECK (source_type IN ('chart','matrix','framework'))
);

CREATE TABLE content.notes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid REFERENCES core.users(id),
    tab_name   text,
    content    jsonb,
    updated_at timestamptz DEFAULT now()
);
```

### `core`

```sql
CREATE TABLE core.chapters (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name     text NOT NULL,
    chapter_name    text,
    advisor_user_id uuid REFERENCES core.users(id),
    state           text
);

CREATE TABLE core.users (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name               text,
    last_name                text,
    email                    text UNIQUE,
    password_hash            text,
    role                     text CHECK (role IN ('student','officer','advisor')),
    grade_level              int,
    chapter_id               uuid REFERENCES core.chapters(id),
    last_login               timestamptz,
    created_at               timestamptz DEFAULT now(),
    total_points             int DEFAULT 0,
    avatar_url               text,
    is_public_on_leaderboard boolean DEFAULT true
);

CREATE TABLE core.pi_performance (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid REFERENCES core.users(id),
    pi_id          uuid NOT NULL REFERENCES practice.performance_indicators(id),
    source         text CHECK (source IN ('test','roleplay')),
    total_attempts int DEFAULT 0,
    correct_count  int DEFAULT 0,
    last_updated   timestamptz DEFAULT now(),
    UNIQUE (user_id, pi_id, source)
);

CREATE TABLE core.user_points_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid REFERENCES core.users(id),
    points_earned  int,
    action_type    text,
    reference_type text CHECK (reference_type IN (
                       'test_session','submission','flashcard_set','manual')),
    reference_id   uuid,
    earned_at      timestamptz DEFAULT now()
);

CREATE TABLE core.announcements (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id  uuid REFERENCES core.users(id),
    message    text,
    visible_to text CHECK (visible_to IN ('all','officers','students')),
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz
);
```

```sql
-- VIEW, not a table — students whose PI accuracy is below 70%
CREATE OR REPLACE VIEW core.weak_pis AS
SELECT user_id, pi_id, source,
       correct_count::float / NULLIF(total_attempts, 0) AS accuracy
FROM core.pi_performance
WHERE correct_count::float / NULLIF(total_attempts, 0) < 0.7;
```

---

## 4. Rules that prevent errors — read before writing any query or loader

1. **`practice.performance_indicators` is a single global master bank — one row per `pi_code`, no `cluster_id` column on it at all.** The same PI code (e.g. `FI:093`) can be referenced by multiple clusters' blueprints, roleplay events, questions, flashcards, etc. Never create a duplicate PI row for a different cluster — always upsert on `pi_code`.

2. **A PI's association with a cluster is indirect, via `practice.blueprint_performance_indicators`.** That table links `pi_id` → `blueprint_id`, and each blueprint has its own `cluster_id`. A PI is "in" a cluster only if a row exists connecting it to that cluster's blueprint — there's no automatic universal membership. Tier (`tier_id`) is stored per-blueprint-usage, not per-PI, because the same PI can carry a different tier in different clusters.

3. **`practice.blueprint_performance_indicators` ≠ `events.event_performance_indicators`.** These are two different join tables for two different things:
   - `practice.blueprint_performance_indicators` — the full cluster-wide exam blueprint (~150 PIs), used to tag test-bank questions across an entire cluster.
   - `events.event_performance_indicators` — the short curated PI list (typically 5–7 PIs) printed on one specific roleplay event's cover page. Does not route through the blueprint layer at all.
   Do not conflate these or try to derive one from the other.

3b. **Not every PI in a cluster's blueprint applies to every event that shares that blueprint.** Example: the Finance blueprint feeds ACT, BFS, FCE, and FTDM, but the last several pages of PIs in that blueprint apply only to BFS, not the other three. `practice.blueprint_events` only tells you an event uses the blueprint *at all* — it does not mean every PI in the blueprint applies to that event. Use `practice.blueprint_pi_events` (links a specific `blueprint_performance_indicators` row to a specific `event_id`) to check or set PI-to-event coverage. Never assume full/uniform PI coverage across every event sharing a blueprint — load coverage explicitly, per event, from the source material (e.g. page ranges in the PI PDF).

4. **`events.scenarios` can have multiple rows per `event_id` + `year` + `level`.** DECA regularly publishes more than one numbered scenario per event/year/level (e.g. "District Event 1" and "District Event 2") to prevent predictability. The unique constraint is `(event_id, year, level, scenario_number)`, and `scenario_number` defaults to `1`. Loaders for single-scenario events don't need to set it explicitly — only set it when loading a second/third numbered scenario for the same event/year/level.

5. **`events.scenarios` has three distinct text fields — never merge them:**
   - `situation_description` — participant-facing "Event Situation," second person ("you are to assume the role of...")
   - `judge_characterization` — judge-facing "Judge Role-Play Characterization," third person ("the participant will..."), not identical wording to `situation_description`
   - `solution_text` — the worked answer key / model solution (calculations, narrative explanation) that participants can check their prep against
   Populate all three when loading a roleplay PDF; don't collapse them into one field.

6. **`rubric.rubric_criteria.max_points` and the point scales in `rubric.rubric_levels` vary per event and per year — never hardcode a point scale.** Two real examples that differ: ETDM-26 has 7 PI-criterion rows (max 10 pts each) + 4 skills rows (max 6 pts) + 1 overall row (max 6 pts); BFS-26 has 5 PI-criterion rows (max 14 pts each, scored 0-4/5-8/9-11/12-14) + the same 4 skills + 1 overall pattern. Always read points from the loaded data, never assume a fixed scale.

7. **`testbank.questions` lives in the bank exactly once — never duplicate a question per exam.** `testbank.exam_questions` is the join table that says "question X is item #7 on exam Y." A question can belong to zero, one, or many exams. Practice sessions pulling randomly from the bank (`session_type IN ('full','custom','pi_targeted')`) never set `exam_id` on `test_sessions`; only `session_type = 'official_exam'` sets it.

8. **One `events.events` table, not separate individual/team tables.** The `event_format` CHECK constraint (`roleplay_team | roleplay_individual | written | exam_only`) plus row count on `event_performance_indicators` is how the app distinguishes formats — don't propose splitting this table.

9. **No tags/taggables table exists** — freeform cross-cutting labels were deliberately excluded. Don't invent one.

10. **No `event_solution_criteria` or `event_career_competencies` tables exist** — that content is static text rendered in the app, not database rows.

11. **`instructional_area_id` lives on `events.scenarios`, not on `events.events`** — it varies per case study/year, not per event type.

12. **`event_code` drops the year suffix** — store `"ETDM"` or `"BFS"`, never `"ETDM-26"`.

13. **All IDs are UUIDs generated by the database (`gen_random_uuid()`)** — never hardcode a UUID client-side; always capture the `id` returned from an insert/upsert before using it as a foreign key elsewhere.

14. **Every table has a meaningful natural-key UNIQUE constraint specifically so loaders can safely upsert and be re-run without creating duplicates.** When writing a loader, always upsert on that natural key (e.g. `pi_code`, `event_code`, `exam_code`, `(blueprint_id, pi_id)`, `(event_id, year, level, scenario_number)`) — never do a plain `INSERT` for practice/reference data.

---

## 5. DB loading order (dependency chain)

Always load in this order — later steps assume earlier ones already exist.

1. **`practice.pi_tiers`** — no dependencies. 6 fixed rows (PQ, CS, SP, SU, MN, ON).
2. **`practice.clusters`** — no dependencies. One row per DECA career cluster.
3. **`practice.instructional_areas` → `practice.performance_elements` → `practice.performance_indicators`** — load from the official PI PDF, areas before elements before indicators (each level FKs to the one above). Two-pass upsert-on-`pi_code` — safe to re-run for every cluster's PI PDF, since PIs are a single global bank, not cluster-scoped.
4. **`events.events`** — depends on `practice.clusters`. One row per event *type* (ETDM, BFS, FTDM...), not per year.
5. **`events.event_performance_indicators`** — depends on `events.events` + `practice.performance_indicators`. The short curated PI list off the event's cover page — pull straight from the roleplay PDF, don't derive it from a blueprint.
6. **`practice.pi_blueprints` → `practice.blueprint_events` → `practice.blueprint_performance_indicators` → `practice.blueprint_pi_events`** — depends on `practice.clusters`, `events.events`, `practice.performance_indicators`, `practice.pi_tiers`. Load the full ~150-PI cluster blueprint, then, for each PI in it, load `blueprint_pi_events` rows per event it actually applies to — do not assume every PI applies to every event sharing the blueprint (see rule 3b). No ordering dependency between this step and step 5.
7. **`rubric.rubric_templates` → `rubric.rubric_criteria` → `rubric.rubric_levels`** — depends on `events.events` and `practice.performance_indicators`. Load per event, per year — pull `max_points` and level bands straight from that year's Judge's Evaluation Form; never assume a prior year's point scale (see rule 6).
8. **`testbank.lap_modules` and `testbank.sources`** — no dependencies. Deduplicated citation lookups; load opportunistically as new LAP codes/sources are encountered while loading questions (step 9), upserting on their natural key.
9. **`testbank.questions` → `testbank.question_choices` → `testbank.exams` → `testbank.exam_events` → `testbank.exam_questions`** — depends on `practice.performance_indicators`, `practice.instructional_areas`, `testbank.lap_modules`, `testbank.sources` (nullable FKs), and `events.events` (for `exam_events`). Load questions and choices first, then the exam record, then the join rows connecting them.
10. **`events.scenarios` → `events.scenario_judge_questions`** — depends on `events.events` and `practice.instructional_areas`. Set `scenario_number` explicitly only for a second/third scenario on the same event/year/level — defaults to `1`. `judge_characterization` and `solution_text` are nullable — leave `null` if the source material doesn't include one, don't insert an empty string, so the UI can distinguish "not published" from "published but blank."
11. **`core.chapters` → `core.users`** — no dependency on anything above; load any time. Chapters before users (`users.chapter_id` references `chapters`).

**Everything after this is ongoing, user-generated data, not seed data** — created through normal app usage rather than a loader script. For reference, the dependency order there is: `rubric.submissions` (needs a user + scenario/event) → `rubric.submission_comments` / `rubric.submission_scores` → `rubric.submission_criterion_scores`; `testbank.test_sessions` → `testbank.test_answers` / `testbank.test_notes`; `content.flashcard_sets` → `content.flashcards` → `content.user_flashcard_progress`; `core.pi_performance` and `core.user_points_log` are written incrementally as the above activities happen.

---