-- Reference data: pi_tiers, clusters, events
-- Source: deca.org/compete (2026-2027 official ICDC list)
-- Safe to re-run: upserts on natural keys (code, slug, event_code)

-- =============================================================================
-- PI tiers (fixed DECA competency levels)
-- =============================================================================
INSERT INTO practice.pi_tiers (code, label) VALUES
  ('PQ', 'Prerequisite'),
  ('CS', 'Career Sustaining'),
  ('SP', 'Specialist'),
  ('SU', 'Supervisor'),
  ('MN', 'Manager'),
  ('ON', 'Owner')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

-- =============================================================================
-- Career clusters
-- =============================================================================
INSERT INTO practice.clusters (name, slug) VALUES
  ('Business Management and Administration', 'business-management-and-administration'),
  ('Entrepreneurship', 'entrepreneurship'),
  ('Finance', 'finance'),
  ('Hospitality and Tourism', 'hospitality-and-tourism'),
  ('Marketing', 'marketing'),
  ('Personal Financial Literacy', 'personal-financial-literacy')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- =============================================================================
-- Competitive events (one row per event type — no year suffix on event_code)
-- =============================================================================
INSERT INTO events.events (event_code, event_name, event_format, cluster_id)
SELECT v.event_code, v.event_name, v.event_format, c.id
FROM (VALUES
  -- Individual Series
  ('ACT',   'Accounting Applications Series',                         'roleplay_individual', 'finance'),
  ('AAM',   'Apparel and Accessories Marketing Series',               'roleplay_individual', 'marketing'),
  ('ASM',   'Automotive Services Marketing Series',                   'roleplay_individual', 'marketing'),
  ('BFS',   'Business Finance Series',                                'roleplay_individual', 'finance'),
  ('BSM',   'Business Services Marketing Series',                     'roleplay_individual', 'marketing'),
  ('ENT',   'Entrepreneurship Series',                              'roleplay_individual', 'entrepreneurship'),
  ('FMS',   'Food Marketing Series',                                'roleplay_individual', 'marketing'),
  ('HLM',   'Hotel and Lodging Management Series',                    'roleplay_individual', 'hospitality-and-tourism'),
  ('HRM',   'Human Resources Management Series',                    'roleplay_individual', 'business-management-and-administration'),
  ('MCS',   'Marketing Communications Series',                        'roleplay_individual', 'marketing'),
  ('QSRM',  'Quick Serve Restaurant Management Series',               'roleplay_individual', 'hospitality-and-tourism'),
  ('RFSM',  'Restaurant and Food Service Management Series',          'roleplay_individual', 'hospitality-and-tourism'),
  ('RMS',   'Retail Merchandising Series',                            'roleplay_individual', 'marketing'),
  ('SEM',   'Sports and Entertainment Marketing Series',              'roleplay_individual', 'marketing'),
  -- Team Decision Making
  ('BLTDM', 'Business Law and Ethics Team Decision Making',           'roleplay_team', 'business-management-and-administration'),
  ('BTDM',  'Buying and Merchandising Team Decision Making',          'roleplay_team', 'marketing'),
  ('ETDM',  'Entrepreneurship Team Decision Making',                  'roleplay_team', 'entrepreneurship'),
  ('FTDM',  'Financial Services Team Decision Making',                'roleplay_team', 'finance'),
  ('HTDM',  'Hospitality Services Team Decision Making',              'roleplay_team', 'hospitality-and-tourism'),
  ('MTDM',  'Marketing Management Team Decision Making',              'roleplay_team', 'marketing'),
  ('STDM',  'Sports and Entertainment Marketing Team Decision Making','roleplay_team', 'marketing'),
  ('TTDM',  'Travel and Tourism Team Decision Making',                'roleplay_team', 'hospitality-and-tourism'),
  -- Principles of Business Administration
  ('PBM',   'Principles of Business Management and Administration',   'roleplay_individual', 'business-management-and-administration'),
  ('PEN',   'Principles of Entrepreneurship',                         'roleplay_individual', 'entrepreneurship'),
  ('PFN',   'Principles of Finance',                                  'roleplay_individual', 'finance'),
  ('PHT',   'Principles of Hospitality and Tourism',                  'roleplay_individual', 'hospitality-and-tourism'),
  ('PMK',   'Principles of Marketing',                                'roleplay_individual', 'marketing'),
  -- Personal Financial Literacy
  ('PFL',   'Personal Financial Literacy',                            'roleplay_individual', 'personal-financial-literacy'),
  -- Professional Selling and Consulting
  ('FCE',   'Financial Consulting',                                   'roleplay_individual', 'finance'),
  ('HTPS',  'Hospitality and Tourism Professional Selling',           'roleplay_individual', 'hospitality-and-tourism'),
  ('PSE',   'Professional Selling',                                   'roleplay_individual', 'marketing'),
  -- Business Operations Research
  ('BOR',   'Business Services Operations Research',                  'written', 'business-management-and-administration'),
  ('BMOR',  'Buying and Merchandising Operations Research',           'written', 'marketing'),
  ('FOR',   'Finance Operations Research',                            'written', 'finance'),
  ('HTOR',  'Hospitality and Tourism Operations Research',            'written', 'hospitality-and-tourism'),
  ('SEOR',  'Sports and Entertainment Marketing Operations Research', 'written', 'marketing'),
  -- Project Management
  ('PMBS',  'Business Solutions Project',                             'written', 'business-management-and-administration'),
  ('PMCD',  'Career Development Project',                             'written', 'business-management-and-administration'),
  ('PMCA',  'Community Awareness Project',                            'written', 'business-management-and-administration'),
  ('PMCG',  'Community Giving Project',                               'written', 'business-management-and-administration'),
  ('PMFL',  'Financial Literacy Project',                             'written', 'business-management-and-administration'),
  ('PMSP',  'Sales Project',                                          'written', 'business-management-and-administration'),
  -- Entrepreneurship (prepared)
  ('EBG',   'Business Growth Plan',                                   'written', 'entrepreneurship'),
  ('EFB',   'Franchise Business Plan',                                'written', 'entrepreneurship'),
  ('EIB',   'Independent Business Plan',                              'written', 'entrepreneurship'),
  ('EIP',   'Innovation Plan',                                        'written', 'entrepreneurship'),
  ('IBP',   'International Business Plan',                            'written', 'entrepreneurship'),
  ('ESB',   'Start-Up Business Plan',                                 'written', 'entrepreneurship'),
  -- Integrated Marketing Campaign
  ('IMCE',  'Integrated Marketing Campaign-Event',                    'written', 'marketing'),
  ('IMCP',  'Integrated Marketing Campaign-Product',                  'written', 'marketing'),
  ('IMCS',  'Integrated Marketing Campaign-Service',                  'written', 'marketing'),
  -- Online events / simulations
  ('SMG',   'Stock Market Game',                                      'exam_only', 'finance'),
  ('VBCAC', 'Virtual Business Challenge-Accounting',                  'exam_only', 'finance'),
  ('VBCEN', 'Virtual Business Challenge-Entrepreneurship',            'exam_only', 'entrepreneurship'),
  ('VBCFA', 'Virtual Business Challenge-Fashion',                       'exam_only', 'marketing'),
  ('VBCHM', 'Virtual Business Challenge-Hotel Management',            'exam_only', 'hospitality-and-tourism'),
  ('VBCPF', 'Virtual Business Challenge-Personal Finance',            'exam_only', 'personal-financial-literacy'),
  ('VBCRS', 'Virtual Business Challenge-Restaurant',                  'exam_only', 'hospitality-and-tourism'),
  ('VBCRT', 'Virtual Business Challenge-Retail',                      'exam_only', 'marketing'),
  ('VBCSP', 'Virtual Business Challenge-Sports',                      'exam_only', 'marketing')
) AS v(event_code, event_name, event_format, cluster_slug)
JOIN practice.clusters c ON c.slug = v.cluster_slug
ON CONFLICT (event_code) DO UPDATE SET
  event_name   = EXCLUDED.event_name,
  event_format = EXCLUDED.event_format,
  cluster_id   = EXCLUDED.cluster_id;
