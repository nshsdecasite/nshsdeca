-- Load roleplay performance indicators from rubric criteria + practice.performance_indicators.

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
        'pis', public.scenario_performance_indicators(s.event_id, s.year)
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

CREATE OR REPLACE FUNCTION public.scenario_performance_indicators(
    p_event_id uuid,
    p_year int
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, rubric
AS $$
    SELECT coalesce(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'pi_id', coalesce(rc.pi_id, pi.id),
                    'pi_code', pi.pi_code,
                    'indicator_text', coalesce(pi.indicator_text, rc.criterion_text),
                    'display_order', rc.display_order
                )
                ORDER BY rc.display_order
            )
            FROM rubric.rubric_templates rt
            JOIN rubric.rubric_criteria rc ON rc.rubric_template_id = rt.id
            LEFT JOIN practice.performance_indicators pi ON pi.id = rc.pi_id
            WHERE rt.event_id = p_event_id
              AND rt.year = p_year
              AND rc.criterion_group = 'performance_indicator'
        ),
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'pi_id', epi.pi_id,
                    'pi_code', pi.pi_code,
                    'indicator_text', coalesce(pi.indicator_text, pi.pi_code),
                    'display_order', epi.display_order
                )
                ORDER BY epi.display_order
            )
            FROM (
                SELECT epi.pi_id, epi.display_order
                FROM events.event_performance_indicators epi
                WHERE epi.event_id = p_event_id
                ORDER BY epi.display_order
                LIMIT 5
            ) epi
            LEFT JOIN practice.performance_indicators pi ON pi.id = epi.pi_id
        ),
        '[]'::jsonb
    );
$$;

GRANT EXECUTE ON FUNCTION public.scenario_performance_indicators(uuid, int) TO authenticated;
