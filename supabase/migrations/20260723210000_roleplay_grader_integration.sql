-- Roleplay grader integration: columns, RLS, RPC helpers.

ALTER TABLE rubric.submissions
    ADD COLUMN IF NOT EXISTS scenario_key text,
    ADD COLUMN IF NOT EXISTS video_source text CHECK (video_source IN ('youtube', 'google-drive')),
    ADD COLUMN IF NOT EXISTS grading_data jsonb;

CREATE OR REPLACE FUNCTION core.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
    SELECT role FROM core.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
    SELECT core.current_user_role();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

ALTER TABLE rubric.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submissions_select ON rubric.submissions;
CREATE POLICY submissions_select ON rubric.submissions
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR core.current_user_role() IN ('officer', 'advisor')
    );

DROP POLICY IF EXISTS submissions_insert ON rubric.submissions;
CREATE POLICY submissions_insert ON rubric.submissions
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND core.current_user_role() = 'student'
    );

DROP POLICY IF EXISTS submissions_update ON rubric.submissions;
CREATE POLICY submissions_update ON rubric.submissions
    FOR UPDATE TO authenticated
    USING (
        core.current_user_role() IN ('officer', 'advisor')
        OR (user_id = auth.uid() AND status = 'submitted')
    )
    WITH CHECK (
        core.current_user_role() IN ('officer', 'advisor')
        OR (user_id = auth.uid() AND status = 'submitted')
    );

DROP POLICY IF EXISTS submissions_delete ON rubric.submissions;
CREATE POLICY submissions_delete ON rubric.submissions
    FOR DELETE TO authenticated
    USING (core.current_user_role() IN ('officer', 'advisor'));

-- Submission row as JSON (includes student name for officer views).
CREATE OR REPLACE FUNCTION public.roleplay_submission_row(p_submission rubric.submissions)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = rubric, core, public
AS $$
    SELECT jsonb_build_object(
        'id', p_submission.id,
        'user_id', p_submission.user_id,
        'scenario_key', p_submission.scenario_key,
        'video_url', p_submission.video_url,
        'video_source', p_submission.video_source,
        'attempt_number', p_submission.attempt_number,
        'status', p_submission.status,
        'submitted_at', p_submission.submitted_at,
        'reviewed_at', p_submission.reviewed_at,
        'duration_seconds', p_submission.duration_seconds,
        'grading_data', p_submission.grading_data,
        'student_name', trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')),
        'student_email', u.email
    )
    FROM core.users u
    WHERE u.id = p_submission.user_id;
$$;

CREATE OR REPLACE FUNCTION public.list_roleplay_submissions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = rubric, core, public
AS $$
DECLARE
    v_role text;
BEGIN
    v_role := core.current_user_role();
    IF v_role IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    IF v_role IN ('officer', 'advisor') THEN
        RETURN coalesce((
            SELECT jsonb_agg(public.roleplay_submission_row(s) ORDER BY s.submitted_at DESC)
            FROM rubric.submissions s
        ), '[]'::jsonb);
    END IF;

    RETURN coalesce((
        SELECT jsonb_agg(public.roleplay_submission_row(s) ORDER BY s.submitted_at DESC)
        FROM rubric.submissions s
        WHERE s.user_id = auth.uid()
    ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_roleplay_submission(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = rubric, core, public
AS $$
DECLARE
    v_sub rubric.submissions%ROWTYPE;
    v_role text;
BEGIN
    SELECT * INTO v_sub FROM rubric.submissions WHERE id = p_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_role := core.current_user_role();
    IF v_sub.user_id <> auth.uid() AND v_role NOT IN ('officer', 'advisor') THEN
        RETURN NULL;
    END IF;

    RETURN public.roleplay_submission_row(v_sub);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_roleplay_submission(
    p_scenario_key text,
    p_video_url text,
    p_video_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rubric, core, public
AS $$
DECLARE
    v_attempt int;
    v_sub rubric.submissions%ROWTYPE;
BEGIN
    IF core.current_user_role() <> 'student' THEN
        RAISE EXCEPTION 'Only students can submit roleplays';
    END IF;

    SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt
    FROM rubric.submissions
    WHERE user_id = auth.uid() AND scenario_key = p_scenario_key;

    INSERT INTO rubric.submissions (
        user_id, scenario_key, video_url, video_source, attempt_number, status
    )
    VALUES (
        auth.uid(), p_scenario_key, p_video_url, p_video_source, v_attempt, 'submitted'
    )
    RETURNING * INTO v_sub;

    RETURN public.roleplay_submission_row(v_sub);
END;
$$;

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
BEGIN
    v_role := core.current_user_role();
    IF v_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can grade submissions';
    END IF;

    v_status := CASE WHEN p_final THEN 'reviewed' ELSE 'under_review' END;

    UPDATE rubric.submissions
    SET
        grading_data = p_grading,
        status = v_status,
        duration_seconds = coalesce((p_grading->>'videoDuration')::int, duration_seconds),
        reviewed_at = CASE WHEN p_final THEN now() ELSE reviewed_at END
    WHERE id = p_id
    RETURNING * INTO v_sub;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    RETURN public.roleplay_submission_row(v_sub);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_roleplay_submission(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rubric, core, public
AS $$
BEGIN
    IF core.current_user_role() NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Only officers can delete submissions';
    END IF;

    DELETE FROM rubric.submissions WHERE id = p_id;
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_roleplay_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roleplay_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_roleplay_submission(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_roleplay_grading(uuid, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_roleplay_submission(uuid) TO authenticated;
