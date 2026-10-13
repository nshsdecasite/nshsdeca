-- Practice role-plays share the scenario library, with their own indicators and judge questions.

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid
         AND att.attnum = ANY (con.conkey)
        WHERE con.conrelid = 'events.scenarios'::regclass
          AND con.contype = 'c'
          AND att.attname = 'level'
    LOOP
        EXECUTE format('ALTER TABLE events.scenarios DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE events.scenarios
    ADD CONSTRAINT scenarios_level_check
    CHECK (level IN ('district', 'state', 'icdc', 'practice'));

ALTER TABLE events.scenarios
    ADD COLUMN IF NOT EXISTS judge_question_1 text,
    ADD COLUMN IF NOT EXISTS judge_question_2 text;

CREATE TABLE IF NOT EXISTS events.scenario_indicators (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id     uuid NOT NULL REFERENCES events.scenarios(id) ON DELETE CASCADE,
    pi_id           uuid REFERENCES practice.performance_indicators(id),
    pi_code         text,
    indicator_text  text NOT NULL,
    display_order   int NOT NULL,
    UNIQUE (scenario_id, display_order)
);

ALTER TABLE events.scenario_indicators ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS core.scenario_question_answers (
    user_id          uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    scenario_id      uuid NOT NULL REFERENCES events.scenarios(id) ON DELETE CASCADE,
    question_number  int NOT NULL CHECK (question_number IN (1, 2)),
    answer_text      text NOT NULL DEFAULT '',
    updated_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, scenario_id, question_number)
);

