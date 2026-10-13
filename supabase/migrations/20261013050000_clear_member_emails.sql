-- Member profiles no longer store an email. Sign-in still uses the auth
-- account address, which is the username plus @dallasisd.org.

ALTER TABLE core.users
  ALTER COLUMN email DROP NOT NULL;

UPDATE core.users
SET email = NULL;

CREATE OR REPLACE FUNCTION public.claim_username(p_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_username text := lower(regexp_replace(btrim(coalesce(p_username, '')), '\s+', '', 'g'));
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF v_username !~ '^[a-z][a-z0-9]{2,29}$' THEN
    RAISE EXCEPTION 'Use 3 to 30 letters and numbers, and start with a letter.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM core.users
    WHERE username = v_username AND id <> auth.uid()
  ) THEN
    RAISE EXCEPTION 'That username is already taken.';
  END IF;

  v_email := v_username || '@dallasisd.org';

  UPDATE core.users
  SET username = v_username,
      username_confirmed = true
  WHERE id = auth.uid();

  UPDATE auth.users
  SET email = v_email,
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_confirm_status = 0,
      email_confirmed_at = coalesce(email_confirmed_at, now())
  WHERE id = auth.uid();

  UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email), true)
  WHERE user_id = auth.uid()
    AND provider = 'email';
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'That username is already taken.';
END;
$$;
