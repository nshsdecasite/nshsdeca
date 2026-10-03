-- Speed up the hot paths: flashcard setup, PI browser counts, admin activity, and dashboard lookups.

CREATE INDEX IF NOT EXISTS test_sessions_user_started_idx
    ON testbank.test_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS submissions_user_submitted_idx
    ON rubric.submissions (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS pi_performance_user_source_idx
    ON core.pi_performance (user_id, source);

CREATE INDEX IF NOT EXISTS flashcards_set_pi_idx
    ON content.flashcards (set_id, pi_id);

CREATE INDEX IF NOT EXISTS flashcard_progress_user_card_idx
    ON content.user_flashcard_progress (user_id, flashcard_id);

CREATE OR REPLACE FUNCTION public.ensure_pi_flashcard_sets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, content, practice
AS $$
BEGIN
    -- Already built for every PI. Skip the per-area loop.
    IF NOT EXISTS (
        SELECT 1
        FROM practice.performance_indicators pi
        JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM content.flashcards fc
            JOIN content.flashcard_sets fs ON fs.id = fc.set_id
            WHERE fs.set_type = 'pi'
              AND fc.pi_id = pi.id
              AND fs.title = ia.code || ' — ' || ia.name
        )
    ) THEN
        RETURN;
    END IF;

    INSERT INTO content.flashcard_sets (title, set_type, instructional_area_id)
    SELECT ia.code || ' — ' || ia.name, 'pi', ia.id
    FROM practice.instructional_areas ia
    WHERE EXISTS (
        SELECT 1
        FROM practice.performance_indicators pi
        WHERE pi.instructional_area_id = ia.id
    )
    AND NOT EXISTS (
        SELECT 1
        FROM content.flashcard_sets fs
        WHERE fs.set_type = 'pi'
          AND fs.title = ia.code || ' — ' || ia.name
    );

    INSERT INTO content.flashcards (set_id, front_text, back_text, pi_id)
    SELECT fs.id, pi.pi_code, pi.indicator_text, pi.id
    FROM practice.performance_indicators pi
    JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
    JOIN content.flashcard_sets fs
      ON fs.set_type = 'pi'
     AND fs.title = ia.code || ' — ' || ia.name
    WHERE NOT EXISTS (
        SELECT 1
        FROM content.flashcards fc
        WHERE fc.set_id = fs.id AND fc.pi_id = pi.id
    );
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
    WITH matched AS (
        SELECT
            pi.id,
            pi.pi_code,
            pi.indicator_text,
            coalesce(ia.code, split_part(pi.pi_code, ':', 1)) AS instructional_area_code,
            ia.name AS instructional_area_name
        FROM practice.performance_indicators pi
        LEFT JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
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
        OFFSET greatest(coalesce(p_offset, 0), 0)
    )
    SELECT
        m.id,
        m.pi_code,
        m.indicator_text,
        m.instructional_area_code,
        m.instructional_area_name,
        NULL::text AS cluster_slug,
        NULL::text AS cluster_name,
        coalesce((
            SELECT count(*)::int
            FROM testbank.questions q
            WHERE q.pi_id = m.id
        ), 0) AS question_count,
        coalesce((
            SELECT count(DISTINCT (l.event_id::text || ':' || l.year::text))::int
            FROM practice.pi_roleplay_links l
            WHERE l.pi_id = m.id
        ), 0) AS roleplay_count
    FROM matched m
    ORDER BY m.pi_code;
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
    WITH matched AS (
        SELECT pi.id, pi.pi_code, pi.indicator_text
        FROM practice.performance_indicators pi
        WHERE EXISTS (
            SELECT 1 FROM testbank.questions q WHERE q.pi_id = pi.id
        )
          AND (
              p_search IS NULL OR btrim(p_search) = '' OR
              pi.pi_code ILIKE '%' || p_search || '%' OR
              pi.indicator_text ILIKE '%' || p_search || '%'
          )
        ORDER BY pi.pi_code
        LIMIT greatest(coalesce(p_limit, 40), 1)
    )
    SELECT
        m.id,
        m.pi_code,
        m.indicator_text,
        coalesce((
            SELECT count(*)::int FROM testbank.questions q WHERE q.pi_id = m.id
        ), 0) AS question_count
    FROM matched m
    ORDER BY m.pi_code;
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
        SELECT user_id, count(*)::bigint AS blur_count
        FROM core.session_focus_events
        GROUP BY user_id
    ) tab ON tab.user_id = u.id
    ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST;
$$;
