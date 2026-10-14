-- Officers/advisors can open a member's completed test to see tab leaves
-- together with answers. Members still only see their own sessions.

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
        'questions', (
            SELECT coalesce(jsonb_agg(q ORDER BY (q->>'display_order')::int), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'id', qu.id,
                    'display_order', sq.display_order,
                    'question_text', qu.question_text,
                    'pi_id', pi.id,
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
                FROM (
                    SELECT eq.question_id, eq.display_order
                    FROM testbank.exam_questions eq
                    WHERE v_session.exam_id IS NOT NULL AND eq.exam_id = v_session.exam_id
                    UNION ALL
                    SELECT (value::text)::uuid AS question_id, ordinality::int AS display_order
                    FROM jsonb_array_elements_text(coalesce(v_config->'question_ids', '[]'::jsonb))
                    WITH ORDINALITY AS t(value, ordinality)
                    WHERE v_session.exam_id IS NULL
                ) sq
                JOIN testbank.questions qu ON qu.id = sq.question_id
                LEFT JOIN practice.performance_indicators pi ON pi.id = qu.pi_id
                LEFT JOIN testbank.test_answers ta
                    ON ta.session_id = v_session.id AND ta.question_id = qu.id
            ) questions
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_session(uuid) TO authenticated;
