-- PDF-aligned schema (v5): tables/columns match what roleplay + cluster exam PDFs provide.
-- Roleplay PDFs: 402 district scenarios. Exam PDFs: 68 cluster exams (~100 MC questions each).

CREATE SCHEMA IF NOT EXISTS practice;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS rubric;
CREATE SCHEMA IF NOT EXISTS testbank;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS core;

-- =============================================================================
-- practice — vocabulary bootstrapped from exam answer keys + roleplay headers
-- =============================================================================

CREATE TABLE IF NOT EXISTS practice.clusters (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name  text NOT NULL,
    slug  text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS practice.instructional_areas (
    id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL
);

CREATE TABLE IF NOT EXISTS practice.performance_indicators (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pi_code         text NOT NULL UNIQUE,
    indicator_text  text NOT NULL,
    instructional_area_id uuid REFERENCES practice.instructional_areas(id)
);

CREATE TABLE IF NOT EXISTS practice.pi_tiers (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code  text NOT NULL UNIQUE,
    label text NOT NULL
);

-- =============================================================================
-- core — users and tracking (not loaded from PDFs; must exist before submissions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.chapters (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name  text NOT NULL,
    chapter_name text,
    state        text,
    UNIQUE (school_name, chapter_name)
);

CREATE TABLE IF NOT EXISTS core.users (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name               text,
    last_name                text,
    email                    text UNIQUE,
    password_hash            text,
    role                     text CHECK (role IN ('student', 'officer', 'advisor')),
    grade_level              int,
    chapter_id               uuid REFERENCES core.chapters(id),
    last_login               timestamptz,
    created_at               timestamptz DEFAULT now(),
    total_points             int DEFAULT 0,
    avatar_url               text,
    is_public_on_leaderboard boolean DEFAULT true
);

ALTER TABLE core.chapters
    ADD COLUMN IF NOT EXISTS advisor_user_id uuid REFERENCES core.users(id);

-- =============================================================================
-- events — roleplay definitions
-- =============================================================================

CREATE TABLE IF NOT EXISTS events.events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code   text NOT NULL UNIQUE,
    event_name   text NOT NULL,
    event_format text NOT NULL CHECK (event_format IN (
                     'roleplay_team', 'roleplay_individual', 'written', 'exam_only')),
    cluster_id   uuid REFERENCES practice.clusters(id)
);

-- Cover-page PI list from roleplay PDFs (plain text; pi_id linked when matched to master bank).
CREATE TABLE IF NOT EXISTS events.event_performance_indicators (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       uuid NOT NULL REFERENCES events.events(id),
    year           int NOT NULL,
    indicator_text text NOT NULL,
    pi_id          uuid REFERENCES practice.performance_indicators(id),
    display_order  int NOT NULL,
    UNIQUE (event_id, year, display_order)
);

CREATE TABLE IF NOT EXISTS events.scenarios (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id               uuid NOT NULL REFERENCES events.events(id),
    year                   int NOT NULL,
    level                  text NOT NULL CHECK (level IN ('district', 'state', 'icdc')),
    scenario_number        int NOT NULL DEFAULT 1,
    instructional_area_id  uuid REFERENCES practice.instructional_areas(id),
    career_pathway         text,
    scenario_title         text,
    situation_description  text,
    judge_characterization text,
    solution_text          text,
    source_url             text,
    UNIQUE (event_id, year, level, scenario_number)
);

-- =============================================================================
-- rubric — Judge's Evaluation Form from roleplay PDFs
-- =============================================================================

CREATE TABLE IF NOT EXISTS rubric.rubric_templates (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         uuid NOT NULL REFERENCES events.events(id),
    year             int NOT NULL,
    level            text NOT NULL DEFAULT 'district' CHECK (level IN ('district', 'state', 'icdc')),
    title            text,
    max_total_points int,
    UNIQUE (event_id, year, level)
);

CREATE TABLE IF NOT EXISTS rubric.rubric_criteria (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_template_id uuid NOT NULL REFERENCES rubric.rubric_templates(id),
    display_order      int NOT NULL,
    criterion_group    text NOT NULL CHECK (criterion_group IN (
                           'performance_indicator',
                           'twenty_first_century_skills',
                           'overall_impression')),
    criterion_text     text NOT NULL,
    pi_id              uuid REFERENCES practice.performance_indicators(id),
    max_points         int,
    UNIQUE (rubric_template_id, display_order)
);

CREATE TABLE IF NOT EXISTS rubric.rubric_levels (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    criterion_id uuid NOT NULL REFERENCES rubric.rubric_criteria(id),
    level_name   text NOT NULL CHECK (level_name IN (
                     'little_no_value',
                     'below_expectations',
                     'meets_expectations',
                     'exceeds_expectations')),
    min_points   int,
    max_points   int,
    level_order  int NOT NULL,
    UNIQUE (criterion_id, level_name)
);

CREATE TABLE IF NOT EXISTS rubric.submissions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid REFERENCES core.users(id),
    scenario_id      uuid REFERENCES events.scenarios(id),
    event_id         uuid REFERENCES events.events(id),
    video_url        text,
    transcript_text  text,
    duration_seconds int,
    attempt_number   int DEFAULT 1,
    status           text DEFAULT 'submitted' CHECK (status IN (
                         'submitted', 'under_review', 'reviewed')),
    submitted_at     timestamptz DEFAULT now(),
    reviewed_at      timestamptz
);

