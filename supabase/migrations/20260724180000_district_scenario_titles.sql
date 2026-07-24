-- District roleplay PDFs use company names as headers, but the canonical title
-- is "District Event N" based on scenario_number.

UPDATE events.scenarios
SET scenario_title = 'District Event ' || scenario_number::text
WHERE level = 'district'
  AND scenario_title IS DISTINCT FROM ('District Event ' || scenario_number::text);
