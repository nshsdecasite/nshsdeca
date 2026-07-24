-- Backfill PI links on roleplay rubrics/covers and expose PI browser RPCs.

CREATE INDEX IF NOT EXISTS idx_questions_pi_id ON testbank.questions(pi_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_pi_id ON rubric.rubric_criteria(pi_id);
CREATE INDEX IF NOT EXISTS idx_event_pis_pi_id ON events.event_performance_indicators(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_instructional_area ON practice.performance_indicators(instructional_area_id);

-- Normalize helper for fuzzy text matching (truncated rubric lines).
CREATE OR REPLACE FUNCTION practice.normalize_pi_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT lower(regexp_replace(btrim(coalesce(p_text, '')), '\s+', ' ', 'g'));
$$;

-- 1) Exact text matches
UPDATE rubric.rubric_criteria rc
SET pi_id = pi.id
FROM practice.performance_indicators pi
WHERE rc.criterion_group = 'performance_indicator'
  AND rc.pi_id IS NULL
  AND practice.normalize_pi_text(rc.criterion_text) = practice.normalize_pi_text(pi.indicator_text);

-- event_performance_indicators on live DB links by pi_id only (no indicator_text column).

-- 2) Prefix matches for truncated rubric/cover text
UPDATE rubric.rubric_criteria rc
SET pi_id = matched.pi_id
FROM (
    SELECT DISTINCT ON (rc2.id)
        rc2.id AS criterion_id,
        pi.id AS pi_id
    FROM rubric.rubric_criteria rc2
    JOIN practice.performance_indicators pi
      ON practice.normalize_pi_text(pi.indicator_text)
         LIKE practice.normalize_pi_text(rc2.criterion_text) || '%'
    WHERE rc2.criterion_group = 'performance_indicator'
      AND rc2.pi_id IS NULL
      AND length(btrim(rc2.criterion_text)) >= 15
    ORDER BY rc2.id, length(pi.indicator_text) ASC
) matched
WHERE rc.id = matched.criterion_id
  AND rc.pi_id IS NULL;

-- Resolved PI ↔ roleplay event/year links (direct pi_id matches after backfill).
CREATE OR REPLACE VIEW practice.pi_roleplay_links AS
SELECT DISTINCT
    rc.pi_id,
    rt.event_id,
    rt.year,
    'rubric'::text AS source
FROM rubric.rubric_criteria rc
JOIN rubric.rubric_templates rt ON rt.id = rc.rubric_template_id
WHERE rc.criterion_group = 'performance_indicator'
  AND rc.pi_id IS NOT NULL

UNION

SELECT DISTINCT
    epi.pi_id,
    epi.event_id,
    s.year,
    'cover'::text AS source
FROM events.event_performance_indicators epi
JOIN events.scenarios s ON s.event_id = epi.event_id
WHERE epi.pi_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.list_pi_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, practice
AS $$
    SELECT jsonb_build_object(
        'instructional_areas', (
            SELECT coalesce(jsonb_agg(row_to_json(ia) ORDER BY ia.code), '[]'::jsonb)
            FROM (
                SELECT DISTINCT ia.code, ia.name
                FROM practice.performance_indicators pi
                JOIN practice.instructional_areas ia ON ia.id = pi.instructional_area_id
            ) ia
        ),
        'clusters', (
            SELECT coalesce(jsonb_agg(row_to_json(c) ORDER BY c.slug), '[]'::jsonb)
            FROM (
                SELECT DISTINCT cl.slug, cl.name
                FROM testbank.questions q
                JOIN testbank.exam_questions eq ON eq.question_id = q.id
                JOIN testbank.exams e ON e.id = eq.exam_id
                JOIN practice.clusters cl ON cl.id = e.cluster_id
                WHERE q.pi_id IS NOT NULL
            ) c
        )
    );
$$;

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
        ia.code AS instructional_area_code,
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
      AND (p_ia_code IS NULL OR btrim(p_ia_code) = '' OR ia.code = upper(p_ia_code))
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
        'instructional_area_code', ia.code,
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
        SELECT jsonb_agg(row_to_json(qrow) ORDER BY qrow->>'exam_year' DESC, (qrow->>'display_order')::int) AS data
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
        SELECT jsonb_agg(row_to_json(ctx) ORDER BY ctx->>'year' DESC, ctx->>'event_code') AS data
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

-- Include pi_id on test session questions for cross-linking.
CREATE OR REPLACE FUNCTION public.get_test_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, testbank, practice
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_session record;
    v_completed boolean;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT
        ts.id,
        ts.session_type,
        ts.exam_id,
        e.exam_code,
        e.title AS exam_title,
        e.year AS exam_year,
        c.name AS cluster_name,
        ts.started_at,
        ts.completed_at,
        ts.score,
        ts.total_questions
    INTO v_session
    FROM testbank.test_sessions ts
    LEFT JOIN testbank.exams e ON e.id = ts.exam_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
    WHERE ts.id = p_session_id AND ts.user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_completed := v_session.completed_at IS NOT NULL;

    RETURN jsonb_build_object(
        'id', v_session.id,
        'session_type', v_session.session_type,
        'exam_id', v_session.exam_id,
        'exam_code', v_session.exam_code,
        'exam_title', v_session.exam_title,
        'exam_year', v_session.exam_year,
        'cluster_name', v_session.cluster_name,
        'started_at', v_session.started_at,
        'completed_at', v_session.completed_at,
        'score', v_session.score,
        'total_questions', v_session.total_questions,
        'questions', (
            SELECT coalesce(jsonb_agg(q ORDER BY q->>'display_order'), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'id', qu.id,
                    'display_order', eq.display_order,
                    'question_text', qu.question_text,
                    'pi_id', pi.id,
                    'pi_code', pi.pi_code,
                    'rationale', CASE WHEN v_completed THEN qu.rationale ELSE NULL END,
                    'choices', (
                        SELECT coalesce(jsonb_agg(
                            jsonb_build_object(
                                'id', qc.id,
                                'label', qc.choice_label,
                                'text', qc.choice_text,
                                'is_correct', CASE WHEN v_completed THEN qc.is_correct ELSE NULL END
                            )
                            ORDER BY qc.display_order
                        ), '[]'::jsonb)
                        FROM testbank.question_choices qc
                        WHERE qc.question_id = qu.id
                    ),
                    'chosen_choice_id', ta.chosen_choice_id,
                    'is_correct', ta.is_correct
                ) AS q
                FROM testbank.exam_questions eq
                JOIN testbank.questions qu ON qu.id = eq.question_id
                LEFT JOIN practice.performance_indicators pi ON pi.id = qu.pi_id
                LEFT JOIN testbank.test_answers ta
                    ON ta.session_id = v_session.id AND ta.question_id = qu.id
                WHERE eq.exam_id = v_session.exam_id
            ) questions
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_pi_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_performance_indicators(text, text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_indicator(uuid) TO authenticated;

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
            LEFT JOIN practice.performance_indicators pi ON (
                rc.pi_id = pi.id
                OR (
                    rc.pi_id IS NULL
                    AND rc.criterion_group = 'performance_indicator'
                    AND length(btrim(rc.criterion_text)) >= 15
                    AND practice.normalize_pi_text(pi.indicator_text)
                        LIKE practice.normalize_pi_text(rc.criterion_text) || '%'
                )
            )
            WHERE rt.event_id = p_event_id
              AND rt.year = p_year
              AND rc.criterion_group = 'performance_indicator'
        ),
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'pi_id', coalesce(epi.pi_id, pi.id),
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
