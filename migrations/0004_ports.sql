CREATE TABLE port_code_counter (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  last_code INTEGER NOT NULL CHECK (typeof(last_code) = 'integer' AND last_code BETWEEN 0 AND 9007199254740991)
);
INSERT INTO port_code_counter VALUES (1, 0);

CREATE TABLE ports (
  id TEXT PRIMARY KEY NOT NULL,
  code INTEGER NOT NULL UNIQUE CHECK (typeof(code) = 'integer' AND code BETWEEN 1 AND 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE port_versions (
  id TEXT PRIMARY KEY NOT NULL,
  port_id TEXT NOT NULL REFERENCES ports(id),
  effective_from TEXT,
  name TEXT NOT NULL CHECK (length(name) > 0),
  locality TEXT NOT NULL CHECK (length(locality) > 0),
  country_code TEXT NOT NULL CHECK (length(country_code) = 2 AND country_code GLOB '[A-Z][A-Z]')
);
CREATE UNIQUE INDEX port_versions_initial ON port_versions(port_id) WHERE effective_from IS NULL;
CREATE UNIQUE INDEX port_versions_effective ON port_versions(port_id, effective_from) WHERE effective_from IS NOT NULL;

CREATE TABLE port_identifier_reservations (
  id TEXT PRIMARY KEY NOT NULL,
  port_id TEXT NOT NULL REFERENCES ports(id),
  normalized_name TEXT NOT NULL,
  normalized_locality TEXT NOT NULL,
  country_code TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX port_reservations_key ON port_identifier_reservations(normalized_name, normalized_locality, country_code);
CREATE INDEX port_reservations_owner ON port_identifier_reservations(port_id);

CREATE TABLE port_time_zones (
  id TEXT PRIMARY KEY NOT NULL,
  port_id TEXT NOT NULL REFERENCES ports(id),
  effective_from TEXT,
  zone_id TEXT NOT NULL CHECK (length(zone_id) > 0)
);
CREATE UNIQUE INDEX port_time_zones_initial ON port_time_zones(port_id) WHERE effective_from IS NULL;
CREATE UNIQUE INDEX port_time_zones_effective ON port_time_zones(port_id, effective_from) WHERE effective_from IS NOT NULL;
