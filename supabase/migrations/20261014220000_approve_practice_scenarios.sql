-- Officers/advisors can approve generated practice events into a chapter
-- generated library. Approved rows stay level = 'practice' so they never mix
-- into the official district/state/icdc catalog.

ALTER TABLE events.scenarios
  DROP CONSTRAINT IF EXISTS scenarios_review_status_check;

ALTER TABLE events.scenarios
  ADD CONSTRAINT scenarios_review_status_check
  CHECK (
    (level IS DISTINCT FROM 'practice' AND review_status IS NULL)
    OR (level = 'practice' AND review_status IN ('private', 'pending_review', 'approved'))
  );

CREATE OR REPLACE FUNCTION events.can_access_scenario(
  p_level text,
  p_created_by uuid,
  p_review_status text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    p_level IS DISTINCT FROM 'practice'
    OR (
      auth.uid() IS NOT NULL
      AND (
        p_created_by = auth.uid()
        OR p_review_status = 'approved'
        OR (
          p_review_status = 'pending_review'
          AND core.current_user_role() IN ('officer', 'advisor')
        )
        OR (
          p_created_by IS NULL
          AND core.current_user_role() IN ('officer', 'advisor')
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION events.can_access_scenario(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION events.can_access_scenario(text, uuid, text) TO authenticated;

CREATE INDEX IF NOT EXISTS scenarios_practice_approved_idx
  ON events.scenarios (year DESC, event_id)
  WHERE level = 'practice' AND review_status = 'approved';

CREATE OR REPLACE FUNCTION public.approve_practice_scenario(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, events, core
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF core.current_user_role() NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Not allowed';
    END IF;

    UPDATE events.scenarios
    SET review_status = 'approved'
    WHERE id = p_id
      AND level = 'practice'
      AND review_status = 'pending_review';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Practice event not found';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_practice_scenario(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, events, core
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF core.current_user_role() NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Not allowed';
    END IF;

    UPDATE events.scenarios
    SET review_status = 'private',
        submitted_for_review_at = NULL
    WHERE id = p_id
      AND level = 'practice'
      AND review_status = 'pending_review';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Practice event not found';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_practice_scenario(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_practice_scenario(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.approve_practice_scenario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_practice_scenario(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
