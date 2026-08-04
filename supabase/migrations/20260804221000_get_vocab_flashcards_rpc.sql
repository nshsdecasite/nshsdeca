CREATE OR REPLACE FUNCTION public.get_vocab_flashcards()
RETURNS TABLE (
  id uuid,
  term text,
  definition text,
  set_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = content, public
AS $$
  SELECT
    f.id,
    f.front_text AS term,
    f.back_text AS definition,
    s.title AS set_title
  FROM content.flashcards f
  JOIN content.flashcard_sets s ON s.id = f.set_id
  WHERE s.set_type = 'vocab'
    AND s.title = 'DECA Business Vocabulary'
  ORDER BY f.front_text;
$$;

GRANT EXECUTE ON FUNCTION public.get_vocab_flashcards() TO anon, authenticated, service_role;
