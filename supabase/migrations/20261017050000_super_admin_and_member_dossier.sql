-- Super admins can change accounts. Officers can open a member's full record.

ALTER TABLE core.users
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

UPDATE core.users
SET is_super_admin = true
WHERE id IN (
    '84869fd3-6e59-44b9-8598-89fa56479d3e', -- Arjun Yalamanchili
    '83ff260d-8d7b-4187-bb48-5969bf16bbfc'  -- Pranav Chinni
  )
  OR (lower(first_name) = 'arjun' AND lower(last_name) = 'yalamanchili')
  OR (lower(first_name) = 'pranav' AND lower(last_name) = 'chinni');

CREATE OR REPLACE FUNCTION public.current_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
  SELECT coalesce((
    SELECT is_super_admin FROM core.users WHERE id = auth.uid()
  ), false);
$$;

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
        'username', u.username,
        'username_confirmed', coalesce(u.username_confirmed, false),
        'grade_level', u.grade_level,
        'role', u.role,
        'is_super_admin', coalesce(u.is_super_admin, false),
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

CREATE OR REPLACE FUNCTION public.list_chapter_members()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core, events
AS $$
DECLARE
    v_role text;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') AND NOT public.current_is_super_admin() THEN
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
                u.username,
                u.username_confirmed,
                u.grade_level,
                u.role,
                u.event_code,
                ev.event_name,
                coalesce(u.is_super_admin, false) AS is_super_admin,
                coalesce(u.total_points, 0) AS total_points,
                u.last_login,
                u.created_at
            FROM core.users u
            LEFT JOIN events.events ev ON ev.event_code = u.event_code
        ) m
    ), '[]'::jsonb);
END;
$$;

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
                'created_at', f.created_at
            ) ORDER BY f.created_at DESC)
            FROM (
                SELECT id, session_id, event_type, created_at
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

CREATE OR REPLACE FUNCTION public.admin_update_member(
    p_user_id uuid,
    p_first_name text,
    p_last_name text,
    p_grade_level int,
    p_role text,
    p_event_code text,
    p_username text,
    p_is_super_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core, events, auth
AS $$
DECLARE
    v_first text := btrim(coalesce(p_first_name, ''));
    v_last text := btrim(coalesce(p_last_name, ''));
    v_username text := lower(regexp_replace(btrim(coalesce(p_username, '')), '\s+', '', 'g'));
    v_event text := nullif(upper(btrim(coalesce(p_event_code, ''))), '');
    v_email text;
    v_target_role text;
    v_advisor_count int;
    v_super_count int;
BEGIN
    IF NOT public.current_is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can change member accounts';
    END IF;

    IF v_first = '' OR v_last = '' THEN
        RAISE EXCEPTION 'First and last name are required';
    END IF;

    IF p_grade_level NOT IN (9, 10, 11, 12) THEN
        RAISE EXCEPTION 'Grade must be 9, 10, 11, or 12';
    END IF;

    IF p_role NOT IN ('student', 'officer', 'advisor') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    IF v_username !~ '^[a-z][a-z0-9]{2,29}$' THEN
        RAISE EXCEPTION 'Use 3 to 30 letters and numbers, and start with a letter.';
    END IF;

    IF v_event IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM events.events WHERE event_code = v_event
    ) THEN
        RAISE EXCEPTION 'Unknown event code %', v_event;
    END IF;

    SELECT role INTO v_target_role FROM core.users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    IF p_is_super_admin AND p_role = 'student' THEN
        RAISE EXCEPTION 'A super admin has to stay an officer or advisor';
    END IF;

    IF p_user_id = auth.uid() AND NOT p_is_super_admin THEN
        RAISE EXCEPTION 'You cannot remove your own super admin access';
    END IF;

    IF NOT p_is_super_admin THEN
        SELECT count(*)::int INTO v_super_count
        FROM core.users
        WHERE is_super_admin AND id <> p_user_id;
        IF v_super_count = 0 THEN
            RAISE EXCEPTION 'The chapter needs at least one super admin';
        END IF;
    END IF;

    IF v_target_role = 'advisor' AND p_role <> 'advisor' THEN
        SELECT count(*)::int INTO v_advisor_count
        FROM core.users
        WHERE role = 'advisor';
        IF v_advisor_count <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last advisor';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM core.users
        WHERE username = v_username AND id <> p_user_id
    ) THEN
        RAISE EXCEPTION 'That username is already taken.';
    END IF;

    v_email := v_username || '@dallasisd.org';

    UPDATE core.users
    SET first_name = v_first,
        last_name = v_last,
        grade_level = p_grade_level,
        role = p_role,
        event_code = v_event,
        username = v_username,
        email = v_email,
        username_confirmed = true,
        is_super_admin = p_is_super_admin
    WHERE id = p_user_id;

    UPDATE auth.users
    SET email = v_email,
        email_change = '',
        email_change_token_new = '',
        email_change_token_current = '',
        email_change_confirm_status = 0,
        email_confirmed_at = coalesce(email_confirmed_at, now())
    WHERE id = p_user_id;

    UPDATE auth.identities
    SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email), true)
    WHERE user_id = p_user_id
      AND provider = 'email';
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'That username is already taken.';
END;
$$;

REVOKE ALL ON FUNCTION public.current_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_dossier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_member(uuid, text, text, int, text, text, text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_dossier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_member(uuid, text, text, int, text, text, text, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
