-- Store the question number when someone leaves a test tab.

ALTER TABLE core.session_focus_events
    ADD COLUMN IF NOT EXISTS question_number int;

DROP FUNCTION IF EXISTS public.record_session_tab_event(uuid, text);

CREATE OR REPLACE FUNCTION public.record_session_tab_event(
    p_session_id uuid,
    p_event_type text,
    p_question_number int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core, testbank
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_question int := p_question_number;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_event_type NOT IN ('blur', 'hidden') THEN
        RAISE EXCEPTION 'Invalid event type';
    END IF;

    IF v_question IS NOT NULL AND (v_question < 1 OR v_question > 500) THEN
        v_question := NULL;
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

    INSERT INTO core.session_focus_events (user_id, session_id, event_type, question_number)
    VALUES (v_user_id, p_session_id, p_event_type, v_question);
END;
$$;

REVOKE ALL ON FUNCTION public.record_session_tab_event(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_session_tab_event(uuid, text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_member_dossier(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core, events, practice, testbank, rubric, content
AS $$
DECLARE
    v_role text;
    v_profile jsonb;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') AND NOT public.current_is_super_admin() THEN
        RAISE EXCEPTION 'Only officers can view member records';
    END IF;

    SELECT (to_jsonb(u) - 'password_hash') || jsonb_build_object(
        'chapter_name', ch.chapter_name,
        'school_name', ch.school_name,
        'state', ch.state,
        'event_name', ev.event_name,
        'event_format', ev.event_format,
        'cluster_name', cl.name,
        'cluster_slug', cl.slug
    )
    INTO v_profile
    FROM core.users u
    LEFT JOIN core.chapters ch ON ch.id = u.chapter_id
    LEFT JOIN events.events ev ON ev.event_code = u.event_code
    LEFT JOIN practice.clusters cl ON cl.id = ev.cluster_id
    WHERE u.id = p_user_id;

    IF v_profile IS NULL THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    RETURN jsonb_build_object(
        'profile', v_profile,
        'events', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'event_code', e.event_code,
                'event_name', e.event_name
            ) ORDER BY e.event_code)
            FROM events.events e
        ), '[]'::jsonb),
        'tests', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', ts.id,
                'session_type', ts.session_type,
                'exam_code', ex.exam_code,
                'exam_title', ex.title,
                'score', ts.score,
                'total_questions', ts.total_questions,
                'started_at', ts.started_at,
                'completed_at', ts.completed_at,
                'answered', (
                    SELECT count(*)::int FROM testbank.test_answers a WHERE a.session_id = ts.id
                ),
                'correct_answers', (
                    SELECT count(*)::int
                    FROM testbank.test_answers a
                    WHERE a.session_id = ts.id AND a.is_correct
                )
            ) ORDER BY ts.started_at DESC)
            FROM testbank.test_sessions ts
            LEFT JOIN testbank.exams ex ON ex.id = ts.exam_id
            WHERE ts.user_id = p_user_id
        ), '[]'::jsonb),
        'submissions', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', s.id,
                'status', s.status,
                'attempt_number', s.attempt_number,
                'submitted_at', s.submitted_at,
                'reviewed_at', s.reviewed_at,
                'video_url', s.video_url,
                'video_source', s.video_source,
                'duration_seconds', s.duration_seconds,
                'scenario_key', s.scenario_key,
                'event_code', e.event_code,
                'scenario_title', sc.scenario_title,
                'scenario_number', sc.scenario_number,
                'year', sc.year,
                'level', sc.level,
                'grading_data', s.grading_data
            ) ORDER BY s.submitted_at DESC)
            FROM rubric.submissions s
            LEFT JOIN events.events e ON e.id = s.event_id
            LEFT JOIN events.scenarios sc ON sc.id = s.scenario_id
            WHERE s.user_id = p_user_id
        ), '[]'::jsonb),
        'pi_performance', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'pi_code', pi.pi_code,
                'indicator_text', pi.indicator_text,
                'source', pp.source,
                'total_attempts', pp.total_attempts,
                'correct_count', pp.correct_count,
                'last_updated', pp.last_updated
            ) ORDER BY pi.pi_code, pp.source)
            FROM core.pi_performance pp
            JOIN practice.performance_indicators pi ON pi.id = pp.pi_id
            WHERE pp.user_id = p_user_id
        ), '[]'::jsonb),
        'points', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', p.id,
                'points_earned', p.points_earned,
                'action_type', p.action_type,
                'reference_type', p.reference_type,
                'reference_id', p.reference_id,
                'earned_at', p.earned_at
            ) ORDER BY p.earned_at DESC)
            FROM core.user_points_log p
            WHERE p.user_id = p_user_id
        ), '[]'::jsonb),
        'peeks', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', sp.id,
                'created_at', sp.created_at,
                'event_code', e.event_code,
                'scenario_title', sc.scenario_title,
                'scenario_number', sc.scenario_number,
                'year', sc.year,
                'level', sc.level
            ) ORDER BY sp.created_at DESC)
            FROM core.solution_peeks sp
            JOIN events.scenarios sc ON sc.id = sp.scenario_id
            JOIN events.events e ON e.id = sc.event_id
            WHERE sp.user_id = p_user_id
        ), '[]'::jsonb),
        'tab_leaves', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', f.id,
                'session_id', f.session_id,
                'event_type', f.event_type,
                'question_number', f.question_number,
                'created_at', f.created_at
            ) ORDER BY f.created_at DESC)
            FROM (
                SELECT id, session_id, event_type, question_number, created_at
                FROM core.session_focus_events
                WHERE user_id = p_user_id
                ORDER BY created_at DESC
                LIMIT 100
            ) f
        ), '[]'::jsonb),
        'notes', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', n.id,
                'tab_name', n.tab_name,
                'content', n.content,
                'updated_at', n.updated_at
            ) ORDER BY n.updated_at DESC)
            FROM content.notes n
            WHERE n.user_id = p_user_id
        ), '[]'::jsonb),
        'generated_scenarios', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', s.id,
                'event_code', e.event_code,
                'scenario_title', s.scenario_title,
                'year', s.year,
                'level', s.level,
                'review_status', s.review_status
            ) ORDER BY s.scenario_title)
            FROM events.scenarios s
            JOIN events.events e ON e.id = s.event_id
            WHERE s.created_by = p_user_id
        ), '[]'::jsonb),
        'flashcards', jsonb_build_object(
            'learning', (
                SELECT count(*)::int
                FROM content.user_flashcard_progress
                WHERE user_id = p_user_id AND status = 'learning'
            ),
            'know_it', (
                SELECT count(*)::int
                FROM content.user_flashcard_progress
                WHERE user_id = p_user_id AND status = 'know_it'
            )
        ),
        'messages', jsonb_build_object(
            'sent', (
                SELECT count(*)::int FROM core.direct_messages WHERE sender_id = p_user_id
            ),
            'received', (
                SELECT count(*)::int FROM core.direct_messages WHERE recipient_id = p_user_id
            )
        ),
        'friendships', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'status', f.status,
                'created_at', f.created_at,
                'responded_at', f.responded_at,
                'other_name', trim(both ' ' FROM coalesce(o.first_name, '') || ' ' || coalesce(o.last_name, ''))
            ) ORDER BY f.created_at DESC)
            FROM core.friendships f
            JOIN core.users o ON o.id = CASE
                WHEN f.requester_id = p_user_id THEN f.addressee_id
                ELSE f.requester_id
            END
            WHERE f.requester_id = p_user_id OR f.addressee_id = p_user_id
        ), '[]'::jsonb),
        'reactions', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'reaction', r.reaction,
                'created_at', r.created_at
            ) ORDER BY r.created_at DESC)
            FROM core.announcement_reactions r
            WHERE r.user_id = p_user_id
        ), '[]'::jsonb)
    );
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
    v_role text;
    v_questions jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();

    SELECT ts.*, e.exam_code, e.title AS exam_title, e.year AS exam_year, c.name AS cluster_name
    INTO v_session
    FROM testbank.test_sessions ts
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    WHERE ts.id = p_session_id
      AND (
        ts.user_id = v_user_id
        OR v_role IN ('officer', 'advisor')
      );

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_completed := v_session.completed_at IS NOT NULL;
    v_config := coalesce(v_session.config, '{}'::jsonb);

    WITH sq AS (
        SELECT eq.question_id, eq.display_order
        FROM testbank.exam_questions eq
        WHERE v_session.exam_id IS NOT NULL
          AND eq.exam_id = v_session.exam_id
        UNION ALL
        SELECT (value::text)::uuid AS question_id, ordinality::int AS display_order
        FROM jsonb_array_elements_text(coalesce(v_config->'question_ids', '[]'::jsonb))
            WITH ORDINALITY AS t(value, ordinality)
        WHERE v_session.exam_id IS NULL
    ),
    choice_agg AS (
        SELECT
            qc.question_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', qc.id,
                    'label', qc.choice_label,
                    'text', qc.choice_text,
                    'is_correct', CASE WHEN v_completed THEN qc.is_correct ELSE NULL END
                )
                ORDER BY qc.display_order
            ) AS choices
        FROM testbank.question_choices qc
        WHERE qc.question_id IN (SELECT question_id FROM sq)
        GROUP BY qc.question_id
    )
    SELECT coalesce(jsonb_agg(
        jsonb_build_object(
            'id', qu.id,
            'display_order', sq.display_order,
            'question_text', qu.question_text,
            'pi_id', pi.id,
            'pi_code', pi.pi_code,
            'rationale', CASE WHEN v_completed THEN qu.rationale ELSE NULL END,
            'choices', coalesce(ca.choices, '[]'::jsonb),
            'chosen_choice_id', ta.chosen_choice_id,
            'is_correct', ta.is_correct
        )
        ORDER BY sq.display_order
    ), '[]'::jsonb)
    INTO v_questions
    FROM sq
    JOIN testbank.questions qu ON qu.id = sq.question_id
    LEFT JOIN practice.performance_indicators pi ON pi.id = qu.pi_id
    LEFT JOIN choice_agg ca ON ca.question_id = qu.id
    LEFT JOIN testbank.test_answers ta
        ON ta.session_id = v_session.id
       AND ta.question_id = qu.id;

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
        'tab_leaves', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'id', sfe.id,
                'question_number', sfe.question_number,
                'created_at', sfe.created_at
            ) ORDER BY sfe.created_at)
            FROM core.session_focus_events sfe
            WHERE sfe.session_id = v_session.id
        ), '[]'::jsonb),
        'questions', v_questions
    );
END;
$$;


NOTIFY pgrst, 'reload schema';
