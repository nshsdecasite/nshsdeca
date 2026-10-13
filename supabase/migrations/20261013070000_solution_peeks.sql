-- Record when a member opens a roleplay solution before any attempt.

CREATE TABLE IF NOT EXISTS core.solution_peeks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    scenario_id  uuid NOT NULL REFERENCES events.scenarios(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, scenario_id)
);

CREATE INDEX IF NOT EXISTS solution_peeks_created_idx
    ON core.solution_peeks (created_at DESC);

ALTER TABLE core.solution_peeks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_solution_peek(p_scenario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core, events, rubric
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM events.scenarios WHERE id = p_scenario_id) THEN
        RAISE EXCEPTION 'Scenario not found';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM rubric.submissions
        WHERE user_id = v_user_id
          AND scenario_id = p_scenario_id
    ) THEN
        RETURN;
    END IF;

    INSERT INTO core.solution_peeks (user_id, scenario_id)
    VALUES (v_user_id, p_scenario_id)
    ON CONFLICT (user_id, scenario_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_solution_peeks()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    first_name text,
    last_name text,
    email text,
    scenario_id uuid,
    event_code text,
    scenario_title text,
    scenario_number int,
    year int,
    level text,
    checked_at timestamptz,
    attempted_after boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core, events, rubric
AS $$
DECLARE
    v_role text;
BEGIN
    v_role := public.get_my_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can view solution checks';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        u.first_name,
        u.last_name,
        u.email,
        p.scenario_id,
        e.event_code,
        s.scenario_title,
        s.scenario_number,
        s.year,
        s.level,
        p.created_at,
        EXISTS (
            SELECT 1
            FROM rubric.submissions sub
            WHERE sub.user_id = p.user_id
              AND sub.scenario_id = p.scenario_id
        )
    FROM core.solution_peeks p
    JOIN core.users u ON u.id = p.user_id
    JOIN events.scenarios s ON s.id = p.scenario_id
    JOIN events.events e ON e.id = s.event_id
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.record_solution_peek(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_solution_peeks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_solution_peek(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_solution_peeks() TO authenticated;

NOTIFY pgrst, 'reload schema';
