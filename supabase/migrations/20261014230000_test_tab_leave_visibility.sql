-- Tab-leave grants/RLS, per-session counts on test RPCs, and officer recent-test list.

GRANT SELECT, INSERT ON TABLE core.session_focus_events TO authenticated;

ALTER TABLE core.session_focus_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_focus_events_select ON core.session_focus_events;
DROP POLICY IF EXISTS session_focus_select_visible ON core.session_focus_events;
CREATE POLICY session_focus_events_select ON core.session_focus_events
    FOR SELECT TO authenticated
    USING (
        user_id = (select auth.uid())
        OR core.current_user_role() IN ('officer', 'advisor')
    );

DROP POLICY IF EXISTS session_focus_events_insert ON core.session_focus_events;
DROP POLICY IF EXISTS session_focus_insert_own ON core.session_focus_events;
CREATE POLICY session_focus_events_insert ON core.session_focus_events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION core.count_session_tab_leaves(p_session_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core
AS $$
    SELECT coalesce((
        SELECT count(*)::bigint
        FROM (
            SELECT
                sfe.created_at - lag(sfe.created_at) OVER (
                    ORDER BY sfe.created_at, sfe.id
                ) AS gap
            FROM core.session_focus_events sfe
            WHERE sfe.session_id = p_session_id
        ) g
        WHERE g.gap IS NULL OR g.gap > interval '1 second'
    ), 0);
$$;

REVOKE ALL ON FUNCTION core.count_session_tab_leaves(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.record_session_tab_event(
    p_session_id uuid,
    p_event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core, testbank
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_event_type NOT IN ('blur', 'hidden') THEN
        RAISE EXCEPTION 'Invalid event type';
    END IF;

    IF p_session_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM testbank.test_sessions ts
        WHERE ts.id = p_session_id AND ts.user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM core.session_focus_events sfe
        WHERE sfe.user_id = v_user_id
          AND sfe.session_id IS NOT DISTINCT FROM p_session_id
          AND sfe.created_at > now() - interval '1 second'
    ) THEN
        RETURN;
    END IF;

    INSERT INTO core.session_focus_events (user_id, session_id, event_type)
    VALUES (v_user_id, p_session_id, p_event_type);
END;
$$;

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

DROP FUNCTION IF EXISTS public.list_my_test_sessions();

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
    total_questions int,
    tab_leave_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice, core
AS $$
    SELECT
        ts.id,
        ts.session_type,
        e.exam_code,
        coalesce(e.title, ts.config->>'label', initcap(replace(ts.session_type, '_', ' '))) AS exam_title,
        e.year AS exam_year,
        c.name AS cluster_name,
        ts.started_at,
        ts.completed_at,
        ts.score,
        ts.total_questions,
        core.count_session_tab_leaves(ts.id) AS tab_leave_count
    FROM testbank.test_sessions ts
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    WHERE ts.user_id = auth.uid()
    ORDER BY ts.started_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_chapter_activity()
RETURNS TABLE (
    user_id uuid,
    first_name text,
    last_name text,
    email text,
    grade_level int,
    role text,
    total_points int,
    tests_completed int,
    roleplays_submitted int,
    roleplays_graded int,
    avg_test_pct numeric,
    avg_roleplay_score numeric,
    tab_blur_count bigint,
    last_test_at timestamptz,
    last_roleplay_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, testbank, rubric
AS $$
    SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.grade_level,
        u.role,
        coalesce(u.total_points, 0)::int,
        coalesce(ts.tests_completed, 0)::int,
        coalesce(rp.submitted, 0)::int,
        coalesce(rp.graded, 0)::int,
        ts.avg_test_pct,
        rp.avg_roleplay_score,
        coalesce(tab.blur_count, 0)::bigint,
        ts.last_test_at,
        rp.last_roleplay_at
    FROM core.users u
    LEFT JOIN (
        SELECT
            user_id,
            count(*) FILTER (WHERE completed_at IS NOT NULL)::int AS tests_completed,
            round(avg(
                CASE WHEN total_questions > 0 AND score IS NOT NULL
                     THEN (score::numeric / total_questions) * 100
                END
            ), 1) AS avg_test_pct,
            max(completed_at) AS last_test_at
        FROM testbank.test_sessions
        GROUP BY user_id
    ) ts ON ts.user_id = u.id
    LEFT JOIN (
        SELECT
            user_id,
            count(*)::int AS submitted,
            count(*) FILTER (WHERE status = 'reviewed')::int AS graded,
            round(avg(
                CASE WHEN status = 'reviewed' AND grading_data IS NOT NULL
                     THEN (grading_data->>'total_score')::numeric
                END
            ), 1) AS avg_roleplay_score,
            max(submitted_at) AS last_roleplay_at
        FROM rubric.submissions
        GROUP BY user_id
    ) rp ON rp.user_id = u.id
    LEFT JOIN (
        SELECT g.user_id, count(*)::bigint AS blur_count
        FROM (
            SELECT
                sfe.user_id,
                sfe.created_at - lag(sfe.created_at) OVER (
                    PARTITION BY sfe.user_id, sfe.session_id
                    ORDER BY sfe.created_at, sfe.id
                ) AS gap
            FROM core.session_focus_events sfe
        ) g
        WHERE g.gap IS NULL OR g.gap > interval '1 second'
        GROUP BY g.user_id
    ) tab ON tab.user_id = u.id
    ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.list_chapter_test_tab_leaves()
RETURNS TABLE (
    session_id uuid,
    user_id uuid,
    first_name text,
    last_name text,
    email text,
    exam_title text,
    exam_code text,
    score int,
    total_questions int,
    completed_at timestamptz,
    tab_leave_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core, testbank, practice
AS $$
DECLARE
    v_role text;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can view test tab leaves';
    END IF;

    RETURN QUERY
    SELECT
        ts.id,
        ts.user_id,
        u.first_name,
        u.last_name,
        u.email,
        coalesce(e.title, ts.config->>'label', initcap(replace(ts.session_type, '_', ' '))),
        e.exam_code,
        ts.score,
        ts.total_questions,
        ts.completed_at,
        core.count_session_tab_leaves(ts.id)
    FROM testbank.test_sessions ts
    JOIN core.users u ON u.id = ts.user_id
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    WHERE ts.completed_at IS NOT NULL
    ORDER BY ts.completed_at DESC
    LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.record_session_tab_event(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_test_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_test_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_chapter_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_chapter_test_tab_leaves() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_session_tab_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_test_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chapter_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chapter_test_tab_leaves() TO authenticated;

NOTIFY pgrst, 'reload schema';
