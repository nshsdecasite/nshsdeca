-- Public RPCs for practice test and roleplay scenario UI.

ALTER TABLE events.scenarios
    ADD COLUMN IF NOT EXISTS career_pathway text;

CREATE OR REPLACE FUNCTION public.list_exams()
RETURNS TABLE (
    id uuid,
    exam_code text,
    title text,
    year int,
    cluster_slug text,
    cluster_name text,
    question_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice
AS $$
    SELECT
        e.id,
        e.exam_code,
        e.title,
        e.year,
        c.slug AS cluster_slug,
        c.name AS cluster_name,
        count(eq.id) AS question_count
    FROM testbank.exams e
    JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN testbank.exam_questions eq ON eq.exam_id = e.id
    GROUP BY e.id, e.exam_code, e.title, e.year, c.slug, c.name
    ORDER BY e.year DESC, c.name, e.exam_code;
$$;

CREATE OR REPLACE FUNCTION public.list_scenarios(
    p_event_code text DEFAULT NULL,
    p_year int DEFAULT NULL,
    p_level text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_limit int DEFAULT 24,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    event_code text,
    event_name text,
    cluster_name text,
    year int,
    level text,
    scenario_number int,
    scenario_title text,
    instructional_area_code text,
    career_pathway text,
    preview text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice
AS $$
    SELECT
        s.id,
        e.event_code,
        e.event_name,
        c.name AS cluster_name,
        s.year,
        s.level,
        s.scenario_number,
        s.scenario_title,
        ia.code AS instructional_area_code,
        s.career_pathway,
        left(coalesce(s.scenario_title, s.situation_description, ''), 180) AS preview
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
    WHERE (p_event_code IS NULL OR e.event_code = upper(p_event_code))
      AND (p_year IS NULL OR s.year = p_year)
      AND (p_level IS NULL OR s.level = p_level)
      AND (
          p_search IS NULL OR btrim(p_search) = '' OR
          coalesce(s.scenario_title, '') ILIKE '%' || p_search || '%' OR
          coalesce(s.situation_description, '') ILIKE '%' || p_search || '%' OR
          e.event_code ILIKE '%' || p_search || '%' OR
          e.event_name ILIKE '%' || p_search || '%'
      )
    ORDER BY s.year DESC, e.event_code, s.level, s.scenario_number
    LIMIT greatest(coalesce(p_limit, 24), 1)
    OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_scenario(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice
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
        'source_url', s.source_url
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

CREATE OR REPLACE FUNCTION public.list_scenario_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events
AS $$
    SELECT jsonb_build_object(
        'years', (
            SELECT coalesce(jsonb_agg(y ORDER BY y DESC), '[]'::jsonb)
            FROM (SELECT DISTINCT year AS y FROM events.scenarios) years
        ),
        'events', (
            SELECT coalesce(jsonb_agg(evt ORDER BY evt->>'event_code'), '[]'::jsonb)
            FROM (
                SELECT DISTINCT jsonb_build_object(
                    'event_code', e.event_code,
                    'event_name', e.event_name
                ) AS evt
                FROM events.scenarios s
                JOIN events.events e ON e.id = s.event_id
            ) events
        ),
        'levels', to_jsonb(ARRAY['district', 'state', 'icdc']::text[])
    );
$$;

CREATE OR REPLACE FUNCTION public.create_test_session(
    p_exam_id uuid,
    p_session_type text DEFAULT 'full'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_session_id uuid;
    v_total int;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT count(*)::int
    INTO v_total
    FROM testbank.exam_questions
    WHERE exam_id = p_exam_id;

    IF v_total = 0 THEN
        RAISE EXCEPTION 'Exam not found or has no questions';
    END IF;

    INSERT INTO testbank.test_sessions (user_id, session_type, exam_id, total_questions)
    VALUES (v_user_id, coalesce(p_session_type, 'full'), p_exam_id, v_total)
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object(
        'id', v_session_id,
        'exam_id', p_exam_id,
        'total_questions', v_total
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_test_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_session record;
    v_completed boolean;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT ts.*, e.exam_code, e.title AS exam_title, e.year AS exam_year, c.name AS cluster_name
    INTO v_session
    FROM testbank.test_sessions ts
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    WHERE ts.id = p_session_id AND ts.user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_completed := v_session.completed_at IS NOT NULL;

    RETURN jsonb_build_object(
        'id', v_session.id,
        'session_type', v_session.session_type,
        'exam_id', v_session.exam_id,
        'exam_code', v_session.exam_code,
        'exam_title', v_session.exam_title,
        'exam_year', v_session.exam_year,
        'cluster_name', v_session.cluster_name,
        'started_at', v_session.started_at,
        'completed_at', v_session.completed_at,
        'score', v_session.score,
        'total_questions', v_session.total_questions,
        'questions', (
            SELECT coalesce(jsonb_agg(q ORDER BY q->>'display_order'), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'id', qu.id,
                    'display_order', eq.display_order,
                    'question_text', qu.question_text,
                    'pi_code', pi.pi_code,
                    'rationale', CASE WHEN v_completed THEN qu.rationale ELSE NULL END,
                    'choices', (
                        SELECT coalesce(jsonb_agg(
                            jsonb_build_object(
                                'id', qc.id,
                                'label', qc.choice_label,
                                'text', qc.choice_text,
                                'is_correct', CASE WHEN v_completed THEN qc.is_correct ELSE NULL END
                            )
                            ORDER BY qc.display_order
                        ), '[]'::jsonb)
                        FROM testbank.question_choices qc
                        WHERE qc.question_id = qu.id
                    ),
                    'chosen_choice_id', ta.chosen_choice_id,
                    'is_correct', ta.is_correct
                ) AS q
                FROM testbank.exam_questions eq
                JOIN testbank.questions qu ON qu.id = eq.question_id
                LEFT JOIN practice.performance_indicators pi ON pi.id = qu.pi_id
                LEFT JOIN testbank.test_answers ta
                    ON ta.session_id = v_session.id AND ta.question_id = qu.id
                WHERE eq.exam_id = v_session.exam_id
            ) questions
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_test_answer(
    p_session_id uuid,
    p_question_id uuid,
    p_choice_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_is_correct boolean;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM testbank.test_sessions
        WHERE id = p_session_id
          AND user_id = v_user_id
          AND completed_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Session not found or already completed';
    END IF;

    SELECT qc.is_correct
    INTO v_is_correct
    FROM testbank.question_choices qc
    WHERE qc.id = p_choice_id AND qc.question_id = p_question_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid choice for question';
    END IF;

    IF EXISTS (
        SELECT 1 FROM testbank.test_answers
        WHERE session_id = p_session_id AND question_id = p_question_id
    ) THEN
        UPDATE testbank.test_answers
        SET chosen_choice_id = p_choice_id,
            is_correct = v_is_correct
        WHERE session_id = p_session_id AND question_id = p_question_id;
    ELSE
        INSERT INTO testbank.test_answers (session_id, question_id, chosen_choice_id, is_correct)
        VALUES (p_session_id, p_question_id, p_choice_id, v_is_correct);
    END IF;

    RETURN jsonb_build_object('is_correct', v_is_correct);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_test_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_score int;
    v_total int;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT total_questions
    INTO v_total
    FROM testbank.test_sessions
    WHERE id = p_session_id AND user_id = v_user_id AND completed_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or already completed';
    END IF;

    SELECT count(*)::int
    INTO v_score
    FROM testbank.test_answers
    WHERE session_id = p_session_id AND is_correct IS TRUE;

    UPDATE testbank.test_sessions
    SET completed_at = now(),
        score = v_score
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'score', v_score,
        'total_questions', v_total
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_test_sessions()
RETURNS TABLE (
    id uuid,
    session_type text,
    exam_code text,
    exam_title text,
    exam_year int,
    cluster_name text,
    started_at timestamptz,
    completed_at timestamptz,
    score int,
    total_questions int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice
AS $$
    SELECT
        ts.id,
        ts.session_type,
        e.exam_code,
        e.title AS exam_title,
        e.year AS exam_year,
        c.name AS cluster_name,
        ts.started_at,
        ts.completed_at,
        ts.score,
        ts.total_questions
    FROM testbank.test_sessions ts
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    WHERE ts.user_id = auth.uid()
    ORDER BY ts.started_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_exams() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_scenarios(text, int, text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scenario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_scenario_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_test_session(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_test_answer(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_test_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_test_sessions() TO authenticated;
