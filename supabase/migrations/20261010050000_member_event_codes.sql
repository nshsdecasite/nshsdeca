-- Stores each member's competitive event so roleplays and study can open on it.

ALTER TABLE core.users
  ADD COLUMN IF NOT EXISTS event_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_event_code_fkey'
      AND conrelid = 'core.users'::regclass
  ) THEN
    ALTER TABLE core.users
      ADD CONSTRAINT users_event_code_fkey
      FOREIGN KEY (event_code) REFERENCES events.events (event_code);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, events, practice
AS $$
    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'email', u.email,
        'grade_level', u.grade_level,
        'role', u.role,
        'total_points', coalesce(u.total_points, 0),
        'avatar_url', u.avatar_url,
        'is_public_on_leaderboard', coalesce(u.is_public_on_leaderboard, true),
        'chapter_name', ch.chapter_name,
        'school_name', ch.school_name,
        'event_code', u.event_code,
        'event_name', ev.event_name,
        'cluster_slug', cl.slug,
        'cluster_name', cl.name,
        'event_pi_count', coalesce((
            SELECT count(*)::int
            FROM events.event_performance_indicators epi
            WHERE epi.event_id = ev.id
        ), 0)
    )
    FROM core.users u
    LEFT JOIN core.chapters ch ON ch.id = u.chapter_id
    LEFT JOIN events.events ev ON ev.event_code = u.event_code
    LEFT JOIN practice.clusters cl ON cl.id = ev.cluster_id
    WHERE u.id = auth.uid();
$$;

DROP FUNCTION IF EXISTS public.register_core_user(uuid, text, text, text, integer, text, text, text);

CREATE FUNCTION public.register_core_user(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_grade_level int,
  p_school_name text,
  p_chapter_name text,
  p_state text,
  p_event_code text DEFAULT NULL,
  p_role text DEFAULT 'student'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, events
AS $$
DECLARE
  v_chapter_id uuid;
  v_event text := nullif(upper(btrim(coalesce(p_event_code, ''))), '');
  v_role text := 'student';
BEGIN
  IF v_event IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM events.events WHERE event_code = v_event
  ) THEN
    RAISE EXCEPTION 'Unknown event code %', v_event;
  END IF;

  IF coalesce(auth.role(), '') = 'service_role'
     AND p_role IN ('student', 'officer', 'advisor') THEN
    v_role := p_role;
  END IF;

  SELECT id INTO v_chapter_id FROM core.chapters
  WHERE school_name = p_school_name AND chapter_name = p_chapter_name
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    INSERT INTO core.chapters (school_name, chapter_name, state)
    VALUES (p_school_name, p_chapter_name, p_state)
    RETURNING id INTO v_chapter_id;
  END IF;

  INSERT INTO core.users (
    id, first_name, last_name, email, password_hash, role, grade_level, chapter_id, event_code
  )
  VALUES (
    p_user_id, p_first_name, p_last_name, p_email, 'supabase_auth', v_role, p_grade_level, v_chapter_id, v_event
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    grade_level = EXCLUDED.grade_level,
    chapter_id = EXCLUDED.chapter_id,
    event_code = EXCLUDED.event_code,
    role = EXCLUDED.role;
END;
$$;

REVOKE ALL ON FUNCTION public.register_core_user(uuid, text, text, text, integer, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_core_user(uuid, text, text, text, integer, text, text, text, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.list_performance_indicators(text, text, text, integer, integer);

CREATE FUNCTION public.list_performance_indicators(
    p_search text DEFAULT NULL,
    p_ia_code text DEFAULT NULL,
    p_cluster_slug text DEFAULT NULL,
    p_limit int DEFAULT 48,
    p_offset int DEFAULT 0,
    p_event_code text DEFAULT NULL
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
          AND (
              p_event_code IS NULL OR btrim(p_event_code) = '' OR
              EXISTS (
                  SELECT 1
                  FROM events.event_performance_indicators epi
                  JOIN events.events ev ON ev.id = epi.event_id
                  WHERE epi.pi_id = pi.id AND ev.event_code = upper(btrim(p_event_code))
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

GRANT EXECUTE ON FUNCTION public.list_performance_indicators(text, text, text, integer, integer, text) TO PUBLIC, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
