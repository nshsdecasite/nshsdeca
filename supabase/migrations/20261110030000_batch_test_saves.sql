-- One answer-save round trip per batch, and one set-based read when a test opens.
-- Per-click saves plus a per-question choice subquery were exhausting the database
-- when a class started an exam together.

DELETE FROM testbank.test_answers a
WHERE a.id IN (
    SELECT id
    FROM (
        SELECT
            id,
            row_number() OVER (PARTITION BY session_id, question_id ORDER BY id) AS rn
        FROM testbank.test_answers
    ) ranked
    WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS test_answers_session_question_uidx
    ON testbank.test_answers (session_id, question_id);

CREATE OR REPLACE FUNCTION public.save_test_answers(
    p_session_id uuid,
    p_answers jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank, practice, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    rec record;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_answers IS NULL
        OR jsonb_typeof(p_answers) <> 'array'
        OR jsonb_array_length(p_answers) = 0 THEN
        RETURN;
    END IF;

    IF jsonb_array_length(p_answers) > 100 THEN
        RAISE EXCEPTION 'Too many answers in one save';
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

    FOR rec IN
        WITH parsed AS (
            SELECT
                (item->>'question_id')::uuid AS question_id,
                (item->>'choice_id')::uuid AS choice_id,
                ordinality
            FROM jsonb_array_elements(p_answers) WITH ORDINALITY AS t(item, ordinality)
            WHERE coalesce(item->>'question_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              AND coalesce(item->>'choice_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ),
        incoming AS (
            SELECT DISTINCT ON (question_id) question_id, choice_id
            FROM parsed
            ORDER BY question_id, ordinality DESC
        ),
        session_questions AS (
            SELECT eq.question_id
            FROM testbank.test_sessions ts
            JOIN testbank.exam_questions eq ON eq.exam_id = ts.exam_id
            WHERE ts.id = p_session_id
              AND ts.exam_id IS NOT NULL
            UNION
            SELECT (q.value)::uuid AS question_id
            FROM testbank.test_sessions ts
            CROSS JOIN LATERAL jsonb_array_elements_text(
                coalesce(ts.config->'question_ids', '[]'::jsonb)
            ) AS q(value)
            WHERE ts.id = p_session_id
              AND ts.exam_id IS NULL
        )
        SELECT
            i.question_id,
            i.choice_id,
            qc.is_correct,
            qn.pi_id
        FROM incoming i
        JOIN session_questions sq ON sq.question_id = i.question_id
        JOIN testbank.question_choices qc
            ON qc.id = i.choice_id
           AND qc.question_id = i.question_id
        JOIN testbank.questions qn ON qn.id = i.question_id
        LEFT JOIN testbank.test_answers ta
            ON ta.session_id = p_session_id
           AND ta.question_id = i.question_id
        WHERE ta.chosen_choice_id IS DISTINCT FROM i.choice_id
    LOOP
        INSERT INTO testbank.test_answers (
            session_id, question_id, chosen_choice_id, is_correct
        )
        VALUES (p_session_id, rec.question_id, rec.choice_id, rec.is_correct)
        ON CONFLICT (session_id, question_id) DO UPDATE
        SET chosen_choice_id = EXCLUDED.chosen_choice_id,
            is_correct = EXCLUDED.is_correct;

        PERFORM core.upsert_pi_performance(
            v_user_id,
            rec.pi_id,
            'test',
            coalesce(rec.is_correct, false)
        );
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.save_test_answers(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_test_answers(uuid, jsonb) TO authenticated;

-- Same payload as before. Choices are aggregated once per question set
-- instead of a correlated subquery for every question.
CREATE OR REPLACE FUNCTION public.get_test_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_session record;
    v_completed boolean;
    v_config jsonb;
    v_role text;
    v_questions jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();

    SELECT ts.*, e.exam_code, e.title AS exam_title, e.year AS exam_year, c.name AS cluster_name
    INTO v_session
    FROM testbank.test_sessions ts
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    WHERE ts.id = p_session_id
      AND (
        ts.user_id = v_user_id
        OR v_role IN ('officer', 'advisor')
      );

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_completed := v_session.completed_at IS NOT NULL;
    v_config := coalesce(v_session.config, '{}'::jsonb);

    WITH sq AS (
        SELECT eq.question_id, eq.display_order
        FROM testbank.exam_questions eq
        WHERE v_session.exam_id IS NOT NULL
          AND eq.exam_id = v_session.exam_id
        UNION ALL
        SELECT (value::text)::uuid AS question_id, ordinality::int AS display_order
        FROM jsonb_array_elements_text(coalesce(v_config->'question_ids', '[]'::jsonb))
            WITH ORDINALITY AS t(value, ordinality)
        WHERE v_session.exam_id IS NULL
    ),
    choice_agg AS (
        SELECT
            qc.question_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', qc.id,
                    'label', qc.choice_label,
                    'text', qc.choice_text,
                    'is_correct', CASE WHEN v_completed THEN qc.is_correct ELSE NULL END
                )
                ORDER BY qc.display_order
            ) AS choices
        FROM testbank.question_choices qc
        WHERE qc.question_id IN (SELECT question_id FROM sq)
        GROUP BY qc.question_id
    )
    SELECT coalesce(jsonb_agg(
        jsonb_build_object(
            'id', qu.id,
            'display_order', sq.display_order,
            'question_text', qu.question_text,
            'pi_id', pi.id,
            'pi_code', pi.pi_code,
            'rationale', CASE WHEN v_completed THEN qu.rationale ELSE NULL END,
            'choices', coalesce(ca.choices, '[]'::jsonb),
            'chosen_choice_id', ta.chosen_choice_id,
            'is_correct', ta.is_correct
        )
        ORDER BY sq.display_order
    ), '[]'::jsonb)
    INTO v_questions
    FROM sq
    JOIN testbank.questions qu ON qu.id = sq.question_id
    LEFT JOIN practice.performance_indicators pi ON pi.id = qu.pi_id
    LEFT JOIN choice_agg ca ON ca.question_id = qu.id
    LEFT JOIN testbank.test_answers ta
        ON ta.session_id = v_session.id
       AND ta.question_id = qu.id;

    RETURN jsonb_build_object(
        'id', v_session.id,
        'session_type', v_session.session_type,
        'exam_id', v_session.exam_id,
        'exam_code', v_session.exam_code,
        'exam_title', coalesce(v_session.exam_title, v_config->>'label', initcap(replace(v_session.session_type, '_', ' '))),
        'exam_year', v_session.exam_year,
        'cluster_name', v_session.cluster_name,
        'started_at', v_session.started_at,
        'completed_at', v_session.completed_at,
        'score', v_session.score,
        'total_questions', v_session.total_questions,
        'timed', coalesce((v_config->>'timed')::boolean, false),
        'time_limit_seconds', CASE
            WHEN coalesce((v_config->>'timed')::boolean, false)
            THEN (v_config->>'time_limit_seconds')::int
            ELSE NULL
        END,
        'tab_leave_count', core.count_session_tab_leaves(v_session.id),
        'questions', v_questions
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_session(uuid) TO authenticated;
