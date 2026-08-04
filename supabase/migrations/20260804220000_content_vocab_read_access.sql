-- Allow study content to be read through the Supabase API.

GRANT USAGE ON SCHEMA content TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA content TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA content
GRANT SELECT ON TABLES TO anon, authenticated;
