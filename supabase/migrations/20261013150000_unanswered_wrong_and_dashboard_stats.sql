-- Unanswered test questions count as incorrect on submit.
-- Dashboard stats include average test % and event PI study coverage.

CREATE OR REPLACE FUNCTION public.complete_test_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank, practice, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_score int;
    v_total int;
    v_exam_id uuid;
    v_config jsonb;
    v_already_completed timestamptz;
    rec record;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT total_questions, completed_at, exam_id, coalesce(config, '{}'::jsonb)
    INTO v_total, v_already_completed, v_exam_id, v_config
    FROM testbank.test_sessions
    WHERE id = p_session_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_already_completed IS NOT NULL THEN
        RETURN jsonb_build_object(
            'score', (SELECT score FROM testbank.test_sessions WHERE id = p_session_id),
            'total_questions', v_total
        );
    END IF;

    -- Blank answers are incorrect: write rows + PI misses for unanswered questions.
    FOR rec IN
        SELECT q.id AS question_id, q.pi_id
        FROM (
            SELECT eq.question_id
            FROM testbank.exam_questions eq
            WHERE v_exam_id IS NOT NULL AND eq.exam_id = v_exam_id
            UNION ALL
            SELECT (value::text)::uuid AS question_id
            FROM jsonb_array_elements_text(coalesce(v_config->'question_ids', '[]'::jsonb)) AS t(value)
            WHERE v_exam_id IS NULL
        ) sq
        JOIN testbank.questions q ON q.id = sq.question_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM testbank.test_answers ta
            WHERE ta.session_id = p_session_id
              AND ta.question_id = q.id
        )
    LOOP
        INSERT INTO testbank.test_answers (session_id, question_id, chosen_choice_id, is_correct)
        VALUES (p_session_id, rec.question_id, NULL, false);

        PERFORM core.upsert_pi_performance(v_user_id, rec.pi_id, 'test', false);
    END LOOP;

    SELECT count(*)::int
    INTO v_score
    FROM testbank.test_answers
    WHERE session_id = p_session_id AND is_correct IS TRUE;

    UPDATE testbank.test_sessions
    SET completed_at = now(),
        score = v_score
    WHERE id = p_session_id;

    PERFORM core.award_points(
        v_user_id,
        v_score,
        'test_completed',
        'test_session',
        p_session_id
    );

    RETURN jsonb_build_object('score', v_score, 'total_questions', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, rubric, practice, core, events
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    result jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT jsonb_build_object(
        'total_points', coalesce(u.total_points, 0),
        'tests_completed', (
            SELECT count(*)::int
            FROM testbank.test_sessions ts
            WHERE ts.user_id = v_user_id AND ts.completed_at IS NOT NULL
        ),
        'avg_test_pct', (
            SELECT round(avg(
                CASE
                    WHEN ts.total_questions > 0
                    THEN (coalesce(ts.score, 0)::numeric / ts.total_questions) * 100
                    ELSE NULL
                END
            ))::int
            FROM testbank.test_sessions ts
            WHERE ts.user_id = v_user_id
              AND ts.completed_at IS NOT NULL
              AND ts.total_questions > 0
        ),
        'roleplays_submitted', (
            SELECT count(*)::int
            FROM rubric.submissions s
            WHERE s.user_id = v_user_id
        ),
        'roleplays_graded', (
            SELECT count(*)::int
            FROM rubric.submissions s
            WHERE s.user_id = v_user_id AND s.status = 'reviewed'
        ),
        'total_pi_count', (SELECT count(*)::int FROM practice.performance_indicators),
        'event_pi_count', coalesce((
            SELECT count(*)::int
            FROM events.event_performance_indicators epi
            JOIN events.events ev ON ev.id = epi.event_id
            WHERE ev.event_code = u.event_code
        ), 0),
        'event_pis_studied', coalesce((
            SELECT count(DISTINCT epi.pi_id)::int
            FROM events.event_performance_indicators epi
            JOIN events.events ev ON ev.id = epi.event_id
            WHERE ev.event_code = u.event_code
              AND EXISTS (
                  SELECT 1
                  FROM core.pi_performance pp
                  WHERE pp.user_id = v_user_id
                    AND pp.pi_id = epi.pi_id
                    AND pp.total_attempts > 0
              )
        ), 0),
        'weak_pis', coalesce((
            SELECT jsonb_agg(row_to_json(w) ORDER BY w.accuracy ASC NULLS FIRST)
            FROM (
                SELECT pi.id, pi.pi_code, pi.indicator_text,
                       pp.total_attempts,
                       pp.correct_count,
                       round((pp.correct_count::numeric / NULLIF(pp.total_attempts, 0)) * 100, 1) AS accuracy
                FROM core.pi_performance pp
                JOIN practice.performance_indicators pi ON pi.id = pp.pi_id
                WHERE pp.user_id = v_user_id
                  AND pp.source = 'test'
                  AND pp.total_attempts >= 3
                  AND pp.correct_count::float / NULLIF(pp.total_attempts, 0) < 0.7
                ORDER BY pp.correct_count::float / NULLIF(pp.total_attempts, 0) ASC
                LIMIT 6
            ) w
        ), '[]'::jsonb),
        'recent_sessions', coalesce((
            SELECT jsonb_agg(row_to_json(rs) ORDER BY rs.started_at DESC)
            FROM (
                SELECT ts.id, ts.session_type,
                       coalesce(e.title, ts.config->>'label') AS title,
                       ts.score, ts.total_questions, ts.completed_at, ts.started_at
                FROM testbank.test_sessions ts
                LEFT JOIN testbank.exams e ON e.id = ts.exam_id
                WHERE ts.user_id = v_user_id
                ORDER BY ts.started_at DESC
                LIMIT 8
            ) rs
        ), '[]'::jsonb)
    )
    INTO result
    FROM core.users u
    WHERE u.id = v_user_id;

    RETURN coalesce(result, '{}'::jsonb);
END;
$$;
