CREATE TABLE customer_code_counter (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  last_code INTEGER NOT NULL CHECK (typeof(last_code) = 'integer' AND last_code BETWEEN 0 AND 9007199254740991)
);
INSERT INTO customer_code_counter VALUES (1, 0);

CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  code INTEGER NOT NULL UNIQUE CHECK (typeof(code) = 'integer' AND code BETWEEN 1 AND 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE customer_versions (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  business_name TEXT NOT NULL CHECK (length(business_name) > 0),
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
CREATE UNIQUE INDEX customer_versions_initial ON customer_versions(customer_id) WHERE effective_from IS NULL;
CREATE UNIQUE INDEX customer_versions_effective ON customer_versions(customer_id, effective_from) WHERE effective_from IS NOT NULL;

CREATE TABLE customer_identifier_reservations (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  normalized_business_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (normalized_business_name)
);
CREATE INDEX customer_reservations_owner ON customer_identifier_reservations(customer_id);

CREATE TABLE agency_code_counter (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  last_code INTEGER NOT NULL CHECK (typeof(last_code) = 'integer' AND last_code BETWEEN 0 AND 9007199254740991)
);
INSERT INTO agency_code_counter VALUES (1, 0);

CREATE TABLE agencies (
  id TEXT PRIMARY KEY NOT NULL,
  code INTEGER NOT NULL UNIQUE CHECK (typeof(code) = 'integer' AND code BETWEEN 1 AND 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE agency_versions (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  business_name TEXT NOT NULL CHECK (length(business_name) > 0),
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
CREATE UNIQUE INDEX agency_versions_initial ON agency_versions(agency_id) WHERE effective_from IS NULL;
CREATE UNIQUE INDEX agency_versions_effective ON agency_versions(agency_id, effective_from) WHERE effective_from IS NOT NULL;

CREATE TABLE agency_identifier_reservations (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  normalized_business_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (normalized_business_name)
);
CREATE INDEX agency_reservations_owner ON agency_identifier_reservations(agency_id);
