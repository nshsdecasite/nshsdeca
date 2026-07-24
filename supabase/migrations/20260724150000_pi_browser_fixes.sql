-- Fix PI browser filter (match IA from pi_code prefix) and PI detail JSON aggregation.

CREATE OR REPLACE FUNCTION public.list_performance_indicators(
    p_search text DEFAULT NULL,
    p_ia_code text DEFAULT NULL,
    p_cluster_slug text DEFAULT NULL,
    p_limit int DEFAULT 48,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    pi_code text,
    indicator_text text,
    instructional_area_code text,
    instructional_area_name text,
    cluster_slug text,
    cluster_name text,
    question_count int,
    roleplay_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, practice, testbank, events
AS $$
    SELECT
        pi.id,
        pi.pi_code,
        pi.indicator_text,
        coalesce(ia.code, split_part(pi.pi_code, ':', 1)) AS instructional_area_code,
        ia.name AS instructional_area_name,
        NULL::text AS cluster_slug,
        NULL::text AS cluster_name,
        coalesce(qc.cnt, 0)::int AS question_count,
        coalesce(rc.cnt, 0)::int AS roleplay_count
    FROM practice.performance_indicators pi
    LEFT JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
    LEFT JOIN LATERAL (
        SELECT count(*)::int AS cnt
        FROM testbank.questions q
        WHERE q.pi_id = pi.id
    ) qc ON true
    LEFT JOIN LATERAL (
        SELECT count(DISTINCT (l.event_id::text || ':' || l.year::text))::int AS cnt
        FROM practice.pi_roleplay_links l
        WHERE l.pi_id = pi.id
    ) rc ON true
    WHERE (p_search IS NULL OR btrim(p_search) = '' OR
           pi.pi_code ILIKE '%' || p_search || '%' OR
           pi.indicator_text ILIKE '%' || p_search || '%')
      AND (
          p_ia_code IS NULL OR btrim(p_ia_code) = '' OR
          ia.code = upper(p_ia_code) OR
          split_part(pi.pi_code, ':', 1) = upper(p_ia_code)
      )
      AND (
          p_cluster_slug IS NULL OR btrim(p_cluster_slug) = '' OR
          EXISTS (
              SELECT 1
              FROM testbank.questions q
              JOIN testbank.exam_questions eq ON eq.question_id = q.id
              JOIN testbank.exams e ON e.id = eq.exam_id
              JOIN practice.clusters cl ON cl.id = e.cluster_id
              WHERE q.pi_id = pi.id AND cl.slug = p_cluster_slug
          ) OR
          EXISTS (
              SELECT 1
              FROM practice.pi_roleplay_links l
              JOIN events.events ev ON ev.id = l.event_id
              JOIN practice.clusters cl ON cl.id = ev.cluster_id
              WHERE l.pi_id = pi.id AND cl.slug = p_cluster_slug
          )
      )
    ORDER BY pi.pi_code
    LIMIT greatest(coalesce(p_limit, 48), 1)
    OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

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

-- Populate instructional_area_id from pi_code prefix where missing.
UPDATE practice.performance_indicators pi
SET instructional_area_id = ia.id
FROM practice.instructional_areas ia
WHERE pi.instructional_area_id IS NULL
  AND ia.code = split_part(pi.pi_code, ':', 1);

GRANT EXECUTE ON FUNCTION public.list_performance_indicators(text, text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_indicator(uuid) TO authenticated;
