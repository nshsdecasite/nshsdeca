-- Platform infrastructure: custom tests, PI tracking, points, notes, flashcards, profile, admin.

-- ---------------------------------------------------------------------------
-- PI performance + points helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.upsert_pi_performance(
    p_user_id uuid,
    p_pi_id uuid,
    p_source text,
    p_correct boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
    IF p_pi_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO core.pi_performance (user_id, pi_id, source, total_attempts, correct_count, last_updated)
    VALUES (
        p_user_id,
        p_pi_id,
        p_source,
        1,
        CASE WHEN p_correct THEN 1 ELSE 0 END,
        now()
    )
    ON CONFLICT (user_id, pi_id, source) DO UPDATE SET
        total_attempts = core.pi_performance.total_attempts + 1,
        correct_count = core.pi_performance.correct_count + CASE WHEN p_correct THEN 1 ELSE 0 END,
        last_updated = now();
END;
$$;

CREATE OR REPLACE FUNCTION core.award_points(
    p_user_id uuid,
    p_points int,
    p_action_type text,
    p_reference_type text,
    p_reference_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
    IF p_points <= 0 THEN
        RETURN;
    END IF;

    INSERT INTO core.user_points_log (user_id, points_earned, action_type, reference_type, reference_id)
    VALUES (p_user_id, p_points, p_action_type, p_reference_type, p_reference_id);

    UPDATE core.users
    SET total_points = coalesce(total_points, 0) + p_points
    WHERE id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Custom / PI-targeted test sessions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_custom_test_session(
    p_question_count int DEFAULT 20,
    p_cluster_slug text DEFAULT NULL,
    p_ia_code text DEFAULT NULL,
    p_pi_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank, practice
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_session_id uuid;
    v_question_ids uuid[];
    v_count int := greatest(least(coalesce(p_question_count, 20), 100), 5);
    v_label text;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT coalesce(array_agg(id), ARRAY[]::uuid[])
    INTO v_question_ids
    FROM (
        SELECT DISTINCT q.id
        FROM testbank.questions q
        LEFT JOIN practice.instructional_areas ia ON ia.id = q.instructional_area_id
        WHERE q.pi_id IS NOT NULL
          AND (p_ia_code IS NULL OR btrim(p_ia_code) = '' OR ia.code = upper(p_ia_code))
          AND (p_pi_id IS NULL OR q.pi_id = p_pi_id)
          AND (
              p_cluster_slug IS NULL OR btrim(p_cluster_slug) = '' OR
              EXISTS (
                  SELECT 1
                  FROM testbank.exam_questions eq
                  JOIN testbank.exams e ON e.id = eq.exam_id
                  JOIN practice.clusters c ON c.id = e.cluster_id
                  WHERE eq.question_id = q.id AND c.slug = p_cluster_slug
              )
          )
        ORDER BY random()
        LIMIT v_count
    ) picked;

    IF coalesce(array_length(v_question_ids, 1), 0) = 0 THEN
        RAISE EXCEPTION 'No questions match those filters';
    END IF;

    v_label := trim(both ' ·' FROM concat_ws(
        ' · ',
        CASE WHEN p_cluster_slug IS NOT NULL AND btrim(p_cluster_slug) <> '' THEN initcap(replace(p_cluster_slug, '-', ' ')) END,
        CASE WHEN p_ia_code IS NOT NULL AND btrim(p_ia_code) <> '' THEN upper(p_ia_code) END,
        CASE WHEN p_pi_id IS NOT NULL THEN 'PI focus' END,
        array_length(v_question_ids, 1)::text || ' questions'
    ));

    INSERT INTO testbank.test_sessions (user_id, session_type, total_questions, config)
    VALUES (
        v_user_id,
        'custom',
        array_length(v_question_ids, 1),
        jsonb_build_object('question_ids', to_jsonb(v_question_ids), 'label', v_label)
    )
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('id', v_session_id, 'total_questions', array_length(v_question_ids, 1));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pi_targeted_test_session(
    p_question_count int DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank, practice, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_session_id uuid;
    v_question_ids uuid[];
    v_count int := greatest(least(coalesce(p_question_count, 15), 50), 5);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT coalesce(array_agg(question_id), ARRAY[]::uuid[])
    INTO v_question_ids
    FROM (
        SELECT q.id AS question_id
        FROM (
            SELECT pp.pi_id,
                   pp.correct_count::float / NULLIF(pp.total_attempts, 0) AS accuracy
            FROM core.pi_performance pp
            WHERE pp.user_id = v_user_id AND pp.source = 'test'
            ORDER BY accuracy ASC NULLS FIRST, pp.total_attempts DESC
            LIMIT 8
        ) weak
        JOIN testbank.questions q ON q.pi_id = weak.pi_id
        ORDER BY weak.accuracy ASC NULLS FIRST, random()
        LIMIT v_count
    ) picked;

    IF coalesce(array_length(v_question_ids, 1), 0) < 5 THEN
        SELECT coalesce(array_agg(id), ARRAY[]::uuid[])
        INTO v_question_ids
        FROM (
            SELECT q.id
            FROM testbank.questions q
            WHERE q.pi_id IS NOT NULL
            ORDER BY random()
            LIMIT v_count
        ) fallback;
    END IF;

    INSERT INTO testbank.test_sessions (user_id, session_type, total_questions, config)
    VALUES (
        v_user_id,
        'pi_targeted',
        array_length(v_question_ids, 1),
        jsonb_build_object(
            'question_ids', to_jsonb(v_question_ids),
            'label', 'PI-targeted practice · ' || array_length(v_question_ids, 1)::text || ' questions'
        )
    )
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('id', v_session_id, 'total_questions', array_length(v_question_ids, 1));
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

CREATE OR REPLACE FUNCTION public.save_test_answer(
    p_session_id uuid,
    p_question_id uuid,
    p_choice_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank, practice, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_is_correct boolean;
    v_pi_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM testbank.test_sessions
        WHERE id = p_session_id
          AND user_id = v_user_id
          AND completed_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Session not found or already completed';
    END IF;

    SELECT qc.is_correct, q.pi_id
    INTO v_is_correct, v_pi_id
    FROM testbank.question_choices qc
    JOIN testbank.questions q ON q.id = qc.question_id
    WHERE qc.id = p_choice_id AND qc.question_id = p_question_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid choice for question';
    END IF;

    IF EXISTS (
        SELECT 1 FROM testbank.test_answers
        WHERE session_id = p_session_id AND question_id = p_question_id
    ) THEN
        UPDATE testbank.test_answers
        SET chosen_choice_id = p_choice_id,
            is_correct = v_is_correct
        WHERE session_id = p_session_id AND question_id = p_question_id;
    ELSE
        INSERT INTO testbank.test_answers (session_id, question_id, chosen_choice_id, is_correct)
        VALUES (p_session_id, p_question_id, p_choice_id, v_is_correct);
    END IF;

    PERFORM core.upsert_pi_performance(v_user_id, v_pi_id, 'test', coalesce(v_is_correct, false));

    RETURN jsonb_build_object('is_correct', v_is_correct);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_test_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, testbank, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_score int;
    v_total int;
    v_already_completed timestamptz;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT total_questions, completed_at
    INTO v_total, v_already_completed
    FROM testbank.test_sessions
    WHERE id = p_session_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_already_completed IS NOT NULL THEN
        RETURN jsonb_build_object('score', (SELECT score FROM testbank.test_sessions WHERE id = p_session_id), 'total_questions', v_total);
    END IF;

    SELECT count(*)::int
    INTO v_score
    FROM testbank.test_answers
    WHERE session_id = p_session_id AND is_correct IS TRUE;

    UPDATE testbank.test_sessions
    SET completed_at = now(),
        score = v_score
    WHERE id = p_session_id;

    PERFORM core.award_points(
        v_user_id,
        v_score,
        'test_completed',
        'test_session',
        p_session_id
    );

    RETURN jsonb_build_object('score', v_score, 'total_questions', v_total);
END;
$$;

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
    total_questions int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice
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
        ts.total_questions
    FROM testbank.test_sessions ts
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    WHERE ts.user_id = auth.uid()
    ORDER BY ts.started_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard, profile, leaderboard
-- ---------------------------------------------------------------------------

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
                LIMIT 5
            ) rs
        ), '[]'::jsonb)
    )
    INTO result
    FROM core.users u
    WHERE u.id = v_user_id;

    RETURN coalesce(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core
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
        'school_name', ch.school_name
    )
    FROM core.users u
    LEFT JOIN core.chapters ch ON ch.id = u.chapter_id
    WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_grade_level int DEFAULT NULL,
    p_is_public_on_leaderboard boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE core.users
    SET
        first_name = coalesce(nullif(btrim(p_first_name), ''), first_name),
        last_name = coalesce(nullif(btrim(p_last_name), ''), last_name),
        grade_level = coalesce(p_grade_level, grade_level),
        is_public_on_leaderboard = coalesce(p_is_public_on_leaderboard, is_public_on_leaderboard)
    WHERE id = v_user_id;

    RETURN public.get_my_profile();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_leaderboard(p_limit int DEFAULT 25)
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
    SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.grade_level,
        coalesce(u.total_points, 0) AS total_points,
        rank() OVER (ORDER BY coalesce(u.total_points, 0) DESC, u.created_at ASC) AS rank
    FROM core.users u
    WHERE coalesce(u.is_public_on_leaderboard, true) = true
      AND u.role = 'student'
    ORDER BY coalesce(u.total_points, 0) DESC, u.created_at ASC
    LIMIT greatest(coalesce(p_limit, 25), 1);
$$;

-- ---------------------------------------------------------------------------
-- Personal notes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_my_notes()
RETURNS TABLE (
    id uuid,
    tab_name text,
    content jsonb,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, content
AS $$
    SELECT n.id, n.tab_name, n.content, n.updated_at
    FROM content.notes n
    WHERE n.user_id = auth.uid()
    ORDER BY n.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.upsert_note(
    p_id uuid DEFAULT NULL,
    p_tab_name text DEFAULT 'General',
    p_content jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, content
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_note_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_id IS NULL THEN
        INSERT INTO content.notes (user_id, tab_name, content, updated_at)
        VALUES (v_user_id, coalesce(nullif(btrim(p_tab_name), ''), 'General'), coalesce(p_content, '{}'::jsonb), now())
        RETURNING id INTO v_note_id;
    ELSE
        UPDATE content.notes
        SET tab_name = coalesce(nullif(btrim(p_tab_name), ''), tab_name),
            content = coalesce(p_content, content),
            updated_at = now()
        WHERE id = p_id AND user_id = v_user_id
        RETURNING id INTO v_note_id;
    END IF;

    RETURN (
        SELECT jsonb_build_object('id', n.id, 'tab_name', n.tab_name, 'content', n.content, 'updated_at', n.updated_at)
        FROM content.notes n
        WHERE n.id = v_note_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_note(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, content
AS $$
BEGIN
    DELETE FROM content.notes
    WHERE id = p_id AND user_id = auth.uid();
END;
$$;

-- ---------------------------------------------------------------------------
-- PI flashcards (auto-generated from master PI bank by instructional area)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_pi_flashcard_sets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, content, practice
AS $$
DECLARE
    ia record;
    v_set_id uuid;
BEGIN
    FOR ia IN
        SELECT ia.id, ia.code, ia.name, count(pi.id) AS pi_count
        FROM practice.instructional_areas ia
        JOIN practice.performance_indicators pi ON pi.instructional_area_id = ia.id
        GROUP BY ia.id, ia.code, ia.name
        HAVING count(pi.id) > 0
    LOOP
        SELECT id INTO v_set_id
        FROM content.flashcard_sets
        WHERE set_type = 'pi' AND title = ia.code || ' — ' || ia.name
        LIMIT 1;

        IF v_set_id IS NULL THEN
            INSERT INTO content.flashcard_sets (title, set_type, instructional_area_id)
            VALUES (ia.code || ' — ' || ia.name, 'pi', ia.id)
            RETURNING id INTO v_set_id;
        END IF;

        INSERT INTO content.flashcards (set_id, front_text, back_text, pi_id)
        SELECT v_set_id, pi.pi_code, pi.indicator_text, pi.id
        FROM practice.performance_indicators pi
        WHERE pi.instructional_area_id = ia.id
          AND NOT EXISTS (
              SELECT 1 FROM content.flashcards fc
              WHERE fc.set_id = v_set_id AND fc.pi_id = pi.id
          );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_pi_flashcard_sets()
RETURNS TABLE (
    id uuid,
    title text,
    instructional_area_code text,
    card_count bigint,
    known_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, content, practice
AS $$
BEGIN
    PERFORM public.ensure_pi_flashcard_sets();

    RETURN QUERY
    SELECT
        fs.id,
        fs.title,
        ia.code AS instructional_area_code,
        count(fc.id) AS card_count,
        count(ufp.id) FILTER (WHERE ufp.status = 'know_it') AS known_count
    FROM content.flashcard_sets fs
    LEFT JOIN practice.instructional_areas ia ON ia.id = fs.instructional_area_id
    LEFT JOIN content.flashcards fc ON fc.set_id = fs.id
    LEFT JOIN content.user_flashcard_progress ufp
        ON ufp.flashcard_id = fc.id AND ufp.user_id = auth.uid()
    WHERE fs.set_type = 'pi'
    GROUP BY fs.id, fs.title, ia.code
    ORDER BY ia.code NULLS LAST, fs.title;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pi_flashcard_set(p_set_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, content, practice
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN (
        SELECT jsonb_build_object(
            'id', fs.id,
            'title', fs.title,
            'cards', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', fc.id,
                        'front_text', fc.front_text,
                        'back_text', fc.back_text,
                        'pi_id', fc.pi_id,
                        'status', coalesce(ufp.status, 'learning')
                    )
                    ORDER BY fc.front_text
                )
                FROM content.flashcards fc
                LEFT JOIN content.user_flashcard_progress ufp
                    ON ufp.flashcard_id = fc.id AND ufp.user_id = v_user_id
                WHERE fc.set_id = fs.id
            ), '[]'::jsonb)
        )
        FROM content.flashcard_sets fs
        WHERE fs.id = p_set_id AND fs.set_type = 'pi'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_flashcard_progress(
    p_flashcard_id uuid,
    p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, content, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_status NOT IN ('learning', 'know_it') THEN
        RAISE EXCEPTION 'Invalid flashcard status';
    END IF;

    INSERT INTO content.user_flashcard_progress (user_id, flashcard_id, status, last_seen)
    VALUES (v_user_id, p_flashcard_id, p_status, now())
    ON CONFLICT (user_id, flashcard_id) DO UPDATE SET
        status = EXCLUDED.status,
        last_seen = now();

    IF p_status = 'know_it' THEN
        PERFORM core.award_points(v_user_id, 1, 'flashcard_known', 'flashcard_set', (
            SELECT set_id FROM content.flashcards WHERE id = p_flashcard_id
        ));
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Announcements (officer/advisor)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_announcements()
RETURNS TABLE (
    id uuid,
    message text,
    visible_to text,
    created_at timestamptz,
    expires_at timestamptz,
    author_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
    SELECT
        a.id,
        a.message,
        a.visible_to,
        a.created_at,
        a.expires_at,
        trim(both ' ' FROM coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) AS author_name
    FROM core.announcements a
    LEFT JOIN core.users u ON u.id = a.author_id
    WHERE (a.expires_at IS NULL OR a.expires_at > now())
      AND (
          a.visible_to = 'all' OR
          (a.visible_to = 'students' AND coalesce(public.get_my_role(), 'student') = 'student') OR
          (a.visible_to = 'officers' AND public.get_my_role() IN ('officer', 'advisor'))
      )
    ORDER BY a.created_at DESC
    LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.create_announcement(
    p_message text,
    p_visible_to text DEFAULT 'all',
    p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
    v_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can post announcements';
    END IF;

    IF p_visible_to NOT IN ('all', 'students', 'officers') THEN
        RAISE EXCEPTION 'Invalid visibility';
    END IF;

    INSERT INTO core.announcements (author_id, message, visible_to, expires_at)
    VALUES (v_user_id, btrim(p_message), p_visible_to, p_expires_at)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_announcement(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_role text;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can delete announcements';
    END IF;

    DELETE FROM core.announcements
    WHERE id = p_id AND (author_id = auth.uid() OR v_role = 'advisor');
END;
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

GRANT EXECUTE ON FUNCTION public.create_custom_test_session(int, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pi_targeted_test_session(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_leaderboard(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_notes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_note(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_note(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pi_flashcard_sets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pi_flashcard_set(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_flashcard_progress(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_announcements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_announcement(text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;
