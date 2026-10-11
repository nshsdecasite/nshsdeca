-- Scenario library filters by instructional area instead of cluster.

CREATE OR REPLACE FUNCTION public.list_scenario_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, events, practice
AS $$
    SELECT jsonb_build_object(
        'years', (
            SELECT coalesce(jsonb_agg(y ORDER BY y DESC), '[]'::jsonb)
            FROM (SELECT DISTINCT year AS y FROM events.scenarios) years
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
            ) areas
        ),
        'levels', to_jsonb(ARRAY['district', 'state', 'icdc']::text[])
    );
$$;
