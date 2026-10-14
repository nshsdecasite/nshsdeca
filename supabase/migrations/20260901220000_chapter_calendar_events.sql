-- Chapter calendar: officers/advisors post events; members and the public homepage read them.

CREATE TABLE IF NOT EXISTS core.chapter_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    detail text,
    location text,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz,
    created_by uuid REFERENCES core.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT chapter_events_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
    CONSTRAINT chapter_events_detail_len CHECK (detail IS NULL OR char_length(detail) <= 500),
    CONSTRAINT chapter_events_location_len CHECK (location IS NULL OR char_length(location) <= 160),
    CONSTRAINT chapter_events_ends_after_start CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS chapter_events_starts_at_idx ON core.chapter_events (starts_at);

ALTER TABLE core.chapter_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE core.chapter_events FROM PUBLIC;
REVOKE ALL ON TABLE core.chapter_events FROM anon;
REVOKE ALL ON TABLE core.chapter_events FROM authenticated;

CREATE OR REPLACE FUNCTION public.list_chapter_events()
RETURNS TABLE (
    id uuid,
    title text,
    detail text,
    location text,
    starts_at timestamptz,
    ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
    SELECT e.id, e.title, e.detail, e.location, e.starts_at, e.ends_at
    FROM core.chapter_events e
    WHERE e.starts_at >= (now() - interval '2 hours')
    ORDER BY e.starts_at ASC
    LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.list_all_chapter_events()
RETURNS TABLE (
    id uuid,
    title text,
    detail text,
    location text,
    starts_at timestamptz,
    ends_at timestamptz,
    created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
    IF public.get_my_role() NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can manage the calendar';
    END IF;

    RETURN QUERY
    SELECT e.id, e.title, e.detail, e.location, e.starts_at, e.ends_at, e.created_at
    FROM core.chapter_events e
    ORDER BY e.starts_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_chapter_event(
    p_title text,
    p_detail text DEFAULT NULL,
    p_location text DEFAULT NULL,
    p_starts_at timestamptz DEFAULT NULL,
    p_ends_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
    v_id uuid;
    v_title text := btrim(coalesce(p_title, ''));
    v_detail text := nullif(btrim(coalesce(p_detail, '')), '');
    v_location text := nullif(btrim(coalesce(p_location, '')), '');
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can add calendar events';
    END IF;

    IF v_title = '' THEN
        RAISE EXCEPTION 'Title is required';
    END IF;

    IF p_starts_at IS NULL THEN
        RAISE EXCEPTION 'Start time is required';
    END IF;

    INSERT INTO core.chapter_events (
        title, detail, location, starts_at, ends_at, created_by
    )
    VALUES (v_title, v_detail, v_location, p_starts_at, p_ends_at, v_user_id)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_chapter_event(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
    v_role text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can delete calendar events';
    END IF;

    DELETE FROM core.chapter_events WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_chapter_events() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_all_chapter_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chapter_event(text, text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_chapter_event(uuid) TO authenticated;
