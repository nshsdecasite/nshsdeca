CREATE OR REPLACE FUNCTION public.get_theories()
RETURNS TABLE (
  id uuid,
  theory_name text,
  category text,
  explanation text,
  example_scenario text,
  cluster_slug text,
  cluster_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = content, practice, public
AS $$
  SELECT
    t.id,
    t.theory_name,
    t.category,
    t.explanation,
    t.example_scenario,
    c.slug AS cluster_slug,
    c.name AS cluster_name
  FROM content.theories t
  LEFT JOIN practice.clusters c ON c.id = t.cluster_id
  ORDER BY t.theory_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_theories() TO anon, authenticated, service_role;
