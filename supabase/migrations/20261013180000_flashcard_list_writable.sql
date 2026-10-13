-- list_pi_flashcard_sets was STABLE, so Postgres ran it read-only.
-- It calls ensure_pi_flashcard_sets(), which inserts missing cards.

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
