-- Timeline of every finished practice test for chapter admins.

CREATE OR REPLACE FUNCTION public.list_chapter_submitted_tests()
RETURNS TABLE (
    session_id uuid,
    user_id uuid,
    first_name text,
    last_name text,
    username text,
    grade_level int,
    event_code text,
    exam_title text,
    exam_code text,
    session_type text,
    score numeric,
    total_questions int,
    started_at timestamptz,
    completed_at timestamptz,
    tab_leave_count bigint,
    leave_questions int[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, testbank
AS $$
    SELECT
        ts.id,
        ts.user_id,
        u.first_name,
        u.last_name,
        u.username,
        u.grade_level,
        u.event_code,
        coalesce(
            e.title,
            ts.config->>'label',
            initcap(replace(ts.session_type, '_', ' '))
        )::text,
        e.exam_code,
        ts.session_type,
        ts.score,
        ts.total_questions,
        ts.started_at,
        ts.completed_at,
        core.count_session_tab_leaves(ts.id),
        coalesce((
            SELECT array_agg(sfe.question_number ORDER BY sfe.created_at)
            FROM core.session_focus_events sfe
            WHERE sfe.session_id = ts.id
              AND sfe.question_number IS NOT NULL
        ), ARRAY[]::int[])
    FROM testbank.test_sessions ts
    JOIN core.users u ON u.id = ts.user_id
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    WHERE ts.completed_at IS NOT NULL
      AND public.get_my_role() IN ('officer', 'advisor')
    ORDER BY ts.completed_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_chapter_submitted_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_chapter_submitted_tests() TO authenticated;

NOTIFY pgrst, 'reload schema';
