-- Dashboard stat card counts questions on finished tests.

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
        'questions_completed', (
            SELECT coalesce(sum(ts.total_questions), 0)::int
            FROM testbank.test_sessions ts
            WHERE ts.user_id = v_user_id
              AND ts.completed_at IS NOT NULL
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
