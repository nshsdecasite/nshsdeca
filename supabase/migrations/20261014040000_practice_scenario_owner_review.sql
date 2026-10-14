-- Generated practice events belong to the member who created them.
-- They stay private unless that member sends them to officers for review.

ALTER TABLE events.scenarios
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

UPDATE events.scenarios
SET review_status = 'private'
WHERE level = 'practice'
  AND review_status IS NULL;

ALTER TABLE events.scenarios
  DROP CONSTRAINT IF EXISTS scenarios_review_status_check;

ALTER TABLE events.scenarios
  ADD CONSTRAINT scenarios_review_status_check
  CHECK (
    (level IS DISTINCT FROM 'practice' AND review_status IS NULL)
    OR (level = 'practice' AND review_status IN ('private', 'pending_review'))
  );

CREATE INDEX IF NOT EXISTS scenarios_practice_owner_idx
  ON events.scenarios (created_by)
  WHERE level = 'practice';

CREATE INDEX IF NOT EXISTS scenarios_practice_review_idx
  ON events.scenarios (review_status)
  WHERE level = 'practice' AND review_status = 'pending_review';

CREATE OR REPLACE FUNCTION events.can_access_scenario(
  p_level text,
  p_created_by uuid,
  p_review_status text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    p_level IS DISTINCT FROM 'practice'
    OR (
      auth.uid() IS NOT NULL
      AND (
        p_created_by = auth.uid()
        OR (
          p_review_status = 'pending_review'
          AND core.current_user_role() IN ('officer', 'advisor')
        )
        OR (
          p_created_by IS NULL
          AND core.current_user_role() IN ('officer', 'advisor')
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION events.can_access_scenario(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION events.can_access_scenario(text, uuid, text) TO authenticated;

ALTER TABLE events.scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scenarios_select ON events.scenarios;
CREATE POLICY scenarios_select ON events.scenarios
  FOR SELECT TO authenticated
  USING (events.can_access_scenario(level, created_by, review_status));

CREATE OR REPLACE FUNCTION public.save_practice_scenario(
    p_event_code text,
    p_instructional_area_code text,
    p_instructional_area_name text,
    p_career_pathway text,
    p_title text,
    p_situation text,
    p_judge text,
    p_solution text,
    p_question_1 text,
    p_question_2 text,
    p_indicators jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, events, practice, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_event_id uuid;
    v_ia_id uuid;
    v_number int;
    v_id uuid;
    v_year int := 2026;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT id INTO v_event_id
    FROM events.events
    WHERE event_code = upper(btrim(p_event_code));

    IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    SELECT id INTO v_ia_id
    FROM practice.instructional_areas
    WHERE code = upper(btrim(coalesce(p_instructional_area_code, '')))
       OR name ILIKE btrim(coalesce(p_instructional_area_name, ''))
    ORDER BY (code = upper(btrim(coalesce(p_instructional_area_code, '')))) DESC
    LIMIT 1;

    PERFORM pg_advisory_xact_lock(hashtext('practice-scenario:' || v_event_id::text)::bigint);

    SELECT coalesce(max(scenario_number), 0) + 1
    INTO v_number
    FROM events.scenarios
    WHERE event_id = v_event_id
      AND year = v_year
      AND level = 'practice';

    INSERT INTO events.scenarios (
        event_id,
        year,
        level,
        scenario_number,
        instructional_area_id,
        career_pathway,
        scenario_title,
        situation_description,
        judge_characterization,
        solution_text,
        judge_question_1,
        judge_question_2,
        created_by,
        review_status
    )
    VALUES (
        v_event_id,
        v_year,
        'practice',
        v_number,
        v_ia_id,
        nullif(btrim(coalesce(p_career_pathway, '')), ''),
        nullif(btrim(coalesce(p_title, '')), ''),
        p_situation,
        p_judge,
        p_solution,
        nullif(btrim(coalesce(p_question_1, '')), ''),
        nullif(btrim(coalesce(p_question_2, '')), ''),
        v_user_id,
        'private'
    )
    RETURNING id INTO v_id;

    INSERT INTO events.scenario_indicators (
        scenario_id,
        pi_id,
        pi_code,
        indicator_text,
        display_order
    )
    SELECT
        v_id,
        pi.id,
        left(nullif(btrim(item->>'code'), ''), 40),
        left(coalesce(nullif(btrim(item->>'text'), ''), pi.indicator_text), 2000),
        coalesce(nullif(item->>'order', '')::int, t.ord::int)
    FROM jsonb_array_elements(coalesce(p_indicators, '[]'::jsonb)) WITH ORDINALITY AS t(item, ord)
    LEFT JOIN practice.performance_indicators pi
        ON pi.pi_code = nullif(btrim(item->>'code'), '')
    WHERE coalesce(nullif(btrim(item->>'text'), ''), pi.indicator_text) IS NOT NULL;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_practice_scenario_for_review(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, events, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE events.scenarios
    SET review_status = 'pending_review',
        submitted_for_review_at = now()
    WHERE id = p_id
      AND level = 'practice'
      AND created_by = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Practice event not found';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_practice_scenario_review(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, events, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE events.scenarios
    SET review_status = 'private',
        submitted_for_review_at = NULL
    WHERE id = p_id
      AND level = 'practice'
      AND created_by = v_user_id
      AND review_status = 'pending_review';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Practice event not found';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_practice_review_queue()
RETURNS TABLE (
    id uuid,
    event_code text,
    event_name text,
    year int,
    scenario_title text,
    preview text,
    created_by uuid,
    creator_name text,
    submitted_for_review_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, core
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF core.current_user_role() NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Not allowed';
    END IF;

    RETURN QUERY
    SELECT
        s.id,
        e.event_code,
        e.event_name,
        s.year,
        s.scenario_title,
        left(coalesce(s.scenario_title, s.situation_description, ''), 180) AS preview,
        s.created_by,
        nullif(btrim(coalesce(u.username, u.first_name, '')), '') AS creator_name,
        s.submitted_for_review_at
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN core.users u ON u.id = s.created_by
    WHERE s.level = 'practice'
      AND s.review_status = 'pending_review'
    ORDER BY s.submitted_for_review_at DESC NULLS LAST, s.scenario_title;
END;
$$;

DROP FUNCTION IF EXISTS public.list_scenarios(text, int, text, text, int, int, text);

CREATE OR REPLACE FUNCTION public.list_scenarios(
    p_event_code text DEFAULT NULL,
    p_year int DEFAULT NULL,
    p_level text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_limit int DEFAULT 24,
    p_offset int DEFAULT 0,
    p_cluster_slug text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    event_code text,
    event_name text,
    cluster_name text,
    year int,
    level text,
    scenario_number int,
    scenario_title text,
    instructional_area_code text,
    career_pathway text,
    preview text,
    review_status text,
    created_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, core
AS $$
    SELECT
        s.id,
        e.event_code,
        e.event_name,
        c.name AS cluster_name,
        s.year,
        s.level,
        s.scenario_number,
        s.scenario_title,
        ia.code AS instructional_area_code,
        s.career_pathway,
        left(coalesce(s.scenario_title, s.situation_description, ''), 180) AS preview,
        s.review_status,
        s.created_by
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
    WHERE events.can_access_scenario(s.level, s.created_by, s.review_status)
      AND (nullif(btrim(p_event_code), '') IS NULL OR e.event_code = upper(btrim(p_event_code)))
      AND (p_year IS NULL OR s.year = p_year)
      AND (nullif(btrim(p_level), '') IS NULL OR s.level = btrim(p_level))
      AND (nullif(btrim(p_cluster_slug), '') IS NULL OR c.slug = p_cluster_slug)
      AND (
          nullif(btrim(p_search), '') IS NULL OR
          coalesce(s.scenario_title, '') ILIKE '%' || btrim(p_search) || '%' OR
          coalesce(s.situation_description, '') ILIKE '%' || btrim(p_search) || '%' OR
          e.event_code ILIKE '%' || btrim(p_search) || '%' OR
          e.event_name ILIKE '%' || btrim(p_search) || '%' OR
          EXISTS (
              SELECT 1
              FROM practice.pi_roleplay_links l
              JOIN practice.performance_indicators pi ON pi.id = l.pi_id
              WHERE l.event_id = e.id
                AND l.year = s.year
                AND (
                    pi.pi_code ILIKE '%' || btrim(p_search) || '%' OR
                    pi.indicator_text ILIKE '%' || btrim(p_search) || '%'
                )
          )
      )
    ORDER BY s.year DESC, e.event_code, s.level, s.scenario_number
    LIMIT greatest(coalesce(p_limit, 24), 1)
    OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.list_scenario_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, core
AS $$
    SELECT jsonb_build_object(
        'years', (
            SELECT coalesce(jsonb_agg(y ORDER BY y DESC), '[]'::jsonb)
            FROM (
                SELECT DISTINCT s.year AS y
                FROM events.scenarios s
                WHERE events.can_access_scenario(s.level, s.created_by, s.review_status)
            ) years
        ),
        'events', (
            SELECT coalesce(jsonb_agg(evt ORDER BY evt->>'event_code'), '[]'::jsonb)
            FROM (
                SELECT DISTINCT jsonb_build_object(
                    'event_code', e.event_code,
                    'event_name', e.event_name
                ) AS evt
                FROM events.scenarios s
                JOIN events.events e ON e.id = s.event_id
                WHERE events.can_access_scenario(s.level, s.created_by, s.review_status)
            ) events
        ),
        'instructional_areas', (
            SELECT coalesce(jsonb_agg(area ORDER BY area->>'code'), '[]'::jsonb)
            FROM (
                SELECT DISTINCT jsonb_build_object(
                    'code', ia.code,
                    'name', ia.name
                ) AS area
                FROM events.scenarios s
                JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
                WHERE ia.code IS NOT NULL
                  AND events.can_access_scenario(s.level, s.created_by, s.review_status)
            ) areas
        ),
        'levels', to_jsonb(ARRAY['district', 'state', 'icdc']::text[])
    );
$$;

CREATE OR REPLACE FUNCTION public.get_scenario(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, rubric, core
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', s.id,
        'event_code', e.event_code,
        'event_name', e.event_name,
        'cluster_name', c.name,
        'year', s.year,
        'level', s.level,
        'scenario_number', s.scenario_number,
        'scenario_title', s.scenario_title,
        'instructional_area_code', ia.code,
        'instructional_area_name', ia.name,
        'career_pathway', s.career_pathway,
        'situation_description', s.situation_description,
        'judge_characterization', s.judge_characterization,
        'solution_text', s.solution_text,
        'source_url', s.source_url,
        'created_by', s.created_by,
        'review_status', s.review_status,
        'is_owner', s.created_by IS NOT NULL AND s.created_by = auth.uid(),
        'creator_name', CASE
            WHEN s.created_by = auth.uid()
              OR core.current_user_role() IN ('officer', 'advisor')
            THEN nullif(btrim(coalesce(u.username, u.first_name, '')), '')
            ELSE NULL
        END,
        'judge_question_1', coalesce(
            nullif(btrim(s.judge_question_1), ''),
            (
                SELECT regexp_replace(q.question_text, '[[:space:]]+', ' ', 'g')
                FROM events.scenario_judge_questions q
                WHERE q.scenario_id = s.id
                ORDER BY q.display_order
                LIMIT 1
            )
        ),
        'judge_question_2', coalesce(
            nullif(btrim(s.judge_question_2), ''),
            (
                SELECT regexp_replace(q.question_text, '[[:space:]]+', ' ', 'g')
                FROM events.scenario_judge_questions q
                WHERE q.scenario_id = s.id
                ORDER BY q.display_order
                OFFSET 1
                LIMIT 1
            )
        ),
        'pis', CASE
            WHEN EXISTS (
                SELECT 1 FROM events.scenario_indicators si WHERE si.scenario_id = s.id
            ) THEN (
                SELECT coalesce(jsonb_agg(
                    jsonb_build_object(
                        'pi_id', si.pi_id,
                        'pi_code', coalesce(pi.pi_code, si.pi_code),
                        'indicator_text', coalesce(pi.indicator_text, si.indicator_text),
                        'display_order', si.display_order
                    )
                    ORDER BY si.display_order
                ), '[]'::jsonb)
                FROM events.scenario_indicators si
                LEFT JOIN practice.performance_indicators pi ON pi.id = si.pi_id
                WHERE si.scenario_id = s.id
            )
            ELSE public.scenario_performance_indicators(s.event_id, s.year)
        END,
        'rubric', public.scenario_rubric(s.event_id, s.year)
    )
    INTO result
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
    LEFT JOIN core.users u ON u.id = s.created_by
    WHERE s.id = p_id
      AND events.can_access_scenario(s.level, s.created_by, s.review_status);

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_practice_scenario_for_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_practice_scenario_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_practice_review_queue() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_scenarios(text, int, text, text, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_practice_scenario_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_practice_scenario_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_practice_review_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_practice_scenario(text, text, text, text, text, text, text, text, text, text, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
