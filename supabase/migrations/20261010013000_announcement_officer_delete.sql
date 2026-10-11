-- Any officer/advisor can delete chapter announcements.
-- Also reject empty announcement bodies at the database layer.

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
    v_message text := btrim(coalesce(p_message, ''));
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can post announcements';
    END IF;

    IF v_message = '' THEN
        RAISE EXCEPTION 'Message is required';
    END IF;

    IF p_visible_to NOT IN ('all', 'students', 'officers') THEN
        RAISE EXCEPTION 'Invalid visibility';
    END IF;

    INSERT INTO core.announcements (author_id, message, visible_to, expires_at)
    VALUES (v_user_id, v_message, p_visible_to, p_expires_at)
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can delete announcements';
    END IF;

    DELETE FROM core.announcements
    WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Announcement not found';
    END IF;
END;
$$;
