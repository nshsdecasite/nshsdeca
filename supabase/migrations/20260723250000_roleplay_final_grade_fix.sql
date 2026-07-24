-- Prevent draft autosaves from downgrading a finalized submission.

CREATE OR REPLACE FUNCTION public.save_roleplay_grading(
    p_id uuid,
    p_grading jsonb,
    p_final boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rubric, core, public
AS $$
DECLARE
    v_sub rubric.submissions%ROWTYPE;
    v_role text;
    v_status text;
    v_current_status text;
BEGIN
    v_role := core.current_user_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can grade submissions';
    END IF;

    SELECT status INTO v_current_status
    FROM rubric.submissions
    WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    IF p_final THEN
        v_status := 'reviewed';
    ELSIF v_current_status = 'reviewed' THEN
        v_status := 'reviewed';
    ELSE
        v_status := 'under_review';
    END IF;

    UPDATE rubric.submissions
    SET
        grading_data = p_grading,
        status = v_status,
        duration_seconds = coalesce((p_grading->>'videoDuration')::int, duration_seconds),
        reviewed_at = CASE WHEN p_final THEN now() ELSE reviewed_at END
    WHERE id = p_id
    RETURNING * INTO v_sub;

    RETURN public.roleplay_submission_row(v_sub);
END;
$$;
