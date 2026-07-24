-- Fix roleplay submission scenario_id and scenario filter empty-string handling.

CREATE OR REPLACE FUNCTION public.list_scenarios(
    p_event_code text DEFAULT NULL,
    p_year int DEFAULT NULL,
    p_level text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_limit int DEFAULT 24,
    p_offset int DEFAULT 0
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
    preview text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice
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
        left(coalesce(s.scenario_title, s.situation_description, ''), 180) AS preview
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
    WHERE (nullif(btrim(p_event_code), '') IS NULL OR e.event_code = upper(btrim(p_event_code)))
      AND (p_year IS NULL OR s.year = p_year)
      AND (nullif(btrim(p_level), '') IS NULL OR s.level = btrim(p_level))
      AND (
          nullif(btrim(p_search), '') IS NULL OR
          coalesce(s.scenario_title, '') ILIKE '%' || btrim(p_search) || '%' OR
          coalesce(s.situation_description, '') ILIKE '%' || btrim(p_search) || '%' OR
          e.event_code ILIKE '%' || btrim(p_search) || '%' OR
          e.event_name ILIKE '%' || btrim(p_search) || '%'
      )
    ORDER BY s.year DESC, e.event_code, s.level, s.scenario_number
    LIMIT greatest(coalesce(p_limit, 24), 1)
    OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_scenario(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice
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
        'pis', coalesce((
            SELECT jsonb_agg(epi.indicator_text ORDER BY epi.display_order)
            FROM events.event_performance_indicators epi
            WHERE epi.event_id = s.event_id
              AND epi.year = s.year
        ), '[]'::jsonb)
    )
    INTO result
    FROM events.scenarios s
    JOIN events.events e ON e.id = s.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    LEFT JOIN practice.instructional_areas ia ON ia.id = s.instructional_area_id
    WHERE s.id = p_id;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.roleplay_submission_row(p_submission rubric.submissions)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = rubric, events, core, public
AS $$
    SELECT jsonb_build_object(
        'id', p_submission.id,
        'user_id', p_submission.user_id,
        'scenario_id', p_submission.scenario_id,
        'scenario_key', coalesce(p_submission.scenario_key, p_submission.scenario_id::text),
        'scenario_title', coalesce(
            sc.scenario_title,
            e.event_code || ' scenario ' || sc.scenario_number::text
        ),
        'event_code', e.event_code,
        'event_name', e.event_name,
        'video_url', p_submission.video_url,
        'video_source', p_submission.video_source,
        'attempt_number', p_submission.attempt_number,
        'status', p_submission.status,
        'submitted_at', p_submission.submitted_at,
        'reviewed_at', p_submission.reviewed_at,
        'duration_seconds', p_submission.duration_seconds,
        'grading_data', p_submission.grading_data,
        'student_name', trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')),
        'student_email', u.email
    )
    FROM core.users u
    LEFT JOIN events.scenarios sc ON sc.id = p_submission.scenario_id
    LEFT JOIN events.events e ON e.id = coalesce(p_submission.event_id, sc.event_id)
    WHERE u.id = p_submission.user_id;
$$;

CREATE OR REPLACE FUNCTION public.create_roleplay_submission(
    p_scenario_key text,
    p_video_url text,
    p_video_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rubric, events, core, public
AS $$
DECLARE
    v_attempt int;
    v_sub rubric.submissions%ROWTYPE;
    v_scenario_id uuid;
    v_event_id uuid;
BEGIN
    IF core.current_user_role() <> 'student' THEN
        RAISE EXCEPTION 'Only students can submit roleplays';
    END IF;

    BEGIN
        v_scenario_id := p_scenario_key::uuid;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid scenario id';
    END;

    SELECT s.id, s.event_id
    INTO v_scenario_id, v_event_id
    FROM events.scenarios s
    WHERE s.id = v_scenario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scenario not found';
    END IF;

    SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt
    FROM rubric.submissions
    WHERE user_id = auth.uid() AND scenario_id = v_scenario_id;

    INSERT INTO rubric.submissions (
        user_id,
        scenario_id,
        event_id,
        scenario_key,
        video_url,
        video_source,
        attempt_number,
        status
    )
    VALUES (
        auth.uid(),
        v_scenario_id,
        v_event_id,
        v_scenario_id::text,
        p_video_url,
        p_video_source,
        v_attempt,
        'submitted'
    )
    RETURNING * INTO v_sub;

    RETURN public.roleplay_submission_row(v_sub);
END;
$$;
