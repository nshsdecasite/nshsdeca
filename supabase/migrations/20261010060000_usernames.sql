-- Members sign in with a username. The first one is first and last name
-- together. They choose a permanent username after that first sign-in.

ALTER TABLE core.users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS username_confirmed boolean NOT NULL DEFAULT false;

UPDATE core.users
SET
  username = lower(regexp_replace(first_name || last_name, '[^a-zA-Z0-9]', '', 'g')),
  username_confirmed = false,
  email = lower(regexp_replace(first_name || last_name, '[^a-zA-Z0-9]', '', 'g')) || '@dallasisd.org'
WHERE username IS NULL OR username_confirmed = false;

ALTER TABLE core.users
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON core.users (username);

UPDATE auth.users au
SET
  email = c.email,
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = '',
  email_change_confirm_status = 0,
  email_confirmed_at = coalesce(au.email_confirmed_at, now())
FROM core.users c
WHERE au.id = c.id;

UPDATE auth.identities i
SET identity_data = jsonb_set(i.identity_data, '{email}', to_jsonb(c.email), true)
FROM core.users c
WHERE i.user_id = c.id
  AND i.provider = 'email';

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

CREATE OR REPLACE FUNCTION public.register_core_user(
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
  v_username text := lower(regexp_replace(p_first_name || p_last_name, '[^a-zA-Z0-9]', '', 'g'));
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
    id, first_name, last_name, email, password_hash, role, grade_level, chapter_id, event_code, username, username_confirmed
  )
  VALUES (
    p_user_id, p_first_name, p_last_name, p_email, 'supabase_auth', v_role, p_grade_level, v_chapter_id, v_event, v_username, false
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    grade_level = EXCLUDED.grade_level,
    chapter_id = EXCLUDED.chapter_id,
    event_code = EXCLUDED.event_code,
    role = EXCLUDED.role;

  UPDATE core.users
  SET username = v_username
  WHERE id = p_user_id AND username IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_username(p_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_username text := lower(regexp_replace(btrim(coalesce(p_username, '')), '\s+', '', 'g'));
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF v_username !~ '^[a-z][a-z0-9]{2,29}$' THEN
    RAISE EXCEPTION 'Use 3 to 30 letters and numbers, and start with a letter.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM core.users
    WHERE username = v_username AND id <> auth.uid()
  ) THEN
    RAISE EXCEPTION 'That username is already taken.';
  END IF;

  v_email := v_username || '@dallasisd.org';

  UPDATE core.users
  SET username = v_username,
      email = v_email,
      username_confirmed = true
  WHERE id = auth.uid();

  UPDATE auth.users
  SET email = v_email,
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_confirm_status = 0,
      email_confirmed_at = coalesce(email_confirmed_at, now())
  WHERE id = auth.uid();

  UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email), true)
  WHERE user_id = auth.uid()
    AND provider = 'email';
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'That username is already taken.';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_username(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
