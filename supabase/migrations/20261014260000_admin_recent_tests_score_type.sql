-- list_chapter_test_tab_leaves failed with "structure of query does not match
-- function result type" because testbank.test_sessions.score is numeric, not int.
-- That emptied the Admin Recent tests table even after a completed exam.

DROP FUNCTION IF EXISTS public.list_chapter_test_tab_leaves();

CREATE OR REPLACE FUNCTION public.list_chapter_test_tab_leaves()
RETURNS TABLE (
    session_id uuid,
    user_id uuid,
    first_name text,
    last_name text,
    email text,
    exam_title text,
    exam_code text,
    score numeric,
    total_questions int,
    completed_at timestamptz,
    tab_leave_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, testbank, practice
AS $$
    SELECT
        ts.id,
        ts.user_id,
        u.first_name,
        u.last_name,
        u.email,
        coalesce(
            e.title,
            ts.config->>'label',
            initcap(replace(ts.session_type, '_', ' '))
        )::text,
        e.exam_code,
        ts.score,
        ts.total_questions,
        ts.completed_at,
        core.count_session_tab_leaves(ts.id)
    FROM testbank.test_sessions ts
    JOIN core.users u ON u.id = ts.user_id
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    WHERE ts.completed_at IS NOT NULL
      AND public.get_my_role() IN ('officer', 'advisor')
    ORDER BY ts.completed_at DESC
    LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.list_chapter_test_tab_leaves() TO authenticated;
