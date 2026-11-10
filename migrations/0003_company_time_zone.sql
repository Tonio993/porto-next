CREATE TABLE company_time_zone (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  zone_id TEXT NOT NULL CHECK (length(zone_id) BETWEEN 1 AND 200),
  effective_from TEXT CHECK (effective_from IS NULL),
  confirmed INTEGER NOT NULL DEFAULT 0 CHECK (confirmed IN (0, 1))
) STRICT;

INSERT INTO company_time_zone (singleton, zone_id) VALUES (1, 'Europe/Rome');
