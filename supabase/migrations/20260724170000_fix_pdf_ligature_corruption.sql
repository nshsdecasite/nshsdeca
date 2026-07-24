-- Fix PDF 'ti' ligature corruption (extracted as 5, (, or U) across text columns.

CREATE OR REPLACE FUNCTION practice.fix_pdf_ligatures(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result text := coalesce(p_text, '');
    prev text;
BEGIN
    IF result = '' THEN
        RETURN result;
    END IF;

    LOOP
        prev := result;
        result := regexp_replace(result, '([a-z])55([a-z])', '\1titi\2', 'g');
        result := regexp_replace(result, '([a-zA-Z])5([a-z])', '\1ti\2', 'g');
        result := regexp_replace(result, '([a-zA-Z])\(([a-z])', '\1ti\2', 'g');
        result := regexp_replace(result, '([a-z])U([a-z])', '\1tt\2', 'g');
        result := regexp_replace(result, '(\s)5mely\M', '\1timely', 'g');
        result := regexp_replace(result, '(\s)5me\M', '\1time', 'g');
        EXIT WHEN result = prev;
    END LOOP;

    RETURN result;
END;
$$;

-- Instructional areas
UPDATE practice.instructional_areas
SET name = practice.fix_pdf_ligatures(name)
WHERE name ~ '[a-zA-Z]\([a-z]' OR name ~ '[a-zA-Z]5[a-z]' OR name ~ '[a-z]U[a-z]';

-- Performance indicators
UPDATE practice.performance_indicators
SET indicator_text = practice.fix_pdf_ligatures(indicator_text)
WHERE indicator_text ~ '[a-zA-Z]5[a-z]'
   OR indicator_text ~ '[a-zA-Z]\([a-z]'
   OR indicator_text ~ '[a-z]U[a-z]';

-- Roleplay rubric criteria (may affect pi_id backfill quality)
UPDATE rubric.rubric_criteria
SET criterion_text = practice.fix_pdf_ligatures(criterion_text)
WHERE criterion_text ~ '[a-zA-Z]5[a-z]'
   OR criterion_text ~ '[a-zA-Z]\([a-z]'
   OR criterion_text ~ '[a-z]U[a-z]';

-- Exam bank updates run via scripts/fix_pdf_ligatures.py (batched; full-table update times out).

-- Re-link rubric criteria pi_id after text cleanup
UPDATE rubric.rubric_criteria rc
SET pi_id = pi.id
FROM practice.performance_indicators pi
WHERE rc.criterion_group = 'performance_indicator'
  AND practice.normalize_pi_text(rc.criterion_text) = practice.normalize_pi_text(pi.indicator_text)
  AND (rc.pi_id IS NULL OR rc.pi_id <> pi.id);

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
      AND length(btrim(rc2.criterion_text)) >= 15
      AND (
          rc2.pi_id IS NULL
          OR rc2.pi_id <> pi.id
      )
    ORDER BY rc2.id, length(pi.indicator_text) ASC
) matched
WHERE rc.id = matched.criterion_id;
