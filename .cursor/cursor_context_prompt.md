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
CREATE SCHEMA IF NOT EXISTS practice;  -- clusters, instructional areas, PI master bank
CREATE SCHEMA IF NOT EXISTS events;    -- event & scenario definitions
CREATE SCHEMA IF NOT EXISTS rubric;    -- scoring engine + roleplay submissions
CREATE SCHEMA IF NOT EXISTS testbank;  -- questions, exams, practice sessions
CREATE SCHEMA IF NOT EXISTS content;   -- vocab, flashcards, theories, visuals, notes
CREATE SCHEMA IF NOT EXISTS core;      -- users, chapters, points, tracking
```

All `id` columns are `uuid PRIMARY KEY DEFAULT gen_random_uuid()`. Cross-schema foreign keys work natively in Postgres (`FK -> core.users(id)` is valid from any schema) — the schema split is purely for organization, RLS, and readability, not a functional boundary. Never assume a table lives in a different schema than listed below; always qualify table names with their schema (e.g. `practice.performance_indicators`, not just `performance_indicators`).

---

## 3. Full schema (current version, v5 — aligned to roleplay + exam PDFs)

**Source of truth migration:** `supabase/migrations/20260723180000_pdf_aligned_schema.sql`

**v4 → v5 removed** (not present in downloaded PDFs): `practice.performance_elements`, entire `practice.pi_blueprints` / `blueprint_*` layer, `events.scenario_judge_questions`, `testbank.questions.difficulty`, `testbank.questions.question_type`, `rubric.rubric_templates.presentation_weight`, `events.event_performance_indicators.tier_id`, `practice.instructional_areas.standard_text`, `testbank.sources.publisher`.

**v4 → v5 added:** `events.event_performance_indicators.year` + `indicator_text` (plain text from roleplay cover; `pi_id` optional link), `events.scenarios.career_pathway`, `rubric.rubric_templates.level`, `testbank.exams.cluster_id`, `testbank.sources.citation_text`.

### PDF → table field map

| Roleplay PDF section | DB destination |
|---|---|
| `CAREER CLUSTER` / `INSTRUCTIONAL AREA` / `CAREER PATHWAY` | `practice.clusters`, `practice.instructional_areas`, `scenarios.career_pathway` |
| `PERFORMANCE INDICATORS` (cover bullets) | `events.event_performance_indicators` (`indicator_text`, per `event_id` + `year`) |
| `EVENT SITUATION` / `CASE STUDY SITUATION` | `scenarios.situation_description` |
| `JUDGE ROLE-PLAY CHARACTERIZATION` | `scenarios.judge_characterization` |
| `SOLUTION` (2024+ only, ~14%) | `scenarios.solution_text` |
| `Judge's Evaluation Form` | `rubric.rubric_templates` → `rubric_criteria` → `rubric_levels` |

| Exam PDF section | DB destination |
|---|---|
| `Test ####` header | `testbank.exams` (`exam_code`, `title`, `year`, `cluster_id`, `posted_date`) |
| `USED FOR THE FOLLOWING EVENTS` (2024+; older exams use static cluster→event map in loader) | `testbank.exam_events` |
| Questions `1.`–`100.` + A–D choices | `testbank.questions` + `question_choices` |
| Answer key letter + rationale | `question_choices.is_correct`, `questions.rationale` |
| `SOURCE: FI:093 …` | `practice.performance_indicators` + `questions.pi_id` |
| `SOURCE: LAP-FI-093—Title` | `testbank.lap_modules` + `questions.lap_module_id` |
| Article `SOURCE: Author (date)… Retrieved … from URL` | `testbank.sources` + `questions.source_id` |

### `practice`

```sql
CREATE TABLE practice.clusters (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name  text NOT NULL,
    slug  text NOT NULL UNIQUE
);

CREATE TABLE practice.instructional_areas (
    id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,   -- e.g. "FI" — derived from PI code prefix or roleplay header
    name text NOT NULL            -- e.g. "Financial Analysis"
);

CREATE TABLE practice.performance_indicators (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pi_code               text NOT NULL UNIQUE,   -- e.g. "FI:093" — from exam answer keys
    indicator_text        text NOT NULL,
    instructional_area_id uuid REFERENCES practice.instructional_areas(id)
);

CREATE TABLE practice.pi_tiers (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code  text NOT NULL UNIQUE,   -- PQ, CS, SP, SU, MN, ON
    label text NOT NULL
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
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       uuid NOT NULL REFERENCES events.events(id),
    year           int NOT NULL,
    indicator_text text NOT NULL,   -- plain English from roleplay PDF cover
    pi_id          uuid REFERENCES practice.performance_indicators(id),  -- linked when matched to master bank
    display_order  int NOT NULL,
    UNIQUE (event_id, year, display_order)
);

CREATE TABLE events.scenarios (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id               uuid NOT NULL REFERENCES events.events(id),
    year                   int NOT NULL,
    level                  text NOT NULL CHECK (level IN ('district','state','icdc')),
    scenario_number        int NOT NULL DEFAULT 1,
    instructional_area_id  uuid REFERENCES practice.instructional_areas(id),
    career_pathway         text,
    scenario_title         text,
    situation_description  text,
    judge_characterization text,
    solution_text          text,   -- null when PDF has no SOLUTION section (~86% of older roleplays)
    source_url             text,
    UNIQUE (event_id, year, level, scenario_number)
);
```

