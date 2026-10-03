-- Tab-leave tracking for tests, faster PI list, richer admin + dashboard stats.

CREATE TABLE IF NOT EXISTS core.session_focus_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    session_id  uuid REFERENCES testbank.test_sessions(id) ON DELETE CASCADE,
    event_type  text NOT NULL CHECK (event_type IN ('blur', 'hidden')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_focus_events_user_idx
    ON core.session_focus_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS session_focus_events_session_idx
    ON core.session_focus_events (session_id, created_at DESC);

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

    INSERT INTO core.session_focus_events (user_id, session_id, event_type)
    VALUES (v_user_id, p_session_id, p_event_type);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_performance_indicators(
    p_search text DEFAULT NULL,
    p_ia_code text DEFAULT NULL,
    p_cluster_slug text DEFAULT NULL,
    p_limit int DEFAULT 48,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    pi_code text,
    indicator_text text,
    instructional_area_code text,
    instructional_area_name text,
    cluster_slug text,
    cluster_name text,
    question_count int,
    roleplay_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, practice, testbank, events
AS $$
    WITH question_counts AS (
        SELECT q.pi_id, count(*)::int AS cnt
        FROM testbank.questions q
        WHERE q.pi_id IS NOT NULL
        GROUP BY q.pi_id
    ),
    roleplay_counts AS (
        SELECT l.pi_id, count(DISTINCT (l.event_id::text || ':' || l.year::text))::int AS cnt
        FROM practice.pi_roleplay_links l
        GROUP BY l.pi_id
    )
    SELECT
        pi.id,
        pi.pi_code,
        pi.indicator_text,
        coalesce(ia.code, split_part(pi.pi_code, ':', 1)) AS instructional_area_code,
        ia.name AS instructional_area_name,
        NULL::text AS cluster_slug,
        NULL::text AS cluster_name,
        coalesce(qc.cnt, 0)::int AS question_count,
        coalesce(rc.cnt, 0)::int AS roleplay_count
    FROM practice.performance_indicators pi
    LEFT JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
    LEFT JOIN question_counts qc ON qc.pi_id = pi.id
    LEFT JOIN roleplay_counts rc ON rc.pi_id = pi.id
    WHERE (p_search IS NULL OR btrim(p_search) = '' OR
           pi.pi_code ILIKE '%' || p_search || '%' OR
           pi.indicator_text ILIKE '%' || p_search || '%')
      AND (
          p_ia_code IS NULL OR btrim(p_ia_code) = '' OR
          ia.code = upper(p_ia_code) OR
          split_part(pi.pi_code, ':', 1) = upper(p_ia_code)
      )
      AND (
          p_cluster_slug IS NULL OR btrim(p_cluster_slug) = '' OR
          EXISTS (
              SELECT 1
              FROM testbank.questions q
              JOIN testbank.exam_questions eq ON eq.question_id = q.id
              JOIN testbank.exams e ON e.id = eq.exam_id
              JOIN practice.clusters cl ON cl.id = e.cluster_id
              WHERE q.pi_id = pi.id AND cl.slug = p_cluster_slug
          ) OR
          EXISTS (
              SELECT 1
              FROM practice.pi_roleplay_links l
              JOIN events.events ev ON ev.id = l.event_id
              JOIN practice.clusters cl ON cl.id = ev.cluster_id
              WHERE l.pi_id = pi.id AND cl.slug = p_cluster_slug
          )
      )
    ORDER BY pi.pi_code
    LIMIT greatest(coalesce(p_limit, 48), 1)
    OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.search_pis_for_test(
    p_search text DEFAULT NULL,
    p_limit int DEFAULT 40
)
RETURNS TABLE (
    id uuid,
    pi_code text,
    indicator_text text,
    question_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, practice, testbank
AS $$
    SELECT
        pi.id,
        pi.pi_code,
        pi.indicator_text,
        count(q.id)::int AS question_count
    FROM practice.performance_indicators pi
    JOIN testbank.questions q ON q.pi_id = pi.id
    WHERE p_search IS NULL OR btrim(p_search) = '' OR
          pi.pi_code ILIKE '%' || p_search || '%' OR
          pi.indicator_text ILIKE '%' || p_search || '%'
    GROUP BY pi.id, pi.pi_code, pi.indicator_text
    ORDER BY pi.pi_code
    LIMIT greatest(coalesce(p_limit, 40), 1);
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, rubric, practice, core
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
    LEFT JOIN LATERAL (
        SELECT
            count(*) FILTER (WHERE completed_at IS NOT NULL)::int AS tests_completed,
            round(avg(
                CASE WHEN total_questions > 0 AND score IS NOT NULL
                     THEN (score::numeric / total_questions) * 100
                END
            ), 1) AS avg_test_pct,
            max(completed_at) AS last_test_at
        FROM testbank.test_sessions
        WHERE user_id = u.id
    ) ts ON true
    LEFT JOIN LATERAL (
        SELECT
            count(*)::int AS submitted,
            count(*) FILTER (WHERE status = 'reviewed')::int AS graded,
            round(avg(
                CASE WHEN status = 'reviewed' AND grading_data IS NOT NULL
                     THEN (grading_data->>'total_score')::numeric
                END
            ), 1) AS avg_roleplay_score,
            max(submitted_at) AS last_roleplay_at
        FROM rubric.submissions
        WHERE user_id = u.id
    ) rp ON true
    LEFT JOIN LATERAL (
        SELECT count(*)::bigint AS blur_count
        FROM core.session_focus_events e
        WHERE e.user_id = u.id
    ) tab ON true
    ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core, rubric, testbank
AS $$
DECLARE
    v_role text;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can view admin overview';
    END IF;

    RETURN jsonb_build_object(
        'student_count', (SELECT count(*)::int FROM core.users WHERE role = 'student'),
        'pending_submissions', (
            SELECT count(*)::int FROM rubric.submissions WHERE status IN ('submitted', 'under_review')
        ),
        'tests_this_week', (
            SELECT count(*)::int FROM testbank.test_sessions
            WHERE started_at >= now() - interval '7 days'
        ),
        'tests_completed_total', (
            SELECT count(*)::int FROM testbank.test_sessions WHERE completed_at IS NOT NULL
        ),
        'roleplays_submitted_total', (
            SELECT count(*)::int FROM rubric.submissions
        ),
        'roleplays_graded_total', (
            SELECT count(*)::int FROM rubric.submissions WHERE status = 'reviewed'
        ),
        'tab_blur_events_total', (
            SELECT count(*)::int FROM core.session_focus_events
        ),
        'announcements', coalesce((
            SELECT jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC)
            FROM (
                SELECT id, message, visible_to, created_at, expires_at
                FROM core.announcements
                ORDER BY created_at DESC
                LIMIT 10
            ) a
        ), '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_session_tab_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_pis_for_test(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chapter_activity() TO authenticated;
