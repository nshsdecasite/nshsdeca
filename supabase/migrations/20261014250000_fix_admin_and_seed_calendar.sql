-- Admin Recent tests was crashing (RETURNS TABLE names collided with SELECT
-- columns). Seed the four season events so signed-in / officer calendars match
-- the public Events tab.

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
BEGIN
    IF public.get_my_role() NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can view test tab leaves';
    END IF;

    RETURN QUERY
    SELECT
        listed.session_id,
        listed.member_id,
        listed.member_first_name,
        listed.member_last_name,
        listed.member_email,
        listed.exam_title,
        listed.exam_code,
        listed.score,
        listed.total_questions,
        listed.completed_at,
        listed.tab_leave_count
    FROM (
        SELECT
            ts.id AS session_id,
            ts.user_id AS member_id,
            u.first_name AS member_first_name,
            u.last_name AS member_last_name,
            u.email AS member_email,
            coalesce(
                e.title,
                ts.config->>'label',
                initcap(replace(ts.session_type, '_', ' '))
            )::text AS exam_title,
            e.exam_code,
            ts.score,
            ts.total_questions,
            ts.completed_at,
            core.count_session_tab_leaves(ts.id) AS tab_leave_count
        FROM testbank.test_sessions ts
        JOIN core.users u ON u.id = ts.user_id
        LEFT JOIN testbank.exams e ON e.id = ts.exam_id
        WHERE ts.completed_at IS NOT NULL
        ORDER BY ts.completed_at DESC
        LIMIT 50
    ) listed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_chapter_test_tab_leaves() TO authenticated;

INSERT INTO core.chapter_events (title, detail, location, starts_at, ends_at)
SELECT v.title, v.detail, v.location, v.starts_at, v.ends_at
FROM (
    VALUES
        (
            'DECA Day',
            'Statewide chapter celebration and membership drive',
            NULL::text,
            timestamptz '2026-10-26 08:00:00-05',
            NULL::timestamptz
        ),
        (
            'District 11 Career Development Conference',
            'District competition · all prepared events',
            NULL::text,
            timestamptz '2026-12-09 08:00:00-06',
            timestamptz '2026-12-10 17:00:00-06'
        ),
        (
            'Texas CDC — State Career Development Conference',
            'State qualifiers only · three-day conference',
            NULL::text,
            timestamptz '2027-02-25 08:00:00-06',
            timestamptz '2027-02-27 17:00:00-06'
        ),
        (
            'ICDC — International Career Development Conference',
            'International qualifiers only',
            NULL::text,
            timestamptz '2027-04-17 08:00:00-05',
            timestamptz '2027-04-20 17:00:00-05'
        )
) AS v(title, detail, location, starts_at, ends_at)
WHERE NOT EXISTS (
    SELECT 1 FROM core.chapter_events e WHERE e.title = v.title
);