### `rubric`

```sql
CREATE TABLE rubric.rubric_templates (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         uuid NOT NULL REFERENCES events.events(id),
    year             int NOT NULL,
    level            text NOT NULL DEFAULT 'district' CHECK (level IN ('district','state','icdc')),
    title            text,
    max_total_points int,
    UNIQUE (event_id, year, level)
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
    citation_text  text NOT NULL,   -- raw SOURCE block from answer key
    author         text,
    title          text,
    url            text,
    published_date date,
    accessed_date  date,
    UNIQUE (citation_text)
);

CREATE TABLE testbank.questions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text         text NOT NULL,
    pi_id                 uuid REFERENCES practice.performance_indicators(id),
    instructional_area_id uuid REFERENCES practice.instructional_areas(id),  -- denormalized from pi_code prefix
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
    title       text NOT NULL,
    year        int NOT NULL,
    cluster_id  uuid NOT NULL REFERENCES practice.clusters(id),
    posted_date date,
    source_org  text DEFAULT 'MBA Research Center'
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
    last_seen    timestamptz,
    UNIQUE (user_id, flashcard_id)
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

1. **`practice.performance_indicators` is a single global master bank — one row per `pi_code`.** Bootstrap it from exam answer-key `SOURCE: FI:093 …` lines as exams are loaded. Never duplicate a PI row — always upsert on `pi_code`.

2. **`events.event_performance_indicators` stores plain text from roleplay PDF covers**, scoped to `(event_id, year)`. Roleplay PDFs do not print PI codes — store `indicator_text` always; set `pi_id` only after fuzzy-matching to the master bank. PIs change year to year for the same event.

3. **`events.scenarios` can have multiple rows per `event_id` + `year` + `level`.** Unique key is `(event_id, year, level, scenario_number)`. Leave `solution_text` null when the PDF has no `SOLUTION` section — do not insert empty strings.

4. **`events.scenarios` has three distinct text fields — never merge them:**
   - `situation_description` — participant-facing "Event Situation" / "Case Study Situation"
   - `judge_characterization` — "Judge Role-Play Characterization" (third person)
   - `solution_text` — worked answer key when present (~14% of PDFs, mostly 2024+)

5. **Judge follow-up questions are not a separate table.** They are embedded in `judge_characterization` prose — do not invent `scenario_judge_questions` rows.

6. **`rubric.rubric_criteria.max_points` and `rubric.rubric_levels` point bands vary per event/year** — always parse from that PDF's Evaluation Form. Never hardcode scales.

7. **`testbank.questions` lives in the bank exactly once** — `testbank.exam_questions` links questions to exams. All exam PDF questions are multiple-choice (A–D); there is no `difficulty` or `question_type` column.

8. **`testbank.exams.cluster_id` is required** — derive from exam slug (`finance`, `bac`, etc.) in the loader. Older exams (pre-2024) may lack an on-page event list; use a static cluster→events map for `exam_events`.

9. **One `events.events` table** — `event_format` distinguishes roleplay_team / roleplay_individual / written / exam_only.

10. **`instructional_area_id` lives on `events.scenarios`, not on `events.events`** — it varies per case study/year.

11. **`event_code` drops the year suffix** — store `"BFS"`, never `"BFS-26"`.

12. **All IDs are UUIDs from `gen_random_uuid()`** — capture returned IDs from upserts before using as FKs.

13. **Upsert on natural keys** — `pi_code`, `event_code`, `exam_code`, `(event_id, year, level, scenario_number)`, `(event_id, year, display_order)`, `citation_text`, `lap_code`.

---

## 5. DB loading order (dependency chain)

Always load in this order — later steps assume earlier ones already exist.

1. **`practice.pi_tiers`** — seed data (6 fixed rows).
2. **`practice.clusters`** — seed data.
3. **`practice.instructional_areas`** — from roleplay PDF headers + PI code prefixes in exam keys.
4. **`events.events`** — seed data (already in `supabase/seed/001_reference_data.sql`).
5. **`testbank.lap_modules` + `testbank.sources`** — opportunistically while loading exams (upsert on `lap_code` / `citation_text`).
6. **`practice.performance_indicators`** — upsert from exam answer-key `SOURCE: XX:###` lines.
7. **`testbank.questions` → `testbank.question_choices` → `testbank.exams` → `testbank.exam_events` → `testbank.exam_questions`** — from 68 exam PDFs.
8. **`events.event_performance_indicators`** — from roleplay PDF cover pages (per `event_id` + `year`).
9. **`rubric.rubric_templates` → `rubric.rubric_criteria` → `rubric.rubric_levels`** — from Evaluation Form in roleplay PDFs (per `event_id` + `year` + `level`).
10. **`events.scenarios`** — from 402 roleplay PDFs last (needs instructional areas + events).

**User-generated (not from PDFs):** `core.*`, `rubric.submissions*`, `testbank.test_sessions*`, `content.notes`, `content.user_flashcard_progress`.

**Curated seed (not from roleplay/exam PDFs):** `content.vocab_terms`, `content.theories`, `content.visuals`, premade `content.flashcard_sets`.

---