-- Expose evaluation-form point scales so grading uses rubric numbers, not labels.

CREATE OR REPLACE FUNCTION public.scenario_rubric(p_event_id uuid, p_year int)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice, rubric
AS $$
    SELECT (
        SELECT jsonb_build_object(
            'template_id', rt.id,
            'title', rt.title,
            'max_total_points', rt.max_total_points::int,
            'criteria', coalesce((
                SELECT jsonb_agg(criteria.criterion ORDER BY criteria.display_order)
                FROM (
                    SELECT jsonb_build_object(
                        'id', rc.id,
                        'display_order', rc.display_order,
                        'criterion_group', rc.criterion_group,
                        'criterion_text', rc.criterion_text,
                        'pi_id', rc.pi_id,
                        'pi_code', pi.pi_code,
                        'max_points', rc.max_points::int,
                        'levels', coalesce((
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'id', rl.id,
                                    'level_name', rl.level_name,
                                    'min_points', rl.min_points::int,
                                    'max_points', rl.max_points::int,
                                    'level_order', rl.level_order
                                )
                                ORDER BY rl.level_order
                            )
                            FROM rubric.rubric_levels rl
                            WHERE rl.criterion_id = rc.id
                        ), '[]'::jsonb)
                    ) AS criterion,
                    rc.display_order
                    FROM rubric.rubric_criteria rc
                    LEFT JOIN practice.performance_indicators pi ON pi.id = rc.pi_id
                    WHERE rc.rubric_template_id = rt.id
                ) criteria
            ), '[]'::jsonb)
        )
        FROM rubric.rubric_templates rt
        WHERE rt.event_id = p_event_id
          AND rt.year = p_year
        LIMIT 1
    );
$$;

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
        'pis', public.scenario_performance_indicators(s.event_id, s.year),
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

GRANT EXECUTE ON FUNCTION public.scenario_rubric(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scenario_rubric(uuid, int) TO anon;