CREATE TABLE IF NOT EXISTS rubric.submission_comments (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     uuid NOT NULL REFERENCES rubric.submissions(id),
    author_id         uuid REFERENCES core.users(id),
    timestamp_seconds int,
    comment_text      text,
    pi_id             uuid REFERENCES practice.performance_indicators(id),
    created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rubric.submission_scores (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id      uuid NOT NULL REFERENCES rubric.submissions(id),
    scorer_id          uuid REFERENCES core.users(id),
    rubric_template_id uuid REFERENCES rubric.rubric_templates(id),
    overall_feedback   text,
    total_score        int,
    scored_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rubric.submission_criterion_scores (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_score_id uuid NOT NULL REFERENCES rubric.submission_scores(id),
    criterion_id        uuid NOT NULL REFERENCES rubric.rubric_criteria(id),
    points_awarded      int,
    level_id            uuid REFERENCES rubric.rubric_levels(id),
    comment             text
);

-- =============================================================================
-- testbank — cluster exam PDFs (all multiple-choice)
-- =============================================================================

CREATE TABLE IF NOT EXISTS testbank.lap_modules (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lap_code text NOT NULL UNIQUE,
    title    text
);

CREATE TABLE IF NOT EXISTS testbank.sources (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    citation_text  text NOT NULL,
    author         text,
    title          text,
    url            text,
    published_date date,
    accessed_date  date,
    UNIQUE (citation_text)
);

CREATE TABLE IF NOT EXISTS testbank.questions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text         text NOT NULL,
    pi_id                 uuid REFERENCES practice.performance_indicators(id),
    instructional_area_id uuid REFERENCES practice.instructional_areas(id),
    lap_module_id         uuid REFERENCES testbank.lap_modules(id),
    source_id             uuid REFERENCES testbank.sources(id),
    rationale             text
);

CREATE TABLE IF NOT EXISTS testbank.question_choices (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id   uuid NOT NULL REFERENCES testbank.questions(id),
    choice_label  text NOT NULL,
    choice_text   text NOT NULL,
    is_correct    boolean NOT NULL DEFAULT false,
    display_order int NOT NULL,
    UNIQUE (question_id, choice_label)
);

CREATE TABLE IF NOT EXISTS testbank.exams (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_code   text NOT NULL UNIQUE,
    title       text NOT NULL,
    year        int NOT NULL,
    cluster_id  uuid NOT NULL REFERENCES practice.clusters(id),
    posted_date date,
    source_org  text DEFAULT 'MBA Research Center'
);

CREATE TABLE IF NOT EXISTS testbank.exam_events (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id  uuid NOT NULL REFERENCES testbank.exams(id),
    event_id uuid NOT NULL REFERENCES events.events(id),
    UNIQUE (exam_id, event_id)
);

CREATE TABLE IF NOT EXISTS testbank.exam_questions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id       uuid NOT NULL REFERENCES testbank.exams(id),
    question_id   uuid NOT NULL REFERENCES testbank.questions(id),
    display_order int NOT NULL,
    UNIQUE (exam_id, display_order),
    UNIQUE (exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS testbank.test_sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES core.users(id),
    session_type    text CHECK (session_type IN (
                        'full', 'custom', 'pi_targeted', 'official_exam')),
    exam_id         uuid REFERENCES testbank.exams(id),
    started_at      timestamptz DEFAULT now(),
    completed_at    timestamptz,
    score           int,
    total_questions int,
    config          jsonb
);

CREATE TABLE IF NOT EXISTS testbank.test_answers (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         uuid NOT NULL REFERENCES testbank.test_sessions(id),
    question_id        uuid NOT NULL REFERENCES testbank.questions(id),
    chosen_choice_id   uuid REFERENCES testbank.question_choices(id),
    is_correct         boolean,
    time_spent_seconds int
);

CREATE TABLE IF NOT EXISTS testbank.test_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid NOT NULL REFERENCES testbank.test_sessions(id),
    user_id     uuid REFERENCES core.users(id),
    question_id uuid NOT NULL REFERENCES testbank.questions(id),
    note_text   text,
    created_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- content — study tools (curated seed data + user-generated)
-- =============================================================================

CREATE TABLE IF NOT EXISTS content.vocab_terms (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    term                  text NOT NULL,
    definition            text,
    instructional_area_id uuid REFERENCES practice.instructional_areas(id),
    example_usage         text,
    source_id             uuid REFERENCES testbank.sources(id)
);

CREATE TABLE IF NOT EXISTS content.flashcard_sets (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 text NOT NULL,
    set_type              text CHECK (set_type IN ('pi', 'vocab', 'custom')),
    instructional_area_id uuid REFERENCES practice.instructional_areas(id),
    created_by            uuid REFERENCES core.users(id)
);

CREATE TABLE IF NOT EXISTS content.flashcards (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id     uuid NOT NULL REFERENCES content.flashcard_sets(id),
    front_text text NOT NULL,
    back_text  text NOT NULL,
    pi_id      uuid REFERENCES practice.performance_indicators(id)
);

CREATE TABLE IF NOT EXISTS content.user_flashcard_progress (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid REFERENCES core.users(id),
    flashcard_id uuid NOT NULL REFERENCES content.flashcards(id),
    status       text CHECK (status IN ('learning', 'know_it')),
    last_seen    timestamptz,
    UNIQUE (user_id, flashcard_id)
);

CREATE TABLE IF NOT EXISTS content.notes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid REFERENCES core.users(id),
    tab_name   text,
    content    jsonb,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content.theories (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    theory_name      text NOT NULL,
    category         text CHECK (category IN ('motivational', 'psychological', 'fallacy')),
    explanation      text,
    example_scenario text,
    cluster_id       uuid REFERENCES practice.clusters(id)
);

CREATE TABLE IF NOT EXISTS content.visuals (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text NOT NULL,
    description text,
    cluster_id  uuid REFERENCES practice.clusters(id),
    image_url   text,
    source_type text CHECK (source_type IN ('chart', 'matrix', 'framework'))
);

CREATE TABLE IF NOT EXISTS core.pi_performance (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid REFERENCES core.users(id),
    pi_id          uuid NOT NULL REFERENCES practice.performance_indicators(id),
    source         text CHECK (source IN ('test', 'roleplay')),
    total_attempts int DEFAULT 0,
    correct_count  int DEFAULT 0,
    last_updated   timestamptz DEFAULT now(),
    UNIQUE (user_id, pi_id, source)
);

CREATE TABLE IF NOT EXISTS core.user_points_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid REFERENCES core.users(id),
    points_earned  int,
    action_type    text,
    reference_type text CHECK (reference_type IN (
                       'test_session', 'submission', 'flashcard_set', 'manual')),
    reference_id   uuid,
    earned_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.announcements (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id  uuid REFERENCES core.users(id),
    message    text,
    visible_to text CHECK (visible_to IN ('all', 'officers', 'students')),
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz
);

CREATE OR REPLACE VIEW core.weak_pis AS
SELECT user_id, pi_id, source,
       correct_count::float / NULLIF(total_attempts, 0) AS accuracy
FROM core.pi_performance
WHERE correct_count::float / NULLIF(total_attempts, 0) < 0.7;
