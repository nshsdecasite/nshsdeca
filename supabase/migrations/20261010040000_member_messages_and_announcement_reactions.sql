-- Any chapter member can start a direct message with any other member.
-- Announcements accept a small set of emoji reactions.

CREATE TABLE IF NOT EXISTS core.announcement_reactions (
    announcement_id uuid NOT NULL REFERENCES core.announcements(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    reaction        text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (announcement_id, user_id, reaction),
    CONSTRAINT announcement_reactions_known CHECK (
        reaction IN ('like', 'love', 'laugh', 'celebrate', 'eyes')
    )
);

ALTER TABLE core.announcement_reactions ENABLE ROW LEVEL SECURITY;

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
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.grade_level
    FROM core.users u
    WHERE u.id <> v_user_id
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

    IF NOT EXISTS (SELECT 1 FROM core.users u WHERE u.id = p_recipient_id) THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    INSERT INTO core.direct_messages (sender_id, recipient_id, body)
    VALUES (v_user_id, p_recipient_id, v_body)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;

DROP FUNCTION IF EXISTS public.list_announcements();

CREATE FUNCTION public.list_announcements()
RETURNS TABLE (
    id uuid,
    message text,
    visible_to text,
    created_at timestamptz,
    expires_at timestamptz,
    author_name text,
    reactions jsonb
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
        trim(both ' ' FROM coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) AS author_name,
        coalesce((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'reaction', grouped.reaction,
                    'count', grouped.reaction_count,
                    'mine', grouped.mine
                )
                ORDER BY grouped.reaction
            )
            FROM (
                SELECT
                    r.reaction,
                    count(*)::int AS reaction_count,
                    bool_or(r.user_id = auth.uid()) AS mine
                FROM core.announcement_reactions r
                WHERE r.announcement_id = a.id
                GROUP BY r.reaction
            ) grouped
        ), '[]'::jsonb) AS reactions
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

CREATE OR REPLACE FUNCTION public.toggle_announcement_reaction(
    p_announcement_id uuid,
    p_reaction text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_visible text;
    v_author uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_reaction NOT IN ('like', 'love', 'laugh', 'celebrate', 'eyes') THEN
        RAISE EXCEPTION 'Unknown reaction';
    END IF;

    SELECT a.visible_to, a.author_id
    INTO v_visible, v_author
    FROM core.announcements a
    WHERE a.id = p_announcement_id
      AND (a.expires_at IS NULL OR a.expires_at > now());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Announcement not found';
    END IF;

    IF NOT (
        v_author = v_user_id OR
        v_visible = 'all' OR
        (v_visible = 'students' AND coalesce(public.get_my_role(), 'student') = 'student') OR
        (v_visible = 'officers' AND public.get_my_role() IN ('officer', 'advisor'))
    ) THEN
        RAISE EXCEPTION 'Announcement not found';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM core.announcement_reactions r
        WHERE r.announcement_id = p_announcement_id
          AND r.user_id = v_user_id
          AND r.reaction = p_reaction
    ) THEN
        DELETE FROM core.announcement_reactions
        WHERE announcement_id = p_announcement_id
          AND user_id = v_user_id
          AND reaction = p_reaction;
    ELSE
        INSERT INTO core.announcement_reactions (announcement_id, user_id, reaction)
        VALUES (p_announcement_id, v_user_id, p_reaction);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_announcements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_announcement_reaction(uuid, text) TO authenticated;
