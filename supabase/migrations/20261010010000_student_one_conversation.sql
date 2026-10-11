-- Members (students) may only message one person at a time.
-- They can continue an existing thread, but cannot open a second one.

CREATE OR REPLACE FUNCTION public.send_direct_message(
    p_recipient_id uuid,
    p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text;
    v_recipient_role text;
    v_id uuid;
    v_body text := btrim(coalesce(p_body, ''));
    v_has_existing_with_recipient boolean;
    v_has_other_conversation boolean;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_body = '' THEN
        RAISE EXCEPTION 'Message is required';
    END IF;

    IF p_recipient_id = v_user_id THEN
        RAISE EXCEPTION 'You cannot message yourself';
    END IF;

    v_role := public.get_my_role();

    SELECT u.role INTO v_recipient_role
    FROM core.users u
    WHERE u.id = p_recipient_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    IF v_role NOT IN ('officer', 'advisor') AND v_recipient_role NOT IN ('officer', 'advisor') THEN
        RAISE EXCEPTION 'Students can only message officers and advisors';
    END IF;

    IF v_role = 'student' THEN
        SELECT EXISTS (
            SELECT 1
            FROM core.direct_messages dm
            WHERE (dm.sender_id = v_user_id AND dm.recipient_id = p_recipient_id)
               OR (dm.sender_id = p_recipient_id AND dm.recipient_id = v_user_id)
        ) INTO v_has_existing_with_recipient;

        IF NOT v_has_existing_with_recipient THEN
            SELECT EXISTS (
                SELECT 1
                FROM core.direct_messages dm
                WHERE dm.sender_id = v_user_id OR dm.recipient_id = v_user_id
            ) INTO v_has_other_conversation;

            IF v_has_other_conversation THEN
                RAISE EXCEPTION 'Members can only message one person at a time. Open your existing conversation to continue.';
            END IF;
        END IF;
    END IF;

    INSERT INTO core.direct_messages (sender_id, recipient_id, body)
    VALUES (v_user_id, p_recipient_id, v_body)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;