ALTER TABLE core.scenario_question_answers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.save_practice_scenario(
    p_event_code text,
    p_instructional_area_code text,
    p_instructional_area_name text,
    p_career_pathway text,
    p_title text,
    p_situation text,
    p_judge text,
    p_solution text,
    p_question_1 text,
    p_question_2 text,
    p_indicators jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, events, practice
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_event_id uuid;
    v_ia_id uuid;
    v_number int;
    v_id uuid;
    v_year int := 2026;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT id INTO v_event_id
    FROM events.events
    WHERE event_code = upper(btrim(p_event_code));

    IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    SELECT id INTO v_ia_id
    FROM practice.instructional_areas
    WHERE code = upper(btrim(coalesce(p_instructional_area_code, '')))
       OR name ILIKE btrim(coalesce(p_instructional_area_name, ''))
    ORDER BY (code = upper(btrim(coalesce(p_instructional_area_code, '')))) DESC
    LIMIT 1;

    PERFORM pg_advisory_xact_lock(hashtext('practice-scenario:' || v_event_id::text)::bigint);

    SELECT coalesce(max(scenario_number), 0) + 1
    INTO v_number
    FROM events.scenarios
    WHERE event_id = v_event_id
      AND year = v_year
      AND level = 'practice';

    INSERT INTO events.scenarios (
        event_id,
        year,
        level,
        scenario_number,
        instructional_area_id,
        career_pathway,
        scenario_title,
        situation_description,
        judge_characterization,
        solution_text,
        judge_question_1,
        judge_question_2
    )
    VALUES (
        v_event_id,
        v_year,
        'practice',
        v_number,
        v_ia_id,
        nullif(btrim(coalesce(p_career_pathway, '')), ''),
        nullif(btrim(coalesce(p_title, '')), ''),
        p_situation,
        p_judge,
        p_solution,
        nullif(btrim(coalesce(p_question_1, '')), ''),
        nullif(btrim(coalesce(p_question_2, '')), '')
    )
    RETURNING id INTO v_id;

    INSERT INTO events.scenario_indicators (
        scenario_id,
        pi_id,
        pi_code,
        indicator_text,
        display_order
    )
    SELECT
        v_id,
        pi.id,
        left(nullif(btrim(item->>'code'), ''), 40),
        left(coalesce(nullif(btrim(item->>'text'), ''), pi.indicator_text), 2000),
        coalesce(nullif(item->>'order', '')::int, t.ord::int)
    FROM jsonb_array_elements(coalesce(p_indicators, '[]'::jsonb)) WITH ORDINALITY AS t(item, ord)
    LEFT JOIN practice.performance_indicators pi
        ON pi.pi_code = nullif(btrim(item->>'code'), '')
    WHERE coalesce(nullif(btrim(item->>'text'), ''), pi.indicator_text) IS NOT NULL;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_scenario_answer(
    p_scenario_id uuid,
    p_question_number int,
    p_answer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core, events
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_question_number NOT IN (1, 2) THEN
        RAISE EXCEPTION 'Question number must be 1 or 2';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM events.scenarios WHERE id = p_scenario_id) THEN
        RAISE EXCEPTION 'Scenario not found';
    END IF;

    INSERT INTO core.scenario_question_answers (
        user_id,
        scenario_id,
        question_number,
        answer_text
    )
    VALUES (
        v_user_id,
        p_scenario_id,
        p_question_number,
        left(coalesce(p_answer, ''), 4000)
    )
    ON CONFLICT (user_id, scenario_id, question_number) DO UPDATE
    SET answer_text = excluded.answer_text,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_scenario_answers(p_scenario_id uuid)
RETURNS TABLE (
    question_number int,
    answer_text text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
#variable_conflict use_column
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT answers.question_number, answers.answer_text
    FROM core.scenario_question_answers answers
    WHERE answers.user_id = v_user_id
      AND answers.scenario_id = p_scenario_id
    ORDER BY answers.question_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_scenario(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, rubric
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', s.id,
        'event_code', e.event_code,
        'event_name', e.event_name,
        'cluster_name', c.name,
        'year', s.year,
        'level', s.level,
        'scenario_number', s.scenario_number,
        'scenario_title', s.scenario_title,
        'instructional_area_code', ia.code,
        'instructional_area_name', ia.name,
        'career_pathway', s.career_pathway,
        'situation_description', s.situation_description,
        'judge_characterization', s.judge_characterization,
        'solution_text', s.solution_text,
        'source_url', s.source_url,
        'judge_question_1', coalesce(
            nullif(btrim(s.judge_question_1), ''),
            (
                SELECT regexp_replace(q.question_text, '[[:space:]]+', ' ', 'g')
                FROM events.scenario_judge_questions q
                WHERE q.scenario_id = s.id
                ORDER BY q.display_order
                LIMIT 1
            )
        ),
        'judge_question_2', coalesce(
            nullif(btrim(s.judge_question_2), ''),
            (
                SELECT regexp_replace(q.question_text, '[[:space:]]+', ' ', 'g')
                FROM events.scenario_judge_questions q
                WHERE q.scenario_id = s.id
                ORDER BY q.display_order
                OFFSET 1
                LIMIT 1
            )
        ),
        'pis', CASE
            WHEN EXISTS (
                SELECT 1 FROM events.scenario_indicators si WHERE si.scenario_id = s.id
            ) THEN (
                SELECT coalesce(jsonb_agg(
                    jsonb_build_object(
                        'pi_id', si.pi_id,
                        'pi_code', coalesce(pi.pi_code, si.pi_code),
                        'indicator_text', coalesce(pi.indicator_text, si.indicator_text),
                        'display_order', si.display_order
                    )
                    ORDER BY si.display_order
                ), '[]'::jsonb)
                FROM events.scenario_indicators si
                LEFT JOIN practice.performance_indicators pi ON pi.id = si.pi_id
                WHERE si.scenario_id = s.id
            )
            ELSE public.scenario_performance_indicators(s.event_id, s.year)
        END,
        'rubric', public.scenario_rubric(s.event_id, s.year)
    )
    INTO result
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
    WHERE s.id = p_id;

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.save_practice_scenario(text, text, text, text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_scenario_answer(uuid, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_scenario_answers(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_practice_scenario(text, text, text, text, text, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_scenario_answer(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_scenario_answers(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
