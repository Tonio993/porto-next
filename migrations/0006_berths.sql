CREATE TABLE berth_code_counter (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  last_code INTEGER NOT NULL CHECK (typeof(last_code) = 'integer' AND last_code BETWEEN 0 AND 9007199254740991)
);
INSERT INTO berth_code_counter VALUES (1, 0);

CREATE TABLE berths (
  id TEXT PRIMARY KEY NOT NULL,
  port_id TEXT NOT NULL REFERENCES ports(id),
  code INTEGER NOT NULL UNIQUE CHECK (typeof(code) = 'integer' AND code BETWEEN 1 AND 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  UNIQUE (port_id, id)
);
CREATE INDEX berths_by_port ON berths(port_id, code);
CREATE TRIGGER berths_port_immutable
BEFORE UPDATE OF port_id ON berths WHEN NEW.port_id <> OLD.port_id
BEGIN
  SELECT RAISE(ABORT, 'berth port is immutable');
END;

CREATE TABLE berth_versions (
  id TEXT PRIMARY KEY NOT NULL,
  berth_id TEXT NOT NULL REFERENCES berths(id),
  name TEXT NOT NULL CHECK (length(name) > 0),
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
CREATE UNIQUE INDEX berth_versions_initial ON berth_versions(berth_id) WHERE effective_from IS NULL;
CREATE UNIQUE INDEX berth_versions_effective ON berth_versions(berth_id, effective_from) WHERE effective_from IS NOT NULL;

CREATE TABLE berth_identifier_reservations (
  id TEXT PRIMARY KEY NOT NULL,
  port_id TEXT NOT NULL,
  berth_id TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (port_id, berth_id) REFERENCES berths(port_id, id),
  UNIQUE (port_id, normalized_name)
);
CREATE INDEX berth_reservations_owner ON berth_identifier_reservations(berth_id);
