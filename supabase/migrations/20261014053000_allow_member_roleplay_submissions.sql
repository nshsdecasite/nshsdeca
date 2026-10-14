-- Officers and advisors already see Record on a scenario. Let them open
-- the submit page and save an attempt, same as students.

CREATE OR REPLACE FUNCTION public.create_roleplay_submission(
    p_scenario_key text,
    p_video_url text,
    p_video_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rubric, events, core, public
AS $$
DECLARE
    v_attempt int;
    v_sub rubric.submissions%ROWTYPE;
    v_scenario_id uuid;
    v_event_id uuid;
BEGIN
    IF core.current_user_role() NOT IN ('student', 'officer', 'advisor') THEN
        RAISE EXCEPTION 'Only chapter members can submit roleplays';
    END IF;

    BEGIN
        v_scenario_id := p_scenario_key::uuid;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid scenario id';
    END;

    SELECT s.id, s.event_id
    INTO v_scenario_id, v_event_id
    FROM events.scenarios s
    WHERE s.id = v_scenario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scenario not found';
    END IF;

    SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt
    FROM rubric.submissions
    WHERE user_id = auth.uid() AND scenario_id = v_scenario_id;

    INSERT INTO rubric.submissions (
        user_id,
        scenario_id,
        event_id,
        scenario_key,
        video_url,
        video_source,
        attempt_number,
        status
    )
    VALUES (
        auth.uid(),
        v_scenario_id,
        v_event_id,
        v_scenario_id::text,
        p_video_url,
        p_video_source,
        v_attempt,
        'submitted'
    )
    RETURNING * INTO v_sub;

    RETURN public.roleplay_submission_row(v_sub);
END;
$$;

DROP POLICY IF EXISTS submissions_insert ON rubric.submissions;
CREATE POLICY submissions_insert ON rubric.submissions
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND core.current_user_role() IN ('student', 'officer', 'advisor')
    );
