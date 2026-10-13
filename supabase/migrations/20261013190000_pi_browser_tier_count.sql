-- PI browser: count every match, and filter by official Tier 1–3 pools.

DROP FUNCTION IF EXISTS public.list_performance_indicators(text, text, text, integer, integer, text);

CREATE FUNCTION public.list_performance_indicators(
    p_search text DEFAULT NULL,
    p_ia_code text DEFAULT NULL,
    p_cluster_slug text DEFAULT NULL,
    p_limit int DEFAULT 48,
    p_offset int DEFAULT 0,
    p_event_code text DEFAULT NULL,
    p_tier int DEFAULT NULL
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
    roleplay_count int,
    total_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, practice, testbank, events
AS $$
    WITH filtered AS (
        SELECT
            pi.id,
            pi.pi_code,
            pi.indicator_text,
            coalesce(ia.code, split_part(pi.pi_code, ':', 1)) AS instructional_area_code,
            ia.name AS instructional_area_name
        FROM practice.performance_indicators pi
        LEFT JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
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
          AND (
              p_event_code IS NULL OR btrim(p_event_code) = '' OR
              EXISTS (
                  SELECT 1
                  FROM events.event_performance_indicators epi
                  JOIN events.events ev ON ev.id = epi.event_id
                  WHERE epi.pi_id = pi.id AND ev.event_code = upper(btrim(p_event_code))
              )
          )
          AND (
              p_tier IS NULL OR p_tier NOT IN (1, 2, 3) OR
              EXISTS (
                  SELECT 1
                  FROM practice.pi_pool_membership m
                  WHERE m.pi_code = pi.pi_code
                    AND m.pool LIKE 'T' || p_tier::text || ':%'
              )
          )
    ),
    totals AS (
        SELECT count(*)::int AS total_count FROM filtered
    ),
    page AS (
        SELECT *
        FROM filtered
        ORDER BY pi_code
        LIMIT greatest(coalesce(p_limit, 48), 1)
        OFFSET greatest(coalesce(p_offset, 0), 0)
    )
    SELECT
        page.id,
        page.pi_code,
        page.indicator_text,
        page.instructional_area_code,
        page.instructional_area_name,
        NULL::text AS cluster_slug,
        NULL::text AS cluster_name,
        coalesce((
            SELECT count(*)::int
            FROM testbank.questions q
            WHERE q.pi_id = page.id
        ), 0) AS question_count,
        coalesce((
            SELECT count(DISTINCT (l.event_id::text || ':' || l.year::text))::int
            FROM practice.pi_roleplay_links l
            WHERE l.pi_id = page.id
        ), 0) AS roleplay_count,
        totals.total_count
    FROM totals
    LEFT JOIN page ON true
    ORDER BY page.pi_code NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.list_performance_indicators(text, text, text, integer, integer, text, integer) TO PUBLIC, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
