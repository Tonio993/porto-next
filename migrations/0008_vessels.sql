CREATE TABLE vessel_types (
  id TEXT PRIMARY KEY NOT NULL CHECK (id IN ('STANDARD', 'PASSENGER', 'ADM'))
);
INSERT INTO vessel_types VALUES ('STANDARD'), ('PASSENGER'), ('ADM');

CREATE TABLE vessel_code_counter (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  last_code INTEGER NOT NULL CHECK (typeof(last_code) = 'integer' AND last_code BETWEEN 0 AND 9007199254740991)
);
INSERT INTO vessel_code_counter VALUES (1, 0);

CREATE TABLE vessels (
  id TEXT PRIMARY KEY NOT NULL,
  code INTEGER NOT NULL UNIQUE CHECK (typeof(code) = 'integer' AND code BETWEEN 1 AND 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE vessel_versions (
  id TEXT PRIMARY KEY NOT NULL,
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  registered_name TEXT NOT NULL CHECK (length(registered_name) BETWEEN 1 AND 200),
  imo_number TEXT CHECK (imo_number IS NULL OR length(imo_number) BETWEEN 1 AND 64),
  vessel_type_id TEXT NOT NULL REFERENCES vessel_types(id),
  size INTEGER NOT NULL CHECK (typeof(size) = 'integer' AND size BETWEEN 0 AND 9007199254740991),
  effective_from TEXT,
  effective_local_date_time TEXT,
  effective_zone_id TEXT,
  effective_utc_offset TEXT,
  CHECK (
    (effective_from IS NULL AND effective_local_date_time IS NULL AND effective_zone_id IS NULL AND effective_utc_offset IS NULL)
    OR
    (effective_from IS NOT NULL AND effective_local_date_time IS NOT NULL AND effective_zone_id IS NOT NULL AND effective_utc_offset IS NOT NULL)
  )
);
CREATE UNIQUE INDEX vessel_versions_initial ON vessel_versions(vessel_id) WHERE effective_from IS NULL;
CREATE UNIQUE INDEX vessel_versions_effective ON vessel_versions(vessel_id, effective_from) WHERE effective_from IS NOT NULL;

-- Independent reservations: a missing IMO never reserves a placeholder.
CREATE TABLE vessel_identifier_reservations (
  id TEXT PRIMARY KEY NOT NULL,
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  kind TEXT NOT NULL CHECK (kind IN ('NAME', 'IMO')),
  normalized_value TEXT NOT NULL CHECK (length(normalized_value) > 0),
  created_at TEXT NOT NULL,
  UNIQUE (kind, normalized_value)
);
CREATE INDEX vessel_reservations_owner ON vessel_identifier_reservations(vessel_id);
