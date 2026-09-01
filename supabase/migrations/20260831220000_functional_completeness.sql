-- Timed tests, weekly leaderboard, PI heatmap, chapter roster, richer search.

-- ---------------------------------------------------------------------------
-- Test timing: store on session.config, expose via get_test_session
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.configure_test_session_timing(
    p_session_id uuid,
    p_timed boolean,
    p_time_limit_seconds int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_seconds int;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_seconds := CASE
        WHEN coalesce(p_timed, false) THEN greatest(coalesce(p_time_limit_seconds, 60), 30)
        ELSE NULL
    END;

    UPDATE testbank.test_sessions
    SET config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
        'timed', coalesce(p_timed, false),
        'time_limit_seconds', v_seconds
    )
    WHERE id = p_session_id
      AND user_id = v_user_id
      AND completed_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or already completed';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_test_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice
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

-- ---------------------------------------------------------------------------
-- Weekly leaderboard from points log
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_weekly_leaderboard(p_limit int DEFAULT 25)
RETURNS TABLE (
    user_id uuid,
    first_name text,
    last_name text,
    grade_level int,
    total_points int,
    rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
    WITH weekly AS (
        SELECT
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.grade_level,
            u.created_at,
            coalesce(sum(l.points_earned), 0)::int AS total_points
        FROM core.users u
        LEFT JOIN core.user_points_log l
            ON l.user_id = u.id
           AND l.earned_at >= now() - interval '7 days'
        WHERE coalesce(u.is_public_on_leaderboard, true) = true
          AND u.role = 'student'
        GROUP BY u.id, u.first_name, u.last_name, u.grade_level, u.created_at
        HAVING coalesce(sum(l.points_earned), 0) > 0
    )
    SELECT
        weekly.user_id,
        weekly.first_name,
        weekly.last_name,
        weekly.grade_level,
        weekly.total_points,
        rank() OVER (ORDER BY weekly.total_points DESC, weekly.created_at ASC) AS rank
    FROM weekly
    ORDER BY weekly.total_points DESC, weekly.created_at ASC
    LIMIT greatest(coalesce(p_limit, 25), 1);
$$;

-- ---------------------------------------------------------------------------
-- PI heatmap for the signed-in student
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_pi_heatmap()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, practice
AS $$
    SELECT coalesce(jsonb_agg(row_to_json(h) ORDER BY h.accuracy ASC NULLS FIRST, h.pi_code), '[]'::jsonb)
    FROM (
        SELECT
            pi.id,
            pi.pi_code,
            pi.indicator_text,
            ia.code AS instructional_area_code,
            pp.total_attempts,
            pp.correct_count,
            round((pp.correct_count::numeric / NULLIF(pp.total_attempts, 0)) * 100, 1) AS accuracy
        FROM core.pi_performance pp
        JOIN practice.performance_indicators pi ON pi.id = pp.pi_id
        LEFT JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
        WHERE pp.user_id = auth.uid()
          AND pp.source = 'test'
          AND pp.total_attempts > 0
        ORDER BY accuracy ASC NULLS FIRST, pi.pi_code
        LIMIT 80
    ) h;
$$;

-- ---------------------------------------------------------------------------
-- Officer roster + role changes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_chapter_members()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_role text;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can view chapter members';
    END IF;

    RETURN coalesce((
        SELECT jsonb_agg(row_to_json(m) ORDER BY
            CASE m.role WHEN 'advisor' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END,
            m.last_name,
            m.first_name)
        FROM (
            SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.grade_level,
                u.role,
                coalesce(u.total_points, 0) AS total_points,
                u.created_at
            FROM core.users u
        ) m
    ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_member_role(
    p_user_id uuid,
    p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_role text;
    v_target_role text;
    v_advisor_count int;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can change member roles';
    END IF;

    IF p_role NOT IN ('student', 'officer', 'advisor') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    IF p_role = 'advisor' AND v_role <> 'advisor' THEN
        RAISE EXCEPTION 'Only advisors can assign the advisor role';
    END IF;

    SELECT role INTO v_target_role
    FROM core.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    IF v_target_role = 'advisor' AND v_role <> 'advisor' THEN
        RAISE EXCEPTION 'Only advisors can change another advisor';
    END IF;

    IF v_target_role = 'advisor' AND p_role <> 'advisor' THEN
        SELECT count(*)::int INTO v_advisor_count
        FROM core.users
        WHERE role = 'advisor';

        IF v_advisor_count <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last advisor';
        END IF;
    END IF;

    UPDATE core.users
    SET role = p_role
    WHERE id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Roleplay search: PI codes + optional cluster
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.list_scenarios(text, int, text, text, int, int);

CREATE OR REPLACE FUNCTION public.list_scenarios(
    p_event_code text DEFAULT NULL,
    p_year int DEFAULT NULL,
    p_level text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_limit int DEFAULT 24,
    p_offset int DEFAULT 0,
    p_cluster_slug text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    event_code text,
    event_name text,
    cluster_name text,
    year int,
    level text,
    scenario_number int,
    scenario_title text,
    instructional_area_code text,
    career_pathway text,
    preview text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice
AS $$
    SELECT
        s.id,
        e.event_code,
        e.event_name,
        c.name AS cluster_name,
        s.year,
        s.level,
        s.scenario_number,
        s.scenario_title,
        ia.code AS instructional_area_code,
        s.career_pathway,
        left(coalesce(s.scenario_title, s.situation_description, ''), 180) AS preview
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
    WHERE (nullif(btrim(p_event_code), '') IS NULL OR e.event_code = upper(btrim(p_event_code)))
      AND (p_year IS NULL OR s.year = p_year)
      AND (nullif(btrim(p_level), '') IS NULL OR s.level = btrim(p_level))
      AND (nullif(btrim(p_cluster_slug), '') IS NULL OR c.slug = p_cluster_slug)
      AND (
          nullif(btrim(p_search), '') IS NULL OR
          coalesce(s.scenario_title, '') ILIKE '%' || btrim(p_search) || '%' OR
          coalesce(s.situation_description, '') ILIKE '%' || btrim(p_search) || '%' OR
          e.event_code ILIKE '%' || btrim(p_search) || '%' OR
          e.event_name ILIKE '%' || btrim(p_search) || '%' OR
          EXISTS (
              SELECT 1
              FROM practice.pi_roleplay_links l
              JOIN practice.performance_indicators pi ON pi.id = l.pi_id
              WHERE l.event_id = e.id
                AND l.year = s.year
                AND (
                    pi.pi_code ILIKE '%' || btrim(p_search) || '%' OR
                    pi.indicator_text ILIKE '%' || btrim(p_search) || '%'
                )
          )
      )
    ORDER BY s.year DESC, e.event_code, s.level, s.scenario_number
    LIMIT greatest(coalesce(p_limit, 24), 1)
    OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.list_scenario_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice
AS $$
    SELECT jsonb_build_object(
        'years', (
            SELECT coalesce(jsonb_agg(y ORDER BY y DESC), '[]'::jsonb)
            FROM (SELECT DISTINCT year AS y FROM events.scenarios) years
        ),
        'events', (
            SELECT coalesce(jsonb_agg(evt ORDER BY evt->>'event_code'), '[]'::jsonb)
            FROM (
                SELECT DISTINCT jsonb_build_object(
                    'event_code', e.event_code,
                    'event_name', e.event_name
                ) AS evt
                FROM events.scenarios s
                JOIN events.events e ON e.id = s.event_id
            ) events
        ),
        'clusters', (
            SELECT coalesce(jsonb_agg(cl ORDER BY cl->>'slug'), '[]'::jsonb)
            FROM (
                SELECT DISTINCT jsonb_build_object(
                    'slug', c.slug,
                    'name', c.name
                ) AS cl
                FROM events.events e
                JOIN practice.clusters c ON c.id = e.cluster_id
                JOIN events.scenarios s ON s.event_id = e.id
            ) clusters
        ),
        'levels', to_jsonb(ARRAY['district', 'state', 'icdc']::text[])
    );
$$;

-- ---------------------------------------------------------------------------
-- Vocab flashcards: include example_usage when present
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_vocab_flashcards();

CREATE OR REPLACE FUNCTION public.get_vocab_flashcards()
RETURNS TABLE (
  id uuid,
  term text,
  definition text,
  example_usage text,
  set_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = content, public
AS $$
  SELECT
    f.id,
    f.front_text AS term,
    f.back_text AS definition,
    vt.example_usage,
    s.title AS set_title
  FROM content.flashcards f
  JOIN content.flashcard_sets s ON s.id = f.set_id
  LEFT JOIN LATERAL (
      SELECT vt.example_usage
      FROM content.vocab_terms vt
      WHERE lower(vt.term) = lower(f.front_text)
      LIMIT 1
  ) vt ON true
  WHERE s.set_type = 'vocab'
    AND s.title = 'DECA Business Vocabulary'
  ORDER BY f.front_text;
$$;

GRANT EXECUTE ON FUNCTION public.configure_test_session_timing(uuid, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_weekly_leaderboard(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_pi_heatmap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chapter_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_scenarios(text, int, text, text, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_scenario_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vocab_flashcards() TO anon, authenticated, service_role;
