-- Creates a core.users profile when a Supabase Auth user registers.
-- Called from the Next.js signup server action via service role RPC.

CREATE OR REPLACE FUNCTION public.register_core_user(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_grade_level int,
  p_school_name text,
  p_chapter_name text,
  p_state text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  SELECT id INTO v_chapter_id FROM core.chapters
  WHERE school_name = p_school_name AND chapter_name = p_chapter_name
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    INSERT INTO core.chapters (school_name, chapter_name, state)
    VALUES (p_school_name, p_chapter_name, p_state)
    RETURNING id INTO v_chapter_id;
  END IF;

  INSERT INTO core.users (id, first_name, last_name, email, password_hash, role, grade_level, chapter_id)
  VALUES (p_user_id, p_first_name, p_last_name, p_email, 'supabase_auth', 'student', p_grade_level, v_chapter_id)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    grade_level = EXCLUDED.grade_level,
    chapter_id = EXCLUDED.chapter_id;
END;
$$;
