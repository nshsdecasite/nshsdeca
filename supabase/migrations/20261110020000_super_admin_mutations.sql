-- Officers and advisors can look at members. Only super admins can change
-- accounts, grades, announcements, the calendar, or grading.

DROP FUNCTION IF EXISTS public.admin_update_member(uuid, text, text, int, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.admin_update_member(
    p_user_id uuid,
    p_first_name text,
    p_last_name text,
    p_grade_level int,
    p_role text,
    p_event_code text,
    p_username text,
    p_is_super_admin boolean,
    p_total_points int DEFAULT NULL,
    p_is_public_on_leaderboard boolean DEFAULT NULL,
    p_avatar_url text DEFAULT NULL,
    p_school_name text DEFAULT NULL,
    p_chapter_name text DEFAULT NULL,
    p_state text DEFAULT NULL
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
    v_chapter uuid;
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

    IF p_total_points IS NOT NULL AND p_total_points < 0 THEN
        RAISE EXCEPTION 'Points cannot be negative';
    END IF;

    IF v_event IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM events.events WHERE event_code = v_event
    ) THEN
        RAISE EXCEPTION 'Unknown event code %', v_event;
    END IF;

    SELECT role, chapter_id INTO v_target_role, v_chapter
    FROM core.users WHERE id = p_user_id;
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
        is_super_admin = p_is_super_admin,
        total_points = coalesce(p_total_points, total_points),
        is_public_on_leaderboard = coalesce(p_is_public_on_leaderboard, is_public_on_leaderboard),
        avatar_url = CASE
            WHEN p_avatar_url IS NULL THEN avatar_url
            ELSE nullif(btrim(p_avatar_url), '')
        END
    WHERE id = p_user_id;

    IF v_chapter IS NOT NULL THEN
        UPDATE core.chapters
        SET school_name = coalesce(nullif(btrim(p_school_name), ''), school_name),
            chapter_name = coalesce(nullif(btrim(p_chapter_name), ''), chapter_name),
            state = coalesce(nullif(upper(btrim(p_state)), ''), state)
        WHERE id = v_chapter;
    END IF;

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

REVOKE ALL ON FUNCTION public.admin_update_member(
    uuid, text, text, int, text, text, text, boolean, int, boolean, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_member(
    uuid, text, text, int, text, text, text, boolean, int, boolean, text, text, text, text
) TO authenticated;

DO $mig$
DECLARE
    r record;
    def text;
    pos int;
    guard text := E'\n    IF NOT public.current_is_super_admin() THEN\n        RAISE EXCEPTION ''Only super admins can do that'';\n    END IF;\n';
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY (ARRAY[
            'set_member_role',
            'create_announcement',
            'delete_announcement',
            'create_chapter_event',
            'update_chapter_event',
            'delete_chapter_event',
            'save_roleplay_grading',
            'delete_roleplay_submission',
            'approve_practice_scenario',
            'reject_practice_scenario',
            'send_broadcast_message'
          ])
    LOOP
        def := pg_get_functiondef(r.sig);
        IF position('Only super admins can do that' in def) > 0 THEN
            CONTINUE;
        END IF;
        pos := position('BEGIN' in def);
        IF pos = 0 THEN
            RAISE EXCEPTION 'No BEGIN in %', r.sig;
        END IF;
        def := overlay(def placing 'BEGIN' || guard from pos for 5);
        EXECUTE def;
    END LOOP;
END
$mig$;

NOTIFY pgrst, 'reload schema';
