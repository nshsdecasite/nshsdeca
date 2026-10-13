-- Official 2026-27 event PI pools.
-- Principles: Tier 1. TDM: Tier 1 + Tier 2. Series: Tier 1 + Tier 2 + pathway.
-- ENT and ETDM: Entrepreneurship list. PFL stays on its own standards.

CREATE TABLE IF NOT EXISTS practice.pi_pool_membership (
    pi_code text NOT NULL,
    pool text NOT NULL,
    PRIMARY KEY (pi_code, pool)
);

CREATE TABLE IF NOT EXISTS practice.event_roleplay_pools (
    event_code text NOT NULL,
    pool text NOT NULL,
    PRIMARY KEY (event_code, pool)
);
