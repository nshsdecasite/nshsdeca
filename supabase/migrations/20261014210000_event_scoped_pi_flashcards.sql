-- Limit PI flashcard sets and cards to the member's competitive event PI pool.
-- Pool: events.event_performance_indicators → events.events.event_code = core.users.event_code.

CREATE OR REPLACE FUNCTION public.list_pi_flashcard_sets()
RETURNS TABLE (
    id uuid,
    title text,
    instructional_area_code text,
    card_count bigint,
    known_count bigint
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, content, practice, events, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_event_code text;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT nullif(btrim(u.event_code), '')
    INTO v_event_code
    FROM core.users u
    WHERE u.id = v_user_id;

    IF v_event_code IS NULL THEN
        RETURN;
    END IF;

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
    JOIN content.flashcards fc
      ON fc.set_id = fs.id
     AND fc.pi_id IN (
            SELECT epi.pi_id
            FROM events.event_performance_indicators epi
            JOIN events.events ev ON ev.id = epi.event_id
            WHERE ev.event_code = v_event_code
        )
    LEFT JOIN content.user_flashcard_progress ufp
        ON ufp.flashcard_id = fc.id AND ufp.user_id = v_user_id
    WHERE fs.set_type = 'pi'
    GROUP BY fs.id, fs.title, ia.code
    HAVING count(fc.id) > 0
    ORDER BY ia.code NULLS LAST, fs.title;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pi_flashcard_set(p_set_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, content, practice, events, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_event_code text;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT nullif(btrim(u.event_code), '')
    INTO v_event_code
    FROM core.users u
    WHERE u.id = v_user_id;

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
                  AND v_event_code IS NOT NULL
                  AND fc.pi_id IN (
                        SELECT epi.pi_id
                        FROM events.event_performance_indicators epi
                        JOIN events.events ev ON ev.id = epi.event_id
                        WHERE ev.event_code = v_event_code
                    )
            ), '[]'::jsonb)
        )
        FROM content.flashcard_sets fs
        WHERE fs.id = p_set_id AND fs.set_type = 'pi'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_pi_flashcard_sets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pi_flashcard_set(uuid) TO authenticated;
