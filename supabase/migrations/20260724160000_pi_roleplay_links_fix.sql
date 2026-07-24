-- Fix PI ↔ roleplay links: only use year-scoped rubric criteria.
-- The old "cover" branch cross-joined event_performance_indicators to every
-- scenario year for an event, inflating counts (e.g. BL:003 on all FTDM years).

CREATE OR REPLACE VIEW practice.pi_roleplay_links AS
SELECT DISTINCT
    rc.pi_id,
    rt.event_id,
    rt.year,
    'rubric'::text AS source
FROM rubric.rubric_criteria rc
JOIN rubric.rubric_templates rt ON rt.id = rc.rubric_template_id
WHERE rc.criterion_group = 'performance_indicator'
  AND rc.pi_id IS NOT NULL;

-- Recreate dependent function signatures unchanged; counts now year-accurate.
CREATE OR REPLACE FUNCTION public.get_performance_indicator(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, practice, testbank, events, rubric
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', pi.id,
        'pi_code', pi.pi_code,
        'indicator_text', pi.indicator_text,
        'instructional_area_code', coalesce(ia.code, split_part(pi.pi_code, ':', 1)),
        'instructional_area_name', ia.name,
        'cluster_slug', dominant.cluster_slug,
        'cluster_name', dominant.cluster_name,
        'question_count', coalesce(qc.cnt, 0),
        'roleplay_count', coalesce(rc.cnt, 0),
        'questions', coalesce(questions.data, '[]'::jsonb),
        'roleplay_contexts', coalesce(contexts.data, '[]'::jsonb)
    )
    INTO result
    FROM practice.performance_indicators pi
    LEFT JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
    LEFT JOIN LATERAL (
        SELECT count(*)::int AS cnt FROM testbank.questions q WHERE q.pi_id = pi.id
    ) qc ON true
    LEFT JOIN LATERAL (
        SELECT count(DISTINCT (l.event_id::text || ':' || l.year::text))::int AS cnt
        FROM practice.pi_roleplay_links l WHERE l.pi_id = pi.id
    ) rc ON true
    LEFT JOIN LATERAL (
        SELECT cl.slug AS cluster_slug, cl.name AS cluster_name
        FROM testbank.questions q
        JOIN testbank.exam_questions eq ON eq.question_id = q.id
        JOIN testbank.exams e ON e.id = eq.exam_id
        JOIN practice.clusters cl ON cl.id = e.cluster_id
        WHERE q.pi_id = pi.id
        GROUP BY cl.slug, cl.name
        ORDER BY count(*) DESC
        LIMIT 1
    ) dominant ON true
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(qrow) ORDER BY qrow.exam_year DESC NULLS LAST, qrow.display_order) AS data
        FROM (
            SELECT DISTINCT ON (q.id)
                q.id,
                q.question_text,
                e.exam_code,
                e.year AS exam_year,
                c.name AS cluster_name,
                eq.display_order
            FROM testbank.questions q
            LEFT JOIN testbank.exam_questions eq ON eq.question_id = q.id
            LEFT JOIN testbank.exams e ON e.id = eq.exam_id
            LEFT JOIN practice.clusters c ON c.id = e.cluster_id
            WHERE q.pi_id = pi.id
            ORDER BY q.id, e.year DESC NULLS LAST, eq.display_order
            LIMIT 30
        ) qrow
    ) questions ON true
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(ctx) ORDER BY ctx.year DESC, ctx.event_code) AS data
        FROM (
            SELECT DISTINCT
                e.event_code,
                e.event_name,
                l.year,
                c.name AS cluster_name,
                count(s.id)::int AS scenario_count
            FROM practice.pi_roleplay_links l
            JOIN events.events e ON e.id = l.event_id
            LEFT JOIN practice.clusters c ON c.id = e.cluster_id
            LEFT JOIN events.scenarios s
                ON s.event_id = l.event_id AND s.year = l.year
            WHERE l.pi_id = pi.id
            GROUP BY e.event_code, e.event_name, l.year, c.name
        ) ctx
    ) contexts ON true
    WHERE pi.id = p_id;

    RETURN result;
END;
$$;
