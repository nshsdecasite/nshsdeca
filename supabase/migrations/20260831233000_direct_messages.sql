-- Direct messages between officers/advisors and members.
-- Announcements stay on core.announcements; this adds 1:1 threads.

CREATE TABLE IF NOT EXISTS core.direct_messages (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id     uuid NOT NULL REFERENCES core.users(id),
    recipient_id  uuid NOT NULL REFERENCES core.users(id),
    body          text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    read_at       timestamptz,
    CONSTRAINT direct_messages_not_self CHECK (sender_id <> recipient_id),
    CONSTRAINT direct_messages_body_present CHECK (length(btrim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS direct_messages_thread_idx
    ON core.direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

CREATE INDEX IF NOT EXISTS direct_messages_inbox_idx
    ON core.direct_messages (recipient_id, created_at DESC);

ALTER TABLE core.direct_messages ENABLE ROW LEVEL SECURITY;

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
          a.author_id = auth.uid() OR
          a.visible_to = 'all' OR
          (a.visible_to = 'students' AND coalesce(public.get_my_role(), 'student') = 'student') OR
          (a.visible_to = 'officers' AND public.get_my_role() IN ('officer', 'advisor'))
      )
    ORDER BY a.created_at DESC
    LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.list_messageable_members()
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    email text,
    role text,
    grade_level int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();

    RETURN QUERY
    SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.grade_level
    FROM core.users u
    WHERE u.id <> v_user_id
      AND (
          v_role IN ('officer', 'advisor')
          OR u.role IN ('officer', 'advisor')
      )
    ORDER BY
        CASE u.role WHEN 'advisor' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END,
        u.last_name,
        u.first_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_direct_message(
    p_recipient_id uuid,
    p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
    v_recipient_role text;
    v_id uuid;
    v_body text := btrim(coalesce(p_body, ''));
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_body = '' THEN
        RAISE EXCEPTION 'Message is required';
    END IF;

    IF p_recipient_id = v_user_id THEN
        RAISE EXCEPTION 'You cannot message yourself';
    END IF;

    v_role := public.get_my_role();

    SELECT u.role INTO v_recipient_role
    FROM core.users u
    WHERE u.id = p_recipient_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    IF v_role NOT IN ('officer', 'advisor') AND v_recipient_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Students can only message officers and advisors';
    END IF;

    INSERT INTO core.direct_messages (sender_id, recipient_id, body)
    VALUES (v_user_id, p_recipient_id, v_body)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_broadcast_message(
    p_audience text,
    p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
    v_body text := btrim(coalesce(p_body, ''));
    v_sent int;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can send a group message';
    END IF;

    IF v_body = '' THEN
        RAISE EXCEPTION 'Message is required';
    END IF;

    IF p_audience NOT IN ('students', 'all') THEN
        RAISE EXCEPTION 'Invalid audience';
    END IF;

    INSERT INTO core.direct_messages (sender_id, recipient_id, body)
    SELECT v_user_id, u.id, v_body
    FROM core.users u
    WHERE u.id <> v_user_id
      AND (p_audience = 'all' OR u.role = 'student');

    GET DIAGNOSTICS v_sent = ROW_COUNT;

    RETURN jsonb_build_object('sent', v_sent);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_conversations()
RETURNS TABLE (
    user_id uuid,
    first_name text,
    last_name text,
    role text,
    last_body text,
    last_at timestamptz,
    unread_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
    WITH mine AS (
        SELECT
            CASE WHEN dm.sender_id = auth.uid() THEN dm.recipient_id ELSE dm.sender_id END AS other_id,
            dm.body,
            dm.created_at,
            dm.recipient_id,
            dm.read_at
        FROM core.direct_messages dm
        WHERE dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid()
    ),
    latest AS (
        SELECT DISTINCT ON (other_id)
            other_id,
            body AS last_body,
            created_at AS last_at
        FROM mine
        ORDER BY other_id, created_at DESC
    )
    SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.role,
        latest.last_body,
        latest.last_at,
        (
            SELECT count(*)::int
            FROM core.direct_messages unread
            WHERE unread.recipient_id = auth.uid()
              AND unread.sender_id = u.id
              AND unread.read_at IS NULL
        ) AS unread_count
    FROM latest
    JOIN core.users u ON u.id = latest.other_id
    ORDER BY latest.last_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_conversation_messages(p_other_user_id uuid)
RETURNS TABLE (
    id uuid,
    sender_id uuid,
    recipient_id uuid,
    body text,
    created_at timestamptz,
    read_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT dm.id, dm.sender_id, dm.recipient_id, dm.body, dm.created_at, dm.read_at
    FROM core.direct_messages dm
    WHERE (dm.sender_id = v_user_id AND dm.recipient_id = p_other_user_id)
       OR (dm.sender_id = p_other_user_id AND dm.recipient_id = v_user_id)
    ORDER BY dm.created_at ASC
    LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_other_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE core.direct_messages
    SET read_at = now()
    WHERE recipient_id = auth.uid()
      AND sender_id = p_other_user_id
      AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.unread_message_count()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core
AS $$
    SELECT coalesce(count(*)::int, 0)
    FROM core.direct_messages
    WHERE recipient_id = auth.uid()
      AND read_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.list_announcements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_messageable_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_direct_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_broadcast_message(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_conversation_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unread_message_count() TO authenticated;
