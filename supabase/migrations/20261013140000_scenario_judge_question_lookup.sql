-- Official role-plays already store judge questions on events.scenario_judge_questions.

CREATE OR REPLACE FUNCTION public.get_scenario(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, rubric
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
    WHERE s.id = p_id;

    RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
