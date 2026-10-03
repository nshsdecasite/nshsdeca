-- Align stored roleplay rubrics with current DECA evaluation forms:
-- team and individual series (5 x 10 + SOLUTION + CAREER + overall 8),
-- PFL (3 x 17 + overall 7), principles (4 x 12 + overall 10).

ALTER TABLE rubric.rubric_criteria
  DROP CONSTRAINT IF EXISTS rubric_criteria_criterion_group_check;

ALTER TABLE rubric.rubric_criteria
  ADD CONSTRAINT rubric_criteria_criterion_group_check
  CHECK (criterion_group = ANY (ARRAY[
    'performance_indicator'::text,
    'solution'::text,
    'career_competencies'::text,
    'overall_impression'::text,
    'twenty_first_century_skills'::text
  ]));

ALTER TABLE rubric.rubric_levels
  DROP CONSTRAINT IF EXISTS rubric_levels_level_name_check;

ALTER TABLE rubric.rubric_levels
  ADD CONSTRAINT rubric_levels_level_name_check
  CHECK (level_name = ANY (ARRAY[
    'little_no_value'::text,
    'below_expectations'::text,
    'meets_expectations'::text,
    'exceeds_expectations'::text,
    'novice'::text,
    'developing'::text,
    'proficient'::text,
    'exemplary'::text
  ]));

UPDATE rubric.rubric_levels
SET level_name = CASE level_name
  WHEN 'little_no_value' THEN 'novice'
  WHEN 'below_expectations' THEN 'developing'
  WHEN 'meets_expectations' THEN 'proficient'
  WHEN 'exceeds_expectations' THEN 'exemplary'
  ELSE level_name
END
WHERE level_name IN (
  'little_no_value',
  'below_expectations',
  'meets_expectations',
  'exceeds_expectations'
);

CREATE OR REPLACE FUNCTION rubric._replace_levels(
  p_criterion_id uuid,
  p_mins integer[],
  p_maxs integer[]
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  names text[] := ARRAY['novice', 'developing', 'proficient', 'exemplary'];
  i integer;
BEGIN
  IF coalesce(array_length(p_mins, 1), 0) <> 4
     OR coalesce(array_length(p_maxs, 1), 0) <> 4 THEN
    RAISE EXCEPTION 'expected 4 level bands';
  END IF;

  DELETE FROM rubric.rubric_levels WHERE criterion_id = p_criterion_id;

  FOR i IN 1..4 LOOP
    INSERT INTO rubric.rubric_levels (
      criterion_id, level_name, min_points, max_points, level_order
    )
    VALUES (p_criterion_id, names[i], p_mins[i], p_maxs[i], i);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION rubric._insert_scored_criterion(
  p_template_id uuid,
  p_order integer,
  p_group text,
  p_text text,
  p_mins integer[],
  p_maxs integer[]
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  cid uuid;
BEGIN
  INSERT INTO rubric.rubric_criteria (
    rubric_template_id,
    display_order,
    criterion_group,
    criterion_text,
    max_points
  )
  VALUES (
    p_template_id,
    p_order,
    p_group,
    p_text,
    p_maxs[4]
  )
  RETURNING id INTO cid;

  PERFORM rubric._replace_levels(cid, p_mins, p_maxs);
  RETURN cid;
END;
$$;

DO $$
DECLARE
  rec record;
  keep_pis integer;
  pi_mins integer[];
  pi_maxs integer[];
  ov_mins integer[];
  ov_maxs integer[];
  sol_mins integer[] := ARRAY[0, 3, 6, 8];
  sol_maxs integer[] := ARRAY[2, 5, 7, 8];
  car_mins integer[] := ARRAY[0, 2, 4, 6];
  car_maxs integer[] := ARRAY[1, 3, 5, 6];
  cid uuid;
  next_order integer;
BEGIN
  FOR rec IN
    SELECT
      rt.id AS template_id,
      e.event_format,
      coalesce(c.slug, '') AS cluster_slug
    FROM rubric.rubric_templates rt
    JOIN events.events e ON e.id = rt.event_id
    LEFT JOIN practice.clusters c ON c.id = e.cluster_id
  LOOP
    IF rec.cluster_slug = 'personal-financial-literacy' THEN
      keep_pis := 3;
      pi_mins := ARRAY[0, 6, 12, 17];
      pi_maxs := ARRAY[5, 11, 16, 17];
      ov_mins := ARRAY[0, 3, 5, 7];
      ov_maxs := ARRAY[2, 4, 6, 7];
    ELSIF rec.cluster_slug = 'principles' THEN
      keep_pis := 4;
      pi_mins := ARRAY[0, 4, 8, 12];
      pi_maxs := ARRAY[3, 7, 11, 12];
      ov_mins := ARRAY[0, 4, 7, 10];
      ov_maxs := ARRAY[3, 6, 9, 10];
    ELSIF rec.event_format IN ('roleplay_team', 'roleplay_individual') THEN
      keep_pis := 5;
      pi_mins := ARRAY[0, 4, 7, 10];
      pi_maxs := ARRAY[3, 6, 9, 10];
      ov_mins := ARRAY[0, 3, 6, 8];
      ov_maxs := ARRAY[2, 5, 7, 8];
    ELSE
      CONTINUE;
    END IF;

    DELETE FROM rubric.rubric_criteria rc
    WHERE rc.rubric_template_id = rec.template_id
      AND rc.criterion_group = 'performance_indicator'
      AND rc.id NOT IN (
        SELECT kept.id
        FROM (
          SELECT
            id,
            row_number() OVER (ORDER BY display_order, id) AS rn
          FROM rubric.rubric_criteria
          WHERE rubric_template_id = rec.template_id
            AND criterion_group = 'performance_indicator'
        ) kept
        WHERE kept.rn <= keep_pis
      );

    FOR cid IN
      SELECT id
      FROM rubric.rubric_criteria
      WHERE rubric_template_id = rec.template_id
        AND criterion_group = 'performance_indicator'
      ORDER BY display_order, id
    LOOP
      UPDATE rubric.rubric_criteria
      SET max_points = pi_maxs[4]
      WHERE id = cid;

      PERFORM rubric._replace_levels(cid, pi_mins, pi_maxs);
    END LOOP;

    DELETE FROM rubric.rubric_criteria
    WHERE rubric_template_id = rec.template_id
      AND criterion_group <> 'performance_indicator';

    SELECT coalesce(max(display_order), 0) + 10
    INTO next_order
    FROM rubric.rubric_criteria
    WHERE rubric_template_id = rec.template_id;

    PERFORM rubric._insert_scored_criterion(
      rec.template_id, next_order, 'solution',
      'Unique: Demonstrate original thinking, fresh perspectives and an insightful approach.',
      sol_mins, sol_maxs
    );
    PERFORM rubric._insert_scored_criterion(
      rec.template_id, next_order + 1, 'solution',
      'Practical: Develop an actionable/viable solution in a real-world context.',
      sol_mins, sol_maxs
    );
    PERFORM rubric._insert_scored_criterion(
      rec.template_id, next_order + 2, 'solution',
      'Effective: Develop a solution that achieves relevant outcomes.',
      sol_mins, sol_maxs
    );
    PERFORM rubric._insert_scored_criterion(
      rec.template_id, next_order + 3, 'career_competencies',
      'Critical Thinking: Think critically to understand and solve problems.',
      car_mins, car_maxs
    );
    PERFORM rubric._insert_scored_criterion(
      rec.template_id, next_order + 4, 'career_competencies',
      'Communication: Communicate clearly, effectively and with reason.',
      car_mins, car_maxs
    );
    PERFORM rubric._insert_scored_criterion(
      rec.template_id, next_order + 5, 'career_competencies',
      'Decision Making: Consider the impacts of decisions.',
      car_mins, car_maxs
    );
    PERFORM rubric._insert_scored_criterion(
      rec.template_id, next_order + 6, 'overall_impression',
      'Demonstrate overall career readiness through professionalism, poise and confidence.',
      ov_mins, ov_maxs
    );

    UPDATE rubric.rubric_criteria rc
    SET display_order = ordered.new_order + 1000
    FROM (
      SELECT
        id,
        row_number() OVER (
          ORDER BY
            CASE criterion_group
              WHEN 'performance_indicator' THEN 1
              WHEN 'solution' THEN 2
              WHEN 'career_competencies' THEN 3
              WHEN 'overall_impression' THEN 4
              ELSE 5
            END,
            display_order,
            id
        ) AS new_order
      FROM rubric.rubric_criteria
      WHERE rubric_template_id = rec.template_id
    ) ordered
    WHERE rc.id = ordered.id;

    UPDATE rubric.rubric_criteria rc
    SET display_order = rc.display_order - 1000
    WHERE rc.rubric_template_id = rec.template_id;

    UPDATE rubric.rubric_templates
    SET max_total_points = (
      SELECT coalesce(sum(max_points), 0)
      FROM rubric.rubric_criteria
      WHERE rubric_template_id = rec.template_id
    )
    WHERE id = rec.template_id;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS rubric._insert_scored_criterion(uuid, integer, text, text, integer[], integer[]);
DROP FUNCTION IF EXISTS rubric._replace_levels(uuid, integer[], integer[]);

ALTER TABLE rubric.rubric_criteria
  DROP CONSTRAINT rubric_criteria_criterion_group_check;

ALTER TABLE rubric.rubric_criteria
  ADD CONSTRAINT rubric_criteria_criterion_group_check
  CHECK (criterion_group = ANY (ARRAY[
    'performance_indicator'::text,
    'solution'::text,
    'career_competencies'::text,
    'overall_impression'::text
  ]));

ALTER TABLE rubric.rubric_levels
  DROP CONSTRAINT rubric_levels_level_name_check;

ALTER TABLE rubric.rubric_levels
  ADD CONSTRAINT rubric_levels_level_name_check
  CHECK (level_name = ANY (ARRAY[
    'novice'::text,
    'developing'::text,
    'proficient'::text,
    'exemplary'::text
  ]));
